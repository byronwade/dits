//! Blame command - show who changed what in a file.

use crate::core::Hash;
use crate::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;
use std::collections::HashMap;
use std::path::Path;

/// Show who last modified each part of a file.
pub fn blame(file: &str, lines: Option<&str>) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Check if file exists in HEAD
    let head = repo.head()?
        .context("No commits yet")?;

    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    if !manifest.contains(file) {
        bail!("File '{}' not found in current commit", file);
    }

    let entry = manifest.get(file).unwrap();

    // Parse line range if specified
    let (start_line, end_line) = if let Some(range) = lines {
        parse_line_range(range)?
    } else {
        (None, None)
    };

    // Check if this is a text file or binary
    // For simplicity, we'll check by extension and size
    let is_binary = is_likely_binary(file, entry.size);

    if is_binary {
        // Show chunk-level blame for binary files
        show_chunk_blame(&repo, file, &manifest, &head)?;
    } else {
        // Show line-level blame for text files
        show_line_blame(&repo, file, start_line, end_line)?;
    }

    Ok(())
}

/// Parse line range like "1,10" or "5,".
fn parse_line_range(range: &str) -> Result<(Option<usize>, Option<usize>)> {
    let parts: Vec<&str> = range.split(',').collect();
    match parts.len() {
        1 => {
            let line = parts[0].parse::<usize>()
                .context("Invalid line number")?;
            Ok((Some(line), Some(line)))
        }
        2 => {
            let start = if parts[0].is_empty() {
                None
            } else {
                Some(parts[0].parse::<usize>().context("Invalid start line")?)
            };
            let end = if parts[1].is_empty() {
                None
            } else {
                Some(parts[1].parse::<usize>().context("Invalid end line")?)
            };
            Ok((start, end))
        }
        _ => bail!("Invalid line range format. Use: LINE or START,END"),
    }
}

/// Check if file is likely binary.
fn is_likely_binary(path: &str, size: u64) -> bool {
    let path = Path::new(path);
    if let Some(ext) = path.extension() {
        let ext = ext.to_string_lossy().to_lowercase();
        matches!(
            ext.as_str(),
            "mp4" | "mov" | "mkv" | "avi" | "mxf" | "m4v" | "webm" |
            "mp3" | "wav" | "aac" | "flac" | "ogg" |
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "tiff" | "psd" |
            "zip" | "tar" | "gz" | "7z" | "rar" |
            "pdf" | "doc" | "docx" | "xls" | "xlsx" |
            "exe" | "dll" | "so" | "dylib" |
            "bin" | "dat" | "db"
        )
    } else {
        // If no extension and large, assume binary
        size > 1024 * 1024
    }
}

/// Show chunk-level blame for binary files.
fn show_chunk_blame(
    repo: &Repository,
    file: &str,
    manifest: &crate::core::Manifest,
    head_hash: &Hash,
) -> Result<()> {
    println!("{}", style("Chunk-level blame for binary file:").bold());
    println!("{}", style(file).cyan());
    println!();

    let entry = manifest.get(file).unwrap();

    // Build a map of chunk -> first commit that introduced it
    let mut chunk_origins: HashMap<Hash, (Hash, String, String)> = HashMap::new();

    // Walk through commit history to find chunk origins
    let commits = repo.log(100)?; // Check last 100 commits

    for commit in commits.iter().rev() {
        let commit_manifest = repo.load_manifest(&commit.manifest)?;
        if let Some(file_entry) = commit_manifest.get(file) {
            for chunk_ref in &file_entry.chunks {
                chunk_origins.entry(chunk_ref.hash).or_insert((
                    commit.hash,
                    commit.author.name.clone(),
                    commit.timestamp.format("%Y-%m-%d").to_string(),
                ));
            }
        }
    }

    // Print header
    println!(
        "{:<12} {:<8} {:<15} {:<12} {}",
        style("Offset").bold(),
        style("Size").bold(),
        style("Commit").bold(),
        style("Author").bold(),
        style("Date").bold()
    );
    println!("{}", "-".repeat(70));

    let mut offset: u64 = 0;
    for chunk_ref in &entry.chunks {
        let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
        let size = chunk.data.len() as u64;

        let (commit_hash, author, date) = chunk_origins
            .get(&chunk_ref.hash)
            .map(|(h, a, d)| (h.to_hex()[..7].to_string(), a.clone(), d.clone()))
            .unwrap_or_else(|| ("???????".to_string(), "unknown".to_string(), "????-??-??".to_string()));

        let size_str = if size >= 1024 * 1024 {
            format!("{:.1} MB", size as f64 / (1024.0 * 1024.0))
        } else if size >= 1024 {
            format!("{:.1} KB", size as f64 / 1024.0)
        } else {
            format!("{} B", size)
        };

        let offset_str = if offset >= 1024 * 1024 {
            format!("{:.1} MB", offset as f64 / (1024.0 * 1024.0))
        } else if offset >= 1024 {
            format!("{:.1} KB", offset as f64 / 1024.0)
        } else {
            format!("{} B", offset)
        };

        // Truncate author name if too long
        let author_display = if author.len() > 12 {
            format!("{}...", &author[..9])
        } else {
            author
        };

        println!(
            "{:<12} {:<8} {} {:<12} {}",
            offset_str,
            size_str,
            style(&commit_hash).yellow(),
            author_display,
            date
        );

        offset += size;
    }

    println!();
    println!(
        "Total: {} chunks, {}",
        entry.chunks.len(),
        if entry.size >= 1024 * 1024 * 1024 {
            format!("{:.1} GB", entry.size as f64 / (1024.0 * 1024.0 * 1024.0))
        } else if entry.size >= 1024 * 1024 {
            format!("{:.1} MB", entry.size as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.1} KB", entry.size as f64 / 1024.0)
        }
    );

    Ok(())
}

/// Show line-level blame for text files.
fn show_line_blame(
    repo: &Repository,
    file: &str,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<()> {
    // Get file content from HEAD
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    let entry = manifest.get(file).context("File not found")?;

    // Reconstruct file content
    let mut content = Vec::new();
    for chunk_ref in &entry.chunks {
        let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
        content.extend_from_slice(&chunk.data);
    }

    // Try to decode as UTF-8
    let text = String::from_utf8(content)
        .context("File is not valid UTF-8 text")?;

    let lines: Vec<&str> = text.lines().collect();

    // Build line-to-commit mapping
    // For simplicity, show all lines as from HEAD commit
    // A full implementation would track line changes across commits

    let start = start_line.unwrap_or(1).saturating_sub(1);
    let end = end_line.unwrap_or(lines.len()).min(lines.len());

    let commit_short = &commit.hash.to_hex()[..7];
    let author_short = if commit.author.name.len() > 15 {
        format!("{}...", &commit.author.name[..12])
    } else {
        commit.author.name.clone()
    };

    for (i, line) in lines.iter().enumerate().skip(start).take(end - start) {
        let line_num = i + 1;
        println!(
            "{} ({} {}) {:>4}: {}",
            style(commit_short).yellow(),
            author_short,
            commit.timestamp.format("%Y-%m-%d"),
            line_num,
            line
        );
    }

    Ok(())
}
