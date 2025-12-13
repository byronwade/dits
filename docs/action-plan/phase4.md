# Phase 4: Collaboration & Sync (Network)

> **Status: ✅ COMPLETE** - POC/introspection features implemented. Network features (push/pull/remote) planned for Phase 4b.

Execution manual for building proof-of-concept flows and introspection tooling that demonstrate dits handles huge files, dedups across versions, and works for video, game builds, and photos.

**Objective:** Build proof-of-concept flows and tooling that show, with real files, that dits can ingest large binary files (GB-level), subsequent versions reuse chunks and don't re-store everything, and you can measure logical vs physical size, chunk reuse, and dedup percentage.

**Success Metric:** Full POC workflows work with real media files, showing measurable deduplication savings and providing clear metrics via `inspect` and `repo-stats` commands.

---

## Alignment with README (core ground rules)
- Keep chunking/hash defaults stable (BLAKE3; FastCDC 128 KiB / 1 MiB / 4 MiB) so dedup metrics remain comparable across phases.
- Treat POC flows as evidence: report logical vs physical size, dedup ratio, and reuse—align with README performance targets.
- Avoid altering manifest identities when adding metadata or stats; introspection must be read-only.
- Keep demos tool-agnostic: video/game/photo scenarios should not assume proprietary formats.
- Capture observability snapshots (objects, bytes, dedup ratio, timings) during POCs for repeatability.

---

## Phase 4 Goal (Rephrased)

**Goal:** Build proof-of-concept flows and tooling that show, with real files, that:
- Dits can ingest large binary files (GB-level).
- Subsequent versions reuse chunks and don't re-store everything.
- You can measure:
  - Logical size vs. physical stored size,
  - Chunk reuse,
  - Dedup percentage,
  - Per-file and per-repo.

No remotes or ditshub here — just **local dits** showing its superpowers.

---

## New CLI / Core Features for Phase 4

Phase 4 adds read-only, introspection commands:

### `dits inspect <path>`

For a given **tracked file** in the current commit:
- Look up its `FileManifest`.
- Compute:
  - Logical size (bytes).
  - Number of chunks.
  - List of chunk IDs (for debugging).
- Show *file-level* dedup info:
  - How many chunks are shared with other files in the repo.
  - How many chunks are unique to this file.

**Example output:**
```
$ dits inspect video/original.mp4

Path: video/original.mp4
Commit: cm_8d92f0e4a1b753...
Manifest: mf_9e21c38bbf5a91...

Logical size: 10.0 GiB
Chunks: 10240

Chunk breakdown:
  Shared chunks:  10032 (98.0%)
  Unique chunks:    208 (2.0%)

Estimated unique physical size: 208 MiB
```

### `dits repo-stats`

Repo-level view:
- Sum up logical sizes of all files in current commit.
- Count unique chunks reachable from that commit.
- Compute **dedup ratio**: `physical_size / logical_size`

**Example:**
```
$ dits repo-stats

Commit: cm_8d92f0e4a1b753...
Files: 12

Logical total size: 128.0 GiB
Unique chunks:      93542
Physical size:       87.3 GiB

Deduplication:
  Saved:  40.7 GiB (31.8%)
  Ratio:  0.68 (physical / logical)
```

This is the "Look, ma, no duplicate bytes" number.

### Optional Helpers (Nice, but Not Required)

- `dits cat-manifest <path>` → dumps manifest JSON.
- `dits cat-tree <commit>` → dumps tree JSON.

These are super useful while debugging, but Phase 4 doesn't *require* them.

---

## Wiring Metrics into `dits-core`

To support `inspect` and `repo-stats` you need some helpers in `dits-core`.

### Parsing Manifests from a Commit

You need to:
1. Get HEAD commit → tree.
2. For each `TreeEntry`:
   - Load manifest object.
   - Parse JSON into `FileManifest`.

**Add helpers to `Repo`:**

