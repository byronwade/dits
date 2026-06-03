//! Golden test: guarantees the extracted engine produces byte-identical chunk
//! boundaries and BLAKE3 hashes to the pre-extraction `apps/cli` code.
//!
//! The expected values were captured from `apps/cli/src/core/chunk.rs`
//! (`chunk_data_with_refs`, default ChunkerConfig) BEFORE the move to
//! `dits-core`, using the deterministic LCG buffer reproduced below. If this
//! test ever fails, the chunking or hashing behavior changed — the CLI and the
//! browser would then disagree, which must never happen silently.

use dits_core::{chunk_data_with_refs, ChunkerConfig};

/// Reproduce the exact deterministic buffer used to capture the snapshot.
fn golden_buffer() -> Vec<u8> {
    let mut data = vec![0u8; 300_000];
    let mut s: u32 = 0x1234_5678;
    for b in data.iter_mut() {
        s = s.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        *b = (s >> 24) as u8;
    }
    data
}

#[test]
fn golden_matches_pre_extraction_cli() {
    // (offset, size, blake3_hex) captured from apps/cli before extraction.
    let expected: &[(u64, u64, &str)] = &[
        (0, 70929, "8978a66833daad5e84929e2bbe0c57e5db7a8d0a5fd575c51b8ec10f51f221cc"),
        (70929, 63867, "d9ed96f2100507b1e4e023547df92f153387175f0d02bac69d2691f0b9ea6aa9"),
        (134796, 112090, "d0fe5f0c6351af0069b64809fee2c52e49428d4f30afb42bab1c1bcc764ccc53"),
        (246886, 53114, "26077d705f927b8453ea190c10fad0863e74462a156ac877411c3471a8a689cd"),
    ];

    let (_chunks, refs) = chunk_data_with_refs(&golden_buffer(), &ChunkerConfig::default());

    assert_eq!(refs.len(), expected.len(), "chunk count changed");
    for (r, (off, size, hex)) in refs.iter().zip(expected) {
        assert_eq!(r.offset, *off, "offset changed");
        assert_eq!(r.size, *size, "size changed");
        assert_eq!(r.hash.to_hex(), *hex, "hash changed at offset {}", off);
    }
}
