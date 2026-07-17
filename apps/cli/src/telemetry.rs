//! Opt-in telemetry for the Dits CLI.
//!
//! Telemetry is disabled by default. When enabled, Dits records only a small,
//! documented event schema: command name, argument count, coarse path/flag
//! indicators, CLI version, platform, and random installation/session IDs.
//! Argument values, file paths, repository names, usernames, machine IDs, and
//! file contents are never included.

use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::{global_config_path, Config};

const TELEMETRY_URL: &str = "https://telemetry.dits.dev/v1/events";
const TELEMETRY_CONFIG_KEY: &str = "telemetry.enabled";
const TELEMETRY_USER_ID_KEY: &str = "telemetry.user_id";
const TELEMETRY_LAST_SENT_KEY: &str = "telemetry.last_sent";
const TELEMETRY_SEND_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);
const TELEMETRY_BATCH_SIZE: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    /// Random installation identifier.
    pub user_id:    String,
    /// Event timestamp (Unix timestamp).
    pub timestamp:  u64,
    /// Event type.
    pub event_type: String,
    /// Event properties from the documented, privacy-limited schema.
    pub properties: HashMap<String, serde_json::Value>,
    /// Dits version.
    pub version:    String,
    /// Operating system and architecture.
    pub platform:   String,
    /// Random identifier scoped to this process.
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryConfig {
    pub enabled:   bool,
    pub user_id:   String,
    pub last_sent: u64,
}

impl Default for TelemetryConfig {
    fn default() -> Self {
        Self { enabled: false, user_id: String::new(), last_sent: 0 }
    }
}

pub struct TelemetryManager {
    config:     Arc<Mutex<Config>>,
    session_id: String,
    events:     Arc<Mutex<Vec<TelemetryEvent>>>,
}

impl TelemetryManager {
    pub fn new(config: Arc<Mutex<Config>>) -> Self {
        Self {
            config,
            session_id: generate_random_id(),
            events: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Check whether telemetry is explicitly enabled.
    pub async fn is_enabled(&self) -> bool {
        let config = self.config.lock().await;
        config
            .get(TELEMETRY_CONFIG_KEY)
            .and_then(|value| value.parse::<bool>().ok())
            .unwrap_or(false)
    }

    /// Enable telemetry and persist the choice.
    pub async fn enable(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().await;
        config.set(TELEMETRY_CONFIG_KEY, "true")?;
        config.save(&global_config_path())?;
        Ok(())
    }

    /// Disable telemetry and persist the choice.
    pub async fn disable(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().await;
        config.set(TELEMETRY_CONFIG_KEY, "false")?;
        config.save(&global_config_path())?;
        Ok(())
    }

    /// Return the current telemetry status without generating an identifier.
    pub async fn status(&self) -> Result<TelemetryConfig, Box<dyn std::error::Error>> {
        let config = self.config.lock().await;

        let enabled = config
            .get(TELEMETRY_CONFIG_KEY)
            .and_then(|value| value.parse::<bool>().ok())
            .unwrap_or(false);
        let user_id = config
            .get(TELEMETRY_USER_ID_KEY)
            .unwrap_or_default();
        let last_sent = config
            .get(TELEMETRY_LAST_SENT_KEY)
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);

        Ok(TelemetryConfig { enabled, user_id, last_sent })
    }

    /// Record a telemetry event.
    pub async fn record_event(
        &self,
        event_type: &str,
        properties: HashMap<String, serde_json::Value>,
    ) {
        if !self.is_enabled().await {
            return;
        }

        let event = TelemetryEvent {
            user_id: self.get_or_create_user_id().await,
            timestamp: unix_timestamp(),
            event_type: event_type.to_string(),
            properties,
            version: env!("CARGO_PKG_VERSION").to_string(),
            platform: get_platform_info(),
            session_id: self.session_id.clone(),
        };

        // Do not hold the event mutex while checking configuration or sending.
        // The previous implementation re-locked this mutex from send_events and
        // could deadlock on the first enabled event.
        let reached_batch_size = {
            let mut events = self.events.lock().await;
            events.push(event);
            events.len() >= TELEMETRY_BATCH_SIZE
        };

        if reached_batch_size || self.should_send().await {
            let _ = self.send_events().await;
        }
    }

    /// Schedule delivery of pending telemetry events.
    pub async fn send_events(&self) -> Result<(), Box<dyn std::error::Error>> {
        if !self.is_enabled().await {
            return Ok(());
        }

        // Move the queue out under the lock, then release it before
        // serialization, configuration I/O, or network work.
        let events_to_send = {
            let mut events = self.events.lock().await;
            if events.is_empty() {
                return Ok(());
            }
            std::mem::take(&mut *events)
        };

        let payload = serde_json::to_vec(&events_to_send)?;
        let client = reqwest::Client::new();

        tokio::spawn(async move {
            match client
                .post(TELEMETRY_URL)
                .header("Content-Type", "application/json")
                .body(payload)
                .timeout(Duration::from_secs(30))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {},
                Ok(response) => {
                    eprintln!("Telemetry endpoint returned HTTP {}", response.status());
                },
                Err(error) => {
                    eprintln!("Failed to send telemetry: {}", error);
                },
            }
        });

        // This timestamp means "batch scheduled", not confirmed delivery.
        let mut config = self.config.lock().await;
        config.set(TELEMETRY_LAST_SENT_KEY, &unix_timestamp().to_string())?;
        config.save(&global_config_path())?;

        Ok(())
    }

