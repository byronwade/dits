# NLE Parser Specifications

Parsers for Non-Linear Editing (NLE) project files to extract asset dependencies.

---

## Overview

NLE project files reference external media assets. Dits parses these files to:

1. **Extract dependencies** - Know which assets must be included with a commit
2. **Detect missing assets** - Warn about "media offline" scenarios
3. **Track relationships** - Understand project structure
4. **Enable smart sync** - Only download assets actually used

---

## Supported Formats

| Application | Format | Extension | Parser Strategy |
|-------------|--------|-----------|-----------------|
| Adobe Premiere Pro | Compressed XML | `.prproj` | GZip + XML |
| DaVinci Resolve | Proprietary binary | `.drp` | Binary parsing (export format only) |
| DaVinci Resolve | PostgreSQL DB | Internal | SQL queries (Resolve DB, not .drp) |
| After Effects | RIFX binary | `.aep` | RIFX container parsing |
| After Effects | XML | `.aepx` | XML parsing |
| Final Cut Pro X | XML | `.fcpxml` | XML |
| Avid Media Composer | Binary | `.avp` | Proprietary |

> **Note on DaVinci Resolve**: The `.drp` file is a proprietary binary export format, NOT a SQLite database. Resolve stores its actual project data in a PostgreSQL database (or disk database for local projects). The parser below is for the Resolve database, not the `.drp` export file.

---

## Adobe Premiere Pro (.prproj)

### Format Structure

Premiere project files are GZip-compressed XML:

