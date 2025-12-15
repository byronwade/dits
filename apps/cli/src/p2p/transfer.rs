//! P2P file transfer for DITS
//!
//! Handles sending and receiving files between peers.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Zero-copy file operations using memory mapping
pub mod zero_copy {
    use memmap2::{Mmap, MmapMut};
    use std::fs::File;
    use std::path::Path;

    /// Memory-mapped file reader for zero-copy chunk access
    pub struct MmapChunkReader {
        mmap: Mmap,
        chunk_size: usize,
    }

    impl MmapChunkReader {
        pub fn new(path: &Path, chunk_size: usize) -> std::io::Result<Self> {
            let file = File::open(path)?;
            let mmap = unsafe { Mmap::map(&file)? };

            Ok(Self { mmap, chunk_size })
        }

        /// Read chunk with zero-copy (returns slice directly from memory map)
        pub fn read_chunk(&self, chunk_index: u32) -> Option<&[u8]> {
            let offset = (chunk_index as usize) * self.chunk_size;
            if offset >= self.mmap.len() {
                return None;
            }

            let end = std::cmp::min(offset + self.chunk_size, self.mmap.len());
            Some(&self.mmap[offset..end])
        }

        /// Get total number of chunks
        pub fn chunk_count(&self) -> u32 {
            ((self.mmap.len() + self.chunk_size - 1) / self.chunk_size) as u32
        }
    }

    /// Memory-mapped file writer for zero-copy chunk storage
    pub struct MmapChunkWriter {
        mmap: MmapMut,
        chunk_size: usize,
    }

    impl MmapChunkWriter {
        pub fn new(path: &Path, total_size: u64, chunk_size: usize) -> std::io::Result<Self> {
            let file = std::fs::OpenOptions::new()
                .read(true)
                .write(true)
                .create(true)
                .open(path)?;

            file.set_len(total_size)?;
            let mmap = unsafe { MmapMut::map_mut(&file)? };

            Ok(Self { mmap, chunk_size })
        }

        /// Write chunk with zero-copy (directly to memory map)
        pub fn write_chunk(&mut self, chunk_index: u32, data: &[u8]) -> std::io::Result<()> {
            let offset = (chunk_index as usize) * self.chunk_size;
            if offset + data.len() > self.mmap.len() {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Chunk data exceeds allocated space",
                ));
            }

            self.mmap[offset..offset + data.len()].copy_from_slice(data);
            self.mmap.flush_range(offset, data.len())?;
            Ok(())
        }
    }

    /// Sendfile-based zero-copy network transfer (Linux only)
    #[cfg(target_os = "linux")]
    pub mod sendfile {
        use std::fs::File;
        use std::os::unix::io::AsRawFd;
        use std::path::Path;

        /// Send file chunk directly from disk to network without copying to userspace
        pub async fn send_chunk_zero_copy(
            file: &File,
            offset: u64,
            size: usize,
            stream: &mut crate::p2p::net::SendStream,
        ) -> std::io::Result<()> {
            use tokio::io::AsyncWriteExt;

            // For now, fall back to regular read + write
            // In a full implementation, this would use sendfile or splice
            let mut buffer = vec![0u8; size];
            file.read_exact_at(&mut buffer, offset)?;
            stream.write_all(&buffer).await?;

            Ok(())
        }

        /// Extension trait for File to add read_exact_at
        pub trait FileExt {
            fn read_exact_at(&self, buf: &mut [u8], offset: u64) -> std::io::Result<()>;
        }

        impl FileExt for File {
            fn read_exact_at(&self, buf: &mut [u8], offset: u64) -> std::io::Result<()> {
                use std::os::unix::fs::FileExt;
                self.read_exact_at(buf, offset)
            }
        }
    }
}

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

/// Multi-peer transfer manager for parallel downloads from multiple sources
pub struct MultiPeerTransferManager {
    chunk_size: usize,
    max_peers_per_chunk: usize,
}

impl MultiPeerTransferManager {
    pub fn new() -> Self {
        Self {
            chunk_size: P2P_CHUNK_SIZE,
            max_peers_per_chunk: 3, // Download each chunk from up to 3 peers
        }
    }

