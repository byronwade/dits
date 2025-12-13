//! P2P API - Core business logic for peer-to-peer operations
//!
//! This module provides a clean API that can be consumed by:
//! - CLI (dits-cli) - command line interface
//! - REST API (dits-api) - HTTP endpoints for DitsHub
//! - SDK (dits-sdk) - programmatic access from other Rust code
//!
//! # Design Principles
//!
//! 1. **Pure business logic** - No UI concerns (no println!, spinners, colors)
//! 2. **Typed responses** - All functions return structured data types
//! 3. **Event callbacks** - Progress updates via callbacks, not stdout
//! 4. **Error types** - Proper error types, not string messages
//!
//! # Example Usage
//!
//! ```ignore
//! use dits_cli::p2p::api::{P2pApi, ShareConfig, ShareResult};
//!
//! // Create API instance
//! let api = P2pApi::new()?;
//!
//! // Start sharing
//! let config = ShareConfig::builder()
//!     .path("/path/to/share")
//!     .discovery_mode(DiscoveryMode::Auto)
//!     .build();
//!
//! let result = api.share(config, |event| {
//!     // Handle progress events
//!     match event {
//!         ShareEvent::Started { code, .. } => println!("Code: {}", code),
//!         ShareEvent::PeerConnected { addr } => println!("Peer: {}", addr),
//!         _ => {}
//!     }
//! }).await?;
//! ```

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

use super::crypto::{generate_join_code, make_share_link, normalize_join_code};
use super::discovery::{DiscoveryChain, DiscoveryConfig, DiscoveryMethod, DiscoveryProgress};
use super::net::{connect, create_client_endpoint, create_server_endpoint};
use super::types::CertFingerprint;
use super::{DEFAULT_P2P_PORT, DEFAULT_SIGNAL_SERVER, P2P_PROTOCOL_VERSION};

// ============================================================================
// ERROR TYPES
// ============================================================================

/// Errors that can occur during P2P operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "details")]
pub enum P2pError {
    /// Invalid path provided
    InvalidPath { path: String, reason: String },
    /// Invalid join code format
    InvalidJoinCode { code: String },
    /// Failed to bind to address
    BindFailed { addr: String, reason: String },
    /// Peer discovery failed
    DiscoveryFailed { target: String, reason: String },
    /// Connection to peer failed
    ConnectionFailed { addr: String, reason: String },
    /// Transfer failed
    TransferFailed { reason: String },
    /// Operation cancelled
    Cancelled,
    /// Internal error
    Internal { reason: String },
}

impl std::fmt::Display for P2pError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            P2pError::InvalidPath { path, reason } => {
                write!(f, "Invalid path '{}': {}", path, reason)
            }
            P2pError::InvalidJoinCode { code } => {
                write!(f, "Invalid join code: {}", code)
            }
            P2pError::BindFailed { addr, reason } => {
                write!(f, "Failed to bind to {}: {}", addr, reason)
            }
            P2pError::DiscoveryFailed { target, reason } => {
                write!(f, "Failed to discover '{}': {}", target, reason)
            }
            P2pError::ConnectionFailed { addr, reason } => {
                write!(f, "Failed to connect to {}: {}", addr, reason)
            }
            P2pError::TransferFailed { reason } => {
                write!(f, "Transfer failed: {}", reason)
            }
            P2pError::Cancelled => write!(f, "Operation cancelled"),
            P2pError::Internal { reason } => write!(f, "Internal error: {}", reason),
        }
    }
}

impl std::error::Error for P2pError {}

pub type P2pResult<T> = Result<T, P2pError>;

// ============================================================================
// DISCOVERY MODE
// ============================================================================

/// Discovery mode for P2P connections
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryMode {
    /// Try all methods: direct → mDNS → signal → relay
    #[default]
    Auto,
    /// Local network only (mDNS)
    Local,
    /// Direct IP connection only
    Direct,
    /// Signal server only
    Signal,
    /// Relay only (guaranteed NAT traversal)
    Relay,
}

