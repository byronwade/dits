# NLE Project File Parser Specifications

Detailed specifications for parsing Non-Linear Editing (NLE) project files to enable intelligent chunking and media tracking.

---

## Overview

Dits parses NLE project files to:

1. **Track media references** - Know which media files are used
2. **Detect changes** - Identify what changed between versions
3. **Enable smart locking** - Lock only affected media
4. **Optimize chunking** - Chunk project files intelligently

### Supported Formats

| NLE | Extension | Format Type | Complexity |
|-----|-----------|-------------|------------|
| Adobe Premiere Pro | `.prproj` | Gzip XML | Medium |
| DaVinci Resolve | `.drp` | SQLite DB | High |
| After Effects | `.aep` | RIFX Binary | High |
| Final Cut Pro X | `.fcpxml` | XML | Low |
| Avid Media Composer | `.avp` | Binary | Very High |

---

## Adobe Premiere Pro (.prproj)

### File Structure

Premiere Pro project files are **gzipped XML**:

```
.prproj
└── [GZIP compressed]
    └── XML document
        ├── Project settings
        ├── Sequences
        ├── Bins (folders)
        ├── Media references
        └── Effects/transitions
```

### Parsing Strategy

```rust
use flate2::read::GzDecoder;
use quick_xml::Reader;

pub struct PremiereProject {
    pub version: String,
    pub sequences: Vec<Sequence>,
    pub media_refs: Vec<MediaReference>,
    pub bins: Vec<Bin>,
}

pub fn parse_prproj(path: &Path) -> Result<PremiereProject> {
    // 1. Decompress gzip
    let file = File::open(path)?;
    let decoder = GzDecoder::new(file);

    // 2. Parse XML
    let mut reader = Reader::from_reader(decoder);
    let mut project = PremiereProject::default();

    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf)? {
            Event::Start(e) => {
                match e.name().as_ref() {
                    b"Sequence" => {
                        project.sequences.push(parse_sequence(&mut reader)?);
                    }
                    b"Media" => {
                        project.media_refs.push(parse_media_ref(&mut reader)?);
                    }
                    b"Bin" => {
                        project.bins.push(parse_bin(&mut reader)?);
                    }
                    _ => {}
                }
            }
            Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(project)
}
```

### XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PremiereData Version="38">
  <Project ObjectID="1" ClassID="..." Version="38">
    <Name>My Project</Name>
    <RootProjectItem ObjectRef="2"/>
  </Project>

  <RootProjectItem ObjectID="2" ClassID="...">
    <Children>
      <!-- Bins and media items -->
    </Children>
  </RootProjectItem>

  <!-- Media Reference -->
  <ClipProjectItem ObjectID="100" ClassID="...">
    <FilePath>\\?\\E:\\Media\\footage.mov</FilePath>
    <MediaStart>0</MediaStart>
    <MediaEnd>86400</MediaEnd>  <!-- Ticks (254016000000 per second) -->
  </ClipProjectItem>

  <!-- Sequence -->
  <Sequence ObjectID="200" ClassID="...">
    <Name>Main Sequence</Name>
    <FrameRate>24</FrameRate>
    <VideoTracks>
      <Track>
        <ClipItems>
          <ClipItem>
            <Start>0</Start>
            <End>240</End>
            <MediaRef ObjectRef="100"/>
          </ClipItem>
        </ClipItems>
      </Track>
    </VideoTracks>
  </Sequence>
</PremiereData>
```

### Key Data Extraction

```rust
#[derive(Debug)]
pub struct MediaReference {
    pub object_id: u64,
    pub file_path: PathBuf,
    pub media_start: i64,      // In Premiere ticks
    pub media_end: i64,
    pub duration: Duration,
    pub frame_rate: Option<f64>,
    pub codec: Option<String>,
}

#[derive(Debug)]
pub struct Sequence {
    pub object_id: u64,
    pub name: String,
    pub frame_rate: f64,
    pub duration: Duration,
    pub video_tracks: Vec<Track>,
    pub audio_tracks: Vec<Track>,
}

