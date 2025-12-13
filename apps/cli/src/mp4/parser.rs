//! MP4 file parser - the "X-Ray" that maps atom structure.
//!
//! Parses ISO Base Media File Format (ISOBMFF) files to extract
//! structural information without loading entire file into memory.

use super::atoms::{Atom, AtomType};
use byteorder::{BigEndian, ReadBytesExt};
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;
use thiserror::Error;

/// Errors that can occur during MP4 parsing.
#[derive(Error, Debug)]
pub enum ParseError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Invalid atom size at offset {offset}: size={size}")]
    InvalidAtomSize { offset: u64, size: u64 },

    #[error("File too small to be valid MP4")]
    FileTooSmall,

    #[error("Not an MP4 file (missing ftyp atom)")]
    NotMp4,

    #[error("Unsupported: fragmented MP4 (moof atom found)")]
    FragmentedMp4,

    #[error("Missing required atom: {0}")]
    MissingAtom(String),
}

/// Parsed MP4 structure with key atoms identified.
#[derive(Debug)]
pub struct Mp4Structure {
    /// File type atom (always first).
    pub ftyp: Atom,
    /// Movie metadata atom.
    pub moov: Atom,
    /// Media data atom.
    pub mdat: Atom,
    /// All top-level atoms in order.
    pub atoms: Vec<Atom>,
    /// Total file size.
    pub file_size: u64,
    /// Whether moov comes before mdat (fast-start).
    pub is_fast_start: bool,
    /// Locations of stco atoms (32-bit chunk offsets).
    pub stco_locations: Vec<StcoLocation>,
    /// Locations of co64 atoms (64-bit chunk offsets).
    pub co64_locations: Vec<Co64Location>,
}

/// Location of an stco atom for offset patching.
#[derive(Debug, Clone)]
pub struct StcoLocation {
    /// Offset in file where stco data starts (after version/flags/count).
    pub data_offset: u64,
    /// Number of entries in the table.
    pub entry_count: u32,
}

/// Location of a co64 atom for offset patching.
#[derive(Debug, Clone)]
pub struct Co64Location {
    /// Offset in file where co64 data starts (after version/flags/count).
    pub data_offset: u64,
    /// Number of entries in the table.
    pub entry_count: u32,
}

/// MP4 parser that extracts structure without loading media data.
pub struct Mp4Parser;

impl Mp4Parser {
    /// Parse an MP4 file and extract its structure.
    pub fn parse<P: AsRef<Path>>(path: P) -> Result<Mp4Structure, ParseError> {
        let mut file = File::open(path.as_ref())?;
        let file_size = file.metadata()?.len();

        if file_size < 8 {
            return Err(ParseError::FileTooSmall);
        }

        // Parse all top-level atoms
        let atoms = Self::parse_atoms(&mut file, 0, file_size)?;

        // Find required atoms
        let ftyp = atoms
            .iter()
            .find(|a| a.atom_type == AtomType::Ftyp)
            .cloned()
            .ok_or(ParseError::NotMp4)?;

        let moov = atoms
            .iter()
            .find(|a| a.atom_type == AtomType::Moov)
            .cloned()
            .ok_or_else(|| ParseError::MissingAtom("moov".to_string()))?;

        let mdat = atoms
            .iter()
            .find(|a| a.atom_type == AtomType::Mdat)
            .cloned()
            .ok_or_else(|| ParseError::MissingAtom("mdat".to_string()))?;

        // Check for fragmented MP4 (not supported in Phase 2)
        if atoms.iter().any(|a| a.atom_type == AtomType::Moof) {
            return Err(ParseError::FragmentedMp4);
        }

        // Determine if fast-start (moov before mdat)
        let is_fast_start = moov.start < mdat.start;

        // Find all stco and co64 atoms within moov
        let (stco_locations, co64_locations) =
            Self::find_offset_tables(&mut file, &moov)?;

        Ok(Mp4Structure {
            ftyp,
            moov,
            mdat,
            atoms,
            file_size,
            is_fast_start,
            stco_locations,
            co64_locations,
        })
    }