impl DiscoveryMode {
    /// Convert to DiscoveryConfig
    pub fn to_config(&self, signal_server: Option<String>) -> DiscoveryConfig {
        match self {
            DiscoveryMode::Auto => {
                let mut config = DiscoveryConfig::default();
                if let Some(url) = signal_server {
                    config.signal_server = Some(url);
                }
                config
            }
            DiscoveryMode::Local => DiscoveryConfig::local_only(),
            DiscoveryMode::Direct => DiscoveryConfig::direct_only(),
            DiscoveryMode::Signal => DiscoveryConfig::signal_only(signal_server),
            DiscoveryMode::Relay => DiscoveryConfig::relay_only(signal_server),
        }
    }
}

// ============================================================================
// SHARE TYPES
// ============================================================================

/// Configuration for sharing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareConfig {
    /// Path to share
    pub path: PathBuf,
    /// Port to listen on (default: 4433)
    pub port: u16,
    /// Name for this share
    pub name: Option<String>,
    /// Specific join code to use
    pub code: Option<String>,
    /// Discovery mode
    pub discovery_mode: DiscoveryMode,
    /// Custom signal server URL
    pub signal_server: Option<String>,
}

impl Default for ShareConfig {
    fn default() -> Self {
        Self {
            path: PathBuf::new(),
            port: DEFAULT_P2P_PORT,
            name: None,
            code: None,
            discovery_mode: DiscoveryMode::Auto,
            signal_server: None,
        }
    }
}

impl ShareConfig {
    /// Create a new ShareConfig with required path
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            path: path.into(),
            ..Default::default()
        }
    }

    /// Set the port
    pub fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    /// Set the share name
    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Set specific join code
    pub fn code(mut self, code: impl Into<String>) -> Self {
        self.code = Some(code.into());
        self
    }

    /// Set discovery mode
    pub fn discovery_mode(mut self, mode: DiscoveryMode) -> Self {
        self.discovery_mode = mode;
        self
    }

    /// Set signal server URL
    pub fn signal_server(mut self, url: impl Into<String>) -> Self {
        self.signal_server = Some(url.into());
        self
    }
}

/// Result of starting a share
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareInfo {
    /// The join code for this share
    pub code: String,
    /// Full share URL
    pub url: String,
    /// Local address being served
    pub address: SocketAddr,
    /// Share name
    pub name: String,
    /// Path being shared
    pub path: PathBuf,
    /// Discovery mode in use
    pub discovery_mode: DiscoveryMode,
    /// Methods that successfully announced
    pub announced_methods: Vec<String>,
}

/// Events emitted during sharing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum ShareEvent {
    /// Share has started
    Started(ShareInfo),
    /// A peer is connecting
    PeerConnecting { addr: SocketAddr },
    /// A peer has connected
    PeerConnected { addr: SocketAddr },
    /// A peer has disconnected
    PeerDisconnected { addr: SocketAddr },
    /// Transfer progress
    TransferProgress {
        peer: SocketAddr,
        bytes_sent: u64,
        total_bytes: u64,
    },
    /// Share has stopped
    Stopped,
    /// Error occurred
    Error(P2pError),
}

// ============================================================================
// CONNECT TYPES
// ============================================================================

/// Configuration for connecting to a share
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectConfig {
    /// Target (join code, URL, or IP:port)
    pub target: String,
    /// Output directory
    pub output: Option<PathBuf>,
    /// Discovery mode
    pub discovery_mode: DiscoveryMode,
    /// Custom signal server URL
    pub signal_server: Option<String>,
}

impl ConnectConfig {
    /// Create a new ConnectConfig with required target
    pub fn new(target: impl Into<String>) -> Self {
        Self {
            target: target.into(),
            output: None,
            discovery_mode: DiscoveryMode::Auto,
            signal_server: None,
        }
    }

    /// Set output directory
    pub fn output(mut self, path: impl Into<PathBuf>) -> Self {
        self.output = Some(path.into());
        self
    }

