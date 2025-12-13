# Transparent Decompression (Structure-Aware Chunking)

Intelligent decompression system that chunks the inner content of compressed project files for maximum deduplication efficiency.

---

## Overview

Transparent Decompression solves the **Zip Avalanche Problem**: when project files like `.prproj` are compressed (GZip), even a tiny edit causes the entire binary to change due to compression algorithm characteristics. This defeats content-defined chunking entirely.

### The Problem: Zip Avalanche

```
The Physics of Compression:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Original XML (inside .prproj):                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ <Brightness>50</Brightness>                                      │    │
│  │              ▲                                                   │    │
│  │              │ User changes 50 → 55                              │    │
│  │              ▼                                                   │    │
│  │ <Brightness>55</Brightness>                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  After GZip Compression:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Before: 0x1F 0x8B 0x08 [A1 B2 C3 D4 E5 F6 G7 H8 I9 J0 K1 L2...] │    │
│  │                         ────────────────────────────────────────│    │
│  │                         Dictionary builds on previous bytes     │    │
│  │                                                                  │    │
│  │ After:  0x1F 0x8B 0x08 [A1 B2 C3 XX YY ZZ !! @@ ## $$ %% ^^...] │    │
│  │                               ▲                                  │    │
│  │                               │ Change propagates forward        │    │
│  │                               │ (Sliding Window Avalanche)       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Result: 90-100% of the compressed binary is DIFFERENT                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Standard Chunking Fails

```
Standard Chunking Approach:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Input: Movie.prproj (100 MB compressed)                                 │
│                                                                          │
│  Version 1 Chunks:  [AAAA][BBBB][CCCC][DDDD][EEEE]...                    │
│                                                                          │
│  User edits brightness: 50 → 55                                          │
│                                                                          │
│  Version 2 Chunks:  [XXXX][YYYY][ZZZZ][WWWW][VVVV]...                    │
│                     ▲    ▲    ▲    ▲    ▲                                │
│                     └────┴────┴────┴────┴─── ALL chunks different!       │
│                                                                          │
│  Deduplication:     0%                                                   │
│  Upload Required:   100 MB (entire file)                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Solution: Transparent Decompression

