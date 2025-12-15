//! Stash command implementation.

use crate::core::{chunk_data_with_refs, ChunkerConfig, FileStatus, Hash, Hasher, Index, IndexEntry, Manifest, ManifestEntry};
use crate::store::Repository;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use console::style;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// A stash entry stores uncommitted changes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StashEntry {
    /// Unique identifier for this stash.
    pub id: u64,
    /// When the stash was created.
    pub timestamp: DateTime<Utc>,
    /// User-provided message (optional).
    pub message: Option<String>,
    /// The commit HEAD was at when stash was created.
    pub base_commit: Option<Hash>,
    /// The branch that was active when stash was created.
    pub branch: Option<String>,
    /// Manifest hash for the stashed index state.
    pub index_manifest: Hash,
    /// Manifest hash for the stashed working tree state.
    pub worktree_manifest: Hash,
}

/// Collection of stash entries.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct StashList {
    /// All stash entries, newest first.
    pub entries: Vec<StashEntry>,
    /// Next ID to assign.
    pub next_id: u64,
}

impl StashList {
    /// Load stash list from file.
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let json = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&json)?)
    }

    /// Save stash list to file.
    pub fn save(&self, path: &Path) -> Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Push a new stash entry.
    pub fn push(&mut self, entry: StashEntry) {
        self.entries.insert(0, entry);
    }

    /// Pop the most recent stash entry.
    pub fn pop(&mut self) -> Option<StashEntry> {
        if self.entries.is_empty() {
            None
        } else {
            Some(self.entries.remove(0))
        }
    }

    /// Get a stash entry by index (0 = most recent).
    pub fn get(&self, index: usize) -> Option<&StashEntry> {
        self.entries.get(index)
    }

    /// Drop a stash entry by index.
    pub fn drop(&mut self, index: usize) -> Option<StashEntry> {
        if index < self.entries.len() {
            Some(self.entries.remove(index))
        } else {
            None
        }
    }

    /// Clear all stash entries.
    pub fn clear(&mut self) {
        self.entries.clear();
    }
}

/// Stash command: save, pop, list, or drop stashed changes.
pub fn stash(
    action: Option<&str>,
    message: Option<&str>,
    index: Option<usize>,
) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    let stash_path = repo.dits_dir().join("stash.json");

    match action {
        None | Some("push") | Some("save") => {
            // Save current changes to stash
            stash_push(&repo, &stash_path, message)?;
        }
        Some("pop") => {
            // Apply and remove top stash
            let idx = index.unwrap_or(0);
            stash_pop(&repo, &stash_path, idx)?;
        }
        Some("apply") => {
            // Apply stash without removing it
            let idx = index.unwrap_or(0);
            stash_apply(&repo, &stash_path, idx, false)?;
        }
        Some("list") => {
            // List all stashes
            stash_list(&stash_path)?;
        }
        Some("drop") => {
            // Drop a specific stash
            let idx = index.unwrap_or(0);
            stash_drop(&stash_path, idx)?;
        }
        Some("clear") => {
            // Clear all stashes
            stash_clear(&stash_path)?;
        }
        Some("show") => {
            // Show stash contents
            let idx = index.unwrap_or(0);
            stash_show(&repo, &stash_path, idx)?;
        }
        Some(other) => {
            anyhow::bail!("Unknown stash action: {}. Use push, pop, apply, list, drop, clear, or show.", other);
        }
    }

    Ok(())
}

