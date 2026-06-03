//! Relay discovery for guaranteed NAT traversal
//!
//! When direct peer-to-peer connection fails (strict NAT), the relay
//! forwards traffic through the signal server:
//!
//! ```text
//! Peer A  <-->  Relay Server  <-->  Peer B
//! ```
//!
//! This provides 100% NAT traversal success at the cost of added latency.

use super::{Discovery, DiscoveryError, DiscoveryMethod, DiscoveryResult};
use crate::p2p::types::CertFingerprint;
use async_trait::async_trait;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Relay connection state
#[derive(Debug, Clone)]
pub struct RelayConnection {
    /// WebSocket URL for the relay
    pub relay_url: String,
    /// Session ID for the relay connection
    pub session_id: String,
    /// Whether we are the host or client
    pub is_host: bool,
}

/// Relay-based discovery for guaranteed NAT traversal
///
/// Priority: 40 (lowest - used as fallback when direct connection fails)
pub struct RelayDiscovery {
    /// Signal/relay server URL
    relay_url: String,
    /// Active relay connection
    connection: Arc<Mutex<Option<RelayConnection>>>,
}

impl RelayDiscovery {
    /// Create a new relay discovery instance
    pub fn new(relay_url: String) -> Self {
        Self {
            relay_url,
            connection: Arc::new(Mutex::new(None)),
        }
    }

    /// Check if relay mode is active
    pub async fn is_active(&self) -> bool {
        self.connection.lock().await.is_some()
    }

    /// Get the current relay connection info
    pub async fn get_connection(&self) -> Option<RelayConnection> {
        self.connection.lock().await.clone()
    }

    /// Request relay connection to a peer
    ///
    /// This is called after direct connection fails. The relay server
    /// will forward traffic between peers.
    pub async fn request_relay(&self, target_code: &str) -> Result<RelayConnection, DiscoveryError> {
        use tokio_tungstenite::{connect_async, tungstenite::Message};
        use futures_util::{SinkExt, StreamExt};

        let url = format!("{}", self.relay_url);
        let (mut ws_stream, _) = connect_async(&url)
            .await
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("WebSocket connect: {}", e)))?;

        // Send relay request
        let request = serde_json::json!({
            "type": "relay_request",
            "target_code": target_code.to_uppercase().replace("-", "")
        });

        ws_stream
            .send(Message::Text(request.to_string()))
            .await
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("Send relay request: {}", e)))?;

        // Wait for relay ready response
        let timeout = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            ws_stream.next()
        ).await;

        match timeout {
            Ok(Some(Ok(Message::Text(text)))) => {
                let response: serde_json::Value = serde_json::from_str(&text)
                    .map_err(|e| DiscoveryError::ConnectionFailed(format!("Parse response: {}", e)))?;

                match response.get("type").and_then(|t| t.as_str()) {
                    Some("relay_ready") => {
                        let session_id = response.get("session_id")
                            .and_then(|s| s.as_str())
                            .ok_or_else(|| DiscoveryError::ConnectionFailed("Missing session_id".to_string()))?
                            .to_string();

                        let conn = RelayConnection {
                            relay_url: self.relay_url.clone(),
                            session_id,
                            is_host: false,
                        };

                        *self.connection.lock().await = Some(conn.clone());
                        Ok(conn)
                    }
                    Some("error") => {
                        let msg = response.get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown error");
                        Err(DiscoveryError::ConnectionFailed(msg.to_string()))
                    }
                    _ => Err(DiscoveryError::ConnectionFailed("Unexpected response".to_string()))
                }
            }
            Ok(Some(Ok(_))) => Err(DiscoveryError::ConnectionFailed("Unexpected message type".to_string())),
            Ok(Some(Err(e))) => Err(DiscoveryError::ConnectionFailed(format!("WebSocket error: {}", e))),
            Ok(None) => Err(DiscoveryError::ConnectionFailed("Connection closed".to_string())),
            Err(_) => Err(DiscoveryError::Timeout),
        }
    }
}

#[async_trait]
impl Discovery for RelayDiscovery {
    fn name(&self) -> &'static str {
        "relay"
    }

    fn priority(&self) -> u8 {
        40 // Lowest priority - fallback when direct fails
    }

    fn can_handle(&self, _target: &str) -> bool {
        // Relay can handle any target as a fallback
        true
    }

    async fn host(
        &self,
        _join_code: &str,
        _port: u16,
        _cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // Relay hosting is handled by the signal server registration
        // The relay session is created when a peer registers
        Ok(())
    }

    async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        // Request relay connection
        let conn = self.request_relay(target).await?;

        // For relay mode, we return a special "relay address" that indicates
        // the connection should go through the relay server
        // The actual address parsing happens at a higher level

        // Parse relay URL to get socket address (for display purposes)
        let relay_addr: SocketAddr = self.relay_url
            .trim_start_matches("ws://")
            .trim_start_matches("wss://")
            .parse()
            .unwrap_or_else(|_| "0.0.0.0:8080".parse().unwrap());

        Ok(DiscoveryResult {
            peer_addr: relay_addr,
            cert_fingerprint: None,
            method: DiscoveryMethod::Relay,
            is_local: false,
        })
    }

    async fn announce(
        &self,
        _join_code: &str,
        _port: u16,
        _cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // Relay announcement is handled by signal server registration
        Ok(())
    }

    async fn unannounce(&self) -> Result<(), DiscoveryError> {
        *self.connection.lock().await = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relay_priority() {
        let relay = RelayDiscovery::new("ws://localhost:8080".to_string());
        assert_eq!(relay.priority(), 40); // Lowest priority
    }

    #[test]
    fn test_relay_can_handle() {
        let relay = RelayDiscovery::new("ws://localhost:8080".to_string());
        // Relay can handle anything as a fallback
        assert!(relay.can_handle("ABC-123"));
        assert!(relay.can_handle("192.168.1.1:4433"));
        assert!(relay.can_handle("anything"));
    }
}
