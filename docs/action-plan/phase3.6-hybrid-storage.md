# Phase 3.6: Hybrid Storage Engine (Git + Dits)

> **Status: 🚧 Planned** - Integrating Git's text handling with Dits' binary capabilities.

**Project:** Dits (Data-Intensive Version Control System)
**Phase:** 3.6 — Hybrid Storage Engine
**Objective:** Use the right tool for each job: Git's proven text engine for text files, Dits' chunking for binary/media files.

---

## Executive Summary

This phase introduces a **hybrid storage architecture** that delegates text file handling to libgit2 while retaining Dits' specialized chunking for binary and media files. This approach:

1. **Leverages Git's 20+ years of refinement** for text diffing, merging, and delta compression
2. **Preserves Dits' innovations** for video-aware chunking and large binary handling
3. **Provides familiar semantics** for developers already comfortable with Git
4. **Eliminates reinvention** of complex algorithms like 3-way merge with conflict markers

---

## The Problem

### Current State

Dits currently uses FastCDC chunking for **all files**, including text files:

```
Current Flow (All Files):
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌────────────┐
│  File   │ --> │ FastCDC  │ --> │ BLAKE3 Hash │ --> │ Chunk Store│
│ (any)   │     │ Chunker  │     │             │     │            │
└─────────┘     └──────────┘     └─────────────┘     └────────────┘
```

### The Issue

While FastCDC works for text, it's **suboptimal**:

| Aspect | FastCDC for Text | Git for Text |
|--------|------------------|--------------|
| **Diffing** | Chunk-level (64KB blocks) | Line-level (human-readable) |
| **Merging** | Choose whole file | 3-way merge with conflict markers |
| **Delta Compression** | Per-chunk | xdelta across similar objects |
| **Conflict Resolution** | Binary choice | Interactive line editing |
| **Blame/Annotate** | Not possible | Line-by-line attribution |

### Real-World Impact

```
Scenario: Two developers edit the same config.json

With Dits (current):
  CONFLICT: config.json - choose --ours or --theirs
  (User loses one set of changes entirely)

With Git-style merge:
  <<<<<<< HEAD
  "api_url": "https://prod.example.com"
  =======
  "api_url": "https://staging.example.com"
  >>>>>>> feature-branch
  (User can manually combine both changes)
```

---

## The Solution: Hybrid Storage

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DITS REPOSITORY                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐         ┌─────────────────────────────┐   │
│  │   TEXT FILES        │         │   BINARY/MEDIA FILES        │   │
│  │   (.txt, .json,     │         │   (.mp4, .mov, .prproj,     │   │
│  │    .md, .xml, etc.) │         │    .psd, .blend, etc.)      │   │
│  └──────────┬──────────┘         └──────────────┬──────────────┘   │
│             │                                    │                   │
│             ▼                                    ▼                   │
│  ┌─────────────────────┐         ┌─────────────────────────────┐   │
│  │   LIBGIT2 ENGINE    │         │   DITS CHUNKING ENGINE      │   │
│  │                     │         │                             │   │
│  │  • Line-based diff  │         │  • FastCDC chunking         │   │
│  │  • 3-way merge      │         │  • Keyframe alignment       │   │
│  │  • Delta compress   │         │  • BLAKE3 deduplication     │   │
│  │  • Conflict markers │         │  • Binary conflict detect   │   │
│  │  • Blame support    │         │  • Chunk-level delta sync   │   │
│  └──────────┬──────────┘         └──────────────┬──────────────┘   │
│             │                                    │                   │
│             ▼                                    ▼                   │
│  ┌─────────────────────┐         ┌─────────────────────────────┐   │
│  │  .dits/git-objects/ │         │  .dits/objects/chunks/      │   │
│  │  (Git object store) │         │  (Dits chunk store)         │   │
│  └─────────────────────┘         └─────────────────────────────┘   │
│                                                                      │
│                     ┌───────────────────────┐                       │
│                     │   UNIFIED MANIFEST    │                       │
│                     │   (tracks both types) │                       │
│                     └───────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Classification

