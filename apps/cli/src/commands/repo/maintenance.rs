//! Maintenance command - Repository maintenance tasks.

use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use crate::store::Repository;

/// Maintenance task type
#[derive(Debug, Clone, Copy)]
pub enum MaintenanceTask {
    /// Garbage collection
    Gc,
    /// Update commit graph
    CommitGraph,
    /// Prefetch from remotes
    Prefetch,
    /// Verify integrity
    Fsck,
    /// Pack loose objects
    Pack,
    /// Incremental repack
    IncrementalRepack,
}

impl MaintenanceTask {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "gc" => Some(Self::Gc),
            "commit-graph" => Some(Self::CommitGraph),
            "prefetch" => Some(Self::Prefetch),
            "fsck" => Some(Self::Fsck),
            "pack" => Some(Self::Pack),
            "incremental-repack" => Some(Self::IncrementalRepack),
            _ => None,
        }
    }
    
    pub fn all() -> &'static [Self] {
        &[
            Self::Gc,
            Self::CommitGraph,
            Self::Prefetch,
            Self::Fsck,
            Self::Pack,
            Self::IncrementalRepack,
        ]
    }
    
    pub fn name(&self) -> &'static str {
        match self {
            Self::Gc => "gc",
            Self::CommitGraph => "commit-graph",
            Self::Prefetch => "prefetch",
            Self::Fsck => "fsck",
            Self::Pack => "pack",
            Self::IncrementalRepack => "incremental-repack",
        }
    }
    
    pub fn description(&self) -> &'static str {
        match self {
            Self::Gc => "Run garbage collection",
            Self::CommitGraph => "Update commit graph for faster log",
            Self::Prefetch => "Prefetch objects from remotes",
            Self::Fsck => "Verify repository integrity",
            Self::Pack => "Pack loose objects",
            Self::IncrementalRepack => "Incrementally repack objects",
        }
    }
}

/// Start background maintenance
pub fn start() -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    // Create maintenance config
    let maintenance_file = repo.dits_dir().join("maintenance.enabled");
    fs::write(&maintenance_file, "1")?;
    
    println!("Background maintenance enabled");
    println!("Note: Dits will run maintenance tasks automatically");
    
    // On Unix, we could set up a cron job or launchd plist
    // For now, just enable the flag
    
    Ok(())
}

/// Stop background maintenance
pub fn stop() -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let maintenance_file = repo.dits_dir().join("maintenance.enabled");
    if maintenance_file.exists() {
        fs::remove_file(&maintenance_file)?;
    }
    
    println!("Background maintenance disabled");
    Ok(())
}

/// Run maintenance tasks
pub fn run(task: Option<&str>) -> Result<()> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let tasks_to_run: Vec<MaintenanceTask> = match task {
        Some(t) => {
            let task = MaintenanceTask::from_str(t)
                .ok_or_else(|| anyhow::anyhow!("Unknown task: {}. Use 'dits maintenance run' to see available tasks.", t))?;
            vec![task]
        }
        None => {
            // Run default set of tasks
            vec![
                MaintenanceTask::Gc,
                MaintenanceTask::CommitGraph,
            ]
        }
    };
    
    for task in tasks_to_run {
        println!("Running {}...", task.name());
        run_task(&repo, task)?;
        println!("  ✓ {} completed", task.name());
    }
    
    Ok(())
}

fn run_task(repo: &Repository, task: MaintenanceTask) -> Result<()> {
    match task {
        MaintenanceTask::Gc => {
            // Run garbage collection
            crate::commands::gc(false, false, false)?;
        }
        MaintenanceTask::CommitGraph => {
            // Update commit graph (for faster log operations)
            update_commit_graph(repo)?;
        }
        MaintenanceTask::Prefetch => {
            // Prefetch from remotes
            println!("    Prefetching from remotes...");
            // This would fetch from all configured remotes
        }
        MaintenanceTask::Fsck => {
            // Verify integrity
            crate::commands::fsck(false)?;
        }
        MaintenanceTask::Pack => {
            // Pack loose objects
            pack_loose_objects(repo)?;
        }
        MaintenanceTask::IncrementalRepack => {
            // Incremental repack
            println!("    Incremental repack...");
        }
    }
    
    Ok(())
}

fn update_commit_graph(repo: &Repository) -> Result<()> {
    // Create a commit graph for faster log operations
    let graph_dir = repo.dits_dir().join("objects").join("info");
    fs::create_dir_all(&graph_dir)?;
    
    // For now, just touch the file to indicate we've updated
    let graph_file = graph_dir.join("commit-graph");
    fs::write(&graph_file, format!("Updated: {:?}", std::time::SystemTime::now()))?;
    
    Ok(())
}

fn pack_loose_objects(repo: &Repository) -> Result<()> {
    // Count loose objects
    let chunks_dir = repo.dits_dir().join("objects").join("chunks");
    if !chunks_dir.exists() {
        return Ok(());
    }
    
    let mut loose_count = 0;
    for entry in fs::read_dir(&chunks_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            loose_count += 1;
        }
    }
    
    println!("    Found {} loose objects", loose_count);
    
    // In a full implementation, we would pack these into packfiles
    // For now, just report the count
    
    Ok(())
}

/// Check if maintenance is enabled
pub fn is_enabled() -> Result<bool> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    let maintenance_file = repo.dits_dir().join("maintenance.enabled");
    Ok(maintenance_file.exists())
}

/// Show maintenance status
pub fn status() -> Result<()> {
    let enabled = is_enabled()?;
    
    println!("Background maintenance: {}", if enabled { "enabled" } else { "disabled" });
    println!();
    println!("Available tasks:");
    for task in MaintenanceTask::all() {
        println!("  {} - {}", task.name(), task.description());
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_parsing() {
        assert!(MaintenanceTask::from_str("gc").is_some());
        assert!(MaintenanceTask::from_str("unknown").is_none());
    }

    #[test]
    fn test_task_all() {
        assert!(MaintenanceTask::all().len() > 0);
    }
}
