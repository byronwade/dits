//! Telemetry and analytics for Dits CLI
//!
//! This module provides opt-in telemetry for improving Dits.
//! All data is anonymized and respects user privacy.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::config::{Config, global_config_path};

const TELEMETRY_URL: &str = "https://telemetry.dits.dev/v1/events";
const TELEMETRY_CONFIG_KEY: &str = "telemetry.enabled";
const TELEMETRY_USER_ID_KEY: &str = "telemetry.user_id";
const TELEMETRY_LAST_SENT_KEY: &str = "telemetry.last_sent";
const TELEMETRY_SEND_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60); // 24 hours

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    /// Unique user identifier (anonymized)
    pub user_id: String,
    /// Event timestamp (Unix timestamp)
    pub timestamp: u64,
    /// Event type
    pub event_type: String,
    /// Event properties
    pub properties: HashMap<String, serde_json::Value>,
    /// Dits version
    pub version: String,
    /// Platform information
    pub platform: String,
    /// Anonymized session ID
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryConfig {
    pub enabled: bool,
    pub user_id: String,
    pub last_sent: u64,
}

impl Default for TelemetryConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            user_id: generate_user_id(),
            last_sent: 0,
        }
    }
}

pub struct TelemetryManager {
    config: Arc<Mutex<Config>>,
    session_id: String,
    events: Arc<Mutex<Vec<TelemetryEvent>>>,
}

impl TelemetryManager {
    pub fn new(config: Arc<Mutex<Config>>) -> Self {
        Self {
            config,
            session_id: generate_session_id(),
            events: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Check if telemetry is enabled
    pub async fn is_enabled(&self) -> bool {
        let config = self.config.lock().await;
        config.get(TELEMETRY_CONFIG_KEY)
            .and_then(|s| s.parse::<bool>().ok())
            .unwrap_or(false)
    }

    /// Enable telemetry
    pub async fn enable(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().await;
        config.set(TELEMETRY_CONFIG_KEY, "true")?;
        let config_path = global_config_path();
        config.save(&config_path)?;
        Ok(())
    }

    /// Disable telemetry
    pub async fn disable(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().await;
        config.set(TELEMETRY_CONFIG_KEY, "false")?;
        let config_path = global_config_path();
        config.save(&config_path)?;
        Ok(())
    }

    /// Get telemetry status
    pub async fn status(&self) -> Result<TelemetryConfig, Box<dyn std::error::Error>> {
        let config = self.config.lock().await;

        let enabled = config.get(TELEMETRY_CONFIG_KEY)
            .and_then(|s| s.parse::<bool>().ok())
            .unwrap_or(false);
        let user_id = config.get(TELEMETRY_USER_ID_KEY)
            .unwrap_or_else(|| generate_user_id());
        let last_sent = config.get(TELEMETRY_LAST_SENT_KEY)
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        Ok(TelemetryConfig {
            enabled,
            user_id,
            last_sent,
        })
    }

    /// Record a telemetry event
    pub async fn record_event(&self, event_type: &str, properties: HashMap<String, serde_json::Value>) {
        if !self.is_enabled().await {
            return;
        }

        let event = TelemetryEvent {
            user_id: self.get_user_id().await,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            event_type: event_type.to_string(),
            properties,
            version: env!("CARGO_PKG_VERSION").to_string(),
            platform: get_platform_info(),
            session_id: self.session_id.clone(),
        };

        let mut events = self.events.lock().await;
        events.push(event);

        // Auto-send if we have enough events or it's been a while
        if events.len() >= 10 || self.should_send().await {
            let _ = self.send_events().await;
        }
    }

    /// Send pending telemetry events
    pub async fn send_events(&self) -> Result<(), Box<dyn std::error::Error>> {
        if !self.is_enabled().await {
            return Ok(());
        }

        let mut events = self.events.lock().await;
        if events.is_empty() {
            return Ok(());
        }

        let events_to_send = events.clone();
        events.clear();

        // Send in background to avoid blocking CLI
        let client = reqwest::Client::new();
        let payload = serde_json::to_string(&events_to_send)?;

        tokio::spawn(async move {
            match client
                .post(TELEMETRY_URL)
                .header("Content-Type", "application/json")
                .body(payload)
                .timeout(Duration::from_secs(30))
                .send()
                .await
            {
                Ok(_) => {
                    // Successfully sent
                }
                Err(e) => {
                    // Failed to send - could log to file or retry later
                    eprintln!("Failed to send telemetry: {}", e);
                }
            }
        });

        // Update last sent timestamp
        let mut config = self.config.lock().await;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        config.set(TELEMETRY_LAST_SENT_KEY, &now.to_string())?;
        let config_path = global_config_path();
        config.save(&config_path)?;

        Ok(())
    }

    /// Check if we should send telemetry events
    async fn should_send(&self) -> bool {
        let config = self.config.lock().await;
        let last_sent = config.get(TELEMETRY_LAST_SENT_KEY)
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        now - last_sent >= TELEMETRY_SEND_INTERVAL.as_secs()
    }

    /// Get or create user ID
    async fn get_user_id(&self) -> String {
        let config = self.config.lock().await;
        if let Some(user_id) = config.get(TELEMETRY_USER_ID_KEY) {
            return user_id;
        }

        // Generate and save new user ID
        drop(config);
        let user_id = generate_user_id();
        let mut config = self.config.lock().await;
        let _ = config.set(TELEMETRY_USER_ID_KEY, &user_id);
        let config_path = global_config_path();
        let _ = config.save(&config_path);
        user_id
    }
}

/// Generate an anonymized user ID
fn generate_user_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();

    // Use system-specific info that's consistent but not personally identifiable
    #[cfg(target_os = "linux")]
    {
        if let Ok(info) = std::fs::read("/etc/machine-id") {
            info.hash(&mut hasher);
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("ioreg")
            .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                stdout.hash(&mut hasher);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("wmic")
            .args(&["csproduct", "get", "uuid"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                stdout.hash(&mut hasher);
            }
        }
    }

    // Add some randomness to avoid collisions
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
        .hash(&mut hasher);

    format!("{:x}", hasher.finish())
}

/// Generate a session ID
fn generate_session_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:x}", rng.gen::<u64>())
}

