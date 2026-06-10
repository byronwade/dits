//! Engine micro-benchmarks for the canonical `dits` binary (apps/cli).
//!
//! These are #[ignore]d so they don't run in the normal test pass. The bench
//! collector (`scripts/bench/run.mjs`, `npm run bench`) runs them with
//! `--ignored --nocapture` and scrapes the `DITS_BENCH:` lines.
//!
//! They benchmark the SAME chunking + hashing code the real binary uses, so the
//! numbers on the website's "engine throughput" section are honest and current.

use std::time::Instant;

use dits::core::{chunk_data, ChunkerConfig, Hasher};

const MIB: usize = 1024 * 1024;

/// Deterministic pseudo-random fill (no rng → stable across runs).
fn make_bytes(size: usize) -> Vec<u8> {
    let mut v = Vec::with_capacity(size);
    let mut x: u64 = 0x9E3779B97F4A7C15;
    while v.len() < size {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        v.extend_from_slice(&x.to_le_bytes());
    }
    v.truncate(size);
    v
}

fn emit_mb_per_s(suite: &str, name: &str, bytes_per_iter: usize, iters: u64, ms_total: f64) {
    let mb = (bytes_per_iter as f64 * iters as f64) / (MIB as f64);
    let value = mb / (ms_total / 1000.0);
    println!(
        r#"DITS_BENCH: {{"suite":"{suite}","name":"{name}","metric":"throughput","unit":"mb_per_s","value":{value},"iterations":{iters},"bytes_per_iter":{bytes_per_iter},"elapsed_ms_total":{ms_total}}}"#
    );
}

#[test]
#[ignore]
fn bench_fastcdc_chunk_32mib() {
    let data = make_bytes(32 * MIB);
    let cfg = ChunkerConfig::media();
    let iters = 5u64;
    // warm up
    let _ = chunk_data(&data, &cfg);
    let t0 = Instant::now();
    for _ in 0..iters {
        let chunks = chunk_data(&data, &cfg);
        std::hint::black_box(&chunks);
    }
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    emit_mb_per_s("rust.dits-engine", "FastCDC chunk (32 MiB)", 32 * MIB, iters, ms);
}

#[test]
#[ignore]
fn bench_blake3_hash_1mib() {
    let data = make_bytes(MIB);
    let iters = 200u64;
    let _ = Hasher::hash(&data);
    let t0 = Instant::now();
    for _ in 0..iters {
        let h = Hasher::hash(&data);
        std::hint::black_box(&h);
    }
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    emit_mb_per_s("rust.dits-engine", "BLAKE3 hash (1 MiB)", MIB, iters, ms);
}

#[test]
#[ignore]
fn bench_sha256_hash_1mib() {
    use sha2::{Digest, Sha256};
    let data = make_bytes(MIB);
    let iters = 100u64;
    let _ = Sha256::digest(&data);
    let t0 = Instant::now();
    for _ in 0..iters {
        let h = Sha256::digest(&data);
        std::hint::black_box(&h);
    }
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    emit_mb_per_s("rust.dits-engine", "SHA-256 hash (1 MiB)", MIB, iters, ms);
}