```rust
/// Premiere Pro project parser
pub struct PremiereParser;

impl PremiereParser {
    /// Parse .prproj file
    pub fn parse(path: &Path) -> Result<PremiereProject> {
        // Decompress gzip
        let file = File::open(path)?;
        let mut decoder = GzDecoder::new(file);
        let mut xml_content = String::new();
        decoder.read_to_string(&mut xml_content)?;

        // Parse XML
        let doc = roxmltree::Document::parse(&xml_content)?;
        let root = doc.root_element();

        Self::parse_project(&root)
    }

    fn parse_project(root: &roxmltree::Node) -> Result<PremiereProject> {
        let mut project = PremiereProject::default();

        // Find project root
        let project_node = root.descendants()
            .find(|n| n.tag_name().name() == "Project")
            .ok_or(Error::InvalidProject)?;

        // Extract project metadata
        project.name = Self::get_attribute(&project_node, "ObjectName")?;
        project.version = Self::get_attribute(&project_node, "Version")?;

        // Find all media references
        for node in root.descendants() {
            match node.tag_name().name() {
                "Media" => {
                    if let Ok(media) = Self::parse_media_node(&node) {
                        project.media_items.push(media);
                    }
                }
                "Sequence" => {
                    if let Ok(seq) = Self::parse_sequence(&node) {
                        project.sequences.push(seq);
                    }
                }
                "Bin" => {
                    if let Ok(bin) = Self::parse_bin(&node) {
                        project.bins.push(bin);
                    }
                }
                _ => {}
            }
        }

        // Resolve file paths
        Self::resolve_paths(&mut project)?;

        Ok(project)
    }

    /// Parse media reference node
    fn parse_media_node(node: &roxmltree::Node) -> Result<MediaReference> {
        let mut media = MediaReference::default();

        // Get file path
        for child in node.children() {
            match child.tag_name().name() {
                "FilePath" => {
                    media.file_path = Self::extract_text(&child);
                }
                "InstanceID" => {
                    media.instance_id = Self::extract_text(&child);
                }
                "MediaType" => {
                    media.media_type = Self::parse_media_type(&child)?;
                }
                "VideoInfo" => {
                    media.video_info = Some(Self::parse_video_info(&child)?);
                }
                "AudioInfo" => {
                    media.audio_info = Some(Self::parse_audio_info(&child)?);
                }
                _ => {}
            }
        }

        Ok(media)
    }

    /// Parse sequence node
    fn parse_sequence(node: &roxmltree::Node) -> Result<Sequence> {
        let mut sequence = Sequence::default();

        sequence.name = Self::get_attribute(node, "ObjectName")?;
        sequence.id = Self::get_attribute(node, "ObjectUID")?;

        // Parse timeline settings
        if let Some(settings) = node.descendants()
            .find(|n| n.tag_name().name() == "VideoDisplayFormat")
        {
            sequence.frame_rate = Self::parse_frame_rate(&settings)?;
        }

        // Parse video tracks
        for track_node in node.descendants()
            .filter(|n| n.tag_name().name() == "VideoTrack")
        {
            sequence.video_tracks.push(Self::parse_track(&track_node)?);
        }

        // Parse audio tracks
        for track_node in node.descendants()
            .filter(|n| n.tag_name().name() == "AudioTrack")
        {
            sequence.audio_tracks.push(Self::parse_track(&track_node)?);
        }

        Ok(sequence)
    }

    /// Parse track and extract clip references
    fn parse_track(node: &roxmltree::Node) -> Result<Track> {
        let mut track = Track::default();

        track.name = Self::get_attribute(node, "TrackName").unwrap_or_default();

        for clip_node in node.descendants()
            .filter(|n| n.tag_name().name() == "ClipTrackItem")
        {
            let clip = Self::parse_clip(&clip_node)?;
            track.clips.push(clip);
        }

        Ok(track)
    }

    /// Parse clip reference
    fn parse_clip(node: &roxmltree::Node) -> Result<ClipReference> {
        let mut clip = ClipReference::default();

        clip.name = Self::get_attribute(node, "Name").unwrap_or_default();

        // Get start/end times
        if let Some(start) = node.descendants()
            .find(|n| n.tag_name().name() == "Start")
        {
            clip.start_time = Self::parse_timecode(&start)?;
        }

        if let Some(end) = node.descendants()
            .find(|n| n.tag_name().name() == "End")
        {
            clip.end_time = Self::parse_timecode(&end)?;
        }

        // Get media reference
        if let Some(media_ref) = node.descendants()
            .find(|n| n.tag_name().name() == "Media")
        {
            clip.media_id = Self::get_attribute(&media_ref, "ObjectRef")?;
        }

        // Get in/out points
        if let Some(in_point) = node.descendants()
            .find(|n| n.tag_name().name() == "InPoint")
        {
            clip.in_point = Self::parse_timecode(&in_point)?;
        }

        if let Some(out_point) = node.descendants()
            .find(|n| n.tag_name().name() == "OutPoint")
        {
            clip.out_point = Self::parse_timecode(&out_point)?;
        }

        Ok(clip)
    }

    /// Resolve relative paths to absolute
    fn resolve_paths(project: &mut PremiereProject) -> Result<()> {
        for media in &mut project.media_items {
            // Handle Premiere's path format
            // e.g., "file://localhost/Users/..."
            if media.file_path.starts_with("file://") {
                media.resolved_path = Some(
                    url_to_path(&media.file_path)?
                );
            } else {
                media.resolved_path = Some(PathBuf::from(&media.file_path));
            }
        }
        Ok(())
    }
}

/// Premiere project structure
#[derive(Debug, Default)]
pub struct PremiereProject {
    pub name: String,
    pub version: String,
    pub media_items: Vec<MediaReference>,
    pub sequences: Vec<Sequence>,
    pub bins: Vec<Bin>,
}

#[derive(Debug, Default)]
pub struct MediaReference {
    pub file_path: String,
    pub resolved_path: Option<PathBuf>,
    pub instance_id: String,
    pub media_type: MediaType,
    pub video_info: Option<VideoInfo>,
    pub audio_info: Option<AudioInfo>,
}

#[derive(Debug, Default)]
pub struct Sequence {
    pub name: String,
    pub id: String,
    pub frame_rate: FrameRate,
    pub video_tracks: Vec<Track>,
    pub audio_tracks: Vec<Track>,
}

#[derive(Debug, Default)]
pub struct Track {
    pub name: String,
    pub clips: Vec<ClipReference>,
}

#[derive(Debug, Default)]
pub struct ClipReference {
    pub name: String,
    pub media_id: String,
    pub start_time: i64,
    pub end_time: i64,
    pub in_point: i64,
    pub out_point: i64,
}
```

