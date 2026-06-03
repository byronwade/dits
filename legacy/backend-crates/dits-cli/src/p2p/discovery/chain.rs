//! Discovery chain that tries multiple methods in priority order

use super::*;
use std::sync::Arc;
use std::time::Instant;
use tracing::{debug, info, warn};

/// Progress update during discovery
#[derive(Clone, Debug)]
pub enum DiscoveryProgress {
    /// Starting to try a discovery method
    TryingMethod { method: &'static str, attempt: usize, total: usize },
    /// Method failed, moving to next
    MethodFailed { method: &'static str, reason: String },
    /// Found peer, attempting connection
    PeerFound { method: &'static str, addr: String },
    /// Connection attempt in progress
    Connecting { addr: String },
    /// Successfully connected
    Connected { method: &'static str, addr: String, duration_ms: u64 },
}

/// Callback for progress updates
pub type ProgressCallback = Box<dyn Fn(DiscoveryProgress) + Send + Sync>;

/// Chain of discovery methods, tried in priority order
///
/// The DiscoveryChain manages multiple discovery methods and tries them
/// in sequence until one succeeds. Methods are ordered by priority
/// (lower priority number = tried first).
///
/// # Example
///
/// ```ignore
/// let config = DiscoveryConfig::default();
/// let chain = DiscoveryChain::with_defaults(config);
///
/// // Try to find peer - will try mDNS first, then signal server
/// let result = chain.lookup("ABC-123").await?;
/// ```
pub struct DiscoveryChain {
    methods: Vec<Arc<dyn Discovery>>,
    config: DiscoveryConfig,
}

impl DiscoveryChain {
    /// Create an empty discovery chain
    pub fn new(config: DiscoveryConfig) -> Self {
        Self {
            methods: Vec::new(),
            config,
        }
    }

    /// Create chain with default discovery methods based on config
    pub fn with_defaults(config: DiscoveryConfig) -> Self {
        let mut chain = Self::new(config.clone());

        // Always add direct discovery (highest priority)
        chain.add(Arc::new(DirectDiscovery::new()));

        // Add mDNS if enabled
        if config.mdns_enabled {
            chain.add(Arc::new(MdnsDiscovery::new(config.timeout)));
        }

        // Add STUN if servers configured
        if !config.stun_servers.is_empty() {
            chain.add(Arc::new(StunDiscovery::new(config.stun_servers.clone())));
        }

        // Add signal server if configured
        if let Some(ref signal_url) = config.signal_server {
            chain.add(Arc::new(SignalDiscovery::new(
                signal_url.clone(),
                config.timeout,
            )));
        }

        // Add relay as fallback (lowest priority) for guaranteed NAT traversal
        if config.relay_enabled {
            if let Some(ref signal_url) = config.signal_server {
                chain.add(Arc::new(RelayDiscovery::new(signal_url.clone())));
            }
        }

        chain
    }

    /// Add a discovery method to the chain
    pub fn add(&mut self, method: Arc<dyn Discovery>) {
        self.methods.push(method);
        // Keep sorted by priority (lower = first)
        self.methods.sort_by_key(|m| m.priority());
    }

    /// Get the configuration
    pub fn config(&self) -> &DiscoveryConfig {
        &self.config
    }

    /// Register as host on all applicable methods
    ///
    /// Returns after the first successful registration.
    pub async fn host(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Result<(), DiscoveryError> {
        let mut last_error = DiscoveryError::NotFound;
        let mut any_success = false;

        for method in &self.methods {
            debug!("Registering with {} discovery...", method.name());

            match method.host(join_code, port, cert_fingerprint).await {
                Ok(()) => {
                    info!("Registered with {} discovery", method.name());
                    any_success = true;
                }
                Err(DiscoveryError::UnsupportedMethod) => {
                    // Skip methods that don't support hosting
                    continue;
                }
                Err(e) => {
                    warn!("{} registration failed: {}", method.name(), e);
                    last_error = e;
                }
            }
        }

        if any_success {
            Ok(())
        } else {
            Err(last_error)
        }
    }

    /// Lookup peer using chain (tries methods until one succeeds)
    ///
    /// Methods are tried in priority order. The first successful
    /// lookup result is returned.
    pub async fn lookup(&self, target: &str) -> Result<DiscoveryResult, DiscoveryError> {
        self.lookup_with_progress(target, None).await
    }

    /// Lookup peer with progress callbacks for UI updates
    ///
    /// This method provides real-time feedback as it tries different
    /// discovery methods, making the user experience feel responsive.
    pub async fn lookup_with_progress(
        &self,
        target: &str,
        on_progress: Option<ProgressCallback>,
    ) -> Result<DiscoveryResult, DiscoveryError> {
        let start = Instant::now();
        let mut last_error = DiscoveryError::NotFound;

        // Filter methods that can handle this target
        let applicable_methods: Vec<_> = self.methods
            .iter()
            .filter(|m| m.can_handle(target))
            .collect();

        let total = applicable_methods.len();

        for (attempt, method) in applicable_methods.iter().enumerate() {
            // Notify progress
            if let Some(ref callback) = on_progress {
                callback(DiscoveryProgress::TryingMethod {
                    method: method.name(),
                    attempt: attempt + 1,
                    total,
                });
            }

            debug!("Trying {} discovery for '{}'...", method.name(), target);

            match method.lookup(target).await {
                Ok(result) => {
                    let duration_ms = start.elapsed().as_millis() as u64;

                    if let Some(ref callback) = on_progress {
                        callback(DiscoveryProgress::PeerFound {
                            method: method.name(),
                            addr: result.peer_addr.to_string(),
                        });
                    }

                    info!(
                        "Found peer via {}: {} (local: {}) in {}ms",
                        method.name(),
                        result.peer_addr,
                        result.is_local,
                        duration_ms
                    );
                    return Ok(result);
                }
                Err(e) => {
                    if let Some(ref callback) = on_progress {
                        callback(DiscoveryProgress::MethodFailed {
                            method: method.name(),
                            reason: e.to_string(),
                        });
                    }
                    debug!("{} discovery failed: {}", method.name(), e);
                    last_error = e;
                }
            }
        }

        Err(last_error)
    }

    /// Announce on all methods that support it
    ///
    /// Used when hosting to make ourselves discoverable via all
    /// available methods (mDNS broadcast, signal server registration, etc.)
    pub async fn announce_all(
        &self,
        join_code: &str,
        port: u16,
        cert_fingerprint: Option<CertFingerprint>,
    ) -> Vec<(&'static str, Result<(), DiscoveryError>)> {
        let mut results = Vec::new();

        for method in &self.methods {
            let result = method.announce(join_code, port, cert_fingerprint).await;
            if result.is_ok() {
                info!("Announced via {}", method.name());
            }
            results.push((method.name(), result));
        }

        results
    }

    /// Stop all announcements
    pub async fn unannounce_all(&self) {
        for method in &self.methods {
            let _ = method.unannounce().await;
        }
    }

    /// Get list of method names in priority order
    pub fn method_names(&self) -> Vec<&'static str> {
        self.methods.iter().map(|m| m.name()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_chain_has_methods() {
        let config = DiscoveryConfig::default();
        let chain = DiscoveryChain::with_defaults(config);

        let names = chain.method_names();
        assert!(names.contains(&"direct"));
        assert!(names.contains(&"mDNS"));
        assert!(names.contains(&"signal server"));
    }

    #[test]
    fn test_local_only_config() {
        let config = DiscoveryConfig::local_only();
        let chain = DiscoveryChain::with_defaults(config);

        let names = chain.method_names();
        assert!(names.contains(&"direct"));
        assert!(names.contains(&"mDNS"));
        assert!(!names.contains(&"signal server"));
    }

    #[test]
    fn test_direct_only_config() {
        let config = DiscoveryConfig::direct_only();
        let chain = DiscoveryChain::with_defaults(config);

        let names = chain.method_names();
        assert!(names.contains(&"direct"));
        assert!(!names.contains(&"mDNS"));
        assert!(!names.contains(&"signal server"));
    }
}
