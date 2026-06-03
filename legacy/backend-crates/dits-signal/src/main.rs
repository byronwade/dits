//! DITS Signal & Relay Server
//!
//! A WebSocket-based signal server for P2P peer discovery with built-in
//! TURN-style relay for guaranteed NAT traversal.
//!
//! ## Modes
//!
//! 1. **Signal Mode** (default): Exchange peer addresses for direct connection
//! 2. **Relay Mode**: Forward traffic when direct connection fails
//!
//! ## How Relay Works
//!
//! When peers can't connect directly (strict NAT), they use the relay:
//! ```
//! Peer A  <-->  Relay Server  <-->  Peer B
//! ```
//! Both peers maintain WebSocket connections to the relay, which forwards
//! messages between them.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, mpsc};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

/// Registered peer information
#[derive(Clone, Debug)]
struct PeerInfo {
    addr: SocketAddr,
    port: u16,
    cert_fingerprint: Option<String>,
    tx: broadcast::Sender<SignalMessage>,
    /// Channel for relayed data
    relay_tx: Option<mpsc::Sender<Vec<u8>>>,
}

/// Signal messages exchanged between client and server
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum SignalMessage {
    #[serde(rename = "register")]
    Register {
        code: String,
        port: u16,
        #[serde(skip_serializing_if = "Option::is_none")]
        cert_fingerprint: Option<String>,
    },
    #[serde(rename = "lookup")]
    Lookup { code: String },
    #[serde(rename = "peer_found")]
    PeerFound {
        addr: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        cert_fingerprint: Option<String>,
        #[serde(default)]
        is_local: bool,
        /// Relay address if direct connection not possible
        #[serde(skip_serializing_if = "Option::is_none")]
        relay_addr: Option<String>,
    },
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "registered")]
    Registered {
        code: String,
        /// Relay address for this session
        #[serde(skip_serializing_if = "Option::is_none")]
        relay_addr: Option<String>,
    },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,

    // Relay-specific messages
    #[serde(rename = "relay_request")]
    RelayRequest {
        /// Join code of peer to relay to
        target_code: String,
    },
    #[serde(rename = "relay_ready")]
    RelayReady {
        /// Session ID for the relay
        session_id: String,
    },
    #[serde(rename = "relay_data")]
    RelayData {
        /// Base64 encoded data
        data: String,
    },
    #[serde(rename = "relay_connected")]
    RelayConnected {
        /// Peer has connected via relay
        peer_code: String,
    },
}

/// Active relay session
#[derive(Debug)]
struct RelaySession {
    host_code: String,
    client_code: Option<String>,
    host_tx: mpsc::Sender<Vec<u8>>,
    client_tx: Option<mpsc::Sender<Vec<u8>>>,
}

/// Signal server state
struct SignalServer {
    /// Registered peers by join code
    peers: DashMap<String, PeerInfo>,
    /// Active relay sessions by session ID
    relay_sessions: DashMap<String, RelaySession>,
    /// Server's external address for relay
    relay_addr: String,
}

impl SignalServer {
    fn new(relay_addr: String) -> Self {
        Self {
            peers: DashMap::new(),
            relay_sessions: DashMap::new(),
            relay_addr,
        }
    }

    fn register(
        &self,
        code: String,
        addr: SocketAddr,
        port: u16,
        cert_fingerprint: Option<String>,
        relay_tx: Option<mpsc::Sender<Vec<u8>>>,
    ) -> broadcast::Sender<SignalMessage> {
        let (tx, _) = broadcast::channel(16);
        let peer = PeerInfo {
            addr,
            port,
            cert_fingerprint,
            tx: tx.clone(),
            relay_tx,
        };

        // Remove old registration if exists
        self.peers.remove(&code);
        self.peers.insert(code.clone(), peer);

        info!("Registered peer {} at {}:{}", code, addr.ip(), port);
        tx
    }