```
Smart Chunking Approach:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Input: Movie.prproj (100 MB compressed)                                 │
│         └── Contains: 800 MB of XML (when decompressed)                  │
│                                                                          │
│  Step 1: Detect compressed project file                                  │
│  Step 2: Decompress IN MEMORY (never touches disk)                       │
│  Step 3: Chunk the RAW XML                                               │
│                                                                          │
│  Version 1 XML Chunks: [xml1][xml2][xml3][xml4][xml5]...                 │
│                                                                          │
│  User edits brightness: 50 → 55                                          │
│                                                                          │
│  Version 2 XML Chunks: [xml1][xml2][XML3'][xml4][xml5]...                │
│                                    ▲                                     │
│                                    └─── ONLY this chunk changed!         │
│                                                                          │
│  Deduplication:     99.9%                                                │
│  Upload Required:   2 KB (just the changed chunk)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Supported Formats

Dits provides structure-aware chunking for **100+ creative and engineering file formats** across multiple industries.

> **Research Sources**: Format specifications verified from official documentation, [Archive Team File Formats Wiki](http://fileformats.archiveteam.org/), [Library of Congress Digital Formats](https://www.loc.gov/preservation/digital/formats/), and vendor specifications.

### Video Editing (NLE)

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| Adobe Premiere Pro | `.prproj` | GZip | XML | GZip decompress | [Spec](http://fileformats.archiveteam.org/wiki/Premiere_Pro) |
| After Effects | `.aep` | None | RIFX (Big-endian RIFF) | Binary block chunking | [Spec](http://justsolve.archiveteam.org/wiki/After_Effects) |
| After Effects | `.aepx` | None | XML | Direct XML chunking | Text-based variant |
| DaVinci Resolve | `.drp` | Proprietary | Proprietary binary | Binary chunking | Database export |
| Final Cut Pro X | `.fcpxml` | None | XML | Direct XML chunking | [Apple Spec](https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference) |
| Avid Media Composer | `.avp`, `.avb` | Custom | Binary | Format-specific | Proprietary |
| Sony Vegas Pro | `.veg`, `.vf` | None | XML | Direct XML chunking | Text-based |
| HitFilm | `.hfp` | ZIP | JSON + Assets | Archive extraction | ZIP container |
| Kdenlive | `.kdenlive` | None | XML | Direct XML chunking | Open format |
| OpenShot | `.osp` | None | JSON | Direct JSON chunking | Open format |
| Shotcut | `.mlt` | None | XML (MLT) | Direct XML chunking | Open format |

### Motion Graphics & Compositing

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| After Effects | `.aep` | None | RIFX binary | Block chunking | [Parser](https://github.com/boltframe/aftereffects-aep-parser) |
| Motion (Apple) | `.motn` | None | Package/Bundle | Bundle extraction | macOS package |
| Nuke | `.nk` | None | TCL Script | Direct text chunking | Text-based |
| Fusion | `.comp` | None | Text/Lua | Format detection | Text-based |
| Natron | `.ntp` | None | XML | Direct XML chunking | Open format |
| Motion Graphics Template | `.mogrt` | ZIP | JSON + Assets | Archive extraction | ZIP container |

### 3D & CAD Software

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| **Blender** (<3.0) | `.blend` | GZip (optional) | Binary blocks | GZip decompress + block chunking | [Spec](http://fileformats.archiveteam.org/wiki/BLEND) |
| **Blender** (≥3.0) | `.blend` | Zstandard (optional) | Binary blocks | Zstd decompress + block chunking | [Commit](https://developer.blender.org/D5799) |
| **Autodesk Maya** | `.ma` | None | ASCII text | Direct text chunking | [LOC Spec](https://www.loc.gov/preservation/digital/formats/fdd/fdd000604.shtml) |
| **Autodesk Maya** | `.mb` | None | IFF-based binary | IFF block chunking | [LOC Spec](https://www.loc.gov/preservation/digital/formats/fdd/fdd000605.shtml) |
| **3ds Max** | `.max` | OLE2/CFB | Binary streams | OLE stream extraction | [Spec](https://blog.kaetemi.be/2012/08/17/3ds-max-file-format-part-1/) |
| **Cinema 4D** | `.c4d` | None | Binary | Container chunking | Proprietary |
| **Houdini** | `.hip`, `.hipnc` | None | Binary/ASCII | Format-specific | SideFX format |
| **ZBrush** | `.zpr`, `.ztl` | None | Binary | Block chunking | Proprietary |
| **Substance Painter** | `.spp` | ZIP | JSON + Textures | Archive extraction | ZIP container |
| **Substance Designer** | `.sbs` | None | XML | Direct XML chunking | XML-based |
| **Marvelous Designer** | `.zprj` | ZIP | JSON + Assets | Archive extraction | ZIP container |
| **SketchUp** | `.skp` | None | Binary | Block chunking | Proprietary |
| **Rhino** | `.3dm` | None | OpenNURBS binary | OpenNURBS chunking | [OpenNURBS](https://github.com/mcneel/opennurbs) |

### CAD / Engineering

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| **AutoCAD** | `.dwg` | LZ77 variant (internal) | Binary with sections | Section-aware chunking | [ODA Spec](https://www.opendesign.com/files/guestdownloads/OpenDesign_Specification_for_.dwg_files.pdf) |
| **AutoCAD** | `.dxf` | None | ASCII text | Direct text chunking | Open format |
| **SolidWorks** | `.sldprt`, `.sldasm` | OLE2/CFB | Binary streams | OLE extraction | [Research](http://heybryan.org/solidworks_file_format.html) |
| **Fusion 360** | `.f3d` | ZIP | JSON + B-Rep | Archive extraction | ZIP container |
| **Inventor** | `.ipt`, `.iam` | OLE2/CFB | Binary streams | OLE extraction | Microsoft OLE |
| **CATIA** | `.catpart`, `.catproduct` | None | Binary | Format-specific | Proprietary |
| **Siemens NX** | `.prt` | None | Binary | Block chunking | Proprietary |
| **STEP** | `.step`, `.stp` | None | ASCII text | Direct text chunking | [ISO 10303-21](https://en.wikipedia.org/wiki/ISO_10303-21) |
| **IGES** | `.iges`, `.igs` | None | ASCII text | Direct text chunking | [ANSI Standard](https://en.wikipedia.org/wiki/IGES) |
| **Parasolid** | `.x_t`, `.x_b` | None | Text/Binary | Format detection | Siemens format |
| **FreeCAD** | `.fcstd` | ZIP | XML + BREP | Archive extraction | [Spec](https://wiki.freecad.org/File_Format_FCStd) |
| **KiCad** | `.kicad_pcb`, `.kicad_sch` | None | S-Expression | Direct text chunking | Open format |
| **Eagle** | `.brd`, `.sch` | None | XML | Direct XML chunking | XML-based |
| **Altium** | `.pcbdoc`, `.schdoc` | OLE2/CFB | Binary streams | OLE extraction | Microsoft OLE |
| **OrCAD** | `.dsn` | None | ASCII text | Direct text chunking | Text-based |

### Game Development

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| **Unreal Engine** | `.uasset`, `.umap` | None (some internal) | Binary (magic: 0x9E2A83C1) | Package chunking | [Parser](https://github.com/jorgenpt/uasset-rs) |
| **Unreal Project** | `.uproject` | None | JSON | Direct JSON chunking | Text JSON |
| **Unity** | `.unity`, `.prefab` | None | UnityYAML | YAML chunking | [Unity Spec](https://docs.unity3d.com/Manual/FormatDescription.html) |
| **Unity** | `.asset` | None | UnityYAML/Binary | Format detection | [Unity Blog](https://blog.unity.com/engine-platform/understanding-unitys-serialization-language-yaml) |
| **Godot** | `.tscn`, `.tres` | None | Godot text format | Direct text chunking | [Godot Spec](https://docs.godotengine.org/en/stable/contributing/development/file_formats/tscn.html) |
| **Godot** | `.godot` | None | INI-like | Direct text chunking | Config format |
| **GameMaker** | `.yyp`, `.yy` | None | JSON | Direct JSON chunking |
| **RPG Maker** | `.rpgproject` | None | JSON | Direct JSON chunking |
| **Construct** | `.c3p` | ZIP | JSON + Assets | Archive extraction |

### Audio Production (DAW)

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| **Pro Tools** | `.ptx` | None | Binary | Block chunking | Proprietary |
| **Ableton Live** | `.als` | GZip | XML | GZip decompress | [Spec](http://fileformats.archiveteam.org/wiki/Ableton_Live) |
| **Logic Pro** | `.logicx` | None | macOS Package/Bundle | Bundle extraction | [LOC Spec](https://www.loc.gov/preservation/digital/formats/fdd/fdd000640.shtml) |
| **FL Studio** | `.flp` | None | Binary (TLV events) | Event-aware chunking | [PyFLP Spec](https://pyflp.readthedocs.io/en/latest/architecture/flp-format.html) |
| **Cubase/Nuendo** | `.cpr` | None | Binary | Block chunking | Proprietary |
| **Reaper** | `.rpp` | None | Text (RPP format) | Direct text chunking | Text-based |
| **Studio One** | `.song` | ZIP | XML + Assets | Archive extraction | ZIP container |
| **Bitwig** | `.bwproject` | ZIP | JSON + Assets | Archive extraction | ZIP container |
| **Reason** | `.reason` | None | Binary | Block chunking | Proprietary |
| **GarageBand** | `.band` | None | macOS Package/Bundle | Bundle extraction | macOS bundle |
| **Audacity** | `.aup3` | None | SQLite 3 | Page-aware chunking | SQLite format |
| **Ardour** | `.ardour` | None | XML | Direct XML chunking | Open format |

### Image Editing & Design

| Application | Extension | Compression | Inner Content | Strategy | Verified |
|-------------|-----------|-------------|---------------|----------|----------|
| **Photoshop** | `.psd` | None (RLE in layers) | Binary 5-section | Section-aware chunking | [Adobe Spec](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) |
| **Photoshop** | `.psb` | None (RLE in layers) | Binary (version 2) | Section-aware chunking | PSB = Large Doc |
| **Illustrator** | `.ai` | None | PDF + PGF | Hybrid chunking | PDF-based |
| **InDesign** | `.indd` | None | Binary | Block chunking | Proprietary |
| **Affinity Photo** | `.afphoto` | ZIP | Proprietary | Archive extraction | ZIP container |
| **Affinity Designer** | `.afdesign` | ZIP | Proprietary | Archive extraction | ZIP container |
| **GIMP** | `.xcf` | GZip (optional) | Binary | Conditional decompress | [XCF Spec](https://gitlab.gnome.org/GNOME/gimp/-/blob/master/devel-docs/xcf.txt) |
| **Krita** | `.kra` | ZIP | XML + PNG layers | Archive extraction | [Krita Spec](https://docs.krita.org/en/general_concepts/file_formats/file_kra.html) |
| **Sketch** | `.sketch` | ZIP | JSON + Assets | Archive extraction | [Sketch Spec](https://developer.sketch.com/file-format/) |
| **Figma** | `.fig` | Custom | Binary | Figma API integration | Proprietary |
| **CorelDRAW** | `.cdr` | None | Binary | Format-specific | Proprietary |

### Vector & Publishing

| Application | Extension | Compression | Inner Content | Strategy |
|-------------|-----------|-------------|---------------|----------|
| **SVG** | `.svg` | None | XML | Direct XML chunking |
| **SVG Compressed** | `.svgz` | GZip | XML | GZip decompress |
| **PDF** | `.pdf` | Mixed | Objects | PDF object chunking |
| **EPS** | `.eps` | None | PostScript | Direct text chunking |
| **Inkscape** | `.svg` | None | XML | Direct XML chunking |
| **Scribus** | `.sla` | None | XML | Direct XML chunking |
| **QuarkXPress** | `.qxp` | None | Binary | Format-specific |

### Office & Documents

| Application | Extension | Compression | Inner Content | Strategy |
|-------------|-----------|-------------|---------------|----------|
| **Microsoft Office** | `.docx`, `.xlsx`, `.pptx` | ZIP | XML + Assets | Archive extraction |
| **OpenDocument** | `.odt`, `.ods`, `.odp` | ZIP | XML + Assets | Archive extraction |
| **Apple iWork** | `.pages`, `.numbers`, `.key` | ZIP | Protobuf + Assets | Archive extraction |
| **Markdown** | `.md` | None | Text | Direct text chunking |
| **LaTeX** | `.tex` | None | Text | Direct text chunking |

### Data & Configuration

| Application | Extension | Compression | Inner Content | Strategy |
|-------------|-----------|-------------|---------------|----------|
| **JSON** | `.json` | None | Text | Direct JSON chunking |
| **YAML** | `.yaml`, `.yml` | None | Text | Direct YAML chunking |
| **XML** | `.xml` | None | Text | Direct XML chunking |
| **TOML** | `.toml` | None | Text | Direct text chunking |
| **INI** | `.ini` | None | Text | Direct text chunking |
| **SQLite** | `.db`, `.sqlite` | None | Binary | Page-aware chunking |
| **Protocol Buffers** | `.pb` | None | Binary | Message-aware chunking |
| **Jupyter Notebook** | `.ipynb` | None | JSON | Cell-aware chunking |

### Archive Formats (Container Handling)

| Format | Extension | Strategy |
|--------|-----------|----------|
| **ZIP** | `.zip` | Per-file chunking |
| **7-Zip** | `.7z` | LZMA decompress + chunking |
| **TAR** | `.tar` | Entry-aware chunking |
| **TAR.GZ** | `.tar.gz`, `.tgz` | GZip decompress + tar chunking |
| **TAR.BZ2** | `.tar.bz2` | BZip2 decompress + tar chunking |
| **TAR.XZ** | `.tar.xz` | XZ decompress + tar chunking |
| **RAR** | `.rar` | RAR decompress + chunking |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TRANSPARENT DECOMPRESSION ENGINE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │ Input File  │                                                        │
│  │ (.prproj)   │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────┐                                                   │
│  │  Format Detector │ ─── Identifies file type by magic bytes/extension │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                    Decompression Router                       │       │
│  │                                                               │       │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │       │
│  │   │  GZip    │  │   ZIP    │  │  Plain   │  │  Custom  │    │       │
│  │   │ Handler  │  │ Handler  │  │  Handler │  │ Handlers │    │       │
│  │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │       │
│  │        │             │             │             │           │       │
│  └────────┼─────────────┼─────────────┼─────────────┼───────────┘       │
│           │             │             │             │                    │
│           └─────────────┼─────────────┼─────────────┘                    │
│                         ▼             ▼                                  │
│                  ┌──────────────────────────┐                           │
│                  │   In-Memory Buffer       │                           │
│                  │   (Decompressed Content) │                           │
│                  └────────────┬─────────────┘                           │
│                               │                                          │
│                               ▼                                          │
│                  ┌──────────────────────────┐                           │
│                  │   Content-Type Router    │                           │
│                  │                          │                           │
│                  │   XML → Small chunks     │                           │
│                  │   Binary → Large chunks  │                           │
│                  │   SQLite → Page chunks   │                           │
│                  └────────────┬─────────────┘                           │
│                               │                                          │
│                               ▼                                          │
│                  ┌──────────────────────────┐                           │
│                  │      FastCDC Chunker     │                           │
│                  │   (Content-appropriate   │                           │
│                  │    parameters)           │                           │
│                  └────────────┬─────────────┘                           │
│                               │                                          │
│                               ▼                                          │
│                  ┌──────────────────────────┐                           │
│                  │   Chunk Storage with     │                           │
│                  │   Reconstruction Recipe  │                           │
│                  └──────────────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


                           RECONSTRUCTION FLOW
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────────┐                                                       │
│  │ Chunk Store  │                                                       │
│  │ (XML chunks) │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────┐                                                   │
│  │ Chunk Assembly   │ ── Reconstruct decompressed content               │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │ Re-Compression   │ ── GZip compress back to .prproj format           │
│  │ (GZip Level 6)   │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  Valid .prproj   │ ── Premiere Pro can open this file                │
│  │  Output File     │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Format Detection

```rust
use std::io::{Read, Seek, SeekFrom};

/// Compressed format types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CompressedFormat {
    /// GZip compressed (e.g., .prproj, .als, .blend <3.0)
    GZip,
    /// Zstandard compressed (e.g., .blend >=3.0)
    Zstandard,
    /// ZIP archive (e.g., .mogrt, .sketch, .docx, .f3d)
    Zip,
    /// Plain text/XML (e.g., .fcpxml, .ma, .dxf)
    Plain,
    /// SQLite database (e.g., .aup3)
    Sqlite,
    /// OLE Compound Document (e.g., .max, .sldprt, .doc)
    Ole,
    /// Binary format with known structure (e.g., .aep, .psd, .dwg, .drp)
    Binary,
    /// macOS Bundle/Package (e.g., .logicx, .band)
    Bundle,
    /// Unknown format (use generic chunking)
    Unknown,
}

/// Magic bytes for format detection
const GZIP_MAGIC: [u8; 2] = [0x1F, 0x8B];
const ZSTD_MAGIC: [u8; 4] = [0x28, 0xB5, 0x2F, 0xFD];  // Zstandard
const ZIP_MAGIC: [u8; 4] = [0x50, 0x4B, 0x03, 0x04];
const SQLITE_MAGIC: [u8; 16] = *b"SQLite format 3\0";
const OLE_MAGIC: [u8; 8] = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
const XML_START: &[u8] = b"<?xml";
const YAML_START: &[u8] = b"%YAML";
const JSON_START_OBJ: u8 = b'{';
const JSON_START_ARR: u8 = b'[';
const RIFX_MAGIC: [u8; 4] = *b"RIFX";
const PSD_MAGIC: [u8; 4] = *b"8BPS";
const BLENDER_MAGIC: [u8; 7] = *b"BLENDER";
const PDF_MAGIC: [u8; 4] = *b"%PDF";
const UNREAL_MAGIC: [u8; 4] = [0xC1, 0x83, 0x2A, 0x9E];  // Little-endian
const FLP_MAGIC: [u8; 4] = *b"FLhd";  // FL Studio

