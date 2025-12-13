# ISOBMFF Parser Specification

ISO Base Media File Format parser for MP4, MOV, M4V, and related container formats.

---

## Overview

ISOBMFF (ISO Base Media File Format) is the foundation for MP4, MOV, and many other video containers. Dits parses these containers to:

1. **Separate metadata (moov) from payload (mdat)** - Metadata changes don't re-upload payload
2. **Extract keyframe positions** - Enable chunk alignment for random access
3. **Preserve structure** - Reconstruct valid files from chunks
4. **Extract asset metadata** - Duration, dimensions, codec info

---

## Box Structure

ISOBMFF files are composed of "boxes" (also called "atoms" in QuickTime terminology):

```
+--------+--------+--------+--------+
|     Size (4 bytes, big-endian)    |
+--------+--------+--------+--------+
|     Type (4 bytes, ASCII)         |
+--------+--------+--------+--------+
|                                   |
|     Data (size - 8 bytes)         |
|                                   |
+--------+--------+--------+--------+
```

### Extended Size

For boxes > 4GB:
```
+--------+--------+--------+--------+
|     Size = 1 (indicates extended) |
+--------+--------+--------+--------+
|     Type (4 bytes)                |
+--------+--------+--------+--------+
|     Extended Size (8 bytes)       |
+--------+--------+--------+--------+
|     Data                          |
+--------+--------+--------+--------+
```

### Box Types

```rust
/// Common ISOBMFF box types
pub mod box_types {
    pub const FTYP: [u8; 4] = *b"ftyp";  // File type
    pub const MOOV: [u8; 4] = *b"moov";  // Movie metadata
    pub const MDAT: [u8; 4] = *b"mdat";  // Media data
    pub const FREE: [u8; 4] = *b"free";  // Free space
    pub const SKIP: [u8; 4] = *b"skip";  // Skip
    pub const WIDE: [u8; 4] = *b"wide";  // 64-bit extension
    pub const MOOF: [u8; 4] = *b"moof";  // Movie fragment
    pub const MFRA: [u8; 4] = *b"mfra";  // Movie fragment random access
    pub const UUID: [u8; 4] = *b"uuid";  // User extension

    // Inside moov
    pub const MVHD: [u8; 4] = *b"mvhd";  // Movie header
    pub const TRAK: [u8; 4] = *b"trak";  // Track
    pub const UDTA: [u8; 4] = *b"udta";  // User data

    // Inside trak
    pub const TKHD: [u8; 4] = *b"tkhd";  // Track header
    pub const MDIA: [u8; 4] = *b"mdia";  // Media
    pub const EDTS: [u8; 4] = *b"edts";  // Edit list

    // Inside mdia
    pub const MDHD: [u8; 4] = *b"mdhd";  // Media header
    pub const HDLR: [u8; 4] = *b"hdlr";  // Handler
    pub const MINF: [u8; 4] = *b"minf";  // Media information

    // Inside minf
    pub const VMHD: [u8; 4] = *b"vmhd";  // Video media header
    pub const SMHD: [u8; 4] = *b"smhd";  // Sound media header
    pub const DINF: [u8; 4] = *b"dinf";  // Data information
    pub const STBL: [u8; 4] = *b"stbl";  // Sample table

    // Inside stbl (sample table)
    pub const STSD: [u8; 4] = *b"stsd";  // Sample descriptions
    pub const STTS: [u8; 4] = *b"stts";  // Time-to-sample
    pub const CTTS: [u8; 4] = *b"ctts";  // Composition offset
    pub const STSC: [u8; 4] = *b"stsc";  // Sample-to-chunk
    pub const STSZ: [u8; 4] = *b"stsz";  // Sample sizes
    pub const STCO: [u8; 4] = *b"stco";  // Chunk offsets (32-bit)
    pub const CO64: [u8; 4] = *b"co64";  // Chunk offsets (64-bit)
    pub const STSS: [u8; 4] = *b"stss";  // Sync samples (keyframes)
}
```

---

## Parser Implementation

### Core Types

