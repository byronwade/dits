# Diff Data Structure

Representing differences between file versions.

---

## Overview

The Diff system in Dits uses a **hybrid approach** that selects the optimal diff algorithm based on file type:

| File Type | Diff Engine | Output |
|-----------|-------------|--------|
| Text files | **libgit2** | Line-based unified diff |
| Binary files | **Dits CDC** | Chunk-level diff |
| Media files | **Dits CDC** | Chunk diff + visual comparison |
| NLE projects | **Hybrid** | Timeline/sequence diff |

> **Phase 3.6 Update:** Text file diffing now uses libgit2 for Git-quality line-based diffs with full support for Myers, Patience, and Histogram algorithms.

---

## Hybrid Diff Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         dits diff                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Text File   │    │ Binary File  │    │  NLE Project │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   libgit2    │    │  ChunkDiff   │    │  NLE Parser  │      │
│  │              │    │              │    │              │      │
│  │ • Myers      │    │ • Keep       │    │ • Sequences  │      │
│  │ • Patience   │    │ • Insert     │    │ • Tracks     │      │
│  │ • Histogram  │    │ • Delete     │    │ • Clips      │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Unified Diff Output                   │   │
│  │  • Unified text format for text files                   │   │
│  │  • Chunk statistics for binary files                    │   │
│  │  • Timeline changes for NLE projects                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Diff Engine Selection

```rust
use crate::storage::StorageStrategy;

/// Select appropriate diff engine based on file classification
pub fn diff_files(
    repo: &Repository,
    old: &FileVersion,
    new: &FileVersion,
    path: &str,
) -> Result<Diff> {
    let strategy = repo.classify_file(path)?;

    match strategy {
        StorageStrategy::GitText => {
            // Use libgit2 for line-based diff
            diff_with_libgit2(repo, old, new, path)
        }
        StorageStrategy::DitsChunk => {
            // Use chunk-based diff
            diff_with_chunks(repo, old, new, path)
        }
        StorageStrategy::Hybrid => {
            // Use NLE-aware diff
            diff_nle_project(repo, old, new, path)
        }
    }
}
```

---

## libgit2 Text Diff (Phase 3.6)

For text files, Dits delegates to libgit2 for Git-quality diffing:

```rust
use git2::{DiffOptions, Repository as GitRepo};

/// Git-powered text diff using libgit2
pub struct GitTextDiff {
    git_repo: GitRepo,
}

impl GitTextDiff {
    /// Compute diff between two text blobs
    pub fn diff_blobs(
        &self,
        old_oid: git2::Oid,
        new_oid: git2::Oid,
        path: &str,
        options: &TextDiffOptions,
    ) -> Result<TextDiff> {
        let old_blob = self.git_repo.find_blob(old_oid)?;
        let new_blob = self.git_repo.find_blob(new_oid)?;

        let mut diff_opts = DiffOptions::new();
        diff_opts.context_lines(options.context_lines);

        if options.ignore_whitespace {
            diff_opts.ignore_whitespace(true);
        }

        let mut hunks = Vec::new();
        let mut current_hunk: Option<DiffHunk> = None;

        self.git_repo.diff_blobs(
            Some(&old_blob), Some(path),
            Some(&new_blob), Some(path),
            Some(&mut diff_opts),
            None,
            Some(&mut |_delta, hunk| {
                if let Some(h) = hunk {
                    current_hunk = Some(DiffHunk {
                        old_start: h.old_start(),
                        old_count: h.old_lines(),
                        new_start: h.new_start(),
                        new_count: h.new_lines(),
                        header: None,
                        lines: Vec::new(),
                    });
                }
                true
            }),
            Some(&mut |_delta, _hunk, line| {
                if let Some(ref mut hunk) = current_hunk {
                    let line_type = match line.origin() {
                        '+' => LineType::Addition,
                        '-' => LineType::Deletion,
                        ' ' => LineType::Context,
                        _ => return true,
                    };

                    hunk.lines.push(DiffLine {
                        content: String::from_utf8_lossy(line.content()).to_string(),
                        line_type,
                        old_lineno: line.old_lineno(),
                        new_lineno: line.new_lineno(),
                    });
                }
                true
            }),
        )?;

        if let Some(hunk) = current_hunk {
            hunks.push(hunk);
        }

        Ok(TextDiff {
            old_path: Some(path.into()),
            new_path: Some(path.into()),
            hunks,
            stats: calculate_stats(&hunks),
        })
    }

    /// Get word-level diff for more granular changes
    pub fn diff_words(
        &self,
        old_content: &str,
        new_content: &str,
    ) -> Result<Vec<WordChange>> {
        // libgit2 doesn't have word diff, use similar crate
        use similar::{ChangeTag, TextDiff as SimilarDiff};

        let diff = SimilarDiff::from_words(old_content, new_content);
        let changes = diff.iter_all_changes()
            .map(|change| WordChange {
                tag: match change.tag() {
                    ChangeTag::Equal => WordChangeTag::Equal,
                    ChangeTag::Insert => WordChangeTag::Insert,
                    ChangeTag::Delete => WordChangeTag::Delete,
                },
                value: change.value().to_string(),
            })
            .collect();

        Ok(changes)
    }
}

#[derive(Debug, Clone)]
pub struct WordChange {
    pub tag: WordChangeTag,
    pub value: String,
}

#[derive(Debug, Clone, Copy)]
pub enum WordChangeTag {
    Equal,
    Insert,
    Delete,
}
```