```rust
/// File storage strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StorageStrategy {
    /// Use libgit2 for text handling
    GitText,
    /// Use Dits chunking for binary/media
    DitsChunk,
    /// Hybrid: Git for metadata, Dits for payload (e.g., NLE projects)
    Hybrid,
}

/// Determine storage strategy for a file
pub fn classify_file(path: &Path, content: &[u8]) -> StorageStrategy {
    // 1. Check .ditsattributes overrides
    if let Some(attr) = get_attribute(path, "storage") {
        return match attr.as_str() {
            "git" => StorageStrategy::GitText,
            "dits" => StorageStrategy::DitsChunk,
            "hybrid" => StorageStrategy::Hybrid,
            _ => classify_by_content(path, content),
        };
    }

    // 2. Check extension-based rules
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext.to_lowercase().as_str() {
        // Always Git (text)
        "txt" | "md" | "json" | "yaml" | "yml" | "toml" | "xml" |
        "html" | "css" | "js" | "ts" | "jsx" | "tsx" | "py" | "rs" |
        "go" | "java" | "c" | "cpp" | "h" | "hpp" | "sh" | "bash" |
        "zsh" | "fish" | "ps1" | "bat" | "sql" | "graphql" | "proto" |
        "csv" | "tsv" | "ini" | "cfg" | "conf" | "env" | "editorconfig" |
        "gitignore" | "gitattributes" | "dockerignore" | "prettierrc" |
        "eslintrc" | "babelrc" => StorageStrategy::GitText,

        // Always Dits (binary/media)
        "mp4" | "mov" | "mkv" | "avi" | "webm" | "mxf" | "r3d" | "braw" |
        "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" |
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "tiff" | "raw" | "dng" |
        "psd" | "ai" | "eps" | "svg" | "xcf" |
        "blend" | "fbx" | "obj" | "gltf" | "glb" | "usd" | "abc" |
        "zip" | "tar" | "gz" | "7z" | "rar" |
        "exe" | "dll" | "so" | "dylib" | "a" |
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" => StorageStrategy::DitsChunk,

        // Hybrid (NLE projects - XML/SQLite with references)
        "prproj" | "aep" | "drp" | "fcpxml" | "otio" => StorageStrategy::Hybrid,

        // Unknown - analyze content
        _ => classify_by_content(path, content),
    }
}

/// Analyze content to determine if text or binary
fn classify_by_content(path: &Path, content: &[u8]) -> StorageStrategy {
    // Check for null bytes (binary indicator)
    if content.iter().take(8192).any(|&b| b == 0) {
        return StorageStrategy::DitsChunk;
    }

    // Check if valid UTF-8
    if std::str::from_utf8(content).is_ok() {
        // Additional heuristic: reasonable line lengths
        let avg_line_len = content.split(|&b| b == b'\n')
            .map(|line| line.len())
            .sum::<usize>() / content.split(|&b| b == b'\n').count().max(1);

        if avg_line_len < 1000 {
            return StorageStrategy::GitText;
        }
    }

    // Default to Dits for anything uncertain
    StorageStrategy::DitsChunk
}
```

---

## Implementation Details

### 1. Git Object Store Integration

Create a separate Git object store within .dits for text files:

```
.dits/
├── HEAD
├── config
├── index                    # Unified index (tracks both storage types)
├── objects/
│   ├── chunks/             # Dits: Binary file chunks
│   │   └── {aa}/{hash}
│   ├── manifests/          # Dits: Chunk manifests
│   └── git/                # Git: Text file objects (NEW)
│       ├── pack/           # Git pack files
│       └── {aa}/{hash}     # Loose git objects
├── refs/
│   ├── heads/
│   └── tags/
└── git-index               # Git-specific index for text files (NEW)
```

### 2. Unified Index Format

Extend the index to track storage strategy per file:

```rust
/// Extended index entry
pub struct IndexEntry {
    // Standard fields
    pub ctime: Timespec,
    pub mtime: Timespec,
    pub mode: u32,
    pub size: u64,
    pub path: String,

    // Hybrid storage fields
    pub storage: StorageStrategy,
    pub hash: Hash,           // BLAKE3 for Dits, SHA-1 for Git (wrapped)

    // Git-specific (when storage == GitText)
    pub git_oid: Option<git2::Oid>,

    // Dits-specific (when storage == DitsChunk)
    pub manifest_hash: Option<Hash>,
    pub chunk_count: Option<u32>,
}
```

### 3. libgit2 Integration