```rust
use std::io::{Read, Seek, SeekFrom};

/// Parsed ISOBMFF box
#[derive(Debug, Clone)]
pub struct Box {
    /// Box type (4-byte code)
    pub box_type: [u8; 4],

    /// Box position in file
    pub offset: u64,

    /// Total box size (including header)
    pub size: u64,

    /// Data offset (after header)
    pub data_offset: u64,

    /// Data size
    pub data_size: u64,

    /// Child boxes (for container boxes)
    pub children: Vec<Box>,
}

/// ISOBMFF file structure
#[derive(Debug)]
pub struct IsobmffFile {
    /// File type box
    pub ftyp: Option<FtypBox>,

    /// Movie metadata box
    pub moov: Option<MoovBox>,

    /// Media data boxes
    pub mdat: Vec<MdatBox>,

    /// Movie fragments (for fragmented MP4)
    pub moof: Vec<MoofBox>,

    /// Total file size
    pub file_size: u64,

    /// All top-level boxes in order
    pub boxes: Vec<Box>,
}

/// File type box
#[derive(Debug, Clone)]
pub struct FtypBox {
    pub major_brand: [u8; 4],
    pub minor_version: u32,
    pub compatible_brands: Vec<[u8; 4]>,
}

/// Movie metadata container
#[derive(Debug)]
pub struct MoovBox {
    pub offset: u64,
    pub size: u64,
    pub mvhd: MvhdBox,
    pub tracks: Vec<TrakBox>,
}

/// Movie header
#[derive(Debug, Clone)]
pub struct MvhdBox {
    pub version: u8,
    pub creation_time: u64,
    pub modification_time: u64,
    pub timescale: u32,
    pub duration: u64,
    pub rate: f32,
    pub volume: f32,
    pub next_track_id: u32,
}

/// Track box
#[derive(Debug)]
pub struct TrakBox {
    pub tkhd: TkhdBox,
    pub mdia: MdiaBox,
    pub edts: Option<EdtsBox>,
}

/// Track header
#[derive(Debug, Clone)]
pub struct TkhdBox {
    pub version: u8,
    pub flags: u32,
    pub track_id: u32,
    pub duration: u64,
    pub width: f32,
    pub height: f32,
}

/// Media box
#[derive(Debug)]
pub struct MdiaBox {
    pub mdhd: MdhdBox,
    pub hdlr: HdlrBox,
    pub minf: MinfBox,
}

/// Media header
#[derive(Debug, Clone)]
pub struct MdhdBox {
    pub version: u8,
    pub timescale: u32,
    pub duration: u64,
    pub language: [u8; 3],
}

/// Handler reference
#[derive(Debug, Clone)]
pub struct HdlrBox {
    pub handler_type: [u8; 4],
    pub name: String,
}

/// Sample table (critical for chunk mapping)
#[derive(Debug)]
pub struct StblBox {
    pub stsd: StsdBox,
    pub stts: SttsBox,
    pub ctts: Option<CttsBox>,
    pub stsc: StscBox,
    pub stsz: StszBox,
    pub stco: Option<StcoBox>,
    pub co64: Option<Co64Box>,
    pub stss: Option<StssBox>,
}

/// Sync sample table (keyframes)
#[derive(Debug, Clone)]
pub struct StssBox {
    pub sync_samples: Vec<u32>,
}

/// Sample sizes
#[derive(Debug, Clone)]
pub struct StszBox {
    pub sample_size: u32,  // 0 if variable
    pub sample_count: u32,
    pub sizes: Vec<u32>,
}

/// Sample-to-chunk mapping
#[derive(Debug, Clone)]
pub struct StscBox {
    pub entries: Vec<StscEntry>,
}

#[derive(Debug, Clone)]
pub struct StscEntry {
    pub first_chunk: u32,
    pub samples_per_chunk: u32,
    pub sample_description_index: u32,
}

/// Chunk offsets (32-bit)
#[derive(Debug, Clone)]
pub struct StcoBox {
    pub offsets: Vec<u32>,
}

/// Chunk offsets (64-bit)
#[derive(Debug, Clone)]
pub struct Co64Box {
    pub offsets: Vec<u64>,
}

/// Media data box
#[derive(Debug, Clone)]
pub struct MdatBox {
    pub offset: u64,
    pub size: u64,
    pub data_offset: u64,
}
```

### Box Parser

