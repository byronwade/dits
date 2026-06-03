//! FACR — Frame-Addressable Canonical Representation.
//!
//! Dits's canonical, content-addressed, frame-level representation for video and
//! photo. Instead of versioning the bytes an NLE emitted, FACR stores each frame as
//! an independently-decodable, content-addressed object and represents a clip as an
//! ordered manifest of frame references. This makes trims/reorders/grades dedup at
//! frame granularity and enables a true visual diff.
//!
//! See `docs/superpowers/specs/2026-06-02-facr-frame-addressable-video-design.md`.

pub mod codec;
pub mod diff;
pub mod edl;
pub mod otio;
pub mod edit;
pub mod manifest;
pub mod photo;
pub mod pipeline;
pub mod store;
pub mod video;

// Public API surface. Some items are consumed only by the library crate (this module is
// compiled into both the `dits` lib and bin), so allow unused re-exports in the bin.
#[allow(unused_imports)]
pub use codec::{DeflateRawCodec, FrameCodec, RawFrame};
#[allow(unused_imports)]
pub use diff::{diff_manifests, ClipDiff};
pub use edl::{build_manifest_from_edl, parse_cmx3600, EdlEvent};
pub use otio::parse_otio;
#[allow(unused_imports)]
pub use edit::trim;
#[allow(unused_imports)]
pub use manifest::{ClipManifest, FrameRef};
#[allow(unused_imports)]
pub use photo::{ingest_photo, render_photo, PhotoEdit, PhotoVersion};
#[allow(unused_imports)]
pub use pipeline::commit_clip;
#[allow(unused_imports)]
pub use store::FrameStore;
#[allow(unused_imports)]
pub use video::{ingest_video, reconstruct_video, source_has_audio, FrameImageCodec, VideoInfo};
