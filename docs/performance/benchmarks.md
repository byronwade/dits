# Performance evidence

**Maturity:** Current

Evidence index for named artifacts and commits; values do not generalize beyond their
recorded method and environment.

> Current benchmark policy and recorded results. Last reviewed: 2026-08-04.

Performance claims are useful only when their workload, environment, code
version, and limitations are visible. The committed source of recorded numbers
is [`benchmarks/latest.json`](../../benchmarks/latest.json).

## Latest committed measurements

The latest artifact was recorded on 2026-08-04 at commit
`124ca7b7ce00c3b099198d649ff15ad61672af48` on an Intel Xeon (`x64`, Linux)
with `rustc 1.97.1` and Node `v22.14.0`.

### Component microbenchmarks

| Component microbenchmark | Work per iteration | Result |
|---|---:|---:|
| BLAKE3 hashing | 1 MiB, 200 iterations | 6,722.42 MB/s |
| FastCDC chunking (in-memory) | 32 MiB, 5 iterations | 1,078.44 MB/s |
| FastCDC streaming | 32 MiB, 5 iterations | 1,104.49 MB/s |
| SHA-256 hashing | 1 MiB, 100 iterations | 1,600.10 MB/s |
| npm platform-key lookup | 250,000 iterations | 7,821,691 ops/s |
| npm binary-path lookup | 150,000 iterations | 1,239,991 ops/s |

### Local repository path (library API)

Deterministic 32 MiB pseudo-random binary staged through streaming FastCDC
ingest (`Repository::add` / `commit` / `checkout`), 3 iterations:

| Operation | Result |
|---|---:|
| add 32 MiB binary (streaming) | 285.73 ms avg |
| commit after 32 MiB add | 3.85 ms avg |
| checkout 32 MiB binary | 24.99 ms avg |
| add+commit+checkout 32 MiB | 314.57 ms avg |
| add 32 MiB binary throughput | 111.99 MB/s |
| append-ish 33 MiB re-add | 43.90 ms (5 new / 428 dedup chunks) |

These are **single-machine measurements** for disclosed inputs. They do not
establish remote performance, packfile behavior, VFS latency, peak RSS bounds,
real-media fidelity, or suitability for a production workload. Numbers from the
previous Apple M2 Pro run remain in `benchmarks/history.json` for cross-machine
comparison and must not be mixed into one “Dits is X MB/s” claim.

## Reproduce

From the repository root:

```bash
npm run bench
```

Comparative store-growth workloads (requires ffmpeg; optional git-lfs/restic/borg/xdelta3):

```bash
npm run build:cli
benchmarks/comparative/media/gen-media.sh small
npm run bench:comparative
```

The benchmark harness writes machine-readable output beneath `benchmarks/`.
Review the script and raw artifact before citing a result.

## Claims that are not yet supported

Dits does not currently publish validated numbers for:

- peak RSS / bounded-memory proof across text and MP4-specialized ingest paths;
- storage growth over controlled real-media edit histories at production scale;
- real-media MP4/FACR savings or proxy-generation cost beyond comparative fixtures;
- cold versus warm cache behavior;
- CPU time, disk amplification, or energy use;
- VFS first-byte or seek latency;
- network transfer, resumability, multi-peer speed, or hosted scale;
- comparisons with Git LFS, Xet, Perforce, Unity Version Control, or DVC as a
  complete substitute for the comparative harness’s disclosed workloads.

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
2. finish bounded-memory ingest for remaining text/MP4 paths and publish
   peak-memory evidence (large classified binary streaming is already Current);
3. useful progress and cancellation behavior;
4. representative end-to-end benchmarks with peak RSS and store-growth series;
5. competitive comparative showcase runs on a disclosed reference machine.