```rust
/// ISOBMFF parser
pub struct IsobmffParser<R> {
    reader: R,
    file_size: u64,
}

impl<R: Read + Seek> IsobmffParser<R> {
    pub fn new(mut reader: R) -> Result<Self> {
        // Get file size
        let file_size = reader.seek(SeekFrom::End(0))?;
        reader.seek(SeekFrom::Start(0))?;

        Ok(Self { reader, file_size })
    }

    /// Parse entire file structure
    pub fn parse(&mut self) -> Result<IsobmffFile> {
        let boxes = self.parse_boxes(0, self.file_size)?;

        let mut file = IsobmffFile {
            ftyp: None,
            moov: None,
            mdat: Vec::new(),
            moof: Vec::new(),
            file_size: self.file_size,
            boxes: boxes.clone(),
        };

        // Extract specific boxes
        for box_ in &boxes {
            match &box_.box_type {
                b"ftyp" => {
                    file.ftyp = Some(self.parse_ftyp(box_)?);
                }
                b"moov" => {
                    file.moov = Some(self.parse_moov(box_)?);
                }
                b"mdat" => {
                    file.mdat.push(MdatBox {
                        offset: box_.offset,
                        size: box_.size,
                        data_offset: box_.data_offset,
                    });
                }
                b"moof" => {
                    file.moof.push(self.parse_moof(box_)?);
                }
                _ => {}
            }
        }

        Ok(file)
    }

    /// Parse boxes at given range
    fn parse_boxes(&mut self, start: u64, end: u64) -> Result<Vec<Box>> {
        let mut boxes = Vec::new();
        let mut offset = start;

        self.reader.seek(SeekFrom::Start(offset))?;

        while offset < end {
            let box_ = self.parse_box_header(offset)?;

            if box_.size == 0 {
                // Box extends to end of file
                break;
            }

            boxes.push(box_.clone());
            offset += box_.size;
        }

        Ok(boxes)
    }

    /// Parse box header
    fn parse_box_header(&mut self, offset: u64) -> Result<Box> {
        self.reader.seek(SeekFrom::Start(offset))?;

        let mut header = [0u8; 8];
        self.reader.read_exact(&mut header)?;

        let size = u32::from_be_bytes(header[0..4].try_into()?) as u64;
        let box_type: [u8; 4] = header[4..8].try_into()?;

        let (size, data_offset) = if size == 1 {
            // Extended size
            let mut ext = [0u8; 8];
            self.reader.read_exact(&mut ext)?;
            (u64::from_be_bytes(ext), offset + 16)
        } else if size == 0 {
            // Box extends to EOF
            (self.file_size - offset, offset + 8)
        } else {
            (size, offset + 8)
        };

        Ok(Box {
            box_type,
            offset,
            size,
            data_offset,
            data_size: size - (data_offset - offset),
            children: Vec::new(),
        })
    }

    /// Parse ftyp box
    fn parse_ftyp(&mut self, box_: &Box) -> Result<FtypBox> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        let mut major = [0u8; 4];
        self.reader.read_exact(&mut major)?;

        let mut minor = [0u8; 4];
        self.reader.read_exact(&mut minor)?;

        let mut brands = Vec::new();
        let remaining = box_.data_size - 8;
        let brand_count = remaining / 4;

        for _ in 0..brand_count {
            let mut brand = [0u8; 4];
            self.reader.read_exact(&mut brand)?;
            brands.push(brand);
        }

        Ok(FtypBox {
            major_brand: major,
            minor_version: u32::from_be_bytes(minor),
            compatible_brands: brands,
        })
    }

    /// Parse moov box and its children
    fn parse_moov(&mut self, box_: &Box) -> Result<MoovBox> {
        let children = self.parse_boxes(box_.data_offset, box_.offset + box_.size)?;

        let mut moov = MoovBox {
            offset: box_.offset,
            size: box_.size,
            mvhd: MvhdBox::default(),
            tracks: Vec::new(),
        };

        for child in &children {
            match &child.box_type {
                b"mvhd" => {
                    moov.mvhd = self.parse_mvhd(child)?;
                }
                b"trak" => {
                    moov.tracks.push(self.parse_trak(child)?);
                }
                _ => {}
            }
        }

        Ok(moov)
    }

    /// Parse mvhd (movie header)
    fn parse_mvhd(&mut self, box_: &Box) -> Result<MvhdBox> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        let mut buf = [0u8; 1];
        self.reader.read_exact(&mut buf)?;
        let version = buf[0];

        let mut flags = [0u8; 3];
        self.reader.read_exact(&mut flags)?;

        let (creation_time, modification_time, timescale, duration) = if version == 1 {
            let mut buf = [0u8; 32];
            self.reader.read_exact(&mut buf)?;
            (
                u64::from_be_bytes(buf[0..8].try_into()?),
                u64::from_be_bytes(buf[8..16].try_into()?),
                u32::from_be_bytes(buf[16..20].try_into()?),
                u64::from_be_bytes(buf[20..28].try_into()?),
            )
        } else {
            let mut buf = [0u8; 16];
            self.reader.read_exact(&mut buf)?;
            (
                u32::from_be_bytes(buf[0..4].try_into()?) as u64,
                u32::from_be_bytes(buf[4..8].try_into()?) as u64,
                u32::from_be_bytes(buf[8..12].try_into()?),
                u32::from_be_bytes(buf[12..16].try_into()?) as u64,
            )
        };

        // Read rate (fixed-point 16.16)
        let mut rate_buf = [0u8; 4];
        self.reader.read_exact(&mut rate_buf)?;
        let rate = i32::from_be_bytes(rate_buf) as f32 / 65536.0;

        // Read volume (fixed-point 8.8)
        let mut vol_buf = [0u8; 2];
        self.reader.read_exact(&mut vol_buf)?;
        let volume = i16::from_be_bytes(vol_buf) as f32 / 256.0;

        // Skip reserved + matrix + predefined (70 bytes for v0, 78 for v1)
        let skip = if version == 1 { 66 } else { 66 };
        self.reader.seek(SeekFrom::Current(skip))?;

        let mut next_track = [0u8; 4];
        self.reader.read_exact(&mut next_track)?;

        Ok(MvhdBox {
            version,
            creation_time,
            modification_time,
            timescale,
            duration,
            rate,
            volume,
            next_track_id: u32::from_be_bytes(next_track),
        })
    }

    /// Parse trak (track)
    fn parse_trak(&mut self, box_: &Box) -> Result<TrakBox> {
        let children = self.parse_boxes(box_.data_offset, box_.offset + box_.size)?;

        let mut trak = TrakBox {
            tkhd: TkhdBox::default(),
            mdia: MdiaBox::default(),
            edts: None,
        };

        for child in &children {
            match &child.box_type {
                b"tkhd" => trak.tkhd = self.parse_tkhd(child)?,
                b"mdia" => trak.mdia = self.parse_mdia(child)?,
                b"edts" => trak.edts = Some(self.parse_edts(child)?),
                _ => {}
            }
        }

        Ok(trak)
    }

    /// Parse stss (sync sample / keyframe table)
    fn parse_stss(&mut self, box_: &Box) -> Result<StssBox> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        // Version and flags
        let mut header = [0u8; 4];
        self.reader.read_exact(&mut header)?;

        // Entry count
        let mut count_buf = [0u8; 4];
        self.reader.read_exact(&mut count_buf)?;
        let count = u32::from_be_bytes(count_buf) as usize;

        // Read sync samples
        let mut sync_samples = Vec::with_capacity(count);
        for _ in 0..count {
            let mut sample = [0u8; 4];
            self.reader.read_exact(&mut sample)?;
            sync_samples.push(u32::from_be_bytes(sample));
        }

        Ok(StssBox { sync_samples })
    }

    /// Parse stco/co64 (chunk offsets)
    fn parse_chunk_offsets(&mut self, box_: &Box) -> Result<Vec<u64>> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        let mut header = [0u8; 4];
        self.reader.read_exact(&mut header)?;

        let mut count_buf = [0u8; 4];
        self.reader.read_exact(&mut count_buf)?;
        let count = u32::from_be_bytes(count_buf) as usize;

        let is_64bit = &box_.box_type == b"co64";
        let mut offsets = Vec::with_capacity(count);

        for _ in 0..count {
            let offset = if is_64bit {
                let mut buf = [0u8; 8];
                self.reader.read_exact(&mut buf)?;
                u64::from_be_bytes(buf)
            } else {
                let mut buf = [0u8; 4];
                self.reader.read_exact(&mut buf)?;
                u32::from_be_bytes(buf) as u64
            };
            offsets.push(offset);
        }

        Ok(offsets)
    }

    /// Parse stsz (sample sizes)
    fn parse_stsz(&mut self, box_: &Box) -> Result<StszBox> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        let mut header = [0u8; 4];
        self.reader.read_exact(&mut header)?;

        let mut sample_size_buf = [0u8; 4];
        self.reader.read_exact(&mut sample_size_buf)?;
        let sample_size = u32::from_be_bytes(sample_size_buf);

        let mut count_buf = [0u8; 4];
        self.reader.read_exact(&mut count_buf)?;
        let sample_count = u32::from_be_bytes(count_buf);

        let sizes = if sample_size == 0 {
            // Variable sizes
            let mut sizes = Vec::with_capacity(sample_count as usize);
            for _ in 0..sample_count {
                let mut buf = [0u8; 4];
                self.reader.read_exact(&mut buf)?;
                sizes.push(u32::from_be_bytes(buf));
            }
            sizes
        } else {
            Vec::new()  // Uniform size
        };

        Ok(StszBox {
            sample_size,
            sample_count,
            sizes,
        })
    }

    /// Parse stsc (sample-to-chunk)
    fn parse_stsc(&mut self, box_: &Box) -> Result<StscBox> {
        self.reader.seek(SeekFrom::Start(box_.data_offset))?;

        let mut header = [0u8; 4];
        self.reader.read_exact(&mut header)?;

        let mut count_buf = [0u8; 4];
        self.reader.read_exact(&mut count_buf)?;
        let count = u32::from_be_bytes(count_buf) as usize;

        let mut entries = Vec::with_capacity(count);
        for _ in 0..count {
            let mut buf = [0u8; 12];
            self.reader.read_exact(&mut buf)?;

            entries.push(StscEntry {
                first_chunk: u32::from_be_bytes(buf[0..4].try_into()?),
                samples_per_chunk: u32::from_be_bytes(buf[4..8].try_into()?),
                sample_description_index: u32::from_be_bytes(buf[8..12].try_into()?),
            });
        }

        Ok(StscBox { entries })
    }
}
```

