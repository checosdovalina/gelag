import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const updater = readFileSync(fileURLToPath(new URL("./update-vps.sh", import.meta.url)), "utf8");
const realRm = execFileSync("bash", ["-c", "command -v rm"], { encoding: "utf8" }).trim();
const realMv = execFileSync("bash", ["-c", "command -v mv"], { encoding: "utf8" }).trim();

function fixture() {
  const temp = mkdtempSync(join(tmpdir(), "gelag-update-test-"));
  const root = join(temp, "app");
  const bin = join(temp, "bin");
  const events = join(temp, "events");
  const backups = join(temp, "backups");
  const remote = join(temp, "remote.git");
  mkdirSync(root);
  mkdirSync(bin);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "dist"));
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "scripts/update-vps.sh"), updater);
  writeFileSync(join(root, ".gitignore"), ".env\ndist/\nnode_modules/\n");
  writeFileSync(join(root, ".env"), "KEEP_LOCAL_CONFIGURATION=yes\n");
  writeFileSync(join(root, "dist/index.js"), "old-build");
  writeFileSync(join(root, "node_modules/marker"), "old-dependencies");
  writeFileSync(join(root, "package.json"), '{"name":"update-test","version":"1.0.0"}');
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}');
  writeFileSync(join(root, "scripts/vps-migrate.mjs"), `
    import { appendFileSync } from "node:fs";
    appendFileSync(process.env.MOCK_EVENTS, "migrate " + process.argv.slice(2).join(" ") + "\\n");
    if (process.env.MOCK_FAIL === "migration") process.exit(1);
  `);
  function binary(name, body) {
    writeFileSync(join(bin, name), "#!/usr/bin/env bash\nset -eu\n" + body, { mode: 0o755 });
  }
  binary("npm", `
    echo "npm $*" >> "$MOCK_EVENTS"
    if [[ "$1" == ci ]]; then mkdir -p node_modules; echo new-dependencies > node_modules/marker; fi
    if [[ "$1" == run && "\${2:-}" == build ]]; then
      [[ "\${MOCK_FAIL:-}" != build ]] || exit 1
      mkdir -p dist; echo new-build > dist/index.js
    fi
  `);
  binary("pm2", `
    echo "pm2 $*" >> "$MOCK_EVENTS"
    case "$1" in
      describe)
        [[ "\${MOCK_REGISTERED:-yes}" == yes || -f "$MOCK_STARTED" ]] || exit 1 ;;
      start) touch "$MOCK_STARTED" ;;
      restart)
        if [[ "\${MOCK_FAIL:-}" == restart && ! -f "$MOCK_RESTARTED" ]]; then
          touch "$MOCK_RESTARTED"; exit 1
        fi ;;
    esac
  `);
  binary("curl", 'echo "health" >> "$MOCK_EVENTS"\n[[ "${MOCK_FAIL:-}" != health ]]\n');
  binary("sleep", "exit 0\n");
  binary("rm", `
    if [[ "\${MOCK_RECOVERY_FAIL:-}" == removal && "$*" == *"$MOCK_ROOT/dist"* ]]; then exit 1; fi
    exec "${realRm}" "$@"
  `);
  binary("mv", `
    if [[ "\${MOCK_RECOVERY_FAIL:-}" == move && "$*" == *"release-"*"/dist "* ]]; then exit 1; fi
    exec "${realMv}" "$@"
  `);
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git("init", "-b", "main");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Fixture");
  git("add", ".");
  git("commit", "-m", "fixture");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  git("remote", "add", "origin", remote);
  git("push", "-u", "origin", "main");
  // Real servers may have a private, untracked ecosystem config.
  writeFileSync(join(root, "ecosystem.config.cjs"), "module.exports={apps:[{name:'gelag'}]};");
  return {
    root, temp, backups,
    run(extra = {}, args = []) {
      return spawnSync("bash", [join(root, "scripts/update-vps.sh"), ...args], {
        cwd: root,
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env, PATH: `${bin}:${process.env.PATH}`,
          REPLIT_DEV_DOMAIN: "", GELAG_BACKUP_DIR: backups,
          GELAG_PM2_APP: "gelag", GELAG_BRANCH: "main", GELAG_REMOTE: "origin",
          GELAG_PM2_CONFIG: join(root, "ecosystem.config.cjs"),
          GELAG_HEALTH_URL: "http://127.0.0.1:5000/",
          MOCK_EVENTS: events, MOCK_STARTED: join(temp, "started"),
          MOCK_ROOT: root,
          MOCK_RESTARTED: join(temp, "restarted"), ...extra,
        },
      });
    },
    events() { try { return readFileSync(events, "utf8"); } catch { return ""; } },
    file(path) { return readFileSync(join(root, path), "utf8").trim(); },
    dispose() { rmSync(temp, { recursive: true, force: true }); },
  };
}

