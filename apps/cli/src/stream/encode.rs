//! Encode a contiguous run of PNG frames into ONE self-contained CMAF (fragmented-MP4)
//! segment: a shared init (`ftyp`+`moov`) plus a media fragment (`moof`+`mdat`…).
//!
//! Each segment is encoded independently, so its media fragment carries
//! `baseMediaDecodeTime = 0` — i.e. the bytes depend only on the frames, not on the
//! segment's position. That keeps segments content-addressable and reusable by hash; the
//! playlist marks seams with `#EXT-X-DISCONTINUITY` so the player re-bases each fragment.
//! Unlike MPEG-TS, fMP4 has no continuity counters, so there is no seam corruption.

use anyhow::{bail, Context, Result};
use std::io::Write;
use std::process::Command;

/// A CMAF segment split into its shared init and its per-segment media fragment.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CmafSegment {
    /// `ftyp`+`moov` — codec config; identical across same-resolution encodes, so shared.
    pub init: Vec<u8>,
    /// `moof`+`mdat`(+`mfra`) — the actual samples; content-addressed, position-independent.
    pub media: Vec<u8>,
}

/// How to encode a delivery rendition: optional downscale height, and either a target bitrate or a
/// fixed CRF (quality). `crf` wins when set; otherwise `bitrate_kbps` applies; otherwise libx264's
/// default. `source()` reproduces the pre-ABR encode exactly.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EncodeProfile {
    pub height: Option<u32>,
    pub bitrate_kbps: Option<u32>,
    pub crf: Option<u32>,
}

impl EncodeProfile {
    pub fn source() -> Self {
        EncodeProfile { height: None, bitrate_kbps: None, crf: None }
    }
    /// A CRF (quality) profile at the given height (None = source resolution).
    pub fn with_crf(height: Option<u32>, crf: u32) -> Self {
        EncodeProfile { height, bitrate_kbps: None, crf: Some(crf) }
    }
}

