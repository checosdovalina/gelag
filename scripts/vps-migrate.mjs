#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, open, readdir, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import dotenv from 'dotenv';
import pg from 'pg';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, '../migrations/vps');
export const LEDGER_TABLE = 'public.gelag_vps_migrations';
const ADVISORY_LOCK_KEYS = [1296388933, 1];
const DATABASE_URL_SSL_PARAMETERS = new Set(['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']);
const DATABASE_URL_SSL_MODES = new Set(['disable', 'prefer', 'require', 'verify-ca', 'verify-full', 'no-verify']);
const { Client } = pg;

function syntaxError(filename) {
  return new Error(`Unsupported or invalid SQL in migration ${filename}.`);
}

function isWordCharacter(character) {
  return Boolean(character && /[A-Za-z0-9_$\u0080-\uFFFF]/u.test(character));
}

function lexSql(sql, filename = '<SQL>') {
  const statements = [];
  let tokens = [];
  let index = 0;
  let statementStart = 0;

  const finishStatement = (end) => {
    if (tokens.length) {
      tokens.sql = sql.slice(statementStart, end);
      statements.push(tokens);
    }
    tokens = [];
  };

  while (index < sql.length) {
    const character = sql[index];

    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }

    if (character === '-' && sql[index + 1] === '-') {
      index += 2;
      while (index < sql.length && sql[index] !== '\n' && sql[index] !== '\r') index += 1;
      continue;
    }

    if (character === '/' && sql[index + 1] === '*') {
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        if (sql[index] === '/' && sql[index + 1] === '*') {
          depth += 1;
          index += 2;
        } else if (sql[index] === '*' && sql[index + 1] === '/') {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      if (depth !== 0) throw syntaxError(filename);
      continue;
    }

    if (character === "'") {
      const escapeString = (sql[index - 1] === 'e' || sql[index - 1] === 'E')
        && !isWordCharacter(sql[index - 2]);
      const start = index;
      index += 1;
      let closed = false;
      while (index < sql.length) {
        if (escapeString && sql[index] === '\\') {
          index += 2;
        } else if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
        } else if (sql[index] === "'") {
          index += 1;
          closed = true;
          break;
        } else {
          index += 1;
        }
      }
      if (!closed) throw syntaxError(filename);
      tokens.push({ type: 'literal', value: sql.slice(start, index) });
      continue;
    }

    if (character === '"') {
      index += 1;
      let value = '';
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          value += '"';
          index += 2;
        } else if (sql[index] === '"') {
          index += 1;
          closed = true;
          break;
        } else {
          value += sql[index];
          index += 1;
        }
      }
      if (!closed) throw syntaxError(filename);
      tokens.push({ type: 'quotedIdentifier', value });
      continue;
    }

    if (character === '$') {
      const delimiter = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/u)?.[0];
      if (delimiter) {
        const start = index;
        index += delimiter.length;
        const closingIndex = sql.indexOf(delimiter, index);
        if (closingIndex < 0) throw syntaxError(filename);
        index = closingIndex + delimiter.length;
        tokens.push({ type: 'literal', value: sql.slice(start, index) });
        continue;
      }
    }

    if (/[A-Za-z_\u0080-\uFFFF]/u.test(character)) {
      const start = index;
      index += 1;
      while (index < sql.length && isWordCharacter(sql[index])) index += 1;
      tokens.push({ type: 'word', value: sql.slice(start, index) });
      continue;
    }

    if (/[0-9]/u.test(character)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[0-9.]/u.test(sql[index])) index += 1;
      tokens.push({ type: 'number', value: sql.slice(start, index) });
      continue;
    }

    if (character === ';') {
      finishStatement(index);
      index += 1;
      statementStart = index;
      continue;
    }

    tokens.push({ type: 'symbol', value: character });
    index += 1;
  }

  finishStatement(sql.length);
  return statements;
}

function keyword(token, value) {
  return token?.type === 'word' && token.value.toUpperCase() === value;
}

function identifier(token) {
  return token?.type === 'word' || token?.type === 'quotedIdentifier';
}

function parseQualifiedIdentifier(tokens, start, allowStar = false) {
  let index = start;
  if (!identifier(tokens[index])) return null;
  index += 1;
  if (tokens[index]?.value === '.') {
    index += 1;
    if (!identifier(tokens[index])) return null;
    index += 1;
  }
  if (allowStar && tokens[index]?.value === '*') index += 1;
  return index;
}

