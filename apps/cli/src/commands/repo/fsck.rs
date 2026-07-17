//! Filesystem check (fsck) command - Phase 5.
//!
//! Verifies repository integrity by:
//! - Re-hashing all objects to verify content matches hash
//! - Checking manifest structure validity
//! - Verifying commit graph integrity
//! - Checking ref validity

use std::{collections::HashSet, fs, path::Path};

use anyhow::{bail, Context, Result};
use console::style;
use walkdir::WalkDir;

use crate::{
    core::{Hash, Hasher, Manifest, ManifestEntry, Mp4Metadata},
    store::{GitTextEngine, Repository},
};

/// Result of fsck operation.
#[derive(Debug, Default)]
pub struct FsckResult {
    pub objects_checked:   usize,
    pub chunks_checked:    usize,
    pub blobs_checked:     usize,
    pub manifests_checked: usize,
    pub commits_checked:   usize,
    pub refs_checked:      usize,
    pub errors:            Vec<String>,
    pub warnings:          Vec<String>,
}

impl FsckResult {
    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }
}

/// Run filesystem check on the repository.
pub fn fsck(verbose: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open_read_only(&cwd).context("Not a dits repository")?;

    println!("{}", style("Checking repository integrity...").bold());
    println!();

    let mut result = FsckResult::default();

    // 1. Check all chunks
    if verbose {
        println!("{}", style("Checking chunks...").dim());
    }
    check_chunks(repo.dits_dir(), &mut result)?;

    // 2. Check generic blobs (including MP4 structure objects)
    if verbose {
        println!("{}", style("Checking blobs...").dim());
    }
    check_blobs(repo.dits_dir(), &mut result)?;

    // 3. Check all manifests
    if verbose {
        println!("{}", style("Checking manifests...").dim());
    }
    check_manifests(&repo, &mut result)?;

    // 4. Check all commits
    if verbose {
        println!("{}", style("Checking commits...").dim());
    }
    check_commits(repo.dits_dir(), &mut result)?;

    // 5. Check refs
    if verbose {
        println!("{}", style("Checking refs...").dim());
    }
    check_refs(&repo, &mut result)?;

    // 6. Check commit graph integrity
    if verbose {
        println!("{}", style("Checking commit graph...").dim());
    }
    check_commit_graph(&repo, &mut result)?;

    // Print results
    println!();
    println!("{}", style("Integrity Check Results:").bold().underlined());
    println!();
    println!("  Objects checked: {}", result.objects_checked);
    println!("    Chunks:    {}", result.chunks_checked);
    println!("    Blobs:     {}", result.blobs_checked);
    println!("    Manifests: {}", result.manifests_checked);
    println!("    Commits:   {}", result.commits_checked);
    println!("  Refs checked:    {}", result.refs_checked);
    println!();

    // Print warnings
    if !result.warnings.is_empty() {
        println!("{}", style("Warnings:").yellow().bold());
        for warning in &result.warnings {
            println!("  {} {}", style("⚠").yellow(), warning);
        }
        println!();
    }

    // Print errors
    if result.errors.is_empty() {
        println!("{} {}", style("✓").green().bold(), style("Repository is healthy.").green());
    } else {
        println!("{}", style("Errors:").red().bold());
        for error in &result.errors {
            println!("  {} {}", style("✗").red(), error);
        }
        println!();
        println!("{} {} errors found.", style("✗").red().bold(), result.errors.len());
    }

    if !result.is_ok() {
        bail!("Repository integrity check failed with {} error(s)", result.errors.len());
    }

    Ok(())
}

