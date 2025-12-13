# Hybrid Text Storage Architecture

This document provides the detailed technical specification for integrating libgit2 as the text file storage engine within Dits.

> **Related:** [Phase 3.6 Action Plan](../action-plan/phase3.6-hybrid-storage.md) | [Local Storage Format](./local-storage.md)

---

## Design Principles

### 1. Right Tool for the Job

| File Type | Best Engine | Reason |
|-----------|-------------|--------|
| Text | Git (libgit2) | Line-based operations, delta compression, proven algorithms |
| Binary | Dits CDC | Content-defined chunking, deduplication, keyframe alignment |
| Hybrid | Both | Metadata (Git) + Payload (Dits) |

### 2. Seamless Integration

Users shouldn't need to think about which engine is used:

```bash
# These commands work identically regardless of storage engine
dits add README.md video.mp4
dits commit -m "Add files"
dits diff HEAD~1
dits merge feature-branch
```

### 3. Single Source of Truth

- One index file tracks all files
- One commit object references all content
- One tree structure represents directory state

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER COMMANDS                                 │
│  dits add │ dits commit │ dits diff │ dits merge │ dits blame           │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      FILE CLASSIFIER      │
                    │                           │
                    │  1. Check .ditsattributes │
                    │  2. Check extension       │
                    │  3. Analyze content       │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │  TEXT FILE  │     │ BINARY FILE │     │   HYBRID    │
       │   Engine    │     │   Engine    │     │   Engine    │
       └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
              │                   │                   │
              ▼                   ▼                   ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │   libgit2   │     │  FastCDC    │     │   Both      │
       │             │     │  Chunker    │     │             │
       │ • blob()    │     │             │     │ • Git meta  │
       │ • diff()    │     │ • chunk()   │     │ • CDC data  │
       │ • merge()   │     │ • dedup()   │     │             │
       │ • blame()   │     │             │     │             │
       └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
              │                   │                   │
              ▼                   ▼                   ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │ .dits/      │     │ .dits/      │     │ .dits/      │
       │ objects/git │     │ objects/    │     │ objects/    │
       │             │     │ chunks/     │     │ (both)      │
       └─────────────┘     └─────────────┘     └─────────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      UNIFIED INDEX        │
                    │                           │
                    │  path → (strategy, hash)  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │        COMMIT             │
                    │                           │
                    │  tree_hash (unified)      │
                    │  parent_hashes            │
                    │  message, author, etc.    │
                    └───────────────────────────┘
```

---

## File Classification System

### Classification Priority

1. **Explicit attribute** (`.ditsattributes`)
2. **Extension-based rules** (built-in)
3. **Content analysis** (fallback)

### Implementation

```rust
use std::path::Path;

/// Storage strategy for a file
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StorageStrategy {
    /// Use libgit2 for text handling
    GitText,
    /// Use Dits chunking for binary
    DitsChunk,
    /// Git for structure, Dits for payload
    Hybrid,
}

/// File classifier with caching
pub struct FileClassifier {
    /// Attribute cache (path pattern -> strategy)
    attributes: AttributeCache,
    /// Extension mappings
    extensions: ExtensionMap,
}

impl FileClassifier {
    /// Classify a file and determine storage strategy
    pub fn classify(&self, path: &Path, content: Option<&[u8]>) -> StorageStrategy {
        // 1. Check explicit attributes
        if let Some(strategy) = self.attributes.get(path) {
            return strategy;
        }

        // 2. Check extension
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if let Some(strategy) = self.extensions.get(ext) {
                return *strategy;
            }
        }

        // 3. Analyze content (if available)
        if let Some(data) = content {
            return self.analyze_content(data);
        }

        // 4. Default to binary (safer)
        StorageStrategy::DitsChunk
    }

    fn analyze_content(&self, content: &[u8]) -> StorageStrategy {
        // Check for null bytes (binary indicator)
        let sample_size = content.len().min(8192);
        if content[..sample_size].contains(&0) {
            return StorageStrategy::DitsChunk;
        }

        // Check if valid UTF-8
        if std::str::from_utf8(content).is_ok() {
            // Check line length heuristic
            let lines: Vec<_> = content.split(|&b| b == b'\n').collect();
            let avg_line_len: usize = lines.iter().map(|l| l.len()).sum::<usize>()
                / lines.len().max(1);

            if avg_line_len < 500 {
                return StorageStrategy::GitText;
            }
        }

        StorageStrategy::DitsChunk
    }
}

