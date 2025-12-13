# Merge & Conflict Resolution

This document specifies how Dits handles merging branches and resolving conflicts across all file types.

> **Phase 3.6 Update:** Dits now uses a **hybrid merge strategy** that delegates text files to libgit2 for Git-quality 3-way merging with conflict markers, while binary files use the "Choose, Don't Merge" approach.

## Hybrid Merge Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      dits merge <branch>                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   For each conflicting file:                                     │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  Text File   │    │ Binary File  │    │  NLE Project │     │
│   │ (.md, .json) │    │ (.mp4, .psd) │    │  (.prproj)   │     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   libgit2    │    │   Choose     │    │  Timeline    │     │
│   │   3-way      │    │   Version    │    │   Merge      │     │
│   │   merge      │    │              │    │              │     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  <<<<<<<<<   │    │   CONFLICT   │    │  Sequence    │     │
│   │  markers in  │    │  (pick one)  │    │  conflicts   │     │
│   │  file        │    │              │    │              │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Merge Strategies by File Type

| File Type | Strategy | Conflict Resolution | Example |
|-----------|----------|---------------------|---------|
| **Text** (.md, .json, .rs) | libgit2 3-way | Conflict markers in file | Edit markers manually |
| **Binary** (.mp4, .psd) | Choose version | `--ours` or `--theirs` | Pick one version |
| **NLE** (.prproj, .drp) | Timeline merge | Sequence-level choice | Merge non-overlapping |

---

## Text File Merging (Phase 3.6)

For text files, Dits uses libgit2's battle-tested 3-way merge:

### How It Works

```rust
use git2::{MergeOptions, Repository as GitRepo};

/// Merge text files using libgit2
pub fn merge_text_file(
    git_repo: &GitRepo,
    base_oid: Option<git2::Oid>,
    ours_oid: git2::Oid,
    theirs_oid: git2::Oid,
    path: &str,
) -> Result<TextMergeResult> {
    let base = base_oid.map(|oid| git_repo.find_blob(oid)).transpose()?;
    let ours = git_repo.find_blob(ours_oid)?;
    let theirs = git_repo.find_blob(theirs_oid)?;

    let mut opts = MergeOptions::new();
    opts.file_favor(git2::FileFavor::Normal);

    let result = git_repo.merge_file(
        base.as_ref().map(|b| b.content()).unwrap_or(&[]),
        Some(path),
        ours.content(),
        Some(path),
        theirs.content(),
        Some(path),
        Some(&opts),
    )?;

    if result.is_conflicted() {
        Ok(TextMergeResult::Conflict {
            content: result.content().to_vec(),
            marker_count: count_conflict_markers(&result.content()),
        })
    } else {
        Ok(TextMergeResult::Clean {
            content: result.content().to_vec(),
        })
    }
}

pub enum TextMergeResult {
    Clean { content: Vec<u8> },
    Conflict { content: Vec<u8>, marker_count: usize },
}
```

### Example: Text Merge with Conflicts

```bash
$ dits merge feature-branch
Auto-merging src/config.rs
CONFLICT (content): Merge conflict in src/config.rs
Automatic merge failed; fix conflicts and then commit the result.

$ cat src/config.rs
pub const VERSION: &str =
<<<<<<< HEAD
    "1.0.0";
=======
    "1.1.0-beta";
>>>>>>> feature-branch

// Rest of file merged cleanly...
```

**Resolution:** Edit the file manually to choose/combine changes, then:
```bash
$ dits add src/config.rs
$ dits commit -m "Merge feature-branch, resolved version conflict"
```

---

## Binary File Merging

For binary files, automatic merging is impossible. Dits uses a **"Choose, Don't Merge"** approach:

1. **Whole-file selection**: User chooses which version to keep
2. **Timeline-aware merging**: For NLE projects, merge at the timeline/sequence level
3. **Parallel preservation**: Keep both versions accessible during conflict
4. **Asset deduplication**: Shared media assets are automatically deduplicated

## Conflict States

### Index Stages

Like Git, Dits uses staging slots for conflicts:

| Stage | Meaning |
|-------|---------|
| 0 | Normal (no conflict) |
| 1 | Common ancestor (base) |
| 2 | "Ours" (current branch) |
| 3 | "Theirs" (merging branch) |

