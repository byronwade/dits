//! # dits-core
//!
//! The pure-compute heart of Dits: content-defined chunking (FastCDC) and
//! BLAKE3 content addressing. This crate has no I/O, async, or platform
//! dependencies, so the *exact same engine* compiles to the native CLI and to
//! a `wasm32` target for the browser Playground.
//!
//! - [`hash`] — BLAKE3 content addresses ([`Hash`], [`Hasher`]).
//! - [`chunk`] — FastCDC chunking ([`Chunk`], [`ChunkRef`], [`ChunkerConfig`],
//!   [`chunk_data`], [`chunk_data_with_refs`]).
//!
//! The optional `parallel` feature adds rayon-based parallel hashing for native
//! callers; it is off by default and must not be enabled for wasm.

pub mod chunk;
pub mod hash;

pub use chunk::{chunk_data, chunk_data_with_refs, Chunk, ChunkRef, ChunkerConfig};
pub use hash::{Hash, Hasher};

#[cfg(feature = "parallel")]
pub use chunk::{chunk_data_parallel, chunk_data_with_refs_parallel};