/// Built-in extension mappings
impl Default for ExtensionMap {
    fn default() -> Self {
        let mut map = HashMap::new();

        // Text files (Git)
        for ext in &[
            // Documentation
            "txt", "md", "markdown", "rst", "adoc", "org",
            // Data formats
            "json", "yaml", "yml", "toml", "xml", "csv", "tsv",
            // Web
            "html", "htm", "css", "scss", "sass", "less",
            // JavaScript ecosystem
            "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "svelte",
            // Systems programming
            "rs", "go", "c", "cpp", "cc", "cxx", "h", "hpp", "hxx",
            // Scripting
            "py", "rb", "pl", "pm", "php", "lua", "sh", "bash", "zsh", "fish",
            // JVM
            "java", "kt", "kts", "scala", "groovy", "clj", "cljs",
            // .NET
            "cs", "fs", "vb",
            // Config
            "ini", "cfg", "conf", "env", "properties",
            // Build
            "makefile", "cmake", "gradle", "sbt",
            // SQL
            "sql", "psql", "mysql",
            // Other
            "graphql", "proto", "thrift", "avsc",
            // Git-specific
            "gitignore", "gitattributes", "gitmodules",
            // Editor configs
            "editorconfig", "prettierrc", "eslintrc", "stylelintrc",
        ] {
            map.insert(ext.to_string(), StorageStrategy::GitText);
        }

        // Binary files (Dits)
        for ext in &[
            // Video
            "mp4", "mov", "mkv", "avi", "webm", "wmv", "flv", "m4v",
            "mxf", "r3d", "braw", "ari", "dpx", "exr",
            // Audio
            "mp3", "wav", "aac", "flac", "ogg", "m4a", "wma", "aiff",
            // Image
            "png", "jpg", "jpeg", "gif", "webp", "tiff", "tif", "bmp",
            "raw", "cr2", "nef", "dng", "arw", "orf",
            // Design
            "psd", "ai", "eps", "indd", "sketch", "fig", "xd",
            // 3D
            "blend", "fbx", "obj", "gltf", "glb", "usd", "usda", "usdc",
            "abc", "c4d", "max", "ma", "mb",
            // Archives
            "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
            // Executables
            "exe", "dll", "so", "dylib", "a", "lib",
            // Documents (binary)
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            // Fonts
            "ttf", "otf", "woff", "woff2", "eot",
            // Game assets
            "uasset", "umap", "prefab", "unity", "asset",
        ] {
            map.insert(ext.to_string(), StorageStrategy::DitsChunk);
        }

        // Hybrid files (NLE projects)
        for ext in &[
            "prproj",   // Adobe Premiere Pro
            "aep",      // Adobe After Effects
            "drp",      // DaVinci Resolve
            "fcpxml",   // Final Cut Pro
            "otio",     // OpenTimelineIO
        ] {
            map.insert(ext.to_string(), StorageStrategy::Hybrid);
        }

        ExtensionMap { map }
    }
}
```

---

## libgit2 Engine Wrapper

### Initialization

```rust
use git2::{Repository as GitRepo, ObjectType, Oid};
use std::path::{Path, PathBuf};

/// Git engine for text file operations
pub struct GitTextEngine {
    /// Path to .dits/objects/git
    git_dir: PathBuf,
    /// libgit2 repository handle
    repo: GitRepo,
}

impl GitTextEngine {
    /// Initialize Git object store within Dits repository
    pub fn init(dits_dir: &Path) -> Result<Self, GitError> {
        let git_dir = dits_dir.join("objects").join("git");
        std::fs::create_dir_all(&git_dir)?;

        // Initialize as bare repository (no working directory)
        let repo = GitRepo::init_bare(&git_dir)?;

        Ok(Self { git_dir, repo })
    }

    /// Open existing Git object store
    pub fn open(dits_dir: &Path) -> Result<Self, GitError> {
        let git_dir = dits_dir.join("objects").join("git");
        let repo = GitRepo::open_bare(&git_dir)?;

        Ok(Self { git_dir, repo })
    }

    /// Store a blob and return its OID
    pub fn store_blob(&self, content: &[u8]) -> Result<Oid, GitError> {
        let oid = self.repo.blob(content)?;
        Ok(oid)
    }