    /// Start parallel download from multiple peers
pub async fn download_parallel(
        &self,
        file_path: &Path,
        file_size: u64,
        file_hash: ContentHash,
        peers: Vec<TransferPeer>,
    ) -> Result<(), TransferError> {
        let chunk_count = ((file_size as usize + self.chunk_size - 1) / self.chunk_size) as u32;

        // Create download session
        let session = Arc::new(MultiPeerDownloadSession::new(
            file_path.to_path_buf(),
            file_size,
            file_hash,
            chunk_count,
            peers,
        ));

        // Start parallel downloads
        let mut tasks = Vec::new();

        for peer in &session.peers {
            let session_clone = session.clone();
            let peer_clone = peer.clone();

            let task = tokio::spawn(async move {
                Self::download_from_peer(session_clone, peer_clone).await
            });
            tasks.push(task);
        }

        // Wait for all downloads to complete
        for task in tasks {
            task.await
                .map_err(|e| TransferError::TaskError(e.to_string()))??;
        }

        // Verify final file
        session.verify_file().await?;

        Ok(())
    }

    async fn download_from_peer(
        session: Arc<MultiPeerDownloadSession>,
        peer: TransferPeer,
    ) -> Result<(), TransferError> {
        // Connect to peer and request chunks
        loop {
            let chunk_index = session.get_next_chunk().await?;
            match chunk_index {
                Some(index) => {
                    let chunk = Self::request_chunk_from_peer(&peer, index).await?;
                    session.store_chunk(index, chunk).await?;
                }
                None => break, // No more chunks
            }
        }
        Ok(())
    }

    async fn request_chunk_from_peer(
        _peer: &TransferPeer,
        _chunk_index: u32,
    ) -> Result<ChunkData, TransferError> {
        // Implementation would connect to peer and request chunk
        // This is a placeholder - actual implementation would use QUIC
        Err(TransferError::NotImplemented("Peer chunk request not implemented".to_string()))
    }
}

/// Peer information for multi-peer transfers.
#[derive(Clone, Debug)]
pub struct TransferPeer {
    pub address: String,
    pub fingerprint: String,
}

/// Multi-peer download session
pub struct MultiPeerDownloadSession {
    file_path: std::path::PathBuf,
    file_size: u64,
    file_hash: ContentHash,
    chunk_count: u32,
    peers: Vec<TransferPeer>,
    downloaded_chunks: Mutex<Vec<Option<ChunkData>>>,
    chunk_assignments: Mutex<HashMap<u32, Vec<TransferPeer>>>,
}

impl MultiPeerDownloadSession {
    fn new(
        file_path: std::path::PathBuf,
        file_size: u64,
        file_hash: ContentHash,
        chunk_count: u32,
        peers: Vec<TransferPeer>,
    ) -> Self {
        Self {
            file_path,
            file_size,
            file_hash,
            chunk_count,
            peers,
            downloaded_chunks: Mutex::new(vec![None; chunk_count as usize]),
            chunk_assignments: Mutex::new(HashMap::new()),
        }
    }

    async fn get_next_chunk(&self) -> Result<Option<u32>, TransferError> {
        let downloaded = self.downloaded_chunks.lock().await;
        for (index, chunk) in downloaded.iter().enumerate() {
            if chunk.is_none() {
                return Ok(Some(index as u32));
            }
        }
        Ok(None)
    }

    async fn store_chunk(&self, index: u32, chunk: ChunkData) -> Result<(), TransferError> {
        let mut downloaded = self.downloaded_chunks.lock().await;
        if (index as usize) < downloaded.len() {
            downloaded[index as usize] = Some(chunk);
        }
        Ok(())
    }

    async fn verify_file(&self) -> Result<(), TransferError> {
        // Assemble and verify final file
        let downloaded = self.downloaded_chunks.lock().await;
        let mut file = std::fs::File::create(&self.file_path)?;

        for chunk in downloaded.iter() {
            if let Some(chunk_data) = chunk {
                file.write_all(&chunk_data.data)?;
            } else {
                return Err(TransferError::IncompleteDownload);
            }
        }

        // Verify hash
        let computed_hash = checksum(&std::fs::read(&self.file_path)?);
        if computed_hash != self.file_hash {
            return Err(TransferError::HashMismatch);
        }

        Ok(())
    }
}