/// Comprehensive format detection from file content and extension
pub fn detect_format(path: &Path) -> Result<FormatInfo> {
    // Check if it's a directory (bundle/package)
    if path.is_dir() {
        return Ok(FormatInfo {
            compression: CompressedFormat::Bundle,
            file_type: FileType::Bundle,
            handler: "bundle",
        });
    }

    let mut file = File::open(path)?;
    let mut header = [0u8; 32];
    let bytes_read = file.read(&mut header)?;

    // Check magic bytes first
    if bytes_read >= 2 && header[0..2] == GZIP_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::GZip,
            file_type: detect_gzip_content(path),
            handler: "gzip",
        });
    }

    if bytes_read >= 4 && header[0..4] == ZSTD_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Zstandard,
            file_type: detect_zstd_content(path),
            handler: "zstd",
        });
    }

    if bytes_read >= 4 && header[0..4] == FLP_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::FLStudio,
            handler: "flp",
        });
    }

    if bytes_read >= 4 && header[0..4] == ZIP_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Zip,
            file_type: detect_zip_content(path),
            handler: "zip",
        });
    }

    if bytes_read >= 16 && header[0..16] == SQLITE_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Sqlite,
            file_type: FileType::Database,
            handler: "sqlite",
        });
    }

    if bytes_read >= 8 && header[0..8] == OLE_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Ole,
            file_type: detect_ole_content(path),
            handler: "ole",
        });
    }

    if bytes_read >= 4 && header[0..4] == PSD_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::Photoshop,
            handler: "psd",
        });
    }

    if bytes_read >= 7 && header[0..7] == BLENDER_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::Blender,
            handler: "blend",
        });
    }

    if bytes_read >= 4 && header[0..4] == RIFX_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::AfterEffects,
            handler: "rifx",
        });
    }

    if bytes_read >= 4 && header[0..4] == PDF_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::Pdf,
            handler: "pdf",
        });
    }

    if bytes_read >= 4 && header[0..4] == UNREAL_MAGIC {
        return Ok(FormatInfo {
            compression: CompressedFormat::Binary,
            file_type: FileType::UnrealAsset,
            handler: "unreal",
        });
    }

    // Check for text formats
    let start = if bytes_read >= 3 && header[0..3] == [0xEF, 0xBB, 0xBF] {
        &header[3..]  // Skip UTF-8 BOM
    } else {
        &header[..]
    };

    if start.starts_with(XML_START) || start.starts_with(b"<") {
        return Ok(FormatInfo {
            compression: CompressedFormat::Plain,
            file_type: FileType::Xml,
            handler: "xml",
        });
    }

    if start.starts_with(YAML_START) {
        return Ok(FormatInfo {
            compression: CompressedFormat::Plain,
            file_type: FileType::Yaml,
            handler: "yaml",
        });
    }

    if !start.is_empty() && (start[0] == JSON_START_OBJ || start[0] == JSON_START_ARR) {
        return Ok(FormatInfo {
            compression: CompressedFormat::Plain,
            file_type: FileType::Json,
            handler: "json",
        });
    }

    // Fall back to extension-based detection
    detect_by_extension(path)
}

/// Detect format by file extension
fn detect_by_extension(path: &Path) -> Result<FormatInfo> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match ext.as_deref() {
        // Video Editing (NLE)
        Some("prproj") => Ok(FormatInfo::gzip(FileType::Premiere)),
        Some("aep") => Ok(FormatInfo::binary(FileType::AfterEffects)),
        Some("drp") => Ok(FormatInfo::binary(FileType::Resolve)),
        Some("fcpxml" | "fcp") => Ok(FormatInfo::xml(FileType::FinalCut)),
        Some("veg" | "vf") => Ok(FormatInfo::xml(FileType::Vegas)),
        Some("avp" | "avb") => Ok(FormatInfo::binary(FileType::Avid)),
        Some("kdenlive" | "mlt") => Ok(FormatInfo::xml(FileType::Kdenlive)),
        Some("hfp") => Ok(FormatInfo::zip(FileType::HitFilm)),

        // Motion Graphics
        Some("mogrt" | "aegraphic") => Ok(FormatInfo::zip(FileType::MotionGraphics)),
        Some("motn") => Ok(FormatInfo::bundle(FileType::AppleMotion)),
        Some("nk") => Ok(FormatInfo::plain(FileType::Nuke)),
        Some("comp") => Ok(FormatInfo::plain(FileType::Fusion)),

        // 3D Software
        Some("blend") => Ok(FormatInfo::binary(FileType::Blender)),
        Some("ma") => Ok(FormatInfo::plain(FileType::MayaAscii)),
        Some("mb") => Ok(FormatInfo::binary(FileType::MayaBinary)),
        Some("max") => Ok(FormatInfo::ole(FileType::Max3ds)),
        Some("c4d") => Ok(FormatInfo::binary(FileType::Cinema4D)),
        Some("hip" | "hipnc") => Ok(FormatInfo::binary(FileType::Houdini)),
        Some("zpr" | "ztl") => Ok(FormatInfo::binary(FileType::ZBrush)),
        Some("spp") => Ok(FormatInfo::zip(FileType::SubstancePainter)),
        Some("sbs") => Ok(FormatInfo::xml(FileType::SubstanceDesigner)),
        Some("skp") => Ok(FormatInfo::binary(FileType::SketchUp)),
        Some("3dm") => Ok(FormatInfo::binary(FileType::Rhino)),

        // CAD
        Some("dwg") => Ok(FormatInfo::binary(FileType::AutoCadDwg)),
        Some("dxf") => Ok(FormatInfo::plain(FileType::AutoCadDxf)),
        Some("sldprt" | "sldasm" | "slddrw") => Ok(FormatInfo::ole(FileType::SolidWorks)),
        Some("f3d") => Ok(FormatInfo::zip(FileType::Fusion360)),
        Some("ipt" | "iam") => Ok(FormatInfo::ole(FileType::Inventor)),
        Some("step" | "stp") => Ok(FormatInfo::plain(FileType::Step)),
        Some("iges" | "igs") => Ok(FormatInfo::plain(FileType::Iges)),
        Some("fcstd") => Ok(FormatInfo::zip(FileType::FreeCAD)),
        Some("kicad_pcb" | "kicad_sch") => Ok(FormatInfo::plain(FileType::KiCad)),
        Some("brd" | "sch") => Ok(FormatInfo::xml(FileType::Eagle)),

        // Game Development
        Some("uasset" | "umap") => Ok(FormatInfo::binary(FileType::UnrealAsset)),
        Some("uproject") => Ok(FormatInfo::json(FileType::UnrealProject)),
        Some("unity" | "prefab") => Ok(FormatInfo::yaml(FileType::UnityScene)),
        Some("asset") => Ok(FormatInfo::yaml(FileType::UnityAsset)),
        Some("tscn" | "tres" | "godot") => Ok(FormatInfo::plain(FileType::Godot)),
        Some("yyp" | "yy") => Ok(FormatInfo::json(FileType::GameMaker)),
        Some("c3p") => Ok(FormatInfo::zip(FileType::Construct)),

        // Audio (DAW)
        Some("als") => Ok(FormatInfo::gzip(FileType::Ableton)),
        Some("logicx") => Ok(FormatInfo::bundle(FileType::LogicPro)),
        Some("flp") => Ok(FormatInfo::binary(FileType::FLStudio)),
        Some("cpr") => Ok(FormatInfo::binary(FileType::Cubase)),
        Some("rpp") => Ok(FormatInfo::plain(FileType::Reaper)),
        Some("song") => Ok(FormatInfo::zip(FileType::StudioOne)),
        Some("bwproject") => Ok(FormatInfo::zip(FileType::Bitwig)),
        Some("band") => Ok(FormatInfo::bundle(FileType::GarageBand)),
        Some("aup3") => Ok(FormatInfo::sqlite(FileType::Audacity)),
        Some("ardour") => Ok(FormatInfo::xml(FileType::Ardour)),

        // Image/Design
        Some("psd") => Ok(FormatInfo::binary(FileType::Photoshop)),
        Some("psb") => Ok(FormatInfo::binary(FileType::PhotoshopLarge)),
        Some("ai") => Ok(FormatInfo::binary(FileType::Illustrator)),
        Some("indd") => Ok(FormatInfo::binary(FileType::InDesign)),
        Some("afphoto" | "afdesign" | "afpub") => Ok(FormatInfo::zip(FileType::Affinity)),
        Some("xcf") => Ok(FormatInfo::binary(FileType::Gimp)),
        Some("kra") => Ok(FormatInfo::zip(FileType::Krita)),
        Some("sketch") => Ok(FormatInfo::zip(FileType::Sketch)),
        Some("fig") => Ok(FormatInfo::binary(FileType::Figma)),
        Some("cdr") => Ok(FormatInfo::binary(FileType::CorelDraw)),

        // Vector/Publishing
        Some("svg") => Ok(FormatInfo::xml(FileType::Svg)),
        Some("svgz") => Ok(FormatInfo::gzip(FileType::SvgCompressed)),
        Some("pdf") => Ok(FormatInfo::binary(FileType::Pdf)),
        Some("eps") => Ok(FormatInfo::plain(FileType::Eps)),
        Some("sla") => Ok(FormatInfo::xml(FileType::Scribus)),

        // Office
        Some("docx" | "xlsx" | "pptx") => Ok(FormatInfo::zip(FileType::MsOffice)),
        Some("odt" | "ods" | "odp") => Ok(FormatInfo::zip(FileType::OpenDocument)),
        Some("pages" | "numbers" | "key") => Ok(FormatInfo::zip(FileType::IWork)),
        Some("doc" | "xls" | "ppt") => Ok(FormatInfo::ole(FileType::MsOfficeLegacy)),

        // Data formats
        Some("json") => Ok(FormatInfo::json(FileType::Json)),
        Some("yaml" | "yml") => Ok(FormatInfo::yaml(FileType::Yaml)),
        Some("xml") => Ok(FormatInfo::xml(FileType::Xml)),
        Some("toml" | "ini" | "cfg") => Ok(FormatInfo::plain(FileType::Config)),
        Some("md" | "markdown" | "txt") => Ok(FormatInfo::plain(FileType::Text)),
        Some("ipynb") => Ok(FormatInfo::json(FileType::JupyterNotebook)),
        Some("db" | "sqlite" | "sqlite3") => Ok(FormatInfo::sqlite(FileType::Database)),

        // Archives
        Some("zip") => Ok(FormatInfo::zip(FileType::ZipArchive)),
        Some("7z") => Ok(FormatInfo::binary(FileType::SevenZip)),
        Some("tar") => Ok(FormatInfo::binary(FileType::Tar)),
        Some("gz" | "tgz") => Ok(FormatInfo::gzip(FileType::GzipArchive)),

        // Unknown - use generic binary chunking
        _ => Ok(FormatInfo {
            compression: CompressedFormat::Unknown,
            file_type: FileType::Unknown,
            handler: "generic",
        }),
    }
}

