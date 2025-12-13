# Manifest Format Specification

The manifest is the authoritative record of a commit's file tree, storing paths, metadata, and chunk references.

---

## Overview

Each commit in Dits references a manifest that describes:
- All files in the repository at that point in time
- File metadata (size, permissions, timestamps)
- Chunk references for reconstructing file content
- Asset metadata (video dimensions, codec, duration)
- Dependencies between files

---

## File Format

### Header

```
Offset  Size  Description
------  ----  -----------
0x00    4     Magic number: 0x4D414E49 ("MANI")
0x04    1     Format version (currently 0x02)
0x05    1     Compression algorithm (0x00=none, 0x01=zstd)
0x06    2     Flags (see below)
0x08    4     Header checksum (CRC32)
0x0C    4     Payload size (compressed)
0x10    4     Payload size (uncompressed)
0x14    8     Creation timestamp (Unix micros)
0x1C    32    Commit hash this manifest belongs to
0x3C    32    Parent manifest hash (or zeros)
0x5C    4     Number of entries
0x60    -     Payload (bincode-encoded ManifestPayload)
```

### Flags

| Bit | Name | Description |
|-----|------|-------------|
| 0 | ENCRYPTED | Payload is encrypted |
| 1 | SIGNED | Includes signature block |
| 2 | INCREMENTAL | Only stores delta from parent |
| 3 | HAS_DEPENDENCIES | Includes dependency graph |
| 4-15 | Reserved | Future use |

---

## Payload Structure

### Rust Definitions