function matchingParenthesis(tokens, start) {
  if (tokens[start]?.value !== '(') return null;
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === '(') depth += 1;
    if (tokens[index].value === ')') {
      depth -= 1;
      if (depth === 0) return index;
      if (depth < 0) return null;
    }
  }
  return null;
}

function isCreateTable(tokens) {
  let index = 0;
  if (!keyword(tokens[index++], 'CREATE') || !keyword(tokens[index++], 'TABLE')) return false;
  if (keyword(tokens[index], 'IF')) {
    if (!keyword(tokens[index + 1], 'NOT') || !keyword(tokens[index + 2], 'EXISTS')) return false;
    index += 3;
  }
  index = parseQualifiedIdentifier(tokens, index);
  if (index === null || tokens[index]?.value !== '(') return false;
  const close = matchingParenthesis(tokens, index);
  return close === tokens.length - 1 && close > index + 1;
}

function isCreateIndex(tokens) {
  let index = 0;
  if (!keyword(tokens[index++], 'CREATE')) return false;
  if (keyword(tokens[index], 'UNIQUE')) index += 1;
  if (!keyword(tokens[index++], 'INDEX')) return false;
  if (keyword(tokens[index], 'IF')) {
    if (!keyword(tokens[index + 1], 'NOT') || !keyword(tokens[index + 2], 'EXISTS')) return false;
    index += 3;
  }
  index = parseQualifiedIdentifier(tokens, index);
  if (index === null || !keyword(tokens[index++], 'ON')) return false;
  if (keyword(tokens[index], 'ONLY')) index += 1;
  index = parseQualifiedIdentifier(tokens, index, true);
  if (index === null) return false;
  if (keyword(tokens[index], 'USING')) {
    index += 1;
    if (!identifier(tokens[index])) return false;
    index += 1;
  }
  const open = index;
  const close = matchingParenthesis(tokens, open);
  if (close === null || close === open + 1) return false;
  index = close + 1;

  while (index < tokens.length) {
    if (keyword(tokens[index], 'INCLUDE')) {
      index += 1;
      const end = matchingParenthesis(tokens, index);
      if (end === null || end === index + 1) return false;
      index = end + 1;
    } else if (keyword(tokens[index], 'WITH')) {
      index += 1;
      const end = matchingParenthesis(tokens, index);
      if (end === null || end === index + 1) return false;
      index = end + 1;
    } else if (keyword(tokens[index], 'TABLESPACE')) {
      index += 1;
      if (!identifier(tokens[index])) return false;
      index += 1;
    } else if (keyword(tokens[index], 'WHERE')) {
      return index + 1 < tokens.length;
    } else {
      return false;
    }
  }

  return true;
}

function isAlterAddColumn(tokens) {
  let index = 0;
  if (!keyword(tokens[index++], 'ALTER') || !keyword(tokens[index++], 'TABLE')) return false;
  if (keyword(tokens[index], 'ONLY')) index += 1;
  index = parseQualifiedIdentifier(tokens, index, true);
  if (index === null || !keyword(tokens[index++], 'ADD') || !keyword(tokens[index++], 'COLUMN')) return false;
  if (keyword(tokens[index], 'IF')) {
    if (!keyword(tokens[index + 1], 'NOT') || !keyword(tokens[index + 2], 'EXISTS')) return false;
    index += 3;
  }
  if (!identifier(tokens[index])) return false;
  index += 1;
  if (index >= tokens.length) return false;

  let depth = 0;
  for (; index < tokens.length; index += 1) {
    if (tokens[index].value === '(') depth += 1;
    if (tokens[index].value === ')') {
      depth -= 1;
      if (depth < 0) return false;
    }
    if (tokens[index].value === ',' && depth === 0) return false;
  }
  return depth === 0;
}

export function splitSqlStatements(sql, filename = '<SQL>') {
  return lexSql(sql, filename);
}

export function validateMigrationSql(sql, filename = '<SQL>') {
  const statements = lexSql(sql, filename);
  if (statements.length === 0) throw syntaxError(filename);

  for (const statement of statements) {
    if (!isCreateTable(statement) && !isCreateIndex(statement) && !isAlterAddColumn(statement)) {
      throw syntaxError(filename);
    }
  }
  return statements;
}