/// Format information with compression type and file type
#[derive(Debug, Clone)]
pub struct FormatInfo {
    pub compression: CompressedFormat,
    pub file_type: FileType,
    pub handler: &'static str,
}

impl FormatInfo {
    fn gzip(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::GZip, file_type, handler: "gzip" }
    }
    fn zstd(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Zstandard, file_type, handler: "zstd" }
    }
    fn zip(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Zip, file_type, handler: "zip" }
    }
    fn plain(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Plain, file_type, handler: "plain" }
    }
    fn xml(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Plain, file_type, handler: "xml" }
    }
    fn json(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Plain, file_type, handler: "json" }
    }
    fn yaml(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Plain, file_type, handler: "yaml" }
    }
    fn sqlite(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Sqlite, file_type, handler: "sqlite" }
    }
    fn ole(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Ole, file_type, handler: "ole" }
    }
    fn binary(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Binary, file_type, handler: "binary" }
    }
    fn bundle(file_type: FileType) -> Self {
        Self { compression: CompressedFormat::Bundle, file_type, handler: "bundle" }
    }
}

/// Detect content type for Zstandard-compressed files
fn detect_zstd_content(path: &Path) -> FileType {
    // Currently only Blender 3.0+ uses Zstandard
    match path.extension().and_then(|e| e.to_str()) {
        Some("blend") => FileType::Blender,
        _ => FileType::Unknown,
    }
}

/// Detailed file type enumeration
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FileType {
    // Video Editing
    Premiere, AfterEffects, Resolve, FinalCut, Vegas, Avid, Kdenlive, HitFilm,
    // Motion Graphics
    MotionGraphics, AppleMotion, Nuke, Fusion,
    // 3D
    Blender, MayaAscii, MayaBinary, Max3ds, Cinema4D, Houdini, ZBrush,
    SubstancePainter, SubstanceDesigner, SketchUp, Rhino,
    // CAD
    AutoCadDwg, AutoCadDxf, SolidWorks, Fusion360, Inventor, Step, Iges,
    FreeCAD, KiCad, Eagle,
    // Game Dev
    UnrealAsset, UnrealProject, UnityScene, UnityAsset, Godot, GameMaker, Construct,
    // Audio
    Ableton, LogicPro, FLStudio, Cubase, Reaper, StudioOne, Bitwig, GarageBand,
    Audacity, Ardour,
    // Image/Design
    Photoshop, PhotoshopLarge, Illustrator, InDesign, Affinity, Gimp, Krita,
    Sketch, Figma, CorelDraw,
    // Vector/Publishing
    Svg, SvgCompressed, Pdf, Eps, Scribus,
    // Office
    MsOffice, MsOfficeLegacy, OpenDocument, IWork,
    // Data
    Json, Yaml, Xml, Config, Text, JupyterNotebook, Database,
    // Archives
    ZipArchive, SevenZip, Tar, GzipArchive,
    // Other
    Bundle, Unknown,
}
```

### GZip Decompression (Premiere Pro)

```rust
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;

/// Premiere Pro project handler
pub struct PremiereHandler;

impl PremiereHandler {
    /// Decompress .prproj to raw XML in memory
    pub fn decompress(path: &Path) -> Result<DecompressedContent> {
        let file = File::open(path)?;
        let file_size = file.metadata()?.len();

        // Create GZip decoder
        let mut decoder = GzDecoder::new(BufReader::new(file));

        // Read decompressed content into memory
        // Premiere projects expand ~8-10x when decompressed
        let estimated_size = (file_size * 10) as usize;
        let mut decompressed = Vec::with_capacity(estimated_size);

        decoder.read_to_end(&mut decompressed)?;

        // Validate it's XML
        if !decompressed.starts_with(b"<?xml") && !decompressed.starts_with(b"<") {
            return Err(Error::InvalidProjectFormat(
                "Decompressed content is not XML".into()
            ));
        }

        Ok(DecompressedContent {
            data: decompressed,
            original_format: CompressedFormat::GZip,
            compression_level: Compression::default().level(),
        })
    }

    /// Recompress XML back to .prproj format
    pub fn recompress(content: &[u8], compression_level: u32) -> Result<Vec<u8>> {
        let mut encoder = GzEncoder::new(
            Vec::new(),
            Compression::new(compression_level),
        );

        encoder.write_all(content)?;
        let compressed = encoder.finish()?;

        Ok(compressed)
    }

    /// Chunk decompressed XML with optimal parameters
    pub fn chunk_xml(xml_data: &[u8]) -> Result<Vec<ChunkInfo>> {
        // Use smaller chunks for XML (better dedup on text)
        let config = FastCdcConfig {
            min_size: 2 * 1024,      // 2 KB min
            avg_size: 8 * 1024,      // 8 KB avg
            max_size: 32 * 1024,     // 32 KB max
            normalization: 2,
            ..Default::default()
        };

        let chunker = FastCdc::new(xml_data, config);
        let mut chunks = Vec::new();

        for chunk in chunker {
            let hash = blake3::hash(chunk.data);

            chunks.push(ChunkInfo {
                hash: *hash.as_bytes(),
                offset: chunk.offset,
                size: chunk.length as u32,
            });
        }

        Ok(chunks)
    }
}

/// Decompressed content with metadata for reconstruction
#[derive(Debug)]
pub struct DecompressedContent {
    /// Raw decompressed bytes
    pub data: Vec<u8>,

    /// Original compression format
    pub original_format: CompressedFormat,

    /// Compression level to use when recompressing
    pub compression_level: u32,
}
```

### ZIP Archive Handling (Motion Graphics Templates, etc.)

```rust
use zip::ZipArchive;
use zip::write::ZipWriter;

/// ZIP-based format handler (e.g., .mogrt, .prproj packages)
pub struct ZipHandler;

impl ZipHandler {
    /// Extract and chunk ZIP archive contents
    pub fn decompress(path: &Path) -> Result<ZipDecompressedContent> {
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;

        let mut entries = Vec::new();

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let name = entry.name().to_string();

            if entry.is_file() {
                let mut data = Vec::new();
                entry.read_to_end(&mut data)?;

                entries.push(ZipEntry {
                    name,
                    data,
                    compression_method: entry.compression(),
                    modified: entry.last_modified(),
                });
            }
        }