    /// Set discovery mode
    pub fn discovery_mode(mut self, mode: DiscoveryMode) -> Self {
        self.discovery_mode = mode;
        self
    }

    /// Set signal server URL
    pub fn signal_server(mut self, url: impl Into<String>) -> Self {
        self.signal_server = Some(url.into());
        self
    }
}

/// Result of discovering and connecting to a peer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    /// Peer's address
    pub peer_addr: SocketAddr,
    /// Discovery method used
    pub discovery_method: String,
    /// Whether peer is on local network
    pub is_local: bool,
    /// Connection latency in milliseconds
    pub latency_ms: Option<u64>,
}

/// Events emitted during connection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum ConnectEvent {
    /// Starting discovery
    DiscoveryStarted { target: String },
    /// Trying a discovery method
    DiscoveryTrying {
        method: String,
        attempt: usize,
        total: usize,
    },
    /// Discovery method failed (will try next)
    DiscoveryMethodFailed { method: String, reason: String },
    /// Peer found
    PeerFound {
        addr: SocketAddr,
        method: String,
        is_local: bool,
    },
    /// Connecting to peer
    Connecting { addr: SocketAddr },
    /// Connected successfully
    Connected(ConnectionInfo),
    /// Connection failed
    Failed(P2pError),
}

// ============================================================================
// STATUS TYPES
// ============================================================================

/// P2P system status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct P2pStatus {
    /// Protocol version
    pub protocol_version: u32,
    /// Default port
    pub default_port: u16,
    /// Default signal server
    pub signal_server: String,
    /// Available discovery methods
    pub discovery_methods: Vec<String>,
    /// Active shares count
    pub active_shares: usize,
    /// Active connections count
    pub active_connections: usize,
}

// ============================================================================
// P2P API
// ============================================================================

/// P2P API - Core business logic for peer-to-peer operations
///
/// This struct provides all P2P functionality through clean, typed methods.
/// It does NOT include any CLI concerns (printing, formatting, spinners).
pub struct P2pApi {
    /// Default signal server URL
    signal_server: String,
}

impl Default for P2pApi {
    fn default() -> Self {
        Self::new()
    }
}

impl P2pApi {
    /// Create a new P2P API instance
    pub fn new() -> Self {
        Self {
            signal_server: DEFAULT_SIGNAL_SERVER.to_string(),
        }
    }

    /// Create with custom signal server
    pub fn with_signal_server(signal_server: impl Into<String>) -> Self {
        Self {
            signal_server: signal_server.into(),
        }
    }

    /// Get P2P status
    pub fn status(&self) -> P2pStatus {
        let config = DiscoveryConfig::default();
        let chain = DiscoveryChain::with_defaults(config);

        P2pStatus {
            protocol_version: P2P_PROTOCOL_VERSION,
            default_port: DEFAULT_P2P_PORT,
            signal_server: self.signal_server.clone(),
            discovery_methods: chain.method_names().into_iter().map(String::from).collect(),
            active_shares: 0,    // TODO: Track active shares
            active_connections: 0, // TODO: Track active connections
        }
    }