    /// Read a blob by OID
    pub fn read_blob(&self, oid: Oid) -> Result<Vec<u8>, GitError> {
        let blob = self.repo.find_blob(oid)?;
        Ok(blob.content().to_vec())
    }

    /// Check if a blob exists
    pub fn blob_exists(&self, oid: Oid) -> bool {
        self.repo.find_blob(oid).is_ok()
    }
}
```

### Diff Operations

```rust
use git2::{DiffOptions, DiffFormat};

impl GitTextEngine {
    /// Compute unified diff between two blobs
    pub fn diff_blobs(
        &self,
        old_oid: Option<Oid>,
        new_oid: Option<Oid>,
        path: &str,
        options: &DiffConfig,
    ) -> Result<UnifiedDiff, GitError> {
        let old_blob = old_oid.map(|oid| self.repo.find_blob(oid)).transpose()?;
        let new_blob = new_oid.map(|oid| self.repo.find_blob(oid)).transpose()?;

        let mut diff_opts = DiffOptions::new();
        diff_opts.context_lines(options.context_lines);

        if options.ignore_whitespace {
            diff_opts.ignore_whitespace(true);
        }
        if options.ignore_whitespace_change {
            diff_opts.ignore_whitespace_change(true);
        }

        let mut hunks = Vec::new();
        let mut current_hunk: Option<DiffHunk> = None;
        let mut stats = DiffStats::default();

        self.repo.diff_blobs(
            old_blob.as_ref(),
            Some(path),
            new_blob.as_ref(),
            Some(path),
            Some(&mut diff_opts),
            None,
            Some(&mut |_delta, hunk| {
                // Finalize previous hunk
                if let Some(h) = current_hunk.take() {
                    hunks.push(h);
                }

                // Start new hunk
                if let Some(h) = hunk {
                    current_hunk = Some(DiffHunk {
                        old_start: h.old_start(),
                        old_lines: h.old_lines(),
                        new_start: h.new_start(),
                        new_lines: h.new_lines(),
                        header: String::from_utf8_lossy(h.header()).to_string(),
                        lines: Vec::new(),
                    });
                }
                true
            }),
            Some(&mut |_delta, _hunk, line| {
                if let Some(ref mut hunk) = current_hunk {
                    let line_type = match line.origin() {
                        '+' => {
                            stats.additions += 1;
                            DiffLineType::Addition
                        }
                        '-' => {
                            stats.deletions += 1;
                            DiffLineType::Deletion
                        }
                        ' ' => DiffLineType::Context,
                        '\\' => DiffLineType::NoNewline,
                        _ => return true,
                    };

                    hunk.lines.push(DiffLine {
                        line_type,
                        content: String::from_utf8_lossy(line.content()).to_string(),
                        old_lineno: line.old_lineno(),
                        new_lineno: line.new_lineno(),
                    });
                }
                true
            }),
        )?;

        // Don't forget the last hunk
        if let Some(h) = current_hunk {
            hunks.push(h);
        }

        Ok(UnifiedDiff {
            old_path: old_oid.map(|_| path.to_string()),
            new_path: new_oid.map(|_| path.to_string()),
            hunks,
            stats,
        })
    }
}
```

### Merge Operations

```rust
use git2::{MergeOptions, MergeFileResult};

impl GitTextEngine {
    /// Perform 3-way merge with conflict markers
    pub fn merge_blobs(
        &self,
        ancestor_oid: Option<Oid>,
        ours_oid: Oid,
        theirs_oid: Oid,
        path: &str,
        options: &MergeConfig,
    ) -> Result<MergeResult, GitError> {
        let ancestor = ancestor_oid
            .map(|oid| self.repo.find_blob(oid))
            .transpose()?;
        let ours = self.repo.find_blob(ours_oid)?;
        let theirs = self.repo.find_blob(theirs_oid)?;

        let ancestor_content = ancestor.as_ref().map(|b| b.content()).unwrap_or(&[]);

        let mut opts = MergeOptions::new();
        opts.file_favor(match options.favor {
            MergeFavor::Normal => git2::FileFavor::Normal,
            MergeFavor::Ours => git2::FileFavor::Ours,
            MergeFavor::Theirs => git2::FileFavor::Theirs,
            MergeFavor::Union => git2::FileFavor::Union,
        });

        let result = self.repo.merge_file(
            ancestor_content,
            Some(&format!("{} (base)", path)),
            ours.content(),
            Some(&format!("{} (ours)", path)),
            theirs.content(),
            Some(&format!("{} (theirs)", path)),
            Some(&opts),
        )?;

        let content = result.content().to_vec();

        if result.is_conflicted() {
            // Count conflict markers
            let marker_count = content
                .windows(7)
                .filter(|w| w == b"<<<<<<<" || w == b"=======" || w == b">>>>>>>")
                .count() / 3;

            Ok(MergeResult::Conflict {
                content,
                marker_count,
            })
        } else {
            Ok(MergeResult::Clean { content })
        }
    }
}