### Text Diff Output Examples

**Unified diff format:**
```diff
--- a/config.json
+++ b/config.json
@@ -1,5 +1,6 @@
 {
   "name": "my-project",
-  "version": "1.0.0",
+  "version": "1.1.0",
+  "description": "Added new feature",
   "main": "index.js"
 }
```

**Word-level diff (inline):**
```
version: "1.[0].0" → "1.[1].0"
```

---

## Data Structures

### Diff Types

```rust
use serde::{Deserialize, Serialize};

/// Difference between two versions of content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Diff {
    /// Text-based diff (for text files)
    Text(TextDiff),

    /// Chunk-based diff (for binary/media files)
    Chunk(ChunkDiff),

    /// Metadata-only diff
    Metadata(MetadataDiff),

    /// File type changed (e.g., text to binary)
    TypeChange {
        old_type: FileType,
        new_type: FileType,
    },

    /// Identical content
    Identical,

    /// One side is missing
    Added(FileInfo),
    Deleted(FileInfo),
}

/// Text-based diff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextDiff {
    /// Old file path
    pub old_path: Option<PathBuf>,

    /// New file path
    pub new_path: Option<PathBuf>,

    /// Diff hunks
    pub hunks: Vec<DiffHunk>,

    /// Statistics
    pub stats: DiffStats,
}

/// A single diff hunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    /// Old file start line
    pub old_start: u32,

    /// Old file line count
    pub old_count: u32,

    /// New file start line
    pub new_start: u32,

    /// New file line count
    pub new_count: u32,

    /// Context header (e.g., function name)
    pub header: Option<String>,

    /// Lines in this hunk
    pub lines: Vec<DiffLine>,
}

/// A single diff line
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    /// Line content
    pub content: String,

    /// Line type
    pub line_type: LineType,

    /// Old line number (for context/deletion)
    pub old_lineno: Option<u32>,

    /// New line number (for context/addition)
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LineType {
    /// Unchanged line
    Context,
    /// Added line
    Addition,
    /// Deleted line
    Deletion,
    /// No newline at end of file marker
    NoNewline,
}

/// Chunk-based diff for binary/media files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkDiff {
    /// Old file info
    pub old: Option<FileInfo>,

    /// New file info
    pub new: Option<FileInfo>,

    /// Chunk operations to transform old to new
    pub operations: Vec<ChunkOp>,

    /// Statistics
    pub stats: ChunkDiffStats,
}

/// Chunk operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChunkOp {
    /// Keep chunk unchanged
    Keep {
        hash: String,
        offset: u64,
        size: u64,
    },

    /// Insert new chunk
    Insert {
        hash: String,
        offset: u64,
        size: u64,
    },

    /// Delete chunk
    Delete {
        hash: String,
        offset: u64,
        size: u64,
    },

    /// Replace chunk(s) with new chunk(s)
    Replace {
        old_hashes: Vec<String>,
        new_hashes: Vec<String>,
        old_size: u64,
        new_size: u64,
    },
}

/// Metadata diff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataDiff {
    /// Permission changes
    pub mode: Option<(u32, u32)>,

    /// Modification time changes
    pub mtime: Option<(DateTime<Utc>, DateTime<Utc>)>,

    /// Size changes
    pub size: Option<(u64, u64)>,

    /// Extended attribute changes
    pub xattrs: Vec<XattrChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum XattrChange {
    Added { name: String, value: Vec<u8> },
    Removed { name: String },
    Modified { name: String, old: Vec<u8>, new: Vec<u8> },
}

/// File information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: PathBuf,
    pub hash: String,
    pub size: u64,
    pub mode: u32,
    pub file_type: FileType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileType {
    Text,
    Binary,
    Video,
    Audio,
    Image,
    Archive,
    Project, // NLE project files
    Unknown,
}

/// Diff statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DiffStats {
    pub additions: u32,
    pub deletions: u32,
    pub files_changed: u32,
}

/// Chunk diff statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChunkDiffStats {
    /// Chunks kept unchanged
    pub chunks_kept: u32,

    /// Chunks added
    pub chunks_added: u32,

    /// Chunks removed
    pub chunks_removed: u32,

    /// Bytes added
    pub bytes_added: u64,

    /// Bytes removed
    pub bytes_removed: u64,

    /// Similarity percentage (0-100)
    pub similarity: f32,
}
```

