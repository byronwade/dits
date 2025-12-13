# Format Expansion Roadmap

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Multi-Format Support Strategy
**Objective:** Expand Dits beyond video to support photos, PDFs, audio, and other large binary formats while maintaining format-aware optimization.

---

## Current State: Video-First

Dits v1.0 focuses on video with format-aware handling for:
- MP4/MOV/M4V (ISOBMFF containers)
- Atom-level separation (moov/mdat)
- Keyframe-aligned chunking

This document defines the expansion strategy for additional formats.

---

## Format Expansion Principles

### 1. Format-Awareness Over Generic
Each format should be parsed to understand its structure, not just chunked blindly:
- **Better deduplication:** Separate metadata from payload
- **Corruption prevention:** Respect container boundaries
- **Efficient updates:** Metadata-only changes don't re-upload payload

### 2. Incremental Rollout
Add formats based on:
- User demand (surveys, feedback)
- Market opportunity (target industries)
- Technical complexity (lower first)
- Synergy with existing workflows

### 3. Graceful Fallback
Unsupported formats always work with generic chunking:
- Basic deduplication still applies
- No optimization, but no breakage
- User sees "optimized: no" in status

---

## Format Roadmap

### Phase 1: Video (Current - v1.0)

| Format | Extension | Parser Status | Notes |
| :--- | :--- | :--- | :--- |
| MPEG-4 | .mp4, .m4v | Implemented | Full atom support |
| QuickTime | .mov | Implemented | Shares ISOBMFF parser |
| ProRes | .mov | Implemented | Via MOV container |
| MXF | .mxf | Planned | Broadcast standard |
| AVI | .avi | Planned | Legacy support |
| MKV | .mkv | Planned | Open container |

**Implementation Details:**
```rust
pub struct VideoParser {
    pub supported_containers: Vec<ContainerFormat>,
    pub atom_handlers: HashMap<String, AtomHandler>,
}

pub enum ContainerFormat {
    Isobmff,    // MP4, MOV, M4V
    Mxf,        // MXF
    Avi,        // AVI (RIFF-based)
    Matroska,   // MKV, WebM
}

pub trait AtomHandler {
    fn parse(&self, data: &[u8]) -> Result<ParsedAtom>;
    fn is_metadata(&self) -> bool;
    fn can_chunk_independently(&self) -> bool;
}
```

---

### Phase 2: Photos & Images (v1.2)

**Priority:** High - Natural expansion for media workflows
**Target Users:** Photographers, product studios, marketing teams

| Format | Extension | Complexity | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| JPEG | .jpg, .jpeg | Low | Separate EXIF from image data |
| PNG | .png | Low | Chunk by scan lines |
| TIFF | .tif, .tiff | Medium | Page/layer separation |
| RAW (Camera) | .cr2, .nef, .arw, etc. | High | Separate preview from raw data |
| HEIC/HEIF | .heic, .heif | Medium | Similar to MP4 (ISOBMFF) |
| PSD | .psd | High | Layer-based chunking |
| DNG | .dng | Medium | Adobe RAW standard |

#### JPEG Parser

