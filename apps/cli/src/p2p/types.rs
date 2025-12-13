//! Core types for DITS P2P

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Unique identifier for a P2P share session
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ShareId(pub [u8; 16]);

impl ShareId {
    pub fn new() -> Self {
        let mut bytes = [0u8; 16];
        getrandom::getrandom(&mut bytes).expect("RNG failed");
        Self(bytes)
    }

    pub fn from_bytes(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }
}

impl Default for ShareId {
    fn default() -> Self {
        Self::new()
    }
}

/// Information about a P2P share
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShareInfo {
    pub id: ShareId,
    pub name: String,
    pub path: PathBuf,
    pub read_only: bool,
    pub file_count: u64,
    pub total_size: u64,
}

/// P2P peer information
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerInfo {
    pub id: [u8; 16],
    pub name: String,
    pub address: String,
    pub connected: bool,
    pub last_seen: u64,
}

/// File transfer request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferRequest {
    pub file_path: String,
    pub file_size: u64,
    pub file_hash: [u8; 32],
    pub chunk_count: u32,
}

/// File transfer progress
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: u64,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub chunks_completed: u32,
    pub total_chunks: u32,
    pub speed_bytes_per_sec: u64,
}

/// Chunk identifier for P2P transfers
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChunkId {
    pub file_hash: [u8; 32],
    pub chunk_index: u32,
}

impl ChunkId {
    pub fn new(file_hash: [u8; 32], chunk_index: u32) -> Self {
        Self {
            file_hash,
            chunk_index,
        }
    }
}

/// File attributes for P2P sharing
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FileAttr {
    pub size: u64,
    pub modified: u64,
    pub created: u64,
    pub is_dir: bool,
    pub is_file: bool,
    pub permissions: u32,
}

/// Directory entry for P2P listing
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
}

/// Content hash (BLAKE3)
pub type ContentHash = [u8; 32];

/// Certificate fingerprint for QUIC connections
pub type CertFingerprint = [u8; 32];
