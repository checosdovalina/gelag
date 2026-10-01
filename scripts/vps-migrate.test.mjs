import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  applyMigrations,
  buildPgDumpEnvironment,
  loadMigrations,
  parseDatabaseTarget,
  runCommand,
  splitSqlStatements,
  validateMigrationSql,
} from './vps-migrate.mjs';

async function temporaryDirectory() {
  return mkdtemp(path.join(os.tmpdir(), 'gelag-vps-migrate-test-'));
}

class FakeClient {
  constructor({ ledgerTable = false, ledger = [], failOnSql = null, events = [] } = {}) {
    this.hasLedgerTable = ledgerTable;
    this.ledger = new Map(ledger);
    this.failOnSql = failOnSql;
    this.events = events;
    this.connected = false;
    this.inTransaction = false;
  }

  async connect() {
    this.connected = true;
    this.events.push('connect');
  }

  async query(sql, parameters = []) {
    const query = sql.trim();
    this.events.push(query);

    if (query === "SELECT to_regclass('public.gelag_vps_migrations') AS relation") {
      return { rows: [{ relation: this.hasLedgerTable ? 'gelag_vps_migrations' : null }] };
    }
    if (query === 'SELECT filename, sha256 FROM public.gelag_vps_migrations') {
      return { rows: [...this.ledger].map(([filename, sha256]) => ({ filename, sha256 })) };
    }
    if (query.startsWith('SELECT pg_advisory_lock')) return { rows: [{}] };
    if (query.startsWith('SELECT pg_advisory_unlock')) return { rows: [{}] };

    if (query === 'BEGIN') {
      this.inTransaction = true;
      this.stagedLedgerTable = this.hasLedgerTable;
      this.stagedLedger = new Map(this.ledger);
    } else if (query === 'COMMIT') {
      this.hasLedgerTable = this.stagedLedgerTable;
      this.ledger = this.stagedLedger;
      this.inTransaction = false;
    } else if (query === 'ROLLBACK') {
      this.inTransaction = false;
      delete this.stagedLedger;
      delete this.stagedLedgerTable;
    } else if (query.startsWith('CREATE TABLE IF NOT EXISTS public.gelag_vps_migrations')) {
      this.stagedLedgerTable = true;
    } else if (query.startsWith('INSERT INTO public.gelag_vps_migrations')) {
      this.stagedLedger.set(parameters[0], parameters[1]);
    } else if (this.failOnSql && this.failOnSql(query)) {
      const error = new Error('database detail must not be shown');
      error.code = '42703';
      throw error;
    }
    return { rows: [] };
  }

  async end() {
    this.events.push('end');
  }
}