pub enum MergeResult {
    Clean { content: Vec<u8> },
    Conflict { content: Vec<u8>, marker_count: usize },
}

pub enum MergeFavor {
    Normal,
    Ours,
    Theirs,
    Union,
}
```

### Blame Operations

```rust
use git2::{BlameOptions, Blame};

impl GitTextEngine {
    /// Get blame information for a file at a specific commit
    pub fn blame(
        &self,
        path: &str,
        commit_oid: Oid,
        options: &BlameConfig,
    ) -> Result<BlameResult, GitError> {
        let mut blame_opts = BlameOptions::new();
        blame_opts.newest_commit(commit_oid);

        if let Some(oldest) = options.oldest_commit {
            blame_opts.oldest_commit(oldest);
        }

        if options.ignore_whitespace {
            blame_opts.ignore_whitespace(true);
        }

        let blame = self.repo.blame_file(Path::new(path), Some(&mut blame_opts))?;

        let mut lines = Vec::new();
        for hunk in blame.iter() {
            let sig = hunk.final_signature();
            let commit_id = hunk.final_commit_id();

            for line_offset in 0..hunk.lines_in_hunk() {
                let line_no = hunk.final_start_line() + line_offset;

                lines.push(BlameLine {
                    line_number: line_no,
                    commit_hash: commit_id.to_string(),
                    author_name: sig.name().unwrap_or("Unknown").to_string(),
                    author_email: sig.email().unwrap_or("").to_string(),
                    timestamp: sig.when().seconds(),
                    timezone_offset: sig.when().offset_minutes(),
                });
            }
        }

        Ok(BlameResult { path: path.to_string(), lines })
    }
}

pub struct BlameResult {
    pub path: String,
    pub lines: Vec<BlameLine>,
}

pub struct BlameLine {
    pub line_number: usize,
    pub commit_hash: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub timezone_offset: i32,
}
```

---

## Unified Index Format

### Extended Index Entry

```rust
use serde::{Deserialize, Serialize};

/// Index entry with hybrid storage support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexEntry {
    // === Standard fields ===
    pub path: String,
    pub mode: u32,
    pub size: u64,
    pub mtime_secs: u64,
    pub mtime_nsecs: u32,

    // === Storage strategy ===
    pub storage: StorageStrategy,

    // === Git storage (when storage == GitText) ===
    /// SHA-1 OID from libgit2
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_oid: Option<[u8; 20]>,

    // === Dits storage (when storage == DitsChunk) ===
    /// BLAKE3 content hash
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blake3_hash: Option<[u8; 32]>,
    /// Manifest hash (for multi-chunk files)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manifest_hash: Option<[u8; 32]>,
    /// Number of chunks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chunk_count: Option<u32>,

    // === Conflict state ===
    pub stage: u8, // 0 = normal, 1-3 = conflict stages
}

impl IndexEntry {
    /// Create entry for a text file (Git storage)
    pub fn new_text(path: String, mode: u32, size: u64, git_oid: [u8; 20]) -> Self {
        Self {
            path,
            mode,
            size,
            mtime_secs: 0,
            mtime_nsecs: 0,
            storage: StorageStrategy::GitText,
            git_oid: Some(git_oid),
            blake3_hash: None,
            manifest_hash: None,
            chunk_count: None,
            stage: 0,
        }
    }

