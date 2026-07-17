# Performance evidence

**Maturity:** Current

Evidence index for named artifacts and commits; values do not generalize beyond their
recorded method and environment.

> Current benchmark policy and recorded results. Last reviewed: 2026-07-16.

Performance claims are useful only when their workload, environment, code
version, and limitations are visible. The committed source of recorded numbers
is [`benchmarks/latest.json`](../../benchmarks/latest.json).

## Latest committed measurements

The latest artifact was recorded on 2026-06-03 at commit
`9b79be227be8dd2cf1e9ead2a42e812ebf70565b` on an Apple M2 Pro (`arm64`, macOS)
with `rustc 1.91.0-nightly` and Node `v22.20.0`.

| Component microbenchmark | Work per iteration | Result |
|---|---:|---:|
| BLAKE3 hashing | 1 MiB, 200 iterations | 1,809.96 MB/s |
| FastCDC chunking | 32 MiB, 5 iterations | 991.76 MB/s |
| SHA-256 hashing | 1 MiB, 100 iterations | 348.37 MB/s |
| npm platform-key lookup | 250,000 iterations | 9,683,229 ops/s |
| npm binary-path lookup | 150,000 iterations | 750,585 ops/s |

These are **component microbenchmarks**, not end-to-end repository results. They
do not establish commit throughput, checkout latency, deduplication ratio,
memory use, remote performance, or suitability for a production workload.

## Reproduce

From the repository root:

```bash
npm run bench
```

The benchmark harness writes machine-readable output beneath `benchmarks/`.
Review the script and raw artifact before citing a result.

## Claims that are not yet supported

Dits does not currently publish validated numbers for:

- time to initialize, add, commit, or check out a representative repository;
- storage growth over controlled edit histories;
- real-media MP4/FACR savings or proxy-generation cost;
- cold versus warm cache behavior;
- peak memory, CPU, disk amplification, or energy use;
- VFS first-byte or seek latency;
- network transfer, resumability, multi-peer speed, or hosted scale;
- comparisons with Git LFS, Xet, Perforce, Unity Version Control, or DVC.

Network measurements cannot exist for the current product because network
`push`, `pull`, `fetch`, `sync`, and P2P transfer are not implemented.

## Required end-to-end suite

The next benchmark suite should publish:

1. **Corpus** — generated and redistributable fixtures plus documented real-file
   characteristics.
2. **Edit matrix** — append, middle insertion, metadata-only change, local binary
   mutation, trim/reorder, transparent rewrap, and opaque re-encode.
3. **Operations** — add, commit, status, diff, checkout, branch switch, integrity
   verification, and recovery.
4. **Resources** — wall time, CPU time, peak memory, bytes read/written, and final
   object-store size.
5. **Conditions** — hardware, filesystem, OS, Dits commit, release builds, cache
   state, compression, encryption, and repetition count.
6. **Correctness** — byte hashes of every reconstructed exact asset and explicit
   fidelity criteria for derived media.
7. **Baselines** — equivalent documented workloads for relevant alternatives.

## Publication standard

Every number shown on the website or in a release must link to an artifact that
contains:

- the exact Dits commit and dependency versions;
- the command or harness revision;
- input sizes and content-generation method;
- sample count and summary statistic;
- hardware and operating system;
- known exclusions and failure cases.

Targets must be labeled **target**, simulations **simulation**, and design
estimates **estimate**. None should be rendered as a measured result.

## Performance priorities

Correctness precedes speed. Near-term engineering priorities are:

1. deterministic object identity and byte-exact recovery;
2. bounded-memory streaming for large inputs;
3. useful progress and cancellation behavior;
4. representative end-to-end benchmarks;
5. optimization only after profiling those workloads.

See [`engineering-plan.md`](engineering-plan.md) for the implementation plan.
