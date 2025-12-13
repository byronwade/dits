# Compatibility Matrix

Supported platforms, formats, and application versions.

---

## Operating Systems

### Desktop Clients

| OS | Version | Architecture | Status | Notes |
|----|---------|--------------|--------|-------|
| **macOS** | 12 (Monterey)+ | x86_64 | Supported | Notarized |
| | 12+ | arm64 (Apple Silicon) | Supported | Native binary |
| **Windows** | 10 (1903+) | x86_64 | Supported | |
| | 11 | x86_64 | Supported | |
| | 11 | arm64 | Planned | Q3 2025 |
| **Linux** | Ubuntu 22.04+ | x86_64 | Supported | .deb, AppImage |
| | Fedora 38+ | x86_64 | Supported | .rpm |
| | Debian 12+ | x86_64 | Supported | .deb |
| | Arch | x86_64 | Community | AUR |
| | Alpine | x86_64 | Docker only | |

### Server

| OS | Version | Status |
|----|---------|--------|
| Linux (any) | Kernel 5.10+ | Supported |
| Container | Docker 20.10+ | Supported |
| Kubernetes | 1.25+ | Supported |

---

## Video Formats

### Containers

| Format | Extension | Read | Write | Chunking | Notes |
|--------|-----------|------|-------|----------|-------|
| **QuickTime** | .mov | Full | Full | Structure-aware | Primary target |
| **ISOBMFF/MP4** | .mp4 | Full | Full | Structure-aware | |
| **MXF** | .mxf | Full | Full | Structure-aware | Broadcast |
| **AVI** | .avi | Full | Full | Generic | Legacy |
| **MKV** | .mkv | Read | Read | Generic | Planned structure-aware |
| **WebM** | .webm | Read | Read | Generic | |

### Video Codecs

| Codec | Support | Keyframe Detection | Notes |
|-------|---------|-------------------|-------|
| **ProRes** | Full | All I-frame | Every frame is keyframe |
| **ProRes RAW** | Full | All I-frame | |
| **DNxHD/DNxHR** | Full | All I-frame | |
| **H.264/AVC** | Full | GOP analysis | Long GOP handling |
| **H.265/HEVC** | Full | GOP analysis | |
| **AV1** | Full | GOP analysis | |
| **VP9** | Full | GOP analysis | |
| **MPEG-2** | Full | GOP analysis | Legacy broadcast |
| **JPEG 2000** | Full | All I-frame | DCI/archival |
| **RED RAW** | Full | All I-frame | .r3d |
| **ARRI RAW** | Full | All I-frame | .ari |
| **Blackmagic RAW** | Full | Partial I | .braw |
| **Canon Cinema RAW** | Full | All I-frame | .crm |
| **Sony RAW** | Full | All I-frame | .mxf |

### Audio Codecs

| Codec | Support | Notes |
|-------|---------|-------|
| **PCM/WAV** | Full | Uncompressed |
| **AAC** | Full | |
| **MP3** | Full | |
| **FLAC** | Full | Lossless |
| **ALAC** | Full | Apple Lossless |
| **Opus** | Full | |
| **AC-3/E-AC-3** | Full | Dolby |
| **DTS** | Full | |

---

## Image Formats

### Still Images

| Format | Extension | Read | Write | Chunking | Notes |
|--------|-----------|------|-------|----------|-------|
| **JPEG** | .jpg, .jpeg | Full | Full | Generic | v1.1+ |
| **PNG** | .png | Full | Full | Generic | |
| **TIFF** | .tif, .tiff | Full | Full | Structure-aware | v1.2+ |
| **OpenEXR** | .exr | Full | Full | Structure-aware | VFX |
| **DPX** | .dpx | Full | Full | Structure-aware | Film scan |
| **PSD** | .psd | Full | Full | Layer-aware | v1.3+ |
| **HEIF/HEIC** | .heif, .heic | Full | Full | Generic | |
| **WebP** | .webp | Full | Full | Generic | |
| **RAW** | Various | Full | Full | Generic | See below |

### Camera RAW Formats

| Format | Extensions | Support |
|--------|------------|---------|
| Canon | .cr2, .cr3 | Full |
| Nikon | .nef, .nrw | Full |
| Sony | .arw | Full |
| Fujifilm | .raf | Full |
| Adobe DNG | .dng | Full |
| Olympus | .orf | Full |
| Panasonic | .rw2 | Full |
| Leica | .rwl | Full |
| Phase One | .iiq | Full |
| Hasselblad | .3fr | Full |

---

## Project File Formats

### Video Editing (NLE)

| Application | Format | Version | Support | Dependency Extraction |
|-------------|--------|---------|---------|----------------------|
| **Adobe Premiere Pro** | .prproj | 2020+ | Full | Full |
| **DaVinci Resolve** | .drp | 17+ | Full | Full |
| **Final Cut Pro X** | .fcpxml | 1.8+ | Full | Full |
| **Avid Media Composer** | .avp | 2021+ | Partial | Partial |
| **Vegas Pro** | .veg | 18+ | Read only | None |

### Motion Graphics / VFX

| Application | Format | Version | Support | Dependency Extraction |
|-------------|--------|---------|---------|----------------------|
| **After Effects** | .aep | 2020+ | Full | Full |
| **Nuke** | .nk | 12+ | Read only | Partial |
| **Fusion** | .comp | 17+ | Read only | Partial |
| **Houdini** | .hip, .hipnc | 19+ | Read only | None |

### Audio