---

## DaVinci Resolve (Database)

### Format Structure

DaVinci Resolve stores project data in a PostgreSQL database (for shared databases) or a local disk database. The `.drp` file is a proprietary binary export format that cannot be easily parsed.

To access Resolve project data programmatically, you need to query the Resolve database directly (not the .drp file):

```rust
/// DaVinci Resolve database parser
/// Note: This parses the Resolve database directly, NOT .drp export files.
/// For disk databases, the path is typically:
/// - macOS: ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Resolve Disk Database/
/// - Windows: %APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Resolve Disk Database\
/// - Linux: ~/.local/share/DaVinciResolve/Resolve Disk Database/
pub struct ResolveParser;

impl ResolveParser {
    /// Parse Resolve database
    pub fn parse(db_path: &Path) -> Result<ResolveProject> {
        // Connect to Resolve database
        let conn = Connection::open(db_path)?;

        let mut project = ResolveProject::default();

        // Get project metadata
        project.name = Self::get_project_name(&conn)?;
        project.frame_rate = Self::get_frame_rate(&conn)?;

        // Get all media pool items
        project.media_items = Self::get_media_pool_items(&conn)?;

        // Get timelines
        project.timelines = Self::get_timelines(&conn)?;

        // Get timeline clips and their media references
        for timeline in &mut project.timelines {
            timeline.clips = Self::get_timeline_clips(&conn, &timeline.id)?;
        }

        Ok(project)
    }

    /// Query project name
    fn get_project_name(conn: &Connection) -> Result<String> {
        let name: String = conn.query_row(
            "SELECT value FROM Sm2MpPrefs WHERE key = 'projectName'",
            [],
            |row| row.get(0),
        )?;
        Ok(name)
    }

    /// Query media pool items
    fn get_media_pool_items(conn: &Connection) -> Result<Vec<MediaPoolItem>> {
        let mut stmt = conn.prepare(r#"
            SELECT
                id,
                name,
                filePath,
                mediaType,
                duration,
                width,
                height,
                fps,
                audioChannels,
                sampleRate
            FROM MediaPoolItems
        "#)?;

        let items = stmt.query_map([], |row| {
            Ok(MediaPoolItem {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                media_type: row.get(3)?,
                duration: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                fps: row.get(7)?,
                audio_channels: row.get(8)?,
                sample_rate: row.get(9)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    /// Query timelines
    fn get_timelines(conn: &Connection) -> Result<Vec<Timeline>> {
        let mut stmt = conn.prepare(r#"
            SELECT
                id,
                name,
                startTimecode,
                frameRate
            FROM Timelines
        "#)?;

        let timelines = stmt.query_map([], |row| {
            Ok(Timeline {
                id: row.get(0)?,
                name: row.get(1)?,
                start_timecode: row.get(2)?,
                frame_rate: row.get(3)?,
                clips: Vec::new(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(timelines)
    }

    /// Query timeline clips
    fn get_timeline_clips(conn: &Connection, timeline_id: &str) -> Result<Vec<TimelineClip>> {
        let mut stmt = conn.prepare(r#"
            SELECT
                c.id,
                c.mediaPoolItemId,
                c.trackType,
                c.trackIndex,
                c.startFrame,
                c.endFrame,
                c.inPoint,
                c.outPoint,
                m.filePath
            FROM TimelineClips c
            LEFT JOIN MediaPoolItems m ON c.mediaPoolItemId = m.id
            WHERE c.timelineId = ?
            ORDER BY c.trackIndex, c.startFrame
        "#)?;

        let clips = stmt.query_map([timeline_id], |row| {
            Ok(TimelineClip {
                id: row.get(0)?,
                media_pool_item_id: row.get(1)?,
                track_type: row.get(2)?,
                track_index: row.get(3)?,
                start_frame: row.get(4)?,
                end_frame: row.get(5)?,
                in_point: row.get(6)?,
                out_point: row.get(7)?,
                file_path: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(clips)
    }
}

#[derive(Debug, Default)]
pub struct ResolveProject {
    pub name: String,
    pub frame_rate: f64,
    pub media_items: Vec<MediaPoolItem>,
    pub timelines: Vec<Timeline>,
}

#[derive(Debug, Default)]
pub struct MediaPoolItem {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub media_type: String,
    pub duration: i64,
    pub width: i32,
    pub height: i32,
    pub fps: f64,
    pub audio_channels: i32,
    pub sample_rate: i32,
}

#[derive(Debug, Default)]
pub struct Timeline {
    pub id: String,
    pub name: String,
    pub start_timecode: String,
    pub frame_rate: f64,
    pub clips: Vec<TimelineClip>,
}

#[derive(Debug, Default)]
pub struct TimelineClip {
    pub id: String,
    pub media_pool_item_id: String,
    pub track_type: String,
    pub track_index: i32,
    pub start_frame: i64,
    pub end_frame: i64,
    pub in_point: i64,
    pub out_point: i64,
    pub file_path: Option<String>,
}
```