```rust
/// Complete manifest payload
#[derive(Serialize, Deserialize)]
pub struct ManifestPayload {
    /// Manifest format version
    pub version: u8,

    /// Repository ID
    pub repo_id: Uuid,

    /// Commit this manifest represents
    pub commit_hash: [u8; 32],

    /// Parent commit (for incremental)
    pub parent_hash: Option<[u8; 32]>,

    /// All files in this commit
    pub entries: Vec<ManifestEntry>,

    /// Directory structure (for efficient listing)
    pub directories: Vec<DirectoryEntry>,

    /// Asset dependency graph
    pub dependencies: Option<DependencyGraph>,

    /// Repository-wide statistics
    pub stats: ManifestStats,

    /// Optional signature
    pub signature: Option<ManifestSignature>,
}

/// Single file entry
#[derive(Serialize, Deserialize)]
pub struct ManifestEntry {
    /// File path (relative to repo root)
    pub path: String,

    /// Entry type
    pub entry_type: EntryType,

    /// Unix permissions (e.g., 0o644)
    pub mode: u32,

    /// File size in bytes
    pub size: u64,

    /// Content hash (BLAKE3 of full file)
    pub content_hash: [u8; 32],

    /// Chunk list for this file
    pub chunks: Vec<ChunkRef>,

    /// File metadata
    pub metadata: FileMetadata,

    /// Asset-specific metadata (for media files)
    pub asset_metadata: Option<AssetMetadata>,

    /// Timestamps
    pub created_at: i64,   // Unix micros
    pub modified_at: i64,  // Unix micros
}

#[derive(Serialize, Deserialize)]
pub enum EntryType {
    /// Regular file
    File,

    /// Symbolic link
    Symlink { target: String },

    /// Directory (usually implicit from paths)
    Directory,

    /// Submodule reference
    Submodule { commit: [u8; 32], url: String },
}

/// Reference to a chunk
#[derive(Serialize, Deserialize)]
pub struct ChunkRef {
    /// Chunk content hash
    pub hash: [u8; 32],

    /// Offset within the file
    pub offset: u64,

    /// Uncompressed chunk size
    pub size: u32,

    /// Compressed size (if different)
    pub compressed_size: Option<u32>,

    /// Chunk flags
    pub flags: ChunkFlags,
}

#[derive(Serialize, Deserialize)]
pub struct ChunkFlags {
    /// Chunk starts at keyframe boundary
    pub is_keyframe: bool,

    /// Chunk contains metadata (moov atom)
    pub is_metadata: bool,

    /// Chunk is encrypted
    pub encrypted: bool,

    /// Storage class hint
    pub storage_class: StorageClass,
}

/// File metadata
#[derive(Serialize, Deserialize)]
pub struct FileMetadata {
    /// MIME type
    pub mime_type: String,

    /// File extension
    pub extension: String,

    /// Content encoding (if applicable)
    pub encoding: Option<String>,

    /// Extended attributes (platform-specific)
    pub xattrs: HashMap<String, Vec<u8>>,
}

/// Video/audio asset metadata
#[derive(Serialize, Deserialize)]
pub struct AssetMetadata {
    /// Asset type
    pub asset_type: AssetType,

    /// Duration in milliseconds
    pub duration_ms: Option<u64>,

    /// Video dimensions
    pub width: Option<u32>,
    pub height: Option<u32>,

    /// Frame rate (as fraction)
    pub fps_num: Option<u32>,
    pub fps_den: Option<u32>,

    /// Codec information
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,

    /// Color space
    pub color_space: Option<String>,

    /// Bit depth
    pub bit_depth: Option<u8>,

    /// Audio channels
    pub audio_channels: Option<u8>,

    /// Sample rate
    pub sample_rate: Option<u32>,

    /// Timecode (if embedded)
    pub timecode: Option<String>,

    /// Camera metadata
    pub camera_metadata: Option<CameraMetadata>,

    /// Thumbnail chunk reference
    pub thumbnail: Option<[u8; 32]>,

    /// Proxy variant references
    pub proxies: Vec<ProxyRef>,
}

#[derive(Serialize, Deserialize)]
pub enum AssetType {
    Video,
    Audio,
    Image,
    Document,
    Project,
    Other,
}

#[derive(Serialize, Deserialize)]
pub struct CameraMetadata {
    pub make: Option<String>,
    pub model: Option<String>,
    pub serial: Option<String>,
    pub lens: Option<String>,
    pub iso: Option<u32>,
    pub shutter_speed: Option<String>,
    pub aperture: Option<String>,
    pub focal_length: Option<String>,
    pub white_balance: Option<String>,
    pub capture_date: Option<i64>,
    pub gps_lat: Option<f64>,
    pub gps_lon: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct ProxyRef {
    /// Proxy resolution label
    pub label: String,  // "1080p", "720p", "thumbnail"

    /// Proxy format
    pub format: String,  // "h264", "prores_proxy"

    /// Manifest hash containing proxy
    pub manifest_hash: [u8; 32],

    /// Path within that manifest
    pub path: String,
}

/// Directory entry for efficient listing
#[derive(Serialize, Deserialize)]
pub struct DirectoryEntry {
    /// Directory path
    pub path: String,

    /// Number of direct children
    pub child_count: u32,

    /// Total size of all descendants
    pub total_size: u64,

    /// Indices into entries array for direct children
    pub children_indices: Vec<u32>,
}

/// Dependency graph for project files
#[derive(Serialize, Deserialize)]
pub struct DependencyGraph {
    /// Project files that define dependencies
    pub roots: Vec<String>,

    /// Dependency edges: source -> targets
    pub edges: HashMap<String, Vec<DependencyEdge>>,
}

#[derive(Serialize, Deserialize)]
pub struct DependencyEdge {
    /// Target file path
    pub target: String,

    /// Type of dependency
    pub dep_type: DependencyType,

    /// Reference info (how the project file refers to it)
    pub reference: String,

    /// Is this dependency required or optional?
    pub required: bool,
}

#[derive(Serialize, Deserialize)]
pub enum DependencyType {
    /// Direct media link
    MediaLink,

    /// Nested sequence/composition
    NestedSequence,

    /// Effect/plugin reference
    Effect,

    /// Font reference
    Font,

    /// LUT reference
    Lut,

    /// Other external reference
    External,
}

/// Aggregate statistics
#[derive(Serialize, Deserialize)]
pub struct ManifestStats {
    /// Total number of files
    pub file_count: u64,

    /// Total number of directories
    pub directory_count: u64,

    /// Total logical size (sum of file sizes)
    pub total_size: u64,

    /// Total unique chunks
    pub chunk_count: u64,

    /// Total chunk storage size
    pub chunk_size: u64,

    /// Deduplication ratio
    pub dedup_ratio: f64,

    /// Size by file type
    pub size_by_type: HashMap<String, u64>,

    /// Count by file type
    pub count_by_type: HashMap<String, u64>,
}

/// Digital signature
#[derive(Serialize, Deserialize)]
pub struct ManifestSignature {
    /// Signature algorithm
    pub algorithm: String,  // "ed25519", "rsa-sha256"

    /// Signer's key ID
    pub key_id: String,

    /// Signature bytes
    pub signature: Vec<u8>,

    /// Timestamp of signing
    pub signed_at: i64,
}
```

