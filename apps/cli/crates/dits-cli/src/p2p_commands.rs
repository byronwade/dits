//! P2P command implementations for DITS CLI

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use tokio::signal;
use tracing::{debug, error, info, warn};

use crate::p2p::{
    crypto::{extract_join_code, generate_join_code, make_share_link, normalize_join_code, validate_join_code},
    discovery::{DiscoveryChain, DiscoveryConfig, DiscoveryMethod, DiscoveryProgress},
    net::{connect, create_client_endpoint, create_server_endpoint, QuicConnection},
    rendezvous::{RendezvousClient, RendezvousError},
    transfer::TransferManager,
    DEFAULT_P2P_PORT, DEFAULT_SIGNAL_SERVER, P2P_PROTOCOL_VERSION,
};
use crate::ui;

fn print_separator() {
    println!("{}", "=".repeat(60));
}

/// Determine discovery configuration based on CLI flags
fn get_discovery_config(
    signal_server: Option<String>,
    local: bool,
    direct: bool,
    stun: bool,
    relay: bool,
) -> DiscoveryConfig {
    if local {
        // mDNS only - no internet required
        DiscoveryConfig::local_only()
    } else if direct {
        // Direct IP only
        DiscoveryConfig::direct_only()
    } else if relay {
        // Force relay mode for guaranteed NAT traversal
        DiscoveryConfig::relay_only(signal_server)
    } else if stun {
        // STUN for external IP discovery
        let mut config = DiscoveryConfig::default();
        config.mdns_enabled = false;
        config.signal_server = signal_server;
        config
    } else {
        // Auto mode - try everything (including relay as fallback)
        let mut config = DiscoveryConfig::default();
        if let Some(url) = signal_server {
            config.signal_server = Some(url);
        }
        config
    }
}