    async fn should_send(&self) -> bool {
        let config = self.config.lock().await;
        let last_sent = config
            .get(TELEMETRY_LAST_SENT_KEY)
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);

        unix_timestamp().saturating_sub(last_sent) >= TELEMETRY_SEND_INTERVAL.as_secs()
    }

    async fn get_or_create_user_id(&self) -> String {
        {
            let config = self.config.lock().await;
            if let Some(user_id) = config.get(TELEMETRY_USER_ID_KEY) {
                return user_id;
            }
        }

        let user_id = generate_random_id();
        let mut config = self.config.lock().await;

        // Another task may have generated an ID while this task waited for the
        // lock. Preserve the first persisted value.
        if let Some(existing) = config.get(TELEMETRY_USER_ID_KEY) {
            return existing;
        }

        if config.set(TELEMETRY_USER_ID_KEY, &user_id).is_ok() {
            let _ = config.save(&global_config_path());
        }

        user_id
    }
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn generate_random_id() -> String {
    Uuid::new_v4().simple().to_string()
}

fn get_platform_info() -> String {
    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
}

/// Privacy-limited event constructors.
pub mod events {
    use std::collections::HashMap;

    use super::*;

    pub async fn record_command_usage(
        telemetry: &TelemetryManager,
        command: &str,
        args: &[String],
    ) {
        let mut properties = HashMap::new();
        properties.insert("command".to_string(), command.into());
        properties.insert("arg_count".to_string(), args.len().into());
        properties.insert(
            "flag_count".to_string(),
            args.iter().filter(|argument| argument.starts_with('-')).count().into(),
        );
        properties.insert(
            "has_paths".to_string(),
            args.iter()
                .any(|argument| argument.contains('/') || argument.contains('\\'))
                .into(),
        );

        telemetry.record_event("command_used", properties).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_are_random_and_not_machine_derived() {
        let first = generate_random_id();
        let second = generate_random_id();

        assert_eq!(first.len(), 32);
        assert_eq!(second.len(), 32);
        assert_ne!(first, second);
    }

    #[tokio::test]
    async fn record_event_releases_the_queue_lock() {
        let mut config = Config::default();
        config.telemetry.enabled = true;
        config.telemetry.user_id = Some("test-user".to_string());
        config.telemetry.last_sent = unix_timestamp();

        let manager = TelemetryManager::new(Arc::new(Mutex::new(config)));
        manager.record_event("test", HashMap::new()).await;

        assert_eq!(manager.events.lock().await.len(), 1);
    }
}
