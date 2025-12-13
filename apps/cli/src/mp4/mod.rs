//! MP4/MOV structure-aware parsing for Dits.
//!
//! This module provides ISO Base Media File Format (ISOBMFF) parsing,
//! enabling structure-aware versioning that separates metadata from media data.

pub mod parser;
pub mod atoms;
pub mod offset_patcher;
pub mod deconstructor;
pub mod reconstructor;

pub use parser::{Mp4Parser, Mp4Structure, ParseError};
pub use atoms::{Atom, AtomType};
pub use offset_patcher::{OffsetPatcher, create_mdat_header};
pub use deconstructor::{Deconstructor, DeconstructedMp4};
pub use reconstructor::{Reconstructor, verify_mp4_structure};
