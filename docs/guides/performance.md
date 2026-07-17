# Performance Guide

**Maturity:** Current

Dits has no universal speed, scale, memory, or storage-saving guarantee. Results depend
on exact bytes, file structure, chunking parameters, storage, cache state, hardware, and
the command being measured. Re-encoded or merely similar media should not be expected to
deduplicate by content hash.

Use the checked-in [performance evidence](../performance/benchmarks.md) only for the
commit, fixture, hardware, and method it names. For a new workload, retain:

- the input corpus or generator and its digest;
- the Dits commit and build profile;
- hardware, operating system, and filesystem;
- cold/warm cache state and configuration;
- wall time, peak memory, output bytes, and byte-fidelity checks; and
- failures and unfavorable comparisons.

Repository chunking keys are documented in the
[configuration reference](../user-guide/config-reference.md). Very large ingest can
still hold file-sized and copied buffers, loose-object count remains a scale constraint,
and destructive GC is disabled. Treat tuning changes as experiments on backed-up data.
