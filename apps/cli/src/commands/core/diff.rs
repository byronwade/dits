//! Diff command implementation.

use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use similar::{ChangeTag, TextDiff};
use std::fs;
use std::path::Path;

/// Show differences between working tree and staged/committed changes.
pub fn diff(staged: bool, commit: Option<&str>, file: Option<&str>) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if staged {
        diff_staged(&repo, file)?;
    } else if let Some(commit_ref) = commit {
        diff_commit(&repo, commit_ref, file)?;
    } else {
        diff_working(&repo, file)?;
    }

    Ok(())
}

/// Show unstaged changes (working tree vs index/HEAD).
fn diff_working(repo: &Repository, file_filter: Option<&str>) -> Result<()> {
    let status = repo.status()?;
    let mut has_changes = false;

    for path in &status.modified {
        if let Some(filter) = file_filter {
            if path != filter {
                continue;
            }
        }
        show_file_diff(repo, path, DiffSource::WorkingVsHead)?;
        has_changes = true;
    }

    if !has_changes {
        println!("{}", style("No unstaged changes").dim());
    }

    Ok(())
}

/// Show staged changes (index vs HEAD).
fn diff_staged(repo: &Repository, file_filter: Option<&str>) -> Result<()> {
    let status = repo.status()?;
    let mut has_changes = false;

    // Combine all staged files
    let staged_files: Vec<&String> = status
        .staged_new
        .iter()
        .chain(status.staged_modified.iter())
        .chain(status.staged_deleted.iter())
        .collect();

    for path in staged_files {
        if let Some(filter) = file_filter {
            if path != filter {
                continue;
            }
        }
        show_staged_file_diff(repo, path)?;
        has_changes = true;
    }

    if !has_changes {
        println!("{}", style("No staged changes").dim());
    }

    Ok(())
}

/// Show diff between working tree and a specific commit.
fn diff_commit(repo: &Repository, commit_ref: &str, file_filter: Option<&str>) -> Result<()> {
    let _hash = repo
        .resolve_ref_or_prefix(commit_ref)?
        .with_context(|| format!("Could not resolve '{}' to a commit", commit_ref))?;

    // For now, show working tree vs HEAD (similar to git diff HEAD)
    diff_working(repo, file_filter)
}

#[derive(Clone, Copy)]
enum DiffSource {
    WorkingVsHead,
}

/// Show diff for a specific file.
fn show_file_diff(repo: &Repository, path: &str, _source: DiffSource) -> Result<()> {
    let full_path = repo.root().join(path);

    if !full_path.exists() {
        println!(
            "{} {} (deleted)",
            style("---").red(),
            style(path).bold()
        );
        return Ok(());
    }

    // Check if binary
    let is_binary = is_binary_file(&full_path)?;

    if is_binary {
        show_binary_diff(repo, path, &full_path)?;
    } else {
        show_text_diff(repo, path, &full_path)?;
    }

    Ok(())
}

/// Show diff for a staged file.
fn show_staged_file_diff(_repo: &Repository, path: &str) -> Result<()> {
    println!(
        "{} {}",
        style("diff --dits").cyan(),
        style(format!("a/{} b/{}", path, path)).bold()
    );
    println!("{}", style("(staged for commit)").dim());
    println!();
    Ok(())
}

/// Check if a file is binary.
fn is_binary_file(path: &Path) -> Result<bool> {
    // Check by extension first
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let binary_extensions = [
            "mp4", "mov", "avi", "mkv", "webm", "flv", // Video
            "mp3", "wav", "aac", "flac", "ogg", // Audio
            "png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp", // Image
            "pdf", "doc", "docx", "xls", "xlsx", // Documents
            "zip", "tar", "gz", "7z", "rar", // Archives
            "exe", "dll", "so", "dylib", // Executables
            "blend", "psd", "ai", "sketch", // Design files
            "fbx", "obj", "stl", "gltf", "glb", // 3D models
        ];

        if binary_extensions.contains(&ext.to_lowercase().as_str()) {
            return Ok(true);
        }
    }

    // Check content for null bytes
    let content = fs::read(path)?;
    let sample = &content[..content.len().min(8192)];
    Ok(sample.contains(&0))
}