---

## After Effects (.aep)

### Format Structure

After Effects uses RIFX (big-endian RIFF) container with embedded binary data:

```rust
/// After Effects project parser
pub struct AfterEffectsParser;

impl AfterEffectsParser {
    /// Parse .aep file
    pub fn parse(path: &Path) -> Result<AfterEffectsProject> {
        let data = fs::read(path)?;

        // Validate RIFX header
        if &data[0..4] != b"RIFX" {
            return Err(Error::InvalidFormat("Not a RIFX file"));
        }

        let mut project = AfterEffectsProject::default();

        // Parse RIFX chunks
        let chunks = Self::parse_rifx(&data)?;

        for chunk in &chunks {
            match &chunk.id {
                b"Fold" => {
                    project.folders.extend(Self::parse_folders(&chunk.data)?);
                }
                b"Item" => {
                    if let Ok(item) = Self::parse_item(&chunk.data) {
                        project.items.push(item);
                    }
                }
                b"Comp" => {
                    if let Ok(comp) = Self::parse_composition(&chunk.data) {
                        project.compositions.push(comp);
                    }
                }
                b"Layr" => {
                    if let Ok(layer) = Self::parse_layer(&chunk.data) {
                        project.layers.push(layer);
                    }
                }
                _ => {}
            }
        }

        // Extract file references
        project.file_references = Self::extract_file_references(&project)?;

        Ok(project)
    }

    /// Parse RIFX chunk structure
    fn parse_rifx(data: &[u8]) -> Result<Vec<RifxChunk>> {
        let mut chunks = Vec::new();
        let mut offset = 12;  // Skip RIFX header

        while offset + 8 < data.len() {
            let id: [u8; 4] = data[offset..offset + 4].try_into()?;
            let size = u32::from_be_bytes(data[offset + 4..offset + 8].try_into()?) as usize;

            if offset + 8 + size > data.len() {
                break;
            }

            chunks.push(RifxChunk {
                id,
                size,
                data: data[offset + 8..offset + 8 + size].to_vec(),
            });

            offset += 8 + size;
            if size % 2 == 1 {
                offset += 1;  // Pad to even boundary
            }
        }

        Ok(chunks)
    }

    /// Parse item (footage, solid, etc.)
    fn parse_item(data: &[u8]) -> Result<AeItem> {
        let mut item = AeItem::default();

        // Item structure is binary, parse fields
        let mut cursor = Cursor::new(data);

        item.id = cursor.read_u32::<BigEndian>()?;
        item.item_type = cursor.read_u16::<BigEndian>()?;

        // Read name (length-prefixed string)
        let name_len = cursor.read_u16::<BigEndian>()? as usize;
        let mut name_bytes = vec![0u8; name_len];
        cursor.read_exact(&mut name_bytes)?;
        item.name = String::from_utf8_lossy(&name_bytes).to_string();

        // For footage items, read file path
        if item.item_type == 1 {  // Footage
            // Skip to file path field
            cursor.seek(SeekFrom::Current(20))?;

            let path_len = cursor.read_u32::<BigEndian>()? as usize;
            if path_len > 0 && path_len < 10000 {
                let mut path_bytes = vec![0u8; path_len * 2];  // UTF-16
                cursor.read_exact(&mut path_bytes)?;

                // Convert UTF-16 to string
                let path_u16: Vec<u16> = path_bytes.chunks(2)
                    .map(|c| u16::from_be_bytes([c[0], c[1]]))
                    .collect();
                item.file_path = Some(String::from_utf16_lossy(&path_u16));
            }
        }

        Ok(item)
    }

    /// Parse composition
    fn parse_composition(data: &[u8]) -> Result<AeComposition> {
        let mut comp = AeComposition::default();
        let mut cursor = Cursor::new(data);

        comp.id = cursor.read_u32::<BigEndian>()?;

        // Read dimensions
        cursor.seek(SeekFrom::Current(8))?;
        comp.width = cursor.read_u32::<BigEndian>()?;
        comp.height = cursor.read_u32::<BigEndian>()?;

        // Read frame rate
        comp.frame_rate = cursor.read_f32::<BigEndian>()?;

        // Read duration
        comp.duration = cursor.read_f64::<BigEndian>()?;

        Ok(comp)
    }

    /// Extract all file references from project
    fn extract_file_references(project: &AfterEffectsProject) -> Result<Vec<FileReference>> {
        let mut refs = Vec::new();

        for item in &project.items {
            if let Some(path) = &item.file_path {
                refs.push(FileReference {
                    item_id: item.id,
                    item_name: item.name.clone(),
                    file_path: path.clone(),
                    resolved_path: resolve_ae_path(path),
                });
            }
        }

        Ok(refs)
    }
}

#[derive(Debug, Default)]
pub struct AfterEffectsProject {
    pub items: Vec<AeItem>,
    pub compositions: Vec<AeComposition>,
    pub layers: Vec<AeLayer>,
    pub folders: Vec<AeFolder>,
    pub file_references: Vec<FileReference>,
}

#[derive(Debug, Default)]
pub struct AeItem {
    pub id: u32,
    pub item_type: u16,
    pub name: String,
    pub file_path: Option<String>,
}

#[derive(Debug, Default)]
pub struct AeComposition {
    pub id: u32,
    pub width: u32,
    pub height: u32,
    pub frame_rate: f32,
    pub duration: f64,
}

#[derive(Debug)]
struct RifxChunk {
    id: [u8; 4],
    size: usize,
    data: Vec<u8>,
}
```