/// Check all chunk objects for integrity.
fn check_chunks(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let chunks_dir = dits_dir.join("objects").join("chunks");
    if !chunks_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&chunks_dir) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .errors
                    .push(format!("Failed to walk chunk objects: {error}"));
                continue;
            },
        };
        if !entry.file_type().is_file() {
            continue;
        }
        result.objects_checked += 1;
        result.chunks_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&chunks_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result
                .warnings
                .push(format!("Unexpected chunk path structure: {}", entry.path().display()));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read and hash the data
        let data = match fs::read(entry.path()) {
            Ok(d) => d,
            Err(e) => {
                result
                    .errors
                    .push(format!("Failed to read chunk {}: {}", expected_hex, e));
                continue;
            },
        };

        let actual_hash = Hasher::hash(&data);
        let actual_hex = actual_hash.to_hex();

        if actual_hex != expected_hex {
            result.errors.push(format!(
                "Chunk hash mismatch: expected {}, got {}",
                expected_hex, actual_hex
            ));
        }
    }

    Ok(())
}

/// Check generic content-addressed blobs for integrity.
fn check_blobs(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let blobs_dir = dits_dir.join("objects").join("blobs");
    if !blobs_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&blobs_dir) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .errors
                    .push(format!("Failed to walk blob objects: {error}"));
                continue;
            },
        };
        if !entry.file_type().is_file() {
            continue;
        }
        result.objects_checked += 1;
        result.blobs_checked += 1;

        let rel_path = entry.path().strip_prefix(&blobs_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result
                .warnings
                .push(format!("Unexpected blob path structure: {}", entry.path().display()));
            continue;
        }

        let expected_hex = format!(
            "{}{}",
            components[0].as_os_str().to_string_lossy(),
            components[1].as_os_str().to_string_lossy()
        );
        match fs::read(entry.path()) {
            Ok(data) => {
                let actual_hex = Hasher::hash(&data).to_hex();
                if actual_hex != expected_hex {
                    result.errors.push(format!(
                        "Blob hash mismatch: expected {}, got {}",
                        expected_hex, actual_hex
                    ));
                }
            },
            Err(error) => result
                .errors
                .push(format!("Failed to read blob {}: {}", expected_hex, error)),
        }
    }

    Ok(())
}

/// Check all manifest objects for integrity.
fn check_manifests(repo: &Repository, result: &mut FsckResult) -> Result<()> {
    let dits_dir = repo.dits_dir();
    let manifests_dir = dits_dir.join("objects").join("manifests");
    if !manifests_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&manifests_dir) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .errors
                    .push(format!("Failed to walk manifest objects: {error}"));
                continue;
            },
        };
        if !entry.file_type().is_file() {
            continue;
        }
        result.objects_checked += 1;
        result.manifests_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&manifests_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result
                .warnings
                .push(format!("Unexpected manifest path structure: {}", entry.path().display()));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read and hash the JSON
        let json = match fs::read_to_string(entry.path()) {
            Ok(j) => j,
            Err(e) => {
                result
                    .errors
                    .push(format!("Failed to read manifest {}: {}", expected_hex, e));
                continue;
            },
        };

        let actual_hash = Hasher::hash(json.as_bytes());
        let actual_hex = actual_hash.to_hex();

        if actual_hex != expected_hex {
            result.errors.push(format!(
                "Manifest hash mismatch: expected {}, got {}",
                expected_hex, actual_hex
            ));
        }

        // Parse through the canonical reader so path/key validation runs too.
        match Hash::from_hex(&expected_hex) {
            Ok(hash) => match repo.load_manifest(&hash) {
                Ok(manifest) => check_manifest_content(repo, &hash, &manifest, result),
                Err(error) => result
                    .errors
                    .push(format!("Invalid manifest {}: {}", expected_hex, error)),
            },
            Err(error) => {
                result
                    .errors
                    .push(format!("Invalid manifest object name {}: {}", expected_hex, error));
            },
        }
    }

    Ok(())
}