```rust
pub struct FileStats {
    pub path: String,
    pub manifest_id: ObjectId,
    pub file_size: u64,
    pub chunk_ids: Vec<ObjectId>,
}

impl Repo {
    pub fn file_stats_for_commit(
        &self,
        commit_id: &ObjectId,
    ) -> Result<Vec<FileStats>, DitsError> {
        let commit_bytes = self.object_store.get_raw(commit_id)?;
        let commit = Commit::from_bytes(&commit_bytes)?;
        let tree_id = ObjectId::from_hex(&commit.tree, ObjectType::Tree)
            .map_err(|e| DitsError::InvalidObject(e))?;
        let tree_bytes = self.object_store.get_raw(&tree_id)?;
        let tree = Tree::from_bytes(&tree_bytes)?;

        let mut result = Vec::new();

        for entry in tree.entries {
            let manifest_id = ObjectId::from_hex(&entry.manifest_id, ObjectType::Manifest)
                .map_err(|e| DitsError::InvalidObject(e))?;
            let manifest_bytes = self.object_store.get_raw(&manifest_id)?;
            let manifest = FileManifest::from_bytes(&manifest_bytes)?;
            let chunk_ids: Vec<ObjectId> = manifest.chunks
                .iter()
                .map(|c| {
                    ObjectId::from_hex(&c.id, ObjectType::Chunk)
                        .map_err(|e| DitsError::InvalidObject(e))
                })
                .collect::<Result<Vec<_>, _>>()?;

            result.push(FileStats {
                path: entry.path,
                manifest_id,
                file_size: manifest.file_size,
                chunk_ids,
            });
        }

        Ok(result)
    }
}
```

### Repo-Level Stats

Now compute unique chunks and sizes:

```rust
use std::collections::HashSet;

pub struct RepoStats {
    pub commit_id: ObjectId,
    pub file_count: usize,
    pub logical_size: u64,
    pub unique_chunk_count: usize,
    pub physical_size: u64,
}

impl Repo {
    pub fn compute_repo_stats_for_commit(
        &self,
        commit_id: &ObjectId,
    ) -> Result<RepoStats, DitsError> {
        let files = self.file_stats_for_commit(commit_id)?;
        let mut logical_size: u64 = 0;
        let mut unique_chunks: HashSet<ObjectId> = HashSet::new();

        for fs in &files {
            logical_size += fs.file_size;
            for cid in &fs.chunk_ids {
                unique_chunks.insert(cid.clone());
            }
        }

        let mut physical_size: u64 = 0;
        for cid in &unique_chunks {
            let path = self.object_store.path_for(cid);
            let meta = std::fs::metadata(&path)?;
            physical_size += meta.len() as u64;
        }

        Ok(RepoStats {
            commit_id: commit_id.clone(),
            file_count: files.len(),
            logical_size,
            unique_chunk_count: unique_chunks.len(),
            physical_size,
        })
    }
}
```

### File-Level Dedup Stats

To support `dits inspect <path>`, we want:
- All chunks used by repo.
- Chunks used by this file.
- Intersection = "shared."

**Helper:**

```rust
pub struct FileDedupStats {
    pub path: String,
    pub manifest_id: ObjectId,
    pub logical_size: u64,
    pub chunk_count: usize,
    pub shared_chunk_count: usize,
    pub unique_chunk_count: usize,
    pub estimated_unique_bytes: u64,
}

impl Repo {
    pub fn compute_file_dedup_stats_for_commit(
        &self,
        commit_id: &ObjectId,
        target_path: &str,
    ) -> Result<FileDedupStats, DitsError> {
        let files = self.file_stats_for_commit(commit_id)?;
        let mut all_chunk_counts: std::collections::HashMap<ObjectId, u64> = std::collections::HashMap::new();
        for fs in &files {
            for cid in &fs.chunk_ids {
                *all_chunk_counts.entry(cid.clone()).or_insert(0) += 1;
            }
        }

        let file = files
            .into_iter()
            .find(|fs| fs.path == target_path)
            .ok_or_else(|| DitsError::InvalidState(format!("Path not found in commit: {}", target_path)))?;

        let mut shared = 0u64;
        let mut unique = 0u64;
        for cid in &file.chunk_ids {
            if let Some(count) = all_chunk_counts.get(cid) {
                if *count > 1 {
                    shared += 1;
                } else {
                    unique += 1;
                }
            }
        }

        // Approximate unique bytes: sum chunk file sizes for chunks used only once.
        let mut estimated_unique_bytes: u64 = 0;
        for cid in &file.chunk_ids {
            if let Some(count) = all_chunk_counts.get(cid) {
                if *count == 1 {
                    let path = self.object_store.path_for(cid);
                    let meta = std::fs::metadata(&path)?;
                    estimated_unique_bytes += meta.len() as u64;
                }
            }
        }

        Ok(FileDedupStats {
            path: file.path,
            manifest_id: file.manifest_id,
            logical_size: file.file_size,
            chunk_count: file.chunk_ids.len(),
            shared_chunk_count: shared as usize,
            unique_chunk_count: unique as usize,
            estimated_unique_bytes,
        })
    }
}
```