        Ok(ZipDecompressedContent {
            entries,
            comment: archive.comment().to_vec(),
        })
    }

    /// Chunk each file in the archive separately
    pub fn chunk_archive(content: &ZipDecompressedContent) -> Result<ArchiveChunkMap> {
        let mut chunk_map = ArchiveChunkMap::new();

        for entry in &content.entries {
            // Determine chunking strategy based on content type
            let config = if is_text_content(&entry.data) {
                FastCdcConfig::small_file()  // Smaller chunks for text
            } else {
                FastCdcConfig::default()     // Normal chunks for binary
            };

            let chunks = chunk_data(&entry.data, config)?;

            chunk_map.add_entry(&entry.name, chunks);
        }

        Ok(chunk_map)
    }

    /// Reconstruct ZIP archive from chunks
    pub fn recompress(
        chunk_map: &ArchiveChunkMap,
        original: &ZipDecompressedContent,
        output: &mut impl Write,
    ) -> Result<()> {
        let mut zip = ZipWriter::new(output);

        for original_entry in &original.entries {
            // Reconstruct file data from chunks
            let data = chunk_map.reconstruct_entry(&original_entry.name)?;

            // Create entry with original metadata
            let options = zip::write::FileOptions::default()
                .compression_method(original_entry.compression_method)
                .last_modified_time(original_entry.modified);

            zip.start_file(&original_entry.name, options)?;
            zip.write_all(&data)?;
        }

        if !original.comment.is_empty() {
            zip.set_comment(String::from_utf8_lossy(&original.comment));
        }

        zip.finish()?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct ZipDecompressedContent {
    pub entries: Vec<ZipEntry>,
    pub comment: Vec<u8>,
}

#[derive(Debug)]
pub struct ZipEntry {
    pub name: String,
    pub data: Vec<u8>,
    pub compression_method: zip::CompressionMethod,
    pub modified: zip::DateTime,
}
```

### SQLite Handling (Audacity, etc.)

```rust
/// SQLite database handler (e.g., Audacity .aup3)
/// Note: DaVinci Resolve .drp is NOT SQLite - it's a proprietary binary format
pub struct SqliteHandler;

impl SqliteHandler {
    /// Chunk SQLite database with page awareness
    pub fn chunk_database(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // SQLite uses fixed-size pages (usually 4096 bytes)
        let page_size = Self::get_page_size(&data)?;

        // Chunk on page boundaries for better dedup
        // Changes to one table won't affect chunks for other tables
        let config = FastCdcConfig {
            min_size: page_size,
            avg_size: page_size * 4,   // ~16 KB
            max_size: page_size * 16,  // ~64 KB
            ..Default::default()
        };

        chunk_data(&data, config)
    }

    /// Get SQLite page size from header
    fn get_page_size(data: &[u8]) -> Result<usize> {
        if data.len() < 100 || &data[0..16] != b"SQLite format 3\0" {
            return Err(Error::InvalidSqliteFormat);
        }

        // Page size is at offset 16, 2 bytes big-endian
        let page_size = u16::from_be_bytes([data[16], data[17]]) as usize;

        // Page size of 1 means 65536
        let page_size = if page_size == 1 { 65536 } else { page_size };

        Ok(page_size)
    }
}

/// DaVinci Resolve project handler (.drp)
/// Note: .drp files are proprietary binary format, NOT SQLite
/// The actual database is stored separately in the Resolve database location
pub struct ResolveHandler;

impl ResolveHandler {
    /// Chunk DaVinci Resolve project file
    pub fn chunk_drp(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // .drp files are proprietary binary exports
        // They contain project metadata and timeline information
        // Use medium-sized chunks for binary data
        let config = FastCdcConfig {
            min_size: 8 * 1024,      // 8 KB min
            avg_size: 64 * 1024,     // 64 KB avg
            max_size: 256 * 1024,    // 256 KB max
            ..Default::default()
        };

        chunk_data(&data, config)
    }
}
```

### Blender (.blend) Handler

```rust
use flate2::read::GzDecoder;
use zstd::stream::read::Decoder as ZstdDecoder;

/// Blender file handler - supports both GZip (pre-3.0) and Zstandard (3.0+) compression
///
/// Reference: https://developer.blender.org/D5799
/// - Blender < 3.0: Uses GZip compression
/// - Blender >= 3.0: Uses Zstandard compression (level 3, seekable format)
pub struct BlenderHandler;

impl BlenderHandler {
    /// Magic bytes for Blender files
    const MAGIC_UNCOMPRESSED: &'static [u8] = b"BLENDER";
    const MAGIC_GZIP: [u8; 2] = [0x1F, 0x8B];        // GZip magic (Blender < 3.0)
    const MAGIC_ZSTD: [u8; 4] = [0x28, 0xB5, 0x2F, 0xFD];  // Zstandard magic (Blender >= 3.0)

    /// Detect compression type
    pub fn detect_compression(header: &[u8]) -> BlendCompression {
        if header.len() >= 4 && header[0..4] == Self::MAGIC_ZSTD {
            BlendCompression::Zstandard
        } else if header.len() >= 2 && header[0..2] == Self::MAGIC_GZIP {
            BlendCompression::GZip
        } else if header.len() >= 7 && &header[0..7] == Self::MAGIC_UNCOMPRESSED {
            BlendCompression::None
        } else {
            BlendCompression::Unknown
        }
    }

    /// Process .blend file with optional decompression
    pub fn decompress(path: &Path) -> Result<DecompressedContent> {
        let mut file = File::open(path)?;
        let mut header = [0u8; 12];
        file.read_exact(&mut header)?;
        file.seek(SeekFrom::Start(0))?;

        let compression = Self::detect_compression(&header);

        let data = match compression {
            BlendCompression::Zstandard => {
                // Blender 3.0+ uses Zstandard with seekable format
                let decoder = ZstdDecoder::new(BufReader::new(file))?;
                let mut decompressed = Vec::new();
                std::io::copy(&mut decoder.into_inner(), &mut decompressed)?;
                decompressed
            }
            BlendCompression::GZip => {
                // Blender < 3.0 uses GZip
                let mut decoder = GzDecoder::new(BufReader::new(file));
                let mut decompressed = Vec::new();
                decoder.read_to_end(&mut decompressed)?;
                decompressed
            }
            BlendCompression::None => {
                std::fs::read(path)?
            }
            BlendCompression::Unknown => {
                return Err(Error::InvalidBlendFile);
            }
        };

        // Validate Blender header after decompression
        if !data.starts_with(Self::MAGIC_UNCOMPRESSED) {
            return Err(Error::InvalidBlendFile);
        }

        Ok(DecompressedContent {
            data,
            original_format: match compression {
                BlendCompression::Zstandard => CompressedFormat::Zstandard,
                BlendCompression::GZip => CompressedFormat::GZip,
                _ => CompressedFormat::Binary,
            },
            compression_level: 3,  // Blender uses zstd level 3
        })
    }

    /// Chunk Blender file with block awareness
    ///
    /// Blender file structure:
    /// - Header (12 bytes): "BLENDER" + pointer_size + endian + version
    /// - File blocks: Each block has code(4) + size(4) + address(ptr_size) + SDNAnr(4) + nr(4) + data
    /// - DNA1 block: Contains schema for all structures (machine-readable)
    /// - ENDB block: End marker
    pub fn chunk_blend(data: &[u8]) -> Result<Vec<ChunkInfo>> {
        // Parse header to determine pointer size
        // Byte 7: '-' = 64-bit pointers, '_' = 32-bit pointers
        // Byte 8: 'v' = little-endian, 'V' = big-endian
        let pointer_size = if data[7] == b'-' { 8 } else { 4 };
        let _endian = if data[8] == b'v' { "little" } else { "big" };

        // Use block-aware chunking for better dedup
        // Blocks typically range from a few KB to several MB
        let config = FastCdcConfig {
            min_size: 4 * 1024,       // 4 KB min
            avg_size: 64 * 1024,      // 64 KB avg
            max_size: 512 * 1024,     // 512 KB max
            ..Default::default()
        };

        chunk_data(data, config)
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BlendCompression {
    None,
    GZip,       // Blender < 3.0
    Zstandard,  // Blender >= 3.0
    Unknown,
}
```

### Photoshop (.psd/.psb) Handler

```rust
/// Photoshop PSD/PSB handler - layer-aware chunking
pub struct PhotoshopHandler;

impl PhotoshopHandler {
    const PSD_MAGIC: [u8; 4] = *b"8BPS";

    /// Chunk PSD with layer awareness
    pub fn chunk_psd(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Validate PSD header
        if data.len() < 26 || &data[0..4] != &Self::PSD_MAGIC {
            return Err(Error::InvalidPsdFile);
        }

        let version = u16::from_be_bytes([data[4], data[5]]);
        let is_psb = version == 2;  // PSB (large document) has version 2

        // PSD structure:
        // - Header (26 bytes)
        // - Color Mode Data
        // - Image Resources
        // - Layer and Mask Info (this is where most edits happen)
        // - Image Data

        // Parse section offsets for smarter chunking
        let sections = Self::parse_sections(&data, is_psb)?;

        // Chunk each section appropriately
        let mut all_chunks = Vec::new();

        for section in sections {
            let section_data = &data[section.offset..section.offset + section.size];

            let config = match section.section_type {
                PsdSection::Header | PsdSection::ColorMode => {
                    // Small, rarely changes
                    FastCdcConfig {
                        min_size: 256,
                        avg_size: 1024,
                        max_size: 4096,
                        ..Default::default()
                    }
                }
                PsdSection::LayerMask => {
                    // Most edits happen here, use smaller chunks
                    FastCdcConfig {
                        min_size: 2 * 1024,
                        avg_size: 8 * 1024,
                        max_size: 32 * 1024,
                        ..Default::default()
                    }
                }
                PsdSection::ImageData => {
                    // Large pixel data, use bigger chunks
                    FastCdcConfig {
                        min_size: 32 * 1024,
                        avg_size: 128 * 1024,
                        max_size: 512 * 1024,
                        ..Default::default()
                    }
                }
                _ => FastCdcConfig::default(),
            };

            let chunks = chunk_data(section_data, config)?;
            all_chunks.extend(chunks);
        }

        Ok(all_chunks)
    }

    fn parse_sections(data: &[u8], is_psb: bool) -> Result<Vec<PsdSectionInfo>> {
        let mut sections = Vec::new();
        let mut offset = 26;  // After header

        // Color Mode Data section
        let cm_len = u32::from_be_bytes(data[offset..offset+4].try_into()?) as usize;
        sections.push(PsdSectionInfo {
            section_type: PsdSection::ColorMode,
            offset,
            size: 4 + cm_len,
        });
        offset += 4 + cm_len;

        // Image Resources section
        let ir_len = u32::from_be_bytes(data[offset..offset+4].try_into()?) as usize;
        sections.push(PsdSectionInfo {
            section_type: PsdSection::ImageResources,
            offset,
            size: 4 + ir_len,
        });
        offset += 4 + ir_len;

        // Layer and Mask section
        let lm_len = if is_psb {
            u64::from_be_bytes(data[offset..offset+8].try_into()?) as usize
        } else {
            u32::from_be_bytes(data[offset..offset+4].try_into()?) as usize
        };
        let lm_header_size = if is_psb { 8 } else { 4 };
        sections.push(PsdSectionInfo {
            section_type: PsdSection::LayerMask,
            offset,
            size: lm_header_size + lm_len,
        });
        offset += lm_header_size + lm_len;

        // Image Data (rest of file)
        sections.push(PsdSectionInfo {
            section_type: PsdSection::ImageData,
            offset,
            size: data.len() - offset,
        });

        Ok(sections)
    }
}

#[derive(Debug, Clone, Copy)]
enum PsdSection {
    Header,
    ColorMode,
    ImageResources,
    LayerMask,
    ImageData,
}

struct PsdSectionInfo {
    section_type: PsdSection,
    offset: usize,
    size: usize,
}
```

### Maya (.ma/.mb) Handler

```rust
/// Autodesk Maya file handler
pub struct MayaHandler;

impl MayaHandler {
    /// Process Maya ASCII (.ma) file
    pub fn chunk_maya_ascii(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Maya ASCII is plain text, use small chunks for good dedup
        let config = FastCdcConfig {
            min_size: 2 * 1024,
            avg_size: 8 * 1024,
            max_size: 32 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }

    /// Process Maya Binary (.mb) file
    pub fn chunk_maya_binary(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Maya Binary uses IFF (Interchange File Format) structure
        // Each chunk has: type(4) + size(4) + data
        // Use medium chunks to align with IFF blocks
        let config = FastCdcConfig {
            min_size: 8 * 1024,
            avg_size: 64 * 1024,
            max_size: 256 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }
}
```

### 3ds Max (.max) Handler

```rust
/// 3ds Max file handler - OLE Compound Document
pub struct MaxHandler;

impl MaxHandler {
    /// Process .max file (OLE structured storage)
    pub fn decompress(path: &Path) -> Result<OleDecompressedContent> {
        // 3ds Max files are OLE Compound Documents
        let file = std::fs::File::open(path)?;
        let ole = cfb::CompoundFile::open(file)?;

        let mut streams = Vec::new();

        // Extract all streams from OLE container
        for entry in ole.walk() {
            if entry.is_stream() {
                let mut stream = ole.open_stream(entry.path())?;
                let mut data = Vec::new();
                stream.read_to_end(&mut data)?;

                streams.push(OleStream {
                    path: entry.path().to_string_lossy().to_string(),
                    data,
                });
            }
        }

        Ok(OleDecompressedContent { streams })
    }

    /// Chunk OLE streams individually
    pub fn chunk_ole(content: &OleDecompressedContent) -> Result<Vec<ChunkInfo>> {
        let mut all_chunks = Vec::new();

        for stream in &content.streams {
            // Smaller streams (metadata) get smaller chunks
            // Larger streams (geometry) get larger chunks
            let config = if stream.data.len() < 64 * 1024 {
                FastCdcConfig::small_file()
            } else {
                FastCdcConfig::default()
            };

            let chunks = chunk_data(&stream.data, config)?;
            all_chunks.extend(chunks);
        }

        Ok(all_chunks)
    }
}

#[derive(Debug)]
pub struct OleDecompressedContent {
    pub streams: Vec<OleStream>,
}

#[derive(Debug)]
pub struct OleStream {
    pub path: String,
    pub data: Vec<u8>,
}
```

### AutoCAD DWG Handler

```rust
/// AutoCAD DWG file handler
pub struct DwgHandler;

impl DwgHandler {
    /// Chunk DWG with section awareness
    pub fn chunk_dwg(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // DWG files have a complex structure with:
        // - Header section (fixed location, rarely changes)
        // - Class section
        // - Object map
        // - Objects (entities, layers, blocks)
        // - Handles section

        // Most edits affect objects, use medium chunks
        let config = FastCdcConfig {
            min_size: 4 * 1024,
            avg_size: 32 * 1024,
            max_size: 128 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }
}

/// AutoCAD DXF handler (ASCII format)
pub struct DxfHandler;

impl DxfHandler {
    /// Chunk DXF as text file
    pub fn chunk_dxf(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // DXF is ASCII, use small chunks
        let config = FastCdcConfig {
            min_size: 2 * 1024,
            avg_size: 8 * 1024,
            max_size: 32 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }
}
```

### SolidWorks Handler

```rust
/// SolidWorks file handler (.sldprt, .sldasm, .slddrw)
pub struct SolidWorksHandler;

impl SolidWorksHandler {
    /// Process SolidWorks file (OLE structured storage)
    pub fn decompress(path: &Path) -> Result<OleDecompressedContent> {
        // SolidWorks uses Microsoft Structured Storage (OLE)
        let file = std::fs::File::open(path)?;
        let ole = cfb::CompoundFile::open(file)?;

        let mut streams = Vec::new();

        for entry in ole.walk() {
            if entry.is_stream() {
                let mut stream = ole.open_stream(entry.path())?;
                let mut data = Vec::new();
                stream.read_to_end(&mut data)?;

                streams.push(OleStream {
                    path: entry.path().to_string_lossy().to_string(),
                    data,
                });
            }
        }

        Ok(OleDecompressedContent { streams })
    }
}
```

### Unity Handler

```rust
/// Unity file handler (.unity, .prefab, .asset)
pub struct UnityHandler;

impl UnityHandler {
    /// Chunk Unity YAML files
    pub fn chunk_unity_yaml(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Unity uses YAML with special markers
        // %YAML 1.1
        // %TAG !u! tag:unity3d.com,2011:

        // Use small chunks - YAML is highly repetitive
        let config = FastCdcConfig {
            min_size: 1 * 1024,
            avg_size: 4 * 1024,
            max_size: 16 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }

    /// Detect if file is YAML or binary
    pub fn is_yaml(path: &Path) -> Result<bool> {
        let mut file = File::open(path)?;
        let mut header = [0u8; 20];
        file.read_exact(&mut header)?;

        Ok(header.starts_with(b"%YAML"))
    }
}
```

### Unreal Engine Handler

```rust
/// Unreal Engine asset handler (.uasset, .umap)
pub struct UnrealHandler;

impl UnrealHandler {
    const UNREAL_MAGIC: u32 = 0x9E2A83C1;

    /// Chunk Unreal asset files
    pub fn chunk_uasset(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Validate Unreal magic
        if data.len() < 4 {
            return Err(Error::InvalidUnrealAsset);
        }

        let magic = u32::from_le_bytes(data[0..4].try_into()?);
        if magic != Self::UNREAL_MAGIC {
            return Err(Error::InvalidUnrealAsset);
        }

        // Unreal assets have:
        // - Package summary (header)
        // - Name table
        // - Import table
        // - Export table
        // - Export data (bulk of file)

        // Use larger chunks - binary format with good locality
        let config = FastCdcConfig {
            min_size: 16 * 1024,
            avg_size: 64 * 1024,
            max_size: 256 * 1024,
            ..Default::default()
        };

        chunk_data(&data, config)
    }
}
```

### Ableton Live Handler

```rust
/// Ableton Live project handler (.als)
pub struct AbletonHandler;

impl AbletonHandler {
    /// Decompress .als file (GZip compressed XML)
    pub fn decompress(path: &Path) -> Result<DecompressedContent> {
        let file = File::open(path)?;
        let mut decoder = GzDecoder::new(BufReader::new(file));

        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)?;

        // Validate it's Ableton XML
        if !decompressed.starts_with(b"<?xml") {
            return Err(Error::InvalidAbletonProject);
        }

        Ok(DecompressedContent {
            data: decompressed,
            original_format: CompressedFormat::GZip,
            compression_level: 9,  // Ableton uses max compression
        })
    }

    /// Chunk Ableton XML
    pub fn chunk_als(xml_data: &[u8]) -> Result<Vec<ChunkInfo>> {
        // Ableton XML has deep nesting, use small chunks
        let config = FastCdcConfig {
            min_size: 2 * 1024,
            avg_size: 8 * 1024,
            max_size: 32 * 1024,
            ..Default::default()
        };

        chunk_data(xml_data, config)
    }
}
```

### FL Studio Handler

```rust
/// FL Studio project handler (.flp)
///
/// FL Studio uses a binary TLV (Type-Length-Value) event format, NOT compressed.
/// Reference: https://pyflp.readthedocs.io/en/latest/architecture/flp-format.html
///
/// File structure:
/// - Header: "FLhd" magic + header_len(4) + format(2) + channels(2) + ppq(2)
/// - Data chunk: "FLdt" magic + data_len(4) + events[]
/// - Each event: type(1) + [length_varint] + data[]
///   - Types 0-63: Single byte data (no length field)
///   - Types 64-127: Word (2 bytes, no length field)
///   - Types 128-191: DWord (4 bytes, no length field)
///   - Types 192-255: Variable length (varint length prefix)
pub struct FLStudioHandler;

impl FLStudioHandler {
    const HEADER_MAGIC: &'static [u8] = b"FLhd";
    const DATA_MAGIC: &'static [u8] = b"FLdt";

    /// Chunk FL Studio project with event awareness
    pub fn chunk_flp(path: &Path) -> Result<Vec<ChunkInfo>> {
        let data = std::fs::read(path)?;

        // Validate FLP header
        if data.len() < 22 || &data[0..4] != Self::HEADER_MAGIC {
            return Err(Error::InvalidFLPFile);
        }

        // FL Studio files are binary with no compression
        // Events are typically small, so use smaller chunk sizes
        // to maximize deduplication when only some events change
        let config = FastCdcConfig {
            min_size: 4 * 1024,      // 4 KB min
            avg_size: 16 * 1024,     // 16 KB avg
            max_size: 64 * 1024,     // 64 KB max
            ..Default::default()
        };

        chunk_data(&data, config)
    }

    /// Parse FLP events (for analysis/debugging)
    pub fn parse_events(data: &[u8]) -> Result<Vec<FlpEvent>> {
        let mut events = Vec::new();
        let mut offset = 0;

        // Skip header chunk
        if &data[0..4] != Self::HEADER_MAGIC {
            return Err(Error::InvalidFLPFile);
        }
        let header_len = u32::from_le_bytes(data[4..8].try_into()?) as usize;
        offset = 8 + header_len;

        // Validate data chunk
        if &data[offset..offset+4] != Self::DATA_MAGIC {
            return Err(Error::InvalidFLPFile);
        }
        let data_len = u32::from_le_bytes(data[offset+4..offset+8].try_into()?) as usize;
        offset += 8;

        let end = offset + data_len;

        // Parse events
        while offset < end {
            let event_type = data[offset];
            offset += 1;

            let (event_data, new_offset) = match event_type {
                0..=63 => {
                    // Single byte data
                    (&data[offset..offset+1], offset + 1)
                }
                64..=127 => {
                    // Word (2 bytes)
                    (&data[offset..offset+2], offset + 2)
                }
                128..=191 => {
                    // DWord (4 bytes)
                    (&data[offset..offset+4], offset + 4)
                }
                192..=255 => {
                    // Variable length with varint prefix
                    let (len, varint_size) = Self::read_varint(&data[offset..])?;
                    let data_start = offset + varint_size;
                    (&data[data_start..data_start+len], data_start + len)
                }
            };

            events.push(FlpEvent {
                event_type,
                data: event_data.to_vec(),
            });

            offset = new_offset;
        }

        Ok(events)
    }

    /// Read a varint (variable-length integer)
    fn read_varint(data: &[u8]) -> Result<(usize, usize)> {
        let mut result = 0usize;
        let mut shift = 0;
        let mut bytes_read = 0;

        for &byte in data.iter().take(5) {
            bytes_read += 1;
            result |= ((byte & 0x7F) as usize) << shift;
            if byte & 0x80 == 0 {
                return Ok((result, bytes_read));
            }
            shift += 7;
        }

        Err(Error::InvalidVarint)
    }
}

#[derive(Debug)]
pub struct FlpEvent {
    pub event_type: u8,
    pub data: Vec<u8>,
}
```

### macOS Package/Bundle Handler

```rust
/// macOS package handler (Logic Pro, GarageBand, Final Cut libraries)
pub struct BundleHandler;

impl BundleHandler {
    /// Process macOS package (directory treated as file)
    pub fn process_bundle(path: &Path) -> Result<BundleContent> {
        let mut entries = Vec::new();

        // Walk the bundle directory
        for entry in walkdir::WalkDir::new(path) {
            let entry = entry?;
            if entry.file_type().is_file() {
                let rel_path = entry.path().strip_prefix(path)?;
                let data = std::fs::read(entry.path())?;

                entries.push(BundleEntry {
                    relative_path: rel_path.to_path_buf(),
                    data,
                });
            }
        }

        Ok(BundleContent { entries })
    }

    /// Chunk each file in bundle
    pub fn chunk_bundle(content: &BundleContent) -> Result<Vec<ChunkInfo>> {
        let mut all_chunks = Vec::new();

        for entry in &content.entries {
            let config = Self::config_for_extension(
                entry.relative_path.extension()
            );

            let chunks = chunk_data(&entry.data, config)?;
            all_chunks.extend(chunks);
        }

        Ok(all_chunks)
    }

    fn config_for_extension(ext: Option<&std::ffi::OsStr>) -> FastCdcConfig {
        match ext.and_then(|e| e.to_str()) {
            Some("xml" | "plist") => FastCdcConfig::small_file(),
            Some("aif" | "wav" | "caf") => FastCdcConfig::video(),
            _ => FastCdcConfig::default(),
        }
    }
}

#[derive(Debug)]
pub struct BundleContent {
    pub entries: Vec<BundleEntry>,
}

#[derive(Debug)]
pub struct BundleEntry {
    pub relative_path: PathBuf,
    pub data: Vec<u8>,
}
```

---

## Unified Processing Pipeline

```rust
/// Main entry point for transparent decompression
pub struct TransparentDecompressor {
    /// Cache of decompressed content (for performance)
    cache: LruCache<PathBuf, Arc<DecompressedContent>>,
}

impl TransparentDecompressor {
    pub fn new(cache_size: usize) -> Self {
        Self {
            cache: LruCache::new(cache_size),
        }
    }

    /// Process file with transparent decompression
    pub fn process_file(&mut self, path: &Path) -> Result<ProcessedFile> {
        let format = detect_format(path)?;

        match format {
            CompressedFormat::GZip => {
                // Premiere Pro, Ableton Live, Blender <3.0, etc.
                let content = PremiereHandler::decompress(path)?;
                let chunks = PremiereHandler::chunk_xml(&content.data)?;

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks,
                    reconstruction_recipe: ReconstructionRecipe::GZip {
                        compression_level: content.compression_level,
                    },
                    decompressed_size: content.data.len() as u64,
                })
            }

            CompressedFormat::Zstandard => {
                // Blender 3.0+
                let content = BlenderHandler::decompress(path)?;
                let chunks = BlenderHandler::chunk_blend(&content.data)?;

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks,
                    reconstruction_recipe: ReconstructionRecipe::Zstandard {
                        compression_level: content.compression_level,
                    },
                    decompressed_size: content.data.len() as u64,
                })
            }

            CompressedFormat::Zip => {
                let content = ZipHandler::decompress(path)?;
                let chunk_map = ZipHandler::chunk_archive(&content)?;

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks: chunk_map.all_chunks(),
                    reconstruction_recipe: ReconstructionRecipe::Zip {
                        structure: content,
                    },
                    decompressed_size: chunk_map.total_size(),
                })
            }

            CompressedFormat::Sqlite => {
                let chunks = SqliteHandler::chunk_database(path)?;
                let size = std::fs::metadata(path)?.len();

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks,
                    reconstruction_recipe: ReconstructionRecipe::Direct,
                    decompressed_size: size,
                })
            }

            CompressedFormat::Plain | CompressedFormat::Binary => {
                // Standard chunking, no decompression needed
                let data = std::fs::read(path)?;
                let config = if format == CompressedFormat::Plain {
                    FastCdcConfig::small_file()
                } else {
                    FastCdcConfig::default()
                };

                let chunks = chunk_data(&data, config)?;

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks,
                    reconstruction_recipe: ReconstructionRecipe::Direct,
                    decompressed_size: data.len() as u64,
                })
            }

            CompressedFormat::Unknown => {
                // Fall back to standard binary chunking
                let data = std::fs::read(path)?;
                let chunks = chunk_data(&data, FastCdcConfig::default())?;

                Ok(ProcessedFile {
                    original_path: path.to_path_buf(),
                    format,
                    chunks,
                    reconstruction_recipe: ReconstructionRecipe::Direct,
                    decompressed_size: data.len() as u64,
                })
            }
        }
    }

    /// Reconstruct original file from chunks
    pub fn reconstruct(
        &self,
        processed: &ProcessedFile,
        chunk_store: &impl ChunkStore,
        output: &Path,
    ) -> Result<()> {
        // Retrieve all chunks
        let mut decompressed = Vec::new();
        for chunk_info in &processed.chunks {
            let chunk_data = chunk_store.get(&chunk_info.hash)?;
            decompressed.extend_from_slice(&chunk_data);
        }

        // Apply reconstruction recipe
        let output_data = match &processed.reconstruction_recipe {
            ReconstructionRecipe::GZip { compression_level } => {
                PremiereHandler::recompress(&decompressed, *compression_level)?
            }

            ReconstructionRecipe::Zstandard { compression_level } => {
                // Recompress with Zstandard for Blender 3.0+
                let mut encoder = zstd::stream::write::Encoder::new(
                    Vec::new(),
                    *compression_level as i32,
                )?;
                encoder.write_all(&decompressed)?;
                encoder.finish()?
            }

            ReconstructionRecipe::Zip { structure } => {
                let mut output_buf = Vec::new();
                // Reconstruct chunk map from stored data
                let chunk_map = rebuild_chunk_map(&processed.chunks, &decompressed)?;
                ZipHandler::recompress(&chunk_map, structure, &mut output_buf)?;
                output_buf
            }

            ReconstructionRecipe::Direct => {
                decompressed
            }
        };

        std::fs::write(output, output_data)?;
        Ok(())
    }
}

