# Keyframe Alignment Algorithm

Adjusting chunk boundaries to align with video keyframes (I-frames) for optimal random access and streaming.

---

## Overview

Video codecs use inter-frame compression where most frames (P/B-frames) depend on previous frames. Only keyframes (I-frames) are independently decodable. Aligning chunk boundaries to keyframes provides:

1. **Random access**: Any chunk can be decoded without fetching prior chunks
2. **Seeking**: Faster seek operations in video players
3. **Streaming**: Progressive playback without buffering dependencies
4. **Partial restore**: Recover any portion of video independently

---

## Video Frame Types

### GOP Structure

```
GOP (Group of Pictures):
[I] [B] [B] [P] [B] [B] [P] [B] [B] [P] [B] [B] [I] ...
 ^                                               ^
 |                                               |
 Keyframe (I-frame)                              Next Keyframe

I-frame: Intra-coded (complete image, no dependencies)
P-frame: Predicted (depends on previous I or P)
B-frame: Bi-directional (depends on both previous and next)
```

### Typical GOP Sizes

| Format | Typical GOP | Reason |
|--------|-------------|--------|
| H.264 Broadcast | 30-60 | Balance seeking/compression |
| H.265/HEVC | 48-120 | Better compression allows longer GOP |
| ProRes | 1 (all I) | Editing-optimized, every frame is keyframe |
| DNxHD | 1 (all I) | Editing-optimized |
| MPEG-2 | 12-15 | DVD/broadcast standard |

---

## Algorithm Design

### Goals

1. Chunk boundaries should fall on keyframes when possible
2. Maintain FastCDC size constraints (min/avg/max)
3. Minimize deviation from content-defined boundaries
4. Handle edge cases gracefully

### Parameters

```rust
/// Keyframe alignment configuration
pub struct KeyframeAlignConfig {
    /// Maximum bytes to shift boundary to reach keyframe
    pub max_shift: usize,

    /// Prefer keyframe even if chunk becomes smaller than ideal
    pub prefer_keyframe: bool,

    /// Minimum chunk size even with alignment
    pub absolute_min: usize,

    /// Weight for keyframe preference (0.0 - 1.0)
    pub keyframe_weight: f64,
}

impl Default for KeyframeAlignConfig {
    fn default() -> Self {
        Self {
            max_shift: 32 * 1024,      // 32KB
            prefer_keyframe: true,
            absolute_min: 16 * 1024,   // 16KB
            keyframe_weight: 0.8,
        }
    }
}
```

---

## Core Algorithm

### Step 1: Identify Keyframes

```rust
/// Extract keyframe positions from video container
pub fn extract_keyframes(data: &[u8], format: VideoFormat) -> Result<Vec<KeyframeInfo>> {
    match format {
        VideoFormat::Mp4 | VideoFormat::Mov => extract_keyframes_isobmff(data),
        VideoFormat::Mxf => extract_keyframes_mxf(data),
        VideoFormat::Avi => extract_keyframes_avi(data),
        _ => Ok(Vec::new()),  // Unknown format, no alignment
    }
}

#[derive(Debug, Clone)]
pub struct KeyframeInfo {
    /// Byte offset in mdat/payload
    pub offset: u64,

    /// Size of keyframe
    pub size: u32,

    /// Frame number
    pub frame_number: u64,

    /// Presentation timestamp
    pub pts: Option<i64>,

    /// Decode timestamp
    pub dts: Option<i64>,
}
```

### Step 2: Extract from ISOBMFF (MP4/MOV)