#[derive(Debug)]
pub struct ClipItem {
    pub start: i64,           // Timeline position
    pub end: i64,
    pub media_ref_id: u64,    // Reference to MediaReference
    pub in_point: i64,        // Source in point
    pub out_point: i64,       // Source out point
    pub speed: f64,           // Playback speed
}
```

### Change Detection

```rust
pub fn detect_prproj_changes(
    old: &PremiereProject,
    new: &PremiereProject,
) -> ProjectChanges {
    let mut changes = ProjectChanges::default();

    // Compare media references
    let old_media: HashSet<_> = old.media_refs.iter()
        .map(|m| (&m.file_path, m.object_id))
        .collect();
    let new_media: HashSet<_> = new.media_refs.iter()
        .map(|m| (&m.file_path, m.object_id))
        .collect();

    changes.added_media = new_media.difference(&old_media)
        .map(|(path, _)| path.clone())
        .collect();
    changes.removed_media = old_media.difference(&new_media)
        .map(|(path, _)| path.clone())
        .collect();

    // Compare sequences
    for new_seq in &new.sequences {
        if let Some(old_seq) = old.sequences.iter()
            .find(|s| s.object_id == new_seq.object_id) {
            if sequences_differ(old_seq, new_seq) {
                changes.modified_sequences.push(new_seq.name.clone());
            }
        } else {
            changes.added_sequences.push(new_seq.name.clone());
        }
    }

    changes
}
```

---

## DaVinci Resolve (.drp)

### File Structure

Resolve projects are **SQLite databases**:

```
.drp
└── SQLite database
    ├── SM_GlobalInfo       (Project metadata)
    ├── SM_MediaPool        (Media items)
    ├── SM_Timeline         (Sequences)
    ├── SM_Clip             (Clip data)
    ├── SM_ColorCorrection  (Color grades)
    └── SM_Fusion           (Fusion compositions)
```

### Database Schema (Key Tables)

```sql
-- Project metadata
CREATE TABLE SM_GlobalInfo (
    DbId INTEGER PRIMARY KEY,
    Info BLOB  -- Serialized data
);

-- Media pool items
CREATE TABLE SM_MediaPool (
    DbId INTEGER PRIMARY KEY,
    ParentId INTEGER,
    Type INTEGER,
    Name TEXT,
    FilePath TEXT,
    Duration INTEGER,
    MediaInfo BLOB
);

-- Timeline/sequence
CREATE TABLE SM_Timeline (
    DbId INTEGER PRIMARY KEY,
    Name TEXT,
    FrameRate REAL,
    StartTC INTEGER,
    Duration INTEGER,
    TrackData BLOB
);

-- Clips on timeline
CREATE TABLE SM_Clip (
    DbId INTEGER PRIMARY KEY,
    TimelineId INTEGER,
    TrackIndex INTEGER,
    MediaPoolId INTEGER,
    Start INTEGER,
    Duration INTEGER,
    SourceIn INTEGER,
    SourceOut INTEGER,
    ClipData BLOB
);
```

### Parsing Strategy

```rust
use rusqlite::{Connection, Result};

pub struct ResolveProject {
    pub name: String,
    pub media_pool: Vec<MediaPoolItem>,
    pub timelines: Vec<Timeline>,
    pub color_grades: Vec<ColorGrade>,
}

pub fn parse_drp(path: &Path) -> Result<ResolveProject> {
    let conn = Connection::open(path)?;

    let mut project = ResolveProject::default();

    // Parse global info
    let info: Vec<u8> = conn.query_row(
        "SELECT Info FROM SM_GlobalInfo LIMIT 1",
        [],
        |row| row.get(0)
    )?;
    project.name = parse_global_info(&info)?;

    // Parse media pool
    let mut stmt = conn.prepare(
        "SELECT DbId, Name, FilePath, Duration, MediaInfo FROM SM_MediaPool"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(MediaPoolItem {
            id: row.get(0)?,
            name: row.get(1)?,
            file_path: row.get::<_, Option<String>>(2)?.map(PathBuf::from),
            duration: row.get(3)?,
            info: parse_media_info(&row.get::<_, Vec<u8>>(4)?)?,
        })
    })?;
    project.media_pool = rows.collect::<Result<Vec<_>>>()?;

    // Parse timelines
    let mut stmt = conn.prepare(
        "SELECT DbId, Name, FrameRate, Duration, TrackData FROM SM_Timeline"
    )?;
    // ... similar parsing

    Ok(project)
}
```

### BLOB Data Format

Resolve stores structured data in BLOBs using a custom binary format:

```rust
// BLOB header
struct BlobHeader {
    magic: [u8; 4],      // "DVRB" or similar
    version: u32,
    data_size: u32,
    checksum: u32,
}