```rust
pub struct ConflictEntry {
    pub path: String,
    pub base: Option<FileVersion>,    // Stage 1
    pub ours: Option<FileVersion>,    // Stage 2
    pub theirs: Option<FileVersion>,  // Stage 3
}

pub struct FileVersion {
    pub hash: Hash,
    pub mode: u32,
    pub size: u64,
    pub manifest: Option<Hash>,  // For chunked files
}
```

## Merge Types

### 1. Fast-Forward Merge

No conflict possible - just move the branch pointer.

```
Before:           After:
A---B  main       A---B---C---D  main
     \
      C---D  feature
```

### 2. True Merge (No Conflicts)

Different files modified - automatic merge succeeds.

```
Before:
      C---D  feature (modified: scene2.mp4)
     /
A---B  main
     \
      E---F  main (modified: scene1.mp4)

After merge:
A---B---E---F---M  main (has both changes)
     \         /
      C-------D
```

### 3. Conflicting Merge

Same file modified in both branches.

```
Before:
      C---D  feature (modified: project.prproj)
     /
A---B
     \
      E---F  main (modified: project.prproj)

After merge attempt:
A---B---E---F---?  main (CONFLICT)
     \
      C-------D

Index now contains:
- project.prproj (stage 1): version from B
- project.prproj (stage 2): version from F
- project.prproj (stage 3): version from D
```

## Conflict Detection

### File-Level Conflicts

```rust
pub fn detect_conflicts(
    base: &Tree,
    ours: &Tree,
    theirs: &Tree,
) -> Vec<Conflict> {
    let mut conflicts = Vec::new();

    // Get all unique paths
    let paths: HashSet<_> = base.paths()
        .chain(ours.paths())
        .chain(theirs.paths())
        .collect();

    for path in paths {
        let base_entry = base.get(&path);
        let ours_entry = ours.get(&path);
        let theirs_entry = theirs.get(&path);

        match (base_entry, ours_entry, theirs_entry) {
            // Both modified same file
            (Some(b), Some(o), Some(t)) if o.hash != b.hash && t.hash != b.hash && o.hash != t.hash => {
                conflicts.push(Conflict::Content {
                    path: path.clone(),
                    base: Some(b.clone()),
                    ours: o.clone(),
                    theirs: t.clone(),
                });
            }

            // Delete/modify conflict
            (Some(b), None, Some(t)) if t.hash != b.hash => {
                conflicts.push(Conflict::DeleteModify {
                    path: path.clone(),
                    deleted_by: Side::Ours,
                    modified: t.clone(),
                });
            }

            (Some(b), Some(o), None) if o.hash != b.hash => {
                conflicts.push(Conflict::DeleteModify {
                    path: path.clone(),
                    deleted_by: Side::Theirs,
                    modified: o.clone(),
                });
            }

            // Add/add conflict (same path, different content)
            (None, Some(o), Some(t)) if o.hash != t.hash => {
                conflicts.push(Conflict::AddAdd {
                    path: path.clone(),
                    ours: o.clone(),
                    theirs: t.clone(),
                });
            }

            // No conflict cases handled by auto-merge
            _ => {}
        }
    }

    conflicts
}
```

## Resolution Strategies

### Strategy 1: Choose Version (Default for Video)

User selects which version to keep.

```bash
# Keep our version
dits checkout --ours footage/scene1.mp4
dits add footage/scene1.mp4

# Keep their version
dits checkout --theirs footage/scene1.mp4
dits add footage/scene1.mp4

# Keep base version (revert both changes)
dits checkout --base footage/scene1.mp4
dits add footage/scene1.mp4
```

Implementation:

```rust
pub fn resolve_choose_version(
    repo: &Repository,
    path: &str,
    choice: ConflictChoice,
) -> Result<(), MergeError> {
    let index = repo.index_mut()?;

    // Get the chosen version
    let entry = match choice {
        ConflictChoice::Ours => index.get_stage(path, 2)?,
        ConflictChoice::Theirs => index.get_stage(path, 3)?,
        ConflictChoice::Base => index.get_stage(path, 1)?,
    };

    let entry = entry.ok_or(MergeError::NoSuchVersion)?;

    // Remove conflict stages
    index.remove_stage(path, 1)?;
    index.remove_stage(path, 2)?;
    index.remove_stage(path, 3)?;

    // Add as stage 0 (resolved)
    index.add_stage(path, 0, entry)?;

    // Checkout to working directory
    repo.checkout_path(path, &entry.hash)?;

    Ok(())
}
```

