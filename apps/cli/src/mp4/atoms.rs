//! MP4 Atom definitions and utilities.
//!
//! MP4/MOV files are structured as a hierarchy of "atoms" (also called "boxes").
//! Each atom has a 4-byte size, 4-byte type tag, and optional payload.

use std::fmt;

/// Known atom types in ISOBMFF.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AtomType {
    /// File type compatibility atom (always first).
    Ftyp,
    /// Movie metadata container (contains all timing, track info).
    Moov,
    /// Media data container (actual video/audio bytes).
    Mdat,
    /// Free space (can be ignored/removed).
    Free,
    /// Skip atom (padding).
    Skip,
    /// Wide atom (64-bit size indicator).
    Wide,
    /// UUID extension atom.
    Uuid,
    /// Movie fragment (for fragmented MP4).
    Moof,
    /// Movie fragment random access.
    Mfra,
    /// Sample table (inside moov/trak/mdia/minf).
    Stbl,
    /// Chunk offset table (32-bit offsets).
    Stco,
    /// Chunk offset table (64-bit offsets).
    Co64,
    /// Track atom.
    Trak,
    /// Media atom.
    Mdia,
    /// Media information atom.
    Minf,
    /// Unknown atom type.
    Unknown([u8; 4]),
}

impl AtomType {
    /// Parse atom type from 4-byte tag.
    pub fn from_tag(tag: &[u8; 4]) -> Self {
        match tag {
            b"ftyp" => AtomType::Ftyp,
            b"moov" => AtomType::Moov,
            b"mdat" => AtomType::Mdat,
            b"free" => AtomType::Free,
            b"skip" => AtomType::Skip,
            b"wide" => AtomType::Wide,
            b"uuid" => AtomType::Uuid,
            b"moof" => AtomType::Moof,
            b"mfra" => AtomType::Mfra,
            b"stbl" => AtomType::Stbl,
            b"stco" => AtomType::Stco,
            b"co64" => AtomType::Co64,
            b"trak" => AtomType::Trak,
            b"mdia" => AtomType::Mdia,
            b"minf" => AtomType::Minf,
            _ => AtomType::Unknown(*tag),
        }
    }

    /// Convert atom type to 4-byte tag.
    pub fn to_tag(&self) -> [u8; 4] {
        match self {
            AtomType::Ftyp => *b"ftyp",
            AtomType::Moov => *b"moov",
            AtomType::Mdat => *b"mdat",
            AtomType::Free => *b"free",
            AtomType::Skip => *b"skip",
            AtomType::Wide => *b"wide",
            AtomType::Uuid => *b"uuid",
            AtomType::Moof => *b"moof",
            AtomType::Mfra => *b"mfra",
            AtomType::Stbl => *b"stbl",
            AtomType::Stco => *b"stco",
            AtomType::Co64 => *b"co64",
            AtomType::Trak => *b"trak",
            AtomType::Mdia => *b"mdia",
            AtomType::Minf => *b"minf",
            AtomType::Unknown(tag) => *tag,
        }
    }

    /// Check if this atom type is a container (has child atoms).
    pub fn is_container(&self) -> bool {
        matches!(
            self,
            AtomType::Moov
                | AtomType::Trak
                | AtomType::Mdia
                | AtomType::Minf
                | AtomType::Stbl
                | AtomType::Moof
        )
    }

    /// Get tag as string for display.
    pub fn tag_str(&self) -> String {
        let tag = self.to_tag();
        String::from_utf8_lossy(&tag).to_string()
    }

    /// Get tag as fourcc string (4 characters).
    /// For unknown atom types, this returns the actual tag as a string.
    pub fn as_fourcc(&self) -> String {
        match self {
            AtomType::Ftyp => "ftyp".to_string(),
            AtomType::Moov => "moov".to_string(),
            AtomType::Mdat => "mdat".to_string(),
            AtomType::Free => "free".to_string(),
            AtomType::Skip => "skip".to_string(),
            AtomType::Wide => "wide".to_string(),
            AtomType::Uuid => "uuid".to_string(),
            AtomType::Moof => "moof".to_string(),
            AtomType::Mfra => "mfra".to_string(),
            AtomType::Stbl => "stbl".to_string(),
            AtomType::Stco => "stco".to_string(),
            AtomType::Co64 => "co64".to_string(),
            AtomType::Trak => "trak".to_string(),
            AtomType::Mdia => "mdia".to_string(),
            AtomType::Minf => "minf".to_string(),
            AtomType::Unknown(tag) => String::from_utf8_lossy(tag).to_string(),
        }
    }

