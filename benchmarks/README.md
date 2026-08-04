# Benchmarks

This repo logs lightweight performance benchmarks as test-like runners so we can:

- Track performance changes over time
- Surface real numbers as "facts" on the website

## Run

From the repo root:

```bash
npm run bench
```

This runs:

- Rust ignored benchmark tests in `apps/cli/tests/benchmarks.rs`
  (in-memory FastCDC, streaming FastCDC, BLAKE3/SHA-256, and local
  add/commit/checkout repository timings)
- Node benchmark tests (`packages/npm`)

Comparative media store-growth benches are separate:

```bash
npm run build:cli
benchmarks/comparative/media/gen-media.sh small
npm run bench:comparative
```

## Outputs

- `benchmarks/log.jsonl` — append-only JSONL log (one benchmark result per line)
- `benchmarks/latest.json` — latest run (metadata + all results)
- `benchmarks/history.json` — rolling history used by the website
- `apps/web/public/benchmarks/latest.json` — website-consumable copy of latest run
- `apps/web/public/benchmarks/history.json` — website-consumable history copy

## Adding a benchmark

Benchmarks should print a single line in this format so the collector can find it:

```
DITS_BENCH: {"suite":"...","name":"...","metric":"...","unit":"...","value":123}
```