---

## Keyframe Extraction

```rust
impl IsobmffFile {
    /// Extract keyframe byte offsets from video track
    pub fn extract_keyframes(&self) -> Result<Vec<KeyframeInfo>> {
        let moov = self.moov.as_ref().ok_or(Error::NoMoovBox)?;

        // Find video track
        let video_track = moov.tracks.iter()
            .find(|t| t.mdia.hdlr.handler_type == *b"vide")
            .ok_or(Error::NoVideoTrack)?;

        let stbl = &video_track.mdia.minf.stbl;

        // Get keyframe sample numbers
        let sync_samples = match &stbl.stss {
            Some(stss) => stss.sync_samples.clone(),
            None => {
                // No stss = all samples are sync (intra-only codec)
                (1..=stbl.stsz.sample_count).collect()
            }
        };

        // Calculate byte offset for each keyframe
        let sample_offsets = self.calculate_sample_offsets(stbl)?;

        let mut keyframes = Vec::with_capacity(sync_samples.len());

        for sample_num in sync_samples {
            let idx = (sample_num - 1) as usize;  // 1-indexed

            if idx < sample_offsets.len() {
                let offset = sample_offsets[idx];
                let size = if stbl.stsz.sample_size > 0 {
                    stbl.stsz.sample_size
                } else {
                    stbl.stsz.sizes[idx]
                };

                keyframes.push(KeyframeInfo {
                    offset,
                    size,
                    sample_number: sample_num,
                });
            }
        }

        Ok(keyframes)
    }

    /// Calculate byte offset for each sample
    fn calculate_sample_offsets(&self, stbl: &StblBox) -> Result<Vec<u64>> {
        let chunk_offsets = stbl.stco.as_ref()
            .map(|s| s.offsets.iter().map(|&o| o as u64).collect())
            .or_else(|| stbl.co64.as_ref().map(|s| s.offsets.clone()))
            .ok_or(Error::NoChunkOffsets)?;

        let sample_count = stbl.stsz.sample_count as usize;
        let mut offsets = Vec::with_capacity(sample_count);

        // Expand sample-to-chunk mapping
        let mut current_chunk = 1u32;
        let mut samples_in_chunk = 0u32;
        let mut stsc_idx = 0;

        for sample_idx in 0..sample_count {
            // Find current stsc entry
            while stsc_idx + 1 < stbl.stsc.entries.len()
                && current_chunk >= stbl.stsc.entries[stsc_idx + 1].first_chunk
            {
                stsc_idx += 1;
            }

            let entry = &stbl.stsc.entries[stsc_idx];

            // Get chunk offset
            let chunk_offset = chunk_offsets[(current_chunk - 1) as usize];

            // Calculate offset within chunk
            let mut sample_offset = chunk_offset;
            let start_sample = sample_idx - samples_in_chunk as usize;

            for i in start_sample..sample_idx {
                let size = if stbl.stsz.sample_size > 0 {
                    stbl.stsz.sample_size
                } else {
                    stbl.stsz.sizes[i]
                };
                sample_offset += size as u64;
            }

            offsets.push(sample_offset);

            // Update chunk tracking
            samples_in_chunk += 1;
            if samples_in_chunk >= entry.samples_per_chunk {
                current_chunk += 1;
                samples_in_chunk = 0;
            }
        }

        Ok(offsets)
    }
}
```

