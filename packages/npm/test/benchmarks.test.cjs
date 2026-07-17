const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { performance } = require("node:perf_hooks");

const resolver = require("../lib/index.js");

function emit(result) {
  process.stdout.write(`DITS_BENCH: ${JSON.stringify(result)}\n`);
}

function benchSync({ suite, name, iterations, fn }) {
  for (let i = 0; i < Math.min(10, iterations); i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedMs = performance.now() - start;

  emit({
    suite,
    name,
    metric: "throughput",
    unit: "ops_per_s",
    value: (iterations / elapsedMs) * 1000,
    iterations,
    elapsed_ms_total: elapsedMs,
  });
}

test("npm resolver benchmarks", () => {
  const suite = "node.packages/npm";

  assert.equal(typeof resolver.getPlatformKey, "function");
  assert.equal(typeof resolver.getBinaryPath, "function");

  benchSync({
    suite,
    name: "getPlatformKey",
    iterations: 250_000,
    fn: () => {
      resolver.getPlatformKey();
    },
  });

  // The repository intentionally does not contain every release binary. Stub
  // only the existence probe so this measures path resolution on any CI host
  // without turning a missing platform artifact into a benchmark failure.
  const originalExistsSync = fs.existsSync;
  fs.existsSync = () => true;
  try {
    benchSync({
      suite,
      name: "getBinaryPath",
      iterations: 150_000,
      fn: () => {
        resolver.getBinaryPath();
      },
    });
  } finally {
    fs.existsSync = originalExistsSync;
  }
});
