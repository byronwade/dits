//! Wire protocol definitions for DITS P2P

use serde::{Deserialize, Serialize};
use crate::p2p::types::{ChunkId, ContentHash, DirEntry, FileAttr, ShareId, ShareInfo};
use crate::p2p::MAX_MESSAGE_SIZE;

/// Protocol error types
#[derive(Debug, Clone)]
pub enum ProtocolError {
    MessageTooLarge { size: usize, max: usize },
    Serialization(String),
    Deserialization(String),
}

impl std::fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProtocolError::MessageTooLarge { size, max } => {
                write!(f, "Message too large: {} bytes (max: {})", size, max)
            }
            ProtocolError::Serialization(e) => write!(f, "Serialization error: {}", e),
            ProtocolError::Deserialization(e) => write!(f, "Deserialization error: {}", e),
        }
    }
}

impl std::error::Error for ProtocolError {}

/// All possible network messages
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NetMessage {
    Hello(HelloMessage),
    HelloAck(HelloAckMessage),
    ListDir(ListDirRequest),
    ListDirResponse(ListDirResponse),
    GetAttr(GetAttrRequest),
    GetAttrResponse(GetAttrResponse),
    ReadChunk(ReadChunkRequest),
    ReadChunkResponse(ReadChunkResponse),
    WriteChunk(WriteChunkRequest),
    WriteChunkResponse(WriteChunkResponse),
    TransferOffer(TransferOfferMessage),
    TransferAccept(TransferAcceptMessage),
    TransferReject(TransferRejectMessage),
    TransferComplete(TransferCompleteMessage),
    Ping(PingMessage),
    Pong(PongMessage),
    Error(ErrorMessage),
    Goodbye(GoodbyeMessage),
    ListShares(ListSharesRequest),
    ListSharesResponse(ListSharesResponse),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HelloMessage {
    pub protocol_version: u32,
    pub client_id: [u8; 16],
    pub capabilities: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HelloAckMessage {
    pub protocol_version: u32,
    pub session_id: [u8; 16],
    pub host_name: String,
    pub capabilities: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListDirRequest {
    pub path: String,
    pub offset: u64,
    pub limit: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListDirResponse {
    pub entries: Vec<DirEntry>,
    pub has_more: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GetAttrRequest {
    pub path: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GetAttrResponse {
    pub attr: Option<FileAttr>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReadChunkRequest {
    pub chunk_id: ChunkId,
    pub priority: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReadChunkResponse {
    pub chunk_id: ChunkId,
    pub data: Vec<u8>,
    pub checksum: [u8; 32],
    pub is_final: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WriteChunkRequest {
    pub chunk_id: ChunkId,
    pub data: Vec<u8>,
    pub checksum: [u8; 32],
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WriteChunkResponse {
    pub chunk_id: ChunkId,
    pub success: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferOfferMessage {
    pub transfer_id: u64,
    pub file_path: String,
    pub file_size: u64,
    pub file_hash: ContentHash,
    pub chunk_count: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferAcceptMessage {
    pub transfer_id: u64,
    pub missing_chunks: Vec<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferRejectMessage {
    pub transfer_id: u64,
    pub reason: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransferCompleteMessage {
    pub transfer_id: u64,
    pub success: bool,
    pub bytes_transferred: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PingMessage {
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PongMessage {
    pub client_timestamp: u64,
    pub server_timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ErrorMessage {
    pub code: u32,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GoodbyeMessage {
    pub reason: DisconnectReason,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum DisconnectReason {
    ClientShutdown,
    HostShutdown,
    IdleTimeout,
    ProtocolError,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListSharesRequest {
    pub filter_id: Option<ShareId>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListSharesResponse {
    pub shares: Vec<ShareInfo>,
}

/// Serialize a message with length prefix
pub fn serialize_message(msg: &NetMessage) -> Result<Vec<u8>, ProtocolError> {
    let payload = bincode::serialize(msg).map_err(|e| ProtocolError::Serialization(e.to_string()))?;
    let len = payload.len() as u32;
    let mut result = Vec::with_capacity(4 + payload.len());
    result.extend_from_slice(&len.to_le_bytes());
    result.extend_from_slice(&payload);
    Ok(result)
}

/// Deserialize a message (without length prefix)
pub fn deserialize_message(data: &[u8]) -> Result<NetMessage, ProtocolError> {
    if data.len() > MAX_MESSAGE_SIZE {
        return Err(ProtocolError::MessageTooLarge { size: data.len(), max: MAX_MESSAGE_SIZE });
    }
    bincode::deserialize(data).map_err(|e| ProtocolError::Deserialization(e.to_string()))
}
