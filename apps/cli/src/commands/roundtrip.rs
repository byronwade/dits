//! Roundtrip test command - deconstruct and reconstruct an MP4.

use crate::mp4::deconstructor::Deconstructor;
use crate::mp4::reconstructor::Reconstructor;
use anyhow::{Context, Result};
use console::style;
use std::fs::File;
use std::io::{Cursor, Read, Seek, SeekFrom, Write};
use std::path::Path;

/// Perform a full roundtrip test: deconstruct -> reconstruct -> verify.
pub fn roundtrip(input: &str, output: &str) -> Result<()> {
    let input_path = Path::new(input);
    let output_path = Path::new(output);

    if !input_path.exists() {
        anyhow::bail!("Input file not found: {}", input_path.display());
    }

    println!(
        "{} Roundtrip test: {} → {}",
        style("→").cyan().bold(),
        style(input).yellow(),
        style(output).green()
    );
    println!();

    // Deconstruct
    println!("  Deconstructing...");
    let deconstructed = Deconstructor::deconstruct(input_path)
        .context("Failed to deconstruct MP4")?;

    println!("    ftyp:  {} bytes", deconstructed.ftyp_data.len());
    println!("    moov:  {} bytes (normalized)", deconstructed.moov_data.len());
    println!("    mdat:  {} bytes", deconstructed.mdat_data_size);
    println!("    other: {} atoms", deconstructed.other_atoms.len());
    println!();

    // Read mdat data
    println!("  Reading mdat data...");
    let mut file = File::open(input_path)?;
    file.seek(SeekFrom::Start(deconstructed.mdat_data_offset))?;
    let mut mdat_data = vec![0u8; deconstructed.mdat_data_size as usize];
    file.read_exact(&mut mdat_data)?;
    println!();

    // Reconstruct
    println!("  Reconstructing...");
    let mut output_file = File::create(output_path)?;
    let mut mdat_cursor = Cursor::new(&mdat_data);
    let bytes_written = Reconstructor::reconstruct(
        &mut output_file,
        &deconstructed,
        &mut mdat_cursor,
        deconstructed.mdat_data_size,
    ).context("Failed to reconstruct MP4")?;
    output_file.flush()?;

    println!("    Wrote {} bytes", bytes_written);
    println!();

    // Verify with ffprobe
    println!("  Verifying with ffprobe...");
    let ffprobe_result = std::process::Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(output_path)
        .output();

    match ffprobe_result {
        Ok(output) => {
            if output.status.success() {
                let duration = String::from_utf8_lossy(&output.stdout);
                println!(
                    "    {} Duration: {}s",
                    style("✓").green().bold(),
                    duration.trim()
                );
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                println!(
                    "    {} ffprobe error: {}",
                    style("✗").red().bold(),
                    error.trim()
                );
            }
        }
        Err(e) => {
            println!("    {} ffprobe not available: {}", style("!").yellow(), e);
        }
    }

    println!();
    println!(
        "{} Roundtrip complete! Output: {}",
        style("✓").green().bold(),
        output_path.display()
    );

    Ok(())
}
