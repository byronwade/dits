# Engineering Execution Manual — Phase 6 (The Hologram Layer)

**Project:** Dits (Data-Intensive Version Control System)  
**Phase:** 6 — The Hologram Layer (Proxy Automation)  
**Objective:** Serve lightweight 1080p proxies for editing over weak links while keeping edits frame-accurate to 8K originals; swap back to masters for render.

---

## Alignment with README (core ground rules)
- Preserve core CAS invariants (BLAKE3 IDs, FastCDC defaults); variants/proxies must not alter manifest identity of the originals.
- Prefer explicit modes (`checkout --mode proxy`) over spoofing; keep file paths stable for NLEs.
- Keep open formats and reproducibility: document ffmpeg settings, verify duration/timecode within strict tolerances.
- Performance targets: proxies generated asynchronously; user workflows remain responsive; errors surfaced clearly.
- Surface proxy state in CLI/UI (e.g., status/log markers) and provide `dits fetch-proxy <path>` to prewarm proxies.
- Maintain deterministic toggling: proxy ↔ master swaps without path changes; caches flushed on mode switch.

---

## Core Concept: Dual-Stream Proxy Mode
- Avoid lying to NLEs about file structure. Provide an explicit proxy mode instead of spoofing headers.  
- `dits checkout --mode proxy` fetches proxies; renders use originals on server/render node.

---

## Tech Stack (Transcoding Layer)
| Component | Tech | Role |
| :--- | :--- | :--- |
| Transcoder | FFmpeg (`ffmpeg-next`) | Proxy generation |
| Worker queue | Celery / Faktory | Coordinate transcode jobs |
| Trigger | S3 Event Notifications | Fire on new high-res asset |
| Codec | ProRes 422 Proxy / DNxHR LB | Laptop-friendly intra codecs |

---

## Architecture Components
### Transcode Pipeline
1. Ingest: new 8K asset arrives.  
2. Event: server enqueues `TRANSCODE {asset_id} -> 1080p_proxy`.  
3. Worker: downloads high-res chunks, reconstructs temp, runs FFmpeg (e.g., `prores_ks` 1080p), chunks proxy, stores as variant.

### Asset Variant Database
Schema addition:
```sql
CREATE TABLE asset_variants (
    id UUID PRIMARY KEY,
    parent_asset_id UUID,
    variant_type TEXT,    -- e.g., 'proxy_1080p', 'proxy_720p', 'thumbnail'
    chunk_hash_list JSONB
);
```

### Smart Checkout
`dits checkout --resolution proxy`:
1. Client requests manifests.  
2. Server looks for `proxy_1080p` variant; if present, returns proxy chunk list; else fallback to original.  
3. Path remains stable for NLE; mode toggles which chunk set is served.

---

## Implementation Sprints
### Sprint 1: FFmpeg Worker (Factory)
Rust worker consumes queue jobs, reconstructs source, runs FFmpeg:
- Scale to 1080p, intra codec (ProRes proxy), preserve audio.
- Chunk proxy and register variant.

### Sprint 2: Proxy Awareness (Timecode Safe)
- Copy timecode/metadata: `-map_metadata 0 -timecode_frame_start {start_tc}`.  
- Validation: compare durations; if |Δ| > 1ms, reject proxy and flag failure.

### Sprint 3: Ghost Swap (Client)
- Proxy mode mounts proxy chunks at stable path.  
- Toggle to high-res: flush cache, remap to original chunks; NLE refresh shows full res without path change.

### Sprint 4: Thumbnail Generation
- While transcoding, also emit poster frame JPG and small sprite/WEBM for previews.

---

## Real-World Solutions
### Color Problem (LUTs)
- Detect camera metadata (e.g., S-Log3); apply Rec.709 LUT during proxy generation so editors see correct color while preserving RAW for grading.

### Audio Drift (VFR)
- Detect VFR on ingest; force CFR (`-vsync cf`) before proxy encode; warn user about potential ±1 frame variance.

### Render-on-Demand (Cloud Conform)
- `dits render --target 4k_master`: server/render node pulls originals, applies project XML/EDL, renders final master, and stores as new asset.

---

## Phase 6 Verification Tests
- Timecode Match: proxy start TC matches source (`01:00:00:00` etc.).  
- Hot Swap: proxy checkout then switch to high; NLE path unchanged, media sharpens, no “media missing”.  
- Partial Download: proxy checkout on slow Wi-Fi downloads ~1% of repo size, project opens successfully.

---

## Immediate Code Action
```bash
# Worker crate
cargo new dits-worker
cd dits-worker
cargo add ffmpeg-next
cargo add serde_json
cargo add tokio
# Ensure system FFmpeg installed (brew/apt)
```
Next: implement a `proxy_generator` using `ffmpeg-next` that preserves timecode, applies LUT when available, and emits a proxy ready for chunking.