Now the CLI can just ask for `FileDedupStats` and format them nicely.

---

## Implementing `dits inspect` (Full Command)

Let's add a new CLI command in `dits-cli`.

### Extend CLI Enum

In `dits-cli/src/main.rs`, add:

```rust
#[derive(Subcommand, Debug)]
enum Commands {
    Init {
        path: Option<PathBuf>,
    },
    Add {
        paths: Vec<PathBuf>,
    },
    Status,
    Commit {
        #[arg(short = 'm', long = "message")]
        message: String,
    },
    Log {
        #[arg(short = 'n', long = "max-count")]
        max_count: Option<usize>,
    },
    Checkout {
        target: String,
    },
    Inspect {
        /// Path of tracked file to inspect (relative to repo root)
        path: String,
    },
    RepoStats,
}
```

Update the matcher:

```rust
let result = match cli.command {
    Commands::Init { path } => commands::init::run(path),
    Commands::Add { paths } => commands::add::run(paths),
    Commands::Status => commands::status::run(),
    Commands::Commit { message } => commands::commit::run(message),
    Commands::Log { max_count } => commands::log::run(max_count),
    Commands::Checkout { target } => commands::checkout::run(target),
    Commands::Inspect { path } => commands::inspect::run(path),
    Commands::RepoStats => commands::repostats::run(),
};
```

And in `dits-cli/src/commands/mod.rs`:

```rust
pub mod init;
pub mod add;
pub mod status;
pub mod commit;
pub mod log;
pub mod checkout;
pub mod inspect;
pub mod repostats;
```

### `inspect.rs`

```rust
// crates/dits-cli/src/commands/inspect.rs
use colored::*;
use dits_core::errors::DitsError;
use dits_core::object_id::{ObjectId, ObjectType};
use dits_core::repo::Repo;
use std::path::PathBuf;

fn discover_repo_root() -> Result<PathBuf, DitsError> {
    let cwd = std::env::current_dir()
        .map_err(|e| DitsError::InvalidState(format!("Failed to get cwd: {}", e)))?;
    let repo = Repo::discover(&cwd)?;
    Ok(repo.root)
}

pub fn run(path: String) -> Result<(), DitsError> {
    let repo_root = discover_repo_root()?;
    let repo = Repo::open(&repo_root)?;

    let head_commit_id = repo
        .read_head_commit_id()?
        .ok_or_else(|| DitsError::InvalidState("No commits in repository".to_string()))?;

    let stats = repo.compute_file_dedup_stats_for_commit(&head_commit_id, &path)?;

    println!(
        "{} {}",
        "Path:".bold(),
        stats.path
    );
    println!(
        "{} {}",
        "Commit:".bold(),
        head_commit_id.to_hex()
    );
    println!(
        "{} {}",
        "Manifest:".bold(),
        stats.manifest_id.to_hex()
    );
    println!(
        "{} {} bytes (~{:.2} MiB)",
        "Logical size:".bold(),
        stats.logical_size,
        stats.logical_size as f64 / (1024.0 * 1024.0)
    );
    println!(
        "{} {}",
        "Chunks:".bold(),
        stats.chunk_count
    );
    println!();

    let shared_pct = if stats.chunk_count > 0 {
        (stats.shared_chunk_count as f64 / stats.chunk_count as f64) * 100.0
    } else {
        0.0
    };
    let unique_pct = if stats.chunk_count > 0 {
        (stats.unique_chunk_count as f64 / stats.chunk_count as f64) * 100.0
    } else {
        0.0
    };

    println!("{}", "Chunk breakdown:".bold());
    println!(
        "  Shared chunks:  {} ({:.1}%)",
        stats.shared_chunk_count.to_string().green(),
        shared_pct
    );
    println!(
        "  Unique chunks:  {} ({:.1}%)",
        stats.unique_chunk_count.to_string().yellow(),
        unique_pct
    );
    println!(
        "  Estimated unique physical size: {} bytes (~{:.2} MiB)",
        stats.estimated_unique_bytes,
        stats.estimated_unique_bytes as f64 / (1024.0 * 1024.0)
    );

    Ok(())
}
```

