//! Dependency graph commands (Phase 7).
//!
//! Commands for checking and visualizing project file dependencies.

use dits::dependency::{
    DependencyValidator, is_project_file, ProjectType,
};
use dits::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;
use std::path::{Path, PathBuf};

/// Check dependencies for project files.
pub fn dep_check(files: &[String], all: bool, strict: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get tracked files from the index or HEAD
    let tracked_files = get_tracked_files(&repo)?;

    // Build validator
    let validator = DependencyValidator::new(&cwd)
        .with_tracked_files(tracked_files.clone());

    // Get project files to check
    let project_files = if all {
        find_all_project_files(&cwd, &tracked_files)?
    } else if files.is_empty() {
        // Check staged project files
        find_staged_project_files(&repo)?
    } else {
        files.iter()
            .map(|f| cwd.join(f))
            .filter(|p| is_project_file(p))
            .collect()
    };

    if project_files.is_empty() {
        println!("{}", style("No project files to check.").yellow());
        return Ok(());
    }

    println!("{} Checking {} project file(s)...", style("→").blue(), project_files.len());
    println!();

    let mut total_missing = 0;
    let mut total_external = 0;
    let mut total_satisfied = 0;

    for project_path in &project_files {
        let display_name = project_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| project_path.display().to_string());

        let project_type = ProjectType::from_path(project_path);

        print!(
            "  {} ({})... ",
            style(&display_name).cyan(),
            project_type.name()
        );

        match validator.validate_project(project_path) {
            Ok(result) => {
                if result.is_valid {
                    println!(
                        "{} {} dependencies satisfied",
                        style("✓").green(),
                        result.satisfied.len()
                    );
                    total_satisfied += result.satisfied.len();
                } else {
                    println!("{}", style("✗").red());

                    if !result.missing.is_empty() {
                        println!(
                            "    {} {} untracked file(s):",
                            style("Missing:").red().bold(),
                            result.missing.len()
                        );
                        for path in &result.missing {
                            println!("      - {}", style(path).yellow());
                        }
                        total_missing += result.missing.len();
                    }

                    if !result.external.is_empty() {
                        println!(
                            "    {} {} file(s) outside repository:",
                            style("External:").red().bold(),
                            result.external.len()
                        );
                        for path in &result.external {
                            println!("      - {}", style(path).yellow());
                        }
                        total_external += result.external.len();
                    }

                    total_satisfied += result.satisfied.len();
                }
            }
            Err(e) => {
                println!("{} ({})", style("ERROR").red(), e);
            }
        }
    }

    println!();
    println!("{}", style("Summary:").bold());
    println!("  Satisfied:  {}", style(total_satisfied).green());
    println!("  Missing:    {}", if total_missing > 0 { style(total_missing).red() } else { style(total_missing).green() });
    println!("  External:   {}", if total_external > 0 { style(total_external).red() } else { style(total_external).green() });

    if total_missing > 0 || total_external > 0 {
        println!();
        if total_missing > 0 {
            println!(
                "{} Add missing files with: dits add <file>",
                style("Hint:").cyan()
            );
        }
        if total_external > 0 {
            println!(
                "{} Move external files into the repository and relink in your NLE.",
                style("Hint:").cyan()
            );
        }

        if strict {
            bail!("Dependency check failed: {} missing, {} external", total_missing, total_external);
        }
    } else {
        println!();
        println!("{} All dependencies satisfied!", style("✓").green().bold());
    }

    Ok(())
}

