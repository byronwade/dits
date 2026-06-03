# FACR Incremental Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working vertical slice where editing a few source frames re-encodes and re-delivers only the HLS segments covering them, playable in a browser, proving the FACR incremental-streaming thesis.

**Architecture:** A new `apps/cli/src/stream/` module sits on top of the existing FACR frame store and diff. Real video is ingested into content-addressed PNG frames (`facr::video::ingest_video`). A frame→segment layout maps frames to fixed-duration segments; each segment is encoded as an **independent** MPEG-TS file via FFmpeg (so every segment is self-contained and spliceable). A frame-native re-grade produces v2; the incremental planner reuses unchanged segments byte-for-byte (identical hash) and re-encodes only changed ones. An axum origin serves content-addressed segments and a hls.js player page.

**Tech Stack:** Rust, FFmpeg/ffprobe (shell), BLAKE3 (`core::hash::Hash`), `axum 0.7` + `tower-http` (already deps), hls.js (CDN in the player page). No new crates.

**Key existing interfaces (verified):**
- `facr::store::FrameStore::{new(&Path)->io::Result<Self>, store_frame(&[u8])->io::Result<Hash>, load_frame(&Hash)->io::Result<Vec<u8>>, contains(&Hash)->bool, count()->io::Result<usize>}`
- `facr::manifest::{ClipManifest { width:u32, height:u32, codec:String, timescale:u32, frame_rate:String, frames:Vec<FrameRef> }, FrameRef { hash:Hash, pts:i64, duration:i64 }}`; `ClipManifest::new(w,h,codec,timescale)`, `push_frame`, `len`, `to_json`/`from_json`.
- `facr::diff::{diff_manifests(&ClipManifest,&ClipManifest)->ClipDiff, ClipDiff { added:Vec<FrameRef>, removed:Vec<FrameRef>, shared:usize }}`
- `facr::video::{ingest_video(&Path,&FrameStore)->anyhow::Result<ClipManifest>, check_ffmpeg()->anyhow::Result<()>}` — frames are PNG, `manifest.frame_rate` like `"10/1"`.
- `core::hash::Hash::{to_hex()->String, from_hex(&str), short()->String}`
- Module registration: add to BOTH `apps/cli/src/lib.rs` (`pub mod stream;`) and `apps/cli/src/main.rs` (`mod stream;`), mirroring `facr`.
- CLI: clap `Commands` enum at `apps/cli/src/main.rs:45`, dispatch around `:1194`; command fns re-exported from `apps/cli/src/commands/mod.rs`.

---

### Task 1: Module scaffold + SegmentLayout