/// Verify that every content object named by a manifest can be loaded and
/// matches the entry metadata. Merely hashing the objects that happen to be on
/// disk is insufficient: a missing referenced object does not appear in that
/// scan at all.
fn check_manifest_content(
    repo: &Repository,
    manifest_hash: &Hash,
    manifest: &Manifest,
    result: &mut FsckResult,
) {
    for (_, entry) in manifest.iter() {
        let chunk_content = check_chunk_references(repo, manifest_hash, entry, result);
        let git_content = check_git_reference(repo, manifest_hash, entry, result);

        if let Some(metadata) = &entry.mp4_metadata {
            check_mp4_references(repo, manifest_hash, entry, metadata, result);

            // Structured MP4 manifests store only the mdat payload in chunks;
            // entry.size/content_hash describe the fully reconstructed file.
            // Validate the payload size here without falsely comparing it to
            // the full-file metadata.
            if metadata.ftyp_hash.is_some() && metadata.moov_hash.is_some() {
                if let Some(content) = chunk_content {
                    if content.size != metadata.mdat_size {
                        result.errors.push(format!(
                            "Manifest {} entry '{}' has mdat size {}, reconstructed {}",
                            manifest_hash.short(),
                            entry.path,
                            metadata.mdat_size,
                            content.size
                        ));
                    }
                }
                continue;
            }
        }

        let content = if entry.is_git_text() {
            git_content
        } else {
            chunk_content
        };
        if let Some(content) = content {
            check_entry_content_metadata(manifest_hash, entry, content, result);
        }
    }
}

struct CheckedContent {
    size: u64,
    hash: Hash,
}

/// Load all chunk references for an entry. `None` means at least one object was
/// unavailable, so callers should avoid producing secondary size/hash errors
/// for the incomplete reconstruction.
fn check_chunk_references(
    repo: &Repository,
    manifest_hash: &Hash,
    entry: &ManifestEntry,
    result: &mut FsckResult,
) -> Option<CheckedContent> {
    let mut hasher = Hasher::new();
    let mut content_size = 0u64;
    let mut complete = true;
    let mut expected_offset = 0u64;

    for chunk_ref in &entry.chunks {
        if chunk_ref.offset != expected_offset {
            result.errors.push(format!(
                "Manifest {} entry '{}' has non-contiguous chunk offset {} (expected {})",
                manifest_hash.short(),
                entry.path,
                chunk_ref.offset,
                expected_offset
            ));
        }

        match repo.objects().load_chunk(&chunk_ref.hash) {
            Ok(chunk) => {
                if chunk.size() as u64 != chunk_ref.size {
                    result.errors.push(format!(
                        "Manifest {} entry '{}' records chunk {} size {}, actual {}",
                        manifest_hash.short(),
                        entry.path,
                        chunk_ref.hash.short(),
                        chunk_ref.size,
                        chunk.size()
                    ));
                }
                hasher.update(&chunk.data);
                match content_size.checked_add(chunk.size() as u64) {
                    Some(size) => content_size = size,
                    None => {
                        result.errors.push(format!(
                            "Manifest {} entry '{}' reconstructed size overflows u64",
                            manifest_hash.short(),
                            entry.path
                        ));
                        complete = false;
                    },
                }
            },
            Err(error) => {
                result.errors.push(format!(
                    "Manifest {} entry '{}' references unavailable chunk {}: {}",
                    manifest_hash.short(),
                    entry.path,
                    chunk_ref.hash.short(),
                    error
                ));
                complete = false;
            },
        }

        match expected_offset.checked_add(chunk_ref.size) {
            Some(offset) => expected_offset = offset,
            None => {
                result.errors.push(format!(
                    "Manifest {} entry '{}' has overflowing chunk sizes",
                    manifest_hash.short(),
                    entry.path
                ));
                complete = false;
                expected_offset = u64::MAX;
            },
        }
    }

    if complete {
        Some(CheckedContent { size: content_size, hash: hasher.finalize() })
    } else {
        None
    }
}

