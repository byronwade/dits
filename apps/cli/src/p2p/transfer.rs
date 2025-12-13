//! P2P file transfer for DITS
//!
//! Handles sending and receiving files between peers.

use std::io::{Read, Write};
use std::path::Path;


use crate::p2p::crypto::{checksum, StreamingHasher};
use crate::p2p::types::{ContentHash, TransferProgress};
use crate::p2p::P2P_CHUNK_SIZE;

/// Transfer state
#[derive(Debug, Clone)]
pub enum TransferState {
    Pending,
    InProgress,
    Completed,
    Failed(String),
    Cancelled,
}

/// File transfer manager
pub struct TransferManager {
    chunk_size: usize,
}

impl TransferManager {
    pub fn new() -> Self {
        Self {
            chunk_size: P2P_CHUNK_SIZE,
        }
    }

    /// Set custom chunk size
    pub fn with_chunk_size(mut self, chunk_size: usize) -> Self {
        self.chunk_size = chunk_size;
        self
    }

    /// Calculate file hash and chunk info
    pub fn prepare_file(&self, path: &Path) -> std::io::Result<FileInfo> {
        let file = std::fs::File::open(path)?;
        let metadata = file.metadata()?;
        let file_size = metadata.len();

        // Calculate hash
        let mut hasher = StreamingHasher::new();
        let mut reader = std::io::BufReader::new(file);
        let mut buffer = vec![0u8; self.chunk_size];

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let file_hash = hasher.finalize();
        let chunk_count = ((file_size as usize + self.chunk_size - 1) / self.chunk_size) as u32;

        Ok(FileInfo {
            path: path.to_path_buf(),
            size: file_size,
            hash: file_hash,
            chunk_count,
        })
    }

    /// Read a specific chunk from a file
    pub fn read_chunk(&self, path: &Path, chunk_index: u32) -> std::io::Result<ChunkData> {
        let mut file = std::fs::File::open(path)?;
        let offset = (chunk_index as usize) * self.chunk_size;

        use std::io::Seek;
        file.seek(std::io::SeekFrom::Start(offset as u64))?;

        let mut buffer = vec![0u8; self.chunk_size];
        let bytes_read = file.read(&mut buffer)?;
        buffer.truncate(bytes_read);

        let chunk_hash = checksum(&buffer);

        Ok(ChunkData {
            index: chunk_index,
            data: buffer,
            hash: chunk_hash,
        })
    }

    /// Write a chunk to a file
    pub fn write_chunk(&self, path: &Path, chunk_index: u32, data: &[u8]) -> std::io::Result<()> {
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(path)?;

        let offset = (chunk_index as usize) * self.chunk_size;

        use std::io::Seek;
        file.seek(std::io::SeekFrom::Start(offset as u64))?;
        file.write_all(data)?;

        Ok(())
    }

    /// Verify a received chunk
    pub fn verify_chunk(&self, data: &[u8], expected_hash: &ContentHash) -> bool {
        &checksum(data) == expected_hash
    }
}

impl Default for TransferManager {
    fn default() -> Self {
        Self::new()
    }
}

/// File information for transfer
#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: std::path::PathBuf,
    pub size: u64,
    pub hash: ContentHash,
    pub chunk_count: u32,
}

/// Chunk data
#[derive(Debug, Clone)]
pub struct ChunkData {
    pub index: u32,
    pub data: Vec<u8>,
    pub hash: ContentHash,
}

/// Outgoing transfer session
pub struct OutgoingTransfer {
    transfer_id: u64,
    file_info: FileInfo,
    chunks_sent: u32,
    bytes_sent: u64,
}

impl OutgoingTransfer {
    pub fn new(transfer_id: u64, file_info: FileInfo) -> Self {
        Self {
            transfer_id,
            file_info,
            chunks_sent: 0,
            bytes_sent: 0,
        }
    }

    pub fn transfer_id(&self) -> u64 {
        self.transfer_id
    }

    pub fn file_info(&self) -> &FileInfo {
        &self.file_info
    }

    pub fn progress(&self) -> TransferProgress {
        TransferProgress {
            transfer_id: self.transfer_id,
            bytes_transferred: self.bytes_sent,
            total_bytes: self.file_info.size,
            chunks_completed: self.chunks_sent,
            total_chunks: self.file_info.chunk_count,
            speed_bytes_per_sec: 0, // TODO: Calculate actual speed
        }
    }

    pub fn mark_chunk_sent(&mut self, chunk_size: u64) {
        self.chunks_sent += 1;
        self.bytes_sent += chunk_size;
    }

    pub fn is_complete(&self) -> bool {
        self.chunks_sent >= self.file_info.chunk_count
    }
}

/// Incoming transfer session
pub struct IncomingTransfer {
    transfer_id: u64,
    file_path: std::path::PathBuf,
    file_size: u64,
    file_hash: ContentHash,
    chunk_count: u32,
    chunks_received: Vec<bool>,
    bytes_received: u64,
}

impl IncomingTransfer {
    pub fn new(
        transfer_id: u64,
        file_path: std::path::PathBuf,
        file_size: u64,
        file_hash: ContentHash,
        chunk_count: u32,
    ) -> Self {
        Self {
            transfer_id,
            file_path,
            file_size,
            file_hash,
            chunk_count,
            chunks_received: vec![false; chunk_count as usize],
            bytes_received: 0,
        }
    }

    pub fn transfer_id(&self) -> u64 {
        self.transfer_id
    }

    pub fn file_path(&self) -> &Path {
        &self.file_path
    }

    pub fn progress(&self) -> TransferProgress {
        let chunks_completed = self.chunks_received.iter().filter(|&&x| x).count() as u32;
        TransferProgress {
            transfer_id: self.transfer_id,
            bytes_transferred: self.bytes_received,
            total_bytes: self.file_size,
            chunks_completed,
            total_chunks: self.chunk_count,
            speed_bytes_per_sec: 0,
        }
    }

    pub fn mark_chunk_received(&mut self, chunk_index: u32, chunk_size: u64) {
        if (chunk_index as usize) < self.chunks_received.len() {
            self.chunks_received[chunk_index as usize] = true;
            self.bytes_received += chunk_size;
        }
    }

    pub fn missing_chunks(&self) -> Vec<u32> {
        self.chunks_received
            .iter()
            .enumerate()
            .filter(|(_, &received)| !received)
            .map(|(i, _)| i as u32)
            .collect()
    }

    pub fn is_complete(&self) -> bool {
        self.chunks_received.iter().all(|&x| x)
    }

    pub fn verify_file(&self) -> std::io::Result<bool> {
        let mut hasher = StreamingHasher::new();
        let file = std::fs::File::open(&self.file_path)?;
        let mut reader = std::io::BufReader::new(file);
        let mut buffer = vec![0u8; P2P_CHUNK_SIZE];

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let computed_hash = hasher.finalize();
        Ok(computed_hash == self.file_hash)
    }
}
