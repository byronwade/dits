//! MP4/MOV structure-aware parsing for Dits.
//!
//! This module provides ISO Base Media File Format (ISOBMFF) parsing,
//! enabling structure-aware versioning that separates metadata from media data.

pub mod parser;
pub mod atoms;
pub mod offset_patcher;
pub mod deconstructor;
pub mod reconstructor;

#[allow(unused_imports)]
pub use {
    atoms::{Atom, AtomType},
    deconstructor::{DeconstructedMp4, Deconstructor},
    offset_patcher::{create_mdat_header, OffsetPatcher},
    parser::{Mp4Parser, Mp4Structure, ParseError},
    reconstructor::{verify_mp4_structure, Reconstructor},
};