```rust
use git2::{Repository as GitRepo, Diff, DiffOptions, MergeOptions};

/// Git engine wrapper for text file operations
pub struct GitTextEngine {
    /// Path to .dits/objects/git
    git_dir: PathBuf,
    /// libgit2 repository handle
    repo: GitRepo,
}

impl GitTextEngine {
    /// Initialize Git object store within Dits repository
    pub fn init(dits_dir: &Path) -> Result<Self> {
        let git_dir = dits_dir.join("objects/git");
        fs::create_dir_all(&git_dir)?;

        // Initialize bare Git repository for object storage
        let repo = GitRepo::init_bare(&git_dir)?;

        Ok(Self { git_dir, repo })
    }

    /// Store text content using Git's object model
    pub fn store_blob(&self, content: &[u8]) -> Result<git2::Oid> {
        let oid = self.repo.blob(content)?;
        Ok(oid)
    }

    /// Compute line-based diff between two blobs
    pub fn diff_blobs(
        &self,
        old_oid: git2::Oid,
        new_oid: git2::Oid,
        path: &str,
    ) -> Result<String> {
        let old_blob = self.repo.find_blob(old_oid)?;
        let new_blob = self.repo.find_blob(new_oid)?;

        let mut diff_output = String::new();

        self.repo.diff_blobs(
            Some(&old_blob), Some(path),
            Some(&new_blob), Some(path),
            None,
            None,
            None,
            None,
            Some(&mut |delta, hunk, line| {
                // Build unified diff output
                match line.origin() {
                    '+' => diff_output.push_str(&format!("+{}", line.content_str().unwrap_or(""))),
                    '-' => diff_output.push_str(&format!("-{}", line.content_str().unwrap_or(""))),
                    ' ' => diff_output.push_str(&format!(" {}", line.content_str().unwrap_or(""))),
                    _ => {}
                }
                true
            }),
        )?;

        Ok(diff_output)
    }

    /// Perform 3-way merge with conflict markers
    pub fn merge_blobs(
        &self,
        base_oid: Option<git2::Oid>,
        ours_oid: git2::Oid,
        theirs_oid: git2::Oid,
        path: &str,
    ) -> Result<MergeResult> {
        let ours = self.repo.find_blob(ours_oid)?;
        let theirs = self.repo.find_blob(theirs_oid)?;
        let base = base_oid.map(|oid| self.repo.find_blob(oid)).transpose()?;

        let mut opts = MergeOptions::new();
        opts.file_favor(git2::FileFavor::Normal);

        let merge_result = self.repo.merge_file(
            base.as_ref().map(|b| b.content()).unwrap_or(&[]),
            None,
            ours.content(),
            Some(path),
            theirs.content(),
            Some(path),
            Some(&opts),
        )?;

        if merge_result.is_conflicted() {
            Ok(MergeResult::Conflict {
                content: merge_result.content().to_vec(),
                has_markers: true,
            })
        } else {
            Ok(MergeResult::Clean {
                content: merge_result.content().to_vec(),
            })
        }
    }

    /// Get blame information for a file
    pub fn blame(&self, path: &str, commit_oid: git2::Oid) -> Result<Vec<BlameLine>> {
        let blame = self.repo.blame_file(
            Path::new(path),
            Some(git2::BlameOptions::new().newest_commit(commit_oid)),
        )?;

        let mut lines = Vec::new();
        for hunk in blame.iter() {
            let sig = hunk.final_signature();
            for line_no in hunk.final_start_line()..hunk.final_start_line() + hunk.lines_in_hunk() {
                lines.push(BlameLine {
                    line_number: line_no,
                    commit: hunk.final_commit_id().to_string(),
                    author: sig.name().unwrap_or("Unknown").to_string(),
                    timestamp: sig.when().seconds(),
                });
            }
        }

        Ok(lines)
    }
}

pub enum MergeResult {
    Clean { content: Vec<u8> },
    Conflict { content: Vec<u8>, has_markers: bool },
}

pub struct BlameLine {
    pub line_number: usize,
    pub commit: String,
    pub author: String,
    pub timestamp: i64,
}
```

### 4. Unified Diff Command

