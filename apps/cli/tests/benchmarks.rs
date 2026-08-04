//! Engine and repository micro-benchmarks for the canonical `dits` binary.
//!
//! These are #[ignore]d so they don't run in the normal test pass. The bench
//! collector (`scripts/bench/run.mjs`, `npm run bench`) runs them with
//! `--ignored --nocapture` and scrapes the `DITS_BENCH:` lines.
//!
//! They benchmark the SAME chunking + hashing + repository paths the real
//! binary uses, so website numbers stay tied to measurable code.

use std::io::Cursor;
use std::time::Instant;

use dits::core::{chunk_data, stream_chunk_reader, ChunkerConfig, Hasher};
use dits::Repository;
use tempfile::tempdir;

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

fn emit_wall_ms(suite: &str, name: &str, iters: u64, ms_total: f64, bytes_per_iter: Option<usize>) {
    let value = ms_total / iters as f64;
    let bytes = bytes_per_iter
        .map(|b| format!(r#","bytes_per_iter":{b}"#))
        .unwrap_or_default();
    println!(
        r#"DITS_BENCH: {{"suite":"{suite}","name":"{name}","metric":"latency","unit":"ms","value":{value},"iterations":{iters},"elapsed_ms_total":{ms_total}{bytes}}}"#
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
    emit_mb_per_s(
        "rust.dits-engine",
        "FastCDC chunk (32 MiB)",
        32 * MIB,
        iters,
        ms,
    );
}

#[test]
#[ignore]
fn bench_fastcdc_stream_32mib() {
    let data = make_bytes(32 * MIB);
    let cfg = ChunkerConfig::media();
    let iters = 5u64;
    let _ = stream_chunk_reader(Cursor::new(&data), &cfg, |_| Ok(())).unwrap();
    let t0 = Instant::now();
    for _ in 0..iters {
        let summary = stream_chunk_reader(Cursor::new(&data), &cfg, |chunk| {
            std::hint::black_box(chunk);
            Ok(())
        })
        .unwrap();
        std::hint::black_box(&summary);
    }
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    emit_mb_per_s(
        "rust.dits-engine",
        "FastCDC stream (32 MiB)",
        32 * MIB,
        iters,
        ms,
    );
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

/// End-to-end local repository path: stage a large classified binary (streaming
/// FastCDC ingest), commit, delete the working copy, and check it out again.
///
/// This is a single-machine wall-time measurement of the library API, not a
/// claim about remote transfer, packfiles, or competitive baselines.
#[test]
#[ignore]
fn bench_repo_add_commit_checkout_32mib() {
    let size = 32 * MIB;
    let content = make_bytes(size);
    let iters = 3u64;
    let mut add_ms = 0.0;
    let mut commit_ms = 0.0;
    let mut checkout_ms = 0.0;

    for _ in 0..iters {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let path = temp.path().join("asset.bin");
        std::fs::write(&path, &content).unwrap();

        let t_add = Instant::now();
        let add = repo.add("asset.bin").unwrap();
        add_ms += t_add.elapsed().as_secs_f64() * 1000.0;
        assert!(add.files_staged == 1);
        assert!(add.new_chunks + add.dedup_chunks > 1);

        let t_commit = Instant::now();
        let commit = repo.commit("bench snapshot").unwrap();
        commit_ms += t_commit.elapsed().as_secs_f64() * 1000.0;

        std::fs::remove_file(&path).unwrap();
        let t_checkout = Instant::now();
        let checkout = repo.checkout(&commit.hash).unwrap();
        checkout_ms += t_checkout.elapsed().as_secs_f64() * 1000.0;
        assert_eq!(checkout.files_restored, 1);
        assert_eq!(std::fs::read(&path).unwrap(), content);
    }

    let total_ms = add_ms + commit_ms + checkout_ms;

    emit_wall_ms(
        "rust.dits-repo",
        "add 32 MiB binary (streaming)",
        iters,
        add_ms,
        Some(size),
    );
    emit_wall_ms(
        "rust.dits-repo",
        "commit after 32 MiB add",
        iters,
        commit_ms,
        Some(size),
    );
    emit_wall_ms(
        "rust.dits-repo",
        "checkout 32 MiB binary",
        iters,
        checkout_ms,
        Some(size),
    );
    emit_wall_ms(
        "rust.dits-repo",
        "add+commit+checkout 32 MiB",
        iters,
        total_ms,
        Some(size),
    );
    emit_mb_per_s(
        "rust.dits-repo",
        "add 32 MiB binary throughput",
        size,
        iters,
        add_ms,
    );
}

/// Second-version append-style edit: stage a 32 MiB file, then re-stage a
/// near-identical 33 MiB mutation and measure store growth indirectly via
/// dedup chunk counts plus wall time for the second add.
#[test]
#[ignore]
fn bench_repo_dedup_append_edit() {
    let base = make_bytes(32 * MIB);
    let mut edited = base.clone();
    edited.extend_from_slice(&make_bytes(MIB)); // append 1 MiB
    // Flip a middle byte so CDC still has a local change plus the append.
    if let Some(b) = edited.get_mut(16 * MIB) {
        *b = b.wrapping_add(1);
    }

    let temp = tempdir().unwrap();
    let repo = Repository::init(temp.path()).unwrap();
    let path = temp.path().join("clip.bin");
    std::fs::write(&path, &base).unwrap();
    repo.add("clip.bin").unwrap();
    repo.commit("v1").unwrap();

    std::fs::write(&path, &edited).unwrap();
    let t0 = Instant::now();
    let add = repo.add("clip.bin").unwrap();
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    assert!(add.files_staged == 1);
    // Dedup must reuse most of the original chunks on an append-ish edit.
    assert!(
        add.dedup_chunks > 0,
        "expected reused chunks on append-ish edit, got new={} dedup={}",
        add.new_chunks,
        add.dedup_chunks
    );

    emit_wall_ms(
        "rust.dits-repo",
        "re-add append-ish 33 MiB edit",
        1,
        ms,
        Some(edited.len()),
    );
    println!(
        r#"DITS_BENCH: {{"suite":"rust.dits-repo","name":"append-ish edit new chunks","metric":"count","unit":"chunks","value":{},"iterations":1,"elapsed_ms_total":{ms}}}"#,
        add.new_chunks
    );
    println!(
        r#"DITS_BENCH: {{"suite":"rust.dits-repo","name":"append-ish edit dedup chunks","metric":"count","unit":"chunks","value":{},"iterations":1,"elapsed_ms_total":{ms}}}"#,
        add.dedup_chunks
    );
}