test('empty migration directory returns without environment, backup, or database access', async () => {
  const directory = await temporaryDirectory();
  const output = [];
  try {
    const result = await runCommand(
      ['--apply', '--directory', directory],
      {
        environment: { REPL_ID: 'development' },
        output: (line) => output.push(line),
        loadEnvironment: () => assert.fail('must not load env'),
        createClient: () => assert.fail('must not create a database client'),
        createBackup: () => assert.fail('must not create a backup'),
      },
    );
    assert.equal(result.mode, 'apply');
    assert.deepEqual(result.applied, []);
    assert.match(output[0], /nothing to do/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('migration files are validated and ordered by numeric version', async () => {
  const directory = await temporaryDirectory();
  try {
    await writeFile(path.join(directory, '0010_add_index.sql'), 'CREATE INDEX ix ON items (id);');
    await writeFile(path.join(directory, '0002_create_items.sql'), 'CREATE TABLE items (id integer);');
    await writeFile(path.join(directory, 'notes.txt'), 'ignored');
    const migrations = await loadMigrations(directory);
    assert.deepEqual(migrations.map((migration) => migration.filename), [
      '0002_create_items.sql',
      '0010_add_index.sql',
    ]);

    await writeFile(path.join(directory, '2_other_name.sql'), 'CREATE TABLE other_items (id integer);');
    await assert.rejects(loadMigrations(directory), /Duplicate VPS migration version/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('comments and quoted strings do not split statements or masquerade as SQL commands', () => {
  const sql = `
    -- ; DROP TABLE users;
    CREATE TABLE notes (
      id integer,
      body text DEFAULT 'contains ; DELETE FROM accounts',
      escaped text DEFAULT E'can\\'t; UPDATE accounts'
    ); /* ; TRUNCATE accounts; /* nested ; */ */
  `;
  const statements = splitSqlStatements(sql, '0001_notes.sql');
  assert.equal(statements.length, 1);
  assert.match(statements[0].sql, /contains ; DELETE FROM accounts/u);
  assert.equal(validateMigrationSql(sql, '0001_notes.sql').length, 1);
});

test('destructive, data-changing, procedural, transaction, and unsupported ALTER statements are rejected', () => {
  const unsafe = [
    'DROP TABLE users;',
    'TRUNCATE TABLE users;',
    'DELETE FROM users;',
    'UPDATE users SET name = \'x\';',
    'DO $$ BEGIN NULL; END $$;',
    'BEGIN;',
    'ALTER TABLE users DROP COLUMN name;',
    'ALTER TABLE users ALTER COLUMN name TYPE text;',
  ];
  for (const sql of unsafe) {
    assert.throws(() => validateMigrationSql(sql, '0001_bad.sql'), /Unsupported or invalid SQL/u, sql);
  }
});

test('an applied filename with a changed checksum is rejected before backup or DDL', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'new-checksum',
    statements: validateMigrationSql('CREATE TABLE items (id integer);'),
  };
  const events = [];
  const client = new FakeClient({
    ledgerTable: true,
    ledger: [[migration.filename, 'old-checksum']],
    events,
  });
  let backupCalled = false;

  await assert.rejects(
    applyMigrations({
      migrations: [migration],
      connectionString: 'postgres://user:password@db.example/gelag',
      backupDirectory: '/private/backups',
      createClient: () => client,
      createBackup: () => {
        backupCalled = true;
      },
    }),
    /0001_add_items\.sql has changed since it was applied/u,
  );
  assert.equal(backupCalled, false);
  assert.equal(events.some((event) => event === 'BEGIN'), false);
  assert.equal(events.at(-1), 'end');
});

test('all pending migrations are backed up first, applied once, and recorded in one transaction', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'checksum-1',
    statements: validateMigrationSql('CREATE TABLE items (id integer);'),
  };
  const events = [];
  const client = new FakeClient({ events });
  let backupCount = 0;
  const options = {
    migrations: [migration],
    connectionString: 'postgres://user:password@db.example/gelag',
    backupDirectory: '/private/backups',
    createClient: () => client,
    createBackup: async () => {
      backupCount += 1;
      events.push('backup');
      return '/private/backups/snapshot.dump';
    },
  };

  const first = await applyMigrations(options);
  assert.deepEqual(first.applied, [migration.filename]);
  assert.equal(events.indexOf('backup') < events.indexOf('BEGIN'), true);
  assert.equal(events.filter((event) => event === migration.statements[0].sql).length, 1);
  assert.equal(events.filter((event) => event.startsWith('INSERT INTO public.gelag_vps_migrations')).length, 1);
  assert.equal(events.filter((event) => event === 'COMMIT').length, 1);

  const second = await applyMigrations(options);
  assert.deepEqual(second.applied, []);
  assert.equal(backupCount, 1);
  assert.equal(events.filter((event) => event === 'BEGIN').length, 1);
});

test('a SQL failure rolls back the whole transaction and reports only filename and SQLSTATE', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'checksum-1',
    statements: validateMigrationSql(
      'CREATE TABLE items (id integer); ALTER TABLE items ADD COLUMN name text;',
      '0001_add_items.sql',
    ),
  };
  const events = [];
  const client = new FakeClient({
    events,
    failOnSql: (query) => query.startsWith('ALTER TABLE items ADD COLUMN'),
  });

  await assert.rejects(
    applyMigrations({
      migrations: [migration],
      connectionString: 'postgres://user:password@db.example/gelag',
      backupDirectory: '/private/backups',
      createClient: () => client,
      createBackup: async () => {
        events.push('backup');
        return '/private/backups/snapshot.dump';
      },
    }),
    (error) => {
      assert.equal(error.message, 'Migration 0001_add_items.sql failed (SQLSTATE 42703).');
      assert.equal(error.message.includes('database detail'), false);
      return true;
    },
  );
  assert.equal(events.filter((event) => event === 'ROLLBACK').length, 1);
  assert.equal(events.some((event) => event === 'COMMIT'), false);
});

test('a failed backup prevents transaction start and all migration DDL', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'checksum-1',
    statements: validateMigrationSql('CREATE TABLE items (id integer);'),
  };
  const events = [];
  const client = new FakeClient({ events });

  await assert.rejects(
    applyMigrations({
      migrations: [migration],
      connectionString: 'postgres://user:password@db.example/gelag',
      backupDirectory: '/private/backups',
      createClient: () => client,
      createBackup: async () => {
        events.push('backup');
        throw new Error('sensitive pg_dump output');
      },
    }),
    /Full PostgreSQL backup failed/u,
  );
  assert.equal(events.includes('BEGIN'), false);
  assert.equal(events.some((event) => event.startsWith('CREATE TABLE IF NOT EXISTS public.gelag_vps_migrations')), false);
  assert.equal(events.some((event) => event.startsWith('CREATE TABLE items')), false);
});

