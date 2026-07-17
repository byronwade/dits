const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const targets = [
  ["darwin-arm64", "dits"],
  ["darwin-x64", "dits"],
  ["linux-x64", "dits"],
  ["linux-arm64", "dits"],
  ["linux-x64-musl", "dits"],
  ["linux-arm64-musl", "dits"],
  ["win32-x64", "dits.exe"],
  ["win32-arm64", "dits.exe"],
];

function createPackageFixture(t) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dits-npm-verify-"));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));

  const scriptsDir = path.join(packageRoot, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(
    path.join(__dirname, "..", "scripts", "verify-binaries.js"),
    path.join(scriptsDir, "verify-binaries.js"),
  );

  for (const [target, binary] of targets) {
    const binaryPath = path.join(packageRoot, "bin", target, binary);
    fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
    fs.writeFileSync(binaryPath, "non-empty test binary");
  }

  return packageRoot;
}

function runVerifier(packageRoot) {
  return spawnSync(process.execPath, [path.join(packageRoot, "scripts", "verify-binaries.js")], {
    encoding: "utf8",
  });
}

test("publish verifier accepts one non-empty file for every release target", (t) => {
  const packageRoot = createPackageFixture(t);
  const result = runVerifier(packageRoot);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Found 8 non-empty packaged Dits binary files/);
});

test("publish verifier rejects an empty release artifact", (t) => {
  const packageRoot = createPackageFixture(t);
  fs.writeFileSync(path.join(packageRoot, "bin", "win32-arm64", "dits.exe"), "");

  const result = runVerifier(packageRoot);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing or empty: bin[/\\]win32-arm64[/\\]dits\.exe/);
});
