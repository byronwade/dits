//! Lifecycle policies for automatic tier transitions.

use super::tier::StorageTier;
use super::tracker::AccessRecord;
use serde::{Deserialize, Serialize};

/// A lifecycle policy defining tier transition rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecyclePolicy {
    /// Policy name.
    pub name: String,
    /// Policy rules (evaluated in order).
    pub rules: Vec<PolicyRule>,
    /// Whether this policy is enabled.
    pub enabled: bool,
}

impl LifecyclePolicy {
    /// Create a new lifecycle policy.
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            rules: Vec::new(),
            enabled: true,
        }
    }

    /// Add a rule to the policy.
    pub fn with_rule(mut self, rule: PolicyRule) -> Self {
        self.rules.push(rule);
        self
    }

    /// Create the default lifecycle policy.
    pub fn default_policy() -> Self {
        Self::new("default")
            // Hot -> Warm after 30 days of inactivity
            .with_rule(PolicyRule {
                name: "hot-to-warm".to_string(),
                from_tier: StorageTier::Hot,
                to_tier: StorageTier::Warm,
                condition: TransitionCondition::InactiveDays(30),
                exclude_protected: true,
            })
            // Warm -> Cold after 180 days of inactivity
            .with_rule(PolicyRule {
                name: "warm-to-cold".to_string(),
                from_tier: StorageTier::Warm,
                to_tier: StorageTier::Cold,
                condition: TransitionCondition::InactiveDays(180),
                exclude_protected: true,
            })
            // Cold -> Archive after 730 days (2 years) of inactivity
            .with_rule(PolicyRule {
                name: "cold-to-archive".to_string(),
                from_tier: StorageTier::Cold,
                to_tier: StorageTier::Archive,
                condition: TransitionCondition::InactiveDays(730),
                exclude_protected: true,
            })
    }

    /// Create an aggressive policy (faster transitions).
    pub fn aggressive_policy() -> Self {
        Self::new("aggressive")
            .with_rule(PolicyRule {
                name: "hot-to-warm".to_string(),
                from_tier: StorageTier::Hot,
                to_tier: StorageTier::Warm,
                condition: TransitionCondition::InactiveDays(7),
                exclude_protected: true,
            })
            .with_rule(PolicyRule {
                name: "warm-to-cold".to_string(),
                from_tier: StorageTier::Warm,
                to_tier: StorageTier::Cold,
                condition: TransitionCondition::InactiveDays(30),
                exclude_protected: true,
            })
            .with_rule(PolicyRule {
                name: "cold-to-archive".to_string(),
                from_tier: StorageTier::Cold,
                to_tier: StorageTier::Archive,
                condition: TransitionCondition::InactiveDays(90),
                exclude_protected: true,
            })
    }

    /// Create a conservative policy (slower transitions).
    pub fn conservative_policy() -> Self {
        Self::new("conservative")
            .with_rule(PolicyRule {
                name: "hot-to-warm".to_string(),
                from_tier: StorageTier::Hot,
                to_tier: StorageTier::Warm,
                condition: TransitionCondition::InactiveDays(90),
                exclude_protected: true,
            })
            .with_rule(PolicyRule {
                name: "warm-to-cold".to_string(),
                from_tier: StorageTier::Warm,
                to_tier: StorageTier::Cold,
                condition: TransitionCondition::InactiveDays(365),
                exclude_protected: true,
            })
            .with_rule(PolicyRule {
                name: "cold-to-archive".to_string(),
                from_tier: StorageTier::Cold,
                to_tier: StorageTier::Archive,
                condition: TransitionCondition::InactiveDays(1095), // 3 years
                exclude_protected: true,
            })
    }

    /// Evaluate the policy for a chunk and return the recommended transition.
    pub fn evaluate(&self, record: &AccessRecord) -> Option<TierTransition> {
        if !self.enabled {
            return None;
        }

        for rule in &self.rules {
            if let Some(transition) = rule.evaluate(record) {
                return Some(transition);
            }
        }

        None
    }

    /// Get all transitions recommended by this policy.
    pub fn evaluate_all<'a>(&self, records: impl Iterator<Item = &'a AccessRecord>) -> Vec<TierTransition> {
        records
            .filter_map(|r| self.evaluate(r))
            .collect()
    }
}

impl Default for LifecyclePolicy {
    fn default() -> Self {
        Self::default_policy()
    }
}