/// Save current changes to stash.
fn stash_push(repo: &Repository, stash_path: &Path, message: Option<&str>) -> Result<()> {
    let index_path = repo.dits_dir().join("index");
    let json = fs::read_to_string(&index_path)?;
    let index = Index::from_json(&json)?;

    // Check if there are any changes to stash
    let has_staged = index.entries.values().any(|e| e.status != FileStatus::Unchanged);

    // Check for unstaged changes in working tree
    let head_hash = repo.head()?;
    let _head_manifest = if let Some(ref h) = head_hash {
        let commit = repo.objects().load_commit(h)?;
        Some(repo.objects().load_manifest(&commit.manifest)?)
    } else {
        None
    };

    let mut worktree_changes = Vec::new();
    for (path, entry) in &index.entries {
        let full_path = repo.root().join(path);
        if full_path.exists() {
            let metadata = fs::metadata(&full_path)?;
            if metadata.len() != entry.size {
                worktree_changes.push(path.clone());
            }
        }
    }

    if !has_staged && worktree_changes.is_empty() {
        println!("{} No local changes to save", style("!").yellow().bold());
        return Ok(());
    }

    // Create manifest for index state
    let mut index_manifest = Manifest::new();
    for (path, entry) in &index.entries {
        if entry.status != FileStatus::Unchanged || entry.status == FileStatus::Added {
            let manifest_entry = ManifestEntry::new(
                path.clone(),
                entry.size,
                entry.content_hash,
                entry.chunks.clone(),
            );
            index_manifest.add(manifest_entry);
        }
    }
    let index_manifest_hash = repo.objects().store_manifest(&index_manifest)?;

    // Create manifest for worktree state (files that differ from index)
    let mut worktree_manifest = Manifest::new();
    for path in &worktree_changes {
        let full_path = repo.root().join(path);
        if full_path.exists() {
            let data = fs::read(&full_path)?;
            let content_hash = Hasher::hash(&data);

            // Chunk the data
            let chunker_config = ChunkerConfig::default();
            let (chunks, chunk_refs) = chunk_data_with_refs(&data, &chunker_config);

            // Store chunks
            for chunk in &chunks {
                repo.objects().store_chunk(chunk)?;
            }

            let manifest_entry = ManifestEntry::new(
                path.clone(),
                data.len() as u64,
                content_hash,
                chunk_refs,
            );
            worktree_manifest.add(manifest_entry);
        }
    }
    let worktree_manifest_hash = repo.objects().store_manifest(&worktree_manifest)?;

    // Load stash list and add new entry
    let mut stash_list = StashList::load(stash_path)?;
    let entry = StashEntry {
        id: stash_list.next_id,
        timestamp: Utc::now(),
        message: message.map(String::from),
        base_commit: head_hash,
        branch: repo.current_branch()?,
        index_manifest: index_manifest_hash,
        worktree_manifest: worktree_manifest_hash,
    };
    stash_list.next_id += 1;
    stash_list.push(entry);
    stash_list.save(stash_path)?;

    // Reset working tree and index to HEAD
    if let Some(ref head) = head_hash {
        // Reset index to HEAD
        let commit = repo.objects().load_commit(head)?;
        let manifest = repo.objects().load_manifest(&commit.manifest)?;
        let mut new_index = Index::from_commit(*head);

        for (path, entry) in manifest.iter() {
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
            new_index.stage(idx_entry);
        }

        fs::write(&index_path, new_index.to_json())?;

        // Reset working tree files that had changes
        for path in &worktree_changes {
            if let Some(entry) = manifest.entries.get(path) {
                let full_path = repo.root().join(path);
                let mut data = Vec::with_capacity(entry.size as usize);
                for chunk_ref in &entry.chunks {
                    let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
                    data.extend_from_slice(&chunk.data);
                }
                fs::write(&full_path, &data)?;
            }
        }

        // Remove files that were newly added (not in HEAD manifest)
        for (path, entry) in &index.entries {
            if entry.status == FileStatus::Added && !manifest.entries.contains_key(path) {
                let full_path = repo.root().join(path);
                if full_path.exists() {
                    // Don't delete the file, just remove from tracking
                    // The file stays as untracked
                }
            }
        }
    } else {
        // No HEAD commit - clear the index entirely
        let new_index = Index::new();
        fs::write(&index_path, new_index.to_json())?;
    }

    let msg = message.unwrap_or("WIP on stash");
    println!(
        "{} Saved working directory and index state: {}",
        style("->").green().bold(),
        msg
    );

    Ok(())
}

/// Apply stash and optionally remove it.
fn stash_apply(repo: &Repository, stash_path: &Path, index: usize, remove: bool) -> Result<()> {
    let mut stash_list = StashList::load(stash_path)?;

    let entry = if remove {
        stash_list.drop(index)
    } else {
        stash_list.get(index).cloned()
    };

    let entry = entry.with_context(|| format!("stash@{{{}}}: No stash found", index))?;

    // Load the stashed worktree manifest
    let worktree_manifest = repo.objects().load_manifest(&entry.worktree_manifest)?;

    // Apply worktree changes
    let mut restored = 0;
    for (path, manifest_entry) in worktree_manifest.iter() {
        let full_path = repo.root().join(path);

        // Create parent directories
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Restore file from chunks
        let mut data = Vec::with_capacity(manifest_entry.size as usize);
        for chunk_ref in &manifest_entry.chunks {
            let chunk = repo.objects().load_chunk(&chunk_ref.hash)?;
            data.extend_from_slice(&chunk.data);
        }
        fs::write(&full_path, &data)?;
        restored += 1;

        println!(
            "{} Restored '{}'",
            style("R").green().bold(),
            style(path).cyan()
        );
    }

    // Load and apply index manifest changes
    let index_manifest = repo.objects().load_manifest(&entry.index_manifest)?;
    let index_path = repo.dits_dir().join("index");
    let json = fs::read_to_string(&index_path)?;
    let mut current_index = Index::from_json(&json)?;

    for (path, manifest_entry) in index_manifest.iter() {
        let idx_entry = IndexEntry::new(
            path.clone(),
            manifest_entry.content_hash,
            manifest_entry.size,
            0,
            0o644, // Default mode
            manifest_entry.file_type,
            manifest_entry.symlink_target.clone(),
            manifest_entry.chunks.clone(),
        );
        current_index.stage(idx_entry);
    }

    fs::write(&index_path, current_index.to_json())?;

    if remove {
        stash_list.save(stash_path)?;
    }

    let action = if remove { "Popped" } else { "Applied" };
    println!(
        "\n{} {} stash@{{{}}} ({} file{})",
        style("->").green().bold(),
        action,
        index,
        restored,
        if restored == 1 { "" } else { "s" }
    );

    Ok(())
}