export async function loadMigrations(directory = DEFAULT_MIGRATIONS_DIRECTORY) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'));
  if (sqlFiles.length === 0) return [];

  const migrations = [];
  const versions = new Set();
  for (const entry of sqlFiles) {
    const match = entry.name.match(/^(\d+)_([a-z0-9][a-z0-9_-]*)\.sql$/u);
    if (!match) throw new Error(`Invalid VPS migration filename: ${entry.name}.`);
    const version = BigInt(match[1]).toString();
    if (versions.has(version)) throw new Error(`Duplicate VPS migration version: ${match[1]}.`);
    versions.add(version);

    const sql = await readFile(path.join(directory, entry.name), 'utf8');
    const statements = validateMigrationSql(sql, entry.name);
    migrations.push({
      filename: entry.name,
      version: BigInt(match[1]),
      sql,
      statements,
      sha256: createHash('sha256').update(sql).digest('hex'),
    });
  }

  migrations.sort((left, right) => (
    left.version < right.version ? -1 : left.version > right.version ? 1 : 0
  ));
  return migrations;
}

export function validateDatabaseUrl(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }
  if (!url.hostname || !url.pathname.replace(/^\/+/, '')) {
    throw new Error('DATABASE_URL must include a database and host.');
  }
  if (url.hash) throw new Error('DATABASE_URL fragments are not supported.');

  const seenParameters = new Set();
  for (const [name, value] of url.searchParams) {
    if (!DATABASE_URL_SSL_PARAMETERS.has(name)) {
      throw new Error(`DATABASE_URL query parameter "${name}" is not supported.`);
    }
    if (seenParameters.has(name)) {
      throw new Error(`DATABASE_URL query parameter "${name}" must not be repeated.`);
    }
    seenParameters.add(name);
    if (name === 'sslmode' && !DATABASE_URL_SSL_MODES.has(value)) {
      throw new Error('DATABASE_URL contains an unsupported SSL mode.');
    }
    if (name === 'ssl' && !['true', 'false', '1', '0'].includes(value)) {
      throw new Error('DATABASE_URL contains an invalid SSL setting.');
    }
  }
  return url;
}

export function parseDatabaseTarget(connectionString) {
  const url = validateDatabaseUrl(connectionString);
  const database = decodeURI(url.pathname.replace(/^\/+/, ''));
  if (!database || !url.hostname) throw new Error('DATABASE_URL must include a database and host.');
  return { database, host: url.hostname, port: url.port || '5432' };
}

export function buildPgDumpEnvironment(connectionString, baseEnvironment = process.env) {
  const url = validateDatabaseUrl(connectionString);

  const environment = {};
  for (const key of [
    'PATH',
    'HOME',
    'TMPDIR',
    'TMP',
    'TEMP',
    'SYSTEMROOT',
    'WINDIR',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
  ]) {
    if (baseEnvironment[key] !== undefined) environment[key] = baseEnvironment[key];
  }
  const hostname = decodeURIComponent(url.hostname);
  environment.PGHOST = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  environment.PGPORT = url.port || '5432';
  environment.PGDATABASE = decodeURI(url.pathname.replace(/^\/+/, ''));
  environment.PGUSER = decodeURIComponent(url.username);
  environment.PGPASSWORD = decodeURIComponent(url.password);

  const parameterNames = {
    sslmode: 'PGSSLMODE',
    sslrootcert: 'PGSSLROOTCERT',
    sslcert: 'PGSSLCERT',
    sslkey: 'PGSSLKEY',
  };
  for (const [queryName, environmentName] of Object.entries(parameterNames)) {
    const value = url.searchParams.get(queryName);
    if (value !== null) environment[environmentName] = value;
  }
  if (!url.searchParams.has('sslmode') && url.searchParams.has('ssl')) {
    environment.PGSSLMODE = url.searchParams.get('ssl') === 'true' ? 'require' : 'disable';
  }
  return environment;
}