/// Load the Git object named by an entry, if any. GitText entries must name a
/// blob and must not silently fall back to empty chunk content when the
/// embedded Git store is missing.
fn check_git_reference(
    repo: &Repository,
    manifest_hash: &Hash,
    entry: &ManifestEntry,
    result: &mut FsckResult,
) -> Option<CheckedContent> {
    let git_oid = match entry.git_oid.as_deref() {
        Some(oid) if !oid.is_empty() => oid,
        _ if entry.is_git_text() => {
            result.errors.push(format!(
                "Manifest {} GitText entry '{}' has no Git blob OID",
                manifest_hash.short(),
                entry.path
            ));
            return None;
        },
        _ => return None,
    };

    let engine = match repo.git_engine() {
        Some(engine) => engine,
        None => {
            result.errors.push(format!(
                "Manifest {} entry '{}' references Git blob {}, but the embedded Git store is \
                 unavailable",
                manifest_hash.short(),
                entry.path,
                git_oid
            ));
            return None;
        },
    };

    let oid = match GitTextEngine::parse_oid(git_oid) {
        Ok(oid) => oid,
        Err(error) => {
            result.errors.push(format!(
                "Manifest {} entry '{}' has invalid Git blob OID '{}': {}",
                manifest_hash.short(),
                entry.path,
                git_oid,
                error
            ));
            return None;
        },
    };

    match engine.read_blob(oid) {
        Ok(content) => {
            Some(CheckedContent { size: content.len() as u64, hash: Hasher::hash(&content) })
        },
        Err(error) => {
            result.errors.push(format!(
                "Manifest {} entry '{}' references unavailable Git blob {}: {}",
                manifest_hash.short(),
                entry.path,
                git_oid,
                error
            ));
            None
        },
    }
}

