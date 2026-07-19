const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test(
  "libc detection never launches ldd",
  { skip: process.platform !== "linux" },
  (t) => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dits-npm-libc-"));
    t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));

    const marker = path.join(fixture, "ldd-ran");
    const fakeLdd = path.join(fixture, "ldd");
    fs.writeFileSync(fakeLdd, `#!/bin/sh\n: > "${marker}"\nprintf 'musl'\n`);
    fs.chmodSync(fakeLdd, 0o755);

    const resolverPath = path.join(__dirname, "..", "lib", "index.js");
    const program = [
      "process.report.getReport = () => ({ header: {} });",
      `require(${JSON.stringify(resolverPath)}).isMusl();`,
    ].join("\n");
    const result = spawnSync(process.execPath, ["-e", program], {
      encoding: "utf8",
      env: { ...process.env, PATH: fixture },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(marker), false);
  },
);