/// Share a directory via P2P
pub async fn share(
    path: &str,
    port: Option<u16>,
    signal_server: Option<String>,
    code: Option<String>,
    name: Option<String>,
    local: bool,
    direct: bool,
    stun: bool,
    relay: bool,
) -> Result<()> {
    let path = PathBuf::from(path).canonicalize().context("Invalid path")?;

    if !path.is_dir() {
        anyhow::bail!("Path must be a directory: {:?}", path);
    }

    let port = port.unwrap_or(DEFAULT_P2P_PORT);
    let bind_addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;

    // Get discovery configuration
    let discovery_config = get_discovery_config(signal_server.clone(), local, direct, stun, relay);
    let discovery = DiscoveryChain::with_defaults(discovery_config.clone());

    // Generate or use provided join code
    let join_code = code
        .map(|c| normalize_join_code(&c))
        .unwrap_or_else(generate_join_code);

    let share_link = make_share_link(&join_code);
    let host_name = name.unwrap_or_else(|| {
        hostname::get()
            .map(|h| h.to_string_lossy().into_owned())
            .unwrap_or_else(|_| "dits-host".into())
    });

    // Determine discovery mode text
    let mode_text = if local {
        "local network (mDNS)"
    } else if direct {
        "direct IP only"
    } else if relay {
        "relay (no port forwarding needed)"
    } else if stun {
        "STUN (external IP)"
    } else {
        "auto (mDNS + signal + relay)"
    };

    // Print banner
    println!();
    println!("DITS P2P - Sharing Active");
    print_separator();
    println!();
    println!("  Share:     {}", host_name);
    println!("  Path:      {:?}", path);
    println!("  Address:   {}", bind_addr);
    println!("  Mode:      {}", mode_text);
    println!();
    if !direct {
        println!("  Share this link: {}", share_link);
        println!("  Or use code:     {}", join_code);
        println!();
        let connect_cmd = if local {
            format!("dits p2p connect {} --local", join_code)
        } else if relay {
            format!("dits p2p connect {} --relay", join_code)
        } else {
            format!("dits p2p connect {}", join_code)
        };
        println!("  Connect with:    {}", connect_cmd);

        // Show QR code for easy mobile sharing
        ui::print_qr_code(&share_link, "📱");
    } else {
        println!("  Direct address:  {}", bind_addr);
        println!();
        println!("  Connect with:    dits p2p connect {}", bind_addr);
    }
    println!();
    println!("  Press Ctrl+C to stop sharing");
    print_separator();
    println!();

    // Create server endpoint
    let (endpoint, cert_fingerprint) = create_server_endpoint(bind_addr)?;

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    tokio::spawn(async move {
        signal::ctrl_c().await.ok();
        r.store(false, Ordering::SeqCst);
    });

    // Announce via discovery methods
    let announce_results = discovery.announce_all(&join_code, port, Some(cert_fingerprint)).await;
    for (method, result) in &announce_results {
        match result {
            Ok(()) => info!("Announced via {}", method),
            Err(e) => debug!("{} announcement: {}", method, e),
        }
    }

    // Also register with signal server if not in local/direct mode
    let signal_task = if !local && !direct {
        let signal_url = discovery_config.signal_server.clone()
            .unwrap_or_else(|| DEFAULT_SIGNAL_SERVER.to_string());
        let join_code = join_code.clone();
        let running = running.clone();

        Some(tokio::spawn(async move {
            loop {
                if !running.load(Ordering::SeqCst) {
                    break;
                }

                debug!("Registering with signal server: {}", signal_url);
                let rendezvous = RendezvousClient::new(Some(signal_url.clone()));

                match rendezvous.host_with_fingerprint(&join_code, Some(cert_fingerprint)).await {
                    Ok(result) => {
                        info!("Peer connected via signal server: {:?}", result.peer_addr);
                    }
                    Err(RendezvousError::Timeout) => {
                        // Re-register after timeout
                    }
                    Err(e) => {
                        warn!("Signal server error: {} - will retry", e);
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        }))
    } else {
        None
    };

    // Accept connections
    while running.load(Ordering::SeqCst) {
        tokio::select! {
            incoming = endpoint.accept() => {
                if let Some(conn) = incoming {
                    let _path = path.clone();
                    tokio::spawn(async move {
                        match conn.await {
                            Ok(connection) => {
                                let quic_conn = QuicConnection::new(connection);
                                info!("Accepted connection from {}", quic_conn.remote_address());
                                println!("  Connected: {}", quic_conn.remote_address());
                                // TODO: Handle connection (serve files)
                            }
                            Err(e) => {
                                error!("Connection failed: {:?}", e);
                            }
                        }
                    });
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(100)) => {
                if !running.load(Ordering::SeqCst) {
                    break;
                }
            }
        }
    }

    if let Some(task) = signal_task {
        task.abort();
    }
    println!("\nStopped sharing.");
    Ok(())
}

/// Connect to a P2P share
pub async fn p2p_connect(
    target: &str,
    _output: Option<String>,
    signal_server: Option<String>,
    local: bool,
    direct: bool,
    relay: bool,
) -> Result<()> {
    // Extract join code if it's a URL
    let target = if let Some(code) = extract_join_code(target) {
        debug!("Extracted join code: {}", code);
        code
    } else {
        target.to_string()
    };

    // Get discovery configuration
    let discovery_config = get_discovery_config(signal_server, local, direct, false, relay);
    let discovery = DiscoveryChain::with_defaults(discovery_config);

    // Determine discovery mode text
    let mode_text = if local {
        "local network (mDNS)"
    } else if direct {
        "direct IP only"
    } else if relay {
        "relay (no port forwarding needed)"
    } else {
        "auto (mDNS + signal + relay)"
    };

    println!();
    println!("DITS P2P - Connecting");
    print_separator();
    println!();
    println!("  Target:    {}", target);
    println!("  Mode:      {}", mode_text);
    println!();

    // Validate join code if not direct IP
    let is_direct = target.parse::<SocketAddr>().is_ok();
    if !is_direct {
        let code = normalize_join_code(&target);
        if !validate_join_code(&code) {
            anyhow::bail!("Invalid join code: {}", target);
        }
    }

    // Create spinner for discovery progress
    let spinner = ui::Spinner::new("Discovering peer...");

    // Use discovery chain with progress callback
    let progress_callback = Box::new(move |progress: DiscoveryProgress| {
        match progress {
            DiscoveryProgress::TryingMethod { method, attempt, total } => {
                spinner.set_message(&format!("Trying {} ({}/{})...", method, attempt, total));
            }
            DiscoveryProgress::MethodFailed { method, .. } => {
                // Silent - just move to next method
                debug!("{} failed, trying next method", method);
            }
            DiscoveryProgress::PeerFound { method, addr } => {
                spinner.set_message(&format!("Found via {} at {}", method, addr));
            }
            _ => {}
        }
    });

    let result = discovery.lookup_with_progress(&target, Some(progress_callback)).await;

    let result = match result {
        Ok(r) => {
            let method_icon = match r.method {
                DiscoveryMethod::Direct => "direct",
                DiscoveryMethod::Mdns => "mDNS",
                DiscoveryMethod::Signal => "signal",
                DiscoveryMethod::Stun => "STUN",
                DiscoveryMethod::Relay => "relay",
            };
            let location = if r.is_local { "local" } else { "remote" };
            // Note: spinner is moved into closure, so we create a new one for status
            println!("  ✓ Found {} via {} ({})", r.peer_addr, method_icon, location);
            r
        }
        Err(e) => {
            println!("  ✗ Failed to find peer: {}", e);
            return Err(anyhow::anyhow!("Failed to find peer: {}", e));
        }
    };

    println!();

    // Connect to peer (for relay mode, traffic goes through the relay server)
    if result.method == DiscoveryMethod::Relay {
        println!("  Using relay server for NAT traversal (no port forwarding required)");
        println!();
    }

    let connect_spinner = ui::Spinner::new(&format!("Connecting to {}...", result.peer_addr));

    let endpoint = create_client_endpoint()?;
    match connect(&endpoint, result.peer_addr, "localhost").await {
        Ok(conn) => {
            connect_spinner.finish_success(&format!("Connected to {}", conn.remote_address()));
        }
        Err(e) => {
            connect_spinner.finish_error(&format!("Connection failed: {}", e));
            return Err(e.into());
        }
    }

    println!();

    // TODO: Implement file transfer/mount
    println!("Connection established. File transfer not yet implemented.");
    print_separator();

    Ok(())
}

/// Send a file to a peer
pub async fn send(
    file: &str,
    target: &str,
    signal_server: Option<String>,
) -> Result<()> {
    let path = PathBuf::from(file);
    if !path.exists() {
        anyhow::bail!("File not found: {}", file);
    }

    // Prepare file
    let transfer_manager = TransferManager::new();
    let file_info = transfer_manager.prepare_file(&path)?;

    println!();
    println!("DITS P2P - Sending File");
    print_separator();
    println!();
    println!("  File:   {}", file);
    println!("  Size:   {} bytes", file_info.size);
    println!("  Chunks: {}", file_info.chunk_count);
    println!("  Hash:   {}", hex::encode(&file_info.hash[..8]));
    println!();

    // Use discovery to find peer (with relay enabled by default)
    let discovery_config = get_discovery_config(signal_server, false, false, false, false);
    let discovery = DiscoveryChain::with_defaults(discovery_config);

    let target = if let Some(code) = extract_join_code(target) {
        code
    } else {
        target.to_string()
    };

    let is_direct = target.parse::<SocketAddr>().is_ok();
    if !is_direct {
        let code = normalize_join_code(&target);
        if !validate_join_code(&code) {
            anyhow::bail!("Invalid join code: {}", target);
        }
    }

    println!("  Looking up peer...");
    let result = discovery.lookup(&target).await
        .context("Failed to find peer")?;

    println!("  Found: {} via {}", result.peer_addr, result.method);

    let endpoint = create_client_endpoint()?;
    let conn = connect(&endpoint, result.peer_addr, "localhost").await?;

    println!("  Connected to {}", conn.remote_address());
    println!();
    println!("File transfer not yet fully implemented.");
    print_separator();

    Ok(())
}

/// Receive a file from a peer
pub async fn receive(
    output: Option<String>,
    port: Option<u16>,
    signal_server: Option<String>,
    code: Option<String>,
) -> Result<()> {
    let port = port.unwrap_or(DEFAULT_P2P_PORT);
    let bind_addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;

    let join_code = code.unwrap_or_else(generate_join_code);
    let share_link = make_share_link(&join_code);

    // Set up discovery (with relay enabled for receive mode)
    let discovery_config = get_discovery_config(signal_server.clone(), false, false, false, false);
    let discovery = DiscoveryChain::with_defaults(discovery_config.clone());

    println!();
    println!("DITS P2P - Ready to Receive");
    print_separator();
    println!();
    println!("  Waiting on: {}", bind_addr);
    println!("  Share code: {}", join_code);
    println!("  Share link: {}", share_link);
    if let Some(ref out) = output {
        println!("  Output:     {}", out);
    }
    println!();
    println!("  Sender should run:  dits p2p send <file> {}", join_code);
    println!();
    println!("  Press Ctrl+C to cancel");
    print_separator();
    println!();

    let (endpoint, cert_fingerprint) = create_server_endpoint(bind_addr)?;

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    tokio::spawn(async move {
        signal::ctrl_c().await.ok();
        r.store(false, Ordering::SeqCst);
    });

    // Announce via all methods
    discovery.announce_all(&join_code, port, Some(cert_fingerprint)).await;

    // Also register with signal server
    let signal_task = {
        let signal_url = discovery_config.signal_server
            .unwrap_or_else(|| DEFAULT_SIGNAL_SERVER.to_string());
        let join_code = join_code.clone();
        let running = running.clone();

        tokio::spawn(async move {
            loop {
                if !running.load(Ordering::SeqCst) {
                    break;
                }

                let rendezvous = RendezvousClient::new(Some(signal_url.clone()));
                match rendezvous.host_with_fingerprint(&join_code, Some(cert_fingerprint)).await {
                    Ok(result) => {
                        info!("Peer connected: {:?}", result.peer_addr);
                    }
                    Err(RendezvousError::Timeout) => {}
                    Err(e) => {
                        warn!("Signal server error: {}", e);
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        })
    };

    // Wait for connection
    while running.load(Ordering::SeqCst) {
        tokio::select! {
            incoming = endpoint.accept() => {
                if let Some(conn) = incoming {
                    match conn.await {
                        Ok(connection) => {
                            let quic_conn = QuicConnection::new(connection);
                            println!("Connection from {}", quic_conn.remote_address());
                            println!("File transfer not yet fully implemented.");
                            break;
                        }
                        Err(e) => {
                            error!("Connection failed: {:?}", e);
                        }
                    }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(100)) => {
                if !running.load(Ordering::SeqCst) {
                    break;
                }
            }
        }
    }

    signal_task.abort();
    println!("\nStopped receiving.");
    Ok(())
}

/// Show P2P status
pub async fn p2p_status() -> Result<()> {
    // Get discovery configuration to show available methods
    let config = DiscoveryConfig::default();
    let discovery = DiscoveryChain::with_defaults(config);
    let methods = discovery.method_names();

    println!();
    println!("DITS P2P Status");
    print_separator();
    println!();
    println!("  Protocol Version: {}", P2P_PROTOCOL_VERSION);
    println!("  Default Port:     {}", DEFAULT_P2P_PORT);
    println!("  Signal Server:    {}", DEFAULT_SIGNAL_SERVER);
    println!();
    println!("  Discovery Methods:");
    for method in methods {
        println!("    - {}", method);
    }
    println!();
    println!("  Active Shares:    0");
    println!("  Active Connects:  0");
    println!();
    print_separator();
    Ok(())
}