---

## Encoding

### Serialization

1. Construct `ManifestPayload` struct
2. Serialize with `bincode` (little-endian, varint lengths)
3. Compress with zstd (level 3)
4. Calculate checksum of compressed data
5. Prepend header

```rust
pub fn encode_manifest(payload: &ManifestPayload) -> Result<Vec<u8>> {
    // Serialize payload
    let serialized = bincode::serialize(payload)?;
    let uncompressed_size = serialized.len();

    // Compress
    let compressed = zstd::encode_all(&serialized[..], 3)?;
    let compressed_size = compressed.len();

    // Build header
    let mut header = Vec::with_capacity(96);
    header.extend_from_slice(b"MANI");                    // Magic
    header.push(0x02);                                     // Version
    header.push(0x01);                                     // Compression: zstd
    header.extend_from_slice(&0u16.to_le_bytes());        // Flags
    header.extend_from_slice(&0u32.to_le_bytes());        // Checksum placeholder
    header.extend_from_slice(&(compressed_size as u32).to_le_bytes());
    header.extend_from_slice(&(uncompressed_size as u32).to_le_bytes());
    header.extend_from_slice(&Utc::now().timestamp_micros().to_le_bytes());
    header.extend_from_slice(&payload.commit_hash);
    header.extend_from_slice(&payload.parent_hash.unwrap_or([0; 32]));
    header.extend_from_slice(&(payload.entries.len() as u32).to_le_bytes());

    // Calculate and insert checksum
    let checksum = crc32(&header[12..]);
    header[8..12].copy_from_slice(&checksum.to_le_bytes());

    // Combine
    let mut result = header;
    result.extend_from_slice(&compressed);

    Ok(result)
}
```

### Deserialization

```rust
pub fn decode_manifest(data: &[u8]) -> Result<ManifestPayload> {
    // Validate header
    if data.len() < 96 {
        return Err(Error::InvalidManifest("Header too short"));
    }

    if &data[0..4] != b"MANI" {
        return Err(Error::InvalidManifest("Invalid magic number"));
    }

    let version = data[4];
    if version > 0x02 {
        return Err(Error::InvalidManifest("Unsupported version"));
    }

    let compression = data[5];
    let flags = u16::from_le_bytes(data[6..8].try_into()?);
    let stored_checksum = u32::from_le_bytes(data[8..12].try_into()?);
    let compressed_size = u32::from_le_bytes(data[12..16].try_into()?) as usize;
    let uncompressed_size = u32::from_le_bytes(data[16..20].try_into()?) as usize;

    // Verify checksum
    let calculated_checksum = crc32(&data[12..96]);
    if stored_checksum != calculated_checksum {
        return Err(Error::InvalidManifest("Checksum mismatch"));
    }

    // Extract payload
    let payload_data = &data[96..96 + compressed_size];

    // Decompress
    let decompressed = match compression {
        0x00 => payload_data.to_vec(),
        0x01 => zstd::decode_all(payload_data)?,
        _ => return Err(Error::InvalidManifest("Unknown compression")),
    };

    if decompressed.len() != uncompressed_size {
        return Err(Error::InvalidManifest("Size mismatch after decompression"));
    }

    // Deserialize
    let payload: ManifestPayload = bincode::deserialize(&decompressed)?;

    Ok(payload)
}
```

---

## Incremental Manifests

For large repositories, full manifests can be large. Incremental manifests store only changes:

