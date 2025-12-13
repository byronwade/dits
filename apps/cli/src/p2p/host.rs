//! P2P Host Server for DITS
//!
//! This module implements the server side of DITS P2P functionality,
//! allowing repositories to be shared over the network using QUIC.

use std::path::PathBuf;
use std::sync::Arc;
use anyhow::{Context, Result};
use tokio::sync::RwLock;
use tracing::info;

use crate::p2p::types::{ShareId, ShareInfo};
use crate::p2p::crypto::generate_join_code;
use crate::Repository;

/// Configuration for the P2P host server
#[derive(Debug, Clone)]
pub struct HostConfig {
    /// Repository to share
    pub repo_path: PathBuf,
    /// Custom name for the share
    pub name: Option<String>,
    /// Port to listen on
    pub port: u16,
    /// Bind address
    pub bind_addr: String,
    /// Maximum concurrent connections
    pub max_connections: usize,
    /// Whether to run as daemon
    pub daemon: bool,
}

/// P2P Host Server
pub struct P2pHost {
    config: HostConfig,
    share_id: ShareId,
    join_code: String,
    repository: Arc<RwLock<Repository>>,
}

impl P2pHost {
    /// Create a new P2P host server
    pub async fn new(config: HostConfig) -> Result<Self> {
        // Validate repository
        let repo = Repository::open(&config.repo_path)
            .with_context(|| format!("Failed to open repository: {}", config.repo_path.display()))?;

        // Generate unique share ID and join code
        let share_id = ShareId::new();
        let join_code = generate_join_code(&share_id);

        info!("Created P2P host for repository: {}", config.repo_path.display());
        info!("Share ID: {:?}", share_id);
        info!("Join code: {}", join_code);

        Ok(Self {
            config,
            share_id,
            join_code,
            repository: Arc::new(RwLock::new(repo)),
        })
    }

    /// Start the P2P host server
    pub async fn start(&self) -> Result<()> {
        let addr = format!("{}:{}", self.config.bind_addr, self.config.port);
        info!("Starting P2P host server on {}", addr);

        // TODO: Initialize QUIC endpoint
        // TODO: Register with signaling server
        // TODO: Start accepting connections

        println!("🚀 P2P repository share active!");
        println!("📋 Join code: {}", self.join_code);
        println!("🌐 Address: {}", addr);
        println!("📁 Repository: {}", self.config.repo_path.display());

        if self.config.daemon {
            println!("🔄 Running in daemon mode...");
            // TODO: Implement daemon mode (run in background)
            println!("   (Would run in background)");
        } else {
            println!("Press Ctrl+C to stop sharing");
            // TODO: Wait for shutdown signal
        }

        Ok(())
    }

    /// Stop the P2P host server
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping P2P host server");
        // TODO: Clean shutdown of QUIC endpoint and signaling
        println!("🛑 P2P share stopped");
        Ok(())
    }

    /// Get share information
    pub fn share_info(&self) -> ShareInfo {
        ShareInfo {
            id: self.share_id,
            name: self.config.name.clone()
                .unwrap_or_else(|| "DITS Repository".to_string()),
            path: self.config.repo_path.clone(),
            read_only: false, // TODO: Make this configurable
            file_count: 0, // TODO: Calculate actual file count
            total_size: 0, // TODO: Calculate actual total size
        }
    }

    /// Get the join code
    pub fn join_code(&self) -> &str {
        &self.join_code
    }
}

/// Start a P2P host server with the given configuration
pub async fn start_p2p_host(config: HostConfig) -> Result<P2pHost> {
    let host = P2pHost::new(config).await?;
    host.start().await?;
    Ok(host)
}