/// Show dependency graph for a project file.
pub fn dep_graph(file: &str, format: Option<&str>) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let project_path = cwd.join(file);

    if !project_path.exists() {
        bail!("File not found: {}", file);
    }

    if !is_project_file(&project_path) {
        let ext = project_path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());
        println!("{}", style("Not a supported project file").yellow().bold());
        println!();
        println!("File: {}", file);
        println!("Extension: .{}", ext);
        println!();
        println!("Supported project file types:");
        println!("  • {} - Adobe Premiere Pro", style(".prproj").cyan());
        println!("  • {} - DaVinci Resolve", style(".drp").cyan());
        println!("  • {} - Final Cut Pro X", style(".fcpxml").cyan());
        println!("  • {} - After Effects", style(".aep").cyan());
        println!("  • {} - Avid Media Composer", style(".avp").cyan());
        println!();
        println!("Use {} to list detected project files.", style("dits dep-list").cyan());
        return Ok(());
    }

    // Get tracked files
    let tracked_files = get_tracked_files(&repo)?;
    let validator = DependencyValidator::new(&cwd)
        .with_tracked_files(tracked_files);

    // Validate and build graph
    let result = validator.validate_project(&project_path)?;

    let format = format.unwrap_or("tree");

    match format {
        "tree" => {
            println!("{}", style("Dependency Graph:").bold().underlined());
            println!();
            let rel_path = project_path
                .strip_prefix(&cwd)
                .unwrap_or(&project_path)
                .to_string_lossy()
                .replace('\\', "/");
            println!("{}", result.graph.render_tree(&rel_path));
        }
        "json" => {
            let json = serde_json::to_string_pretty(&result.graph)
                .context("Failed to serialize graph")?;
            println!("{}", json);
        }
        "stats" => {
            let stats = result.graph.stats();
            println!("{}", style("Graph Statistics:").bold().underlined());
            println!();
            println!("  Total nodes:    {}", stats.total_nodes);
            println!("  Project files:  {}", stats.project_files);
            println!("  Media files:    {}", stats.media_files);
            println!("  Tracked:        {}", stats.tracked_files);
            println!("  Untracked:      {}", if stats.untracked_files > 0 { style(stats.untracked_files).red() } else { style(stats.untracked_files).green() });
            println!("  Missing:        {}", if stats.missing_files > 0 { style(stats.missing_files).red() } else { style(stats.missing_files).green() });
            println!("  Total edges:    {}", stats.total_edges);
        }
        "list" => {
            println!("{}", style("Dependencies:").bold().underlined());
            println!();
            let rel_path = project_path
                .strip_prefix(&cwd)
                .unwrap_or(&project_path)
                .to_string_lossy()
                .replace('\\', "/");

            for dep in result.graph.get_dependencies(&rel_path) {
                let status = if !dep.exists_on_disk {
                    style(" [MISSING]").red()
                } else if !dep.is_tracked {
                    style(" [UNTRACKED]").yellow()
                } else {
                    style(" [OK]").green()
                };
                println!("  {}{}", dep.path, status);
            }
        }
        _ => {
            bail!("Unknown format: {}. Use: tree, json, stats, list", format);
        }
    }

    Ok(())
}

/// List all project files in the repository.
pub fn dep_list() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let tracked_files = get_tracked_files(&repo)?;
    let project_files = find_all_project_files(&cwd, &tracked_files)?;

    if project_files.is_empty() {
        println!("{}", style("No project files found.").dim());
        return Ok(());
    }

    println!("{}", style("Project Files:").bold().underlined());
    println!();

    for path in &project_files {
        let rel_path = path
            .strip_prefix(&cwd)
            .unwrap_or(path)
            .to_string_lossy();

        let project_type = ProjectType::from_path(path);

        println!(
            "  {} ({})",
            style(rel_path).cyan(),
            project_type.name()
        );
    }

    println!();
    println!("Found {} project file(s)", project_files.len());

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Get tracked files from the repository.
fn get_tracked_files(repo: &Repository) -> Result<Vec<String>> {
    // Try to get from HEAD manifest first
    if let Some(head) = repo.head()? {
        let commit = repo.load_commit(&head)?;
        let manifest = repo.load_manifest(&commit.manifest)?;
        return Ok(manifest.entries.keys().cloned().collect());
    }

    // Fall back to index
    let index = repo.load_index()?;
    Ok(index.entries.keys().cloned().collect())
}

/// Find all project files in tracked files.
fn find_all_project_files(root: &Path, tracked: &[String]) -> Result<Vec<PathBuf>> {
    let mut project_files = Vec::new();

    for path in tracked {
        let full_path = root.join(path);
        if is_project_file(&full_path) {
            project_files.push(full_path);
        }
    }

    Ok(project_files)
}

/// Find staged project files.
fn find_staged_project_files(repo: &Repository) -> Result<Vec<PathBuf>> {
    let cwd = std::env::current_dir()?;
    let index = repo.load_index()?;

    let project_files: Vec<PathBuf> = index
        .entries
        .keys()
        .filter_map(|path| {
            let full_path = cwd.join(path);
            if is_project_file(&full_path) {
                Some(full_path)
            } else {
                None
            }
        })
        .collect();

    Ok(project_files)
}
