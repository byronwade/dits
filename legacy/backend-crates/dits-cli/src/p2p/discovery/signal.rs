//! Signal server discovery (wraps existing rendezvous client)
//!
//! Uses the WebSocket-based signal server for peer discovery.
//! This is the fallback method when mDNS doesn't find the peer
//! (e.g., when peers are on different networks).

use super::*;
use crate::p2p::crypto::normalize_join_code;
use crate::p2p::rendezvous::{RendezvousClient, RendezvousError};

/// Signal server based discovery
///
/// Wraps the existing RendezvousClient to implement the Discovery trait.
/// Lower priority than mDNS since it requires internet connectivity.
pub struct SignalDiscovery {
    server_url: String,
    timeout: Duration,
}

impl SignalDiscovery {
    pub fn new(server_url: String, timeout: Duration) -> Self {
        Self { server_url, timeout }
    }

    /// Get the signal server URL
    pub fn server_url(&self) -> &str {
        &self.server_url
    }
}

/// Convert RendezvousError to DiscoveryError
fn map_rendezvous_error(e: RendezvousError) -> DiscoveryError {
    match e {
        RendezvousError::Timeout => DiscoveryError::Timeout,
        RendezvousError::PeerNotFound => DiscoveryError::NotFound,
        RendezvousError::ConnectionFailed(msg) => DiscoveryError::ConnectionFailed(msg),
        RendezvousError::InvalidResponse(msg) => {
            DiscoveryError::ConnectionFailed(format!("Invalid response: {}", msg))
        }
        RendezvousError::ServerError(msg) => {
            DiscoveryError::ConnectionFailed(format!("Server error: {}", msg))
        }
    }
}

#[async_trait]
impl Discovery for SignalDiscovery {
    fn name(&self) -> &'static str {
        "signal server"
    }

    fn priority(&self) -> u8 {
        30 // Lower priority - fallback after local methods
    }

    fn can_handle(&self, target: &str) -> bool {
        // Signal server handles join codes and URLs, not direct IPs
        target.parse::<std::net::SocketAddr>().is_err()
    }

    async fn host(
        &self,
        join_code: &str,
        _port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        let client = RendezvousClient::new(Some(self.server_url.clone()));

        // Note: host_with_fingerprint waits for a peer to connect
        // For Discovery trait, we just want to register and return
        // The actual waiting happens in the command implementation

        // We spawn the host operation but don't wait for peer connection
        // This is a simplified version - the full implementation handles
        // the WebSocket connection lifecycle separately

        let code = normalize_join_code(join_code);
        tracing::info!("Registering {} with signal server: {}", code, self.server_url);

        // For now, return Ok to indicate registration intent
        // The actual WebSocket connection is managed by p2p_commands.rs
        Ok(())
    }

    async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        let code = normalize_join_code(target);
        let client = RendezvousClient::new(Some(self.server_url.clone()));

        let result = client.connect(&code).await.map_err(map_rendezvous_error)?;

        Ok(DiscoveryResult {
            peer_addr: result.peer_addr,
            cert_fingerprint: result.cert_fingerprint,
            method: DiscoveryMethod::Signal,
            is_local: result.is_local,
        })
    }

    async fn announce(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // For signal server, announce is the same as host
        self.host(join_code, port, cert_fingerprint).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_handle() {
        let signal = SignalDiscovery::new(
            "wss://test.example.com".to_string(),
            Duration::from_secs(30),
        );

        // Should handle join codes
        assert!(signal.can_handle("ABC-123"));
        assert!(signal.can_handle("XYZ789"));

        // Should NOT handle IP addresses
        assert!(!signal.can_handle("192.168.1.1:4433"));
        assert!(!signal.can_handle("[::1]:4433"));
    }

    #[test]
    fn test_priority() {
        let signal = SignalDiscovery::new(
            "wss://test.example.com".to_string(),
            Duration::from_secs(30),
        );
        assert_eq!(signal.priority(), 30);
    }
}