```rust
/// Extract keyframes from MP4/MOV container
pub fn extract_keyframes_isobmff(data: &[u8]) -> Result<Vec<KeyframeInfo>> {
    let mut keyframes = Vec::new();

    // Parse moov box
    let moov = find_box(data, b"moov")?;

    // Find video track
    for trak in iter_boxes(&moov, b"trak") {
        if !is_video_track(&trak)? {
            continue;
        }

        // Get sample table
        let stbl = find_nested_box(&trak, &[b"mdia", b"minf", b"stbl"])?;

        // Get sync sample table (stss) - lists keyframe sample numbers
        let stss = match find_box(&stbl, b"stss") {
            Ok(box_data) => parse_stss(&box_data)?,
            Err(_) => {
                // No stss = all samples are sync (like ProRes)
                return Ok(all_samples_as_keyframes(&stbl)?);
            }
        };

        // Get sample sizes (stsz)
        let sample_sizes = parse_stsz(&find_box(&stbl, b"stsz")?)?;

        // Get chunk offsets (stco or co64)
        let chunk_offsets = if let Ok(stco) = find_box(&stbl, b"stco") {
            parse_stco(&stco)?
        } else {
            parse_co64(&find_box(&stbl, b"co64")?)?
        };

        // Get sample-to-chunk mapping (stsc)
        let stsc = parse_stsc(&find_box(&stbl, b"stsc")?)?;

        // Get time-to-sample (stts) for timestamps
        let stts = parse_stts(&find_box(&stbl, b"stts")?)?;

        // Calculate byte offset for each keyframe
        let sample_offsets = calculate_sample_offsets(&chunk_offsets, &stsc, &sample_sizes)?;

        for sync_sample in stss {
            let sample_idx = (sync_sample - 1) as usize;  // stss is 1-indexed

            if sample_idx < sample_offsets.len() {
                let (offset, _chunk_idx) = sample_offsets[sample_idx];
                let size = sample_sizes[sample_idx];
                let pts = calculate_pts(&stts, sample_idx)?;

                keyframes.push(KeyframeInfo {
                    offset,
                    size,
                    frame_number: sync_sample as u64,
                    pts: Some(pts),
                    dts: None,
                });
            }
        }

        break;  // Only process first video track
    }

    Ok(keyframes)
}
```

### Step 3: Adjust Chunk Boundaries

```rust
/// Adjust FastCDC boundaries to align with keyframes
pub fn align_to_keyframes(
    mut chunks: Vec<ChunkBoundary>,
    keyframes: &[KeyframeInfo],
    config: &KeyframeAlignConfig,
    cdc_config: &FastCdcConfig,
) -> Vec<ChunkBoundary> {
    if keyframes.is_empty() {
        return chunks;
    }

    // Build keyframe offset set for fast lookup
    let keyframe_offsets: BTreeSet<u64> = keyframes
        .iter()
        .map(|kf| kf.offset)
        .collect();

    let mut aligned = Vec::with_capacity(chunks.len());
    let mut prev_end = 0u64;

    for (i, chunk) in chunks.iter().enumerate() {
        let original_end = chunk.offset + chunk.length as u64;

        // Find nearest keyframe to this boundary
        let nearest = find_nearest_keyframe(original_end, &keyframe_offsets);

        let aligned_end = match nearest {
            Some((kf_offset, distance)) => {
                // Check if alignment is beneficial
                if should_align(
                    original_end,
                    kf_offset,
                    distance,
                    prev_end,
                    config,
                    cdc_config,
                ) {
                    kf_offset
                } else {
                    original_end
                }
            }
            None => original_end,
        };

        // Create aligned chunk
        let aligned_length = (aligned_end - prev_end) as u32;

        // Validate size constraints
        if aligned_length >= config.absolute_min as u32
            && aligned_length <= cdc_config.max_size as u32
        {
            aligned.push(ChunkBoundary {
                offset: prev_end,
                length: aligned_length,
                is_keyframe_aligned: aligned_end != original_end,
            });
            prev_end = aligned_end;
        } else {
            // Alignment would violate constraints, keep original
            aligned.push(ChunkBoundary {
                offset: prev_end,
                length: (original_end - prev_end) as u32,
                is_keyframe_aligned: false,
            });
            prev_end = original_end;
        }
    }

    // Merge any chunks that became too small
    merge_small_chunks(&mut aligned, cdc_config.min_size);

    aligned
}

/// Find nearest keyframe to a byte offset
fn find_nearest_keyframe(
    offset: u64,
    keyframes: &BTreeSet<u64>,
) -> Option<(u64, i64)> {
    // Find keyframe at or after offset
    let after = keyframes.range(offset..).next();

    // Find keyframe before offset
    let before = keyframes.range(..offset).next_back();

    match (before, after) {
        (Some(&b), Some(&a)) => {
            let dist_before = (offset - b) as i64;
            let dist_after = (a - offset) as i64;

            if dist_before <= dist_after {
                Some((b, -dist_before))
            } else {
                Some((a, dist_after))
            }
        }
        (Some(&b), None) => Some((b, -((offset - b) as i64))),
        (None, Some(&a)) => Some((a, (a - offset) as i64)),
        (None, None) => None,
    }
}

/// Decide whether to align to keyframe
fn should_align(
    original: u64,
    keyframe: u64,
    distance: i64,
    prev_end: u64,
    config: &KeyframeAlignConfig,
    cdc_config: &FastCdcConfig,
) -> bool {
    // Distance too far
    if distance.unsigned_abs() as usize > config.max_shift {
        return false;
    }

    // Check resulting chunk size
    let new_size = keyframe - prev_end;

    // Would be too small
    if new_size < config.absolute_min as u64 {
        return false;
    }

    // Would be too large
    if new_size > cdc_config.max_size as u64 {
        return false;
    }

    // Prefer closer keyframes with configurable weight
    let distance_factor = 1.0 - (distance.unsigned_abs() as f64 / config.max_shift as f64);

    config.prefer_keyframe && (distance_factor * config.keyframe_weight > 0.3)
}
```