```rust
pub struct JpegParser {
    // JPEG is segment-based (markers)
}

pub struct JpegStructure {
    pub soi: Segment,              // Start of Image
    pub app0_jfif: Option<Segment>, // JFIF header
    pub app1_exif: Option<Segment>, // EXIF metadata (camera info, GPS)
    pub app1_xmp: Option<Segment>,  // XMP metadata
    pub app2_icc: Option<Segment>,  // ICC color profile
    pub dqt: Vec<Segment>,          // Quantization tables
    pub sof: Segment,               // Start of Frame (dimensions, components)
    pub dht: Vec<Segment>,          // Huffman tables
    pub sos: Segment,               // Start of Scan
    pub image_data: Vec<u8>,        // Compressed image data
    pub eoi: Segment,               // End of Image
}

impl JpegParser {
    pub fn parse(&self, data: &[u8]) -> Result<JpegStructure> {
        let mut cursor = 0;
        let mut structure = JpegStructure::default();

        while cursor < data.len() {
            // JPEG markers are 0xFF followed by marker type
            if data[cursor] != 0xFF {
                cursor += 1;
                continue;
            }

            let marker = data[cursor + 1];
            match marker {
                0xD8 => structure.soi = self.parse_soi(&data[cursor..])?,
                0xE0 => structure.app0_jfif = Some(self.parse_app(&data[cursor..])?),
                0xE1 => {
                    let app = self.parse_app(&data[cursor..])?;
                    if app.is_exif() {
                        structure.app1_exif = Some(app);
                    } else if app.is_xmp() {
                        structure.app1_xmp = Some(app);
                    }
                }
                0xDB => structure.dqt.push(self.parse_dqt(&data[cursor..])?),
                0xC0..=0xCF => structure.sof = self.parse_sof(&data[cursor..])?,
                0xC4 => structure.dht.push(self.parse_dht(&data[cursor..])?),
                0xDA => {
                    structure.sos = self.parse_sos(&data[cursor..])?;
                    // Everything after SOS until EOI is image data
                    structure.image_data = self.extract_image_data(&data[cursor..])?;
                }
                0xD9 => structure.eoi = self.parse_eoi(&data[cursor..])?,
                _ => {}
            }
            cursor += self.segment_length(&data[cursor..]);
        }

        Ok(structure)
    }

    pub fn split_for_versioning(&self, structure: &JpegStructure) -> (Vec<u8>, Vec<u8>) {
        // Metadata blob: EXIF, XMP, ICC profile
        let metadata = [
            structure.app1_exif.as_ref().map(|s| s.data.clone()),
            structure.app1_xmp.as_ref().map(|s| s.data.clone()),
            structure.app2_icc.as_ref().map(|s| s.data.clone()),
        ].into_iter().flatten().flatten().collect();

        // Payload: Image data only
        let payload = structure.image_data.clone();

        (metadata, payload)
    }
}
```

#### Camera RAW Parser

```rust
pub struct RawParser {
    pub camera_profiles: HashMap<CameraModel, RawProfile>,
}

pub struct RawProfile {
    pub header_structure: HeaderStructure,
    pub preview_locations: Vec<PreviewType>,
    pub raw_data_offset: u64,
    pub metadata_tags: Vec<TagDefinition>,
}

pub enum PreviewType {
    Thumbnail { offset: u64, size: u64 },
    FullPreview { offset: u64, size: u64, format: PreviewFormat },
}

pub struct RawStructure {
    pub header: Vec<u8>,           // File identification
    pub ifd_entries: Vec<IfdEntry>, // TIFF-style metadata
    pub makernote: Vec<u8>,        // Camera-specific metadata
    pub thumbnail: Option<Vec<u8>>, // Embedded JPEG thumbnail
    pub preview: Option<Vec<u8>>,   // Larger preview (often full JPEG)
    pub raw_data: Vec<u8>,          // Actual sensor data
}

impl RawParser {
    pub fn split_for_versioning(&self, structure: &RawStructure) -> SplitRaw {
        SplitRaw {
            // Metadata changes (ratings, keywords, develop settings)
            // don't require re-uploading the massive raw data
            metadata: bincode::serialize(&structure.ifd_entries).unwrap(),

            // Thumbnail/preview for quick browsing
            thumbnail: structure.thumbnail.clone(),
            preview: structure.preview.clone(),

            // Raw sensor data (largest part, rarely changes)
            raw_data: structure.raw_data.clone(),
        }
    }
}
```

#### PSD Parser (Photoshop)