/// Validate the separately stored structural objects used to reconstruct an
/// MP4. Inline atoms do not name object-store content and need no lookup.
fn check_mp4_references(
    repo: &Repository,
    manifest_hash: &Hash,
    entry: &ManifestEntry,
    metadata: &Mp4Metadata,
    result: &mut FsckResult,
) {
    if let Some(hash) = &metadata.ftyp_hash {
        check_blob_reference(repo, manifest_hash, entry, "ftyp", hash, None, result);
    }
    if let Some(hash) = &metadata.moov_hash {
        check_blob_reference(
            repo,
            manifest_hash,
            entry,
            "moov",
            hash,
            Some(metadata.moov_size),
            result,
        );
    }
    for atom in &metadata.other_atoms {
        if let Some(hash) = &atom.hash {
            check_blob_reference(
                repo,
                manifest_hash,
                entry,
                &format!("{} atom", atom.atom_type),
                hash,
                None,
                result,
            );
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn check_blob_reference(
    repo: &Repository,
    manifest_hash: &Hash,
    entry: &ManifestEntry,
    object_label: &str,
    hash: &Hash,
    expected_size: Option<u64>,
    result: &mut FsckResult,
) {
    match (repo.objects().load_blob(hash), expected_size) {
        (Ok(content), Some(expected_size)) if content.len() as u64 != expected_size => {
            result.errors.push(format!(
                "Manifest {} entry '{}' records {} blob {} size {}, actual {}",
                manifest_hash.short(),
                entry.path,
                object_label,
                hash.short(),
                expected_size,
                content.len()
            ));
        },
        (Ok(_), _) => {},
        (Err(error), _) => result.errors.push(format!(
            "Manifest {} entry '{}' references unavailable {} blob {}: {}",
            manifest_hash.short(),
            entry.path,
            object_label,
            hash.short(),
            error
        )),
    }
}

fn check_entry_content_metadata(
    manifest_hash: &Hash,
    entry: &ManifestEntry,
    content: CheckedContent,
    result: &mut FsckResult,
) {
    if content.size != entry.size {
        result.errors.push(format!(
            "Manifest {} entry '{}' records size {}, reconstructed {}",
            manifest_hash.short(),
            entry.path,
            entry.size,
            content.size
        ));
    }

    if content.hash != entry.content_hash {
        result.errors.push(format!(
            "Manifest {} entry '{}' content hash mismatch: expected {}, got {}",
            manifest_hash.short(),
            entry.path,
            entry.content_hash,
            content.hash
        ));
    }
}

/// Check all commit objects for integrity.
fn check_commits(dits_dir: &Path, result: &mut FsckResult) -> Result<()> {
    let commits_dir = dits_dir.join("objects").join("commits");
    if !commits_dir.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(&commits_dir) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .errors
                    .push(format!("Failed to walk commit objects: {error}"));
                continue;
            },
        };
        if !entry.file_type().is_file() {
            continue;
        }
        result.objects_checked += 1;
        result.commits_checked += 1;

        // Extract expected hash from path
        let rel_path = entry.path().strip_prefix(&commits_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() != 2 {
            result
                .warnings
                .push(format!("Unexpected commit path structure: {}", entry.path().display()));
            continue;
        }

        let prefix = components[0].as_os_str().to_string_lossy();
        let suffix = components[1].as_os_str().to_string_lossy();
        let expected_hex = format!("{}{}", prefix, suffix);

        // Read the JSON
        let json = match fs::read_to_string(entry.path()) {
            Ok(j) => j,
            Err(e) => {
                result
                    .errors
                    .push(format!("Failed to read commit {}: {}", expected_hex, e));
                continue;
            },
        };

        // Parse the commit, verify its stored identity matches the filename,
        // and recompute the identity from the commit fields.
        match crate::core::Commit::from_json(&json) {
            Ok(commit) => {
                if commit.hash.to_hex() != expected_hex {
                    result.errors.push(format!(
                        "Commit hash mismatch: stored {} in file {}",
                        commit.hash.to_hex(),
                        expected_hex
                    ));
                }
                if !commit.verify_hash() {
                    result.errors.push(format!(
                        "Commit content hash mismatch: stored {}, computed {}",
                        commit.hash.to_hex(),
                        commit.computed_hash().to_hex()
                    ));
                }
            },
            Err(e) => {
                result
                    .errors
                    .push(format!("Invalid commit JSON {}: {}", expected_hex, e));
            },
        }
    }

    Ok(())
}

/// Check all refs point to valid commits.
fn check_refs(repo: &Repository, result: &mut FsckResult) -> Result<()> {
    let refs_dir = repo.dits_dir().join("refs");

    // Check HEAD through RefStore so symbolic-ref validation cannot be bypassed
    // by joining attacker-controlled contents onto the repository path.
    if repo.dits_dir().join("HEAD").exists() {
        result.refs_checked += 1;
        match repo.refs().read_head() {
            Ok(_) => match repo.refs().resolve_head() {
                Ok(Some(hash)) => {
                    if let Err(error) = repo.load_commit(&hash) {
                        result.errors.push(format!(
                            "HEAD resolves to an invalid or missing commit {}: {}",
                            hash.to_hex(),
                            error
                        ));
                    }
                },
                Ok(None) => {}, // valid unborn branch
                Err(error) => result
                    .errors
                    .push(format!("Could not resolve HEAD: {}", error)),
            },
            Err(error) => {
                result.errors.push(format!("Invalid HEAD: {}", error));
            },
        }
    }

    // Check branch refs
    let heads_dir = refs_dir.join("heads");
    if heads_dir.exists() {
        for entry in WalkDir::new(&heads_dir) {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    result
                        .errors
                        .push(format!("Failed to walk branch refs: {error}"));
                    continue;
                },
            };
            if !entry.file_type().is_file() {
                continue;
            }
            result.refs_checked += 1;

            let ref_name = portable_ref_name(entry.path(), &heads_dir);

            match repo.refs().get_branch(&ref_name) {
                Ok(Some(hash)) => {
                    if let Err(error) = repo.load_commit(&hash) {
                        result.errors.push(format!(
                            "Branch {} points to an invalid or missing commit {}: {}",
                            ref_name,
                            hash.to_hex(),
                            error
                        ));
                    }
                },
                Ok(None) => result
                    .errors
                    .push(format!("Branch {} disappeared during fsck", ref_name)),
                Err(error) => {
                    result
                        .errors
                        .push(format!("Invalid branch {}: {}", ref_name, error));
                },
            }
        }
    }

    // Check tag refs, including safe nested tag names.
    let tags_dir = refs_dir.join("tags");
    if tags_dir.exists() {
        for entry in WalkDir::new(&tags_dir) {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    result
                        .errors
                        .push(format!("Failed to walk tag refs: {error}"));
                    continue;
                },
            };
            if !entry.file_type().is_file() {
                continue;
            }
            result.refs_checked += 1;
            let ref_name = portable_ref_name(entry.path(), &tags_dir);
            match repo.refs().get_tag(&ref_name) {
                Ok(Some(hash)) => {
                    if let Err(error) = repo.load_commit(&hash) {
                        result.errors.push(format!(
                            "Tag {} points to an invalid or missing commit {}: {}",
                            ref_name,
                            hash.to_hex(),
                            error
                        ));
                    }
                },
                Ok(None) => result
                    .errors
                    .push(format!("Tag {} disappeared during fsck", ref_name)),
                Err(error) => result
                    .errors
                    .push(format!("Invalid tag {}: {}", ref_name, error)),
            }
        }
    }

    Ok(())
}