### Strategy 2: Keep Both (Rename)

Keep both versions with different names.

```bash
dits merge-tool --keep-both footage/scene1.mp4
# Creates:
#   footage/scene1.mp4         (ours)
#   footage/scene1.theirs.mp4  (theirs)
```

Implementation:

```rust
pub fn resolve_keep_both(
    repo: &Repository,
    path: &str,
) -> Result<(), MergeError> {
    let index = repo.index_mut()?;

    let ours = index.get_stage(path, 2)?
        .ok_or(MergeError::NoOursVersion)?;
    let theirs = index.get_stage(path, 3)?
        .ok_or(MergeError::NoTheirsVersion)?;

    // Generate alternate path
    let theirs_path = generate_conflict_path(path, "theirs");

    // Remove conflict stages
    index.remove_stage(path, 1)?;
    index.remove_stage(path, 2)?;
    index.remove_stage(path, 3)?;

    // Add both as stage 0
    index.add_stage(path, 0, ours.clone())?;
    index.add_stage(&theirs_path, 0, theirs.clone())?;

    // Checkout both
    repo.checkout_path(path, &ours.hash)?;
    repo.checkout_path(&theirs_path, &theirs.hash)?;

    Ok(())
}

fn generate_conflict_path(path: &str, suffix: &str) -> String {
    let path = Path::new(path);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    let parent = path.parent().map(|p| p.to_string_lossy()).unwrap_or_default();

    if parent.is_empty() {
        format!("{}.{}{}", stem, suffix, ext)
    } else {
        format!("{}/{}.{}{}", parent, stem, suffix, ext)
    }
}
```

### Strategy 3: External Merge Tool

Launch external application for visual comparison.

```bash
dits mergetool footage/scene1.mp4
# Opens configured merge tool with all three versions
```

Configuration:

```toml
# .dits/config
[mergetool "video"]
cmd = "ffplay -i $LOCAL -i $REMOTE"
trustExitCode = false

[mergetool "premiere"]
cmd = "/Applications/Adobe Premiere Pro 2024/Adobe Premiere Pro 2024.app/Contents/MacOS/Adobe Premiere Pro 2024 $LOCAL $REMOTE"
trustExitCode = false

[merge]
tool = "video"

[merge "nle-project"]
tool = "premiere"
```

Implementation:

```rust
pub fn launch_merge_tool(
    repo: &Repository,
    path: &str,
) -> Result<MergeToolResult, MergeError> {
    let index = repo.index()?;

    // Extract versions to temp files
    let base_file = extract_to_temp(repo, index.get_stage(path, 1)?)?;
    let ours_file = extract_to_temp(repo, index.get_stage(path, 2)?)?;
    let theirs_file = extract_to_temp(repo, index.get_stage(path, 3)?)?;
    let merged_file = temp_file_for(path)?;

    // Get merge tool config
    let tool = get_merge_tool_for_path(repo, path)?;

    // Build command
    let cmd = tool.cmd
        .replace("$BASE", &base_file.to_string_lossy())
        .replace("$LOCAL", &ours_file.to_string_lossy())
        .replace("$REMOTE", &theirs_file.to_string_lossy())
        .replace("$MERGED", &merged_file.to_string_lossy());

    // Execute
    let status = Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .status()?;

    // Check result
    if tool.trust_exit_code && !status.success() {
        return Ok(MergeToolResult::Conflict);
    }

    // If merged file was created, use it
    if merged_file.exists() {
        let hash = repo.hash_file(&merged_file)?;
        return Ok(MergeToolResult::Resolved(hash));
    }

    Ok(MergeToolResult::Conflict)
}
```

## NLE Project Merging

### Timeline-Level Merge

For NLE projects (Premiere, Resolve, After Effects), Dits can merge at the timeline/sequence level rather than whole-file.

