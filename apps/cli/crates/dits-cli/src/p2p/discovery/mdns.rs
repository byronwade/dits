//! mDNS/DNS-SD discovery for LAN peers (zero-config)
//!
//! Uses multicast DNS to discover DITS peers on the local network
//! without requiring any server or internet connection.
//!
//! Service type: `_dits-p2p._udp.local.`
//!
//! # How it works
//!
//! 1. When sharing, we register an mDNS service with:
//!    - Service type: `_dits-p2p._udp.local.`
//!    - Instance name: `dits-<join_code>`
//!    - TXT records: `code=ABC123`, `version=1`, `fingerprint=...`
//!
//! 2. When connecting, we browse for services and match by join code
//!
//! # Example
//!
//! ```ignore
//! let mdns = MdnsDiscovery::new(Duration::from_secs(5));
//!
//! // Share: announce on local network
//! mdns.announce("ABC-123", 4433, None).await?;
//!
//! // Connect: find peer by code
//! let result = mdns.lookup("ABC-123").await?;
//! ```

use super::*;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::timeout;
use tracing::{debug, info, warn};

/// Service type for DITS P2P discovery
const SERVICE_TYPE: &str = "_dits-p2p._udp.local.";

/// mDNS-based local network discovery
pub struct MdnsDiscovery {
    timeout: Duration,
    /// Daemon for managing mDNS services (kept alive while announcing)
    daemon: Arc<Mutex<Option<ServiceDaemon>>>,
}

impl MdnsDiscovery {
    pub fn new(timeout: Duration) -> Self {
        Self {
            timeout,
            daemon: Arc::new(Mutex::new(None)),
        }
    }

    /// Create or get the mDNS daemon
    fn create_daemon() -> Result<ServiceDaemon, DiscoveryError> {
        ServiceDaemon::new().map_err(|e| {
            DiscoveryError::ConnectionFailed(format!("mDNS initialization failed: {}", e))
        })
    }

    /// Create service info for registration
    fn create_service_info(
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<ServiceInfo, DiscoveryError> {
        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().into_owned())
            .unwrap_or_else(|_| "dits-host".to_string());

        // Normalize code for instance name (remove dashes, lowercase)
        let normalized = crate::p2p::crypto::normalize_join_code(join_code);
        let instance_name = format!("dits-{}", normalized.to_lowercase());

        // Build TXT record properties
        let mut properties: HashMap<String, String> = HashMap::new();
        properties.insert("code".to_string(), normalized);
        properties.insert(
            "version".to_string(),
            crate::p2p::P2P_PROTOCOL_VERSION.to_string(),
        );
        if let Some(fp) = cert_fingerprint {
            properties.insert("fingerprint".to_string(), hex::encode(fp));
        }

        // Convert HashMap to Vec of key=value for ServiceInfo
        let properties_vec: Vec<(&str, &str)> = properties
            .iter()
            .map(|(k, v)| (k.as_str(), v.as_str()))
            .collect();

        ServiceInfo::new(SERVICE_TYPE, &instance_name, &hostname, (), port, &properties_vec[..])
            .map_err(|e| DiscoveryError::ConnectionFailed(format!("Failed to create service: {}", e)))
    }
}