/// Convert a nested ref path to Git-style `/` separators on every platform.
fn portable_ref_name(path: &Path, root: &Path) -> String {
    path.strip_prefix(root)
        .expect("walked ref path must remain below its ref root")
        .components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

/// Check commit graph integrity (parents exist, manifests exist).
fn check_commit_graph(repo: &Repository, result: &mut FsckResult) -> Result<()> {
    let commits_dir = repo.dits_dir().join("objects").join("commits");
    if !commits_dir.exists() {
        return Ok(());
    }

    let mut seen_commits: HashSet<String> = HashSet::new();

    // Collect all commit hashes
    for entry in WalkDir::new(&commits_dir) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .errors
                    .push(format!("Failed to walk commit graph objects: {error}"));
                continue;
            },
        };
        if !entry.file_type().is_file() {
            continue;
        }
        let rel_path = entry.path().strip_prefix(&commits_dir).unwrap();
        let components: Vec<_> = rel_path.components().collect();
        if components.len() == 2 {
            let prefix = components[0].as_os_str().to_string_lossy();
            let suffix = components[1].as_os_str().to_string_lossy();
            seen_commits.insert(format!("{}{}", prefix, suffix));
        }
    }

    // For each commit, verify parent and manifest references
    for commit_hex in &seen_commits {
        let hash = match Hash::from_hex(commit_hex) {
            Ok(h) => h,
            Err(_) => continue,
        };

        let commit = match repo.load_commit(&hash) {
            Ok(c) => c,
            Err(_) => continue, // Already reported as read error
        };

        // Check parent exists (if any)
        if let Some(parent_hash) = commit.parent {
            let parent_hex = parent_hash.to_hex();
            if !seen_commits.contains(&parent_hex) {
                result.errors.push(format!(
                    "Commit {} references missing parent: {}",
                    &commit_hex[..8],
                    &parent_hex[..8]
                ));
            }
        }
        for parent_hash in &commit.parents {
            let parent_hex = parent_hash.to_hex();
            if !seen_commits.contains(&parent_hex) {
                result.errors.push(format!(
                    "Commit {} references missing merge parent: {}",
                    &commit_hex[..8],
                    &parent_hex[..8]
                ));
            }
        }

        // Check manifest exists
        if repo.load_manifest(&commit.manifest).is_err() {
            result.errors.push(format!(
                "Commit {} references missing manifest: {}",
                &commit_hex[..8],
                &commit.manifest.to_hex()[..8]
            ));
        }
    }

    Ok(())
}