/// Encode the given ordered frame blobs into one CMAF segment. `frame_rate` is the ffmpeg
/// fraction string from the manifest (e.g. "10/1"); `frame_ext` is the frames' image format
/// extension ("png" or "jxl") so ffmpeg decodes them correctly.
pub fn encode_cmaf_segment(
    frame_blobs: &[Vec<u8>],
    frame_rate: &str,
    frame_ext: &str,
    profile: &EncodeProfile,
) -> Result<CmafSegment> {
    if frame_blobs.is_empty() {
        bail!("cannot encode an empty segment");
    }
    let work = std::env::temp_dir().join(format!("dits-stream-cmaf-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&work).context("create segment temp dir")?;

    for (i, blob) in frame_blobs.iter().enumerate() {
        let mut f = std::fs::File::create(work.join(format!("f_{:08}.{frame_ext}", i)))
            .context("write frame image")?;
        f.write_all(blob).context("write frame bytes")?;
    }

    let pattern = work.join(format!("f_%08d.{frame_ext}"));
    let out_path = work.join("seg.mp4");
    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-v", "error", "-y", "-framerate", frame_rate, "-start_number", "0", "-i"])
        .arg(&pattern);
    // Optional downscale (even width, preserving aspect) for an ABR rung.
    if let Some(h) = profile.height {
        cmd.args(["-vf", &format!("scale=-2:{h}")]);
    }
    cmd.args(["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-sc_threshold", "0", "-an"]);
    // CRF (quality) wins when set; otherwise an optional target bitrate.
    if let Some(crf) = profile.crf {
        cmd.args(["-crf", &crf.to_string()]);
    } else if let Some(kbps) = profile.bitrate_kbps {
        cmd.args([
            "-b:v", &format!("{kbps}k"),
            "-maxrate", &format!("{kbps}k"),
            "-bufsize", &format!("{}k", kbps * 2),
        ]);
    }
    cmd.args(["-movflags", "+empty_moov+frag_keyframe+default_base_moof", "-f", "mp4"]);
    let status = cmd
        .arg(&out_path)
        .output()
        .context("running ffmpeg cmaf encode")?;
    if !status.status.success() {
        let _ = std::fs::remove_dir_all(&work);
        bail!("ffmpeg cmaf encode failed: {}", String::from_utf8_lossy(&status.stderr));
    }
    let bytes = std::fs::read(&out_path).context("read encoded segment")?;
    let _ = std::fs::remove_dir_all(&work);
    split_fmp4(&bytes)
}

/// Split a fragmented-MP4 byte stream into `(init, media)` at the first `moof` box.
/// Init = everything before the first `moof` (`ftyp`+`moov`); media = first `moof` to EOF.
pub fn split_fmp4(bytes: &[u8]) -> Result<CmafSegment> {
    let mut off = 0usize;
    let mut first_moof: Option<usize> = None;
    let mut saw_ftyp = false;
    while off + 8 <= bytes.len() {
        let size = u32::from_be_bytes([bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]]) as usize;
        let typ = &bytes[off + 4..off + 8];
        if typ == b"ftyp" {
            saw_ftyp = true;
        }
        if typ == b"moof" {
            first_moof = Some(off);
            break;
        }
        if size < 8 || off + size > bytes.len() {
            bail!("malformed mp4 box (type {:?}, size {size}) at offset {off}", String::from_utf8_lossy(typ));
        }
        off += size;
    }
    let split = first_moof.context("ffmpeg did not produce a fragmented mp4 (no moof box found)")?;
    if !saw_ftyp || split == 0 {
        bail!("fragmented mp4 missing init (ftyp/moov) before first moof");
    }
    Ok(CmafSegment {
        init: bytes[..split].to_vec(),
        media: bytes[split..].to_vec(),
    })
}

/// Locate a 4-byte box-type tag within `region`, returning the index of the tag itself
/// (i.e. box_start + 4). Used to find child boxes inside an already-bounded parent box.
fn find_tag(region: &[u8], tag: &[u8; 4]) -> Option<usize> {
    region.windows(4).position(|w| w == tag)
}

/// The size of the first top-level box (its 32-bit big-endian size field).
fn first_box_size(bytes: &[u8]) -> Option<usize> {
    if bytes.len() < 8 {
        return None;
    }
    Some(u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as usize)
}

/// Read the per-frame (per-sample) duration in track-timescale ticks from a media fragment's
/// `tfhd default_sample_duration`. Searches only inside the leading `moof` box (before `mdat`)
/// so it cannot false-match on compressed sample bytes. Returns None if absent.
pub fn frame_duration_ticks(media: &[u8]) -> Option<u32> {
    let moof_end = first_box_size(media)?.min(media.len());
    let moof = &media[..moof_end];
    let i = find_tag(moof, b"tfhd")?;
    let flags = u32::from_be_bytes([0, moof[i + 5], moof[i + 6], moof[i + 7]]);
    let mut q = i + 8 + 4; // skip version+flags(4) already counted from tag, then track_ID(4)
    if flags & 0x000001 != 0 {
        q += 8; // base_data_offset
    }
    if flags & 0x000002 != 0 {
        q += 4; // sample_description_index
    }
    if flags & 0x000008 != 0 && q + 4 <= moof.len() {
        return Some(u32::from_be_bytes([moof[q], moof[q + 1], moof[q + 2], moof[q + 3]]));
    }
    None
}

/// Set the media fragment's `tfdt baseMediaDecodeTime` to `bmdt` (track-timescale ticks),
/// placing the fragment at a continuous position on the global timeline. In-place overwrite
/// (fixed-width field), so no box sizes change. Searches only inside the leading `moof`.
pub fn set_base_media_decode_time(media: &mut [u8], bmdt: u64) -> Result<()> {
    let moof_end = first_box_size(media).context("media has no leading box")?.min(media.len());
    let i = find_tag(&media[..moof_end], b"tfdt").context("no tfdt box in media fragment")?;
    let version = media[i + 4];
    if version == 1 {
        if i + 16 > media.len() {
            bail!("truncated tfdt v1");
        }
        media[i + 8..i + 16].copy_from_slice(&bmdt.to_be_bytes());
    } else {
        if i + 12 > media.len() {
            bail!("truncated tfdt v0");
        }
        media[i + 8..i + 12].copy_from_slice(&(bmdt as u32).to_be_bytes());
    }
    Ok(())
}

/// Probe an fMP4 (init+media concatenated) blob: true if ffprobe reads it as a video stream.
#[cfg(test)]
pub fn probe_fmp4_is_video(init: &[u8], media: &[u8]) -> bool {
    let tmp = std::env::temp_dir().join(format!("dits-probe-{}.mp4", uuid::Uuid::new_v4()));
    let mut buf = init.to_vec();
    buf.extend_from_slice(media);
    if std::fs::write(&tmp, &buf).is_err() {
        return false;
    }
    let ok = Command::new("ffprobe")
        .args([
            "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_name", "-of", "csv=p=0",
        ])
        .arg(&tmp)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("h264"))
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
            .args([
                "-v", "error", "-y", "-f", "lavfi", "-i",
                &format!("testsrc=duration={}:size=64x48:rate=10", (n as f64 / 10.0).max(0.1)),
                "-frames:v", &n.to_string(),
            ])
            .arg(&pat)
            .status()
            .unwrap();
        let mut frames: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "png").unwrap_or(false))
            .collect();
        frames.sort();
        let out = frames.iter().map(|p| std::fs::read(p).unwrap()).collect();
        let _ = std::fs::remove_dir_all(&dir);
        out
    }

    #[test]
    fn encodes_frames_into_a_playable_cmaf_segment() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        let frames = make_png_frames(20);
        let seg = encode_cmaf_segment(&frames, "10/1", "png", &EncodeProfile::source()).unwrap();
        assert!(!seg.init.is_empty() && !seg.media.is_empty());
        // Init starts with an ftyp box; media starts with a moof box.
        assert_eq!(&seg.init[4..8], b"ftyp");
        assert_eq!(&seg.media[4..8], b"moof");
        // init+media concatenation is a valid, probeable h264 stream.
        assert!(probe_fmp4_is_video(&seg.init, &seg.media));
    }

    fn probe_height(init: &[u8], media: &[u8]) -> u32 {
        let tmp = std::env::temp_dir().join(format!("dits-ph-{}.mp4", uuid::Uuid::new_v4()));
        let mut buf = init.to_vec();
        buf.extend_from_slice(media);
        std::fs::write(&tmp, &buf).unwrap();
        let h = Command::new("ffprobe")
            .args([
                "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=height", "-of", "csv=p=0",
            ])
            .arg(&tmp)
            .output()
            .ok()
            .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse().ok())
            .unwrap_or(0);
        let _ = std::fs::remove_file(&tmp);
        h
    }

    #[test]
    fn profile_downscales_to_rung_height() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // 64x48 source frames; a rung at height 24 should produce a 24-high segment.
        let frames = make_png_frames(10);
        let profile = EncodeProfile { height: Some(24), bitrate_kbps: Some(100), crf: None };
        let seg = encode_cmaf_segment(&frames, "10/1", "png", &profile).unwrap();
        assert_eq!(probe_height(&seg.init, &seg.media), 24);
    }

    #[test]
    fn init_is_deterministic_across_independent_encodes() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // The shared-init + reuse model depends on this: same frames -> identical init AND media.
        let frames = make_png_frames(20);
        let a = encode_cmaf_segment(&frames, "10/1", "png", &EncodeProfile::source()).unwrap();
        let b = encode_cmaf_segment(&frames, "10/1", "png", &EncodeProfile::source()).unwrap();
        assert_eq!(a.init, b.init, "init must be byte-identical across independent encodes");
        assert_eq!(a.media, b.media, "media must be hash-stable across independent encodes");
    }

    #[test]
    fn split_fmp4_finds_first_moof() {
        // Hand-built: ftyp(8) + moov(8) + moof(8) + mdat(8).
        let mut buf = Vec::new();
        let push_box = |buf: &mut Vec<u8>, ty: &[u8; 4]| {
            buf.extend_from_slice(&8u32.to_be_bytes());
            buf.extend_from_slice(ty);
        };
        push_box(&mut buf, b"ftyp");
        push_box(&mut buf, b"moov");
        push_box(&mut buf, b"moof");
        push_box(&mut buf, b"mdat");
        let seg = split_fmp4(&buf).unwrap();
        assert_eq!(seg.init.len(), 16); // ftyp + moov
        assert_eq!(&seg.init[4..8], b"ftyp");
        assert_eq!(&seg.media[4..8], b"moof");
        assert_eq!(seg.media.len(), 16); // moof + mdat
    }

    #[test]
    fn split_fmp4_errors_without_moof() {
        let mut buf = Vec::new();
        buf.extend_from_slice(&8u32.to_be_bytes());
        buf.extend_from_slice(b"ftyp");
        assert!(split_fmp4(&buf).is_err());
    }

    fn count_frames(path: &std::path::Path) -> u32 {
        Command::new("ffprobe")
            .args([
                "-v", "error", "-count_frames", "-select_streams", "v:0",
                "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0",
            ])
            .arg(path)
            .output()
            .ok()
            .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse().ok())
            .unwrap_or(0)
    }

    #[test]
    fn patched_fragments_form_a_continuous_timeline() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // Two independent 10-frame segments. Without patching they both sit at t=0 and overlap
        // (only 10 frames decode). Patching segment 1's bMDT to 10 frames places it after
        // segment 0 -> the concatenation decodes to the full 20 frames.
        let f0 = make_png_frames(10);
        let f1 = make_png_frames(10);
        let s0 = encode_cmaf_segment(&f0, "10/1", "png", &EncodeProfile::source()).unwrap();
        let mut s1 = encode_cmaf_segment(&f1, "10/1", "png", &EncodeProfile::source()).unwrap();
        let per_frame = frame_duration_ticks(&s0.media).expect("per-frame ticks");
        assert!(per_frame > 0);
        set_base_media_decode_time(&mut s1.media, 10 * per_frame as u64).unwrap();

        let dir = std::env::temp_dir().join(format!("dits-cont-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("cat.mp4");
        let mut buf = s0.init.clone();
        buf.extend_from_slice(&s0.media);
        buf.extend_from_slice(&s1.media);
        std::fs::write(&path, &buf).unwrap();
        let frames = count_frames(&path);
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(frames, 20, "patched fragments should decode as a continuous 20-frame timeline");
    }

    #[test]
    fn patching_at_same_position_is_hash_stable() {
        if !ffmpeg_available() {
            eprintln!("skipping: no ffmpeg");
            return;
        }
        // The reuse guarantee: same frames + same position -> identical patched bytes.
        let frames = make_png_frames(10);
        let mut a = encode_cmaf_segment(&frames, "10/1", "png", &EncodeProfile::source()).unwrap();
        let mut b = encode_cmaf_segment(&frames, "10/1", "png", &EncodeProfile::source()).unwrap();
        let pf = frame_duration_ticks(&a.media).unwrap();
        set_base_media_decode_time(&mut a.media, 40 * pf as u64).unwrap();
        set_base_media_decode_time(&mut b.media, 40 * pf as u64).unwrap();
        assert_eq!(a.media, b.media, "same frames+position must yield identical patched bytes");
    }

    #[test]
    fn empty_segment_errors() {
        assert!(encode_cmaf_segment(&[], "10/1", "png", &EncodeProfile::source()).is_err());
    }
}