```
Project A (main):
├── Sequence 1: [clip1, clip2, clip3]
├── Sequence 2: [clip4, clip5]
└── Media: [media1.mp4, media2.mp4, media3.mp4]

Project B (feature):
├── Sequence 1: [clip1, clip2, clip3]  (unchanged)
├── Sequence 2: [clip4, clip5, clip6]  (added clip6)
├── Sequence 3: [clip7, clip8]         (new sequence)
└── Media: [media1.mp4, media2.mp4, media3.mp4, media4.mp4]

Merged:
├── Sequence 1: [clip1, clip2, clip3]
├── Sequence 2: [clip4, clip5, clip6]  (merged)
├── Sequence 3: [clip7, clip8]         (added)
└── Media: [media1.mp4, media2.mp4, media3.mp4, media4.mp4]
```

### NLE Merge Algorithm

```rust
pub struct NleProject {
    pub sequences: Vec<Sequence>,
    pub media_refs: Vec<MediaRef>,
    pub bins: Vec<Bin>,
    pub settings: ProjectSettings,
}

pub fn merge_nle_projects(
    base: &NleProject,
    ours: &NleProject,
    theirs: &NleProject,
) -> Result<MergeResult<NleProject>, MergeError> {
    let mut merged = NleProject::new();
    let mut conflicts = Vec::new();

    // Merge sequences by ID
    let all_seq_ids: HashSet<_> = base.sequences.iter()
        .chain(ours.sequences.iter())
        .chain(theirs.sequences.iter())
        .map(|s| &s.id)
        .collect();

    for seq_id in all_seq_ids {
        let base_seq = base.sequences.iter().find(|s| &s.id == seq_id);
        let ours_seq = ours.sequences.iter().find(|s| &s.id == seq_id);
        let theirs_seq = theirs.sequences.iter().find(|s| &s.id == seq_id);

        match (base_seq, ours_seq, theirs_seq) {
            // Sequence unchanged
            (Some(b), Some(o), Some(t)) if o == b && t == b => {
                merged.sequences.push(b.clone());
            }

            // Only one side modified
            (Some(b), Some(o), Some(t)) if o != b && t == b => {
                merged.sequences.push(o.clone());
            }
            (Some(b), Some(o), Some(t)) if o == b && t != b => {
                merged.sequences.push(t.clone());
            }

            // Both modified - try deep merge
            (Some(b), Some(o), Some(t)) if o != b && t != b => {
                match merge_sequence(b, o, t) {
                    Ok(merged_seq) => merged.sequences.push(merged_seq),
                    Err(_) => {
                        conflicts.push(NleConflict::Sequence {
                            id: seq_id.clone(),
                            base: Some(b.clone()),
                            ours: o.clone(),
                            theirs: t.clone(),
                        });
                    }
                }
            }

            // New sequence in ours
            (None, Some(o), None) => {
                merged.sequences.push(o.clone());
            }

            // New sequence in theirs
            (None, None, Some(t)) => {
                merged.sequences.push(t.clone());
            }

            // Added in both with different content
            (None, Some(o), Some(t)) if o != t => {
                conflicts.push(NleConflict::AddAdd {
                    id: seq_id.clone(),
                    ours: o.clone(),
                    theirs: t.clone(),
                });
            }

            // Deleted in ours, modified in theirs
            (Some(b), None, Some(t)) if t != b => {
                conflicts.push(NleConflict::DeleteModify {
                    id: seq_id.clone(),
                    deleted_by: Side::Ours,
                    modified: t.clone(),
                });
            }

            // Other cases...
            _ => {}
        }
    }

    // Merge media references (usually additive, no conflicts)
    merged.media_refs = merge_media_refs(base, ours, theirs)?;

    // Merge bins
    merged.bins = merge_bins(base, ours, theirs)?;

    // Use settings from the current branch
    merged.settings = ours.settings.clone();

    if conflicts.is_empty() {
        Ok(MergeResult::Clean(merged))
    } else {
        Ok(MergeResult::Conflict { merged, conflicts })
    }
}
```

### Sequence-Level Merge