function awaitChildProcess(child) {
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('pg_dump could not be started.')));
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump failed (exit ${Number.isInteger(code) ? code : signal || 'unknown'}).`));
    });
  });
}

export async function createPgDumpBackup({ connectionString, backupDirectory, spawnProcess = spawn, environment = process.env }) {
  let privateDirectory;
  try {
    validateDatabaseUrl(connectionString);
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    const [actualBackupDirectory, actualRepositoryDirectory] = await Promise.all([
      realpath(backupDirectory),
      realpath(path.resolve(SCRIPT_DIRECTORY, '..')),
    ]);
    if (isWithinDirectory(actualRepositoryDirectory, actualBackupDirectory)) {
      throw new Error('Backup directory must be external to the application workspace.');
    }
    await chmod(backupDirectory, 0o700);
    privateDirectory = await mkdtemp(path.join(actualBackupDirectory, 'gelag-vps-'));
    await chmod(privateDirectory, 0o700);
    const backupFile = path.join(privateDirectory, 'database.dump');
    const securedFile = await open(backupFile, 'wx', 0o600);
    await securedFile.close();
    await awaitChildProcess(spawnProcess('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--file',
      backupFile,
    ], {
      env: buildPgDumpEnvironment(connectionString, environment),
      stdio: ['ignore', 'ignore', 'ignore'],
    }));
    await chmod(backupFile, 0o600);
    return backupFile;
  } catch {
    if (privateDirectory) await rm(privateDirectory, { recursive: true, force: true }).catch(() => {});
    throw new Error('Full PostgreSQL backup failed; no migrations were applied.');
  }
}

function checkLedgerChecksums(migrations, ledger) {
  for (const migration of migrations) {
    const recordedChecksum = ledger.get(migration.filename);
    if (recordedChecksum !== undefined && recordedChecksum !== migration.sha256) {
      throw new MigrationChecksumMismatchError(migration.filename);
    }
  }
}

class MigrationChecksumMismatchError extends Error {
  constructor(filename) {
    super(`Migration ${filename} has changed since it was applied; refusing to continue.`);
  }
}

async function readLedger(client) {
  const relation = await client.query("SELECT to_regclass('public.gelag_vps_migrations') AS relation");
  if (!relation.rows?.[0]?.relation) return new Map();
  const result = await client.query(`SELECT filename, sha256 FROM ${LEDGER_TABLE}`);
  return new Map(result.rows.map((row) => [row.filename, row.sha256.trim()]));
}

function sqlState(error) {
  return typeof error?.code === 'string' && /^[0-9A-Z]{5}$/u.test(error.code) ? error.code : null;
}

function safeDatabaseError(error, context) {
  const state = sqlState(error);
  return new Error(`${context}${state ? ` (SQLSTATE ${state})` : ''}.`);
}

export async function applyMigrations({
  migrations,
  connectionString,
  backupDirectory,
  createClient = (config) => new Client(config),
  createBackup = createPgDumpBackup,
  backupEnvironment = process.env,
}) {
  if (migrations.length === 0) return { applied: [], backupPath: null };
  validateDatabaseUrl(connectionString);

  const client = createClient({ connectionString, connectionTimeoutMillis: 10000 });
  let lockAcquired = false;
  let transactionStarted = false;
  let backupPath = null;

  try {
    try {
      await client.connect();
    } catch (error) {
      throw safeDatabaseError(error, 'Could not connect to the target database');
    }

    try {
      checkLedgerChecksums(migrations, await readLedger(client));
    } catch (error) {
      if (error instanceof MigrationChecksumMismatchError) throw error;
      throw safeDatabaseError(error, 'Could not inspect the VPS migration ledger');
    }

    try {
      await client.query('SELECT pg_advisory_lock($1, $2)', ADVISORY_LOCK_KEYS);
      lockAcquired = true;
    } catch (error) {
      throw safeDatabaseError(error, 'Could not acquire the VPS migration lock');
    }

    let ledger;
    try {
      ledger = await readLedger(client);
      checkLedgerChecksums(migrations, ledger);
    } catch (error) {
      if (error instanceof MigrationChecksumMismatchError) throw error;
      throw safeDatabaseError(error, 'Could not inspect the VPS migration ledger');
    }

    const pending = migrations.filter((migration) => !ledger.has(migration.filename));
    if (pending.length === 0) return { applied: [], backupPath: null };

    try {
      backupPath = await createBackup({
        connectionString,
        backupDirectory,
        environment: backupEnvironment,
      });
    } catch {
      throw new Error('Full PostgreSQL backup failed; no migrations were applied.');
    }

    let activeMigration = null;
    try {
      await client.query('BEGIN');
      transactionStarted = true;
      await client.query("SET LOCAL lock_timeout = '10s'");
      await client.query("SET LOCAL statement_timeout = '5min'");
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
          filename text PRIMARY KEY,
          sha256 text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      for (const migration of pending) {
        activeMigration = migration;
        for (const statement of migration.statements) {
          await client.query(statement.sql);
        }
        await client.query(
          `INSERT INTO ${LEDGER_TABLE} (filename, sha256) VALUES ($1, $2)`,
          [migration.filename, migration.sha256],
        );
      }
      await client.query('COMMIT');
      transactionStarted = false;
      return { applied: pending.map((migration) => migration.filename), backupPath };
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK').catch(() => {});
        transactionStarted = false;
      }
      if (activeMigration) {
        throw safeDatabaseError(error, `Migration ${activeMigration.filename} failed`);
      }
      throw safeDatabaseError(error, 'VPS migration transaction failed');
    }
  } finally {
    if (transactionStarted) await client.query('ROLLBACK').catch(() => {});
    if (lockAcquired) await client.query('SELECT pg_advisory_unlock($1, $2)', ADVISORY_LOCK_KEYS).catch(() => {});
    await client.end().catch(() => {});
  }
}

export function isReplitDevelopmentEnvironment(environment) {
  return Boolean(environment.REPLIT_DEV_DOMAIN)
    || Boolean(environment.REPL_ID);
}

export function parseArguments(argumentsList) {
  const options = {
    mode: 'plan',
    directory: DEFAULT_MIGRATIONS_DIRECTORY,
    envFile: null,
    backupDirectory: null,
    yes: false,
  };
  let modeSpecified = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--plan' || argument === '--apply') {
      if (modeSpecified) throw new Error('Choose either --plan or --apply.');
      modeSpecified = true;
      options.mode = argument.slice(2);
      continue;
    }
    if (argument === '--yes') {
      options.yes = true;
      continue;
    }
    if (['--env-file', '--backup-dir', '--directory'].includes(argument)) {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      index += 1;
      if (argument === '--env-file') options.envFile = value;
      if (argument === '--backup-dir') options.backupDirectory = value;
      if (argument === '--directory') options.directory = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown option: ${argument}.`);
  }

  return options;
}