---

## Diff Computation

### Text Diff Algorithm

```rust
/// Text diff algorithm options
#[derive(Debug, Clone)]
pub struct TextDiffOptions {
    /// Algorithm to use
    pub algorithm: DiffAlgorithm,

    /// Lines of context
    pub context_lines: u32,

    /// Ignore whitespace changes
    pub ignore_whitespace: bool,

    /// Ignore case
    pub ignore_case: bool,

    /// Word-level diff
    pub word_diff: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum DiffAlgorithm {
    /// Myers diff algorithm (default)
    Myers,

    /// Patience diff algorithm
    Patience,

    /// Histogram diff algorithm
    Histogram,

    /// Minimal diff (slower but optimal)
    Minimal,
}

impl TextDiff {
    /// Compute text diff between two strings
    pub fn compute(
        old: &str,
        new: &str,
        options: &TextDiffOptions,
    ) -> Self {
        // Preprocess based on options
        let old_lines = Self::preprocess(old, options);
        let new_lines = Self::preprocess(new, options);

        // Run diff algorithm
        let ops = match options.algorithm {
            DiffAlgorithm::Myers => myers_diff(&old_lines, &new_lines),
            DiffAlgorithm::Patience => patience_diff(&old_lines, &new_lines),
            DiffAlgorithm::Histogram => histogram_diff(&old_lines, &new_lines),
            DiffAlgorithm::Minimal => minimal_diff(&old_lines, &new_lines),
        };

        // Convert to hunks with context
        let hunks = Self::build_hunks(&old_lines, &new_lines, &ops, options.context_lines);

        // Calculate statistics
        let stats = Self::calculate_stats(&hunks);

        TextDiff {
            old_path: None,
            new_path: None,
            hunks,
            stats,
        }
    }

    fn preprocess(content: &str, options: &TextDiffOptions) -> Vec<String> {
        content.lines()
            .map(|line| {
                let mut processed = line.to_string();

                if options.ignore_case {
                    processed = processed.to_lowercase();
                }

                if options.ignore_whitespace {
                    processed = processed.split_whitespace().collect::<Vec<_>>().join(" ");
                }

                processed
            })
            .collect()
    }

    fn build_hunks(
        old: &[String],
        new: &[String],
        ops: &[DiffOp],
        context: u32,
    ) -> Vec<DiffHunk> {
        let mut hunks = Vec::new();
        let mut current_hunk: Option<DiffHunk> = None;
        let mut old_line = 1u32;
        let mut new_line = 1u32;

        for op in ops {
            match op {
                DiffOp::Equal(count) => {
                    // Add context lines
                    for i in 0..*count {
                        if let Some(ref mut hunk) = current_hunk {
                            if i < context || (*count - i - 1) < context {
                                hunk.lines.push(DiffLine {
                                    content: old[(old_line - 1 + i) as usize].clone(),
                                    line_type: LineType::Context,
                                    old_lineno: Some(old_line + i),
                                    new_lineno: Some(new_line + i),
                                });
                            } else if i == context {
                                // End current hunk, might start new one
                                hunks.push(current_hunk.take().unwrap());
                            }
                        }
                    }
                    old_line += count;
                    new_line += count;
                }

                DiffOp::Delete(count) => {
                    let hunk = current_hunk.get_or_insert_with(|| DiffHunk {
                        old_start: old_line,
                        old_count: 0,
                        new_start: new_line,
                        new_count: 0,
                        header: None,
                        lines: Vec::new(),
                    });

                    for i in 0..*count {
                        hunk.lines.push(DiffLine {
                            content: old[(old_line - 1 + i) as usize].clone(),
                            line_type: LineType::Deletion,
                            old_lineno: Some(old_line + i),
                            new_lineno: None,
                        });
                        hunk.old_count += 1;
                    }
                    old_line += count;
                }

                DiffOp::Insert(count) => {
                    let hunk = current_hunk.get_or_insert_with(|| DiffHunk {
                        old_start: old_line,
                        old_count: 0,
                        new_start: new_line,
                        new_count: 0,
                        header: None,
                        lines: Vec::new(),
                    });

                    for i in 0..*count {
                        hunk.lines.push(DiffLine {
                            content: new[(new_line - 1 + i) as usize].clone(),
                            line_type: LineType::Addition,
                            old_lineno: None,
                            new_lineno: Some(new_line + i),
                        });
                        hunk.new_count += 1;
                    }
                    new_line += count;
                }
            }
        }

        if let Some(hunk) = current_hunk {
            hunks.push(hunk);
        }

        hunks
    }
}
```