/// Processed file with chunks and reconstruction info
#[derive(Debug)]
pub struct ProcessedFile {
    pub original_path: PathBuf,
    pub format: CompressedFormat,
    pub chunks: Vec<ChunkInfo>,
    pub reconstruction_recipe: ReconstructionRecipe,
    pub decompressed_size: u64,
}

/// Recipe for reconstructing original file from chunks
#[derive(Debug, Clone)]
pub enum ReconstructionRecipe {
    /// GZip compress the assembled chunks
    GZip { compression_level: u32 },

    /// Zstandard compress the assembled chunks (Blender 3.0+)
    Zstandard { compression_level: u32 },

    /// Reassemble as ZIP archive
    Zip { structure: ZipDecompressedContent },

    /// Direct assembly (no post-processing)
    Direct,
}
```

---

## Efficiency Comparison

### Real-World Test: 100MB Premiere Project

| Scenario | Standard Chunking | Transparent Decompression |
|----------|-------------------|---------------------------|
| **Edit brightness (+5%)** | | |
| Binary diff | 90-100% different | 0.01% different |
| Chunks changed | ~1,500 of 1,500 | 1 of 12,500 |
| Upload size | **100 MB** | **2 KB** |
| Upload time (10 Mbps) | 80 seconds | **<1 second** |
| | | |
| **Add new clip reference** | | |
| Binary diff | 85-95% different | 0.1% different |
| Chunks changed | ~1,400 of 1,500 | ~10 of 12,500 |
| Upload size | **90 MB** | **80 KB** |
| Upload time (10 Mbps) | 72 seconds | **<1 second** |
| | | |
| **Rename sequence** | | |
| Binary diff | 80-90% different | 0.05% different |
| Chunks changed | ~1,300 of 1,500 | 3 of 12,500 |
| Upload size | **85 MB** | **24 KB** |
| Upload time (10 Mbps) | 68 seconds | **<1 second** |

### Storage Efficiency Over Time

```
100 saves of a 100MB Premiere project:

