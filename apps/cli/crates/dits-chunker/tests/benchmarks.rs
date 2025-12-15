use dits_chunker::fastcdc::FastCDCChunker;
use dits_chunker::hash::{Blake3Hasher, HashAlgorithm, HashFactory, Hasher, Sha256Hasher, Sha3256Hasher};
use dits_chunker::chonkers::ChonkersChunker;
use dits_chunker::Chunker;
use std::hint::black_box;
use std::io::Cursor;
use std::time::Instant;

fn emit(json: serde_json::Value) {
    println!("DITS_BENCH: {}", json);
}

fn make_bytes(size: usize) -> Vec<u8> {
    let mut x = 0x0ddc_0ffe_e0dd_f00du64;
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
    for _ in 0..iterations.min(2) {
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

#[test]
#[ignore]
fn bench_fastcdc_chunk_32mb() {
    let suite = "rust.dits-chunker";
    let data = make_bytes(32 * 1024 * 1024);
    let chunker = FastCDCChunker::new();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    bench_bytes_throughput(suite, "FastCDCChunker::chunk(32MiB)", data.len(), 8, || {
        rt.block_on(async {
            let reader = Cursor::new(black_box(data.as_slice()));
            let chunks = chunker.chunk(reader).await.unwrap();
            black_box(chunks.len());
        });
    });
}

#[test]
#[ignore]
fn bench_chonkers_chunk_32mb() {
    let suite = "rust.dits-chunker";
    let data = make_bytes(32 * 1024 * 1024);
    let chunker = ChonkersChunker::new();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    bench_bytes_throughput(suite, "ChonkersChunker::chunk(32MiB)", data.len(), 5, || {
        rt.block_on(async {
            let reader = Cursor::new(black_box(data.as_slice()));
            let chunks = chunker.chunk(reader).await.unwrap();
            black_box(chunks.len());
        });
    });
}

#[test]
#[ignore]
fn bench_hashers_1mb() {
    let suite = "rust.dits-chunker";
    let data = make_bytes(1024 * 1024);
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    let blake3 = Blake3Hasher::new();
    let sha256 = Sha256Hasher::new();
    let sha3 = Sha3256Hasher::new();

    bench_bytes_throughput(suite, "Blake3Hasher::hash(1MiB)", data.len(), 200, || {
        rt.block_on(async {
            let h = blake3.hash(black_box(&data)).await;
            black_box(h);
        });
    });

    bench_bytes_throughput(suite, "Sha256Hasher::hash(1MiB)", data.len(), 75, || {
        rt.block_on(async {
            let h = sha256.hash(black_box(&data)).await;
            black_box(h);
        });
    });

    bench_bytes_throughput(suite, "Sha3_256Hasher::hash(1MiB)", data.len(), 40, || {
        rt.block_on(async {
            let h = sha3.hash(black_box(&data)).await;
            black_box(h);
        });
    });

    // Also benchmark factory dispatch overhead (small payload)
    let small = &data[..4096];
    let factory = HashFactory::create(HashAlgorithm::Blake3);
    bench_bytes_throughput(suite, "HashFactory(Box<dyn Hasher>)::hash(4KiB)", small.len(), 50_000, || {
        rt.block_on(async {
            let h = factory.hash(black_box(small)).await;
            black_box(h);
        });
    });
}