    fn unregister(&self, code: &str) {
        if self.peers.remove(code).is_some() {
            info!("Unregistered peer {}", code);
        }
    }

    fn lookup(&self, code: &str, requester_addr: SocketAddr) -> Option<(String, Option<String>, bool, Option<String>)> {
        self.peers.get(code).map(|peer| {
            // Construct the actual address to connect to
            let peer_addr = SocketAddr::new(peer.addr.ip(), peer.port);

            // Check if they're on the same local network
            let is_local = peer.addr.ip() == requester_addr.ip()
                || peer.addr.ip().is_loopback()
                || requester_addr.ip().is_loopback();

            // Always provide relay address as fallback
            let relay_addr = Some(self.relay_addr.clone());

            (
                peer_addr.to_string(),
                peer.cert_fingerprint.clone(),
                is_local,
                relay_addr,
            )
        })
    }

    fn notify_peer(&self, code: &str, msg: SignalMessage) {
        if let Some(peer) = self.peers.get(code) {
            let _ = peer.tx.send(msg);
        }
    }

    /// Create a new relay session for a host
    fn create_relay_session(&self, host_code: String, host_tx: mpsc::Sender<Vec<u8>>) -> String {
        let session_id = generate_session_id();
        let session = RelaySession {
            host_code,
            client_code: None,
            host_tx,
            client_tx: None,
        };
        self.relay_sessions.insert(session_id.clone(), session);
        info!("Created relay session: {}", session_id);
        session_id
    }

    /// Join an existing relay session as client
    fn join_relay_session(
        &self,
        target_code: &str,
        client_code: String,
        client_tx: mpsc::Sender<Vec<u8>>,
    ) -> Option<String> {
        // Find session for target code
        for mut entry in self.relay_sessions.iter_mut() {
            if entry.value().host_code == target_code && entry.value().client_code.is_none() {
                entry.value_mut().client_code = Some(client_code.clone());
                entry.value_mut().client_tx = Some(client_tx);
                let session_id = entry.key().clone();
                info!("Client {} joined relay session {}", client_code, session_id);
                return Some(session_id);
            }
        }
        None
    }

    /// Forward data through relay
    fn relay_data(&self, session_id: &str, from_host: bool, data: Vec<u8>) -> bool {
        if let Some(session) = self.relay_sessions.get(session_id) {
            let tx = if from_host {
                session.client_tx.as_ref()
            } else {
                Some(&session.host_tx)
            };

            if let Some(tx) = tx {
                if tx.try_send(data).is_ok() {
                    return true;
                }
            }
        }
        false
    }

    fn peer_count(&self) -> usize {
        self.peers.len()
    }

    fn relay_session_count(&self) -> usize {
        self.relay_sessions.len()
    }
}

/// Generate a random session ID
fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("relay-{:x}", timestamp & 0xFFFFFFFF)
}