/// A single rule in a lifecycle policy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    /// Rule name for logging/display.
    pub name: String,
    /// Source tier.
    pub from_tier: StorageTier,
    /// Destination tier.
    pub to_tier: StorageTier,
    /// Condition for transition.
    pub condition: TransitionCondition,
    /// Whether to exclude protected chunks (proxies, manifests).
    pub exclude_protected: bool,
}

impl PolicyRule {
    /// Evaluate this rule for a chunk.
    pub fn evaluate(&self, record: &AccessRecord) -> Option<TierTransition> {
        // Check tier matches
        if record.tier != self.from_tier {
            return None;
        }

        // Check protected status
        if self.exclude_protected && record.is_protected() {
            return None;
        }

        // Check condition
        if !self.condition.is_met(record) {
            return None;
        }

        Some(TierTransition {
            hash: record.hash,
            from_tier: self.from_tier,
            to_tier: self.to_tier,
            reason: self.name.clone(),
            size: record.size,
        })
    }
}

/// Condition for tier transition.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum TransitionCondition {
    /// Chunk hasn't been accessed in N days.
    InactiveDays(u32),
    /// Chunk is older than N days.
    AgeDays(u32),
    /// Chunk has been accessed fewer than N times.
    AccessCountBelow(u64),
    /// Always transition (manual).
    Always,
}

impl TransitionCondition {
    /// Check if the condition is met.
    pub fn is_met(&self, record: &AccessRecord) -> bool {
        match self {
            Self::InactiveDays(days) => record.days_since_access() >= *days,
            Self::AgeDays(days) => record.age_days() >= *days,
            Self::AccessCountBelow(count) => record.access_count < *count,
            Self::Always => true,
        }
    }

    /// Get a human-readable description.
    pub fn description(&self) -> String {
        match self {
            Self::InactiveDays(days) => format!("inactive for {} days", days),
            Self::AgeDays(days) => format!("older than {} days", days),
            Self::AccessCountBelow(count) => format!("accessed fewer than {} times", count),
            Self::Always => "manual transition".to_string(),
        }
    }
}

/// A recommended tier transition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierTransition {
    /// Chunk hash.
    pub hash: crate::core::Hash,
    /// Current tier.
    pub from_tier: StorageTier,
    /// Target tier.
    pub to_tier: StorageTier,
    /// Reason/rule name.
    pub reason: String,
    /// Chunk size in bytes.
    pub size: u64,
}

impl TierTransition {
    /// Get estimated cost savings (relative units per month).
    pub fn estimated_savings(&self) -> f64 {
        let from_cost = self.from_tier.relative_cost();
        let to_cost = self.to_tier.relative_cost();
        let size_gb = self.size as f64 / (1024.0 * 1024.0 * 1024.0);
        (from_cost - to_cost) * size_gb
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hash;

    fn make_record(days_inactive: u32, tier: StorageTier) -> AccessRecord {
        let hash = Hash::from_hex("a".repeat(64).as_str()).unwrap();
        let mut record = AccessRecord::new(hash, 1024 * 1024);
        record.tier = tier;
        // Backdate the last access
        record.last_accessed = record.last_accessed - (days_inactive as u64 * 86400);
        record
    }

    #[test]
    fn test_policy_evaluation() {
        let policy = LifecyclePolicy::default_policy();

        // Hot chunk inactive for 31 days should transition to warm
        let record = make_record(31, StorageTier::Hot);
        let transition = policy.evaluate(&record);
        assert!(transition.is_some());
        let t = transition.unwrap();
        assert_eq!(t.from_tier, StorageTier::Hot);
        assert_eq!(t.to_tier, StorageTier::Warm);

        // Hot chunk inactive for 29 days should stay
        let record = make_record(29, StorageTier::Hot);
        assert!(policy.evaluate(&record).is_none());
    }

    #[test]
    fn test_protected_chunks() {
        let policy = LifecyclePolicy::default_policy();

        // Protected chunk should not transition
        let mut record = make_record(100, StorageTier::Hot);
        record.is_proxy = true;
        assert!(policy.evaluate(&record).is_none());
    }

    #[test]
    fn test_aggressive_policy() {
        let policy = LifecyclePolicy::aggressive_policy();

        // Should transition to warm after just 7 days
        let record = make_record(8, StorageTier::Hot);
        let transition = policy.evaluate(&record);
        assert!(transition.is_some());
    }
}