// Parse BLOB data
fn parse_resolve_blob(data: &[u8]) -> Result<ResolveData> {
    let header = BlobHeader::from_bytes(&data[0..16])?;

    // Data is often MessagePack or custom binary
    let payload = &data[16..];

    match header.magic {
        b"MPCK" => rmp_serde::from_slice(payload),
        b"JSON" => serde_json::from_slice(payload),
        _ => parse_custom_binary(payload),
    }
}
```

### Change Detection

```rust
pub fn detect_drp_changes(
    old_path: &Path,
    new_path: &Path,
) -> Result<ProjectChanges> {
    let old_conn = Connection::open(old_path)?;
    let new_conn = Connection::open(new_path)?;

    let mut changes = ProjectChanges::default();

    // Compare media pool
    let old_media = get_media_hashes(&old_conn)?;
    let new_media = get_media_hashes(&new_conn)?;

    // Compare timelines by hash of TrackData
    let old_timelines = get_timeline_hashes(&old_conn)?;
    let new_timelines = get_timeline_hashes(&new_conn)?;

    // ... compare and populate changes

    Ok(changes)
}

fn get_media_hashes(conn: &Connection) -> Result<HashMap<i64, Hash>> {
    let mut stmt = conn.prepare(
        "SELECT DbId, FilePath, MediaInfo FROM SM_MediaPool"
    )?;
    // Hash relevant fields for each item
    // ...
}
```

---

## Adobe After Effects (.aep)

### File Structure

After Effects projects use the **RIFX** format (big-endian RIFF):

```
.aep
└── RIFX container
    ├── Akef (After Effects header)
    │   ├── head (Project header)
    │   ├── fold (Folders)
    │   ├── item (Project items)
    │   │   ├── Pin  (Project item)
    │   │   ├── sspc (Source spec)
    │   │   └── idta (Item data)
    │   ├── comp (Compositions)
    │   │   ├── cdta (Comp data)
    │   │   ├── layr (Layers)
    │   │   └── mask (Masks)
    │   └── EfDf (Effects)
    └── LIST chunks
```

### Parsing Strategy

```rust
pub struct AepProject {
    pub version: u32,
    pub items: Vec<ProjectItem>,
    pub compositions: Vec<Composition>,
    pub footage: Vec<FootageItem>,
}

pub fn parse_aep(path: &Path) -> Result<AepProject> {
    let data = std::fs::read(path)?;

    // Check RIFX header
    if &data[0..4] != b"RIFX" {
        return Err(Error::InvalidFormat);
    }

    let file_size = u32::from_be_bytes(data[4..8].try_into()?);
    let form_type = &data[8..12];  // Should be "Akef"

    let mut project = AepProject::default();
    let mut offset = 12;

    while offset < data.len() {
        let chunk = parse_chunk(&data[offset..])?;

        match chunk.id.as_slice() {
            b"head" => project.version = parse_header(&chunk.data)?,
            b"item" => project.items.push(parse_item(&chunk.data)?),
            b"comp" => project.compositions.push(parse_comp(&chunk.data)?),
            b"fold" => { /* Parse folder structure */ }
            _ => { /* Skip unknown chunks */ }
        }

        offset += 8 + chunk.size as usize;
        // Align to 2-byte boundary
        if offset % 2 != 0 { offset += 1; }
    }

    Ok(project)
}

struct Chunk {
    id: [u8; 4],
    size: u32,
    data: Vec<u8>,
}

fn parse_chunk(data: &[u8]) -> Result<Chunk> {
    let id = data[0..4].try_into()?;
    let size = u32::from_be_bytes(data[4..8].try_into()?);
    let data = data[8..8 + size as usize].to_vec();
    Ok(Chunk { id, size, data })
}
```

### Key Structures

```rust
#[derive(Debug)]
pub struct FootageItem {
    pub id: u32,
    pub name: String,
    pub file_path: Option<PathBuf>,
    pub width: u32,
    pub height: u32,
    pub frame_rate: f64,
    pub duration: Duration,
    pub alpha_mode: AlphaMode,
}

#[derive(Debug)]
pub struct Composition {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub frame_rate: f64,
    pub duration: Duration,
    pub layers: Vec<Layer>,
}