/// Performance monitor for adaptive scheduling
pub struct PerformanceMonitor {
    start_time: std::time::Instant,
    bytes_transferred: u64,
    chunks_completed: u32,
    active_connections: u32,
    rtt_samples: Vec<f64>,
    bandwidth_samples: Vec<f64>,
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self {
            start_time: std::time::Instant::now(),
            bytes_transferred: 0,
            chunks_completed: 0,
            active_connections: 0,
            rtt_samples: Vec::new(),
            bandwidth_samples: Vec::new(),
        }
    }

    /// Record a completed chunk transfer
    pub fn record_chunk_transfer(&mut self, bytes: u64, rtt_ms: f64) {
        self.bytes_transferred += bytes;
        self.chunks_completed += 1;

        let elapsed = self.start_time.elapsed().as_secs_f64();
        let bandwidth_mbps = (self.bytes_transferred as f64 * 8.0) / (elapsed * 1_000_000.0);

        self.rtt_samples.push(rtt_ms);
        self.bandwidth_samples.push(bandwidth_mbps);

        // Keep only recent samples (last 100)
        if self.rtt_samples.len() > 100 {
            self.rtt_samples.remove(0);
            self.bandwidth_samples.remove(0);
        }
    }

    /// Get current bandwidth estimate (Mbps)
    pub fn current_bandwidth(&self) -> f64 {
        self.bandwidth_samples.last().copied().unwrap_or(100.0)
    }

    /// Get current latency estimate (ms)
    pub fn current_latency(&self) -> f64 {
        self.rtt_samples.last().copied().unwrap_or(50.0)
    }

    /// Get optimal concurrency for current conditions
    pub fn optimal_concurrency(&self) -> usize {
        let bandwidth = self.current_bandwidth();
        let latency = self.current_latency();

        // Higher bandwidth and lower latency = higher concurrency
        let base_concurrency = if bandwidth > 500.0 {
            64
        } else if bandwidth > 100.0 {
            32
        } else if bandwidth > 10.0 {
            16
        } else {
            8
        };

        // Adjust for latency
        let latency_factor = if latency < 10.0 {
            2.0
        } else if latency < 50.0 {
            1.0
        } else if latency < 200.0 {
            0.5
        } else {
            0.25
        };

        ((base_concurrency as f64 * latency_factor) as usize).max(1).min(256)
    }

    /// Get optimal chunk size for current conditions
    pub fn optimal_chunk_size(&self) -> usize {
        let bandwidth = self.current_bandwidth();
        let latency = self.current_latency();

        // Optimal chunk size balances throughput vs responsiveness
        if bandwidth > 1000.0 && latency < 20.0 {
            // Excellent conditions: large chunks
            8 * 1024 * 1024 // 8MB
        } else if bandwidth > 100.0 && latency < 100.0 {
            // Good conditions: medium chunks
            2 * 1024 * 1024 // 2MB
        } else if latency < 50.0 {
            // Low latency: medium chunks
            1 * 1024 * 1024 // 1MB
        } else {
            // High latency or low bandwidth: small chunks
            256 * 1024 // 256KB
        }
    }

    /// Get transfer statistics
    pub fn stats(&self) -> TransferStats {
        let elapsed = self.start_time.elapsed().as_secs_f64();
        let throughput_mbps = if elapsed > 0.0 {
            (self.bytes_transferred as f64 * 8.0) / (elapsed * 1_000_000.0)
        } else {
            0.0
        };

        TransferStats {
            elapsed_seconds: elapsed,
            bytes_transferred: self.bytes_transferred,
            chunks_completed: self.chunks_completed,
            throughput_mbps,
            current_bandwidth_mbps: self.current_bandwidth(),
            current_latency_ms: self.current_latency(),
            active_connections: self.active_connections,
        }
    }
}

/// Transfer statistics
#[derive(Debug, Clone)]
pub struct TransferStats {
    pub elapsed_seconds: f64,
    pub bytes_transferred: u64,
    pub chunks_completed: u32,
    pub throughput_mbps: f64,
    pub current_bandwidth_mbps: f64,
    pub current_latency_ms: f64,
    pub active_connections: u32,
}

/// Transfer errors
#[derive(Debug)]
pub enum TransferError {
    NotImplemented(String),
    TaskError(String),
    IncompleteDownload,
    HashMismatch,
    IoError(std::io::Error),
}

impl std::fmt::Display for TransferError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferError::NotImplemented(msg) => write!(f, "Not implemented: {}", msg),
            TransferError::TaskError(msg) => write!(f, "Task error: {}", msg),
            TransferError::IncompleteDownload => write!(f, "Download incomplete"),
            TransferError::HashMismatch => write!(f, "File hash mismatch"),
            TransferError::IoError(e) => write!(f, "IO error: {}", e),
        }
    }
}

impl std::error::Error for TransferError {}

impl From<std::io::Error> for TransferError {
    fn from(e: std::io::Error) -> Self {
        TransferError::IoError(e)
    }
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
