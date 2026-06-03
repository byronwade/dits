use dits_core::{Chunk, ChunkMeta, Hasher};
use bytes::Bytes;
use std::hint::black_box;
use std::time::Instant;

fn emit(json: serde_json::Value) {
    println!("DITS_BENCH: {}", json);
}

fn make_bytes(size: usize) -> Vec<u8> {
    let mut x = 0x1234_5678_9abc_def0u64;
    let mut out = vec![0u8; size];
    for b in &mut out {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        *b = (x & 0xFF) as u8;
    }
    out
}

fn bench_bytes_throughput(
    suite: &str,
    name: &str,
    bytes_per_iter: usize,
    iterations: usize,
    mut f: impl FnMut(),
) {
    for _ in 0..iterations.min(3) {
        f();
    }

    let start = Instant::now();
    for _ in 0..iterations {
        f();
    }
    let elapsed = start.elapsed();
    let secs = elapsed.as_secs_f64().max(1e-9);
    let mb = (bytes_per_iter as f64 / (1024.0 * 1024.0)) * iterations as f64;

    emit(serde_json::json!({
        "suite": suite,
        "name": name,
        "metric": "throughput",
        "unit": "mb_per_s",
        "value": mb / secs,
        "iterations": iterations,
        "bytes_per_iter": bytes_per_iter,
        "elapsed_ms_total": elapsed.as_secs_f64() * 1000.0,
    }));
}

fn bench_ops_throughput(suite: &str, name: &str, iterations: usize, mut f: impl FnMut()) {
    for _ in 0..iterations.min(10) {
        f();
    }

    let start = Instant::now();
    for _ in 0..iterations {
        f();
    }
    let elapsed = start.elapsed();
    let secs = elapsed.as_secs_f64().max(1e-9);

    emit(serde_json::json!({
        "suite": suite,
        "name": name,
        "metric": "throughput",
        "unit": "ops_per_s",
        "value": (iterations as f64) / secs,
        "iterations": iterations,
        "elapsed_ms_total": elapsed.as_secs_f64() * 1000.0,
    }));
}

#[test]
#[ignore]
fn bench_hasher_hash_1mb() {
    let suite = "rust.dits-core";
    let data = make_bytes(1024 * 1024);

    bench_bytes_throughput(suite, "Hasher::hash(1MiB)", data.len(), 250, || {
        let hash = Hasher::hash(black_box(&data));
        black_box(hash);
    });
}

#[test]
#[ignore]
fn bench_chunk_from_data_1mb() {
    let suite = "rust.dits-core";
    let data = Bytes::from(make_bytes(1024 * 1024));

    bench_bytes_throughput(suite, "Chunk::from_data(1MiB)", data.len(), 200, || {
        let chunk = Chunk::from_data(black_box(data.clone()));
        black_box(chunk.hash());
    });
}

#[test]
#[ignore]
fn bench_chunkmeta_serialize() {
    let suite = "rust.dits-core";
    let meta = ChunkMeta::new(Hasher::hash(b"benchmark"), 1024 * 1024);

    bench_ops_throughput(suite, "bincode::serialize(ChunkMeta)", 250_000, || {
        let bytes = bincode::serialize(black_box(&meta)).unwrap();
        black_box(bytes);
    });

    bench_ops_throughput(suite, "serde_json::to_vec(ChunkMeta)", 50_000, || {
        let bytes = serde_json::to_vec(black_box(&meta)).unwrap();
        black_box(bytes);
    });
}
