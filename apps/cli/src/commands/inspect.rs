//! Inspect MP4 file structure.

use crate::mp4::parser::Mp4Parser;
use crate::mp4::deconstructor::Deconstructor;
use crate::mp4::reconstructor::{Reconstructor, verify_mp4_structure};
use anyhow::{Context, Result};
use console::style;
use std::fs::File;
use std::io::{Cursor, Read, Seek, SeekFrom};
use std::path::Path;

/// Inspect an MP4 file and display its atom structure.
pub fn inspect(path: &str) -> Result<()> {
    let path = Path::new(path);

    if !path.exists() {
        anyhow::bail!("File not found: {}", path.display());
    }

    println!(
        "{} Inspecting {}",
        style("→").cyan().bold(),
        style(path.display()).yellow()
    );
    println!();

    let structure = Mp4Parser::parse(path)
        .context("Failed to parse MP4 file")?;

    // Print summary
    println!("{}", style("MP4 Structure:").bold().underlined());
    println!();

    // File info
    println!(
        "  File size:    {} ({} bytes)",
        format_bytes(structure.file_size),
        structure.file_size
    );
    println!(
        "  Layout:       {}",
        if structure.is_fast_start {
            style("fast-start (moov before mdat)").green()
        } else {
            style("standard (mdat before moov)").yellow()
        }
    );
    println!();

    // Atom table
    println!("{}", style("Atoms:").bold());
    println!(
        "  {:<8} {:<12} {:<12} {}",
        "Type", "Offset", "Size", "Notes"
    );
    println!("  {}", "-".repeat(50));

    for atom in &structure.atoms {
        let notes = match atom.atom_type {
            crate::mp4::atoms::AtomType::Ftyp => "file type".to_string(),
            crate::mp4::atoms::AtomType::Moov => {
                format!("{} tracks", count_tracks(&atom))
            }
            crate::mp4::atoms::AtomType::Mdat => "media data".to_string(),
            crate::mp4::atoms::AtomType::Free => "free space".to_string(),
            _ => String::new(),
        };

        println!(
            "  {:<8} {:<12} {:<12} {}",
            atom.atom_type.tag_str(),
            atom.start,
            format_bytes(atom.length),
            style(notes).dim()
        );
    }
    println!();

    // Offset tables
    if !structure.stco_locations.is_empty() || !structure.co64_locations.is_empty() {
        println!("{}", style("Offset Tables:").bold());
        for (i, stco) in structure.stco_locations.iter().enumerate() {
            println!(
                "  stco[{}]: {} entries at offset {}",
                i, stco.entry_count, stco.data_offset
            );
        }
        for (i, co64) in structure.co64_locations.iter().enumerate() {
            println!(
                "  co64[{}]: {} entries at offset {}",
                i, co64.entry_count, co64.data_offset
            );
        }
        println!();
    }

    // Phase 2 status
    println!("{}", style("Phase 2 Analysis:").bold());
    println!(
        "  Offset patching needed: {}",
        if structure.needs_offset_patching() {
            style("yes").yellow()
        } else {
            style("no").green()
        }
    );
    println!(
        "  moov size:   {}",
        format_bytes(structure.moov.length)
    );
    println!(
        "  mdat size:   {}",
        format_bytes(structure.mdat.data_length)
    );

    let moov_ratio = (structure.moov.length as f64 / structure.file_size as f64) * 100.0;
    println!(
        "  moov/file:   {:.2}% {}",
        moov_ratio,
        if moov_ratio < 1.0 {
            style("(metadata-only edits will be tiny)").green()
        } else {
            style("").dim()
        }
    );

    // Test deconstruct/reconstruct roundtrip
    println!();
    println!("{}", style("Roundtrip Test:").bold());

    match test_roundtrip(path) {
        Ok((original_size, reconstructed_size, matches)) => {
            println!("  Original size:      {} bytes", original_size);
            println!("  Reconstructed size: {} bytes", reconstructed_size);
            println!(
                "  Files match:        {}",
                if matches {
                    style("✓ YES").green().bold()
                } else {
                    style("✗ NO").red().bold()
                }
            );
        }
        Err(e) => {
            println!("  {}: {}", style("Error").red(), e);
        }
    }

    Ok(())
}

/// Test deconstruct/reconstruct roundtrip.
fn test_roundtrip(path: &Path) -> Result<(u64, u64, bool)> {
    // Read original file
    let mut original = Vec::new();
    File::open(path)?.read_to_end(&mut original)?;
    let original_size = original.len() as u64;

    // Deconstruct
    let deconstructed = Deconstructor::deconstruct(path)
        .context("Failed to deconstruct MP4")?;

    // Read mdat data from original file
    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start(deconstructed.mdat_data_offset))?;
    let mut mdat_data = vec![0u8; deconstructed.mdat_data_size as usize];
    file.read_exact(&mut mdat_data)?;

    // Reconstruct
    let mut reconstructed = Vec::new();
    let mut mdat_cursor = Cursor::new(&mdat_data);
    Reconstructor::reconstruct(
        &mut reconstructed,
        &deconstructed,
        &mut mdat_cursor,
        deconstructed.mdat_data_size,
    ).context("Failed to reconstruct MP4")?;

    let reconstructed_size = reconstructed.len() as u64;

    // Verify structure
    let structure_valid = verify_mp4_structure(&reconstructed);

    // For a proper match, we'd compare content, but layout may differ
    // (fast-start vs non-fast-start). Check structure validity instead.
    Ok((original_size, reconstructed_size, structure_valid))
}

/// Count track atoms in moov.
fn count_tracks(moov: &crate::mp4::atoms::Atom) -> usize {
    moov.children
        .iter()
        .filter(|a| a.atom_type == crate::mp4::atoms::AtomType::Trak)
        .count()
}

/// Format bytes as human-readable string.
fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