```rust
pub struct PsdParser;

pub struct PsdStructure {
    pub header: PsdHeader,              // Version, dimensions, color mode
    pub color_mode_data: Vec<u8>,       // Indexed color palette, etc.
    pub image_resources: Vec<ImageResource>, // Metadata, guides, slices
    pub layer_mask_info: LayerMaskInfo, // Layer structure
    pub layers: Vec<PsdLayer>,          // Individual layers
    pub merged_image: Vec<u8>,          // Flattened composite
}

pub struct PsdLayer {
    pub name: String,
    pub bounds: Rect,
    pub opacity: u8,
    pub blend_mode: BlendMode,
    pub flags: LayerFlags,
    pub channels: Vec<ChannelData>,     // Actual pixel data
    pub mask: Option<LayerMask>,
    pub effects: Vec<LayerEffect>,
}

impl PsdParser {
    pub fn split_for_versioning(&self, structure: &PsdStructure) -> SplitPsd {
        // Each layer can be chunked independently
        // This enables layer-level deduplication
        let layer_chunks: Vec<LayerChunk> = structure.layers
            .iter()
            .map(|layer| LayerChunk {
                id: layer.name.clone(),
                metadata: bincode::serialize(&LayerMetadata {
                    name: layer.name.clone(),
                    bounds: layer.bounds,
                    opacity: layer.opacity,
                    blend_mode: layer.blend_mode,
                    effects: layer.effects.clone(),
                }).unwrap(),
                pixel_data: layer.channels.iter()
                    .flat_map(|c| c.data.clone())
                    .collect(),
            })
            .collect();

        SplitPsd {
            document_metadata: bincode::serialize(&structure.header).unwrap(),
            image_resources: structure.image_resources.clone(),
            layer_structure: bincode::serialize(&structure.layer_mask_info).unwrap(),
            layer_chunks,
            merged_image: structure.merged_image.clone(),
        }
    }
}
```

**Photo Workflow Considerations:**
- **Sidecar files:** XMP sidecars (.xmp) should be tracked with their parent
- **RAW+JPEG pairs:** Detect and link together
- **Catalog files:** Lightroom .lrcat, Capture One sessions
- **Batch metadata edits:** Update EXIF/IPTC without re-uploading pixels

---

### Phase 3: Documents & PDFs (v1.4)

**Priority:** Medium - Useful for creative agencies, legal, corporate
**Target Users:** Agencies with brand assets, legal departments, corporate communications

| Format | Extension | Complexity | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| PDF | .pdf | High | Object-level chunking |
| AI (Illustrator) | .ai | High | PDF-based with extensions |
| INDD (InDesign) | .indd | Very High | Binary + linked assets |
| DOCX | .docx | Medium | ZIP of XML + media |
| PPTX | .pptx | Medium | ZIP of XML + media |
| XLSX | .xlsx | Medium | ZIP of XML |

#### PDF Parser