/// Get platform information
fn get_platform_info() -> String {
    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
}

/// Record common telemetry events
pub mod events {
    use super::*;
    use std::collections::HashMap;

    pub async fn record_command_usage(telemetry: &TelemetryManager, command: &str, args: &[String]) {
        let mut properties = HashMap::new();
        properties.insert("command".to_string(), command.into());
        properties.insert("arg_count".to_string(), args.len().into());

        // Anonymize arguments (don't send actual file paths, etc.)
        properties.insert("has_paths".to_string(),
            args.iter().any(|arg| arg.contains('/') || arg.contains('\\')).into());

        telemetry.record_event("command_used", properties).await;
    }

    pub async fn record_error(telemetry: &TelemetryManager, error_type: &str, context: &str) {
        let mut properties = HashMap::new();
        properties.insert("error_type".to_string(), error_type.into());
        properties.insert("context".to_string(), context.into());

        telemetry.record_event("error_occurred", properties).await;
    }

    pub async fn record_performance(telemetry: &TelemetryManager, operation: &str, duration_ms: u64, file_size: Option<u64>) {
        let mut properties = HashMap::new();
        properties.insert("operation".to_string(), operation.into());
        properties.insert("duration_ms".to_string(), duration_ms.into());
        if let Some(size) = file_size {
            properties.insert("file_size".to_string(), size.into());
        }

        telemetry.record_event("performance_metric", properties).await;
    }

    pub async fn record_feature_usage(telemetry: &TelemetryManager, feature: &str, details: HashMap<String, serde_json::Value>) {
        telemetry.record_event(&format!("feature_{}", feature), details).await;
    }
}