test('plan mode validates migrations without loading environment or connecting', async () => {
  const directory = await temporaryDirectory();
  try {
    await writeFile(path.join(directory, '0001_items.sql'), 'CREATE TABLE items (id integer);');
    const result = await runCommand(['--directory', directory], {
      output: () => {},
      loadEnvironment: () => assert.fail('plan must not load environment'),
      createClient: () => assert.fail('plan must not connect'),
    });
    assert.equal(result.mode, 'plan');
    assert.equal(result.migrations.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('pg_dump connection credentials are passed as PG environment variables, never as a URL', () => {
  const environment = buildPgDumpEnvironment(
    'postgresql://gelag_owner:p%40ss@db.example:5433/gelag?sslmode=require',
    {
      PATH: '/usr/bin',
      DATABASE_URL: 'postgresql://must-not-leak',
      API_SECRET: 'must-not-leak',
      PGUSER: 'wrong-user',
    },
  );
  assert.equal(environment.PGHOST, 'db.example');
  assert.equal(environment.PGPORT, '5433');
  assert.equal(environment.PGDATABASE, 'gelag');
  assert.equal(environment.PGUSER, 'gelag_owner');
  assert.equal(environment.PGPASSWORD, 'p@ss');
  assert.equal(environment.PGSSLMODE, 'require');
  assert.equal(environment.DATABASE_URL, undefined);
  assert.equal(environment.API_SECRET, undefined);
  assert.equal(environment.PATH, '/usr/bin');
});

test('target-changing DATABASE_URL query parameters are rejected before connections, backups, or DDL', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'checksum-1',
    statements: validateMigrationSql('CREATE TABLE items (id integer);'),
  };
  const targetOverrides = [
    'host=attacker.example',
    'port=6543',
    'database=other_database',
    'user=other_user',
    'password=other_password',
    'service=other_service',
    'options=-csearch_path%3Dother_schema',
  ];

  for (const override of targetOverrides) {
    const connectionString = `postgresql://gelag_owner:secret@db.example:5433/gelag?${override}`;
    assert.throws(() => parseDatabaseTarget(connectionString), /query parameter/u, override);
    assert.throws(() => buildPgDumpEnvironment(connectionString), /query parameter/u, override);

    let clientCreated = false;
    let backupCreated = false;
    await assert.rejects(
      applyMigrations({
        migrations: [migration],
        connectionString,
        backupDirectory: '/tmp/vps-migrate-backups',
        createClient: () => {
          clientCreated = true;
          assert.fail('invalid target URL must fail before creating a client');
        },
        createBackup: () => {
          backupCreated = true;
          assert.fail('invalid target URL must fail before backup');
        },
      }),
      /query parameter/u,
      override,
    );

    await assert.rejects(
      runCommand(
        ['--apply', '--env-file', '/tmp/vps-migrate.env', '--backup-dir', '/tmp/vps-migrate-backups', '--yes'],
        {
          loadMigrations: async () => [migration],
          loadEnvironment: async () => ({ DATABASE_URL: connectionString }),
          environment: {},
          createClient: () => {
            clientCreated = true;
            assert.fail('invalid target URL must fail before creating a client');
          },
          createBackup: () => {
            backupCreated = true;
            assert.fail('invalid target URL must fail before backup');
          },
          output: () => {},
        },
      ),
      /query parameter/u,
      override,
    );
    assert.equal(clientCreated, false);
    assert.equal(backupCreated, false);
  }
});

test('database target and confirmation data include the authority port', async () => {
  const migration = {
    filename: '0001_add_items.sql',
    sha256: 'checksum-1',
    statements: validateMigrationSql('CREATE TABLE items (id integer);'),
  };
  let confirmedTarget;
  await assert.rejects(
    runCommand(
      ['--apply', '--env-file', '/tmp/vps-migrate.env', '--backup-dir', '/tmp/vps-migrate-backups'],
      {
        loadMigrations: async () => [migration],
        loadEnvironment: async () => ({ DATABASE_URL: 'postgresql://user:pass@db.example:5544/gelag' }),
        environment: {},
        confirm: async (target) => {
          confirmedTarget = target;
          throw new Error('stop before database access');
        },
        createClient: () => assert.fail('confirmation test must not connect'),
        output: () => {},
      },
    ),
    /stop before database access/u,
  );
  assert.deepEqual(confirmedTarget, {
    database: 'gelag',
    host: 'db.example',
    port: '5544',
  });
});