---

## Final Cut Pro X (.fcpxml)

### Format Structure

FCPXML is straightforward XML:

```rust
/// Final Cut Pro X parser
pub struct FcpxParser;

impl FcpxParser {
    /// Parse .fcpxml file
    pub fn parse(path: &Path) -> Result<FcpxProject> {
        let content = fs::read_to_string(path)?;
        let doc = roxmltree::Document::parse(&content)?;

        let mut project = FcpxProject::default();

        // Find fcpxml root
        let root = doc.root_element();
        if root.tag_name().name() != "fcpxml" {
            return Err(Error::InvalidFormat("Not an FCPXML file"));
        }

        project.version = root.attribute("version")
            .unwrap_or("1.0")
            .to_string();

        // Parse resources (media references)
        for resource in root.descendants()
            .filter(|n| n.tag_name().name() == "asset")
        {
            project.assets.push(Self::parse_asset(&resource)?);
        }

        // Parse events
        for event in root.descendants()
            .filter(|n| n.tag_name().name() == "event")
        {
            project.events.push(Self::parse_event(&event)?);
        }

        // Parse projects/timelines
        for proj in root.descendants()
            .filter(|n| n.tag_name().name() == "project")
        {
            project.projects.push(Self::parse_project_element(&proj)?);
        }

        Ok(project)
    }

    /// Parse asset element
    fn parse_asset(node: &roxmltree::Node) -> Result<FcpxAsset> {
        Ok(FcpxAsset {
            id: node.attribute("id").unwrap_or("").to_string(),
            name: node.attribute("name").unwrap_or("").to_string(),
            src: node.attribute("src").map(|s| s.to_string()),
            format: node.attribute("format").map(|s| s.to_string()),
            duration: Self::parse_time(node.attribute("duration")),
            has_video: node.attribute("hasVideo").map(|s| s == "1"),
            has_audio: node.attribute("hasAudio").map(|s| s == "1"),
        })
    }

    /// Parse event element
    fn parse_event(node: &roxmltree::Node) -> Result<FcpxEvent> {
        let mut event = FcpxEvent {
            name: node.attribute("name").unwrap_or("").to_string(),
            clips: Vec::new(),
        };

        for clip in node.descendants()
            .filter(|n| matches!(n.tag_name().name(),
                "asset-clip" | "clip" | "video" | "audio" | "mc-clip"
            ))
        {
            event.clips.push(Self::parse_clip(&clip)?);
        }

        Ok(event)
    }

    /// Parse clip element
    fn parse_clip(node: &roxmltree::Node) -> Result<FcpxClip> {
        Ok(FcpxClip {
            name: node.attribute("name").unwrap_or("").to_string(),
            ref_id: node.attribute("ref").map(|s| s.to_string()),
            offset: Self::parse_time(node.attribute("offset")),
            duration: Self::parse_time(node.attribute("duration")),
            start: Self::parse_time(node.attribute("start")),
        })
    }

    /// Parse FCPXML time string (e.g., "1001/24000s")
    fn parse_time(s: Option<&str>) -> Option<f64> {
        let s = s?;
        if let Some(idx) = s.find('/') {
            let num: f64 = s[..idx].parse().ok()?;
            let rest = &s[idx + 1..];
            let den_end = rest.find('s').unwrap_or(rest.len());
            let den: f64 = rest[..den_end].parse().ok()?;
            Some(num / den)
        } else if s.ends_with('s') {
            s[..s.len() - 1].parse().ok()
        } else {
            s.parse().ok()
        }
    }
}

#[derive(Debug, Default)]
pub struct FcpxProject {
    pub version: String,
    pub assets: Vec<FcpxAsset>,
    pub events: Vec<FcpxEvent>,
    pub projects: Vec<FcpxProjectElement>,
}

#[derive(Debug, Default)]
pub struct FcpxAsset {
    pub id: String,
    pub name: String,
    pub src: Option<String>,
    pub format: Option<String>,
    pub duration: Option<f64>,
    pub has_video: Option<bool>,
    pub has_audio: Option<bool>,
}

#[derive(Debug, Default)]
pub struct FcpxEvent {
    pub name: String,
    pub clips: Vec<FcpxClip>,
}

#[derive(Debug, Default)]
pub struct FcpxClip {
    pub name: String,
    pub ref_id: Option<String>,
    pub offset: Option<f64>,
    pub duration: Option<f64>,
    pub start: Option<f64>,
}
```

