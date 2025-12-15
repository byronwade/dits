#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const message =
      `Command failed: ${command} ${args.join(" ")}\n` +
      `exit=${result.status}\n` +
      `stdout:\n${result.stdout}\n` +
      `stderr:\n${result.stderr}\n`;
    throw new Error(message);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function extractBenchLines(text) {
  const lines = text.split(/\r?\n/);
  const results = [];
  for (const line of lines) {
    const prefix = "DITS_BENCH:";
    const idx = line.indexOf(prefix);
    if (idx === -1) continue;
    const payload = line.slice(idx + prefix.length).trim();
    const parsed = safeJsonParse(payload);
    if (parsed) results.push(parsed);
  }
  return results;
}

function getGitSha() {
  try {
    return run("git", ["rev-parse", "HEAD"]).stdout.trim();
  } catch {
    return null;
  }
}

function getRustcVersion() {
  try {
    return run("rustc", ["--version"]).stdout.trim();
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function readJson(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function benchmarkKey(r) {
  return `${r.suite}|${r.name}|${r.unit}`;
}

function updateHistory(existing, newResults) {
  const maxPerBenchmark = 25;
  const history = existing && typeof existing === "object" ? existing : {};
  history.meta = {
    generated_at: new Date().toISOString(),
    max_per_benchmark: maxPerBenchmark,
  };
  history.benchmarks = history.benchmarks && typeof history.benchmarks === "object" ? history.benchmarks : {};

  for (const r of newResults) {
    const key = benchmarkKey(r);
    const list = Array.isArray(history.benchmarks[key]) ? history.benchmarks[key] : [];
    list.push({
      timestamp: r.timestamp,
      git_sha: r.git_sha ?? null,
      suite: r.suite,
      name: r.name,
      unit: r.unit,
      value: r.value,
      iterations: r.iterations ?? null,
      bytes_per_iter: r.bytes_per_iter ?? null,
      elapsed_ms_total: r.elapsed_ms_total ?? null,
    });
    list.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    history.benchmarks[key] = list.slice(-maxPerBenchmark);
  }

  return history;
}

const root = repoRoot();
const logDir = path.join(root, "benchmarks");
const logFile = path.join(logDir, "log.jsonl");
const latestFile = path.join(logDir, "latest.json");
const webLatestFile = path.join(root, "apps", "web", "public", "benchmarks", "latest.json");
const historyFile = path.join(logDir, "history.json");
const webHistoryFile = path.join(root, "apps", "web", "public", "benchmarks", "history.json");

ensureDir(logDir);
ensureDir(path.dirname(webLatestFile));
ensureDir(path.dirname(webHistoryFile));

const meta = {
  timestamp: new Date().toISOString(),
  git_sha: getGitSha(),
  node: process.version,
  rustc: getRustcVersion(),
  platform: process.platform,
  arch: process.arch,
  cpu: os.cpus()?.[0]?.model ?? null,
};

const allResults = [];

// Rust benchmarks (ignored tests that print DITS_BENCH: JSON lines)
{
  const env = { ...process.env, RUST_TEST_THREADS: "1" };

  const core = run(
    "cargo",
    ["test", "-p", "dits-core", "--release", "--test", "benchmarks", "--", "--ignored", "--nocapture"],
    { env }
  );
  allResults.push(...extractBenchLines(core.stdout));

  const chunker = run(
    "cargo",
    ["test", "-p", "dits-chunker", "--release", "--test", "benchmarks", "--", "--ignored", "--nocapture"],
    { env }
  );
  allResults.push(...extractBenchLines(chunker.stdout));
}

// Node benchmarks (node:test file that prints DITS_BENCH: JSON lines)
{
  const nodeBenches = run("node", ["--test", "packages/npm/test/benchmarks.test.cjs"]);
  allResults.push(...extractBenchLines(nodeBenches.stdout));
}

const runRecord = {
  meta,
  results: allResults.map((r) => ({
    ...r,
    timestamp: meta.timestamp,
    git_sha: meta.git_sha,
  })),
};

// Append to log (one JSON per line for easy ingest)
for (const entry of runRecord.results) {
  appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

writeJson(latestFile, runRecord);
writeJson(webLatestFile, runRecord);

const existingHistory = readJson(historyFile);
const nextHistory = updateHistory(existingHistory, runRecord.results);
writeJson(historyFile, nextHistory);
writeJson(webHistoryFile, nextHistory);

const summary =
  `Benchmarks recorded: ${runRecord.results.length}\n` +
  `- ${path.relative(root, logFile)}\n` +
  `- ${path.relative(root, latestFile)}\n` +
  `- ${path.relative(root, historyFile)}\n` +
  `- ${path.relative(root, webLatestFile)}\n` +
  `- ${path.relative(root, webHistoryFile)}\n`;
process.stdout.write(summary);
