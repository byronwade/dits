//! CLI command implementations.

// Command categories
pub mod core;
pub mod branching;
pub mod repo;
pub mod fileops;
pub mod advanced;
pub mod special;

// Standalone commands (flat modules not yet folded into a category)
pub mod bisect;
pub mod blame;
pub mod cache_stats;
pub mod describe;
pub mod facr;
pub mod facr_demo;
pub mod grep;
pub mod inspect;
pub mod inspect_file;
pub mod roundtrip;
pub mod shortlog;

// Re-export all command functions
pub use core::*;
pub use branching::*;
pub use repo::*;
pub use fileops::*;
pub use advanced::*;
pub use special::*;

pub use bisect::bisect;
pub use blame::blame;
pub use cache_stats::cache_stats;
pub use facr::{facr_add, facr_checkout, facr_import_edl, facr_import_otio, facr_trim, photo_add, photo_edit, photo_render, PhotoEditArgs};
pub use facr_demo::facr_demo;
pub use inspect::inspect;
pub use inspect_file::inspect_file;
pub use roundtrip::roundtrip;
