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

- Rust ignored benchmark tests (`dits-core`, `dits-chunker`)
- Node benchmark tests (`packages/npm`)

## Outputs

- `benchmarks/log.jsonl` — append-only JSONL log (one benchmark result per line)
- `benchmarks/latest.json` — latest run (metadata + all results)
- `apps/web/public/benchmarks/latest.json` — website-consumable copy of latest run

## Adding a benchmark

Benchmarks should print a single line in this format so the collector can find it:

```
DITS_BENCH: {"suite":"...","name":"...","metric":"...","unit":"...","value":123}
```

