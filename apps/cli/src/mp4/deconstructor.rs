//! MP4 Deconstructor - splits MP4 into metadata and media components.
//!
//! This separates the moov (metadata) from mdat (media data) for
//! efficient versioning. Metadata changes can be stored separately
//! without re-chunking the entire media data.

use super::atoms::AtomType;
use super::offset_patcher::read_moov_data;
use super::parser::{Mp4Parser, Mp4Structure, ParseError};
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;
use thiserror::Error;

/// Errors during deconstruction.
#[derive(Error, Debug)]
pub enum DeconstructError {
    #[error("Parse error: {0}")]
    Parse(#[from] ParseError),

    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Patch error: {0}")]
    Patch(#[from] super::offset_patcher::PatchError),
}

/// Result of deconstructing an MP4 file.
#[derive(Debug)]
pub struct DeconstructedMp4 {
    /// Original file structure info.
    pub structure: Mp4Structure,
    /// ftyp atom data (file type).
    pub ftyp_data: Vec<u8>,
    /// Normalized moov data (offsets relative to mdat start).
    pub moov_data: Vec<u8>,
    /// Other atoms (uuid, free, etc.) - stored but not modified.
    pub other_atoms: Vec<(AtomType, Vec<u8>)>,
    /// mdat header (we store this separately from data).
    pub mdat_header: Vec<u8>,
    /// Offset where mdat data starts in original file.
    pub mdat_data_offset: u64,
    /// Size of mdat data (for streaming/chunking).
    pub mdat_data_size: u64,
}

/// MP4 Deconstructor that splits files into components.
pub struct Deconstructor;

impl Deconstructor {
    /// Deconstruct an MP4 file into its components.
    ///
    /// This extracts:
    /// - ftyp (file type)
    /// - moov (metadata, with offsets normalized)
    /// - mdat info (for chunking separately)
    /// - other atoms (uuid, free, etc.)
    pub fn deconstruct<P: AsRef<Path>>(path: P) -> Result<DeconstructedMp4, DeconstructError> {
        let path = path.as_ref();
        let structure = Mp4Parser::parse(path)?;
        let mut file = File::open(path)?;

        // Read ftyp
        let mut ftyp_data = vec![0u8; structure.ftyp.length as usize];
        file.seek(SeekFrom::Start(structure.ftyp.start))?;
        file.read_exact(&mut ftyp_data)?;

        // Read moov and normalize offsets
        let mut moov_data = read_moov_data(&mut file, &structure)?;

        // Normalize offsets (make them relative to mdat data start = 0)
        // This makes moov portable across different file layouts
        // We ALWAYS normalize, regardless of original file layout
        let has_offset_tables =
            !structure.stco_locations.is_empty() || !structure.co64_locations.is_empty();
        if has_offset_tables {
            let mdat_data_start = structure.mdat.data_start as i64;
            // Subtract mdat_data_start from all offsets to normalize to 0
            Self::patch_offsets(&mut moov_data, &structure, -mdat_data_start)?;
        }

        // Read other atoms (between ftyp and moov, or between moov and mdat)
        let mut other_atoms = Vec::new();
        for atom in &structure.atoms {
            match atom.atom_type {
                AtomType::Ftyp | AtomType::Moov | AtomType::Mdat => continue,
                _ => {
                    let mut data = vec![0u8; atom.length as usize];
                    file.seek(SeekFrom::Start(atom.start))?;
                    file.read_exact(&mut data)?;
                    other_atoms.push((atom.atom_type, data));
                }
            }
        }

        // Read mdat header (just the 8 or 16 byte header, not the data)
        let mdat_header_size = (structure.mdat.data_start - structure.mdat.start) as usize;
        let mut mdat_header = vec![0u8; mdat_header_size];
        file.seek(SeekFrom::Start(structure.mdat.start))?;
        file.read_exact(&mut mdat_header)?;

        let mdat_data_offset = structure.mdat.data_start;
        let mdat_data_size = structure.mdat.data_length;

        Ok(DeconstructedMp4 {
            structure,
            ftyp_data,
            moov_data,
            other_atoms,
            mdat_header,
            mdat_data_offset,
            mdat_data_size,
        })
    }

    /// Patch offsets in moov data.
    fn patch_offsets(
        moov_data: &mut [u8],
        structure: &Mp4Structure,
        delta: i64,
    ) -> Result<(), super::offset_patcher::PatchError> {
        let moov_start = structure.moov.start;

        // Patch stco tables
        for stco in &structure.stco_locations {
            let relative_offset = (stco.data_offset - moov_start) as usize;
            Self::patch_stco(moov_data, relative_offset, stco.entry_count, delta)?;
        }

        // Patch co64 tables
        for co64 in &structure.co64_locations {
            let relative_offset = (co64.data_offset - moov_start) as usize;
            Self::patch_co64(moov_data, relative_offset, co64.entry_count, delta)?;
        }

        Ok(())
    }

    /// Patch stco (32-bit offset) table.
    fn patch_stco(
        data: &mut [u8],
        offset: usize,
        count: u32,
        delta: i64,
    ) -> Result<(), super::offset_patcher::PatchError> {
        use byteorder::{BigEndian, ByteOrder};

        for i in 0..count as usize {
            let pos = offset + i * 4;
            if pos + 4 > data.len() {
                break;
            }
            let current = BigEndian::read_u32(&data[pos..pos + 4]) as i64;
            let new_value = (current + delta) as u32;
            BigEndian::write_u32(&mut data[pos..pos + 4], new_value);
        }
        Ok(())
    }

    /// Patch co64 (64-bit offset) table.
    fn patch_co64(
        data: &mut [u8],
        offset: usize,
        count: u32,
        delta: i64,
    ) -> Result<(), super::offset_patcher::PatchError> {
        use byteorder::{BigEndian, ByteOrder};

        for i in 0..count as usize {
            let pos = offset + i * 8;
            if pos + 8 > data.len() {
                break;
            }
            let current = BigEndian::read_u64(&data[pos..pos + 8]) as i64;
            let new_value = (current + delta) as u64;
            BigEndian::write_u64(&mut data[pos..pos + 8], new_value);
        }
        Ok(())
    }
}

impl DeconstructedMp4 {
    /// Get the total metadata size (everything except mdat data).
    pub fn metadata_size(&self) -> u64 {
        let other_size: u64 = self.other_atoms.iter().map(|(_, d)| d.len() as u64).sum();
        self.ftyp_data.len() as u64
            + self.moov_data.len() as u64
            + other_size
            + self.mdat_header.len() as u64
    }

    /// Check if this MP4 has normalized offsets.
    /// We always normalize offsets if there are offset tables.
    pub fn has_normalized_offsets(&self) -> bool {
        !self.structure.stco_locations.is_empty() || !self.structure.co64_locations.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deconstructor_compiles() {
        // Basic compilation test
    }
}