You'd do something similar for `repostats.rs`, calling `compute_repo_stats_for_commit`.

---

## POC Flows: How to Actually Use This with Real Media

Now the fun part: how you *demo* this thing with minimal pain.

### Video POC

**Objective:** Show that multiple versions of a large MP4 share chunks.

**Steps:**

```bash
mkdir video-poc
cd video-poc

# 1. Initialize repo
dits init

# 2. Copy in a big video (simulate ~10GB)
cp /path/to/bigfile.mp4 video_v1.mp4

# 3. Track it and commit
dits add video_v1.mp4
dits commit -m "Add original video"

# 4. Create an edited version
# You can do this with an editor, or for POC:
ffmpeg -i video_v1.mp4 -vf "eq=brightness=0.05" -c:a copy video_v2.mp4

# 5. Add and commit
dits add video_v2.mp4
dits commit -m "Brightness +5%"

# 6. Inspect dedup for v2
dits inspect video_v2.mp4

# 7. Repo stats
dits repo-stats
```

**Expected outcome:**
- `dits inspect video_v2.mp4` shows:
  - Many chunks **shared** with `video_v1.mp4`.
  - Some unique chunks (due to re-encoding differences).
- `dits repo-stats` shows:
  - Logical size ≈ 2 × 10GB.
  - Physical size noticeably less (depending on encoder stability).

Even if encoding changes a lot of bytes, the test still demonstrates that:
- Dits handles huge files,
- Stats work,
- Storage doesn't blow up linearly as versions grow.

Later, when you swap in **content-defined chunking** and some smarter strategies, the dedup ratio should improve.

---

### Game Build POC

**Objective:** Show dedup when builds change a subset of assets.

You can simulate a game build as a directory with:
- Binary files,
- "Content" files,
- Maybe a big `.pak` file.

**Steps:**

```bash
mkdir game-poc
cd game-poc

dits init

# Simulate build v1
mkdir build_v1
dd if=/dev/urandom of=build_v1/game.bin bs=1M count=100
dd if=/dev/urandom of=build_v1/content.pak bs=1M count=500

dits add build_v1
dits commit -m "Build v1"

# Simulate build v2:
# - Slightly change game.bin
# - Reuse most of content.pak but change a part
cp -R build_v1 build_v2
dd if=/dev/urandom of=build_v2/game.bin bs=1M count=1 conv=notrunc
dd if=/dev/urandom of=build_v2/content.pak bs=1M count=1 seek=200 conv=notrunc

dits add build_v2
dits commit -m "Build v2 with small changes"

# Inspect one of the big files
dits inspect build_v2/content.pak

# Repo stats
dits repo-stats
```

**Expected:**
- `build_v2/content.pak` has most chunks shared with `build_v1/content.pak`.
- Repo logical size ≈ 2 × (100+500 MB), physical size significantly less.

This is essentially how real game patch systems work.

---

### Photo POC

**Objective:** Show a single RAW file feeding many edits without blowing storage.

**Steps:**

```bash
mkdir photo-poc
cd photo-poc

dits init

# Import a RAW
cp /path/to/photo.CR3 photo_v1.CR3

dits add photo_v1.CR3
dits commit -m "Initial RAW"

# Simulate edits by creating multiple JPEG exports from same RAW
# (In real world, you'd keep one RAW + sidecar edits; here we're just stress-testing dedup)
ffmpeg -i photo_v1.CR3 -q:v 2 photo_edit_1.jpg
ffmpeg -i photo_v1.CR3 -vf "eq=brightness=0.1" -q:v 2 photo_edit_2.jpg
ffmpeg -i photo_v1.CR3 -vf "hue=s=0" -q:v 2 photo_edit_3_bw.jpg

dits add photo_edit_1.jpg photo_edit_2.jpg photo_edit_3_bw.jpg
dits commit -m "Three JPEG edits"

dits inspect photo_edit_2.jpg
dits repo-stats
```