**Files:**
- Create: `apps/cli/src/stream/mod.rs`
- Create: `apps/cli/src/stream/layout.rs`
- Modify: `apps/cli/src/lib.rs` (add `pub mod stream;` after `pub mod store;`)
- Modify: `apps/cli/src/main.rs` (add `mod stream;` after `mod store;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/layout.rs`

```rust
//! Maps frame indices to fixed-duration segment indices.

/// Parse an ffmpeg frame-rate string ("30000/1001", "10/1", "25") into fps.
pub fn parse_fps(s: &str) -> f64 {
    match s.split_once('/') {
        Some((n, d)) => {
            let n: f64 = n.trim().parse().unwrap_or(30.0);
            let d: f64 = d.trim().parse().unwrap_or(1.0);
            if d == 0.0 { 30.0 } else { n / d }
        }
        None => s.trim().parse().unwrap_or(30.0),
    }
}

/// Fixed-duration segmentation layout: each segment is `segment_seconds` long.
#[derive(Clone, Debug)]
pub struct SegmentLayout {
    pub fps: f64,
    pub segment_seconds: f64,
}

impl SegmentLayout {
    pub fn new(frame_rate: &str, segment_seconds: f64) -> Self {
        Self { fps: parse_fps(frame_rate), segment_seconds }
    }

    /// Number of frames per segment (at least 1).
    pub fn frames_per_segment(&self) -> usize {
        ((self.fps * self.segment_seconds).round() as usize).max(1)
    }

    /// Total segment count for `frame_count` frames (last segment may be short).
    pub fn segment_count(&self, frame_count: usize) -> usize {
        if frame_count == 0 { return 0; }
        frame_count.div_ceil(self.frames_per_segment())
    }

    /// Which segment a frame belongs to.
    pub fn segment_of_frame(&self, frame_idx: usize) -> usize {
        frame_idx / self.frames_per_segment()
    }

    /// The half-open frame range `[start, end)` covered by a segment, clamped to `frame_count`.
    pub fn frame_range(&self, segment_idx: usize, frame_count: usize) -> std::ops::Range<usize> {
        let fps_seg = self.frames_per_segment();
        let start = (segment_idx * fps_seg).min(frame_count);
        let end = ((segment_idx + 1) * fps_seg).min(frame_count);
        start..end
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_frame_rates() {
        assert_eq!(parse_fps("10/1"), 10.0);
        assert_eq!(parse_fps("25"), 25.0);
        assert!((parse_fps("30000/1001") - 29.97).abs() < 0.01);
        assert_eq!(parse_fps("0/0"), 30.0);
    }

    #[test]
    fn maps_frames_to_segments() {
        // 10 fps, 2s segments => 20 frames/segment.
        let l = SegmentLayout::new("10/1", 2.0);
        assert_eq!(l.frames_per_segment(), 20);
        assert_eq!(l.segment_count(100), 5);
        assert_eq!(l.segment_count(0), 0);
        assert_eq!(l.segment_count(21), 2); // ceil
        assert_eq!(l.segment_of_frame(0), 0);
        assert_eq!(l.segment_of_frame(19), 0);
        assert_eq!(l.segment_of_frame(20), 1);
        assert_eq!(l.segment_of_frame(45), 2);
        assert_eq!(l.frame_range(2, 100), 40..60);
        assert_eq!(l.frame_range(4, 100), 80..100);
        assert_eq!(l.frame_range(4, 95), 80..95); // clamped short tail
    }
}
```

- [ ] **Step 2: Create `apps/cli/src/stream/mod.rs`**

```rust
//! FACR incremental streaming slice: frame-diff-driven HLS that re-encodes and
//! re-delivers only the segments covering changed frames. See
//! `docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md`.

pub mod layout;
```

- [ ] **Step 3: Register the module.** In `apps/cli/src/lib.rs` add `pub mod stream;` after the `pub mod store;` line. In `apps/cli/src/main.rs` add `mod stream;` after the `mod store;` line.

- [ ] **Step 4: Run the tests**

Run: `cargo test -p dits-cli stream::layout 2>&1 | tail -20`
Expected: PASS (2 tests). (If the package name differs, use `cargo test --manifest-path apps/cli/Cargo.toml stream::layout`.)

- [ ] **Step 5: Commit**

```bash
git add apps/cli/src/stream/ apps/cli/src/lib.rs apps/cli/src/main.rs
git commit -m "feat(stream): SegmentLayout frame->segment mapping"
```

---

### Task 2: SegmentOrigin trait + LocalDiskOrigin

**Files:**
- Create: `apps/cli/src/stream/origin.rs`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod origin;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/origin.rs`

```rust
//! Content-addressed segment store/delivery seam. `LocalDiskOrigin` is impl #1;
//! a future QUIC delta-push origin is impl #2 with no upstream rework.

use crate::core::hash::Hash;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// A place segments live, addressed by content hash.
pub trait SegmentOrigin {
    fn has(&self, hash: &Hash) -> bool;
    fn put(&self, hash: &Hash, bytes: &[u8]) -> io::Result<()>;
    fn get(&self, hash: &Hash) -> io::Result<Vec<u8>>;
}

/// Stores segments as files named by hex hash under `root`.
pub struct LocalDiskOrigin {
    root: PathBuf,
}

impl LocalDiskOrigin {
    pub fn new(root: &Path) -> io::Result<Self> {
        fs::create_dir_all(root)?;
        Ok(Self { root: root.to_path_buf() })
    }
    fn path(&self, hash: &Hash) -> PathBuf {
        self.root.join(hash.to_hex())
    }
}

impl SegmentOrigin for LocalDiskOrigin {
    fn has(&self, hash: &Hash) -> bool {
        self.path(hash).exists()
    }
    fn put(&self, hash: &Hash, bytes: &[u8]) -> io::Result<()> {
        let p = self.path(hash);
        if p.exists() { return Ok(()); } // idempotent: content-addressed
        fs::write(p, bytes)
    }
    fn get(&self, hash: &Hash) -> io::Result<Vec<u8>> {
        let bytes = fs::read(self.path(hash))?;
        // Integrity: verify the bytes still hash to the requested address.
        let actual = Hash::from_slice(blake3::hash(&bytes).as_bytes());
        if &actual != hash {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "segment hash mismatch"));
        }
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn put_get_has_roundtrip_and_dedup() {
        let dir = tempfile::tempdir().unwrap();
        let origin = LocalDiskOrigin::new(dir.path()).unwrap();
        let bytes = b"segment-bytes".to_vec();
        let hash = Hash::from_slice(blake3::hash(&bytes).as_bytes());

        assert!(!origin.has(&hash));
        origin.put(&hash, &bytes).unwrap();
        assert!(origin.has(&hash));
        assert_eq!(origin.get(&hash).unwrap(), bytes);

        // Idempotent put does not error.
        origin.put(&hash, &bytes).unwrap();
    }

    #[test]
    fn get_detects_corruption() {
        let dir = tempfile::tempdir().unwrap();
        let origin = LocalDiskOrigin::new(dir.path()).unwrap();
        let hash = Hash::from_slice(blake3::hash(b"real").as_bytes());
        // Write wrong bytes under the hash name.
        std::fs::write(dir.path().join(hash.to_hex()), b"tampered").unwrap();
        assert!(origin.get(&hash).is_err());
    }
}
```

- [ ] **Step 2: Add `pub mod origin;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test -p dits-cli stream::origin 2>&1 | tail -20`
Expected: PASS (2 tests). If `blake3::hash` import errors, confirm `blake3` is a dep (it is) and that `Hash::from_slice` accepts a 32-byte slice (it does).

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): SegmentOrigin trait + LocalDiskOrigin with integrity check"
```

---

### Task 3: StreamVersion + HLS playlist

**Files:**
- Create: `apps/cli/src/stream/playlist.rs`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod playlist;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/playlist.rs`

```rust
//! A streamable version = ordered content-addressed segments + HLS emit.

