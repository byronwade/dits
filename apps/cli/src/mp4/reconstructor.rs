//! MP4 Reconstructor - reassembles MP4 from components.
//!
//! Takes the deconstructed components (moov, mdat chunks) and
//! rebuilds a valid MP4 file with correct offsets.

use super::deconstructor::DeconstructedMp4;
use super::offset_patcher::create_mdat_header;
use super::parser::Mp4Structure;
use byteorder::{BigEndian, ByteOrder};
use std::io::{self, Write};
use thiserror::Error;

/// Errors during reconstruction.
#[derive(Error, Debug)]
pub enum ReconstructError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Offset overflow during denormalization")]
    OffsetOverflow,
}

/// MP4 Reconstructor that rebuilds files from components.
pub struct Reconstructor;

impl Reconstructor {
    /// Reconstruct an MP4 file from deconstructed components.
    ///
    /// This writes in fast-start format (moov before mdat):
    /// 1. ftyp
    /// 2. moov (with denormalized offsets)
    /// 3. other atoms (free, uuid, etc.)
    /// 4. mdat
    ///
    /// The mdat_data should be provided as a reader to support streaming.
    pub fn reconstruct<W: Write, R: io::Read>(
        writer: &mut W,
        deconstructed: &DeconstructedMp4,
        mdat_data: &mut R,
        mdat_size: u64,
    ) -> Result<u64, ReconstructError> {
        let mut bytes_written = 0u64;

        // Write ftyp
        writer.write_all(&deconstructed.ftyp_data)?;
        bytes_written += deconstructed.ftyp_data.len() as u64;

        // Calculate where mdat data will start
        let moov_size = deconstructed.moov_data.len() as u64;
        let other_size: u64 = deconstructed
            .other_atoms
            .iter()
            .map(|(_, d)| d.len() as u64)
            .sum();
        let mdat_header = create_mdat_header(mdat_size);
        let mdat_header_size = mdat_header.len() as u64;

        // mdat data starts after: ftyp + moov + other atoms + mdat header
        let mdat_data_start = deconstructed.ftyp_data.len() as u64
            + moov_size
            + other_size
            + mdat_header_size;

        // Denormalize moov offsets (add mdat_data_start to all offsets)
        let mut moov_data = deconstructed.moov_data.clone();
        if deconstructed.has_normalized_offsets() {
            Self::denormalize_offsets(
                &mut moov_data,
                &deconstructed.structure,
                mdat_data_start as i64,
            )?;
        }

        // Write moov
        writer.write_all(&moov_data)?;
        bytes_written += moov_data.len() as u64;

        // Write other atoms
        for (_, data) in &deconstructed.other_atoms {
            writer.write_all(data)?;
            bytes_written += data.len() as u64;
        }

        // Write mdat header
        writer.write_all(&mdat_header)?;
        bytes_written += mdat_header.len() as u64;

        // Stream mdat data
        let copied = io::copy(mdat_data, writer)?;
        bytes_written += copied;

        Ok(bytes_written)
    }

    /// Reconstruct from raw components (for when you have the data in memory).
    pub fn reconstruct_from_parts<W: Write>(
        writer: &mut W,
        ftyp_data: &[u8],
        moov_data: &[u8],
        structure: &Mp4Structure,
        needs_denormalization: bool,
        mdat_data: &[u8],
    ) -> Result<u64, ReconstructError> {
        let mut bytes_written = 0u64;

        // Write ftyp
        writer.write_all(ftyp_data)?;
        bytes_written += ftyp_data.len() as u64;

        // Calculate mdat data start
        let mdat_header = create_mdat_header(mdat_data.len() as u64);
        let mdat_data_start =
            ftyp_data.len() as u64 + moov_data.len() as u64 + mdat_header.len() as u64;

        // Denormalize and write moov
        let mut moov = moov_data.to_vec();
        if needs_denormalization {
            Self::denormalize_offsets(&mut moov, structure, mdat_data_start as i64)?;
        }
        writer.write_all(&moov)?;
        bytes_written += moov.len() as u64;

        // Write mdat
        writer.write_all(&mdat_header)?;
        bytes_written += mdat_header.len() as u64;

        writer.write_all(mdat_data)?;
        bytes_written += mdat_data.len() as u64;

        Ok(bytes_written)
    }

    /// Denormalize offsets in moov data.
    /// Adds mdat_data_start to all stco/co64 entries.
    fn denormalize_offsets(
        moov_data: &mut [u8],
        structure: &Mp4Structure,
        delta: i64,
    ) -> Result<(), ReconstructError> {
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
    ) -> Result<(), ReconstructError> {
        for i in 0..count as usize {
            let pos = offset + i * 4;
            if pos + 4 > data.len() {
                break;
            }
            let current = BigEndian::read_u32(&data[pos..pos + 4]) as i64;
            let new_value = current + delta;
            if new_value < 0 || new_value > u32::MAX as i64 {
                return Err(ReconstructError::OffsetOverflow);
            }
            BigEndian::write_u32(&mut data[pos..pos + 4], new_value as u32);
        }
        Ok(())
    }

    /// Patch co64 (64-bit offset) table.
    fn patch_co64(
        data: &mut [u8],
        offset: usize,
        count: u32,
        delta: i64,
    ) -> Result<(), ReconstructError> {
        for i in 0..count as usize {
            let pos = offset + i * 8;
            if pos + 8 > data.len() {
                break;
            }
            let current = BigEndian::read_u64(&data[pos..pos + 8]) as i64;
            let new_value = current + delta;
            if new_value < 0 {
                return Err(ReconstructError::OffsetOverflow);
            }
            BigEndian::write_u64(&mut data[pos..pos + 8], new_value as u64);
        }
        Ok(())
    }
}

/// Verify a reconstructed MP4 by checking basic structure.
pub fn verify_mp4_structure(data: &[u8]) -> bool {
    if data.len() < 8 {
        return false;
    }

    // Check for ftyp at start
    if &data[4..8] != b"ftyp" {
        return false;
    }

    // Check ftyp size is reasonable
    let ftyp_size = BigEndian::read_u32(&data[0..4]) as usize;
    if ftyp_size > data.len() || ftyp_size < 8 {
        return false;
    }

    // Look for moov or mdat after ftyp
    if data.len() > ftyp_size + 8 {
        let next_atom = &data[ftyp_size + 4..ftyp_size + 8];
        if next_atom != b"moov" && next_atom != b"mdat" && next_atom != b"free" && next_atom != b"uuid"
        {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_mp4_structure() {
        // Valid ftyp header
        let mut data = vec![0u8; 32];
        BigEndian::write_u32(&mut data[0..4], 32); // size
        data[4..8].copy_from_slice(b"ftyp");
        data[8..12].copy_from_slice(b"isom");

        assert!(verify_mp4_structure(&data));
    }

    #[test]
    fn test_verify_invalid_mp4() {
        let data = vec![0u8; 32];
        assert!(!verify_mp4_structure(&data));
    }
}