---

## Structure Extraction for Chunking

```rust
/// Extract structure for Dits chunking
pub fn extract_structure(file: &IsobmffFile) -> Result<VideoStructure> {
    let mut structure = VideoStructure::default();

    // Identify metadata regions (moov, ftyp)
    for box_ in &file.boxes {
        match &box_.box_type {
            b"ftyp" | b"moov" | b"free" | b"skip" | b"udta" | b"meta" => {
                structure.metadata_regions.push(Region {
                    offset: box_.offset,
                    size: box_.size,
                    box_type: box_.box_type,
                });
            }
            b"mdat" => {
                structure.payload_regions.push(Region {
                    offset: box_.offset,
                    size: box_.size,
                    box_type: box_.box_type,
                });
            }
            _ => {}
        }
    }

    // Extract video metadata
    if let Some(moov) = &file.moov {
        structure.duration_ms = (moov.mvhd.duration as f64
            / moov.mvhd.timescale as f64
            * 1000.0) as u64;

        for track in &moov.tracks {
            if track.mdia.hdlr.handler_type == *b"vide" {
                structure.video_info = Some(VideoInfo {
                    width: track.tkhd.width as u32,
                    height: track.tkhd.height as u32,
                    timescale: track.mdia.mdhd.timescale,
                    codec: extract_codec_info(track)?,
                });
            } else if track.mdia.hdlr.handler_type == *b"soun" {
                structure.audio_info = Some(AudioInfo {
                    channels: extract_audio_channels(track)?,
                    sample_rate: track.mdia.mdhd.timescale,
                    codec: extract_audio_codec(track)?,
                });
            }
        }
    }

    // Extract keyframes
    structure.keyframes = file.extract_keyframes()?;

    Ok(structure)
}

#[derive(Debug, Default)]
pub struct VideoStructure {
    pub metadata_regions: Vec<Region>,
    pub payload_regions: Vec<Region>,
    pub duration_ms: u64,
    pub video_info: Option<VideoInfo>,
    pub audio_info: Option<AudioInfo>,
    pub keyframes: Vec<KeyframeInfo>,
}

#[derive(Debug, Clone)]
pub struct Region {
    pub offset: u64,
    pub size: u64,
    pub box_type: [u8; 4],
}
```

