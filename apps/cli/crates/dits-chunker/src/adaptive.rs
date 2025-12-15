//! Adaptive chunking based on network conditions and file type.

use async_trait::async_trait;
use bytes::Bytes;
use dits_core::{Chunk, Result};
use tokio::io::AsyncRead;

use crate::{Chunker, ChunkerConfig};

/// Adaptive chunker that adjusts chunk sizes based on network conditions
pub struct AdaptiveChunker {
    base_config: ChunkerConfig,
    network_estimator: NetworkEstimator,
}

impl AdaptiveChunker {
    /// Create a new adaptive chunker
    pub fn new() -> Self {
        Self {
            base_config: ChunkerConfig::default(),
            network_estimator: NetworkEstimator::new(),
        }
    }

    /// Create with custom network conditions
    pub fn with_network_conditions(bandwidth_mbps: f64, latency_ms: f64) -> Self {
        let mut config = Self::new();
        config.network_estimator = NetworkEstimator::with_conditions(bandwidth_mbps, latency_ms);
        config
    }

    /// Get optimal chunk size for current network conditions
    fn optimal_chunk_size(&self) -> usize {
        let bandwidth = self.network_estimator.bandwidth_mbps();
        let latency = self.network_estimator.latency_ms();

        // Optimal chunk size balances bandwidth utilization vs latency
        // Larger chunks = better bandwidth utilization
        // Smaller chunks = lower latency for first byte

        if bandwidth > 1000.0 {
            // 1Gbps+: Large chunks for maximum throughput
            8 * 1024 * 1024 // 8MB
        } else if bandwidth > 100.0 {
            // 100Mbps+: Medium chunks
            2 * 1024 * 1024 // 2MB
        } else if latency < 50.0 {
            // Low latency: Medium chunks
            1 * 1024 * 1024 // 1MB
        } else {
            // High latency: Smaller chunks for responsiveness
            256 * 1024 // 256KB
        }
    }

    /// Adjust configuration for optimal performance
    fn adaptive_config(&self) -> ChunkerConfig {
        let optimal_size = self.optimal_chunk_size();
        let min_size = (optimal_size / 4).max(64 * 1024); // Min 64KB
        let max_size = (optimal_size * 4).min(32 * 1024 * 1024); // Max 32MB

        ChunkerConfig {
            min_size,
            max_size,
            avg_size: optimal_size,
            compress: self.base_config.compress,
            compression_level: self.base_config.compression_level,
        }
    }
}

/// Network condition estimator
#[derive(Clone, Debug)]
pub struct NetworkEstimator {
    bandwidth_mbps: f64,
    latency_ms: f64,
    samples: Vec<NetworkSample>,
}

#[derive(Clone, Debug)]
struct NetworkSample {
    timestamp: std::time::Instant,
    bandwidth_mbps: f64,
    latency_ms: f64,
}

impl NetworkEstimator {
    pub fn new() -> Self {
        Self {
            bandwidth_mbps: 100.0, // Default assumption
            latency_ms: 50.0,      // Default assumption
            samples: Vec::new(),
        }
    }

    pub fn with_conditions(bandwidth_mbps: f64, latency_ms: f64) -> Self {
        Self {
            bandwidth_mbps,
            latency_ms,
            samples: Vec::new(),
        }
    }

    pub fn bandwidth_mbps(&self) -> f64 {
        self.bandwidth_mbps
    }

    pub fn latency_ms(&self) -> f64 {
        self.latency_ms
    }

    /// Update estimates from transfer metrics
    pub fn update_from_transfer(&mut self, bytes: u64, duration_ms: f64, rtt_ms: f64) {
        let bandwidth_mbps = (bytes as f64 * 8.0) / (duration_ms * 1000.0) / 1_000_000.0;

        // Exponential moving average
        let alpha = 0.1;
        self.bandwidth_mbps = self.bandwidth_mbps * (1.0 - alpha) + bandwidth_mbps * alpha;
        self.latency_ms = self.latency_ms * (1.0 - alpha) + rtt_ms * alpha;

        // Keep recent samples
        self.samples.push(NetworkSample {
            timestamp: std::time::Instant::now(),
            bandwidth_mbps,
            latency_ms: rtt_ms,
        });

        // Limit sample history
        if self.samples.len() > 100 {
            self.samples.remove(0);
        }
    }
}

impl Default for AdaptiveChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Chunker for AdaptiveChunker {
    async fn chunk<R: AsyncRead + Unpin + Send>(&self, reader: R) -> Result<Vec<Chunk>>
    where
        R: tokio::io::AsyncReadExt,
    {
        // Use FastCDC with adaptive configuration
        let config = self.adaptive_config();
        let fastcdc = crate::fastcdc::FastCDCChunker::with_config(config);
        fastcdc.chunk(reader).await
    }

    fn name(&self) -> &'static str {
        "adaptive"
    }

    fn min_size(&self) -> usize {
        self.adaptive_config().min_size
    }

    fn max_size(&self) -> usize {
        self.adaptive_config().max_size
    }

    fn avg_size(&self) -> usize {
        self.adaptive_config().avg_size
    }
}



