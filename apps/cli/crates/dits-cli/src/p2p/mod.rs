//! DITS P2P - Peer-to-peer file sharing for DITS
//!
//! This module integrates Wormhole-style P2P functionality into DITS,
//! allowing users to share repositories and files directly between peers
//! without uploading to a central server.
//!
//! # Architecture
//!
//! This module is designed with a clean separation between:
//! - **API Layer** (`api` module): Pure business logic with typed responses
//! - **CLI Layer** (`../p2p_commands.rs`): Command-line presentation
//! - **REST Layer** (`dits-api`): HTTP endpoints for DitsHub
//!
//! DitsHub and other clients should use the `api` module directly,
//! not the CLI command implementations.
//!
//! # Features
//!
//! - **Share**: Host a repository or directory for P2P access
//! - **Connect**: Join a shared repository using a join code
//! - **Send**: Transfer files directly to a peer
//! - **Receive**: Accept file transfers from peers
//!
//! # Discovery Methods
//!
//! DITS supports multiple peer discovery methods:
//! - **Direct**: Connect via known IP:port
//! - **mDNS**: Zero-config LAN discovery (default for local networks)
//! - **Signal Server**: WebSocket rendezvous for NAT traversal
//! - **STUN**: External IP discovery for hole-punching
//! - **Relay**: TURN-style relay for guaranteed NAT traversal (no port forwarding needed)
//!
//! # Example: Using the API
//!
//! ```ignore
//! use dits_cli::p2p::api::{P2pApi, ShareConfig, DiscoveryMode};
//!
//! let api = P2pApi::new();
//!
//! // Start sharing
//! let config = ShareConfig::new("/path/to/share")
//!     .discovery_mode(DiscoveryMode::Auto);
//!
//! let handle = api.share(config, |event| {
//!     // Handle events (logging, WebSocket broadcast, etc.)
//! }).await?;
//!
//! println!("Share code: {}", handle.info().code);
//! ```

pub mod api;
pub mod crypto;
pub mod discovery;
pub mod net;
pub mod protocol;
pub mod rendezvous;
pub mod transfer;
pub mod types;

// Re-export API types for easy access
pub use api::{
    P2pApi, P2pError, P2pResult, P2pStatus,
    ShareConfig, ShareInfo, ShareEvent, ShareHandle,
    ConnectConfig, ConnectionInfo, ConnectEvent,
    DiscoveryMode,
};

pub use crypto::*;
pub use discovery::{
    Discovery, DiscoveryChain, DiscoveryConfig, DiscoveryError, DiscoveryMethod, DiscoveryResult,
    DiscoveryProgress, ProgressCallback,
    DirectDiscovery, MdnsDiscovery, RelayConnection, RelayDiscovery, SignalDiscovery, StunDiscovery,
};
pub use net::*;
pub use protocol::*;
pub use rendezvous::*;
pub use transfer::*;
pub use types::*;

/// Default signal server URL for peer discovery
pub const DEFAULT_SIGNAL_SERVER: &str = "wss://dits-signal.fly.dev";

/// Default QUIC port for P2P connections
pub const DEFAULT_P2P_PORT: u16 = 4433;

/// Chunk size for P2P transfers (128 KB)
pub const P2P_CHUNK_SIZE: usize = 128 * 1024;

/// Protocol version for P2P communication
pub const P2P_PROTOCOL_VERSION: u32 = 1;

/// Maximum message size (1 MB)
pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024;