---

## Unified Dependency Extraction

```rust
/// Common interface for all NLE parsers
pub trait NleParser {
    /// Get all file dependencies
    fn get_dependencies(&self) -> Vec<FileDependency>;

    /// Get missing files
    fn get_missing_files(&self, repo_root: &Path) -> Vec<MissingFile>;

    /// Get project metadata
    fn get_metadata(&self) -> ProjectMetadata;
}

/// File dependency
#[derive(Debug, Clone)]
pub struct FileDependency {
    /// Path to file (may be absolute or relative)
    pub path: String,

    /// Resolved absolute path
    pub resolved_path: Option<PathBuf>,

    /// Relative path within repository
    pub repo_path: Option<String>,

    /// Type of dependency
    pub dep_type: DependencyType,

    /// Is this file required for project to open?
    pub required: bool,

    /// Usage information
    pub usage: Vec<UsageInfo>,
}

#[derive(Debug, Clone)]
pub enum DependencyType {
    Footage,
    Audio,
    Image,
    Project,  // Nested project
    Font,
    Plugin,
    Lut,
    Other,
}

#[derive(Debug, Clone)]
pub struct UsageInfo {
    /// Sequence/timeline name
    pub container: String,

    /// Track name/index
    pub track: String,

    /// In/out points used
    pub in_point: Option<f64>,
    pub out_point: Option<f64>,
}

/// Unified parser entry point
pub fn parse_project(path: &Path) -> Result<Box<dyn NleParser>> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match ext.as_deref() {
        Some("prproj") => {
            let project = PremiereParser::parse(path)?;
            Ok(Box::new(project))
        }
        Some("drp") => {
            let project = ResolveParser::parse(path)?;
            Ok(Box::new(project))
        }
        Some("aep") => {
            let project = AfterEffectsParser::parse(path)?;
            Ok(Box::new(project))
        }
        Some("fcpxml") => {
            let project = FcpxParser::parse(path)?;
            Ok(Box::new(project))
        }
        _ => Err(Error::UnsupportedFormat),
    }
}

/// Implement NleParser for Premiere
impl NleParser for PremiereProject {
    fn get_dependencies(&self) -> Vec<FileDependency> {
        self.media_items.iter().map(|m| FileDependency {
            path: m.file_path.clone(),
            resolved_path: m.resolved_path.clone(),
            repo_path: None,
            dep_type: match m.media_type {
                MediaType::Video => DependencyType::Footage,
                MediaType::Audio => DependencyType::Audio,
                MediaType::Image => DependencyType::Image,
                _ => DependencyType::Other,
            },
            required: true,
            usage: self.get_media_usage(&m.instance_id),
        }).collect()
    }

    fn get_missing_files(&self, repo_root: &Path) -> Vec<MissingFile> {
        self.get_dependencies()
            .into_iter()
            .filter(|d| {
                d.resolved_path.as_ref()
                    .map(|p| !p.exists())
                    .unwrap_or(true)
            })
            .map(|d| MissingFile {
                original_path: d.path,
                expected_path: d.resolved_path,
                dependency_type: d.dep_type,
            })
            .collect()
    }

    fn get_metadata(&self) -> ProjectMetadata {
        ProjectMetadata {
            name: self.name.clone(),
            app: "Adobe Premiere Pro".to_string(),
            version: self.version.clone(),
            sequence_count: self.sequences.len(),
        }
    }
}
```