function isWithinDirectory(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function loadEnvironmentFile(envFile) {
  const result = dotenv.config({ path: envFile, override: false, quiet: true });
  if (result.error) throw new Error('Could not load the specified environment file.');
  return process.env;
}

async function confirmTarget(target, input = process.stdin, output = process.stdout) {
  if (!input.isTTY) throw new Error('Interactive confirmation requires a TTY; use --yes to confirm explicitly.');
  output.write(`Apply reviewed migrations to database "${target.database}" on host "${target.host}", port "${target.port}"? Type "yes" to continue: `);
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question('');
    if (answer.trim().toLowerCase() !== 'yes') throw new Error('VPS migration was not confirmed.');
  } finally {
    prompt.close();
  }
}

export async function runCommand(argumentsList, dependencies = {}) {
  const options = parseArguments(argumentsList);
  const migrations = await (dependencies.loadMigrations || loadMigrations)(options.directory);

  if (migrations.length === 0) {
    (dependencies.output || console.log)('No VPS SQL migrations found; nothing to do.');
    return { mode: options.mode, migrations: [], applied: [] };
  }

  if (options.mode === 'plan') {
    const output = dependencies.output || console.log;
    output(`Validated ${migrations.length} VPS migration(s); no database connection was made.`);
    for (const migration of migrations) output(`- ${migration.filename}  sha256:${migration.sha256}`);
    output('The applied state is checked against the external database ledger only during --apply.');
    return { mode: 'plan', migrations, applied: [] };
  }

  if (isReplitDevelopmentEnvironment(dependencies.environment || process.env)) {
    throw new Error('VPS migrations are disabled in the Replit development environment.');
  }
  if (!options.envFile || !path.isAbsolute(options.envFile)) {
    throw new Error('--apply requires --env-file with an absolute path.');
  }
  if (!options.backupDirectory || !path.isAbsolute(options.backupDirectory)) {
    throw new Error('--apply requires --backup-dir with an absolute path outside the application workspace.');
  }
  const repositoryDirectory = path.resolve(SCRIPT_DIRECTORY, '..');
  if (isWithinDirectory(repositoryDirectory, path.resolve(options.backupDirectory))) {
    throw new Error('--backup-dir must be outside the application workspace.');
  }

  const environment = await (dependencies.loadEnvironment || loadEnvironmentFile)(options.envFile);
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required in the selected environment.');
  validateDatabaseUrl(connectionString);
  const target = parseDatabaseTarget(connectionString);
  if (!options.yes) await (dependencies.confirm || confirmTarget)(target);

  const result = await applyMigrations({
    migrations,
    connectionString,
    backupDirectory: options.backupDirectory,
    createClient: dependencies.createClient,
    createBackup: dependencies.createBackup,
    backupEnvironment: environment,
  });
  (dependencies.output || console.log)(
    result.applied.length
      ? `Applied ${result.applied.length} VPS migration(s). Full backup: ${result.backupPath}`
      : 'No pending VPS migrations; database is unchanged.',
  );
  return { mode: 'apply', migrations, ...result };
}

async function main() {
  try {
    await runCommand(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}