---

## Handling Edge Cases

### All-Intra Codecs (ProRes, DNxHD)

```rust
/// Handle codecs where every frame is a keyframe
fn handle_all_intra(
    data: &[u8],
    frame_offsets: &[u64],
    cdc_config: &FastCdcConfig,
) -> Vec<ChunkBoundary> {
    // For all-intra, we can align to any frame
    // Prefer aligning to frame boundaries but respect CDC sizes

    let avg_frames_per_chunk = cdc_config.avg_size as f64 / average_frame_size(frame_offsets);

    let mut chunks = Vec::new();
    let mut chunk_start = 0u64;
    let mut frame_count = 0usize;

    for (i, &offset) in frame_offsets.iter().enumerate() {
        frame_count += 1;

        let chunk_size = offset - chunk_start;

        // Check if we should end chunk here
        if chunk_size >= cdc_config.min_size as u64 {
            if chunk_size >= cdc_config.avg_size as u64 ||
               (i + 1 < frame_offsets.len() &&
                frame_offsets[i + 1] - chunk_start > cdc_config.max_size as u64)
            {
                chunks.push(ChunkBoundary {
                    offset: chunk_start,
                    length: chunk_size as u32,
                    is_keyframe_aligned: true,
                });
                chunk_start = offset;
                frame_count = 0;
            }
        }
    }

    // Final chunk
    if chunk_start < data.len() as u64 {
        chunks.push(ChunkBoundary {
            offset: chunk_start,
            length: (data.len() as u64 - chunk_start) as u32,
            is_keyframe_aligned: true,
        });
    }

    chunks
}
```

### Variable Frame Rate

```rust
/// Handle variable frame rate content
fn handle_vfr(
    keyframes: &[KeyframeInfo],
    cdc_config: &FastCdcConfig,
) -> KeyframeAlignConfig {
    // Calculate keyframe spacing statistics
    let spacings: Vec<u64> = keyframes.windows(2)
        .map(|w| w[1].offset - w[0].offset)
        .collect();

    let avg_spacing = spacings.iter().sum::<u64>() as f64 / spacings.len() as f64;
    let variance = spacings.iter()
        .map(|&s| (s as f64 - avg_spacing).powi(2))
        .sum::<f64>() / spacings.len() as f64;

    // High variance = variable frame rate, reduce alignment aggressiveness
    let keyframe_weight = if variance > avg_spacing * 0.5 {
        0.5  // Less aggressive alignment
    } else {
        0.8  // Normal alignment
    };

    KeyframeAlignConfig {
        max_shift: (avg_spacing * 0.5) as usize,
        prefer_keyframe: true,
        absolute_min: cdc_config.min_size / 2,
        keyframe_weight,
    }
}
```

### Long-GOP Content