#[derive(Debug)]
pub struct Layer {
    pub id: u32,
    pub name: String,
    pub source_id: Option<u32>,  // Reference to footage/comp
    pub in_point: f64,
    pub out_point: f64,
    pub start_time: f64,
    pub transform: Transform,
    pub effects: Vec<Effect>,
    pub masks: Vec<Mask>,
}
```

### Binary Format Details

After Effects uses a complex binary format with various data types:

```rust
// Common AE binary patterns
fn read_ae_string(data: &[u8], offset: &mut usize) -> String {
    let len = u16::from_be_bytes(data[*offset..*offset+2].try_into().unwrap()) as usize;
    *offset += 2;

    // UTF-16 BE encoding
    let utf16: Vec<u16> = data[*offset..*offset + len * 2]
        .chunks(2)
        .map(|c| u16::from_be_bytes([c[0], c[1]]))
        .collect();
    *offset += len * 2;

    String::from_utf16_lossy(&utf16)
}

fn read_ae_path(data: &[u8], offset: &mut usize) -> PathBuf {
    // AE stores paths with platform-specific encoding
    let platform = data[*offset];
    *offset += 1;

    match platform {
        0 => read_mac_path(data, offset),
        1 => read_win_path(data, offset),
        _ => PathBuf::new(),
    }
}
```

---

## Final Cut Pro X (.fcpxml)

### File Structure

FCPXML is **plain XML** - the simplest format to parse:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.11">
  <resources>
    <format id="r1" name="FFVideoFormat1080p24"/>
    <asset id="r2" name="interview.mov" src="file:///path/to/interview.mov">
      <media-rep kind="original-media" src="file:///path/to/interview.mov"/>
    </asset>
  </resources>

  <library>
    <event name="My Event">
      <project name="My Project">
        <sequence format="r1">
          <spine>
            <asset-clip ref="r2" offset="0s" duration="120s">
              <video ref="r2"/>
            </asset-clip>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
```

### Parsing Strategy

```rust
use quick_xml::de::from_str;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Fcpxml {
    pub version: String,
    pub resources: Resources,
    pub library: Library,
}

#[derive(Debug, Deserialize)]
pub struct Resources {
    #[serde(rename = "format", default)]
    pub formats: Vec<Format>,
    #[serde(rename = "asset", default)]
    pub assets: Vec<Asset>,
}

#[derive(Debug, Deserialize)]
pub struct Asset {
    pub id: String,
    pub name: String,
    pub src: Option<String>,
    pub duration: Option<String>,
}

pub fn parse_fcpxml(path: &Path) -> Result<Fcpxml> {
    let content = std::fs::read_to_string(path)?;
    let project: Fcpxml = from_str(&content)?;
    Ok(project)
}
```

---

## Common Abstractions

### Unified Project Model

```rust
/// Unified project representation across all NLE formats
pub struct UnifiedProject {
    pub format: NleFormat,
    pub name: String,
    pub media_references: Vec<UnifiedMediaRef>,
    pub sequences: Vec<UnifiedSequence>,
    pub last_modified: SystemTime,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UnifiedMediaRef {
    pub id: String,
    pub file_path: PathBuf,
    pub media_type: MediaType,
    pub duration: Option<Duration>,
    pub usage_count: u32,  // How many times used in project
}

pub enum NleFormat {
    Premiere,
    Resolve,
    AfterEffects,
    FinalCutPro,
    Avid,
}

/// Parser trait for all NLE formats
pub trait NleParser {
    fn parse(&self, path: &Path) -> Result<UnifiedProject>;
    fn detect_changes(&self, old: &Path, new: &Path) -> Result<ProjectChanges>;
    fn get_media_references(&self, path: &Path) -> Result<Vec<UnifiedMediaRef>>;
}
```

### Change Detection API

