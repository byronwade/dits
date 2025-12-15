//! Restore command implementation.

use crate::core::{FileStatus, Index, IndexEntry};
use crate::store::Repository;
use anyhow::{Context, Result};
use console::style;
use std::fs;
use std::io::{BufWriter, Write};
use std::path::Path;

/// Restore source determines where to restore from.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RestoreSource {
    /// Restore from HEAD (default for working tree).
    Head,
    /// Restore from staging area.
    Staged,
    /// Restore from a specific commit.
    Commit,
}

/// Restore files to their previous state.
pub fn restore(
    paths: &[String],
    staged: bool,
    worktree: bool,
    source: Option<&str>,
    ours: bool,
    theirs: bool,
) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    if paths.is_empty() {
        anyhow::bail!("No paths specified. Use 'dits restore <path>...'");
    }

    // Determine what to restore
    let restore_staged = staged;
    let restore_worktree = worktree || (!staged && source.is_none());

    // Resolve source commit if specified
    let source_hash = if let Some(ref_str) = source {
        Some(repo.resolve_ref_or_prefix(ref_str)?
            .with_context(|| format!("Could not resolve '{}' to a commit", ref_str))?)
    } else {
        repo.head()?
    };

    if ours || theirs {
        // Merge conflict resolution
        restore_conflict_version(&repo, paths, ours)?;
    } else if restore_staged {
        // Restore staged files (unstage)
        restore_staged_files(&repo, paths)?;
    } else if restore_worktree {
        // Restore working tree files from source
        restore_worktree_files(&repo, paths, source_hash.as_ref())?;
    }

    Ok(())
}

/// Restore files from a specific version (ours or theirs) during merge conflict.
fn restore_conflict_version(_repo: &Repository, paths: &[String], use_ours: bool) -> Result<()> {
    // For now, this is a simplified implementation
    // In a full implementation, we'd track conflict state
    let version = if use_ours { "ours" } else { "theirs" };

    for path in paths {
        println!(
            "{} Restoring '{}' ({} version)",
            style("!").yellow().bold(),
            style(path).cyan(),
            version
        );
        println!("   Note: Full merge conflict resolution not yet implemented.");
        println!("   Use 'dits checkout <commit> -- {}' to restore from a specific commit.", path);
    }

    Ok(())
}

/// Restore staged files (unstage them).
fn restore_staged_files(repo: &Repository, paths: &[String]) -> Result<()> {
    let index_path = repo.dits_dir().join("index");
    let json = fs::read_to_string(&index_path)?;
    let mut index = Index::from_json(&json)?;

    let mut unstaged = 0;

    for path in paths {
        if let Some(entry) = index.entries.get_mut(path) {
            if entry.status != FileStatus::Unchanged {
                entry.status = FileStatus::Unchanged;
                unstaged += 1;
                println!(
                    "{} Unstaged '{}'",
                    style("U").yellow().bold(),
                    style(path).cyan()
                );
            }
        } else {
            // Check if file exists in HEAD and add to index as unchanged
            if let Some(head_hash) = repo.head()? {
                let commit = repo.objects().load_commit(&head_hash)?;
                let manifest = repo.objects().load_manifest(&commit.manifest)?;

                if let Some(entry) = manifest.entries.get(path) {
                    let idx_entry = IndexEntry::new(
                        path.clone(),
                        entry.content_hash,
                        entry.size,
                        0,
                        0o644, // Default mode
                        entry.file_type,
                        entry.symlink_target.clone(),
                        entry.chunks.clone(),
                    );
                    index.stage(idx_entry);
                    unstaged += 1;
                    println!(
                        "{} Unstaged '{}' (restored from HEAD)",
                        style("U").yellow().bold(),
                        style(path).cyan()
                    );
                } else {
                    println!(
                        "{} Path '{}' not in index or HEAD",
                        style("!").yellow().bold(),
                        path
                    );
                }
            }
        }
    }

    // Save updated index
    fs::write(&index_path, index.to_json())?;

    if unstaged > 0 {
        println!(
            "\n{} Unstaged {} file{}",
            style("->").green().bold(),
            unstaged,
            if unstaged == 1 { "" } else { "s" }
        );
    }

    Ok(())
}

