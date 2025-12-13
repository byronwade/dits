//! DITS P2P - Peer-to-peer file sharing for DITS
//!
//! This module integrates Wormhole-style P2P functionality into DITS,
//! allowing users to share repositories and files directly between peers
//! without uploading to a central server.
//!
//! # Features
//!
//! - **Share**: Host a repository or directory for P2P access
//! - **Connect**: Join a shared repository using a join code
//! - **Send**: Transfer files directly to a peer
//! - **Receive**: Accept file transfers from peers
//! - **Signal Server**: Optional rendezvous server for NAT traversal

pub mod client;
pub mod crypto;
pub mod host;
pub mod net;
pub mod protocol;
pub mod rendezvous;
pub mod transfer;
pub mod types;

pub use client::*;
pub use crypto::*;
pub use host::*;
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