```rust
/// Unified diff that handles both storage strategies
pub fn diff_file(
    repo: &Repository,
    path: &str,
    old_version: &FileVersion,
    new_version: &FileVersion,
) -> Result<Diff> {
    let strategy = repo.get_storage_strategy(path)?;

    match strategy {
        StorageStrategy::GitText => {
            // Use libgit2 for line-based diff
            let git_engine = repo.git_engine()?;
            let diff_text = git_engine.diff_blobs(
                old_version.git_oid.ok_or(Error::MissingGitOid)?,
                new_version.git_oid.ok_or(Error::MissingGitOid)?,
                path,
            )?;

            Ok(Diff::Text(parse_unified_diff(&diff_text)?))
        }

        StorageStrategy::DitsChunk => {
            // Use chunk-based diff
            let old_manifest = repo.load_manifest(&old_version.manifest_hash.unwrap())?;
            let new_manifest = repo.load_manifest(&new_version.manifest_hash.unwrap())?;

            let chunk_diff = ChunkDiff::compute(
                &old_manifest.chunks,
                &new_manifest.chunks,
            );

            Ok(Diff::Chunk(chunk_diff))
        }

        StorageStrategy::Hybrid => {
            // For NLE projects: diff metadata with Git, note chunk changes
            let metadata_diff = diff_nle_metadata(repo, path, old_version, new_version)?;
            let chunk_diff = diff_nle_payload(repo, path, old_version, new_version)?;

            Ok(Diff::Hybrid { metadata_diff, chunk_diff })
        }
    }
}
```

### 5. Unified Merge Strategy

```rust
/// Merge files based on storage strategy
pub fn merge_file(
    repo: &Repository,
    path: &str,
    base: Option<&FileVersion>,
    ours: &FileVersion,
    theirs: &FileVersion,
) -> Result<MergeOutcome> {
    let strategy = repo.get_storage_strategy(path)?;

    match strategy {
        StorageStrategy::GitText => {
            // 3-way merge with conflict markers
            let git_engine = repo.git_engine()?;
            let result = git_engine.merge_blobs(
                base.and_then(|b| b.git_oid),
                ours.git_oid.ok_or(Error::MissingGitOid)?,
                theirs.git_oid.ok_or(Error::MissingGitOid)?,
                path,
            )?;

            match result {
                MergeResult::Clean { content } => {
                    // Store merged content
                    let oid = git_engine.store_blob(&content)?;
                    Ok(MergeOutcome::Clean { git_oid: Some(oid), content })
                }
                MergeResult::Conflict { content, .. } => {
                    // Store conflicted content with markers
                    let oid = git_engine.store_blob(&content)?;
                    Ok(MergeOutcome::Conflict {
                        content,
                        conflict_type: ConflictType::TextWithMarkers,
                    })
                }
            }
        }

        StorageStrategy::DitsChunk => {
            // Binary files: no merge, choose one
            if ours.hash == theirs.hash {
                Ok(MergeOutcome::Clean { git_oid: None, content: vec![] })
            } else {
                Ok(MergeOutcome::Conflict {
                    content: vec![],
                    conflict_type: ConflictType::Binary,
                })
            }
        }

        StorageStrategy::Hybrid => {
            // NLE projects: attempt timeline-level merge
            merge_nle_project(repo, path, base, ours, theirs)
        }
    }
}

pub enum MergeOutcome {
    Clean {
        git_oid: Option<git2::Oid>,
        content: Vec<u8>,
    },
    Conflict {
        content: Vec<u8>,
        conflict_type: ConflictType,
    },
}

pub enum ConflictType {
    /// Text conflict with <<<<<<< markers
    TextWithMarkers,
    /// Binary conflict - must choose version
    Binary,
    /// NLE project with sequence-level conflicts
    NleProject { conflicts: Vec<NleConflict> },
}
```

---

## .ditsattributes Configuration

Users can override storage strategy per-path:

```
# .ditsattributes

# Force Git storage for specific large text files
data/*.json storage=git

# Force Dits storage for generated code
generated/*.rs storage=dits

# Hybrid for project files
*.prproj storage=hybrid
*.aep storage=hybrid

# Default text patterns (redundant but explicit)
*.md storage=git
*.txt storage=git
*.yaml storage=git

# Default binary patterns (redundant but explicit)
*.mp4 storage=dits
*.mov storage=dits
```

---

## New Commands

### `dits blame`

Line-by-line attribution for text files:

```bash
$ dits blame src/config.rs
a1b2c3d4 (Jane Developer 2024-01-15) 1) use serde::{Deserialize, Serialize};
a1b2c3d4 (Jane Developer 2024-01-15) 2)
b2c3d4e5 (Bob Editor    2024-01-20) 3) #[derive(Debug, Clone, Serialize, Deserialize)]
b2c3d4e5 (Bob Editor    2024-01-20) 4) pub struct Config {
a1b2c3d4 (Jane Developer 2024-01-15) 5)     pub name: String,
c3d4e5f6 (Jane Developer 2024-01-25) 6)     pub chunk_size: usize,  // Added in refactor
...
```