```rust
/// Handle long-GOP content (H.264, H.265)
fn handle_long_gop(
    keyframes: &[KeyframeInfo],
    data_len: u64,
    cdc_config: &FastCdcConfig,
) -> Vec<ChunkBoundary> {
    // For long-GOP, keyframes might be far apart
    // Strategy: Align to keyframes, but add intermediate boundaries for large gaps

    let mut chunks = Vec::new();
    let mut prev_offset = 0u64;

    for kf in keyframes {
        let gap = kf.offset - prev_offset;

        if gap > cdc_config.max_size as u64 {
            // Gap too large, add intermediate chunks
            let intermediate = create_intermediate_chunks(
                prev_offset,
                kf.offset,
                cdc_config,
            );
            chunks.extend(intermediate);
        } else if gap >= cdc_config.min_size as u64 {
            // Good size, create aligned chunk
            chunks.push(ChunkBoundary {
                offset: prev_offset,
                length: gap as u32,
                is_keyframe_aligned: true,
            });
        }
        // else: gap too small, will be merged with next

        prev_offset = kf.offset;
    }

    // Handle final segment
    if prev_offset < data_len {
        let remaining = data_len - prev_offset;
        if remaining >= cdc_config.min_size as u64 {
            chunks.push(ChunkBoundary {
                offset: prev_offset,
                length: remaining as u32,
                is_keyframe_aligned: false,
            });
        } else if let Some(last) = chunks.last_mut() {
            // Merge with previous chunk
            last.length += remaining as u32;
        }
    }

    chunks
}

fn create_intermediate_chunks(
    start: u64,
    end: u64,
    config: &FastCdcConfig,
) -> Vec<ChunkBoundary> {
    let gap = end - start;
    let num_chunks = (gap / config.avg_size as u64).max(1);
    let chunk_size = gap / num_chunks;

    (0..num_chunks).map(|i| {
        let offset = start + i * chunk_size;
        let length = if i == num_chunks - 1 {
            (end - offset) as u32
        } else {
            chunk_size as u32
        };

        ChunkBoundary {
            offset,
            length,
            is_keyframe_aligned: false,
        }
    }).collect()
}
```

---

## Integration with Atom Exploder

```rust
/// Full video chunking pipeline
pub async fn chunk_video_file(
    path: &Path,
    config: &ChunkingConfig,
) -> Result<ChunkedVideo> {
    // Read file
    let data = tokio::fs::read(path).await?;

    // Detect format
    let format = detect_video_format(&data)?;

    // Extract container structure
    let (metadata, payload_offset, payload_len) = match format {
        VideoFormat::Mp4 | VideoFormat::Mov => {
            extract_isobmff_structure(&data)?
        }
        VideoFormat::Mxf => {
            extract_mxf_structure(&data)?
        }
        _ => {
            // Generic handling for unknown formats
            (Vec::new(), 0, data.len())
        }
    };

    // Extract keyframes from payload
    let keyframes = extract_keyframes(&data[payload_offset..], format)?;

    // Adjust keyframe offsets to be relative to file start
    let adjusted_keyframes: Vec<_> = keyframes.iter()
        .map(|kf| KeyframeInfo {
            offset: kf.offset + payload_offset as u64,
            ..kf.clone()
        })
        .collect();

    // Chunk metadata separately (small chunks for dedup)
    let metadata_chunks = chunk_metadata(&metadata, &config.metadata_cdc)?;

    // Chunk payload with keyframe alignment
    let payload_data = &data[payload_offset..payload_offset + payload_len];
    let raw_chunks = FastCdc::new(payload_data, config.video_cdc.clone())
        .collect::<Vec<_>>();

    let aligned_chunks = align_to_keyframes(
        raw_chunks,
        &adjusted_keyframes,
        &config.keyframe_align,
        &config.video_cdc,
    );

    // Hash all chunks
    let mut final_chunks = Vec::new();

    for chunk in metadata_chunks {
        final_chunks.push(hash_chunk(&data, chunk, true)?);
    }

    for chunk in aligned_chunks {
        final_chunks.push(hash_chunk(&data, chunk, false)?);
    }

    Ok(ChunkedVideo {
        format,
        total_size: data.len() as u64,
        chunks: final_chunks,
        keyframe_count: keyframes.len(),
    })
}
```

---

## Performance Considerations

### Caching Keyframe Index