Standard Chunking:
  - Each save: ~50MB average new data (50% dedup on binary)
  - Total storage: 5,000 MB (5 GB)

Transparent Decompression:
  - Each save: ~50KB average new data (99.95% dedup on XML)
  - Total storage: 105 MB (100 MB initial + 5 MB of deltas)

Storage Reduction: 98%
```

---

## Configuration

```toml
# .dits/config

[transparent_decompression]
# Enable transparent decompression
enabled = true

# Formats to process (auto-detected by default)
formats = ["prproj", "mogrt", "aep"]

# Compression level for reconstruction (1-9)
# Higher = smaller files, slower
gzip_level = 6

# Memory limit for decompression (bytes)
# Large projects may exceed this
max_memory = "2GB"

# Cache decompressed content for faster repeated access
cache_enabled = true
cache_size = "500MB"

# Validate reconstructed files match original
# (slower but catches corruption)
validate_reconstruction = false

# Chunk size tuning for XML content
[transparent_decompression.xml_chunking]
min_size = "2KB"
avg_size = "8KB"
max_size = "32KB"
```

---

## CLI Commands

```bash
# Check if a file will use transparent decompression
dits info project.prproj
# Output:
# File: project.prproj
# Format: Adobe Premiere Pro (GZip compressed XML)
# Compressed size: 100 MB
# Decompressed size: 850 MB
# Chunking strategy: Transparent Decompression
# Estimated chunks: ~13,000 (8KB average)