**Expected:**
- All edits share some structure (maybe smaller than video, but still present).
- Logical size = RAW + 3 JPEGs.
- Physical size < sum of all 4 individual sizes.

Later, when you add **true edit graphs** (non-destructive params), this gets even better. But Phase 4 just proves the chunk fabric behaves for photo-style binaries as well.

---

## Phase 4 "Done" Criteria

You can call Phase 4 complete when:

1. **Code-level:**
   - `Repo::file_stats_for_commit`, `compute_repo_stats_for_commit`, and `compute_file_dedup_stats_for_commit` exist and are tested.
   - `dits inspect <path>` prints sane metrics.
   - `dits repo-stats` prints repo-level metrics.

2. **Manual demos:**
   - You've run:
     - Video POC
     - Game build POC
     - Photo POC
   - And captured sample outputs (copy/paste into a README or docs).

3. **Docs:**
   - A `docs/poc.md` or similar describing:
     - Exact commands used,
     - Sample outputs,
     - Interpretation ("we saved X% storage").

4. **Performance sanity:**
   - For 5–10 GB test files, `dits add`, `dits commit`, `dits inspect`, `dits repo-stats` run in acceptable time on your dev machine (e.g., under a couple minutes for the heaviest operations).
   - No OOMs, no catastrophic slowdown.

At that point, you've got:
> A local-only, network-capable, large-media-aware VCS with measurable dedup — **a real foundation for ditshub**.

---

## Actionable Build Order (Phase 4)

1. **Extend `dits-core::Repo`** with:
   - `file_stats_for_commit()` method
   - `compute_repo_stats_for_commit()` method
   - `compute_file_dedup_stats_for_commit()` method
2. **Add data structures** to `dits-core`:
   - `FileStats`
   - `RepoStats`
   - `FileDedupStats`
3. **Implement `dits inspect` command** in `dits-cli`.
4. **Implement `dits repo-stats` command** in `dits-cli`.
5. **Add unit tests** for stats computation.
6. **Run Video POC** and capture outputs.
7. **Run Game Build POC** and capture outputs.
8. **Run Photo POC** and capture outputs.
9. **Write `docs/poc.md`** with results and interpretation.
10. **Performance testing** with large files (5-10GB).

---

## Testing Strategy

**Unit tests:**
- Test `file_stats_for_commit` with known commit structure.
- Test `compute_repo_stats_for_commit` with multiple files.
- Test `compute_file_dedup_stats_for_commit` with shared chunks.

**Integration tests:**
- Full POC workflows (video, game, photo).
- Verify dedup calculations match actual storage.
- Test with various file sizes (MB to GB).

**Manual testing:**
- Real-world video projects.
- Actual game build directories.
- RAW photo workflows.
- Capture metrics and document results.

---

## Future Enhancements (Post-Phase 4)

- **Content-defined chunking improvements** - Better chunk boundaries for video (keyframe-aligned).
- **Metadata extraction** - Optional video/photo metadata (duration, dimensions, codec) attached to manifests.
- **Edit graphs** - Non-destructive edit parameters stored separately from file data.
- **Progress indicators** - Show chunking/hashing progress for large files.
- **Export reports** - Generate HTML/JSON reports of dedup stats.
- **Historical comparison** - Compare dedup stats across multiple commits.
- **Chunk visualization** - Visual representation of chunk sharing between files.

---

## Next Steps After Phase 4

Once Phase 4 is complete, you have proven the core concept works with real media. Future phases can add:
- **Phase 5**: Virtual File System (FUSE/WinFSP) for on-demand file access.
- **Phase 6**: Advanced collaboration features (QUIC-based sync, multi-user workflows).
- **Phase 7+**: ditshub (multi-tenant cloud service with auth, UI, GPU jobs, etc.).

---

## Notes on Performance

For Phase 4, acceptable performance targets:
- **Chunking 10GB file**: < 5 minutes on modern hardware.
- **Computing repo stats**: < 30 seconds for repos with 100+ files.
- **File inspect**: < 5 seconds for any single file.
- **Memory usage**: Should not exceed 2-3x the largest chunk size in RAM.

If performance becomes an issue:
- Cache computed stats in `.dits/cache/stats/`.
- Parallelize chunk file size lookups.
- Use streaming for very large repos.

