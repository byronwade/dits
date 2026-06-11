//! Lifecycle management and storage tiering (Phase 8).
//!
//! This module provides:
//! - Temperature-based storage tiers (hot, warm, cold, archive)
//! - Chunk access tracking for intelligent tiering
//! - Freeze/thaw operations for archival storage
//! - Policy-based automatic tier transitions

mod manager;
mod policy;
mod tier;
mod tracker;

pub use manager::{FreezeResult, LifecycleManager, ThawResult, ThawStatus};
pub use policy::{LifecyclePolicy, PolicyRule, TierTransition};
pub use tier::{StorageTier, TierConfig, TierStats};
pub use tracker::{AccessRecord, AccessStats, AccessTracker};