```rust
#[derive(Serialize, Deserialize)]
pub struct IncrementalManifest {
    /// Base manifest this is relative to
    pub base_hash: [u8; 32],

    /// Added entries
    pub added: Vec<ManifestEntry>,

    /// Modified entries (full replacement)
    pub modified: Vec<ManifestEntry>,

    /// Removed paths
    pub removed: Vec<String>,

    /// Updated stats
    pub stats: ManifestStats,
}

impl IncrementalManifest {
    /// Apply incremental to base manifest
    pub fn apply(&self, base: &ManifestPayload) -> ManifestPayload {
        let mut entries: HashMap<String, ManifestEntry> = base.entries
            .iter()
            .map(|e| (e.path.clone(), e.clone()))
            .collect();

        // Remove deleted
        for path in &self.removed {
            entries.remove(path);
        }

        // Add new
        for entry in &self.added {
            entries.insert(entry.path.clone(), entry.clone());
        }

        // Update modified
        for entry in &self.modified {
            entries.insert(entry.path.clone(), entry.clone());
        }

        ManifestPayload {
            version: base.version,
            repo_id: base.repo_id,
            commit_hash: self.base_hash,  // Will be updated
            parent_hash: Some(base.commit_hash),
            entries: entries.into_values().collect(),
            directories: rebuild_directories(&entries),
            dependencies: base.dependencies.clone(),
            stats: self.stats.clone(),
            signature: None,
        }
    }
}
```

---

## Storage

### Local Storage

```
.dits/
├── manifests/
│   ├── abc123...           # Full manifest
│   ├── def456...           # Full manifest
│   └── inc/
│       └── ghi789...       # Incremental manifest
```

### Server Storage

Manifests stored in object storage alongside chunks:

```
v1/manifests/{hash[0..2]}/{hash[2..4]}/{hash}.manifest
```

---

## Operations

### Building a Manifest

```rust
pub async fn build_manifest(
    repo: &Repository,
    files: &[StagedFile],
    parent: Option<&ManifestPayload>,
) -> Result<ManifestPayload> {
    let mut entries = Vec::with_capacity(files.len());
    let mut total_size = 0u64;
    let mut chunk_count = 0u64;

    for file in files {
        // Get file info
        let metadata = file.metadata()?;

        // Chunk the file
        let chunks = chunk_file(&file.path, &repo.chunker_config).await?;
        chunk_count += chunks.len() as u64;

        // Extract asset metadata for media files
        let asset_metadata = if is_media_file(&file.path) {
            Some(extract_asset_metadata(&file.path).await?)
        } else {
            None
        };

        // Build entry
        let entry = ManifestEntry {
            path: file.relative_path.clone(),
            entry_type: EntryType::File,
            mode: metadata.permissions().mode(),
            size: metadata.len(),
            content_hash: calculate_file_hash(&file.path)?,
            chunks: chunks.iter().map(|c| ChunkRef {
                hash: c.hash,
                offset: c.offset,
                size: c.size,
                compressed_size: c.compressed_size,
                flags: ChunkFlags {
                    is_keyframe: c.is_keyframe,
                    is_metadata: c.is_metadata,
                    encrypted: false,
                    storage_class: StorageClass::Hot,
                },
            }).collect(),
            metadata: FileMetadata {
                mime_type: mime_guess(&file.path),
                extension: file.extension().to_string(),
                encoding: None,
                xattrs: HashMap::new(),
            },
            asset_metadata,
            created_at: metadata.created()?.timestamp_micros(),
            modified_at: metadata.modified()?.timestamp_micros(),
        };

        total_size += entry.size;
        entries.push(entry);
    }

    // Build directories
    let directories = build_directory_tree(&entries);

    // Build dependency graph
    let dependencies = if has_project_files(&entries) {
        Some(build_dependency_graph(&entries, repo).await?)
    } else {
        None
    };

    // Calculate stats
    let stats = ManifestStats {
        file_count: entries.len() as u64,
        directory_count: directories.len() as u64,
        total_size,
        chunk_count,
        chunk_size: calculate_chunk_storage_size(&entries),
        dedup_ratio: calculate_dedup_ratio(total_size, &entries),
        size_by_type: group_size_by_type(&entries),
        count_by_type: group_count_by_type(&entries),
    };

    Ok(ManifestPayload {
        version: 2,
        repo_id: repo.id,
        commit_hash: [0; 32],  // Set when commit is created
        parent_hash: parent.map(|p| p.commit_hash),
        entries,
        directories,
        dependencies,
        stats,
        signature: None,
    })
}
```

### Querying a Manifest

