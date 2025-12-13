//! Discovery system for DITS P2P
//!
//! Provides multiple peer discovery methods with automatic fallback:
//! - **Direct**: Connect via known IP:port (no discovery needed)
//! - **mDNS**: Zero-config LAN discovery via multicast DNS
//! - **Signal**: WebSocket-based rendezvous server for NAT traversal
//! - **STUN**: External IP discovery for hole-punching
//!
//! # Default Behavior
//!
//! By default, DITS tries discovery methods in priority order:
//! 1. Direct IP (if target looks like IP:port)
//! 2. mDNS (for LAN peers, zero-config)
//! 3. Signal server (for NAT traversal)
//!
//! # Example
//!
//! ```ignore
//! use dits_cli::p2p::discovery::{DiscoveryChain, DiscoveryConfig};
//!
//! let config = DiscoveryConfig::default();
//! let discovery = DiscoveryChain::with_defaults(config);
//!
//! // Lookup peer by join code
//! let result = discovery.lookup("ABC-123").await?;
//! println!("Found peer at {} via {}", result.peer_addr, result.method);
//! ```

mod chain;
mod direct;
mod mdns;
mod relay;
mod signal;
mod stun;

pub use chain::{DiscoveryChain, DiscoveryProgress, ProgressCallback};
pub use direct::DirectDiscovery;
pub use mdns::MdnsDiscovery;
pub use relay::{RelayDiscovery, RelayConnection};
pub use signal::SignalDiscovery;
pub use stun::StunDiscovery;

use std::net::SocketAddr;
use std::time::Duration;
use async_trait::async_trait;
use crate::p2p::types::CertFingerprint;

/// Result of successful peer discovery
#[derive(Clone, Debug)]
pub struct DiscoveryResult {
    /// The peer's network address
    pub peer_addr: SocketAddr,
    /// Optional certificate fingerprint for verification
    pub cert_fingerprint: Option<CertFingerprint>,
    /// Which discovery method found this peer
    pub method: DiscoveryMethod,
    /// Whether the peer is on the local network
    pub is_local: bool,
}

/// Discovery method used to find peer
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DiscoveryMethod {
    /// Direct IP:port connection
    Direct,
    /// mDNS/DNS-SD local network discovery
    Mdns,
    /// Signal server (WebSocket rendezvous)
    Signal,
    /// STUN-based external IP discovery
    Stun,
    /// Relay through server (guaranteed NAT traversal)
    Relay,
}

impl std::fmt::Display for DiscoveryMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DiscoveryMethod::Direct => write!(f, "direct"),
            DiscoveryMethod::Mdns => write!(f, "mDNS"),
            DiscoveryMethod::Signal => write!(f, "signal server"),
            DiscoveryMethod::Stun => write!(f, "STUN"),
            DiscoveryMethod::Relay => write!(f, "relay"),
        }
    }
}

/// Errors that can occur during discovery
#[derive(Debug, Clone)]
pub enum DiscoveryError {
    /// Peer not found with any discovery method
    NotFound,
    /// Discovery operation timed out
    Timeout,
    /// Connection or network error
    ConnectionFailed(String),
    /// Invalid target format
    InvalidTarget(String),
    /// Method doesn't support this operation
    UnsupportedMethod,
}

impl std::fmt::Display for DiscoveryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DiscoveryError::NotFound => write!(f, "Peer not found"),
            DiscoveryError::Timeout => write!(f, "Discovery timed out"),
            DiscoveryError::ConnectionFailed(e) => write!(f, "Connection failed: {}", e),
            DiscoveryError::InvalidTarget(t) => write!(f, "Invalid target: {}", t),
            DiscoveryError::UnsupportedMethod => write!(f, "Method doesn't support this operation"),
        }
    }
}

impl std::error::Error for DiscoveryError {}

/// Configuration for discovery operations
#[derive(Clone, Debug)]
pub struct DiscoveryConfig {
    /// Timeout for discovery operations
    pub timeout: Duration,
    /// Signal server URL (None to disable)
    pub signal_server: Option<String>,
    /// STUN server URLs for NAT traversal
    pub stun_servers: Vec<String>,
    /// Whether mDNS is enabled
    pub mdns_enabled: bool,
    /// Whether relay fallback is enabled (for guaranteed NAT traversal)
    pub relay_enabled: bool,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            signal_server: Some(crate::p2p::DEFAULT_SIGNAL_SERVER.to_string()),
            stun_servers: vec![
                "stun.l.google.com:19302".to_string(),
                "stun1.l.google.com:19302".to_string(),
            ],
            mdns_enabled: true,
            relay_enabled: true, // Relay enabled by default for guaranteed NAT traversal
        }
    }
}

impl DiscoveryConfig {
    /// Create config for local-only discovery (mDNS, no internet)
    pub fn local_only() -> Self {
        Self {
            timeout: Duration::from_secs(10),
            signal_server: None,
            stun_servers: vec![],
            mdns_enabled: true,
            relay_enabled: false, // No relay for local-only
        }
    }

    /// Create config for signal server only (no mDNS)
    pub fn signal_only(server_url: Option<String>) -> Self {
        Self {
            timeout: Duration::from_secs(30),
            signal_server: server_url.or_else(|| Some(crate::p2p::DEFAULT_SIGNAL_SERVER.to_string())),
            stun_servers: vec![],
            mdns_enabled: false,
            relay_enabled: true, // Relay available via signal server
        }
    }

    /// Create config for direct connections only
    pub fn direct_only() -> Self {
        Self {
            timeout: Duration::from_secs(10),
            signal_server: None,
            stun_servers: vec![],
            mdns_enabled: false,
            relay_enabled: false, // No relay for direct-only
        }
    }

    /// Create config for relay-only (guaranteed NAT traversal)
    pub fn relay_only(server_url: Option<String>) -> Self {
        Self {
            timeout: Duration::from_secs(30),
            signal_server: server_url.or_else(|| Some(crate::p2p::DEFAULT_SIGNAL_SERVER.to_string())),
            stun_servers: vec![],
            mdns_enabled: false,
            relay_enabled: true,
        }
    }
}

/// Trait for peer discovery method implementations
///
/// Each discovery method implements this trait to provide a unified
/// interface for finding peers.
#[async_trait]
pub trait Discovery: Send + Sync {
    /// Human-readable name of this discovery method
    fn name(&self) -> &'static str;

    /// Priority for ordering in discovery chain (lower = tried first)
    /// - Direct: 0
    /// - mDNS: 10
    /// - STUN: 20
    /// - Signal: 30
    fn priority(&self) -> u8;

    /// Check if this method can handle the given target
    ///
    /// For example, DirectDiscovery returns true for IP:port strings,
    /// while MdnsDiscovery returns true for join codes.
    fn can_handle(&self, target: &str) -> bool;

    /// Register as a host for peer discovery
    ///
    /// Called when sharing a directory. The method should register
    /// with its discovery system so other peers can find us.
    async fn host(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError>;

    /// Look up a peer by target (join code, URL, or IP:port)
    async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError>;

    /// Announce presence for discovery (e.g., mDNS broadcast)
    ///
    /// Default implementation does nothing (not all methods support this).
    async fn announce(&self, _join_code: &str, _port: u16, _cert_fingerprint: Option<CertFingerprint>) -> Result<(), DiscoveryError> {
        Ok(()) // Default: no-op
    }

    /// Stop announcing presence
    async fn unannounce(&self) -> Result<(), DiscoveryError> {
        Ok(()) // Default: no-op
    }
}