### Chunk Diff Algorithm

```rust
impl ChunkDiff {
    /// Compute chunk diff between two files
    pub fn compute(old_chunks: &[Chunk], new_chunks: &[Chunk]) -> Self {
        // Build hash sets for quick lookup
        let old_set: HashSet<_> = old_chunks.iter().map(|c| &c.hash).collect();
        let new_set: HashSet<_> = new_chunks.iter().map(|c| &c.hash).collect();

        let mut operations = Vec::new();
        let mut old_offset = 0u64;
        let mut new_offset = 0u64;

        let mut old_idx = 0;
        let mut new_idx = 0;

        while old_idx < old_chunks.len() || new_idx < new_chunks.len() {
            // Check if current chunks match
            if old_idx < old_chunks.len() && new_idx < new_chunks.len() {
                let old_chunk = &old_chunks[old_idx];
                let new_chunk = &new_chunks[new_idx];

                if old_chunk.hash == new_chunk.hash {
                    // Chunk unchanged
                    operations.push(ChunkOp::Keep {
                        hash: old_chunk.hash.clone(),
                        offset: new_offset,
                        size: old_chunk.size,
                    });
                    old_offset += old_chunk.size;
                    new_offset += new_chunk.size;
                    old_idx += 1;
                    new_idx += 1;
                    continue;
                }
            }

            // Check if old chunk exists in new (moved)
            if old_idx < old_chunks.len() {
                let old_chunk = &old_chunks[old_idx];
                if !new_set.contains(&old_chunk.hash) {
                    // Chunk deleted
                    operations.push(ChunkOp::Delete {
                        hash: old_chunk.hash.clone(),
                        offset: old_offset,
                        size: old_chunk.size,
                    });
                    old_offset += old_chunk.size;
                    old_idx += 1;
                    continue;
                }
            }

            // Check if new chunk exists in old (moved)
            if new_idx < new_chunks.len() {
                let new_chunk = &new_chunks[new_idx];
                if !old_set.contains(&new_chunk.hash) {
                    // Chunk inserted
                    operations.push(ChunkOp::Insert {
                        hash: new_chunk.hash.clone(),
                        offset: new_offset,
                        size: new_chunk.size,
                    });
                    new_offset += new_chunk.size;
                    new_idx += 1;
                    continue;
                }
            }

            // Both chunks exist but are reordered - handle as replacement
            if old_idx < old_chunks.len() && new_idx < new_chunks.len() {
                let old_chunk = &old_chunks[old_idx];
                let new_chunk = &new_chunks[new_idx];

                operations.push(ChunkOp::Replace {
                    old_hashes: vec![old_chunk.hash.clone()],
                    new_hashes: vec![new_chunk.hash.clone()],
                    old_size: old_chunk.size,
                    new_size: new_chunk.size,
                });

                old_offset += old_chunk.size;
                new_offset += new_chunk.size;
                old_idx += 1;
                new_idx += 1;
            }
        }

        // Calculate statistics
        let stats = Self::calculate_stats(&operations);

        ChunkDiff {
            old: None,
            new: None,
            operations,
            stats,
        }
    }

    fn calculate_stats(operations: &[ChunkOp]) -> ChunkDiffStats {
        let mut stats = ChunkDiffStats::default();

        for op in operations {
            match op {
                ChunkOp::Keep { size, .. } => {
                    stats.chunks_kept += 1;
                }
                ChunkOp::Insert { size, .. } => {
                    stats.chunks_added += 1;
                    stats.bytes_added += size;
                }
                ChunkOp::Delete { size, .. } => {
                    stats.chunks_removed += 1;
                    stats.bytes_removed += size;
                }
                ChunkOp::Replace { old_size, new_size, .. } => {
                    stats.chunks_removed += 1;
                    stats.chunks_added += 1;
                    stats.bytes_removed += old_size;
                    stats.bytes_added += new_size;
                }
            }
        }

        // Calculate similarity
        let total_chunks = stats.chunks_kept + stats.chunks_added + stats.chunks_removed;
        if total_chunks > 0 {
            stats.similarity = (stats.chunks_kept as f32 / total_chunks as f32) * 100.0;
        }

        stats
    }
}
```