```rust
pub struct PdfParser;

pub struct PdfStructure {
    pub version: PdfVersion,
    pub objects: HashMap<ObjectId, PdfObject>,
    pub xref_table: XrefTable,
    pub trailer: Trailer,
    pub incremental_updates: Vec<IncrementalUpdate>,
}

pub enum PdfObject {
    // Content objects
    Stream {
        dictionary: Dictionary,
        data: Vec<u8>,          // Often compressed (FlateDecode)
    },
    Image {
        id: ObjectId,
        width: u32,
        height: u32,
        color_space: ColorSpace,
        data: Vec<u8>,
    },
    Font {
        id: ObjectId,
        name: String,
        encoding: FontEncoding,
        embedded_data: Option<Vec<u8>>,
    },

    // Structure objects
    Page {
        id: ObjectId,
        contents: Vec<ObjectId>,
        resources: ObjectId,
        media_box: Rect,
    },
    Catalog,
    PageTree,

    // Metadata
    Info {
        title: Option<String>,
        author: Option<String>,
        creator: Option<String>,
        creation_date: Option<DateTime<Utc>>,
        mod_date: Option<DateTime<Utc>>,
    },
    Metadata(Vec<u8>),  // XMP
}

impl PdfParser {
    pub fn split_for_versioning(&self, structure: &PdfStructure) -> SplitPdf {
        // PDFs support incremental updates - only changed objects need re-upload
        let mut chunks = Vec::new();

        // Document structure (small, changes with every edit)
        chunks.push(PdfChunk {
            chunk_type: PdfChunkType::Structure,
            objects: vec![
                structure.objects.get(&structure.trailer.root).cloned(),
                // Page tree, etc.
            ],
        });

        // Embedded images (large, rarely change)
        for (id, obj) in &structure.objects {
            if let PdfObject::Image { data, .. } = obj {
                chunks.push(PdfChunk {
                    chunk_type: PdfChunkType::Image { object_id: *id },
                    data: data.clone(),
                });
            }
        }

        // Embedded fonts (medium, rarely change)
        for (id, obj) in &structure.objects {
            if let PdfObject::Font { embedded_data: Some(data), .. } = obj {
                chunks.push(PdfChunk {
                    chunk_type: PdfChunkType::Font { object_id: *id },
                    data: data.clone(),
                });
            }
        }

        // Page content (changes with edits)
        for (id, obj) in &structure.objects {
            if let PdfObject::Page { contents, .. } = obj {
                chunks.push(PdfChunk {
                    chunk_type: PdfChunkType::PageContent { page_id: *id },
                    objects: contents.iter()
                        .filter_map(|cid| structure.objects.get(cid).cloned())
                        .collect(),
                });
            }
        }

        SplitPdf { chunks }
    }

    // PDF incremental updates are perfect for version control
    pub fn apply_incremental_update(
        &self,
        base: &PdfStructure,
        update: &IncrementalUpdate,
    ) -> PdfStructure {
        // Only the changed objects are stored, not the whole file
        let mut new = base.clone();
        for (id, obj) in &update.objects {
            new.objects.insert(*id, obj.clone());
        }
        new.xref_table = update.xref_table.clone();
        new.incremental_updates.push(update.clone());
        new
    }
}
```