async fn handle_connection(server: Arc<SignalServer>, stream: TcpStream, addr: SocketAddr) {
    info!("New connection from {}", addr);

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed for {}: {}", addr, e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let mut registered_code: Option<String> = None;
    let mut peer_rx: Option<broadcast::Receiver<SignalMessage>> = None;

    // Relay channels
    let (relay_tx, mut relay_rx) = mpsc::channel::<Vec<u8>>(64);
    let mut relay_session_id: Option<String> = None;
    let mut is_relay_host = false;

    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<SignalMessage>(&text) {
                            Ok(signal_msg) => {
                                match signal_msg {
                                    SignalMessage::Register { code, port, cert_fingerprint } => {
                                        // Unregister previous code if any
                                        if let Some(ref old_code) = registered_code {
                                            server.unregister(old_code);
                                        }

                                        let tx = server.register(
                                            code.clone(),
                                            addr,
                                            port,
                                            cert_fingerprint,
                                            Some(relay_tx.clone()),
                                        );
                                        peer_rx = Some(tx.subscribe());
                                        registered_code = Some(code.clone());

                                        // Create relay session for this host
                                        let session_id = server.create_relay_session(code.clone(), relay_tx.clone());
                                        relay_session_id = Some(session_id.clone());
                                        is_relay_host = true;

                                        let response = SignalMessage::Registered {
                                            code,
                                            relay_addr: Some(server.relay_addr.clone()),
                                        };
                                        if let Err(e) = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await {
                                            error!("Failed to send response: {}", e);
                                            break;
                                        }
                                    }
                                    SignalMessage::Lookup { code } => {
                                        let response = match server.lookup(&code, addr) {
                                            Some((peer_addr, cert_fingerprint, is_local, relay_addr)) => {
                                                // Notify the host that someone is connecting
                                                server.notify_peer(&code, SignalMessage::PeerFound {
                                                    addr: addr.to_string(),
                                                    cert_fingerprint: None,
                                                    is_local,
                                                    relay_addr: None,
                                                });

                                                SignalMessage::PeerFound {
                                                    addr: peer_addr,
                                                    cert_fingerprint,
                                                    is_local,
                                                    relay_addr,
                                                }
                                            }
                                            None => SignalMessage::Error {
                                                message: format!("Peer not found: {}", code),
                                            },
                                        };

                                        if let Err(e) = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await {
                                            error!("Failed to send response: {}", e);
                                            break;
                                        }
                                    }
                                    SignalMessage::RelayRequest { target_code } => {
                                        // Client wants to connect via relay
                                        let client_code = registered_code.clone().unwrap_or_else(|| format!("client-{}", addr));

                                        match server.join_relay_session(&target_code, client_code.clone(), relay_tx.clone()) {
                                            Some(session_id) => {
                                                relay_session_id = Some(session_id.clone());
                                                is_relay_host = false;

                                                // Notify host that client connected
                                                server.notify_peer(&target_code, SignalMessage::RelayConnected {
                                                    peer_code: client_code,
                                                });

                                                let response = SignalMessage::RelayReady { session_id };
                                                if let Err(e) = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await {
                                                    error!("Failed to send relay ready: {}", e);
                                                    break;
                                                }
                                            }
                                            None => {
                                                let response = SignalMessage::Error {
                                                    message: format!("No relay session for: {}", target_code),
                                                };
                                                let _ = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await;
                                            }
                                        }
                                    }
                                    SignalMessage::RelayData { data } => {
                                        // Forward data to the other peer
                                        if let Some(ref session_id) = relay_session_id {
                                            if let Ok(bytes) = base64_decode(&data) {
                                                if !server.relay_data(session_id, is_relay_host, bytes) {
                                                    debug!("Failed to relay data for session {}", session_id);
                                                }
                                            }
                                        }
                                    }
                                    SignalMessage::Ping => {
                                        let response = SignalMessage::Pong;
                                        if let Err(e) = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await {
                                            error!("Failed to send pong: {}", e);
                                            break;
                                        }
                                    }
                                    SignalMessage::Pong => {
                                        // Client responded to our ping
                                    }
                                    _ => {
                                        warn!("Unexpected message type from {}", addr);
                                    }
                                }
                            }
                            Err(e) => {
                                warn!("Failed to parse message from {}: {}", addr, e);
                                let response = SignalMessage::Error {
                                    message: format!("Invalid message format: {}", e),
                                };
                                let _ = ws_sender.send(Message::Text(serde_json::to_string(&response).unwrap())).await;
                            }
                        }
                    }
                    Some(Ok(Message::Binary(data))) => {
                        // Binary data for relay
                        if let Some(ref session_id) = relay_session_id {
                            if !server.relay_data(session_id, is_relay_host, data) {
                                debug!("Failed to relay binary data");
                            }
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = ws_sender.send(Message::Pong(data)).await;
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("Connection closed by {}", addr);
                        break;
                    }
                    Some(Err(e)) => {
                        error!("WebSocket error from {}: {}", addr, e);
                        break;
                    }
                    None => {
                        info!("Connection ended for {}", addr);
                        break;
                    }
                    _ => {}
                }
            }

            // Handle notifications from other peers
            notification = async {
                if let Some(ref mut rx) = peer_rx {
                    rx.recv().await.ok()
                } else {
                    std::future::pending::<Option<SignalMessage>>().await
                }
            } => {
                if let Some(msg) = notification {
                    if let Err(e) = ws_sender.send(Message::Text(serde_json::to_string(&msg).unwrap())).await {
                        error!("Failed to send notification: {}", e);
                        break;
                    }
                }
            }

            // Handle relayed data from other peer
            relayed = relay_rx.recv() => {
                if let Some(data) = relayed {
                    // Send as binary for efficiency
                    if let Err(e) = ws_sender.send(Message::Binary(data)).await {
                        error!("Failed to send relayed data: {}", e);
                        break;
                    }
                }
            }
        }
    }

    // Cleanup
    if let Some(code) = registered_code {
        server.unregister(&code);
    }
    if let Some(session_id) = relay_session_id {
        server.relay_sessions.remove(&session_id);
    }
    info!("Connection handler finished for {}", addr);
}