/// Show diff for binary file.
fn show_binary_diff(repo: &Repository, path: &str, full_path: &Path) -> Result<()> {
    println!(
        "{} {}",
        style("diff --dits").cyan(),
        style(format!("a/{} b/{}", path, path)).bold()
    );
    println!("{}", style("Binary file changed").yellow());

    // Get current file size
    let current_size = fs::metadata(full_path)?.len();

    // Try to get original size from last commit
    if let Ok(Some(original_size)) = get_original_size(repo, path) {
        let size_diff = current_size as i64 - original_size as i64;
        let size_str = if size_diff >= 0 {
            format!("+{}", format_bytes(size_diff as u64))
        } else {
            format!("-{}", format_bytes((-size_diff) as u64))
        };

        println!(
            "  Size: {} -> {} ({})",
            format_bytes(original_size),
            format_bytes(current_size),
            if size_diff >= 0 {
                style(size_str).green()
            } else {
                style(size_str).red()
            }
        );
    } else {
        println!("  Size: {}", format_bytes(current_size));
    }

    // For MP4 files, show additional metadata
    if let Some(ext) = full_path.extension().and_then(|e| e.to_str()) {
        if ["mp4", "mov", "m4v"].contains(&ext.to_lowercase().as_str()) {
            // MP4 metadata display is skipped for now - the parser doesn't expose duration/codec/resolution
            // This can be implemented later with ffprobe or enhanced MP4 parsing
        }
    }

    println!();
    Ok(())
}

/// Show diff for text file.
fn show_text_diff(repo: &Repository, path: &str, full_path: &Path) -> Result<()> {
    let current_content = fs::read_to_string(full_path)?;

    // Get original content from last commit
    let original_content = get_original_content(repo, path).unwrap_or_default();

    if current_content == original_content {
        return Ok(());
    }

    println!(
        "{} {}",
        style("diff --dits").cyan(),
        style(format!("a/{} b/{}", path, path)).bold()
    );
    println!("{} a/{}", style("---").red(), path);
    println!("{} b/{}", style("+++").green(), path);

    let diff = TextDiff::from_lines(&original_content, &current_content);

    for (idx, group) in diff.grouped_ops(3).iter().enumerate() {
        if idx > 0 {
            println!("{}", style("...").dim());
        }

        for op in group {
            for change in diff.iter_changes(op) {
                let (sign, s) = match change.tag() {
                    ChangeTag::Delete => ("-", style(change.value().to_string()).red()),
                    ChangeTag::Insert => ("+", style(change.value().to_string()).green()),
                    ChangeTag::Equal => (" ", style(change.value().to_string()).dim()),
                };

                print!("{}{}", sign, s);
                if change.missing_newline() {
                    println!();
                }
            }
        }
    }

    println!();
    Ok(())
}

/// Get original file size from last commit.
fn get_original_size(repo: &Repository, path: &str) -> Result<Option<u64>> {
    let head_hash = match repo.refs().resolve_head()? {
        Some(h) => h,
        None => return Ok(None),
    };

    let commit = repo.objects().load_commit(&head_hash)?;
    let manifest = repo.objects().load_manifest(&commit.manifest)?;

    if let Some(entry) = manifest.entries.get(path) {
        Ok(Some(entry.size))
    } else {
        Ok(None)
    }
}

/// Get original file content from last commit.
fn get_original_content(repo: &Repository, path: &str) -> Option<String> {
    let head_hash = repo.refs().resolve_head().ok()??;
    let commit = repo.objects().load_commit(&head_hash).ok()?;
    let manifest = repo.objects().load_manifest(&commit.manifest).ok()?;

    let entry = manifest.entries.get(path)?;

    // Reconstruct content from chunks
    let mut content = Vec::new();
    for chunk_ref in &entry.chunks {
        if let Ok(chunk) = repo.objects().load_chunk(&chunk_ref.hash) {
            content.extend_from_slice(&chunk.data);
        }
    }

    String::from_utf8(content).ok()
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
        format!("{} bytes", bytes)
    }
}