test("builds away from the live app, migrates before replacing files and restarts", () => {
  const f = fixture();
  try {
    const result = f.run();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(f.file("dist/index.js"), "new-build");
    assert.equal(f.file("node_modules/marker"), "new-dependencies");
    assert.equal(f.file(".env"), "KEEP_LOCAL_CONFIGURATION=yes");
    const events = f.events();
    assert.match(events, /npm ci --include=dev/);
    assert.ok(events.indexOf("npm run build") < events.indexOf("migrate --apply"));
    assert.ok(events.indexOf("migrate --apply") < events.indexOf("pm2 stop"));
    assert.match(events, /pm2 restart gelag/);
    assert.match(events, /pm2 save/);
    assert.doesNotMatch(events, /db:push/);
    const backup = readdirSync(f.backups).find(name => name.startsWith("release-"));
    assert.equal(readFileSync(join(f.backups, backup, "dist/index.js"), "utf8"), "old-build");
    assert.ok(!readdirSync(f.backups).some(name => name.startsWith(".build-")));
  } finally { f.dispose(); }
});

for (const failure of ["build", "migration"]) {
  test(`${failure} failure does not replace files or stop the current app`, () => {
    const f = fixture();
    try {
      assert.notEqual(f.run({ MOCK_FAIL: failure }).status, 0);
      assert.equal(f.file("dist/index.js"), "old-build");
      assert.equal(f.file("node_modules/marker"), "old-dependencies");
      assert.doesNotMatch(f.events(), /pm2 stop|pm2 restart|pm2 start /);
      assert.ok(!readdirSync(f.backups).some(name => name.startsWith(".build-")));
    } finally { f.dispose(); }
  });
}

for (const failure of ["restart", "health"]) {
  test(`${failure} failure restores previous build and dependencies`, () => {
    const f = fixture();
    try {
      assert.notEqual(f.run({ MOCK_FAIL: failure }).status, 0);
      assert.equal(f.file("dist/index.js"), "old-build");
      assert.equal(f.file("node_modules/marker"), "old-dependencies");
      assert.equal(f.file(".env"), "KEEP_LOCAL_CONFIGURATION=yes");
      assert.doesNotMatch(f.events(), /pm2 save/);
    } finally { f.dispose(); }
  });
}

test("starts only the requested application from ecosystem config when not registered", () => {
  const f = fixture();
  try {
    const result = f.run({ MOCK_REGISTERED: "no" }, ["--yes-migrations"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(f.events(), /pm2 start .*ecosystem\.config\.cjs --only gelag/);
    assert.match(f.events(), /migrate --apply .* --yes/);
    assert.doesNotMatch(f.events(), /pm2 restart gelag/);
  } finally { f.dispose(); }
});

test("refuses a dirty tracked working tree before deployment", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, "package.json"), '{"name":"local-change"}');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cambios locales/);
    assert.equal(f.events(), "");
    assert.equal(f.file("dist/index.js"), "old-build");
  } finally { f.dispose(); }
});

for (const failure of ["removal", "move"]) {
  test(`reports failed recovery ${failure} without claiming success or restarting incomplete artifacts`, () => {
    const f = fixture();
    try {
      const result = f.run({ MOCK_FAIL: "restart", MOCK_RECOVERY_FAIL: failure });
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /recuperación de archivos no terminó/);
      assert.doesNotMatch(result.stdout, /Se recuperaron los archivos/);
      assert.equal((f.events().match(/pm2 restart gelag/g) || []).length, 1);
      const backup = readdirSync(f.backups).find(name => name.startsWith("release-"));
      assert.equal(readFileSync(join(f.backups, backup, "dist/index.js"), "utf8"), "old-build");
    } finally { f.dispose(); }
  });
}