```rust
#[derive(Debug, Default)]
pub struct ProjectChanges {
    /// New media files added to project
    pub added_media: Vec<PathBuf>,
    /// Media files removed from project
    pub removed_media: Vec<PathBuf>,
    /// Media files with changed references
    pub modified_media_refs: Vec<PathBuf>,
    /// New sequences created
    pub added_sequences: Vec<String>,
    /// Sequences removed
    pub removed_sequences: Vec<String>,
    /// Sequences with timeline changes
    pub modified_sequences: Vec<String>,
    /// Whether project settings changed
    pub settings_changed: bool,
}

impl ProjectChanges {
    pub fn is_empty(&self) -> bool {
        self.added_media.is_empty()
            && self.removed_media.is_empty()
            && self.modified_media_refs.is_empty()
            && self.added_sequences.is_empty()
            && self.removed_sequences.is_empty()
            && self.modified_sequences.is_empty()
            && !self.settings_changed
    }

    /// Get all media files that should be considered for locking
    pub fn affected_media(&self) -> Vec<PathBuf> {
        let mut affected = Vec::new();
        affected.extend(self.added_media.clone());
        affected.extend(self.modified_media_refs.clone());
        affected
    }
}
```

---

## Integration with Dits

### Pre-commit Hook

```rust
/// Called before committing to analyze project changes
pub async fn analyze_project_changes(
    repo: &Repository,
    staged_files: &[PathBuf],
) -> Result<ProjectAnalysis> {
    let mut analysis = ProjectAnalysis::default();

    for file in staged_files {
        if let Some(format) = detect_nle_format(file) {
            let parser = get_parser(format);

            // Get previous version from HEAD
            if let Ok(prev_content) = repo.read_file_at_head(file).await {
                let temp_old = write_temp_file(&prev_content)?;
                let changes = parser.detect_changes(&temp_old, file)?;

                // Check if affected media is locked by others
                for media in changes.affected_media() {
                    if let Some(lock) = repo.get_lock(&media).await? {
                        if !lock.is_owned_by_current_user() {
                            analysis.lock_conflicts.push(LockConflict {
                                file: media,
                                owner: lock.owner.clone(),
                            });
                        }
                    }
                }

                analysis.changes.insert(file.clone(), changes);
            }
        }
    }

    Ok(analysis)
}
```

### Smart Chunking for Project Files

```rust
/// Chunk project file based on structure
pub fn chunk_project_file(
    path: &Path,
    content: &[u8],
) -> Result<Vec<Chunk>> {
    let format = detect_nle_format(path)
        .ok_or(Error::UnsupportedFormat)?;

    match format {
        NleFormat::Premiere => {
            // Decompress and chunk XML sections
            chunk_premiere_project(content)
        }
        NleFormat::Resolve => {
            // Chunk SQLite tables separately
            chunk_resolve_project(content)
        }
        NleFormat::AfterEffects => {
            // Chunk RIFX sections
            chunk_aep_project(content)
        }
        NleFormat::FinalCutPro => {
            // Standard chunking is fine for XML
            default_chunker(content)
        }
    }
}
```

---

## Testing Strategy

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Test projects stored in tests/fixtures/
    const PREMIERE_V2022: &[u8] = include_bytes!("../tests/fixtures/premiere_2022.prproj");
    const RESOLVE_V18: &[u8] = include_bytes!("../tests/fixtures/resolve_18.drp");
    const AE_V2023: &[u8] = include_bytes!("../tests/fixtures/ae_2023.aep");

    #[test]
    fn test_premiere_parsing() {
        let project = parse_prproj_bytes(PREMIERE_V2022).unwrap();
        assert!(!project.sequences.is_empty());
        assert!(!project.media_refs.is_empty());
    }

    #[test]
    fn test_premiere_media_extraction() {
        let project = parse_prproj_bytes(PREMIERE_V2022).unwrap();
        let media = project.media_refs.iter()
            .filter(|m| m.file_path.exists())
            .collect::<Vec<_>>();

        // Verify paths are properly parsed
        for m in media {
            assert!(m.file_path.is_absolute());
        }
    }

    #[test]
    fn test_change_detection() {
        let old_project = parse_prproj_bytes(PREMIERE_V2022).unwrap();
        // Modify project...
        let new_project = /* modified version */;

        let changes = detect_prproj_changes(&old_project, &new_project);
        assert!(!changes.is_empty());
    }
}
```

---

## Implementation Priority

1. **Phase 1**: Adobe Premiere Pro (.prproj) - Most common format
2. **Phase 2**: DaVinci Resolve (.drp) - Growing market share
3. **Phase 3**: Final Cut Pro X (.fcpxml) - Simple XML format
4. **Phase 4**: After Effects (.aep) - Complex but important
5. **Future**: Avid Media Composer - Enterprise market