/// Restore working tree files from a source commit.
fn restore_worktree_files(
    repo: &Repository,
    paths: &[String],
    source_hash: Option<&crate::core::Hash>,
) -> Result<()> {
    let source_hash = source_hash.context("No source commit available")?;
    let commit = repo.objects().load_commit(source_hash)?;
    let manifest = repo.objects().load_manifest(&commit.manifest)?;

    let mut restored = 0;

    for path in paths {
        if let Some(entry) = manifest.entries.get(path) {
            // Restore file from chunks
            let full_path = repo.root().join(path);

            // Create parent directories
            if let Some(parent) = full_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Check if MP4 and has metadata
            if let Some(ref mp4_meta) = entry.mp4_metadata {
                // Restore MP4 file
                restore_mp4_file(repo, &full_path, entry, mp4_meta)?;
            } else {
                // Restore regular file
                let mut data = Vec::with_capacity(entry.size as usize);
                for chunk_ref in &entry.chunks {
                    let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
                    data.extend_from_slice(&chunk.data);
                }
                fs::write(&full_path, &data)?;
            }

            restored += 1;
            println!(
                "{} Restored '{}'",
                style("R").green().bold(),
                style(path).cyan()
            );
        } else {
            // File not in source - check if we should delete it
            let full_path = repo.root().join(path);
            if full_path.exists() {
                println!(
                    "{} Path '{}' not in source commit (file preserved)",
                    style("!").yellow().bold(),
                    path
                );
            } else {
                println!(
                    "{} Path '{}' not found in source or working tree",
                    style("!").yellow().bold(),
                    path
                );
            }
        }
    }

    if restored > 0 {
        println!(
            "\n{} Restored {} file{}",
            style("->").green().bold(),
            restored,
            if restored == 1 { "" } else { "s" }
        );
    }

    Ok(())
}

/// Restore an MP4 file with proper reconstruction.
fn restore_mp4_file(
    repo: &Repository,
    full_path: &Path,
    entry: &crate::core::ManifestEntry,
    mp4_meta: &crate::core::Mp4Metadata,
) -> Result<()> {
    use crate::mp4::{Atom, AtomType, Mp4Structure, Reconstructor};
    use crate::mp4::parser::{StcoLocation, Co64Location};

    // Load ftyp data
    let ftyp_data = if let Some(ref ftyp_hash) = mp4_meta.ftyp_hash {
        repo.objects().load_blob(ftyp_hash)?
    } else {
        anyhow::bail!("No ftyp data for MP4 file");
    };

    // Load moov data (normalized)
    let moov_data = if let Some(ref moov_hash) = mp4_meta.moov_hash {
        repo.objects().load_blob(moov_hash)?
    } else {
        anyhow::bail!("No moov data for MP4 file");
    };

    // Reassemble mdat data from chunks
    let mut mdat_data = Vec::with_capacity(mp4_meta.mdat_size as usize);
    for chunk_ref in &entry.chunks {
        let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
        mdat_data.extend_from_slice(&chunk.data);
    }

    // Build structure for reconstruction
    let structure = Mp4Structure {
        ftyp: Atom {
            atom_type: AtomType::Ftyp,
            start: 0,
            length: ftyp_data.len() as u64,
            data_start: 8,
            data_length: ftyp_data.len() as u64 - 8,
            children: Vec::new(),
        },
        moov: Atom {
            atom_type: AtomType::Moov,
            start: 0,
            length: moov_data.len() as u64,
            data_start: 8,
            data_length: moov_data.len() as u64 - 8,
            children: Vec::new(),
        },
        mdat: Atom {
            atom_type: AtomType::Mdat,
            start: 0,
            length: mdat_data.len() as u64 + 8,
            data_start: 8,
            data_length: mdat_data.len() as u64,
            children: Vec::new(),
        },
        atoms: Vec::new(),
        file_size: 0,
        is_fast_start: true,
        stco_locations: mp4_meta
            .stco_offsets
            .iter()
            .map(|(offset, count)| StcoLocation {
                data_offset: *offset,
                entry_count: *count,
            })
            .collect(),
        co64_locations: mp4_meta
            .co64_offsets
            .iter()
            .map(|(offset, count)| Co64Location {
                data_offset: *offset,
                entry_count: *count,
            })
            .collect(),
    };

    // Write the reconstructed MP4
    let file = fs::File::create(full_path)?;
    let mut writer = BufWriter::new(file);

    Reconstructor::reconstruct_from_parts(
        &mut writer,
        &ftyp_data,
        &moov_data,
        &structure,
        mp4_meta.needs_offset_patching,
        &mdat_data,
    )
    .map_err(|e| anyhow::anyhow!("Failed to reconstruct MP4: {}", e))?;

    writer.flush()?;

    Ok(())
}