    /// Create entry for a binary file (Dits storage)
    pub fn new_binary(
        path: String,
        mode: u32,
        size: u64,
        blake3_hash: [u8; 32],
        manifest_hash: Option<[u8; 32]>,
        chunk_count: u32,
    ) -> Self {
        Self {
            path,
            mode,
            size,
            mtime_secs: 0,
            mtime_nsecs: 0,
            storage: StorageStrategy::DitsChunk,
            git_oid: None,
            blake3_hash: Some(blake3_hash),
            manifest_hash,
            chunk_count: Some(chunk_count),
            stage: 0,
        }
    }
}
```

### Binary Index Format

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
├─────────────────────────────────────────────────────────────────┤
│ Magic: "DIDX" (4 bytes)                                          │
│ Version: 3 (4 bytes, u32 BE) - Version 3 adds hybrid support    │
│ Entry count (4 bytes, u32 BE)                                    │
│ Extensions offset (4 bytes, u32 BE)                              │
├─────────────────────────────────────────────────────────────────┤
│ ENTRIES (variable)                                               │
├─────────────────────────────────────────────────────────────────┤
│ For each entry:                                                  │
│   mtime_secs (8 bytes)                                          │
│   mtime_nsecs (4 bytes)                                         │
│   mode (4 bytes)                                                │
│   size (8 bytes)                                                │
│   storage (1 byte): 0=GitText, 1=DitsChunk, 2=Hybrid           │
│   stage (1 byte): 0-3                                           │
│   flags (2 bytes)                                               │
│                                                                  │
│   if storage == GitText:                                        │
│     git_oid (20 bytes, SHA-1)                                   │
│                                                                  │
│   if storage == DitsChunk:                                      │
│     blake3_hash (32 bytes)                                      │
│     manifest_hash (32 bytes, or 0x00 if single-chunk)          │
│     chunk_count (4 bytes)                                       │
│                                                                  │
│   if storage == Hybrid:                                         │
│     git_oid (20 bytes) - metadata                              │
│     blake3_hash (32 bytes) - payload                           │
│                                                                  │
│   path_len (2 bytes)                                            │
│   path (variable, UTF-8)                                        │
│   padding (to 8-byte boundary)                                  │
├─────────────────────────────────────────────────────────────────┤
│ EXTENSIONS (variable)                                            │
├─────────────────────────────────────────────────────────────────┤
│ CHECKSUM: BLAKE3 of all preceding (32 bytes)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tree Object Format

The unified tree object references both Git OIDs and Dits hashes:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeEntry {
    pub name: String,
    pub mode: u32,
    pub entry_type: TreeEntryType,
    pub storage: StorageStrategy,

    // Hash depends on storage type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_oid: Option<[u8; 20]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dits_hash: Option<[u8; 32]>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TreeEntryType {
    Blob,       // Regular file
    Tree,       // Subdirectory
    Manifest,   // Chunked file manifest
}
```

---

## Configuration

### .ditsattributes

```
# Force Git storage for specific patterns
data/*.json storage=git
config/*.yaml storage=git

# Force Dits storage for generated files
generated/*.rs storage=dits
build/**/* storage=dits

# Hybrid for NLE projects
*.prproj storage=hybrid
*.aep storage=hybrid

# Default handling (explicit)
*.md storage=git
*.mp4 storage=dits
```

### Repository Config

```toml
# .dits/config
[core]
repository_format_version = 3
hybrid_storage = true

[storage]
# Override default classification
default_text_strategy = "git"
default_binary_strategy = "dits"

# Size threshold for forcing chunk storage
# Files larger than this always use Dits, even if text
large_text_threshold = 10485760  # 10MB

[git]
# Git-specific settings passed to libgit2
diff_algorithm = "histogram"  # myers, patience, histogram, minimal
merge_verbosity = 1
```

---

## Performance Considerations

### When to Use Each Engine

| Scenario | Recommended | Reason |
|----------|-------------|--------|
| Small text file (< 100KB) | Git | Fast, delta compression |
| Large text file (> 10MB) | Dits | Streaming, memory efficient |
| Config files | Git | Frequent merges |
| Generated code | Dits | Bulk changes, no merge needed |
| Documentation | Git | Human review, blame needed |
| Log files | Dits | Append-only, no merge |

### Memory Usage