**PDF Workflow Considerations:**
- **Annotations:** Comments, highlights should be separate layer
- **Form fields:** Track filled vs. template separately
- **Signatures:** Handle signed PDFs carefully (don't break signatures)
- **Redactions:** Security-sensitive metadata removal

#### Office Documents (OOXML)

```rust
pub struct OoxmlParser;

// DOCX, PPTX, XLSX are all ZIP archives with XML + media
pub struct OoxmlStructure {
    pub content_types: ContentTypes,
    pub relationships: Relationships,
    pub document_parts: Vec<DocumentPart>,
    pub media: Vec<MediaPart>,
    pub embedded_objects: Vec<EmbeddedObject>,
}

pub struct DocumentPart {
    pub path: String,           // e.g., "word/document.xml"
    pub content_type: String,
    pub xml_content: String,    // Parsed XML
}

pub struct MediaPart {
    pub path: String,           // e.g., "word/media/image1.png"
    pub content_type: String,
    pub data: Vec<u8>,
}

impl OoxmlParser {
    pub fn split_for_versioning(&self, structure: &OoxmlStructure) -> SplitOoxml {
        // Text content changes frequently
        let text_parts: Vec<_> = structure.document_parts
            .iter()
            .filter(|p| p.content_type.contains("xml"))
            .cloned()
            .collect();

        // Media rarely changes
        let media_chunks: Vec<_> = structure.media
            .iter()
            .map(|m| MediaChunk {
                path: m.path.clone(),
                hash: blake3::hash(&m.data),
                data: m.data.clone(),
            })
            .collect();

        SplitOoxml {
            structure: bincode::serialize(&structure.content_types).unwrap(),
            text_content: text_parts,
            media_chunks,
            embedded_objects: structure.embedded_objects.clone(),
        }
    }
}
```

---

### Phase 4: Audio (v1.6)

**Priority:** Medium - Important for music production, podcasts, film audio
**Target Users:** Music producers, podcast editors, sound designers, film post

| Format | Extension | Complexity | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| WAV | .wav | Low | RIFF chunk separation |
| AIFF | .aif, .aiff | Low | Similar to WAV |
| FLAC | .flac | Medium | Frame-based chunking |
| MP3 | .mp3 | Medium | Frame separation |
| AAC | .m4a, .aac | Medium | Via MP4 container |
| BWF | .wav | Low | Broadcast WAV with metadata |

#### WAV Parser

```rust
pub struct WavParser;

pub struct WavStructure {
    pub riff_header: RiffHeader,
    pub format_chunk: FormatChunk,      // Sample rate, bit depth, channels
    pub data_chunk: DataChunk,          // Actual audio samples
    pub metadata_chunks: Vec<MetadataChunk>, // bext, iXML, LIST INFO
    pub cue_points: Option<CueChunk>,
    pub markers: Vec<Marker>,
}

pub struct FormatChunk {
    pub audio_format: u16,      // 1 = PCM, 3 = IEEE float
    pub num_channels: u16,
    pub sample_rate: u32,
    pub byte_rate: u32,
    pub block_align: u16,
    pub bits_per_sample: u16,
}

impl WavParser {
    pub fn split_for_versioning(&self, structure: &WavStructure) -> SplitWav {
        // Metadata (small, may change)
        let metadata = structure.metadata_chunks
            .iter()
            .flat_map(|c| c.serialize())
            .collect();

        // Audio data (large, append-only in most edits)
        // Chunk at natural boundaries (e.g., 1 second of audio)
        let samples_per_chunk = structure.format_chunk.sample_rate as usize;
        let bytes_per_sample = structure.format_chunk.bits_per_sample as usize / 8
            * structure.format_chunk.num_channels as usize;
        let chunk_size = samples_per_chunk * bytes_per_sample;

        let audio_chunks: Vec<_> = structure.data_chunk.data
            .chunks(chunk_size)
            .enumerate()
            .map(|(i, chunk)| AudioChunk {
                index: i as u32,
                start_sample: i * samples_per_chunk,
                data: chunk.to_vec(),
            })
            .collect();

        SplitWav {
            format: structure.format_chunk.clone(),
            metadata,
            audio_chunks,
            cue_points: structure.cue_points.clone(),
        }
    }
}
```

#### Audio Session Files

```rust
// Pro Tools session (.ptx)
pub struct ProToolsParser;

pub struct ProToolsSession {
    pub session_info: SessionInfo,
    pub tracks: Vec<Track>,
    pub clips: Vec<Clip>,
    pub fades: Vec<Fade>,
    pub plugins: Vec<PluginInstance>,
    pub automation: Vec<AutomationLane>,
    pub markers: Vec<Marker>,
    pub linked_audio_files: Vec<LinkedFile>,
}

// Logic Pro project (.logicx)
pub struct LogicParser;

// Ableton Live set (.als)
pub struct AbletonParser;

// Common interface for DAW sessions
pub trait DawSessionParser {
    fn parse(&self, data: &[u8]) -> Result<DawSession>;
    fn extract_linked_files(&self, session: &DawSession) -> Vec<LinkedFile>;
    fn validate_links(&self, session: &DawSession, repo: &Repository) -> LinkValidation;
}
```

**Audio Workflow Considerations:**
- **Multi-track sessions:** Track linked audio files as dependencies
- **Plugin presets:** May reference external preset files
- **Sample libraries:** Often shared across projects
- **Stems/mixdowns:** Version final exports alongside sessions

---

### Phase 5: 3D & Motion Graphics (v2.0)

**Priority:** Lower initially - Specialized market
**Target Users:** VFX artists, motion designers, game developers

| Format | Extension | Complexity | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| After Effects | .aep | Very High | Binary project, linked assets |
| Blender | .blend | High | Custom binary format |
| Cinema 4D | .c4d | High | Node-based |
| Maya | .ma, .mb | High | ASCII or binary |
| FBX | .fbx | Medium | Interchange format |
| glTF | .gltf, .glb | Medium | Modern 3D interchange |
| USD | .usd, .usda, .usdc | High | Universal scene description |

#### After Effects Parser

```rust
pub struct AepParser;

// AEP is a RIFF-based binary format
pub struct AepStructure {
    pub project_info: ProjectInfo,
    pub compositions: Vec<Composition>,
    pub footage_items: Vec<FootageItem>,
    pub solids: Vec<Solid>,
    pub folders: Vec<Folder>,
    pub render_queue: Vec<RenderItem>,
}

pub struct Composition {
    pub name: String,
    pub dimensions: (u32, u32),
    pub duration: f64,
    pub frame_rate: f64,
    pub layers: Vec<Layer>,
}

pub struct Layer {
    pub name: String,
    pub layer_type: LayerType,
    pub source: Option<FootageId>,
    pub transforms: TransformData,
    pub effects: Vec<Effect>,
    pub masks: Vec<Mask>,
    pub expressions: Vec<Expression>,
}

impl AepParser {
    pub fn extract_dependencies(&self, structure: &AepStructure) -> Vec<Dependency> {
        let mut deps = Vec::new();

        for footage in &structure.footage_items {
            if let FootageSource::File { path } = &footage.source {
                deps.push(Dependency {
                    path: path.clone(),
                    dependency_type: DependencyType::Footage,
                    required: true,
                });
            }
        }

        for comp in &structure.compositions {
            for layer in &comp.layers {
                for effect in &layer.effects {
                    if let Some(preset_path) = &effect.preset_file {
                        deps.push(Dependency {
                            path: preset_path.clone(),
                            dependency_type: DependencyType::Preset,
                            required: false,
                        });
                    }
                }
            }
        }

        deps
    }
}
```

#### USD (Universal Scene Description)

```rust
pub struct UsdParser;

// USD is Pixar's scene description format, increasingly standard
pub struct UsdStage {
    pub root_layer: UsdLayer,
    pub sublayers: Vec<UsdLayer>,
    pub references: Vec<UsdReference>,
    pub payloads: Vec<UsdPayload>,
    pub prims: Vec<UsdPrim>,
}

pub struct UsdPrim {
    pub path: String,
    pub type_name: String,
    pub attributes: HashMap<String, UsdAttribute>,
    pub relationships: Vec<UsdRelationship>,
    pub children: Vec<UsdPrim>,
}

impl UsdParser {
    // USD naturally supports composition and layering
    // Perfect match for version control
    pub fn split_for_versioning(&self, stage: &UsdStage) -> SplitUsd {
        // USD layers can be versioned independently
        let layer_chunks: Vec<_> = std::iter::once(&stage.root_layer)
            .chain(stage.sublayers.iter())
            .map(|layer| LayerChunk {
                path: layer.identifier.clone(),
                content: layer.serialize_usda(),
            })
            .collect();

        // Referenced assets
        let references: Vec<_> = stage.references
            .iter()
            .map(|r| AssetReference {
                path: r.asset_path.clone(),
                prim_path: r.prim_path.clone(),
            })
            .collect();

        SplitUsd {
            layer_chunks,
            references,
        }
    }
}
```

---

### Phase 6: Archives & Packages (v2.2)

**Priority:** Low - Utility feature
**Target Users:** All users (automatic handling)

| Format | Extension | Strategy |
| :--- | :--- | :--- |
| ZIP | .zip | Extract and version contents |
| TAR | .tar | Extract and version contents |
| DMG | .dmg | Treat as opaque or mount |
| ISO | .iso | Treat as opaque |

```rust
pub struct ArchiveHandler {
    pub extract_for_versioning: bool,
    pub max_extract_size: u64,
    pub excluded_patterns: Vec<String>,
}

impl ArchiveHandler {
    pub async fn handle_archive(
        &self,
        path: &Path,
        data: &[u8],
    ) -> Result<ArchiveHandling> {
        let archive_type = detect_archive_type(data)?;

        match archive_type {
            ArchiveType::Zip => {
                if self.should_extract(data)? {
                    let contents = self.extract_zip(data).await?;
                    Ok(ArchiveHandling::Extracted { contents })
                } else {
                    Ok(ArchiveHandling::Opaque)
                }
            }
            // Special handling for app bundles
            ArchiveType::MacAppBundle => {
                Ok(ArchiveHandling::Opaque)  // Don't extract .app bundles
            }
            _ => Ok(ArchiveHandling::Opaque),
        }
    }

    fn should_extract(&self, data: &[u8]) -> Result<bool> {
        let size = estimate_extracted_size(data)?;
        Ok(self.extract_for_versioning && size < self.max_extract_size)
    }
}
```

---

## Parser Architecture

### Plugin System

```rust
pub trait FormatParser: Send + Sync {
    /// File extensions this parser handles
    fn extensions(&self) -> &[&str];

    /// MIME types this parser handles
    fn mime_types(&self) -> &[&str];

    /// Magic bytes for format detection
    fn magic_bytes(&self) -> Option<&[u8]>;

    /// Parse file and return structure
    fn parse(&self, data: &[u8]) -> Result<Box<dyn ParsedStructure>>;

    /// Split into optimized chunks for versioning
    fn split_for_versioning(&self, structure: &dyn ParsedStructure) -> Result<SplitResult>;

    /// Reconstruct file from chunks
    fn reconstruct(&self, split: &SplitResult) -> Result<Vec<u8>>;

    /// Extract dependencies (linked files)
    fn extract_dependencies(&self, structure: &dyn ParsedStructure) -> Vec<Dependency>;

    /// Validate reconstructed file
    fn validate(&self, original: &[u8], reconstructed: &[u8]) -> Result<ValidationResult>;
}

pub trait ParsedStructure: Send + Sync {
    fn as_any(&self) -> &dyn Any;
    fn metadata(&self) -> HashMap<String, String>;
    fn estimated_chunks(&self) -> usize;
}

pub struct SplitResult {
    pub metadata_blob: Vec<u8>,
    pub payload_chunks: Vec<PayloadChunk>,
    pub dependencies: Vec<Dependency>,
}

pub struct PayloadChunk {
    pub chunk_type: String,
    pub chunk_id: String,
    pub data: Vec<u8>,
    pub can_dedupe_globally: bool,  // Safe to dedupe across files
}
```

### Parser Registry

```rust
pub struct ParserRegistry {
    parsers: Vec<Box<dyn FormatParser>>,
    extension_map: HashMap<String, usize>,
    mime_map: HashMap<String, usize>,
}

impl ParserRegistry {
    pub fn new() -> Self {
        let mut registry = Self::default();

        // Register built-in parsers
        registry.register(Box::new(Mp4Parser::new()));
        registry.register(Box::new(JpegParser::new()));
        registry.register(Box::new(PngParser::new()));
        registry.register(Box::new(PdfParser::new()));
        registry.register(Box::new(WavParser::new()));
        // ... more parsers

        registry
    }

    pub fn register(&mut self, parser: Box<dyn FormatParser>) {
        let index = self.parsers.len();

        for ext in parser.extensions() {
            self.extension_map.insert(ext.to_lowercase(), index);
        }

        for mime in parser.mime_types() {
            self.mime_map.insert(mime.to_string(), index);
        }

        self.parsers.push(parser);
    }

    pub fn get_parser(&self, path: &Path, data: &[u8]) -> Option<&dyn FormatParser> {
        // Try extension first
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if let Some(&index) = self.extension_map.get(&ext.to_lowercase()) {
                return Some(self.parsers[index].as_ref());
            }
        }

        // Try magic bytes
        for parser in &self.parsers {
            if let Some(magic) = parser.magic_bytes() {
                if data.starts_with(magic) {
                    return Some(parser.as_ref());
                }
            }
        }

        None  // Use generic chunker
    }
}
```

### Dynamic Parser Loading

```rust
// Future: Load parsers from shared libraries
pub struct DynamicParserLoader {
    plugin_dir: PathBuf,
    loaded_plugins: Vec<libloading::Library>,
}

impl DynamicParserLoader {
    pub fn load_plugins(&mut self) -> Result<Vec<Box<dyn FormatParser>>> {
        let mut parsers = Vec::new();

        for entry in fs::read_dir(&self.plugin_dir)? {
            let path = entry?.path();
            if path.extension() == Some(OsStr::new("so"))
                || path.extension() == Some(OsStr::new("dylib"))
            {
                unsafe {
                    let lib = libloading::Library::new(&path)?;
                    let create_parser: libloading::Symbol<fn() -> Box<dyn FormatParser>> =
                        lib.get(b"create_parser")?;

                    parsers.push(create_parser());
                    self.loaded_plugins.push(lib);
                }
            }
        }

        Ok(parsers)
    }
}
```

---

## Deduplication Strategies by Format

| Format Type | Deduplication Strategy | Expected Ratio |
| :--- | :--- | :--- |
| Video | Keyframe-aligned CDC + metadata separation | 60-80% |
| Photo (JPEG) | EXIF separation + image data chunking | 40-60% |
| Photo (RAW) | Preview separation + raw data chunking | 50-70% |
| Photo (PSD) | Layer-level chunking | 30-50% |
| PDF | Object-level chunking + incremental | 40-70% |
| Audio (WAV) | Time-aligned chunking | 50-70% |
| Audio (Compressed) | Frame-aligned chunking | 30-50% |
| Office Docs | Media extraction + XML compression | 50-70% |
| 3D Scenes | Layer/object separation | 30-60% |

---

## Implementation Prioritization Matrix

| Format | User Demand | Technical Complexity | Market Size | Priority Score |
| :--- | :---: | :---: | :---: | :---: |
| Video (MP4/MOV) | 10 | 8 | 10 | **28** (Done) |
| Photo (JPEG/PNG) | 9 | 4 | 9 | **22** (Next) |
| Camera RAW | 8 | 7 | 7 | **22** (Next) |
| Photo (PSD) | 7 | 8 | 6 | **21** |
| PDF | 6 | 7 | 8 | **21** |
| Audio (WAV) | 7 | 4 | 5 | **16** |
| Video (MXF) | 6 | 6 | 4 | **16** |
| Office Docs | 4 | 5 | 7 | **16** |
| After Effects | 5 | 9 | 4 | **18** |
| 3D (USD/FBX) | 4 | 8 | 5 | **17** |

---

## Rollout Schedule

| Version | Target Date | Formats Added |
| :--- | :--- | :--- |
| v1.0 | Current | MP4, MOV, M4V |
| v1.1 | +2 months | MXF, AVI |
| v1.2 | +4 months | JPEG, PNG, HEIC |
| v1.3 | +6 months | Camera RAW (CR2, NEF, ARW) |
| v1.4 | +8 months | PDF, AI |
| v1.5 | +10 months | PSD, TIFF |
| v1.6 | +12 months | WAV, AIFF, FLAC |
| v2.0 | +18 months | After Effects, USD |
| v2.x | Ongoing | Community-contributed parsers |

---

## Success Metrics

| Metric | Target |
| :--- | :--- |
| Format coverage (by user file types) | 90% of files optimized |
| Deduplication ratio improvement | 50% vs. generic chunking |
| Parse time overhead | <5% of ingest time |
| Reconstruction accuracy | 100% bit-perfect |
| Parser plugin ecosystem | 10+ community parsers |