```rust
pub fn merge_sequence(
    base: &Sequence,
    ours: &Sequence,
    theirs: &Sequence,
) -> Result<Sequence, MergeError> {
    let mut merged = Sequence {
        id: base.id.clone(),
        name: if ours.name != base.name { ours.name.clone() } else { theirs.name.clone() },
        tracks: Vec::new(),
        duration: Duration::ZERO,
    };

    // Merge each track
    for track_idx in 0..max_tracks(base, ours, theirs) {
        let base_track = base.tracks.get(track_idx);
        let ours_track = ours.tracks.get(track_idx);
        let theirs_track = theirs.tracks.get(track_idx);

        match (base_track, ours_track, theirs_track) {
            // Track exists in all - merge clips
            (Some(b), Some(o), Some(t)) => {
                let merged_track = merge_track(b, o, t)?;
                merged.tracks.push(merged_track);
            }

            // New track added
            (None, Some(o), None) => merged.tracks.push(o.clone()),
            (None, None, Some(t)) => merged.tracks.push(t.clone()),

            // Track removed
            (Some(_), None, None) => {} // Both removed, skip

            // Conflict: one removed, one modified
            (Some(b), None, Some(t)) if t != b => {
                return Err(MergeError::TrackConflict);
            }
            (Some(b), Some(o), None) if o != b => {
                return Err(MergeError::TrackConflict);
            }

            _ => {}
        }
    }

    // Recalculate duration
    merged.duration = merged.tracks.iter()
        .filter_map(|t| t.clips.last())
        .map(|c| c.end_time)
        .max()
        .unwrap_or(Duration::ZERO);

    Ok(merged)
}

pub fn merge_track(
    base: &Track,
    ours: &Track,
    theirs: &Track,
) -> Result<Track, MergeError> {
    // Find clips that were added/removed/modified
    let base_clips: HashMap<_, _> = base.clips.iter().map(|c| (&c.id, c)).collect();
    let ours_clips: HashMap<_, _> = ours.clips.iter().map(|c| (&c.id, c)).collect();
    let theirs_clips: HashMap<_, _> = theirs.clips.iter().map(|c| (&c.id, c)).collect();

    let mut merged_clips = Vec::new();

    // Process all clip IDs
    let all_ids: HashSet<_> = base_clips.keys()
        .chain(ours_clips.keys())
        .chain(theirs_clips.keys())
        .collect();

    for id in all_ids {
        let base_clip = base_clips.get(id).copied();
        let ours_clip = ours_clips.get(id).copied();
        let theirs_clip = theirs_clips.get(id).copied();

        match (base_clip, ours_clip, theirs_clip) {
            // Unchanged
            (Some(b), Some(o), Some(t)) if o == b && t == b => {
                merged_clips.push(b.clone());
            }

            // Modified in ours only
            (Some(b), Some(o), Some(t)) if o != b && t == b => {
                merged_clips.push(o.clone());
            }

            // Modified in theirs only
            (Some(b), Some(o), Some(t)) if o == b && t != b => {
                merged_clips.push(t.clone());
            }

            // Both modified - check if compatible
            (Some(_), Some(o), Some(t)) if o != t => {
                // Can merge if changes don't overlap
                if let Some(merged) = try_merge_clips(o, t) {
                    merged_clips.push(merged);
                } else {
                    return Err(MergeError::ClipConflict((*id).clone()));
                }
            }

            // Added in ours
            (None, Some(o), None) => merged_clips.push(o.clone()),

            // Added in theirs
            (None, None, Some(t)) => merged_clips.push(t.clone()),

            // Removed in both
            (Some(_), None, None) => {}

            // Other cases
            _ => {}
        }
    }

    // Sort by start time
    merged_clips.sort_by_key(|c| c.start_time);

    // Check for overlaps (conflict)
    for window in merged_clips.windows(2) {
        if window[0].end_time > window[1].start_time {
            return Err(MergeError::OverlappingClips);
        }
    }

    Ok(Track {
        id: base.id.clone(),
        name: ours.name.clone(),
        track_type: base.track_type,
        clips: merged_clips,
    })
}
```

## Conflict Markers for Projects

Since binary files can't have inline markers, Dits uses sidecar files:

```
project.prproj           # Current file (in conflict state)
project.prproj.BASE      # Common ancestor
project.prproj.OURS      # Our version
project.prproj.THEIRS    # Their version
project.prproj.CONFLICT  # Conflict description (JSON)
```

### Conflict Description File

