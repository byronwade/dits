//! Direct IP:port connection (no discovery needed)
//!
//! This is the simplest discovery method - when the user provides
//! a direct IP:port address, we just use it without any discovery.

use super::*;
use std::net::{IpAddr, SocketAddr};

/// Direct IP:port discovery (no actual discovery, just parsing)
///
/// This method has the highest priority (0) and handles targets
/// that are already valid IP:port addresses.
pub struct DirectDiscovery;

impl DirectDiscovery {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DirectDiscovery {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Discovery for DirectDiscovery {
    fn name(&self) -> &'static str {
        "direct"
    }

    fn priority(&self) -> u8 {
        0 // Highest priority - always check first
    }

    fn can_handle(&self, target: &str) -> bool {
        // Can handle if target is a valid IP:port or [IPv6]:port
        target.parse::<SocketAddr>().is_ok()
    }

    async fn host(
        &self,
        _join_code: &str,
        _port: u16,
        _cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // Direct discovery doesn't support hosting registration
        // (users just share the IP:port directly)
        Err(DiscoveryError::UnsupportedMethod)
    }

    async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        let addr: SocketAddr = target
            .parse()
            .map_err(|_| DiscoveryError::InvalidTarget(target.to_string()))?;

        Ok(DiscoveryResult {
            peer_addr: addr,
            cert_fingerprint: None,
            method: DiscoveryMethod::Direct,
            is_local: is_local_address(&addr.ip()),
        })
    }
}

/// Check if an IP address is local/private
fn is_local_address(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()      // 127.0.0.0/8
            || v4.is_private()    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
            || v4.is_link_local() // 169.254.0.0/16
        }
        IpAddr::V6(v6) => {
            v6.is_loopback() // ::1
            // Note: is_unique_local() not stable yet, would check fc00::/7
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_handle_ipv4() {
        let direct = DirectDiscovery::new();
        assert!(direct.can_handle("192.168.1.1:4433"));
        assert!(direct.can_handle("10.0.0.1:8080"));
        assert!(direct.can_handle("127.0.0.1:4433"));
    }

    #[test]
    fn test_can_handle_ipv6() {
        let direct = DirectDiscovery::new();
        assert!(direct.can_handle("[::1]:4433"));
        assert!(direct.can_handle("[2001:db8::1]:4433"));
    }

    #[test]
    fn test_cannot_handle_codes() {
        let direct = DirectDiscovery::new();
        assert!(!direct.can_handle("ABC-123"));
        assert!(!direct.can_handle("abc123"));
        assert!(!direct.can_handle("dits://ABC-123"));
    }

    #[tokio::test]
    async fn test_lookup_local() {
        let direct = DirectDiscovery::new();
        let result = direct.lookup("192.168.1.1:4433").await.unwrap();
        assert_eq!(result.peer_addr.port(), 4433);
        assert!(result.is_local);
        assert_eq!(result.method, DiscoveryMethod::Direct);
    }

    #[tokio::test]
    async fn test_lookup_public() {
        let direct = DirectDiscovery::new();
        let result = direct.lookup("8.8.8.8:4433").await.unwrap();
        assert!(!result.is_local);
    }

    #[test]
    fn test_is_local_address() {
        use std::net::Ipv4Addr;

        assert!(is_local_address(&IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))));
        assert!(is_local_address(&IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1))));
        assert!(is_local_address(&IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1))));
        assert!(is_local_address(&IpAddr::V4(Ipv4Addr::new(172, 16, 0, 1))));
        assert!(!is_local_address(&IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
    }
}