```rust
/// Memory-efficient file addition
pub fn add_file(repo: &Repository, path: &Path) -> Result<IndexEntry> {
    let metadata = fs::metadata(path)?;
    let size = metadata.len();

    let strategy = repo.classifier.classify(path, None);

    match strategy {
        StorageStrategy::GitText => {
            if size > LARGE_FILE_THRESHOLD {
                // Stream large text files
                add_large_text_file(repo, path)
            } else {
                // Load small files into memory
                let content = fs::read(path)?;
                let oid = repo.git_engine.store_blob(&content)?;
                Ok(IndexEntry::new_text(path.to_string_lossy().into(), 0o100644, size, oid.into()))
            }
        }
        StorageStrategy::DitsChunk => {
            // Always stream binary files
            add_chunked_file(repo, path)
        }
        StorageStrategy::Hybrid => {
            add_hybrid_file(repo, path)
        }
    }
}

const LARGE_FILE_THRESHOLD: u64 = 10 * 1024 * 1024; // 10MB
```

---

## Migration

### Upgrading Existing Repositories

```rust
pub async fn upgrade_to_hybrid(repo: &mut Repository) -> Result<UpgradeReport> {
    let mut report = UpgradeReport::default();

    // 1. Initialize Git object store
    let git_engine = GitTextEngine::init(&repo.dits_dir)?;

    // 2. Reprocess all entries
    let entries: Vec<_> = repo.index.entries().collect();

    for entry in entries {
        let content = repo.read_content(&entry)?;
        let strategy = repo.classifier.classify(Path::new(&entry.path), Some(&content));

        if strategy == StorageStrategy::GitText {
            // Migrate to Git storage
            let oid = git_engine.store_blob(&content)?;

            repo.index.update_entry(&entry.path, |e| {
                e.storage = StorageStrategy::GitText;
                e.git_oid = Some(oid.into());
                e.manifest_hash = None;
                e.chunk_count = None;
            })?;

            report.migrated_to_git += 1;
        } else {
            report.kept_as_dits += 1;
        }
    }

    // 3. Update repository version
    repo.config.set("core.repository_format_version", 3)?;
    repo.config.set("core.hybrid_storage", true)?;

    // 4. Optionally garbage collect unused chunks
    if report.migrated_to_git > 0 {
        repo.gc()?;
    }

    Ok(report)
}

#[derive(Default)]
pub struct UpgradeReport {
    pub migrated_to_git: usize,
    pub kept_as_dits: usize,
    pub bytes_saved: u64,
}
```

---

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classification() {
        let classifier = FileClassifier::default();

        // Text files
        assert_eq!(
            classifier.classify(Path::new("README.md"), None),
            StorageStrategy::GitText
        );
        assert_eq!(
            classifier.classify(Path::new("config.json"), None),
            StorageStrategy::GitText
        );

        // Binary files
        assert_eq!(
            classifier.classify(Path::new("video.mp4"), None),
            StorageStrategy::DitsChunk
        );

        // Hybrid files
        assert_eq!(
            classifier.classify(Path::new("project.prproj"), None),
            StorageStrategy::Hybrid
        );
    }

    #[test]
    fn test_content_analysis() {
        let classifier = FileClassifier::default();

        // Text content
        let text = b"Hello, World!\nThis is a text file.\n";
        assert_eq!(
            classifier.classify(Path::new("unknown"), Some(text)),
            StorageStrategy::GitText
        );

        // Binary content (contains null bytes)
        let binary = &[0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE];
        assert_eq!(
            classifier.classify(Path::new("unknown"), Some(binary)),
            StorageStrategy::DitsChunk
        );
    }

    #[test]
    fn test_merge_with_conflicts() {
        let engine = GitTextEngine::init_temp().unwrap();

        let base = b"line1\nline2\nline3\n";
        let ours = b"line1\nmodified\nline3\n";
        let theirs = b"line1\nalso modified\nline3\n";

        let base_oid = engine.store_blob(base).unwrap();
        let ours_oid = engine.store_blob(ours).unwrap();
        let theirs_oid = engine.store_blob(theirs).unwrap();

        let result = engine.merge_blobs(
            Some(base_oid),
            ours_oid,
            theirs_oid,
            "test.txt",
            &MergeConfig::default(),
        ).unwrap();

        assert!(matches!(result, MergeResult::Conflict { .. }));
    }
}
```

---

## References

- [libgit2 Documentation](https://libgit2.org/)
- [git2-rs Crate](https://docs.rs/git2/)
- [Git Object Model](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [Three-Way Merge Algorithm](https://en.wikipedia.org/wiki/Merge_(version_control)#Three-way_merge)
