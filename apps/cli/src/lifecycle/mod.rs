//! Lifecycle management and storage tiering (Phase 8).
//!
//! This module provides:
//! - Temperature-based storage tiers (hot, warm, cold, archive)
//! - Chunk access tracking for intelligent tiering
//! - Freeze/thaw operations for archival storage
//! - Policy-based automatic tier transitions

mod tier;
mod tracker;
mod policy;
mod manager;

pub use tier::{StorageTier, TierConfig, TierStats};
pub use tracker::{AccessTracker, AccessRecord, AccessStats};
pub use policy::{LifecyclePolicy, PolicyRule, TierTransition};
pub use manager::{LifecycleManager, FreezeResult, ThawResult, ThawStatus};