### Enhanced `dits diff`

Automatically uses appropriate diff strategy:

```bash
# Text file - shows line diff
$ dits diff README.md
--- a/README.md
+++ b/README.md
@@ -10,6 +10,7 @@
 ## Features

 - Fast chunking
+- Hybrid storage (NEW!)
 - Video awareness

# Binary file - shows chunk stats
$ dits diff video.mp4
Binary files a/video.mp4 and b/video.mp4 differ
  Chunks: 156 kept, 3 added, 2 removed
  Size: 1.2 GB -> 1.25 GB (+50 MB)
  Similarity: 95.2%
```

### Enhanced `dits merge`

Handles text and binary differently:

```bash
$ dits merge feature-branch
Auto-merging src/config.rs           # Text: 3-way merge
Auto-merging README.md               # Text: 3-way merge
CONFLICT (content): Merge conflict in src/utils.rs  # Text: has markers
CONFLICT (binary): Merge conflict in assets/logo.png  # Binary: choose version

Automatic merge failed; fix conflicts and then commit the result.

$ cat src/utils.rs
<<<<<<< HEAD
const VERSION: &str = "1.0.0";
=======
const VERSION: &str = "1.1.0-beta";
>>>>>>> feature-branch

$ dits checkout --theirs assets/logo.png
$ # Edit src/utils.rs to resolve text conflict
$ dits add .
$ dits commit
```

---

## Migration Path

### Existing Repositories

For repositories created before Phase 3.6:

```bash
$ dits upgrade
Upgrading repository format to v2 (hybrid storage)...
  Analyzing 1,234 files...
  Identified 456 text files for Git migration
  Migrating text file history...
  Creating Git object store...
  Updating manifest references...
Done! Repository upgraded to hybrid storage.

$ dits status
On branch main
Storage summary:
  Text files (Git):    456 files
  Binary files (Dits): 778 files
```

### Conversion Script

```rust
pub async fn upgrade_to_hybrid(repo: &mut Repository) -> Result<UpgradeReport> {
    let mut report = UpgradeReport::default();

    // 1. Initialize Git object store
    let git_engine = GitTextEngine::init(&repo.dits_dir)?;

    // 2. Analyze all tracked files
    for entry in repo.index.entries() {
        let strategy = classify_file(&entry.path, &repo.read_blob(&entry.hash)?);

        if strategy == StorageStrategy::GitText {
            // 3. Migrate text file to Git
            let content = repo.read_blob(&entry.hash)?;
            let git_oid = git_engine.store_blob(&content)?;

            // 4. Update index entry
            entry.storage = StorageStrategy::GitText;
            entry.git_oid = Some(git_oid);

            report.text_files_migrated += 1;
        } else {
            entry.storage = strategy;
            report.binary_files_kept += 1;
        }
    }

    // 5. Update repository version
    repo.config.set("core.repository_version", 2)?;
    repo.config.set("core.hybrid_storage", true)?;

    Ok(report)
}
```

---

## Performance Considerations

### Memory Usage

| Operation | Git (Text) | Dits (Binary) |
|-----------|------------|---------------|
| Small file diff | In-memory | In-memory |
| Large file diff | Streaming | Streaming chunks |
| Merge | In-memory (delta) | N/A (choose version) |
| Blame | Commit walking | Not supported |

### I/O Patterns

```rust
/// Optimize file access based on storage type
pub fn read_file_optimized(repo: &Repository, path: &str) -> Result<Vec<u8>> {
    let entry = repo.index.get(path)?;

    match entry.storage {
        StorageStrategy::GitText => {
            // Git: Single read, may decompress delta chain
            let git_engine = repo.git_engine()?;
            let blob = git_engine.repo.find_blob(entry.git_oid.unwrap())?;
            Ok(blob.content().to_vec())
        }

        StorageStrategy::DitsChunk => {
            // Dits: May require multiple chunk reads
            let manifest = repo.load_manifest(&entry.manifest_hash.unwrap())?;
            let mut content = Vec::with_capacity(entry.size as usize);

            for chunk_ref in &manifest.chunks {
                let chunk = repo.load_chunk(&chunk_ref.hash)?;
                content.extend_from_slice(&chunk.data);
            }

            Ok(content)
        }

        StorageStrategy::Hybrid => {
            // Hybrid: Combine Git metadata with Dits payload
            todo!("Implement hybrid read")
        }
    }
}
```

