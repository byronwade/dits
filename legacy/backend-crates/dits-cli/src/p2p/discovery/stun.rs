//! STUN-based NAT traversal and external IP discovery
//!
//! Uses STUN (Session Traversal Utilities for NAT) servers to discover
//! our external IP address, which is useful for hole-punching and
//! allowing peers behind different NATs to connect.
//!
//! # How it works
//!
//! 1. Send a STUN binding request to a public STUN server
//! 2. Server responds with our external IP:port as seen from the internet
//! 3. We can share this address with peers via the signal server
//!
//! # Public STUN Servers
//!
//! - stun.l.google.com:19302
//! - stun1.l.google.com:19302
//! - stun.cloudflare.com:3478

use super::*;
use std::net::{SocketAddr, ToSocketAddrs, UdpSocket};
use std::time::Duration;
use tracing::{debug, info, warn};

/// Default STUN servers to try
pub const DEFAULT_STUN_SERVERS: &[&str] = &[
    "stun.l.google.com:19302",
    "stun1.l.google.com:19302",
];

/// STUN message type for Binding Request
const STUN_BINDING_REQUEST: u16 = 0x0001;

/// STUN message type for Binding Response (success)
const STUN_BINDING_RESPONSE: u16 = 0x0101;

/// STUN attribute type: XOR-MAPPED-ADDRESS
const STUN_ATTR_XOR_MAPPED_ADDRESS: u16 = 0x0020;

/// STUN attribute type: MAPPED-ADDRESS (fallback)
const STUN_ATTR_MAPPED_ADDRESS: u16 = 0x0001;

/// STUN magic cookie (RFC 5389)
const STUN_MAGIC_COOKIE: u32 = 0x2112A442;

/// STUN-based external IP discovery
pub struct StunDiscovery {
    stun_servers: Vec<String>,
    timeout: Duration,
}

impl StunDiscovery {
    pub fn new(stun_servers: Vec<String>) -> Self {
        Self {
            stun_servers,
            timeout: Duration::from_secs(5),
        }
    }

    /// Create with default STUN servers
    pub fn with_defaults() -> Self {
        Self::new(
            DEFAULT_STUN_SERVERS
                .iter()
                .map(|s| s.to_string())
                .collect(),
        )
    }

    /// Get our external IP address using STUN
    pub fn get_external_address(&self) -> Result<SocketAddr, DiscoveryError> {
        for server in &self.stun_servers {
            match self.query_stun_server(server) {
                Ok(addr) => {
                    info!("STUN discovered external address: {}", addr);
                    return Ok(addr);
                }
                Err(e) => {
                    debug!("STUN server {} failed: {}", server, e);
                    continue;
                }
            }
        }
        Err(DiscoveryError::ConnectionFailed(
            "All STUN servers failed".into(),
        ))
    }

    /// Query a single STUN server
    fn query_stun_server(&self, server: &str) -> Result<SocketAddr, DiscoveryError> {
        // Resolve server address
        let server_addr = server
            .to_socket_addrs()
            .map_err(|e| DiscoveryError::InvalidTarget(format!("Cannot resolve {}: {}", server, e)))?
            .next()
            .ok_or_else(|| DiscoveryError::InvalidTarget(format!("No addresses for {}", server)))?;

        debug!("Querying STUN server: {}", server_addr);

        // Create UDP socket
        let socket = UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("Socket bind failed: {}", e)))?;

        socket
            .set_read_timeout(Some(self.timeout))
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("Set timeout failed: {}", e)))?;

        // Build STUN Binding Request
        let request = build_stun_request();

        // Send request
        socket
            .send_to(&request, server_addr)
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("Send failed: {}", e)))?;

        // Receive response
        let mut buf = [0u8; 1024];
        let (len, _) = socket
            .recv_from(&mut buf)
            .map_err(|e| DiscoveryError::Timeout)?;

        // Parse response
        parse_stun_response(&buf[..len])
    }
}

/// Build a STUN Binding Request message
fn build_stun_request() -> Vec<u8> {
    let mut msg = Vec::with_capacity(20);

    // Message Type: Binding Request (0x0001)
    msg.extend_from_slice(&STUN_BINDING_REQUEST.to_be_bytes());

    // Message Length: 0 (no attributes)
    msg.extend_from_slice(&0u16.to_be_bytes());

    // Magic Cookie
    msg.extend_from_slice(&STUN_MAGIC_COOKIE.to_be_bytes());

    // Transaction ID (96 bits / 12 bytes)
    let mut txn_id = [0u8; 12];
    getrandom::getrandom(&mut txn_id).expect("RNG failed");
    msg.extend_from_slice(&txn_id);

    msg
}