---

## Diff Output Formats

### Unified Diff Format

```rust
impl TextDiff {
    /// Output in unified diff format
    pub fn to_unified(&self) -> String {
        let mut output = String::new();

        // File header
        if let Some(old) = &self.old_path {
            output.push_str(&format!("--- {}\n", old.display()));
        }
        if let Some(new) = &self.new_path {
            output.push_str(&format!("+++ {}\n", new.display()));
        }

        // Hunks
        for hunk in &self.hunks {
            output.push_str(&format!(
                "@@ -{},{} +{},{} @@",
                hunk.old_start, hunk.old_count,
                hunk.new_start, hunk.new_count
            ));

            if let Some(header) = &hunk.header {
                output.push_str(&format!(" {}", header));
            }
            output.push('\n');

            for line in &hunk.lines {
                let prefix = match line.line_type {
                    LineType::Context => ' ',
                    LineType::Addition => '+',
                    LineType::Deletion => '-',
                    LineType::NoNewline => '\\',
                };
                output.push(prefix);
                output.push_str(&line.content);
                output.push('\n');
            }
        }

        output
    }
}
```

### JSON Diff Format

```rust
impl Diff {
    /// Output as JSON
    pub fn to_json(&self) -> Result<String> {
        serde_json::to_string_pretty(self)
    }
}
```

### Stat Summary

```rust
impl DiffStats {
    /// Format as stat line
    pub fn format(&self) -> String {
        format!(
            "{} file(s) changed, {} insertion(s)(+), {} deletion(s)(-)",
            self.files_changed,
            self.additions,
            self.deletions
        )
    }
}

impl ChunkDiffStats {
    pub fn format(&self) -> String {
        format!(
            "{} chunk(s) kept, {} added (+{} bytes), {} removed (-{} bytes), {:.1}% similar",
            self.chunks_kept,
            self.chunks_added,
            self.bytes_added,
            self.chunks_removed,
            self.bytes_removed,
            self.similarity
        )
    }
}
```

---

## Visual Diff for Media