---

## Integration with Dits

```rust
/// Extract dependencies when committing project file
pub async fn extract_project_dependencies(
    project_path: &Path,
    repo: &Repository,
) -> Result<DependencyGraph> {
    let parser = parse_project(project_path)?;

    let mut graph = DependencyGraph::new();

    let repo_root = repo.working_dir();
    let project_rel_path = project_path.strip_prefix(&repo_root)?;

    // Add project as root
    graph.add_root(project_rel_path.to_string_lossy().to_string());

    // Process dependencies
    for dep in parser.get_dependencies() {
        // Try to resolve to repo-relative path
        let repo_path = if let Some(resolved) = &dep.resolved_path {
            if resolved.starts_with(&repo_root) {
                Some(resolved.strip_prefix(&repo_root)?
                    .to_string_lossy()
                    .to_string())
            } else {
                // File outside repo
                None
            }
        } else {
            None
        };

        graph.add_edge(
            project_rel_path.to_string_lossy().to_string(),
            DependencyEdge {
                target: repo_path.unwrap_or(dep.path.clone()),
                dep_type: dep.dep_type,
                reference: dep.path,
                required: dep.required,
            },
        );
    }

    // Check for missing files
    let missing = parser.get_missing_files(&repo_root);
    if !missing.is_empty() {
        for m in &missing {
            tracing::warn!(
                "Missing dependency: {} (type: {:?})",
                m.original_path,
                m.dependency_type
            );
        }

        if repo.settings().strict_dependencies {
            return Err(Error::MissingDependencies(missing));
        }
    }

    Ok(graph)
}
```

---

## Notes

- Premiere Pro format changes between versions; handle gracefully
- Resolve uses SQLite 3; ensure proper locking
- After Effects binary format is partially documented
- FCPXML is the most stable/documented format
- Always resolve paths relative to repo root
- Warn but don't fail on missing files (media offline scenario)
- Cache parsed project data for performance