```json
{
    "path": "project.prproj",
    "type": "nle-project",
    "format": "premiere",
    "base_commit": "a1b2c3d4...",
    "ours_commit": "e5f6g7h8...",
    "theirs_commit": "i9j0k1l2...",
    "detected_at": "2024-01-15T10:30:00Z",
    "conflicts": [
        {
            "type": "sequence",
            "id": "seq-001",
            "name": "Main Sequence",
            "description": "Both branches modified the main sequence",
            "ours_changes": [
                "Added clip at 00:01:30",
                "Modified transition at 00:02:00"
            ],
            "theirs_changes": [
                "Removed clip at 00:01:45",
                "Changed color grade on clip at 00:01:30"
            ]
        },
        {
            "type": "media_link",
            "path": "footage/scene1.mp4",
            "description": "Media file was moved in both branches",
            "ours_path": "footage/scene1.mp4",
            "theirs_path": "raw/scene1_original.mp4"
        }
    ],
    "resolution_options": [
        {
            "id": "keep-ours",
            "description": "Keep our version of the project"
        },
        {
            "id": "keep-theirs",
            "description": "Keep their version of the project"
        },
        {
            "id": "merge-sequences",
            "description": "Attempt to merge at sequence level"
        },
        {
            "id": "external-tool",
            "description": "Open both versions in Premiere for manual merge"
        }
    ]
}
```

## Merge Workflows

### Workflow 1: Simple Video File Conflict

```bash
$ dits merge feature-branch
Auto-merging project/
CONFLICT (content): Merge conflict in footage/hero-shot.mp4
Automatic merge failed; fix conflicts and then commit the result.

$ dits status
On branch main
You have unmerged paths.
  (fix conflicts and run "dits commit")
  (use "dits merge --abort" to abort the merge)

Unmerged paths:
  (use "dits checkout --ours/--theirs <file>..." to choose version)
  (use "dits add <file>..." to mark resolution)

        both modified:   footage/hero-shot.mp4

$ dits diff --conflict footage/hero-shot.mp4
--- a/footage/hero-shot.mp4 (ours)
+++ b/footage/hero-shot.mp4 (theirs)
Binary files differ
  Ours:   1.2 GB, modified 2024-01-14
  Theirs: 1.3 GB, modified 2024-01-15
  Base:   1.1 GB, from 2024-01-10

# Compare versions visually
$ dits show :2:footage/hero-shot.mp4 | ffplay -
$ dits show :3:footage/hero-shot.mp4 | ffplay -

# Choose their version
$ dits checkout --theirs footage/hero-shot.mp4
$ dits add footage/hero-shot.mp4
$ dits commit -m "Merge feature-branch, kept their hero shot"
```

### Workflow 2: NLE Project Conflict

```bash
$ dits merge color-grade-branch
Auto-merging projects/
CONFLICT (nle-project): Merge conflict in projects/main.prproj
  - Sequence "Final Cut" modified in both branches
  - 3 clips have conflicting changes
Automatic merge failed; fix conflicts and then commit the result.

$ dits conflict-info projects/main.prproj
Conflict in: projects/main.prproj (Adobe Premiere Pro)

Sequence Conflicts:
  1. "Final Cut" (seq-001)
     - Ours: Added transition at 00:05:30
     - Theirs: Changed color grade on clips 00:05:00-00:06:00

Resolution Options:
  [1] Keep our version (dits checkout --ours)
  [2] Keep their version (dits checkout --theirs)
  [3] Open in Premiere to merge manually (dits mergetool)
  [4] Export both sequences and combine (advanced)

$ dits mergetool projects/main.prproj
Opening Adobe Premiere Pro with both project versions...
  - OURS: /tmp/dits-merge-abc123/main.OURS.prproj
  - THEIRS: /tmp/dits-merge-abc123/main.THEIRS.prproj

[User manually combines changes in Premiere]

$ dits add projects/main.prproj
$ dits commit -m "Merge color-grade-branch with manual sequence merge"
```

### Workflow 3: Automatic NLE Merge (Non-overlapping)

```bash
$ dits merge audio-mix-branch
Auto-merging projects/
  Merging projects/main.prproj...
  - Sequence "Final Cut": merged automatically (no overlapping changes)
  - Added 2 new audio tracks from audio-mix-branch
Merge made by the 'nle-recursive' strategy.
 projects/main.prproj | Merged (2 sequences, 0 conflicts)
 1 file changed

$ dits log --oneline -1
abc1234 Merge branch 'audio-mix-branch' (auto-merged NLE project)
```