```rust
/// Visual diff options for media files
pub struct MediaDiffOptions {
    /// Generate thumbnail comparison
    pub thumbnails: bool,

    /// Thumbnail dimensions
    pub thumb_width: u32,
    pub thumb_height: u32,

    /// Generate waveform comparison (audio)
    pub waveforms: bool,

    /// Number of sample frames
    pub sample_frames: usize,
}

/// Media visual diff result
pub struct MediaVisualDiff {
    /// Old file thumbnails/frames
    pub old_frames: Vec<Frame>,

    /// New file thumbnails/frames
    pub new_frames: Vec<Frame>,

    /// Changed regions
    pub changed_regions: Vec<ChangedRegion>,

    /// Audio waveform comparison
    pub waveform_diff: Option<WaveformDiff>,
}

#[derive(Debug)]
pub struct Frame {
    /// Frame number or timestamp
    pub position: f64,

    /// Image data (PNG encoded)
    pub image: Vec<u8>,

    /// Frame dimensions
    pub width: u32,
    pub height: u32,
}

#[derive(Debug)]
pub struct ChangedRegion {
    /// Start time (seconds)
    pub start: f64,

    /// End time (seconds)
    pub end: f64,

    /// Type of change
    pub change_type: MediaChangeType,
}

#[derive(Debug)]
pub enum MediaChangeType {
    Visual,
    Audio,
    Both,
    Metadata,
}

impl MediaVisualDiff {
    /// Generate visual diff for video files
    pub fn generate(
        old_path: &Path,
        new_path: &Path,
        options: &MediaDiffOptions,
    ) -> Result<Self> {
        let mut diff = MediaVisualDiff {
            old_frames: Vec::new(),
            new_frames: Vec::new(),
            changed_regions: Vec::new(),
            waveform_diff: None,
        };

        // Get video durations
        let old_duration = get_video_duration(old_path)?;
        let new_duration = get_video_duration(new_path)?;

        // Sample frames at regular intervals
        let interval = old_duration / options.sample_frames as f64;

        for i in 0..options.sample_frames {
            let timestamp = i as f64 * interval;

            if let Ok(old_frame) = extract_frame(old_path, timestamp, options) {
                diff.old_frames.push(old_frame);
            }

            let new_timestamp = timestamp * (new_duration / old_duration);
            if let Ok(new_frame) = extract_frame(new_path, new_timestamp, options) {
                diff.new_frames.push(new_frame);
            }
        }

        // Detect changed regions
        diff.changed_regions = detect_changes(&diff.old_frames, &diff.new_frames)?;

        // Generate waveform diff if audio
        if options.waveforms {
            diff.waveform_diff = Some(compare_waveforms(old_path, new_path)?);
        }

        Ok(diff)
    }
}
```

---

## Binary Diff

```rust
/// Binary diff using rsync-style rolling hash
pub struct BinaryDiff {
    /// Block size for comparison
    pub block_size: usize,

    /// Operations to transform old to new
    pub operations: Vec<BinaryOp>,
}

pub enum BinaryOp {
    /// Copy bytes from old file
    Copy { offset: u64, length: u64 },

    /// Insert new bytes
    Insert { data: Vec<u8> },
}

impl BinaryDiff {
    /// Compute binary diff
    pub fn compute(old: &[u8], new: &[u8], block_size: usize) -> Self {
        // Build rolling hash signatures for old file
        let signatures = Self::build_signatures(old, block_size);

        let mut operations = Vec::new();
        let mut pos = 0;
        let mut literal_start = 0;

        while pos < new.len() {
            // Try to find matching block in old file
            if pos + block_size <= new.len() {
                let hash = rolling_hash(&new[pos..pos + block_size]);

                if let Some(&old_offset) = signatures.get(&hash) {
                    // Verify match
                    if old[old_offset..old_offset + block_size]
                        == new[pos..pos + block_size]
                    {
                        // Emit literal data if any
                        if literal_start < pos {
                            operations.push(BinaryOp::Insert {
                                data: new[literal_start..pos].to_vec(),
                            });
                        }

                        // Emit copy operation
                        operations.push(BinaryOp::Copy {
                            offset: old_offset as u64,
                            length: block_size as u64,
                        });

                        pos += block_size;
                        literal_start = pos;
                        continue;
                    }
                }
            }

            pos += 1;
        }

        // Emit remaining literal data
        if literal_start < new.len() {
            operations.push(BinaryOp::Insert {
                data: new[literal_start..].to_vec(),
            });
        }

        BinaryDiff { block_size, operations }
    }
}
```

---

## Notes

- Text diffs use line-based comparison by default
- Chunk diffs are more efficient for large binary files
- Media diffs can generate visual comparisons
- Similarity scores help identify renames/moves
- Multiple diff algorithms available for different use cases
- Output formats: unified, JSON, stat summary
