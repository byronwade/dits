//! WebAssembly bindings for the real Dits engine.
//!
//! Everything here delegates to `dits-core` — the exact same FastCDC chunking
//! and BLAKE3 hashing the native CLI runs. Nothing is re-implemented for the
//! browser; this crate only marshals bytes in and chunk records out.

use dits_core::{chunk_data_with_refs, ChunkerConfig};
use wasm_bindgen::prelude::*;

/// One content-defined chunk: where it sits in the input and its BLAKE3 address.
#[wasm_bindgen(getter_with_clone)]
pub struct Chunk {
    /// Byte offset of this chunk within the input.
    pub offset: u32,
    /// Length of this chunk in bytes.
    pub length: u32,
    /// Full BLAKE3 content address as a hex string.
    pub hash: String,
}

/// Chunk-size profile, mirroring `dits_core::ChunkerConfig` presets.
#[wasm_bindgen]
pub enum Profile {
    /// 1K / 4K / 16K — small chunks so the demo is legible on modest inputs.
    Demo,
    /// 4K / 16K / 64K — project files, text, configs.
    Project,
    /// 16K / 64K / 256K — general-purpose default (the CLI default).
    Default,
    /// 64K / 256K / 1M — video, 3D, large binaries.
    Media,
}

fn config_for(profile: Profile) -> ChunkerConfig {
    match profile {
        Profile::Demo => ChunkerConfig::small(),
        Profile::Project => ChunkerConfig::project(),
        Profile::Default => ChunkerConfig::default(),
        Profile::Media => ChunkerConfig::media(),
    }
}

/// Chunk a buffer with the real engine and return one [`Chunk`] per piece.
///
/// This is exactly what the CLI computes in `chunk_data_with_refs` — same
/// boundaries, same BLAKE3 hashes. Runs entirely in the browser; the bytes
/// never leave the page.
#[wasm_bindgen]
pub fn chunk(data: &[u8], profile: Profile) -> Vec<Chunk> {
    let (_chunks, refs) = chunk_data_with_refs(data, &config_for(profile));
    refs.into_iter()
        .map(|r| Chunk {
            offset: r.offset as u32,
            length: r.size as u32,
            hash: r.hash.to_hex().to_string(),
        })
        .collect()
}

/// BLAKE3 content address of a whole buffer, as hex. Handy for a quick
/// "this is the same content" check in the UI.
#[wasm_bindgen]
pub fn hash_hex(data: &[u8]) -> String {
    dits_core::Hasher::hash(data).to_hex().to_string()
}
