//! Peer-to-peer command surface.
//!
//! The parser remains visible so scripts receive a clear, stable diagnostic,
//! but no P2P transport, rendezvous, mount, or cache operation is exposed as a
//! successful product capability in this alpha.

use std::path::PathBuf;

use anyhow::{bail, Result};
use clap::{Args, Subcommand};

/// P2P subcommands retained for forward-compatible CLI discovery.
#[derive(Subcommand)]
pub enum P2pCommands {
    /// Planned: share a repository for peer-to-peer access
    #[command(visible_alias = "host", visible_alias = "serve")]
    Share(ShareArgs),

    /// Planned: connect to a shared repository using a join code
    #[command(visible_alias = "join", visible_alias = "mount")]
    Connect(ConnectArgs),

    /// Planned: show active P2P connections
    Status,

    /// Planned: list active P2P shares
    List,

    /// Planned: manage a local P2P cache
    Cache(CacheArgs),

    /// Planned: test connectivity to a peer
    Ping(PingArgs),

    /// Planned: unmount a connected repository
    #[command(visible_alias = "umount", visible_alias = "disconnect")]
    Unmount(UnmountArgs),
}

/// Arguments for the planned share command.
#[derive(Args)]
pub struct ShareArgs {
    /// Path to the repository to share
    #[arg(default_value = ".")]
    path: PathBuf,

    /// Custom name for this share
    #[arg(short, long)]
    name: Option<String>,

    /// Planned listening port
    #[arg(short, long, default_value = "4433")]
    port: u16,

    /// Planned bind address
    #[arg(short, long, default_value = "0.0.0.0")]
    bind: String,

    /// Planned daemon mode
    #[arg(short, long)]
    daemon: bool,
}

/// Arguments for the planned connect command.
#[derive(Args)]
pub struct ConnectArgs {
    /// Join code or share link
    #[arg(value_name = "TARGET")]
    target: String,

    /// Intended local mount path
    #[arg(value_name = "PATH")]
    path: PathBuf,

    /// Planned connection timeout in seconds
    #[arg(short, long, default_value = "30")]
    timeout: u64,
}

/// Arguments for planned cache management.
#[derive(Args)]
pub struct CacheArgs {
    #[command(subcommand)]
    command: CacheCommands,
}

/// Planned cache subcommands.
#[derive(Subcommand)]
pub enum CacheCommands {
    /// Planned: show cache statistics
    Stats {
        /// Request a detailed breakdown
        #[arg(short, long)]
        detailed: bool,
    },
    /// Planned: clear cache contents
    Clear,
    /// Planned: show the cache path
    Path,
    /// Planned: audit or collect cache objects
    Gc,
}

/// Arguments for the planned ping command.
#[derive(Args)]
pub struct PingArgs {
    /// Join code or address
    target: String,

    /// Number of requests
    #[arg(short, long, default_value = "4")]
    count: u32,

    /// Interval in seconds
    #[arg(short, long, default_value = "1")]
    interval: u64,

    /// Timeout per request in seconds
    #[arg(short, long, default_value = "5")]
    timeout: u64,
}

/// Arguments for the planned unmount command.
#[derive(Args)]
pub struct UnmountArgs {
    /// Mount point or share ID
    target: Option<String>,

    /// Planned force mode
    #[arg(short, long)]
    force: bool,

    /// Target all planned connections
    #[arg(long)]
    all: bool,
}

/// Reject every P2P operation before validating paths, creating directories,
/// opening repositories, binding sockets, or changing cache state.
pub fn handle_p2p_command(_command: P2pCommands) -> Result<()> {
    bail!(
        "P2P sharing is design scaffolding in this alpha and is disabled. No repository, target \
         directory, cache entry, socket, or mount was created or changed."
    )
}