---

## Reconstruction

```rust
/// Reconstruct valid ISOBMFF file from chunks
pub fn reconstruct_file(
    structure: &VideoStructure,
    chunks: &[Chunk],
    output: &mut impl Write,
) -> Result<()> {
    // Sort chunks by original offset
    let mut sorted_chunks = chunks.to_vec();
    sorted_chunks.sort_by_key(|c| c.original_offset);

    // Write metadata first (ftyp, moov)
    for region in &structure.metadata_regions {
        let region_chunks: Vec<_> = sorted_chunks.iter()
            .filter(|c| c.original_offset >= region.offset
                && c.original_offset < region.offset + region.size)
            .collect();

        for chunk in region_chunks {
            output.write_all(&chunk.data)?;
        }
    }

    // Write payload (mdat)
    for region in &structure.payload_regions {
        // Write mdat header
        if region.size > u32::MAX as u64 {
            // Extended size header
            output.write_all(&1u32.to_be_bytes())?;
            output.write_all(b"mdat")?;
            output.write_all(&region.size.to_be_bytes())?;
        } else {
            output.write_all(&(region.size as u32).to_be_bytes())?;
            output.write_all(b"mdat")?;
        }

        // Write mdat content
        let mdat_chunks: Vec<_> = sorted_chunks.iter()
            .filter(|c| c.original_offset >= region.offset
                && c.original_offset < region.offset + region.size)
            .collect();

        for chunk in mdat_chunks {
            output.write_all(&chunk.data)?;
        }
    }

    Ok(())
}
```

