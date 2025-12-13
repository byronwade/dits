//! Storage tier definitions and configuration.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::path::PathBuf;

/// Storage temperature tier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageTier {
    /// Hot: actively editing, instant access (NVMe/SSD).
    Hot,
    /// Warm: recently used (≤30 days), fast access.
    Warm,
    /// Cold: idle (6+ months), slower but still online.
    Cold,
    /// Archive: deep storage (2+ years), requires thaw.
    Archive,
}

impl StorageTier {
    /// Get tier from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "hot" => Some(Self::Hot),
            "warm" => Some(Self::Warm),
            "cold" => Some(Self::Cold),
            "archive" | "deep" => Some(Self::Archive),
            _ => None,
        }
    }

    /// Get tier name.
    pub fn name(&self) -> &'static str {
        match self {
            Self::Hot => "hot",
            Self::Warm => "warm",
            Self::Cold => "cold",
            Self::Archive => "archive",
        }
    }

    /// Check if tier requires thaw before access.
    pub fn requires_thaw(&self) -> bool {
        matches!(self, Self::Archive)
    }

    /// Get expected retrieval latency description.
    pub fn latency_description(&self) -> &'static str {
        match self {
            Self::Hot => "instant (<100ms)",
            Self::Warm => "fast (<1s)",
            Self::Cold => "moderate (seconds)",
            Self::Archive => "slow (requires thaw, minutes to hours)",
        }
    }

    /// Get relative storage cost (1.0 = hot baseline).
    pub fn relative_cost(&self) -> f64 {
        match self {
            Self::Hot => 1.0,
            Self::Warm => 0.5,
            Self::Cold => 0.17,
            Self::Archive => 0.04,
        }
    }

    /// Get all tiers in order from hottest to coldest.
    pub fn all_tiers() -> &'static [StorageTier] {
        &[Self::Hot, Self::Warm, Self::Cold, Self::Archive]
    }

    /// Get the next colder tier (if any).
    pub fn colder(&self) -> Option<Self> {
        match self {
            Self::Hot => Some(Self::Warm),
            Self::Warm => Some(Self::Cold),
            Self::Cold => Some(Self::Archive),
            Self::Archive => None,
        }
    }

    /// Get the next warmer tier (if any).
    pub fn warmer(&self) -> Option<Self> {
        match self {
            Self::Hot => None,
            Self::Warm => Some(Self::Hot),
            Self::Cold => Some(Self::Warm),
            Self::Archive => Some(Self::Cold),
        }
    }
}

impl fmt::Display for StorageTier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

impl Default for StorageTier {
    fn default() -> Self {
        Self::Hot
    }
}

/// Configuration for a storage tier.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierConfig {
    /// The tier this config applies to.
    pub tier: StorageTier,
    /// Base path for this tier's storage.
    pub path: PathBuf,
    /// Maximum size in bytes (0 = unlimited).
    pub max_size: u64,
    /// Whether this tier is enabled.
    pub enabled: bool,
    /// Days of inactivity before transition to colder tier.
    pub transition_days: Option<u32>,
}

impl TierConfig {
    /// Create a new tier config.
    pub fn new(tier: StorageTier, path: PathBuf) -> Self {
        let transition_days = match tier {
            StorageTier::Hot => Some(30),      // Move to warm after 30 days
            StorageTier::Warm => Some(180),    // Move to cold after 6 months
            StorageTier::Cold => Some(730),    // Move to archive after 2 years
            StorageTier::Archive => None,      // Final tier
        };

        Self {
            tier,
            path,
            max_size: 0,
            enabled: true,
            transition_days,
        }
    }

    /// Create default tier configs for a repository.
    pub fn default_configs(dits_dir: &std::path::Path) -> Vec<TierConfig> {
        vec![
            TierConfig::new(StorageTier::Hot, dits_dir.join("objects")),
            TierConfig::new(StorageTier::Warm, dits_dir.join("warm")),
            TierConfig::new(StorageTier::Cold, dits_dir.join("cold")),
            TierConfig::new(StorageTier::Archive, dits_dir.join("archive")),
        ]
    }
}

/// Statistics for a storage tier.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TierStats {
    /// Number of chunks in this tier.
    pub chunk_count: u64,
    /// Total size in bytes.
    pub total_size: u64,
    /// Number of unique files referencing these chunks.
    pub file_count: u64,
    /// Oldest chunk age in days.
    pub oldest_days: u32,
    /// Newest chunk age in days.
    pub newest_days: u32,
    /// Average chunk age in days.
    pub average_days: f64,
}

impl TierStats {
    /// Format size as human-readable string.
    pub fn formatted_size(&self) -> String {
        format_bytes(self.total_size)
    }
}

/// Format bytes as human-readable string.
fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.2} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tier_ordering() {
        assert_eq!(StorageTier::Hot.colder(), Some(StorageTier::Warm));
        assert_eq!(StorageTier::Warm.colder(), Some(StorageTier::Cold));
        assert_eq!(StorageTier::Cold.colder(), Some(StorageTier::Archive));
        assert_eq!(StorageTier::Archive.colder(), None);

        assert_eq!(StorageTier::Archive.warmer(), Some(StorageTier::Cold));
        assert_eq!(StorageTier::Cold.warmer(), Some(StorageTier::Warm));
        assert_eq!(StorageTier::Warm.warmer(), Some(StorageTier::Hot));
        assert_eq!(StorageTier::Hot.warmer(), None);
    }

    #[test]
    fn test_tier_requires_thaw() {
        assert!(!StorageTier::Hot.requires_thaw());
        assert!(!StorageTier::Warm.requires_thaw());
        assert!(!StorageTier::Cold.requires_thaw());
        assert!(StorageTier::Archive.requires_thaw());
    }

    #[test]
    fn test_tier_from_str() {
        assert_eq!(StorageTier::from_str("hot"), Some(StorageTier::Hot));
        assert_eq!(StorageTier::from_str("WARM"), Some(StorageTier::Warm));
        assert_eq!(StorageTier::from_str("Cold"), Some(StorageTier::Cold));
        assert_eq!(StorageTier::from_str("archive"), Some(StorageTier::Archive));
        assert_eq!(StorageTier::from_str("deep"), Some(StorageTier::Archive));
        assert_eq!(StorageTier::from_str("invalid"), None);
    }
}