```rust
impl ManifestPayload {
    /// Get entry by path
    pub fn get(&self, path: &str) -> Option<&ManifestEntry> {
        self.entries.iter().find(|e| e.path == path)
    }

    /// List directory contents
    pub fn list_directory(&self, path: &str) -> Vec<&ManifestEntry> {
        let prefix = if path.is_empty() { String::new() } else { format!("{}/", path) };

        self.entries.iter()
            .filter(|e| {
                e.path.starts_with(&prefix) &&
                !e.path[prefix.len()..].contains('/')
            })
            .collect()
    }

    /// Get all chunks for a file
    pub fn get_chunks(&self, path: &str) -> Option<&[ChunkRef]> {
        self.get(path).map(|e| e.chunks.as_slice())
    }

    /// Find chunk containing byte offset
    pub fn find_chunk_for_offset(&self, path: &str, offset: u64) -> Option<&ChunkRef> {
        let entry = self.get(path)?;

        for chunk in &entry.chunks {
            if offset >= chunk.offset && offset < chunk.offset + chunk.size as u64 {
                return Some(chunk);
            }
        }
        None
    }

    /// Get all unique chunk hashes
    pub fn all_chunk_hashes(&self) -> impl Iterator<Item = [u8; 32]> + '_ {
        self.entries.iter()
            .flat_map(|e| e.chunks.iter())
            .map(|c| c.hash)
    }

    /// Compare with another manifest
    pub fn diff(&self, other: &ManifestPayload) -> ManifestDiff {
        let self_paths: HashSet<_> = self.entries.iter().map(|e| &e.path).collect();
        let other_paths: HashSet<_> = other.entries.iter().map(|e| &e.path).collect();

        let added: Vec<_> = other_paths.difference(&self_paths)
            .filter_map(|p| other.get(p))
            .collect();

        let removed: Vec<_> = self_paths.difference(&other_paths)
            .filter_map(|p| self.get(p))
            .collect();

        let modified: Vec<_> = self_paths.intersection(&other_paths)
            .filter_map(|p| {
                let old = self.get(p)?;
                let new = other.get(p)?;
                if old.content_hash != new.content_hash {
                    Some((old, new))
                } else {
                    None
                }
            })
            .collect();

        ManifestDiff { added, removed, modified }
    }
}
```

---

## Validation

```rust
pub fn validate_manifest(manifest: &ManifestPayload) -> Result<()> {
    // Check version
    if manifest.version > 2 {
        return Err(Error::UnsupportedVersion(manifest.version));
    }

    // Check for duplicate paths
    let mut seen = HashSet::new();
    for entry in &manifest.entries {
        if !seen.insert(&entry.path) {
            return Err(Error::DuplicatePath(entry.path.clone()));
        }
    }

    // Validate each entry
    for entry in &manifest.entries {
        validate_entry(entry)?;
    }

    // Validate chunk references
    for entry in &manifest.entries {
        let chunk_total: u64 = entry.chunks.iter()
            .map(|c| c.size as u64)
            .sum();

        if chunk_total != entry.size {
            return Err(Error::ChunkSizeMismatch {
                path: entry.path.clone(),
                expected: entry.size,
                actual: chunk_total,
            });
        }

        // Check chunk offsets are contiguous
        let mut expected_offset = 0u64;
        for chunk in &entry.chunks {
            if chunk.offset != expected_offset {
                return Err(Error::ChunkOffsetGap {
                    path: entry.path.clone(),
                    expected: expected_offset,
                    actual: chunk.offset,
                });
            }
            expected_offset += chunk.size as u64;
        }
    }

    // Validate dependency graph
    if let Some(deps) = &manifest.dependencies {
        validate_dependencies(deps, manifest)?;
    }

    Ok(())
}

fn validate_entry(entry: &ManifestEntry) -> Result<()> {
    // Path validation
    if entry.path.is_empty() {
        return Err(Error::EmptyPath);
    }
    if entry.path.starts_with('/') || entry.path.contains("..") {
        return Err(Error::InvalidPath(entry.path.clone()));
    }

    // Size consistency
    if entry.size == 0 && !entry.chunks.is_empty() {
        return Err(Error::InvalidEntry("Zero-size file with chunks"));
    }

    Ok(())
}
```

---

## Notes

- Manifests are content-addressed (hash of encoded manifest)
- Incremental manifests reduce sync bandwidth for large repos
- Asset metadata extracted during chunking, not on-demand
- Dependency graph enables "commit project with all assets" workflow
- Signature enables verified releases
- Directory entries enable efficient `ls` without full manifest scan