    /// Parse atoms within a range of the file.
    fn parse_atoms(
        file: &mut File,
        start: u64,
        end: u64,
    ) -> Result<Vec<Atom>, ParseError> {
        let mut atoms = Vec::new();
        let mut pos = start;

        file.seek(SeekFrom::Start(pos))?;

        while pos < end {
            // Read atom header (size + type)
            let size = match file.read_u32::<BigEndian>() {
                Ok(s) => s as u64,
                Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => break,
                Err(e) => return Err(e.into()),
            };

            let mut tag = [0u8; 4];
            file.read_exact(&mut tag)?;

            let (actual_size, header_size) = if size == 1 {
                // Extended size (64-bit)
                let extended_size = file.read_u64::<BigEndian>()?;
                (extended_size, 16u8)
            } else if size == 0 {
                // Atom extends to end of file
                (end - pos, 8u8)
            } else {
                (size, 8u8)
            };

            // Validate size
            if actual_size < header_size as u64 || pos + actual_size > end {
                return Err(ParseError::InvalidAtomSize {
                    offset: pos,
                    size: actual_size,
                });
            }

            let atom_type = AtomType::from_tag(&tag);
            let mut atom = Atom::new(atom_type, pos, actual_size, header_size);

            // Parse children for container atoms (except mdat)
            if atom.is_container() {
                let children_start = pos + header_size as u64;
                let children_end = pos + actual_size;
                file.seek(SeekFrom::Start(children_start))?;
                atom.children = Self::parse_atoms(file, children_start, children_end)?;
            }

            // Move to next atom
            pos += actual_size;
            file.seek(SeekFrom::Start(pos))?;

            atoms.push(atom);
        }

        Ok(atoms)
    }

    /// Find all stco and co64 atoms within moov for offset patching.
    fn find_offset_tables(
        file: &mut File,
        moov: &Atom,
    ) -> Result<(Vec<StcoLocation>, Vec<Co64Location>), ParseError> {
        let mut stco_locations = Vec::new();
        let mut co64_locations = Vec::new();

        // Find all stco atoms
        let stco_atoms = moov.find_all(AtomType::Stco);
        for stco in stco_atoms {
            // stco format: version(1) + flags(3) + entry_count(4) + entries(4*n)
            file.seek(SeekFrom::Start(stco.data_start))?;
            let _version = file.read_u8()?;
            let mut flags = [0u8; 3];
            file.read_exact(&mut flags)?;
            let entry_count = file.read_u32::<BigEndian>()?;

            stco_locations.push(StcoLocation {
                data_offset: stco.data_start + 8, // After version/flags/count
                entry_count,
            });
        }

        // Find all co64 atoms
        let co64_atoms = moov.find_all(AtomType::Co64);
        for co64 in co64_atoms {
            // co64 format: version(1) + flags(3) + entry_count(4) + entries(8*n)
            file.seek(SeekFrom::Start(co64.data_start))?;
            let _version = file.read_u8()?;
            let mut flags = [0u8; 3];
            file.read_exact(&mut flags)?;
            let entry_count = file.read_u32::<BigEndian>()?;

            co64_locations.push(Co64Location {
                data_offset: co64.data_start + 8, // After version/flags/count
                entry_count,
            });
        }

        Ok((stco_locations, co64_locations))
    }
}

impl Mp4Structure {
    /// Get the offset where mdat data actually starts (after header).
    pub fn mdat_data_start(&self) -> u64 {
        self.mdat.data_start
    }

    /// Get the size of the mdat data (excluding header).
    pub fn mdat_data_size(&self) -> u64 {
        self.mdat.data_length
    }

    /// Calculate the offset delta if moov were moved to a new position.
    /// This is used to patch stco/co64 tables.
    pub fn calculate_offset_delta(&self, new_moov_size: u64) -> i64 {
        if self.is_fast_start {
            // moov is before mdat, changing moov size shifts mdat
            let old_mdat_start = self.mdat.start;
            let new_mdat_start = self.moov.start + new_moov_size;
            new_mdat_start as i64 - old_mdat_start as i64
        } else {
            // moov is after mdat, no offset change needed
            0
        }
    }

    /// Check if offset patching is needed for this file.
    pub fn needs_offset_patching(&self) -> bool {
        self.is_fast_start && (!self.stco_locations.is_empty() || !self.co64_locations.is_empty())
    }

    /// Print a summary of the structure.
    pub fn summary(&self) -> String {
        let mut s = String::new();
        s.push_str(&format!("File size: {} bytes\n", self.file_size));
        s.push_str(&format!(
            "Layout: {} (moov {} mdat)\n",
            if self.is_fast_start {
                "fast-start"
            } else {
                "standard"
            },
            if self.is_fast_start { "before" } else { "after" }
        ));
        s.push_str(&format!(
            "ftyp: {} bytes at offset {}\n",
            self.ftyp.length, self.ftyp.start
        ));
        s.push_str(&format!(
            "moov: {} bytes at offset {}\n",
            self.moov.length, self.moov.start
        ));
        s.push_str(&format!(
            "mdat: {} bytes at offset {}\n",
            self.mdat.length, self.mdat.start
        ));
        s.push_str(&format!("stco tables: {}\n", self.stco_locations.len()));
        s.push_str(&format!("co64 tables: {}\n", self.co64_locations.len()));
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_atom_header_parsing() {
        // This would need a test MP4 file
        // For now, just verify the parser compiles
    }
}