```rust
/// Cache keyframe positions for frequently accessed files
pub struct KeyframeCache {
    cache: LruCache<PathBuf, Arc<Vec<KeyframeInfo>>>,
}

impl KeyframeCache {
    pub fn new(capacity: usize) -> Self {
        Self {
            cache: LruCache::new(NonZeroUsize::new(capacity).unwrap()),
        }
    }

    pub async fn get_or_extract(
        &mut self,
        path: &Path,
        data: &[u8],
    ) -> Result<Arc<Vec<KeyframeInfo>>> {
        if let Some(cached) = self.cache.get(path) {
            return Ok(Arc::clone(cached));
        }

        let keyframes = extract_keyframes(data, detect_video_format(data)?)?;
        let arc = Arc::new(keyframes);
        self.cache.put(path.to_owned(), Arc::clone(&arc));

        Ok(arc)
    }
}
```

### Parallel Keyframe Extraction

```rust
/// Extract keyframes from multiple files in parallel
pub async fn extract_keyframes_batch(
    files: &[PathBuf],
) -> Result<HashMap<PathBuf, Vec<KeyframeInfo>>> {
    let results = futures::stream::iter(files)
        .map(|path| async move {
            let data = tokio::fs::read(path).await?;
            let format = detect_video_format(&data)?;
            let keyframes = extract_keyframes(&data, format)?;
            Ok::<_, Error>((path.clone(), keyframes))
        })
        .buffer_unordered(num_cpus::get())
        .collect::<Vec<_>>()
        .await;

    results.into_iter()
        .collect::<Result<HashMap<_, _>>>()
}
```

---

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alignment_within_bounds() {
        let keyframes = vec![
            KeyframeInfo { offset: 65536, ..Default::default() },
            KeyframeInfo { offset: 131072, ..Default::default() },
            KeyframeInfo { offset: 196608, ..Default::default() },
        ];

        let chunks = vec![
            ChunkBoundary { offset: 0, length: 60000, is_keyframe_aligned: false },
            ChunkBoundary { offset: 60000, length: 70000, is_keyframe_aligned: false },
        ];

        let config = KeyframeAlignConfig::default();
        let cdc_config = FastCdcConfig::default();

        let aligned = align_to_keyframes(chunks, &keyframes, &config, &cdc_config);

        // First chunk should align to 65536 (shifting +5536)
        assert_eq!(aligned[0].length, 65536);
        assert!(aligned[0].is_keyframe_aligned);
    }

    #[test]
    fn test_no_alignment_if_too_far() {
        let keyframes = vec![
            KeyframeInfo { offset: 100000, ..Default::default() },
        ];

        let chunks = vec![
            ChunkBoundary { offset: 0, length: 50000, is_keyframe_aligned: false },
        ];

        let config = KeyframeAlignConfig {
            max_shift: 10000,  // Only 10KB shift allowed
            ..Default::default()
        };
        let cdc_config = FastCdcConfig::default();

        let aligned = align_to_keyframes(chunks, &keyframes, &config, &cdc_config);

        // Should not align because keyframe is 50KB away (> 10KB max_shift)
        assert_eq!(aligned[0].length, 50000);
        assert!(!aligned[0].is_keyframe_aligned);
    }

    #[test]
    fn test_all_intra_alignment() {
        // Simulate ProRes where every frame is a keyframe
        let frame_offsets: Vec<u64> = (0..100)
            .map(|i| i * 50000)  // 50KB per frame
            .collect();

        let cdc_config = FastCdcConfig {
            min_size: 32000,
            avg_size: 100000,  // ~2 frames
            max_size: 200000,  // ~4 frames
            ..Default::default()
        };

        let chunks = handle_all_intra(
            &vec![0u8; 5_000_000],
            &frame_offsets,
            &cdc_config,
        );

        // All chunks should be frame-aligned
        for chunk in &chunks {
            assert!(frame_offsets.contains(&chunk.offset) ||
                    chunk.offset == 0);
        }
    }
}
```

---

## Notes

- Keyframe alignment is best-effort; size constraints take priority
- For editing codecs (ProRes, DNxHD), every frame is a keyframe
- Long-GOP content may have keyframes 2-5 seconds apart
- VBR content may have variable keyframe spacing
- Alignment metadata stored in manifest for playback optimization
