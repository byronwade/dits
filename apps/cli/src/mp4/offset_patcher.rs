//! Offset patcher for MP4 stco/co64 tables.
//!
//! When the moov atom changes size and is positioned before mdat,
//! all chunk offsets in stco (32-bit) and co64 (64-bit) tables
//! need to be adjusted by the size delta.

use super::parser::{Mp4Structure};
use byteorder::{BigEndian, ByteOrder};
use std::io::{self, Read, Seek, SeekFrom, Write};
use thiserror::Error;

/// Errors that can occur during offset patching.
#[derive(Error, Debug)]
pub enum PatchError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Offset overflow: value {value} + delta {delta} would overflow")]
    OffsetOverflow { value: u64, delta: i64 },

    #[error("Offset underflow: value {value} + delta {delta} would be negative")]
    OffsetUnderflow { value: u64, delta: i64 },

    #[error("stco overflow: offset {offset} exceeds 32-bit limit after patching")]
    Stco32BitOverflow { offset: u64 },
}

/// Patches stco/co64 offset tables in MP4 files.
pub struct OffsetPatcher;

impl OffsetPatcher {
    /// Patch offsets in a moov atom data buffer.
    ///
    /// This modifies the moov data in-place, adjusting all stco/co64
    /// entries by the given delta.
    ///
    /// # Arguments
    /// * `moov_data` - The raw moov atom data (including header)
    /// * `stco_locations` - Locations of stco tables (relative to moov start)
    /// * `co64_locations` - Locations of co64 tables (relative to moov start)
    /// * `delta` - The offset adjustment (positive = mdat moved forward)
    pub fn patch_moov_data(
        moov_data: &mut [u8],
        structure: &Mp4Structure,
        delta: i64,
    ) -> Result<(), PatchError> {
        if delta == 0 {
            return Ok(());
        }

        let moov_start = structure.moov.start;

        // Patch stco tables (32-bit offsets)
        for stco in &structure.stco_locations {
            let relative_offset = (stco.data_offset - moov_start) as usize;
            Self::patch_stco_table(moov_data, relative_offset, stco.entry_count, delta)?;
        }

        // Patch co64 tables (64-bit offsets)
        for co64 in &structure.co64_locations {
            let relative_offset = (co64.data_offset - moov_start) as usize;
            Self::patch_co64_table(moov_data, relative_offset, co64.entry_count, delta)?;
        }

        Ok(())
    }

    /// Patch a single stco table (32-bit offsets).
    fn patch_stco_table(
        data: &mut [u8],
        offset: usize,
        entry_count: u32,
        delta: i64,
    ) -> Result<(), PatchError> {
        for i in 0..entry_count as usize {
            let entry_offset = offset + i * 4;
            if entry_offset + 4 > data.len() {
                break;
            }

            let current = BigEndian::read_u32(&data[entry_offset..entry_offset + 4]) as u64;
            let new_value = Self::apply_delta(current, delta)?;

            // Check 32-bit overflow
            if new_value > u32::MAX as u64 {
                return Err(PatchError::Stco32BitOverflow { offset: new_value });
            }

            BigEndian::write_u32(&mut data[entry_offset..entry_offset + 4], new_value as u32);
        }

        Ok(())
    }

    /// Patch a single co64 table (64-bit offsets).
    fn patch_co64_table(
        data: &mut [u8],
        offset: usize,
        entry_count: u32,
        delta: i64,
    ) -> Result<(), PatchError> {
        for i in 0..entry_count as usize {
            let entry_offset = offset + i * 8;
            if entry_offset + 8 > data.len() {
                break;
            }

            let current = BigEndian::read_u64(&data[entry_offset..entry_offset + 8]);
            let new_value = Self::apply_delta(current, delta)?;

            BigEndian::write_u64(&mut data[entry_offset..entry_offset + 8], new_value);
        }

        Ok(())
    }

    /// Apply a delta to an offset value, checking for overflow/underflow.
    fn apply_delta(value: u64, delta: i64) -> Result<u64, PatchError> {
        if delta >= 0 {
            value
                .checked_add(delta as u64)
                .ok_or(PatchError::OffsetOverflow { value, delta })
        } else {
            let abs_delta = delta.unsigned_abs();
            if value < abs_delta {
                return Err(PatchError::OffsetUnderflow { value, delta });
            }
            Ok(value - abs_delta)
        }
    }

