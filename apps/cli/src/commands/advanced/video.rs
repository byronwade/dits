//! Video timeline commands (Phase 5).
//!
//! Commands for creating and managing video project timelines.

use dits::core::Hash;
use dits::project::{Clip, ProjectGraph, ProjectStore};
use dits::store::Repository;
use anyhow::{Context, Result, bail};
use console::style;

/// Initialize a new video timeline project.
pub fn video_init(name: &str) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Check we have a HEAD commit
    let head = repo.head()?.context("No commits yet - commit some files first")?;

    // Initialize project store
    let project_store = ProjectStore::new(repo.dits_dir());
    project_store.init()?;

    // Check if project with this name already exists
    let existing_projects = get_commit_projects(&repo, &head)?;
    if let Ok(Some(_)) = project_store.find_by_name(name, &existing_projects) {
        bail!("Project '{}' already exists", name);
    }

    // Create new project
    let project = ProjectGraph::new_video_timeline(name);
    let project_hash = project_store.store(&project)?;

    println!(
        "{} Created video timeline project: {}",
        style("✓").green().bold(),
        style(name).yellow()
    );
    println!("  Project ID: {}", &project_hash.to_hex()[..12]);
    println!();
    println!("Next steps:");
    println!("  1. Add clips: dits video-add-clip {} --file <path> --in 0 --out 10 --start 0", name);
    println!("  2. View timeline: dits video-show {}", name);

    // Store project reference (simple file-based for now)
    save_project_ref(&repo, name, &project_hash)?;

    Ok(())
}

/// Add a clip to a video timeline.
pub fn video_add_clip(
    project_name: &str,
    file_path: &str,
    in_point: f64,
    out_point: f64,
    start: f64,
    track_id: Option<&str>,
) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Get HEAD commit
    let head = repo.head()?.context("No commits yet")?;
    let commit = repo.load_commit(&head)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    // Verify file exists in manifest
    let entry = manifest
        .get(file_path)
        .context(format!("File not tracked: {}", file_path))?;

    // Load project store
    let project_store = ProjectStore::new(repo.dits_dir());

    // Load project
    let project_hash = load_project_ref(&repo, project_name)?
        .context(format!("Project not found: {}", project_name))?;

    let mut project = project_store.load(&project_hash)?;

    // Get or create track and add clip
    let track_id_used: String;
    {
        let track = if let Some(tid) = track_id {
            project.get_track_mut(tid)
                .context(format!("Track not found: {}", tid))?
        } else {
            project.get_or_create_video_track()
        };

        // Create clip
        let clip_id = track.next_clip_id();
        let mut clip = Clip::new(&clip_id, file_path, in_point, out_point, start);
        clip.manifest_id = Some(entry.content_hash.to_hex());

        // Add clip
        track.add_clip(clip);
        track_id_used = track.id.clone();
    }

    // Store updated project
    let new_hash = project_store.store(&project)?;

    // Update project reference
    save_project_ref(&repo, project_name, &new_hash)?;

    println!(
        "{} Added clip to project '{}'",
        style("✓").green().bold(),
        project_name
    );
    println!("  Clip:   {} ({:.2}s - {:.2}s)", file_path, in_point, out_point);
    println!("  Start:  {:.2}s", start);
    println!("  Track:  {}", track_id_used);

    Ok(())
}

/// Show a video timeline.
pub fn video_show(project_name: &str) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    // Load project store
    let project_store = ProjectStore::new(repo.dits_dir());

    // Load project
    let project_hash = load_project_ref(&repo, project_name)?
        .context(format!("Project not found: {}", project_name))?;

    let project = project_store.load(&project_hash)?;

    // Print summary
    println!("{}", style(&project.name).bold().underlined());
    println!();
    println!("  Type:     {}", project.kind);
    println!("  Version:  {}", project.version);
    println!("  Duration: {:.2}s", project.duration());
    println!("  Tracks:   {}", project.tracks.len());
    println!("  Clips:    {}", project.clip_count());
    println!("  Hash:     {}", &project_hash.to_hex()[..12]);
    println!();

    if project.tracks.is_empty() {
        println!("{}", style("  (no tracks yet)").dim());
        return Ok(());
    }

    // Print timeline visualization
    println!("{}", style("Timeline:").bold());
    for track in &project.tracks {
        println!();
        println!(
            "  {} [{}]",
            style(&track.id).cyan().bold(),
            track.track_type
        );

        if track.clips.is_empty() {
            println!("    {}", style("(empty)").dim());
            continue;
        }

        for clip in &track.clips {
            let manifest_short = clip.manifest_id
                .as_ref()
                .map(|h| format!("#{}", &h[..8]))
                .unwrap_or_else(|| "".to_string());

            println!(
                "    {:6.2}s [{:6.2}s] {} {} {}",
                clip.start,
                clip.duration(),
                style(&clip.file_path).yellow(),
                style(format!("({:.1}s-{:.1}s)", clip.in_point, clip.out_point)).dim(),
                style(manifest_short).dim(),
            );
        }
    }

    Ok(())
}

/// List all video projects.
pub fn video_list() -> Result<()> {
    let cwd = std::env::current_dir()?;
    let repo = Repository::open(&cwd).context("Not a dits repository")?;

    let projects_dir = repo.dits_dir().join("projects");

    if !projects_dir.exists() {
        println!("{}", style("No video projects yet.").dim());
        println!("Create one with: dits video-init <name>");
        return Ok(());
    }

    let project_store = ProjectStore::new(repo.dits_dir());

    println!("{}", style("Video Projects:").bold());
    println!();

    for entry in std::fs::read_dir(&projects_dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();

        if let Ok(hash_hex) = std::fs::read_to_string(entry.path()) {
            if let Ok(hash) = Hash::from_hex(hash_hex.trim()) {
                if let Ok(project) = project_store.load(&hash) {
                    println!(
                        "  {} - {} tracks, {} clips, {:.1}s",
                        style(&name).yellow(),
                        project.tracks.len(),
                        project.clip_count(),
                        project.duration()
                    );
                }
            }
        }
    }

    Ok(())
}

// ========== Helper Functions ==========

/// Save project reference to .dits/projects/<name>.
fn save_project_ref(repo: &Repository, name: &str, hash: &Hash) -> Result<()> {
    let projects_dir = repo.dits_dir().join("projects");
    std::fs::create_dir_all(&projects_dir)?;

    let ref_path = projects_dir.join(name);
    std::fs::write(&ref_path, hash.to_hex())?;

    Ok(())
}

/// Load project reference from .dits/projects/<name>.
fn load_project_ref(repo: &Repository, name: &str) -> Result<Option<Hash>> {
    let ref_path = repo.dits_dir().join("projects").join(name);

    if !ref_path.exists() {
        return Ok(None);
    }

    let hash_hex = std::fs::read_to_string(&ref_path)?;
    let hash = Hash::from_hex(hash_hex.trim())?;

    Ok(Some(hash))
}

/// Get project hashes from a commit (placeholder - projects stored separately for now).
fn get_commit_projects(repo: &Repository, _commit_hash: &Hash) -> Result<Vec<Hash>> {
    let projects_dir = repo.dits_dir().join("projects");

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut hashes = Vec::new();
    for entry in std::fs::read_dir(&projects_dir)? {
        let entry = entry?;
        if let Ok(hash_hex) = std::fs::read_to_string(entry.path()) {
            if let Ok(hash) = Hash::from_hex(hash_hex.trim()) {
                hashes.push(hash);
            }
        }
    }

    Ok(hashes)
}