/// Simple base64 decode
fn base64_decode(input: &str) -> Result<Vec<u8>, ()> {
    use std::collections::HashMap;
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut decode_map: HashMap<u8, u8> = HashMap::new();
    for (i, &c) in ALPHABET.iter().enumerate() {
        decode_map.insert(c, i as u8);
    }

    let input = input.trim_end_matches('=');
    let mut output = Vec::with_capacity(input.len() * 3 / 4);

    let chunks: Vec<u8> = input
        .bytes()
        .filter_map(|b| decode_map.get(&b).copied())
        .collect();

    for chunk in chunks.chunks(4) {
        if chunk.len() >= 2 {
            output.push((chunk[0] << 2) | (chunk[1] >> 4));
        }
        if chunk.len() >= 3 {
            output.push((chunk[1] << 4) | (chunk[2] >> 2));
        }
        if chunk.len() >= 4 {
            output.push((chunk[2] << 6) | chunk[3]);
        }
    }

    Ok(output)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("dits_signal=info".parse().unwrap()),
        )
        .init();

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    // Get external address for relay
    let relay_host = std::env::var("RELAY_HOST").unwrap_or_else(|_| format!("localhost:{}", port));
    let relay_addr = format!("ws://{}", relay_host);

    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await?;

    println!();
    println!("DITS Signal & Relay Server");
    println!("==========================");
    println!();
    println!("  Signal:    ws://{}", addr);
    println!("  Relay:     {}", relay_addr);
    println!();
    println!("  Features:");
    println!("    - Peer discovery via join codes");
    println!("    - TURN-style relay for NAT traversal");
    println!("    - No port forwarding required!");
    println!();
    println!("  Use with: dits p2p share --signal ws://localhost:{}", port);
    println!();
    println!("  Environment:");
    println!("    PORT={}       (listening port)", port);
    println!("    RELAY_HOST={} (external hostname)", relay_host);
    println!();
    println!("  Press Ctrl+C to stop");
    println!("==========================");
    println!();

    let server = Arc::new(SignalServer::new(relay_addr));

    // Spawn a task to periodically log stats
    let stats_server = server.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            info!(
                "Stats: {} peers, {} relay sessions",
                stats_server.peer_count(),
                stats_server.relay_session_count()
            );
        }
    });

    // Handle shutdown
    let shutdown_server = server.clone();
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        info!("Shutting down signal server...");
        shutdown_server.peers.clear();
        shutdown_server.relay_sessions.clear();
        std::process::exit(0);
    });

    info!("Signal & Relay server listening on {}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                let server = server.clone();
                tokio::spawn(handle_connection(server, stream, addr));
            }
            Err(e) => {
                error!("Failed to accept connection: {}", e);
            }
        }
    }
}