use crate::core::hash::Hash;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentRef {
    pub index: usize,
    pub hash: Hash,
    /// Segment duration in seconds (for the EXTINF tag).
    pub duration_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct StreamVersion {
    pub width: u32,
    pub height: u32,
    pub segments: Vec<SegmentRef>,
}

impl StreamVersion {
    /// Render an HLS media playlist. Each segment URI is `{seg_url_base}{hex}.ts`,
    /// so unchanged segments across versions share identical URIs (cache hit).
    pub fn to_hls(&self, seg_url_base: &str) -> String {
        let target = self
            .segments
            .iter()
            .map(|s| (s.duration_ms as f64 / 1000.0).ceil() as u64)
            .max()
            .unwrap_or(0);
        let mut out = String::new();
        out.push_str("#EXTM3U\n#EXT-X-VERSION:3\n");
        out.push_str(&format!("#EXT-X-TARGETDURATION:{}\n", target));
        out.push_str("#EXT-X-MEDIA-SEQUENCE:0\n");
        out.push_str("#EXT-X-PLAYLIST-TYPE:VOD\n");
        for s in &self.segments {
            out.push_str(&format!("#EXTINF:{:.3},\n", s.duration_ms as f64 / 1000.0));
            out.push_str(&format!("{}{}.ts\n", seg_url_base, s.hash.to_hex()));
        }
        out.push_str("#EXT-X-ENDLIST\n");
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn h(b: &[u8]) -> Hash { Hash::from_slice(blake3::hash(b).as_bytes()) }

    #[test]
    fn emits_valid_hls_with_content_addressed_uris() {
        let v = StreamVersion {
            width: 160, height: 120,
            segments: vec![
                SegmentRef { index: 0, hash: h(b"a"), duration_ms: 2000 },
                SegmentRef { index: 1, hash: h(b"b"), duration_ms: 1500 },
            ],
        };
        let m3u8 = v.to_hls("/seg/");
        assert!(m3u8.starts_with("#EXTM3U"));
        assert!(m3u8.contains("#EXT-X-TARGETDURATION:2"));
        assert!(m3u8.contains(&format!("/seg/{}.ts", h(b"a").to_hex())));
        assert!(m3u8.contains("#EXTINF:1.500,"));
        assert!(m3u8.trim_end().ends_with("#EXT-X-ENDLIST"));
    }

    #[test]
    fn shared_segments_produce_identical_uris() {
        let s0 = SegmentRef { index: 0, hash: h(b"same"), duration_ms: 2000 };
        let v1 = StreamVersion { width: 1, height: 1, segments: vec![s0.clone()] };
        let v2 = StreamVersion { width: 1, height: 1, segments: vec![s0] };
        // Unchanged segment => identical URI line in both playlists.
        let line = format!("/seg/{}.ts", h(b"same").to_hex());
        assert!(v1.to_hls("/seg/").contains(&line));
        assert!(v2.to_hls("/seg/").contains(&line));
    }
}
```

- [ ] **Step 2: Add `pub mod playlist;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test -p dits-cli stream::playlist 2>&1 | tail -20`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): StreamVersion + content-addressed HLS playlist"
```

---

### Task 4: Per-segment FFmpeg encoder

**Files:**
- Create: `apps/cli/src/stream/encode.rs`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod encode;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/encode.rs`

```rust
//! Encode a contiguous run of PNG frames into ONE self-contained MPEG-TS segment.
//! Encoding each segment independently makes every segment start on an IDR and be
//! spliceable, with no cross-segment prediction — exactly what HLS wants.

use anyhow::{bail, Context, Result};
use std::io::Write;
use std::path::Path;
use std::process::Command;

/// Encode the given ordered PNG frame blobs into a single `.ts` segment, returned as bytes.
/// `frame_rate` is the ffmpeg fraction string from the manifest (e.g. "10/1").
pub fn encode_segment(frame_pngs: &[Vec<u8>], frame_rate: &str) -> Result<Vec<u8>> {
    if frame_pngs.is_empty() {
        bail!("cannot encode an empty segment");
    }
    let work = std::env::temp_dir().join(format!("dits-stream-seg-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create segment temp dir")?;

    for (i, png) in frame_pngs.iter().enumerate() {
        let mut f = std::fs::File::create(work.join(format!("f_{:08}.png", i)))
            .context("write frame png")?;
        f.write_all(png).context("write frame bytes")?;
    }

    let pattern = work.join("f_%08d.png");
    let out_path = work.join("seg.ts");
    let status = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-framerate", frame_rate, "-start_number", "0", "-i"])
        .arg(&pattern)
        .args([
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-sc_threshold", "0", "-an", "-f", "mpegts",
        ])
        .arg(&out_path)
        .output()
        .context("running ffmpeg segment encode")?;
    if !status.status.success() {
        let _ = std::fs::remove_dir_all(&work);
        bail!("ffmpeg segment encode failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    let bytes = std::fs::read(&out_path).context("read encoded segment")?;
    let _ = std::fs::remove_dir_all(&work);
    Ok(bytes)
}

/// Probe a `.ts` blob: returns true if ffprobe reads it as a playable video stream.
#[cfg(test)]
pub fn probe_ts_is_video(ts: &[u8]) -> bool {
    let tmp = std::env::temp_dir().join(format!("dits-probe-{}.ts", uuid::Uuid::new_v4()));
    if std::fs::write(&tmp, ts).is_err() { return false; }
    let ok = Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0",
               "-show_entries", "stream=codec_type", "-of", "csv=p=0"])
        .arg(&tmp)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("video"))
        .unwrap_or(false);
    let _ = std::fs::remove_file(&tmp);
    ok
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ffmpeg_available() -> bool {
        Command::new("ffmpeg").arg("-version").output().map(|o| o.status.success()).unwrap_or(false)
    }

    /// Make N tiny distinct PNG frames via ffmpeg testsrc.
    fn make_png_frames(n: usize) -> Vec<Vec<u8>> {
        let dir = std::env::temp_dir().join(format!("dits-mk-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let pat = dir.join("f_%08d.png");
        Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "lavfi", "-i",
                   &format!("testsrc=duration={}:size=64x48:rate=10", (n as f64 / 10.0).max(0.1)),
                   "-frames:v", &n.to_string()])
            .arg(&pat).status().unwrap();
        let mut frames: Vec<_> = std::fs::read_dir(&dir).unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
            .collect();
        frames.sort();
        let out = frames.iter().map(|p| std::fs::read(p).unwrap()).collect();
        let _ = std::fs::remove_dir_all(&dir);
        out
    }

    #[test]
    fn encodes_frames_into_a_playable_ts_segment() {
        if !ffmpeg_available() { eprintln!("skipping: no ffmpeg"); return; }
        let frames = make_png_frames(20);
        assert_eq!(frames.len(), 20);
        let ts = encode_segment(&frames, "10/1").unwrap();
        assert!(!ts.is_empty());
        assert!(probe_ts_is_video(&ts), "encoded segment should be a playable video");
    }

    #[test]
    fn empty_segment_errors() {
        assert!(encode_segment(&[], "10/1").is_err());
    }
}
```

- [ ] **Step 2: Add `pub mod encode;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test -p dits-cli stream::encode 2>&1 | tail -20`
Expected: PASS (2 tests). The encode test actually shells out to ffmpeg.

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): per-segment independent MPEG-TS encoder"
```

---

### Task 5: Frame-native re-grade edit

**Files:**
- Create: `apps/cli/src/stream/edit.rs`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod edit;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/edit.rs`

```rust
//! Frame-native edit: re-grade (brightness) a contiguous frame range, producing a
//! new manifest where ONLY those frames have new content hashes. This is the move
//! that dodges the "re-export re-quantizes everything" problem.

use crate::core::hash::Hash;
use crate::facr::manifest::{ClipManifest, FrameRef};
use crate::facr::store::FrameStore;
use anyhow::{bail, Context, Result};
use std::ops::Range;
use std::process::Command;

/// Apply a brightness delta (`-1.0..=1.0`, e.g. 0.2) to frames in `range`, store the
/// new PNGs, and return a manifest identical to `base` except those frames point at
/// new hashes. Frames outside `range` keep their original `FrameRef` (same hash).
pub fn regrade_range(
    base: &ClipManifest,
    store: &FrameStore,
    range: Range<usize>,
    brightness: f32,
) -> Result<ClipManifest> {
    if range.end > base.frames.len() {
        bail!("edit range {:?} out of bounds (clip has {} frames)", range, base.frames.len());
    }
    let mut out = base.clone();
    for idx in range {
        let src_png = store
            .load_frame(&base.frames[idx].hash)
            .with_context(|| format!("load frame {idx}"))?;
        let new_png = brighten_png(&src_png, brightness)?;
        let new_hash: Hash = store.store_frame(&new_png).context("store regraded frame")?;
        out.frames[idx] = FrameRef { hash: new_hash, ..base.frames[idx] };
    }
    Ok(out)
}

/// Brighten a single PNG via ffmpeg's `eq` filter; returns new PNG bytes (deterministic).
fn brighten_png(png: &[u8], brightness: f32) -> Result<Vec<u8>> {
    let dir = std::env::temp_dir().join(format!("dits-grade-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).context("grade temp dir")?;
    let in_p = dir.join("in.png");
    let out_p = dir.join("out.png");
    std::fs::write(&in_p, png).context("write input png")?;
    let status = Command::new("ffmpeg")
        .args(["-v", "error", "-y", "-i"])
        .arg(&in_p)
        .args(["-vf", &format!("eq=brightness={brightness}")])
        .arg(&out_p)
        .output()
        .context("running ffmpeg eq")?;
    if !status.status.success() {
        let _ = std::fs::remove_dir_all(&dir);
        bail!("ffmpeg eq failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    let bytes = std::fs::read(&out_p).context("read graded png")?;
    let _ = std::fs::remove_dir_all(&dir);
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::facr::diff::diff_manifests;
    use crate::facr::video::{check_ffmpeg, ingest_video};
    use std::path::Path;

    fn make_test_video(path: &Path) -> bool {
        Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "lavfi", "-i",
                   "testsrc=duration=10:size=64x48:rate=10", "-pix_fmt", "yuv420p"])
            .arg(path).status().map(|s| s.success()).unwrap_or(false)
    }

    #[test]
    fn regrade_changes_only_the_targeted_frames() {
        if check_ffmpeg().is_err() { eprintln!("skipping: no ffmpeg"); return; }
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.mp4");
        assert!(make_test_video(&video));
        let store = FrameStore::new(&dir.path().join("store")).unwrap();
        let v1 = ingest_video(&video, &store).unwrap();
        assert!(v1.frames.len() >= 90, "got {}", v1.frames.len());

        let v2 = regrade_range(&v1, &store, 40..60, 0.3).unwrap();
        // Same length, same frames outside the range.
        assert_eq!(v2.frames.len(), v1.frames.len());
        assert_eq!(v2.frames[0], v1.frames[0]);
        assert_eq!(v2.frames[39], v1.frames[39]);
        assert_eq!(v2.frames[60], v1.frames[60]);
        // Frames inside the range changed hash.
        assert_ne!(v2.frames[40], v1.frames[40]);
        assert_ne!(v2.frames[59], v1.frames[59]);

        // Diff sees a small number of changed frames (<= range size; testsrc frames are distinct).
        let d = diff_manifests(&v1, &v2);
        assert!(d.added.len() <= 20, "added {} frames", d.added.len());
        assert!(d.added.len() >= 1);
    }

    #[test]
    fn out_of_bounds_range_errors() {
        let store_dir = tempfile::tempdir().unwrap();
        let store = FrameStore::new(store_dir.path()).unwrap();
        let m = ClipManifest::new(8, 8, "png", 1);
        assert!(regrade_range(&m, &store, 0..5, 0.2).is_err());
    }
}
```

- [ ] **Step 2: Add `pub mod edit;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test -p dits-cli stream::edit 2>&1 | tail -20`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): frame-native re-grade edit (clean diff)"
```

---

### Task 6: Incremental planner + builder

**Files:**
- Create: `apps/cli/src/stream/incremental.rs`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod incremental;`)

- [ ] **Step 1: Write the failing test** in `apps/cli/src/stream/incremental.rs`

```rust
//! The brain: from two manifests, decide which segments to reuse vs re-encode,
//! then build both StreamVersions, reusing v1 segment bytes byte-for-byte.

use crate::core::hash::Hash;
use crate::facr::manifest::ClipManifest;
use crate::facr::store::FrameStore;
use crate::stream::encode::encode_segment;
use crate::stream::layout::SegmentLayout;
use crate::stream::origin::SegmentOrigin;
use crate::stream::playlist::{SegmentRef, StreamVersion};
use anyhow::{Context, Result};
use std::collections::BTreeSet;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IncrementalPlan {
    pub reused: Vec<usize>,
    pub reencoded: Vec<usize>,
}

/// Determine which segment indices changed between v1 and v2 by mapping changed
/// frame indices (different hash at the same position) through the layout.
pub fn plan(v1: &ClipManifest, v2: &ClipManifest, layout: &SegmentLayout) -> IncrementalPlan {
    let frame_count = v2.frames.len();
    let seg_count = layout.segment_count(frame_count);
    let mut changed: BTreeSet<usize> = BTreeSet::new();

    let common = v1.frames.len().min(v2.frames.len());
    for i in 0..common {
        if v1.frames[i].hash != v2.frames[i].hash {
            changed.insert(layout.segment_of_frame(i));
        }
    }
    // Any frames added/removed past the common prefix mark their segments changed.
    for i in common..frame_count {
        changed.insert(layout.segment_of_frame(i));
    }

    let mut reused = Vec::new();
    let mut reencoded = Vec::new();
    for s in 0..seg_count {
        if changed.contains(&s) { reencoded.push(s); } else { reused.push(s); }
    }
    IncrementalPlan { reused, reencoded }
}

/// Encode every segment of `manifest` fresh (the v1 build, and the naive baseline).
pub fn build_full(
    manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
) -> Result<StreamVersion> {
    let n = manifest.frames.len();
    let seg_count = layout.segment_count(n);
    let mut segments = Vec::with_capacity(seg_count);
    for s in 0..seg_count {
        let range = layout.frame_range(s, n);
        let (hash, dur) = encode_and_store(manifest, store, &range, origin)?;
        segments.push(SegmentRef { index: s, hash, duration_ms: dur });
    }
    Ok(StreamVersion { width: manifest.width, height: manifest.height, segments })
}

/// Build v2 incrementally: reuse v1's SegmentRefs for unchanged segments (bytes already
/// in `origin`); encode only the changed segments from v2's frames.
pub fn build_incremental(
    v1_version: &StreamVersion,
    v2_manifest: &ClipManifest,
    store: &FrameStore,
    layout: &SegmentLayout,
    origin: &dyn SegmentOrigin,
    plan: &IncrementalPlan,
) -> Result<StreamVersion> {
    let n = v2_manifest.frames.len();
    let seg_count = layout.segment_count(n);
    let mut segments = Vec::with_capacity(seg_count);
    for s in 0..seg_count {
        if plan.reused.contains(&s) {
            // Reuse v1's exact segment (same hash => already served, zero re-transfer).
            let reused = v1_version.segments.iter().find(|r| r.index == s)
                .with_context(|| format!("reused segment {s} missing from v1"))?;
            segments.push(reused.clone());
        } else {
            let range = layout.frame_range(s, n);
            let (hash, dur) = encode_and_store(v2_manifest, store, &range, origin)?;
            segments.push(SegmentRef { index: s, hash, duration_ms: dur });
        }
    }
    Ok(StreamVersion { width: v2_manifest.width, height: v2_manifest.height, segments })
}

fn encode_and_store(
    manifest: &ClipManifest,
    store: &FrameStore,
    range: &std::ops::Range<usize>,
    origin: &dyn SegmentOrigin,
) -> Result<(Hash, u64)> {
    let mut pngs = Vec::with_capacity(range.len());
    for i in range.clone() {
        pngs.push(store.load_frame(&manifest.frames[i].hash)
            .with_context(|| format!("load frame {i}"))?);
    }
    let ts = encode_segment(&pngs, &manifest.frame_rate)?;
    let hash = Hash::from_slice(blake3::hash(&ts).as_bytes());
    origin.put(&hash, &ts).context("put segment to origin")?;
    let fps = crate::stream::layout::parse_fps(&manifest.frame_rate);
    let dur_ms = ((range.len() as f64 / fps) * 1000.0).round() as u64;
    Ok((hash, dur_ms))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::facr::manifest::FrameRef;

    fn manifest_with_hashes(hashes: &[&[u8]]) -> ClipManifest {
        let mut m = ClipManifest::new(64, 48, "png", 1);
        m.frame_rate = "10/1".to_string();
        for (i, b) in hashes.iter().enumerate() {
            m.push_frame(FrameRef {
                hash: Hash::from_slice(blake3::hash(b).as_bytes()),
                pts: i as i64, duration: 1,
            });
        }
        m
    }

    #[test]
    fn plan_marks_only_segments_with_changed_frames() {
        // 40 frames, 10fps, 2s => 20 frames/seg => 2 segments.
        let labels: Vec<Vec<u8>> = (0..40).map(|i| format!("f{i}").into_bytes()).collect();
        let refs: Vec<&[u8]> = labels.iter().map(|v| v.as_slice()).collect();
        let v1 = manifest_with_hashes(&refs);

        // Change frame 25 only (segment 1).
        let mut v2 = v1.clone();
        v2.frames[25].hash = Hash::from_slice(blake3::hash(b"changed").as_bytes());

        let layout = SegmentLayout::new("10/1", 2.0);
        let p = plan(&v1, &v2, &layout);
        assert_eq!(p.reused, vec![0]);
        assert_eq!(p.reencoded, vec![1]);
    }

    #[test]
    fn identical_manifests_reuse_everything() {
        let labels: Vec<Vec<u8>> = (0..40).map(|i| format!("f{i}").into_bytes()).collect();
        let refs: Vec<&[u8]> = labels.iter().map(|v| v.as_slice()).collect();
        let v1 = manifest_with_hashes(&refs);
        let layout = SegmentLayout::new("10/1", 2.0);
        let p = plan(&v1, &v1, &layout);
        assert_eq!(p.reencoded, Vec::<usize>::new());
        assert_eq!(p.reused, vec![0, 1]);
    }
}
```

- [ ] **Step 2: Add `pub mod incremental;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test -p dits-cli stream::incremental 2>&1 | tail -20`
Expected: PASS (2 tests — these are pure planner tests, no ffmpeg).

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): incremental planner + reuse/re-encode builder"
```

---

### Task 7: axum origin server + hls.js player page

**Files:**
- Create: `apps/cli/src/stream/serve.rs`
- Create: `apps/cli/src/stream/web/player.html`
- Modify: `apps/cli/src/stream/mod.rs` (add `pub mod serve;`)

- [ ] **Step 1: Create the player page** `apps/cli/src/stream/web/player.html`

```html
<!doctype html>
<html><head><meta charset="utf-8"><title>FACR Incremental Streaming</title>
<style>
 body{font:14px ui-monospace,monospace;background:#0b0d10;color:#e6e6e6;margin:0;padding:24px}
 video{width:640px;max-width:100%;background:#000;border-radius:8px}
 .row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
 .panel{background:#14181d;border:1px solid #232a31;border-radius:8px;padding:16px;min-width:280px}
 button{font:inherit;background:#1f6feb;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;margin-right:8px}
 h1{font-size:18px} .big{font-size:28px;color:#3fb950} .dim{color:#8b949e}
 table{border-collapse:collapse} td{padding:2px 10px 2px 0}
</style></head><body>
<h1>FACR — incremental streaming proof</h1>
<div class="row">
 <div>
  <video id="v" controls></video>
  <div style="margin-top:12px">
   <button onclick="load('v1')">Play v1 (original)</button>
   <button onclick="load('v2')">Play v2 (re-graded 4–6s)</button>
  </div>
 </div>
 <div class="panel">
  <div class="dim">v2 vs v1 delivery</div>
  <div class="big" id="reuse">—</div>
  <table id="stats"></table>
 </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
<script>
let hls;
function load(v){
  const url='/v/'+v+'.m3u8';
  const video=document.getElementById('v');
  if(hls){hls.destroy();}
  if(Hls.isSupported()){hls=new Hls();hls.loadSource(url);hls.attachMedia(video);video.play();}
  else{video.src=url;video.play();}
}
fetch('/stats').then(r=>r.json()).then(s=>{
  document.getElementById('reuse').textContent=s.reuse_pct.toFixed(1)+'% reused';
  document.getElementById('stats').innerHTML=
   `<tr><td>segments total</td><td>${s.total}</td></tr>`+
   `<tr><td>re-encoded</td><td>${s.reencoded}</td></tr>`+
   `<tr><td>reused (0 transfer)</td><td>${s.reused}</td></tr>`+
   `<tr><td>bytes re-delivered</td><td>${(s.bytes_reencoded/1024).toFixed(1)} KB</td></tr>`+
   `<tr><td>naive (full re-encode)</td><td>${(s.bytes_total/1024).toFixed(1)} KB</td></tr>`;
});
load('v1');
</script></body></html>
```

- [ ] **Step 2: Write the server** `apps/cli/src/stream/serve.rs`

```rust
//! Tiny axum origin: serves content-addressed `.ts` segments, the two playlists,
//! a stats JSON, and the hls.js player page. Blocks until Ctrl-C.

use crate::stream::origin::SegmentOrigin;
use crate::stream::playlist::StreamVersion;
use anyhow::Result;
use axum::{
    extract::{Path as AxPath, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use serde_json::json;
use std::sync::Arc;

pub struct ServeState {
    pub v1: StreamVersion,
    pub v2: StreamVersion,
    pub origin: Box<dyn SegmentOrigin + Send + Sync>,
    pub bytes_total: u64,     // naive: all v2 segments
    pub bytes_reencoded: u64, // incremental: only changed v2 segments
}

pub async fn serve(state: ServeState, port: u16) -> Result<()> {
    let shared = Arc::new(state);
    let app = Router::new()
        .route("/", get(|| async { Html(include_str!("web/player.html")) }))
        .route("/v/:name", get(playlist))
        .route("/seg/:name", get(segment))
        .route("/stats", get(stats))
        .with_state(shared);
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    println!("\n  ▶  open http://127.0.0.1:{port}/  (Ctrl-C to stop)\n");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn playlist(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    let v = match name.trim_end_matches(".m3u8") {
        "v1" => &s.v1,
        "v2" => &s.v2,
        _ => return (StatusCode::NOT_FOUND, "no such version").into_response(),
    };
    let body = v.to_hls("/seg/");
    ([(header::CONTENT_TYPE, "application/vnd.apple.mpegurl")], body).into_response()
}

async fn segment(State(s): State<Arc<ServeState>>, AxPath(name): AxPath<String>) -> impl IntoResponse {
    let hex = name.trim_end_matches(".ts");
    let hash = match crate::core::hash::Hash::from_hex(hex) {
        Ok(h) => h,
        Err(_) => return (StatusCode::BAD_REQUEST, "bad hash").into_response(),
    };
    match s.origin.get(&hash) {
        Ok(bytes) => ([(header::CONTENT_TYPE, "video/mp2t")], bytes).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "no such segment").into_response(),
    }
}

async fn stats(State(s): State<Arc<ServeState>>) -> impl IntoResponse {
    let total = s.v2.segments.len();
    // Reused = segments in v2 whose hash also appears in v1.
    let v1_hashes: std::collections::HashSet<_> = s.v1.segments.iter().map(|r| r.hash).collect();
    let reused = s.v2.segments.iter().filter(|r| v1_hashes.contains(&r.hash)).count();
    let reencoded = total - reused;
    let reuse_pct = if total == 0 { 0.0 } else { reused as f64 / total as f64 * 100.0 };
    Json(json!({
        "total": total, "reused": reused, "reencoded": reencoded,
        "reuse_pct": reuse_pct,
        "bytes_total": s.bytes_total, "bytes_reencoded": s.bytes_reencoded,
    }))
}
```

- [ ] **Step 3: Add `pub mod serve;`** to `apps/cli/src/stream/mod.rs`.

- [ ] **Step 4: Verify it compiles**

Run: `cargo build -p dits-cli 2>&1 | tail -20`
Expected: builds. If `include_str!("web/player.html")` path errors, confirm the file is at `apps/cli/src/stream/web/player.html` (relative to `serve.rs`). If axum `:param` syntax errors, this repo's axum is 0.7 which uses `/:name` (correct here); do not use the 0.8 `{name}` form.

- [ ] **Step 5: Commit**

```bash
git add apps/cli/src/stream/
git commit -m "feat(stream): axum content-addressed origin + hls.js player"
```

---

### Task 8: `stream-demo` command + wiring + end-to-end verification

**Files:**
- Create: `apps/cli/src/commands/stream_demo.rs`
- Modify: `apps/cli/src/commands/mod.rs` (declare + re-export)
- Modify: `apps/cli/src/main.rs` (clap variant + dispatch)

- [ ] **Step 1: Write the command** `apps/cli/src/commands/stream_demo.rs`

```rust
//! `dits stream-demo` — end-to-end FACR incremental-streaming proof.
//!
//! Ingests (or generates) a short clip, builds v1 HLS, re-grades a time window to make
//! v2, rebuilds v2 reusing unchanged segments, prints the headline, and serves a browser
//! player. See docs/superpowers/specs/2026-06-02-facr-incremental-streaming-slice-design.md.

use crate::facr::store::FrameStore;
use crate::facr::video::{check_ffmpeg, ingest_video};
use crate::stream::incremental::{build_full, build_incremental, plan};
use crate::stream::layout::SegmentLayout;
use crate::stream::origin::{LocalDiskOrigin, SegmentOrigin};
use crate::stream::serve::{serve, ServeState};
use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::Command;

pub fn stream_demo(
    input: Option<PathBuf>,
    grade_start: f64,
    grade_end: f64,
    segment_seconds: f64,
    port: u16,
) -> Result<()> {
    check_ffmpeg().context("FFmpeg is required for stream-demo")?;
    let work = std::env::temp_dir().join(format!("dits-stream-demo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work)?;
    let store = FrameStore::new(&work.join("frames"))?;
    let origin = LocalDiskOrigin::new(&work.join("origin"))?;

    // 1. Source clip (generate a 10s testsrc if none given).
    let video = match input {
        Some(p) => p,
        None => {
            let p = work.join("source.mp4");
            let ok = Command::new("ffmpeg")
                .args(["-v", "error", "-y", "-f", "lavfi", "-i",
                       "testsrc=duration=10:size=320x240:rate=10", "-pix_fmt", "yuv420p"])
                .arg(&p).status().map(|s| s.success()).unwrap_or(false);
            anyhow::ensure!(ok, "failed to generate test clip");
            p
        }
    };

    // 2. Ingest -> v1 manifest -> v1 HLS.
    let v1m = ingest_video(&video, &store).context("ingest video")?;
    let layout = SegmentLayout::new(&v1m.frame_rate, segment_seconds);
    println!("ingested {} frames @ {} fps -> {} segments",
        v1m.frames.len(), layout.fps, layout.segment_count(v1m.frames.len()));
    let v1 = build_full(&v1m, &store, &layout, &origin)?;

    // 3. Re-grade [grade_start, grade_end) seconds -> v2 manifest.
    let fps = layout.fps;
    let r = ((grade_start * fps).round() as usize)..((grade_end * fps).round() as usize).min(v1m.frames.len());
    println!("re-grading frames {:?} ({}s–{}s)", r, grade_start, grade_end);
    let v2m = crate::stream::edit::regrade_range(&v1m, &store, r, 0.3)?;

    // 4. Plan + build v2 incrementally.
    let p = plan(&v1m, &v2m, &layout);
    let v2 = build_incremental(&v1, &v2m, &store, &layout, &origin, &p)?;

    // 5. Byte accounting: naive (all v2 segs) vs incremental (only re-encoded).
    let bytes_total: u64 = v2.segments.iter()
        .map(|s| origin.get(&s.hash).map(|b| b.len() as u64).unwrap_or(0)).sum();
    let bytes_reencoded: u64 = v2.segments.iter()
        .filter(|s| p.reencoded.contains(&s.index))
        .map(|s| origin.get(&s.hash).map(|b| b.len() as u64).unwrap_or(0)).sum();
    let total = v2.segments.len();
    let reuse_pct = if total == 0 { 0.0 } else { p.reused.len() as f64 / total as f64 * 100.0 };

    println!("\n  ── FACR incremental result ──");
    println!("  segments total : {total}");
    println!("  re-encoded     : {} ({:?})", p.reencoded.len(), p.reencoded);
    println!("  reused (0 xfer): {} ({:.1}% reused)", p.reused.len(), reuse_pct);
    println!("  re-delivered   : {:.1} KB   (naive full re-encode: {:.1} KB)",
        bytes_reencoded as f64 / 1024.0, bytes_total as f64 / 1024.0);

    // 6. Serve the browser proof.
    let state = ServeState {
        v1, v2,
        origin: Box::new(origin),
        bytes_total, bytes_reencoded,
    };
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(serve(state, port))?;
    Ok(())
}
```

- [ ] **Step 2: Register the command function.** In `apps/cli/src/commands/mod.rs`, add `pub mod stream_demo;` near `pub mod facr_demo;`, and `pub use stream_demo::stream_demo;` near `pub use facr_demo::facr_demo;`.

- [ ] **Step 3: Add the clap variant.** In `apps/cli/src/main.rs`, inside the `Commands` enum (after the `FacrTrim {...}` variant), add:

```rust
    /// End-to-end FACR incremental-streaming proof: ingest, re-grade a time window,
    /// re-encode only changed HLS segments, and serve a browser player (requires FFmpeg)
    #[command(name = "stream-demo")]
    StreamDemo {
        /// Input video (default: generate a 10s test clip)
        #[arg(long)]
        input: Option<std::path::PathBuf>,
        /// Re-grade window start, seconds
        #[arg(long, default_value = "4.0")]
        grade_start: f64,
        /// Re-grade window end, seconds
        #[arg(long, default_value = "6.0")]
        grade_end: f64,
        /// Segment duration, seconds
        #[arg(long, default_value = "2.0")]
        segment_seconds: f64,
        /// HTTP port for the player
        #[arg(long, default_value = "8088")]
        port: u16,
    },
```

- [ ] **Step 4: Add the dispatch arm.** In `apps/cli/src/main.rs`, next to `Commands::FacrDemo { .. } => ...` in the dispatch `match` (around line 1194), add:

```rust
        Commands::StreamDemo { input, grade_start, grade_end, segment_seconds, port } =>
            commands::stream_demo(input, grade_start, grade_end, segment_seconds, port),
```

Also add a name arm near line 1076 if that `match` is exhaustive over command names:

```rust
        Commands::StreamDemo { .. } => "stream-demo",
```

- [ ] **Step 5: Build**

Run: `cargo build -p dits-cli 2>&1 | tail -25`
Expected: builds cleanly. Fix any unused-import warnings flagged as errors.

- [ ] **Step 6: Full test suite**

Run: `cargo test -p dits-cli stream 2>&1 | tail -30`
Expected: all `stream::*` tests pass.

- [ ] **Step 7: Manual end-to-end verification**

Run: `cargo run -p dits-cli -- stream-demo`
Expected console output similar to:
```
ingested 100 frames @ 10 fps -> 5 segments
re-grading frames 40..60 (4s–6s)

  ── FACR incremental result ──
  segments total : 5
  re-encoded     : 1 ([2])
  reused (0 xfer): 4 (80.0% reused)
  re-delivered   : XX.X KB   (naive full re-encode: YYY.Y KB)

  ▶  open http://127.0.0.1:8088/
```
Open the URL: v1 and v2 both play in the browser; the panel shows `80.0% reused`. Confirm `re-encoded` == the segment(s) overlapping 4–6s and `reused` == the rest. Ctrl-C to stop.

- [ ] **Step 8: Commit**

```bash
git add apps/cli/src/commands/ apps/cli/src/main.rs
git commit -m "feat(stream): stream-demo command — end-to-end incremental streaming proof"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** edit (T5), encode (T4), incremental plan/apply (T6), origin seam (T2), playlist (T3), serve+player (T7), command/wiring (T8), layout (T1). Strawman control is demonstrated by the byte-accounting headline (naive vs incremental) in T8 rather than a separate test, keeping the slice focused (YAGNI).
- **Refinement vs spec:** spec sketched `encode_segment(frames: &[RawFrame])`; reality is PNG frame bytes (from `ingest_video`), so the encoder takes `&[Vec<u8>]` PNG blobs and segments are independent TS files (auto-IDR), which is simpler and equally correct. The spec's `SegmentLayout` lives in its own `layout.rs` rather than `encode.rs` so it is unit-testable without FFmpeg.
- **Type consistency:** `SegmentRef`/`StreamVersion`/`IncrementalPlan`/`SegmentLayout`/`SegmentOrigin` names are used identically across T2–T8. `Hash::from_slice(blake3::hash(..).as_bytes())` is the segment-hash idiom throughout.
- **axum version:** routes use 0.7 `/:name` param syntax (matches the repo's `axum 0.7`).
```