## Merge Strategies

### Strategy: "ours" / "theirs"

Always take one side without attempting merge.

```bash
dits merge -X ours feature-branch
dits merge -X theirs feature-branch
```

### Strategy: "nle-recursive"

Attempt timeline-level merge for NLE projects.

```bash
dits merge -s nle-recursive feature-branch
```

### Strategy: "binary"

Always require manual resolution for binary files.

```bash
dits merge -s binary feature-branch
```

### Custom Strategy per Path

```
# .ditsattributes
*.mp4 merge=binary
*.mov merge=binary
*.prproj merge=nle-recursive
*.drp merge=nle-recursive
*.aep merge=binary
```

## Merge State Files

During an unfinished merge:

```
.dits/
├── MERGE_HEAD          # Commit being merged
├── MERGE_MSG           # Prepared commit message
├── MERGE_MODE          # Merge mode (normal, squash)
├── ORIG_HEAD           # HEAD before merge started
└── tmp/
    └── merge-{id}/
        ├── base/       # Extracted base versions
        ├── ours/       # Extracted our versions
        ├── theirs/     # Extracted their versions
        └── conflicts.json
```

### MERGE_HEAD

```
e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4
```

### MERGE_MSG

```
Merge branch 'feature-branch'

# Conflicts:
#       footage/hero-shot.mp4
#       projects/main.prproj
#
# It looks like you may be committing a merge.
# If this is not correct, please remove the file
#       .dits/MERGE_HEAD
# and try again.
```

## Aborting a Merge

```bash
$ dits merge --abort
# Restores working directory to pre-merge state
# Removes MERGE_HEAD, MERGE_MSG, etc.
# Cleans up temporary files
```

Implementation:

```rust
pub fn abort_merge(repo: &Repository) -> Result<(), MergeError> {
    // Check we're in a merge state
    if !repo.is_merging()? {
        return Err(MergeError::NotMerging);
    }

    // Get original HEAD
    let orig_head = repo.read_file(".dits/ORIG_HEAD")?;
    let orig_commit = Hash::from_hex(&orig_head.trim())?;

    // Reset to original HEAD
    repo.reset_hard(&orig_commit)?;

    // Clean up merge state
    repo.remove_file(".dits/MERGE_HEAD")?;
    repo.remove_file(".dits/MERGE_MSG")?;
    repo.remove_file(".dits/MERGE_MODE")?;
    repo.remove_file(".dits/ORIG_HEAD")?;

    // Clean up temp files
    repo.remove_dir_all(".dits/tmp/merge-*")?;

    // Clean up conflict sidecar files
    for conflict in repo.conflicts()? {
        repo.remove_file(&format!("{}.BASE", conflict.path))?;
        repo.remove_file(&format!("{}.OURS", conflict.path))?;
        repo.remove_file(&format!("{}.THEIRS", conflict.path))?;
        repo.remove_file(&format!("{}.CONFLICT", conflict.path))?;
    }

    Ok(())
}
```

## Resolve Undo

After resolving a conflict, can undo the resolution:

```bash
$ dits checkout --conflict footage/hero-shot.mp4
# Restores conflict state from REUC extension
```

This uses the REUC (Resolve Undo Cache) index extension to restore the conflict markers.

## Best Practices

### For Video Teams

1. **Lock large files during editing**: Use `dits lock` to prevent conflicts
2. **Communicate before merging**: Discuss which changes to keep
3. **Use feature branches**: Keep independent work separate
4. **Commit frequently**: Smaller changes are easier to merge

### For NLE Projects

1. **Use separate sequences**: One sequence per editor reduces conflicts
2. **Agree on master sequence ownership**: One person owns the final timeline
3. **Merge frequently**: Don't let branches diverge too much
4. **Keep media organized**: Use consistent folder structure

### Conflict Prevention

```bash
# Before starting work, pull latest and lock files
dits pull origin main
dits lock footage/hero-shot.mp4

# Do your work...

# Unlock when done
dits unlock footage/hero-shot.mp4
dits push
```