| Application | Format | Version | Support |
|-------------|--------|---------|---------|
| **Pro Tools** | .ptx | 2021+ | Read only |
| **Logic Pro** | .logicx | 10.6+ | Read only |
| **Ableton Live** | .als | 11+ | Read only |

### Graphics

| Application | Format | Support |
|-------------|--------|---------|
| **Photoshop** | .psd | Full |
| **Illustrator** | .ai | Read only |
| **InDesign** | .indd | Read only |
| **Figma** | .fig | Planned |
| **Sketch** | .sketch | Planned |

---

## Cloud Storage

### Object Storage

| Provider | Service | Support | Notes |
|----------|---------|---------|-------|
| **AWS** | S3 | Full | Primary target |
| | S3 Glacier | Full | Lifecycle |
| | S3 Express | Planned | Low latency |
| **Google Cloud** | Cloud Storage | Full | |
| | Coldline/Archive | Full | Lifecycle |
| **Azure** | Blob Storage | Full | |
| | Cool/Archive | Full | Lifecycle |
| **Cloudflare** | R2 | Full | S3-compatible |
| **Backblaze** | B2 | Full | S3-compatible |
| **MinIO** | Self-hosted | Full | S3-compatible |
| **Wasabi** | | Full | S3-compatible |

### Authentication Providers

| Provider | Protocol | Support |
|----------|----------|---------|
| **AWS IAM** | STS | Full |
| **Google** | OAuth 2.0 / Service Account | Full |
| **Azure AD** | OAuth 2.0 / Managed Identity | Full |
| **OIDC** | Generic | Full |
| **SAML** | 2.0 | Enterprise |
| **LDAP** | v3 | Enterprise |

---

## Database

### Server Database

| Database | Version | Support | Notes |
|----------|---------|---------|-------|
| **PostgreSQL** | 14+ | Full | Primary |
| | 15+ | Recommended | Better performance |
| | 16+ | Recommended | Latest features |
| **CockroachDB** | 23.1+ | Full | Distributed |

### Client Database

| Database | Support | Notes |
|----------|---------|-------|
| **SQLite** | Full | Local metadata |
| **sled** | Full | Embedded KV store |

### Cache

| System | Version | Support |
|--------|---------|---------|
| **Redis** | 7+ | Full |
| **KeyDB** | 6+ | Full |
| **DragonflyDB** | 1.0+ | Partial |

---

## Network

### Protocols

| Protocol | Support | Notes |
|----------|---------|-------|
| **HTTPS** | Full | REST API |
| **HTTP/2** | Full | Multiplexing |
| **HTTP/3 (QUIC)** | Full | Chunk transfer |
| **WebSocket** | Full | Real-time events |
| **SSH** | Full | Git-style auth |

### Proxy Support

| Type | Support |
|------|---------|
| HTTP Proxy | Full |
| HTTPS Proxy | Full |
| SOCKS5 | Full |
| PAC | Planned |

---

## IDE Integrations

### VS Code

| Feature | Support |
|---------|---------|
| Extension | Full |
| Source Control | Full |
| File decorations | Full |
| Diff view | Partial |

### JetBrains IDEs

| IDE | Support |
|-----|---------|
| IntelliJ IDEA | Full |
| PyCharm | Full |
| WebStorm | Full |
| CLion | Full |
| Rider | Full |

### Other Editors

| Editor | Support |
|--------|---------|
| Sublime Text | Plugin (community) |
| Vim/Neovim | Plugin (community) |
| Emacs | Plugin (community) |

---

## NLE Plugin Support

### Adobe Premiere Pro

| Feature | Support |
|---------|---------|
| Panel extension | Full |
| Import from Dits | Full |
| Export to Dits | Full |
| Version browser | Full |
| Lock status | Full |

### DaVinci Resolve

| Feature | Support |
|---------|---------|
| Script extension | Full |
| Media pool sync | Full |
| Timeline backup | Full |

### Final Cut Pro X

| Feature | Support |
|---------|---------|
| Workflow extension | Planned |
| Library sync | Planned |

---

## Browser Support (Web UI)

| Browser | Version | Support |
|---------|---------|---------|
| **Chrome** | 100+ | Full |
| **Firefox** | 100+ | Full |
| **Safari** | 15+ | Full |
| **Edge** | 100+ | Full |

### Mobile Browsers

| Browser | Support |
|---------|---------|
| Chrome (Android) | Full |
| Safari (iOS) | Full |
| Firefox (Android) | Partial |

---

## API Client SDKs

| Language | Package | Support |
|----------|---------|---------|
| **Rust** | `dits-sdk` | Full |
| **Python** | `dits-py` | Full |
| **JavaScript/TypeScript** | `@dits/sdk` | Full |
| **Go** | `dits-go` | Full |
| **C/C++** | `libdits` | Partial |
| **Swift** | `DitsKit` | Planned |
| **Kotlin** | `dits-kotlin` | Planned |

---

## Deprecated / Unsupported

### Operating Systems

- Windows 7, 8, 8.1
- macOS < 12
- 32-bit systems

### Formats

- Real Media (.rm, .rmvb)
- Windows Media (.wmv, .asf)
- Flash Video (.flv)

### Browsers

- Internet Explorer (all versions)
- Chrome < 100
- Firefox < 100

---

## Notes

- "Full" = Complete feature support with testing
- "Partial" = Basic functionality, some features missing
- "Planned" = On roadmap, not yet implemented
- "Community" = Third-party maintained
- Version requirements are minimum supported