/// Parse a STUN response and extract the mapped address
fn parse_stun_response(data: &[u8]) -> Result<SocketAddr, DiscoveryError> {
    if data.len() < 20 {
        return Err(DiscoveryError::ConnectionFailed(
            "Response too short".into(),
        ));
    }

    // Check message type
    let msg_type = u16::from_be_bytes([data[0], data[1]]);
    if msg_type != STUN_BINDING_RESPONSE {
        return Err(DiscoveryError::ConnectionFailed(format!(
            "Unexpected message type: 0x{:04x}",
            msg_type
        )));
    }

    // Get message length
    let msg_len = u16::from_be_bytes([data[2], data[3]]) as usize;

    // Verify magic cookie
    let cookie = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
    if cookie != STUN_MAGIC_COOKIE {
        return Err(DiscoveryError::ConnectionFailed(
            "Invalid magic cookie".into(),
        ));
    }

    // Parse attributes
    let attributes = &data[20..20 + msg_len.min(data.len() - 20)];
    let mut offset = 0;

    while offset + 4 <= attributes.len() {
        let attr_type = u16::from_be_bytes([attributes[offset], attributes[offset + 1]]);
        let attr_len = u16::from_be_bytes([attributes[offset + 2], attributes[offset + 3]]) as usize;

        if offset + 4 + attr_len > attributes.len() {
            break;
        }

        let attr_value = &attributes[offset + 4..offset + 4 + attr_len];

        match attr_type {
            STUN_ATTR_XOR_MAPPED_ADDRESS => {
                return parse_xor_mapped_address(attr_value, &data[4..8]);
            }
            STUN_ATTR_MAPPED_ADDRESS => {
                return parse_mapped_address(attr_value);
            }
            _ => {}
        }

        // Move to next attribute (with padding to 4-byte boundary)
        offset += 4 + ((attr_len + 3) & !3);
    }

    Err(DiscoveryError::ConnectionFailed(
        "No mapped address in response".into(),
    ))
}

/// Parse XOR-MAPPED-ADDRESS attribute
fn parse_xor_mapped_address(data: &[u8], magic: &[u8]) -> Result<SocketAddr, DiscoveryError> {
    if data.len() < 8 {
        return Err(DiscoveryError::ConnectionFailed(
            "XOR-MAPPED-ADDRESS too short".into(),
        ));
    }

    let family = data[1];
    let xor_port = u16::from_be_bytes([data[2], data[3]]);
    let port = xor_port ^ (STUN_MAGIC_COOKIE >> 16) as u16;

    match family {
        0x01 => {
            // IPv4
            let xor_ip = [data[4], data[5], data[6], data[7]];
            let ip = [
                xor_ip[0] ^ magic[0],
                xor_ip[1] ^ magic[1],
                xor_ip[2] ^ magic[2],
                xor_ip[3] ^ magic[3],
            ];
            Ok(SocketAddr::new(
                std::net::IpAddr::V4(std::net::Ipv4Addr::new(ip[0], ip[1], ip[2], ip[3])),
                port,
            ))
        }
        0x02 => {
            // IPv6 (16 bytes)
            if data.len() < 20 {
                return Err(DiscoveryError::ConnectionFailed(
                    "XOR-MAPPED-ADDRESS IPv6 too short".into(),
                ));
            }
            // For simplicity, just return error for IPv6
            // Full implementation would XOR with magic cookie + transaction ID
            Err(DiscoveryError::ConnectionFailed(
                "IPv6 not fully supported yet".into(),
            ))
        }
        _ => Err(DiscoveryError::ConnectionFailed(format!(
            "Unknown address family: {}",
            family
        ))),
    }
}

/// Parse MAPPED-ADDRESS attribute (non-XOR, for old servers)
fn parse_mapped_address(data: &[u8]) -> Result<SocketAddr, DiscoveryError> {
    if data.len() < 8 {
        return Err(DiscoveryError::ConnectionFailed(
            "MAPPED-ADDRESS too short".into(),
        ));
    }

    let family = data[1];
    let port = u16::from_be_bytes([data[2], data[3]]);

    match family {
        0x01 => {
            // IPv4
            Ok(SocketAddr::new(
                std::net::IpAddr::V4(std::net::Ipv4Addr::new(data[4], data[5], data[6], data[7])),
                port,
            ))
        }
        _ => Err(DiscoveryError::ConnectionFailed(format!(
            "Unknown address family: {}",
            family
        ))),
    }
}

#[async_trait]
impl Discovery for StunDiscovery {
    fn name(&self) -> &'static str {
        "STUN"
    }

    fn priority(&self) -> u8 {
        20 // Between mDNS and signal server
    }

    fn can_handle(&self, _target: &str) -> bool {
        // STUN is for external IP discovery, not peer lookup
        false
    }

    async fn host(
        &self,
        _join_code: &str,
        port: u16,
        _cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // STUN can discover our external IP
        let external = self.get_external_address()?;
        info!(
            "STUN: External address is {}:{} (your P2P port: {})",
            external.ip(),
            external.port(),
            port
        );
        Ok(())
    }

    async fn lookup(&self, _target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        // STUN doesn't do peer lookup - it only discovers our own external IP
        Err(DiscoveryError::UnsupportedMethod)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_stun_request() {
        let request = build_stun_request();
        assert_eq!(request.len(), 20);
        // Check message type
        assert_eq!(request[0], 0x00);
        assert_eq!(request[1], 0x01);
        // Check magic cookie
        assert_eq!(request[4], 0x21);
        assert_eq!(request[5], 0x12);
        assert_eq!(request[6], 0xA4);
        assert_eq!(request[7], 0x42);
    }

    #[test]
    fn test_can_handle() {
        let stun = StunDiscovery::with_defaults();
        // STUN doesn't handle lookups
        assert!(!stun.can_handle("ABC-123"));
        assert!(!stun.can_handle("192.168.1.1:4433"));
    }

    // Integration test - only run if network available
    #[test]
    #[ignore]
    fn test_get_external_address() {
        let stun = StunDiscovery::with_defaults();
        let result = stun.get_external_address();
        assert!(result.is_ok(), "STUN query failed: {:?}", result.err());
        let addr = result.unwrap();
        println!("External address: {}", addr);
    }
}