    /// Parse atom type from string.
    pub fn from_fourcc(s: &str) -> Self {
        match s {
            "ftyp" => AtomType::Ftyp,
            "moov" => AtomType::Moov,
            "mdat" => AtomType::Mdat,
            "free" => AtomType::Free,
            "skip" => AtomType::Skip,
            "wide" => AtomType::Wide,
            "uuid" => AtomType::Uuid,
            "moof" => AtomType::Moof,
            "mfra" => AtomType::Mfra,
            "stbl" => AtomType::Stbl,
            "stco" => AtomType::Stco,
            "co64" => AtomType::Co64,
            "trak" => AtomType::Trak,
            "mdia" => AtomType::Mdia,
            "minf" => AtomType::Minf,
            _ => {
                let mut tag = [0u8; 4];
                let bytes = s.as_bytes();
                for (i, byte) in bytes.iter().take(4).enumerate() {
                    tag[i] = *byte;
                }
                AtomType::Unknown(tag)
            }
        }
    }
}

impl fmt::Display for AtomType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.tag_str())
    }
}

/// Represents a single atom in an MP4 file.
#[derive(Debug, Clone)]
pub struct Atom {
    /// The type of this atom.
    pub atom_type: AtomType,
    /// Byte offset where this atom starts in the file.
    pub start: u64,
    /// Total length of the atom (including header).
    pub length: u64,
    /// Offset to the atom's data (after header).
    pub data_start: u64,
    /// Length of the atom's data (excluding header).
    pub data_length: u64,
    /// Child atoms (if this is a container).
    pub children: Vec<Atom>,
}

impl Atom {
    /// Create a new atom.
    pub fn new(atom_type: AtomType, start: u64, length: u64, header_size: u8) -> Self {
        let data_start = start + header_size as u64;
        let data_length = length.saturating_sub(header_size as u64);

        Self {
            atom_type,
            start,
            length,
            data_start,
            data_length,
            children: Vec::new(),
        }
    }

    /// Get the end position of this atom.
    pub fn end(&self) -> u64 {
        self.start + self.length
    }

    /// Check if this atom is a container.
    pub fn is_container(&self) -> bool {
        self.atom_type.is_container()
    }

    /// Find a child atom by type (recursive).
    pub fn find_child(&self, atom_type: AtomType) -> Option<&Atom> {
        for child in &self.children {
            if child.atom_type == atom_type {
                return Some(child);
            }
            if let Some(found) = child.find_child(atom_type) {
                return Some(found);
            }
        }
        None
    }

    /// Find all atoms of a given type (recursive).
    pub fn find_all(&self, atom_type: AtomType) -> Vec<&Atom> {
        let mut results = Vec::new();
        self.find_all_recursive(atom_type, &mut results);
        results
    }

    fn find_all_recursive<'a>(&'a self, atom_type: AtomType, results: &mut Vec<&'a Atom>) {
        if self.atom_type == atom_type {
            results.push(self);
        }
        for child in &self.children {
            child.find_all_recursive(atom_type, results);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_atom_type_roundtrip() {
        let types = [
            AtomType::Ftyp,
            AtomType::Moov,
            AtomType::Mdat,
            AtomType::Stco,
            AtomType::Co64,
        ];

        for t in types {
            let tag = t.to_tag();
            let parsed = AtomType::from_tag(&tag);
            assert_eq!(t, parsed);
        }
    }

    #[test]
    fn test_container_detection() {
        assert!(AtomType::Moov.is_container());
        assert!(AtomType::Trak.is_container());
        assert!(!AtomType::Mdat.is_container());
        assert!(!AtomType::Ftyp.is_container());
    }
}