    /// Normalize moov offsets to be relative to mdat start.
    ///
    /// This converts absolute file offsets to relative offsets,
    /// making the moov portable across different file layouts.
    pub fn normalize_offsets(
        moov_data: &mut [u8],
        structure: &Mp4Structure,
    ) -> Result<(), PatchError> {
        let mdat_start = structure.mdat.data_start as i64;
        // Subtract mdat_start to make offsets relative
        Self::patch_moov_data(moov_data, structure, -mdat_start)
    }

    /// Denormalize moov offsets to be absolute for a given mdat position.
    ///
    /// This converts relative offsets back to absolute file offsets
    /// for a specific file layout.
    pub fn denormalize_offsets(
        moov_data: &mut [u8],
        structure: &Mp4Structure,
        new_mdat_start: u64,
    ) -> Result<(), PatchError> {
        // Add new_mdat_start to make offsets absolute
        let delta = new_mdat_start as i64;
        Self::patch_moov_data(moov_data, structure, delta)
    }
}

/// Read moov atom data from a file.
pub fn read_moov_data<R: Read + Seek>(
    reader: &mut R,
    structure: &Mp4Structure,
) -> io::Result<Vec<u8>> {
    let mut moov_data = vec![0u8; structure.moov.length as usize];
    reader.seek(SeekFrom::Start(structure.moov.start))?;
    reader.read_exact(&mut moov_data)?;
    Ok(moov_data)
}

/// Read mdat data from a file.
pub fn read_mdat_data<R: Read + Seek>(
    reader: &mut R,
    structure: &Mp4Structure,
) -> io::Result<Vec<u8>> {
    let mut mdat_data = vec![0u8; structure.mdat.data_length as usize];
    reader.seek(SeekFrom::Start(structure.mdat.data_start))?;
    reader.read_exact(&mut mdat_data)?;
    Ok(mdat_data)
}

/// Write a reconstructed MP4 file.
///
/// This writes the file in fast-start format (moov before mdat).
pub fn write_mp4<W: Write>(
    writer: &mut W,
    ftyp_data: &[u8],
    moov_data: &[u8],
    mdat_header: &[u8],
    mdat_data: &[u8],
) -> io::Result<()> {
    writer.write_all(ftyp_data)?;
    writer.write_all(moov_data)?;
    writer.write_all(mdat_header)?;
    writer.write_all(mdat_data)?;
    Ok(())
}

/// Create an mdat header for a given data size.
pub fn create_mdat_header(data_size: u64) -> Vec<u8> {
    let total_size = data_size + 8; // data + header

    if total_size > u32::MAX as u64 {
        // Need 64-bit size (extended header)
        let mut header = Vec::with_capacity(16);
        header.extend_from_slice(&1u32.to_be_bytes()); // size = 1 means extended
        header.extend_from_slice(b"mdat");
        header.extend_from_slice(&(data_size + 16).to_be_bytes()); // 64-bit size
        header
    } else {
        // Standard 32-bit header
        let mut header = Vec::with_capacity(8);
        header.extend_from_slice(&(total_size as u32).to_be_bytes());
        header.extend_from_slice(b"mdat");
        header
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_delta_positive() {
        assert_eq!(OffsetPatcher::apply_delta(100, 50).unwrap(), 150);
    }

    #[test]
    fn test_apply_delta_negative() {
        assert_eq!(OffsetPatcher::apply_delta(100, -50).unwrap(), 50);
    }

    #[test]
    fn test_apply_delta_underflow() {
        assert!(OffsetPatcher::apply_delta(10, -20).is_err());
    }

    #[test]
    fn test_create_mdat_header_small() {
        let header = create_mdat_header(1000);
        assert_eq!(header.len(), 8);
        assert_eq!(&header[4..8], b"mdat");
    }

    #[test]
    fn test_create_mdat_header_large() {
        let header = create_mdat_header(5_000_000_000); // 5GB
        assert_eq!(header.len(), 16);
        assert_eq!(&header[4..8], b"mdat");
    }
}
