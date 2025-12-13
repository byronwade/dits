//! Proxy generation and management (Phase 6).
//!
//! This module provides functionality for generating lightweight proxy files
//! from high-resolution video assets. Proxies enable editing workflows over
//! slow network connections while maintaining frame-accurate timecode.
//!
//! Key features:
//! - FFmpeg-based proxy generation (1080p, 720p)
//! - Timecode preservation for NLE compatibility
//! - Thumbnail and sprite generation
//! - Dual-stream checkout (proxy vs master)

mod config;
mod generator;
mod store;
mod variant;

pub use config::{ProxyConfig, ProxyCodec, ProxyResolution};
pub use generator::{ProxyGenerator, ProxyResult, GenerationError};
pub use store::ProxyStore;
pub use variant::{ProxyVariant, VariantType};