---

## Offset Patching

When moov is moved (e.g., for streaming), chunk offsets must be updated:

```rust
/// Patch chunk offsets after moving moov
pub fn patch_moov_offsets(
    moov_data: &mut [u8],
    offset_delta: i64,
) -> Result<()> {
    // Find and parse stco/co64 boxes within moov
    let boxes = parse_boxes_in_memory(moov_data)?;

    for box_ in boxes {
        if box_.box_type == *b"stco" {
            patch_stco(&mut moov_data[box_.data_offset as usize..], offset_delta)?;
        } else if box_.box_type == *b"co64" {
            patch_co64(&mut moov_data[box_.data_offset as usize..], offset_delta)?;
        }
    }

    Ok(())
}

fn patch_stco(data: &mut [u8], delta: i64) -> Result<()> {
    let count = u32::from_be_bytes(data[4..8].try_into()?) as usize;

    for i in 0..count {
        let offset = 8 + i * 4;
        let old_value = u32::from_be_bytes(data[offset..offset + 4].try_into()?);
        let new_value = (old_value as i64 + delta) as u32;
        data[offset..offset + 4].copy_from_slice(&new_value.to_be_bytes());
    }

    Ok(())
}
```

---

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ftyp() {
        let data = b"\x00\x00\x00\x14ftypmp42\x00\x00\x00\x00mp41";
        let parser = IsobmffParser::new(std::io::Cursor::new(data)).unwrap();

        let ftyp = parser.parse_ftyp(&Box {
            box_type: *b"ftyp",
            offset: 0,
            size: 20,
            data_offset: 8,
            data_size: 12,
            children: vec![],
        }).unwrap();

        assert_eq!(&ftyp.major_brand, b"mp42");
        assert_eq!(ftyp.compatible_brands.len(), 1);
    }

    #[test]
    fn test_parse_stss() {
        // stss with 3 keyframes at samples 1, 30, 60
        let data = vec![
            0, 0, 0, 0,  // version + flags
            0, 0, 0, 3,  // entry count
            0, 0, 0, 1,  // sample 1
            0, 0, 0, 30, // sample 30
            0, 0, 0, 60, // sample 60
        ];

        let mut cursor = std::io::Cursor::new(data);
        let mut parser = IsobmffParser::new(&mut cursor).unwrap();

        let stss = parser.parse_stss(&Box {
            box_type: *b"stss",
            offset: 0,
            size: 20,
            data_offset: 0,
            data_size: 20,
            children: vec![],
        }).unwrap();

        assert_eq!(stss.sync_samples, vec![1, 30, 60]);
    }

    #[test]
    fn test_sample_offset_calculation() {
        // Mock stbl with known structure
        let stbl = StblBox {
            stsz: StszBox {
                sample_size: 0,
                sample_count: 3,
                sizes: vec![1000, 2000, 3000],
            },
            stsc: StscBox {
                entries: vec![StscEntry {
                    first_chunk: 1,
                    samples_per_chunk: 3,
                    sample_description_index: 1,
                }],
            },
            stco: Some(StcoBox {
                offsets: vec![1000],  // Chunk starts at byte 1000
            }),
            ..Default::default()
        };

        let file = IsobmffFile::default();
        let offsets = file.calculate_sample_offsets(&stbl).unwrap();

        assert_eq!(offsets[0], 1000);        // First sample
        assert_eq!(offsets[1], 2000);        // 1000 + 1000
        assert_eq!(offsets[2], 4000);        // 1000 + 1000 + 2000
    }
}
```

---

## Notes

- moov at end (streaming optimization) requires offset patching
- Fragmented MP4 (fMP4) uses moof+mdat pairs
- ProRes in MOV uses different atom structures
- Always validate reconstructed files can be played
- Handle 64-bit sizes (co64) for files > 4GB
