//! Rendezvous/signaling client for DITS P2P

use std::net::SocketAddr;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, info};

use crate::p2p::crypto::normalize_join_code;
use crate::p2p::types::CertFingerprint;
use crate::p2p::DEFAULT_SIGNAL_SERVER;

#[derive(Debug, Clone)]
pub enum RendezvousError {
    ConnectionFailed(String),
    Timeout,
    InvalidResponse(String),
    PeerNotFound,
    ServerError(String),
}

impl std::fmt::Display for RendezvousError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RendezvousError::ConnectionFailed(e) => write!(f, "Connection failed: {}", e),
            RendezvousError::Timeout => write!(f, "Connection timeout"),
            RendezvousError::InvalidResponse(e) => write!(f, "Invalid response: {}", e),
            RendezvousError::PeerNotFound => write!(f, "Peer not found"),
            RendezvousError::ServerError(e) => write!(f, "Server error: {}", e),
        }
    }
}

impl std::error::Error for RendezvousError {}

#[derive(Debug, Clone)]
pub struct RendezvousResult {
    pub peer_addr: SocketAddr,
    pub cert_fingerprint: Option<CertFingerprint>,
    pub is_local: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SignalMessage {
    #[serde(rename = "register")]
    Register { code: String, port: u16, #[serde(skip_serializing_if = "Option::is_none")] cert_fingerprint: Option<String> },
    #[serde(rename = "lookup")]
    Lookup { code: String },
    #[serde(rename = "peer_found")]
    PeerFound { addr: String, #[serde(skip_serializing_if = "Option::is_none")] cert_fingerprint: Option<String>, #[serde(default)] is_local: bool },
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "registered")]
    Registered { code: String },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
}

pub struct RendezvousClient {
    server_url: String,
    timeout: Duration,
}

impl RendezvousClient {
    pub fn new(server_url: Option<String>) -> Self {
        Self {
            server_url: server_url.unwrap_or_else(|| DEFAULT_SIGNAL_SERVER.to_string()),
            timeout: Duration::from_secs(30),
        }
    }

    pub async fn host(&self, join_code: &str) -> Result<RendezvousResult, RendezvousError> {
        self.host_with_fingerprint(join_code, None).await
    }

    pub async fn host_with_fingerprint(&self, join_code: &str, cert_fingerprint: Option<CertFingerprint>) -> Result<RendezvousResult, RendezvousError> {
        let code = normalize_join_code(join_code);
        debug!("Registering with signal server: {}", self.server_url);

        let (mut ws, _) = timeout(self.timeout, connect_async(&self.server_url)).await
            .map_err(|_| RendezvousError::Timeout)?
            .map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

        let msg = SignalMessage::Register { code: code.clone(), port: crate::p2p::DEFAULT_P2P_PORT, cert_fingerprint: cert_fingerprint.map(|f| hex::encode(f)) };
        ws.send(Message::Text(serde_json::to_string(&msg).unwrap())).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

        let response = timeout(self.timeout, ws.next()).await.map_err(|_| RendezvousError::Timeout)?
            .ok_or(RendezvousError::ConnectionFailed("Connection closed".into()))?
            .map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

        let text = response.to_text().map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;
        let signal_msg: SignalMessage = serde_json::from_str(text).map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;

        match signal_msg {
            SignalMessage::Registered { .. } => { info!("Registered with signal server, waiting for peers..."); }
            SignalMessage::Error { message } => { return Err(RendezvousError::ServerError(message)); }
            _ => { return Err(RendezvousError::InvalidResponse("Unexpected message".into())); }
        }

        loop {
            let response = timeout(Duration::from_secs(60), ws.next()).await.map_err(|_| RendezvousError::Timeout)?
                .ok_or(RendezvousError::ConnectionFailed("Connection closed".into()))?
                .map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

            if response.is_ping() {
                ws.send(Message::Pong(vec![])).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;
                continue;
            }

            let text = response.to_text().map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;
            let signal_msg: SignalMessage = serde_json::from_str(text).map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;

            match signal_msg {
                SignalMessage::PeerFound { addr, cert_fingerprint, is_local } => {
                    let peer_addr: SocketAddr = addr.parse().map_err(|e| RendezvousError::InvalidResponse(format!("Invalid addr: {}", e)))?;
                    let fp = cert_fingerprint.and_then(|s| {
                        let bytes = hex::decode(s).ok()?;
                        if bytes.len() == 32 { let mut arr = [0u8; 32]; arr.copy_from_slice(&bytes); Some(arr) } else { None }
                    });
                    return Ok(RendezvousResult { peer_addr, cert_fingerprint: fp, is_local });
                }
                SignalMessage::Ping => {
                    ws.send(Message::Text(serde_json::to_string(&SignalMessage::Pong).unwrap())).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;
                }
                SignalMessage::Error { message } => { return Err(RendezvousError::ServerError(message)); }
                _ => {}
            }
        }
    }

    pub async fn connect(&self, join_code: &str) -> Result<RendezvousResult, RendezvousError> {
        let code = normalize_join_code(join_code);
        debug!("Looking up peer via signal server: {}", self.server_url);

        let (mut ws, _) = timeout(self.timeout, connect_async(&self.server_url)).await
            .map_err(|_| RendezvousError::Timeout)?
            .map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

        let msg = SignalMessage::Lookup { code };
        ws.send(Message::Text(serde_json::to_string(&msg).unwrap())).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

        loop {
            let response = timeout(self.timeout, ws.next()).await.map_err(|_| RendezvousError::Timeout)?
                .ok_or(RendezvousError::ConnectionFailed("Connection closed".into()))?
                .map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;

            if response.is_ping() {
                ws.send(Message::Pong(vec![])).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;
                continue;
            }

            let text = response.to_text().map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;
            let signal_msg: SignalMessage = serde_json::from_str(text).map_err(|e| RendezvousError::InvalidResponse(e.to_string()))?;

            match signal_msg {
                SignalMessage::PeerFound { addr, cert_fingerprint, is_local } => {
                    let peer_addr: SocketAddr = addr.parse().map_err(|e| RendezvousError::InvalidResponse(format!("Invalid addr: {}", e)))?;
                    let fp = cert_fingerprint.and_then(|s| {
                        let bytes = hex::decode(s).ok()?;
                        if bytes.len() == 32 { let mut arr = [0u8; 32]; arr.copy_from_slice(&bytes); Some(arr) } else { None }
                    });
                    info!("Found peer at {}", peer_addr);
                    return Ok(RendezvousResult { peer_addr, cert_fingerprint: fp, is_local });
                }
                SignalMessage::Error { message } => {
                    if message.contains("not found") { return Err(RendezvousError::PeerNotFound); }
                    return Err(RendezvousError::ServerError(message));
                }
                SignalMessage::Ping => {
                    ws.send(Message::Text(serde_json::to_string(&SignalMessage::Pong).unwrap())).await.map_err(|e| RendezvousError::ConnectionFailed(e.to_string()))?;
                }
                _ => {}
            }
        }
    }
}