    /// Start sharing a directory
    ///
    /// Returns a ShareHandle that can be used to control the share session.
    /// Events are sent via the callback function.
    pub async fn share<F>(
        &self,
        config: ShareConfig,
        on_event: F,
    ) -> P2pResult<ShareHandle>
    where
        F: Fn(ShareEvent) + Send + Sync + 'static,
    {
        // Validate path
        let path = config.path.canonicalize().map_err(|e| P2pError::InvalidPath {
            path: config.path.display().to_string(),
            reason: e.to_string(),
        })?;

        if !path.is_dir() {
            return Err(P2pError::InvalidPath {
                path: path.display().to_string(),
                reason: "Path must be a directory".to_string(),
            });
        }

        // Generate or use provided join code
        let code = config
            .code
            .map(|c| normalize_join_code(&c))
            .unwrap_or_else(generate_join_code);

        let url = make_share_link(&code);
        let bind_addr: SocketAddr = format!("0.0.0.0:{}", config.port)
            .parse()
            .map_err(|e| P2pError::Internal {
                reason: format!("Invalid port: {}", e),
            })?;

        // Get share name
        let name = config.name.unwrap_or_else(|| {
            hostname::get()
                .map(|h| h.to_string_lossy().into_owned())
                .unwrap_or_else(|_| "dits-host".into())
        });

        // Create server endpoint
        let (endpoint, cert_fingerprint) =
            create_server_endpoint(bind_addr).map_err(|e| P2pError::BindFailed {
                addr: bind_addr.to_string(),
                reason: e.to_string(),
            })?;

        // Set up discovery
        let discovery_config = config.discovery_mode.to_config(config.signal_server.clone());
        let discovery = DiscoveryChain::with_defaults(discovery_config);

        // Announce on all methods
        let announce_results = discovery
            .announce_all(&code, config.port, Some(cert_fingerprint))
            .await;

        let announced_methods: Vec<String> = announce_results
            .iter()
            .filter(|(_, r)| r.is_ok())
            .map(|(name, _)| name.to_string())
            .collect();

        // Create share info
        let info = ShareInfo {
            code: code.clone(),
            url,
            address: bind_addr,
            name,
            path: path.clone(),
            discovery_mode: config.discovery_mode,
            announced_methods,
        };

        // Emit started event
        on_event(ShareEvent::Started(info.clone()));

        // Create cancellation channel
        let (cancel_tx, _cancel_rx) = broadcast::channel::<()>(1);

        // Return handle
        Ok(ShareHandle {
            info,
            cancel_tx,
        })
    }

    /// Connect to a shared peer
    ///
    /// Events are sent via the callback function.
    pub async fn connect<F>(
        &self,
        config: ConnectConfig,
        on_event: F,
    ) -> P2pResult<ConnectionInfo>
    where
        F: Fn(ConnectEvent) + Send + Sync + 'static,
    {
        let on_event = Arc::new(on_event);

        // Emit discovery started
        on_event(ConnectEvent::DiscoveryStarted {
            target: config.target.clone(),
        });

        // Set up discovery
        let discovery_config = config.discovery_mode.to_config(config.signal_server.clone());
        let discovery = DiscoveryChain::with_defaults(discovery_config);

        // Create progress callback
        let event_clone = on_event.clone();
        let progress_callback = Box::new(move |progress: DiscoveryProgress| {
            match progress {
                DiscoveryProgress::TryingMethod { method, attempt, total } => {
                    event_clone(ConnectEvent::DiscoveryTrying {
                        method: method.to_string(),
                        attempt,
                        total,
                    });
                }
                DiscoveryProgress::MethodFailed { method, reason } => {
                    event_clone(ConnectEvent::DiscoveryMethodFailed {
                        method: method.to_string(),
                        reason,
                    });
                }
                DiscoveryProgress::PeerFound { method, addr } => {
                    // Will be sent after we have full result
                }
                _ => {}
            }
        });

        // Discover peer
        let start = std::time::Instant::now();
        let result = discovery
            .lookup_with_progress(&config.target, Some(progress_callback))
            .await
            .map_err(|e| P2pError::DiscoveryFailed {
                target: config.target.clone(),
                reason: e.to_string(),
            })?;

        let discovery_method = match result.method {
            DiscoveryMethod::Direct => "direct",
            DiscoveryMethod::Mdns => "mDNS",
            DiscoveryMethod::Signal => "signal",
            DiscoveryMethod::Stun => "STUN",
            DiscoveryMethod::Relay => "relay",
        }
        .to_string();

        // Emit peer found
        on_event(ConnectEvent::PeerFound {
            addr: result.peer_addr,
            method: discovery_method.clone(),
            is_local: result.is_local,
        });

        // Emit connecting
        on_event(ConnectEvent::Connecting {
            addr: result.peer_addr,
        });

        // Connect to peer
        let endpoint = create_client_endpoint().map_err(|e| P2pError::Internal {
            reason: e.to_string(),
        })?;

        let _conn = connect(&endpoint, result.peer_addr, "localhost")
            .await
            .map_err(|e| P2pError::ConnectionFailed {
                addr: result.peer_addr.to_string(),
                reason: e.to_string(),
            })?;

        let latency_ms = start.elapsed().as_millis() as u64;

        let connection_info = ConnectionInfo {
            peer_addr: result.peer_addr,
            discovery_method,
            is_local: result.is_local,
            latency_ms: Some(latency_ms),
        };

        // Emit connected
        on_event(ConnectEvent::Connected(connection_info.clone()));

        Ok(connection_info)
    }