/// Pop the top stash (apply and remove).
fn stash_pop(repo: &Repository, stash_path: &Path, index: usize) -> Result<()> {
    stash_apply(repo, stash_path, index, true)
}

/// List all stashes.
fn stash_list(stash_path: &Path) -> Result<()> {
    let stash_list = StashList::load(stash_path)?;

    if stash_list.entries.is_empty() {
        println!("{}", style("No stashes").dim());
        return Ok(());
    }

    for (i, entry) in stash_list.entries.iter().enumerate() {
        let branch_info = entry.branch.as_deref().unwrap_or("(no branch)");
        let commit_info = entry.base_commit
            .map(|h| h.to_hex()[..8].to_string())
            .unwrap_or_else(|| "(no commit)".to_string());

        let msg = entry.message.as_deref().unwrap_or("WIP");

        println!(
            "{} on {}: {} {}",
            style(format!("stash@{{{}}}", i)).yellow().bold(),
            style(branch_info).cyan(),
            commit_info,
            msg
        );
    }

    Ok(())
}

/// Drop a specific stash.
fn stash_drop(stash_path: &Path, index: usize) -> Result<()> {
    let mut stash_list = StashList::load(stash_path)?;

    if stash_list.drop(index).is_some() {
        stash_list.save(stash_path)?;
        println!(
            "{} Dropped stash@{{{}}}",
            style("->").green().bold(),
            index
        );
    } else {
        anyhow::bail!("stash@{{{}}}: No stash found", index);
    }

    Ok(())
}

/// Clear all stashes.
fn stash_clear(stash_path: &Path) -> Result<()> {
    let mut stash_list = StashList::load(stash_path)?;
    let count = stash_list.entries.len();

    if count == 0 {
        println!("{}", style("No stashes to clear").dim());
        return Ok(());
    }

    stash_list.clear();
    stash_list.save(stash_path)?;

    println!(
        "{} Cleared {} stash{}",
        style("->").green().bold(),
        count,
        if count == 1 { "" } else { "es" }
    );

    Ok(())
}

/// Show stash contents.
fn stash_show(repo: &Repository, stash_path: &Path, index: usize) -> Result<()> {
    let stash_list = StashList::load(stash_path)?;

    let entry = stash_list.get(index)
        .with_context(|| format!("stash@{{{}}}: No stash found", index))?;

    println!(
        "{} stash@{{{}}}",
        style("Stash:").bold(),
        index
    );

    if let Some(ref msg) = entry.message {
        println!("  Message: {}", msg);
    }

    println!("  Created: {}", entry.timestamp.format("%Y-%m-%d %H:%M:%S"));

    if let Some(ref branch) = entry.branch {
        println!("  Branch: {}", style(branch).cyan());
    }

    if let Some(ref base) = entry.base_commit {
        println!("  Base commit: {}", &base.to_hex()[..8]);
    }

    // Show files in the stash
    let worktree_manifest = repo.objects().load_manifest(&entry.worktree_manifest)?;
    let index_manifest = repo.objects().load_manifest(&entry.index_manifest)?;

    if !worktree_manifest.entries.is_empty() {
        println!("\n  {} Working tree changes:", style("Unstaged").yellow());
        for (path, _) in worktree_manifest.iter() {
            println!("    {}", style(path).cyan());
        }
    }

    if !index_manifest.entries.is_empty() {
        println!("\n  {} Index changes:", style("Staged").green());
        for (path, _) in index_manifest.iter() {
            println!("    {}", style(path).cyan());
        }
    }

    Ok(())
}