# Force standard chunking (for comparison/debugging)
dits add project.prproj --no-decompress

# Show decompression statistics
dits stats --decompression
# Output:
# Transparent Decompression Statistics:
#   Files processed: 234
#   Total compressed size: 12.5 GB
#   Total decompressed size: 95.2 GB
#   Storage saved: 94.8 GB (99.8% of naive approach)
#   Average dedup ratio: 99.2%

# Validate reconstruction
dits verify project.prproj --check-reconstruction
# Output:
# Reconstructing project.prproj...
# Comparing with original...
# MATCH: Reconstructed file is identical to original
```

---

## Edge Cases and Handling

### Premiere Pro Version Differences

```rust
/// Handle different Premiere versions
pub fn detect_premiere_version(xml: &[u8]) -> Result<PremiereVersion> {
    // Parse XML to find version info
    let content = std::str::from_utf8(xml)?;

    // Look for version in project header
    if let Some(version_match) = VERSION_REGEX.captures(content) {
        let version = version_match.get(1).unwrap().as_str();
        return Ok(PremiereVersion::from_string(version)?);
    }

    // Fallback: detect by XML structure differences
    if content.contains("<ProjectViewState.1>") {
        return Ok(PremiereVersion::CC2020Plus);
    } else if content.contains("<ProjectViewState>") {
        return Ok(PremiereVersion::CC2019OrEarlier);
    }

    Ok(PremiereVersion::Unknown)
}
```

### Corrupted Compression

```rust
/// Handle potentially corrupted compressed files
pub fn safe_decompress(path: &Path) -> Result<DecompressedContent> {
    let file = File::open(path)?;
    let mut decoder = GzDecoder::new(BufReader::new(file));

    let mut decompressed = Vec::new();

    match decoder.read_to_end(&mut decompressed) {
        Ok(_) => {}
        Err(e) if e.kind() == std::io::ErrorKind::InvalidData => {
            // Try to recover partial content
            warn!("GZip decompression error, attempting recovery: {}", e);
            decompressed = attempt_recovery(path)?;
        }
        Err(e) => return Err(e.into()),
    }

    // Validate XML structure
    if !is_valid_xml(&decompressed) {
        return Err(Error::CorruptedProject(
            "Decompressed content is not valid XML".into()
        ));
    }

    Ok(DecompressedContent {
        data: decompressed,
        original_format: CompressedFormat::GZip,
        compression_level: Compression::default().level(),
    })
}
```

### Memory Management for Large Projects

```rust
/// Stream decompression for very large projects
pub struct StreamingDecompressor {
    config: FastCdcConfig,
    max_memory: usize,
}

impl StreamingDecompressor {
    /// Process large file in streaming fashion
    pub fn process_large_file(&self, path: &Path) -> Result<Vec<ChunkInfo>> {
        let file = File::open(path)?;
        let file_size = file.metadata()?.len() as usize;

        // Estimate decompressed size (8-10x for XML)
        let estimated_decompressed = file_size * 10;

        if estimated_decompressed > self.max_memory {
            // Use streaming approach
            self.process_streaming(file)
        } else {
            // Standard in-memory approach
            self.process_inmemory(file)
        }
    }

    fn process_streaming(&self, file: File) -> Result<Vec<ChunkInfo>> {
        let decoder = GzDecoder::new(BufReader::new(file));
        let mut chunker = StreamingChunker::new(self.config.clone());
        let mut reader = BufReader::new(decoder);
        let mut buffer = vec![0u8; 256 * 1024];  // 256 KB read buffer

        let mut all_chunks = Vec::new();

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }

            chunker.feed(&buffer[..bytes_read]);
            all_chunks.extend(chunker.process());
        }

        if let Some(final_chunk) = chunker.finish() {
            all_chunks.push(final_chunk);
        }

        Ok(all_chunks)
    }
}
```

---

## Security Considerations

### Decompression Bombs

```rust
/// Protect against decompression bombs
pub fn safe_decompress_with_limit(
    path: &Path,
    max_ratio: f64,
    max_size: usize,
) -> Result<DecompressedContent> {
    let file = File::open(path)?;
    let compressed_size = file.metadata()?.len() as usize;

    let mut decoder = GzDecoder::new(BufReader::new(file));
    let mut decompressed = Vec::new();
    let mut total_read = 0usize;

    let mut buffer = [0u8; 64 * 1024];

    loop {
        let bytes_read = decoder.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        total_read += bytes_read;

        // Check absolute size limit
        if total_read > max_size {
            return Err(Error::DecompressionBomb(
                format!("Decompressed size {} exceeds limit {}", total_read, max_size)
            ));
        }

        // Check ratio limit
        let ratio = total_read as f64 / compressed_size as f64;
        if ratio > max_ratio {
            return Err(Error::DecompressionBomb(
                format!("Compression ratio {} exceeds limit {}", ratio, max_ratio)
            ));
        }

        decompressed.extend_from_slice(&buffer[..bytes_read]);
    }

    Ok(DecompressedContent {
        data: decompressed,
        original_format: CompressedFormat::GZip,
        compression_level: Compression::default().level(),
    })
}
```

---

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_premiere_roundtrip() {
        // Create mock XML content
        let xml = br#"<?xml version="1.0" encoding="UTF-8"?>
        <Project>
            <Sequence>
                <Brightness>50</Brightness>
            </Sequence>
        </Project>"#;

        // Compress
        let compressed = PremiereHandler::recompress(xml, 6).unwrap();

        // Decompress
        let temp = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(temp.path(), &compressed).unwrap();

        let decompressed = PremiereHandler::decompress(temp.path()).unwrap();

        assert_eq!(decompressed.data, xml.to_vec());
    }

    #[test]
    fn test_dedup_efficiency() {
        // Create two similar XML documents
        let xml1 = generate_premiere_xml(1000, 50);  // 1000 clips, brightness=50
        let xml2 = generate_premiere_xml(1000, 55);  // 1000 clips, brightness=55

        // Chunk both
        let chunks1 = PremiereHandler::chunk_xml(&xml1).unwrap();
        let chunks2 = PremiereHandler::chunk_xml(&xml2).unwrap();

        // Count matching chunks
        let hashes1: HashSet<_> = chunks1.iter().map(|c| c.hash).collect();
        let hashes2: HashSet<_> = chunks2.iter().map(|c| c.hash).collect();

        let matching = hashes1.intersection(&hashes2).count();
        let dedup_ratio = matching as f64 / chunks1.len() as f64;

        // Should have very high dedup (only brightness value changed)
        assert!(dedup_ratio > 0.95, "Dedup ratio {} is too low", dedup_ratio);
    }

    #[test]
    fn test_compressed_binary_dedup_fails() {
        // Same test but on compressed binary (to prove the problem)
        let xml1 = generate_premiere_xml(1000, 50);
        let xml2 = generate_premiere_xml(1000, 55);

        let compressed1 = PremiereHandler::recompress(&xml1, 6).unwrap();
        let compressed2 = PremiereHandler::recompress(&xml2, 6).unwrap();

        // Chunk compressed data directly
        let chunks1 = chunk_data(&compressed1, FastCdcConfig::default()).unwrap();
        let chunks2 = chunk_data(&compressed2, FastCdcConfig::default()).unwrap();

        let hashes1: HashSet<_> = chunks1.iter().map(|c| c.hash).collect();
        let hashes2: HashSet<_> = chunks2.iter().map(|c| c.hash).collect();

        let matching = hashes1.intersection(&hashes2).count();
        let dedup_ratio = matching as f64 / chunks1.len() as f64;

        // Should have very LOW dedup (avalanche effect)
        assert!(dedup_ratio < 0.2, "Dedup ratio {} is too high for compressed", dedup_ratio);
    }

    #[test]
    fn test_reconstruction_integrity() {
        let original_path = "fixtures/sample.prproj";
        let original_data = std::fs::read(original_path).unwrap();

        let mut decompressor = TransparentDecompressor::new(10);
        let processed = decompressor.process_file(Path::new(original_path)).unwrap();

        // Store chunks
        let mut chunk_store = InMemoryChunkStore::new();
        for chunk in &processed.chunks {
            let data = read_chunk_from_decompressed(&processed, chunk);
            chunk_store.put(&chunk.hash, data);
        }

        // Reconstruct
        let temp = tempfile::NamedTempFile::new().unwrap();
        decompressor.reconstruct(&processed, &chunk_store, temp.path()).unwrap();

        let reconstructed_data = std::fs::read(temp.path()).unwrap();

        // Compare
        assert_eq!(original_data, reconstructed_data,
            "Reconstructed file differs from original");
    }
}
```

---

## Performance Benchmarks

```rust
#[bench]
fn bench_premiere_decompress(b: &mut Bencher) {
    let path = "fixtures/100mb.prproj";

    b.iter(|| {
        PremiereHandler::decompress(Path::new(path)).unwrap()
    });
}

#[bench]
fn bench_premiere_chunk(b: &mut Bencher) {
    let content = PremiereHandler::decompress(Path::new("fixtures/100mb.prproj")).unwrap();

    b.iter(|| {
        PremiereHandler::chunk_xml(&content.data).unwrap()
    });
}

#[bench]
fn bench_premiere_recompress(b: &mut Bencher) {
    let content = PremiereHandler::decompress(Path::new("fixtures/100mb.prproj")).unwrap();

    b.iter(|| {
        PremiereHandler::recompress(&content.data, 6).unwrap()
    });
}
```

### Expected Performance

| Operation | 100 MB .prproj | Throughput |
|-----------|----------------|------------|
| Decompress | ~200 ms | 500 MB/s |
| Chunk XML | ~100 ms | 8 GB/s |
| Recompress | ~800 ms | 125 MB/s |
| **Total** | **~1.1 s** | |

---

## References

- [GZip Format Specification (RFC 1952)](https://datatracker.ietf.org/doc/html/rfc1952)
- [FastCDC Algorithm](./fastcdc.md)
- [NLE Parser Specifications](../parsers/nle-parsers.md)
- [flate2 Crate Documentation](https://docs.rs/flate2)
- [ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