    /// Generate a QR code for a share URL
    ///
    /// Returns the QR code as a string of Unicode block characters.
    pub fn generate_qr_code(&self, url: &str) -> Option<String> {
        use qrcode::{QrCode, EcLevel};

        let code = QrCode::with_error_correction_level(url, EcLevel::L).ok()?;

        let mut result = String::new();
        let width = code.width();
        let colors = code.to_colors();

        // Top quiet zone
        result.push_str("  ");
        for _ in 0..width + 4 {
            result.push('█');
        }
        result.push('\n');

        // Process two rows at a time
        for row in (0..width).step_by(2) {
            result.push_str("  ██");

            for col in 0..width {
                let top = colors[row * width + col] == qrcode::Color::Dark;
                let bottom = if row + 1 < width {
                    colors[(row + 1) * width + col] == qrcode::Color::Dark
                } else {
                    false
                };

                let c = match (top, bottom) {
                    (false, false) => '█',
                    (true, false) => '▄',
                    (false, true) => '▀',
                    (true, true) => ' ',
                };
                result.push(c);
            }

            result.push_str("██\n");
        }

        // Bottom quiet zone
        result.push_str("  ");
        for _ in 0..width + 4 {
            result.push('█');
        }
        result.push('\n');

        Some(result)
    }
}

/// Handle for an active share session
pub struct ShareHandle {
    /// Share information
    pub info: ShareInfo,
    /// Cancellation sender
    cancel_tx: broadcast::Sender<()>,
}

impl ShareHandle {
    /// Stop the share
    pub fn stop(&self) {
        let _ = self.cancel_tx.send(());
    }

    /// Get share info
    pub fn info(&self) -> &ShareInfo {
        &self.info
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_discovery_mode_to_config() {
        let config = DiscoveryMode::Local.to_config(None);
        assert!(config.mdns_enabled);
        assert!(config.signal_server.is_none());

        let config = DiscoveryMode::Direct.to_config(None);
        assert!(!config.mdns_enabled);

        let config = DiscoveryMode::Relay.to_config(Some("ws://test".into()));
        assert!(config.relay_enabled);
    }

    #[test]
    fn test_share_config_builder() {
        let config = ShareConfig::new("/tmp/test")
            .port(5000)
            .name("my-share")
            .discovery_mode(DiscoveryMode::Local);

        assert_eq!(config.port, 5000);
        assert_eq!(config.name, Some("my-share".to_string()));
        assert_eq!(config.discovery_mode, DiscoveryMode::Local);
    }

    #[test]
    fn test_p2p_status() {
        let api = P2pApi::new();
        let status = api.status();

        assert_eq!(status.protocol_version, P2P_PROTOCOL_VERSION);
        assert_eq!(status.default_port, DEFAULT_P2P_PORT);
        assert!(status.discovery_methods.contains(&"direct".to_string()));
    }

    #[test]
    fn test_qr_code_generation() {
        let api = P2pApi::new();
        let qr = api.generate_qr_code("https://dits.byronwade.com/j/ABC-123");
        assert!(qr.is_some());
        assert!(qr.unwrap().contains('█'));
    }
}