---

## Dependencies

```toml
# Cargo.toml additions for Phase 3.6

[dependencies]
# Git integration
git2 = { version = "0.18", features = ["vendored-libgit2"] }

# Already present
blake3 = "1.5"
```

### Vendored libgit2

Using vendored libgit2 ensures:
- Consistent behavior across platforms
- No system dependency requirements
- Predictable feature set

---

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_classification() {
        // Text files
        assert_eq!(
            classify_file(Path::new("README.md"), b"# Hello\n\nWorld"),
            StorageStrategy::GitText
        );

        // Binary files
        assert_eq!(
            classify_file(Path::new("video.mp4"), &[0x00, 0x00, 0x00, 0x1C]),
            StorageStrategy::DitsChunk
        );

        // Hybrid files
        assert_eq!(
            classify_file(Path::new("project.prproj"), b"<?xml"),
            StorageStrategy::Hybrid
        );
    }

    #[test]
    fn test_text_merge_with_conflicts() {
        let base = "line1\nline2\nline3\n";
        let ours = "line1\nmodified by us\nline3\n";
        let theirs = "line1\nmodified by them\nline3\n";

        let result = merge_text(base, ours, theirs);

        assert!(matches!(result, MergeResult::Conflict { .. }));
        let content = match result {
            MergeResult::Conflict { content, .. } => String::from_utf8(content).unwrap(),
            _ => panic!("Expected conflict"),
        };
        assert!(content.contains("<<<<<<<"));
        assert!(content.contains(">>>>>>>"));
    }

    #[test]
    fn test_blame_attribution() {
        // ... test blame functionality
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_hybrid_workflow() {
    let repo = TestRepo::new().await;

    // Add text and binary files
    repo.write_file("README.md", "# Project\n").await;
    repo.write_file("video.mp4", &generate_test_video()).await;

    repo.run("add .");
    repo.run("commit -m 'Initial'");

    // Create branch and make changes
    repo.run("branch feature");
    repo.run("switch feature");

    repo.write_file("README.md", "# Project\n\n## New Section\n").await;
    repo.write_file("video.mp4", &generate_modified_video()).await;

    repo.run("commit -am 'Feature changes'");

    // Switch back and make different changes
    repo.run("switch main");
    repo.write_file("README.md", "# Project\n\n## Different Section\n").await;
    repo.run("commit -am 'Main changes'");

    // Merge
    let output = repo.run("merge feature");

    // Text file should have conflict markers
    let readme = repo.read_file("README.md").await;
    assert!(readme.contains("<<<<<<<"));

    // Binary file should be a binary conflict
    assert!(output.contains("CONFLICT (binary): video.mp4"));
}
```

---

## Rollout Plan

### Phase 3.6.1: Foundation
- [ ] Create .dits/objects/git directory structure
- [ ] Implement GitTextEngine wrapper
- [ ] Add file classification logic
- [ ] Update index format for storage strategy

### Phase 3.6.2: Diff Integration
- [ ] Implement unified diff command
- [ ] Add blame support for text files
- [ ] Update diff output formatting

### Phase 3.6.3: Merge Integration
- [ ] Implement 3-way merge for text files
- [ ] Add conflict marker support
- [ ] Update merge command for hybrid handling

### Phase 3.6.4: Migration & Polish
- [ ] Implement repository upgrade command
- [ ] Add .ditsattributes parsing
- [ ] Write migration documentation
- [ ] Performance optimization

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Text file merge success rate | > 95% (up from 0% auto-merge) |
| Diff readability | Line-level for text |
| Blame availability | All text files |
| Performance overhead | < 5% vs pure Dits |
| Migration time | < 1 min per 1000 files |

---

## References

- [libgit2 Documentation](https://libgit2.org/)
- [git2-rs Crate](https://docs.rs/git2/)
- [Git Internals - Transfer Protocols](https://git-scm.com/book/en/v2/Git-Internals-Transfer-Protocols)
- [Three-Way Merge Algorithm](https://en.wikipedia.org/wiki/Merge_(version_control)#Three-way_merge)