#[async_trait]
impl Discovery for MdnsDiscovery {
    fn name(&self) -> &'static str {
        "mDNS"
    }

    fn priority(&self) -> u8 {
        10 // Second priority after direct
    }

    fn can_handle(&self, target: &str) -> bool {
        // mDNS handles join codes, not direct IP addresses
        target.parse::<std::net::SocketAddr>().is_err()
    }

    async fn host(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        // For hosting, we just announce - the announce method handles registration
        self.announce(join_code, port, cert_fingerprint).await
    }

    async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        let normalized_code = crate::p2p::crypto::normalize_join_code(target);
        debug!("mDNS lookup for code: {}", normalized_code);

        let daemon = Self::create_daemon()?;

        let receiver = daemon.browse(SERVICE_TYPE).map_err(|e| {
            DiscoveryError::ConnectionFailed(format!("mDNS browse failed: {}", e))
        })?;

        let lookup_timeout = self.timeout;
        let result = timeout(lookup_timeout, async {
            loop {
                match receiver.recv_async().await {
                    Ok(ServiceEvent::ServiceResolved(info)) => {
                        debug!("mDNS found service: {:?}", info.get_fullname());

                        // Check if this service has our join code
                        if let Some(code) = info.get_property_val_str("code") {
                            let found_code = crate::p2p::crypto::normalize_join_code(code);
                            debug!("Service code: {} (looking for: {})", found_code, normalized_code);

                            if found_code == normalized_code {
                                // Found our peer!
                                let addresses = info.get_addresses();
                                if let Some(addr) = addresses.iter().next() {
                                    let port = info.get_port();

                                    // Parse certificate fingerprint if present
                                    let fingerprint = info
                                        .get_property_val_str("fingerprint")
                                        .and_then(|s| {
                                            hex::decode(s).ok().and_then(|bytes| {
                                                if bytes.len() == 32 {
                                                    let mut arr = [0u8; 32];
                                                    arr.copy_from_slice(&bytes);
                                                    Some(arr)
                                                } else {
                                                    None
                                                }
                                            })
                                        });

                                    info!("mDNS found peer: {}:{}", addr, port);

                                    return Ok(DiscoveryResult {
                                        peer_addr: std::net::SocketAddr::new(*addr, port),
                                        cert_fingerprint: fingerprint,
                                        method: DiscoveryMethod::Mdns,
                                        is_local: true, // mDNS is always local
                                    });
                                }
                            }
                        }
                    }
                    Ok(ServiceEvent::SearchStarted(_)) => {
                        debug!("mDNS search started");
                    }
                    Ok(ServiceEvent::ServiceFound(_, _)) => {
                        debug!("mDNS service found, waiting for resolution...");
                    }
                    Ok(_) => {
                        // Other events, continue waiting
                    }
                    Err(e) => {
                        warn!("mDNS receive error: {:?}", e);
                        break;
                    }
                }
            }
            Err(DiscoveryError::NotFound)
        })
        .await;

        match result {
            Ok(r) => r,
            Err(_) => {
                debug!("mDNS lookup timed out after {:?}", lookup_timeout);
                Err(DiscoveryError::Timeout)
            }
        }
    }

    async fn announce(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        let daemon = Self::create_daemon()?;
        let service_info = Self::create_service_info(join_code, port, cert_fingerprint)?;

        daemon.register(service_info).map_err(|e| {
            DiscoveryError::ConnectionFailed(format!("mDNS registration failed: {}", e))
        })?;

        info!(
            "mDNS: Announced DITS share '{}' on port {}",
            join_code, port
        );

        // Keep daemon alive for announcements
        let mut guard = self.daemon.lock().await;
        *guard = Some(daemon);

        Ok(())
    }

    async fn unannounce(&self) -> Result<(), DiscoveryError> {
        let mut guard = self.daemon.lock().await;
        if let Some(daemon) = guard.take() {
            // Daemon shutdown will unregister services
            daemon.shutdown().ok();
            info!("mDNS: Stopped announcing");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_handle() {
        let mdns = MdnsDiscovery::new(Duration::from_secs(5));

        // Should handle join codes
        assert!(mdns.can_handle("ABC-123"));
        assert!(mdns.can_handle("abc123"));
        assert!(mdns.can_handle("XYZ789"));

        // Should NOT handle IP addresses
        assert!(!mdns.can_handle("192.168.1.1:4433"));
        assert!(!mdns.can_handle("[::1]:4433"));
    }

    #[test]
    fn test_service_type() {
        assert_eq!(SERVICE_TYPE, "_dits-p2p._udp.local.");
    }
}
