//! P2P Client for DITS
//!
//! This module implements the client side of DITS P2P functionality,
//! allowing connection to shared repositories using join codes.

use std::path::PathBuf;
use std::time::Duration;
use anyhow::{Context, Result};
use tokio::time::timeout;
use tracing::{info, warn};

use crate::p2p::types::ShareId;
use crate::p2p::crypto::parse_join_code;

/// Configuration for the P2P client
#[derive(Debug, Clone)]
pub struct ClientConfig {
    /// Join code or direct address to connect to
    pub target: String,
    /// Local mount path
    pub mount_path: PathBuf,
    /// Connection timeout in seconds
    pub timeout: Duration,
}

/// P2P Client
pub struct P2pClient {
    config: ClientConfig,
    share_id: Option<ShareId>,
}

impl P2pClient {
    /// Create a new P2P client
    pub fn new(config: ClientConfig) -> Self {
        Self {
            config,
            share_id: None,
        }
    }

    /// Connect to a P2P shared repository
    pub async fn connect(&mut self) -> Result<()> {
        info!("Connecting to P2P repository: {}", self.config.target);

        // Parse the join code to get share ID
        let share_id = if let Ok(id) = parse_join_code(&self.config.target) {
            info!("Parsed join code, share ID: {:?}", id);
            id
        } else {
            // TODO: Handle direct IP addresses
            return Err(anyhow::anyhow!("Invalid join code format: {}", self.config.target));
        };

        self.share_id = Some(share_id);

        // TODO: Connect to signaling server to find peer
        // TODO: Establish QUIC connection to peer
        // TODO: Mount repository at local path

        println!("🔗 Connecting to repository...");
        println!("🎯 Join code: {}", self.config.target);
        println!("📁 Mount path: {}", self.config.mount_path.display());

        // TODO: Implement actual connection logic
        println!("\n⚠️  P2P client functionality is not yet fully implemented.");
        println!("   This is a placeholder for the Wormhole-style P2P client.");
        println!("   Would connect to peer and mount repository.");

        Ok(())
    }

    /// Disconnect from the P2P repository
    pub async fn disconnect(&self) -> Result<()> {
        if let Some(share_id) = self.share_id {
            info!("Disconnecting from share: {:?}", share_id);
            // TODO: Clean disconnect from peer
            println!("👋 Disconnected from P2P repository");
        } else {
            warn!("No active connection to disconnect");
        }
        Ok(())
    }

    /// Get connection status
    pub fn status(&self) -> ClientStatus {
        if self.share_id.is_some() {
            // TODO: Check actual connection status
            ClientStatus::Connected
        } else {
            ClientStatus::Disconnected
        }
    }
}

/// Client connection status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClientStatus {
    /// Not connected to any repository
    Disconnected,
    /// Connecting to repository
    Connecting,
    /// Successfully connected and mounted
    Connected,
    /// Connection failed
    Failed,
}

/// Connect to a P2P repository with timeout
pub async fn connect_p2p_repository(config: ClientConfig) -> Result<P2pClient> {
    let mut client = P2pClient::new(config);

    // Apply timeout to connection attempt
    timeout(client.config.timeout, client.connect())
        .await
        .with_context(|| format!("Connection timed out after {:?}", client.config.timeout))??;

    Ok(client)
}
