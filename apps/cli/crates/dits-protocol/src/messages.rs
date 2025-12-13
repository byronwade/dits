//! Protocol messages.

use serde::{Deserialize, Serialize};

/// Protocol message types.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Message {
    /// Handshake request.
    Hello { version: u8, capabilities: Vec<String> },
    /// Handshake response.
    HelloAck { version: u8, capabilities: Vec<String> },
    /// Request chunks.
    WantChunks { hashes: Vec<String> },
    /// Offer chunks.
    HaveChunks { hashes: Vec<String> },
    /// Chunk data.
    ChunkData { hash: String, data: Vec<u8> },
    /// Error.
    Error { code: String, message: String },
}
