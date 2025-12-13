//! Proxy configuration types.

use serde::{Deserialize, Serialize};

/// Proxy codec options.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProxyCodec {
    /// ProRes 422 Proxy - Apple ecosystem, excellent quality
    #[serde(rename = "prores_proxy")]
    ProResProxy,
    /// ProRes 422 LT - Higher quality ProRes variant
    #[serde(rename = "prores_lt")]
    ProResLT,
    /// DNxHR LB - Avid ecosystem, low bandwidth
    #[serde(rename = "dnxhr_lb")]
    DnxhrLB,
    /// DNxHR SQ - Higher quality DNxHR
    #[serde(rename = "dnxhr_sq")]
    DnxhrSQ,
    /// H.264 - Universal compatibility, smaller files
    #[serde(rename = "h264")]
    H264,
    /// H.265/HEVC - Better compression than H.264
    #[serde(rename = "h265")]
    H265,
}

impl ProxyCodec {
    /// Get FFmpeg encoder name for this codec.
    pub fn ffmpeg_encoder(&self) -> &'static str {
        match self {
            ProxyCodec::ProResProxy => "prores_ks",
            ProxyCodec::ProResLT => "prores_ks",
            ProxyCodec::DnxhrLB => "dnxhd",
            ProxyCodec::DnxhrSQ => "dnxhd",
            ProxyCodec::H264 => "libx264",
            ProxyCodec::H265 => "libx265",
        }
    }

    /// Get FFmpeg profile/options for this codec.
    pub fn ffmpeg_options(&self) -> Vec<(&'static str, &'static str)> {
        match self {
            ProxyCodec::ProResProxy => vec![("-profile:v", "0")], // Proxy profile
            ProxyCodec::ProResLT => vec![("-profile:v", "1")],    // LT profile
            ProxyCodec::DnxhrLB => vec![("-profile:v", "dnxhr_lb")],
            ProxyCodec::DnxhrSQ => vec![("-profile:v", "dnxhr_sq")],
            ProxyCodec::H264 => vec![
                ("-preset", "fast"),
                ("-crf", "23"),
                ("-pix_fmt", "yuv420p"),
            ],
            ProxyCodec::H265 => vec![
                ("-preset", "fast"),
                ("-crf", "28"),
                ("-pix_fmt", "yuv420p"),
            ],
        }
    }

    /// Get file extension for this codec.
    pub fn extension(&self) -> &'static str {
        match self {
            ProxyCodec::ProResProxy | ProxyCodec::ProResLT => "mov",
            ProxyCodec::DnxhrLB | ProxyCodec::DnxhrSQ => "mxf",
            ProxyCodec::H264 | ProxyCodec::H265 => "mp4",
        }
    }

    /// Human-readable name.
    pub fn display_name(&self) -> &'static str {
        match self {
            ProxyCodec::ProResProxy => "ProRes 422 Proxy",
            ProxyCodec::ProResLT => "ProRes 422 LT",
            ProxyCodec::DnxhrLB => "DNxHR LB",
            ProxyCodec::DnxhrSQ => "DNxHR SQ",
            ProxyCodec::H264 => "H.264",
            ProxyCodec::H265 => "H.265/HEVC",
        }
    }
}

impl Default for ProxyCodec {
    fn default() -> Self {
        // H.264 is the most universally compatible
        ProxyCodec::H264
    }
}

/// Proxy resolution options.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProxyResolution {
    /// 1920x1080 (Full HD)
    #[serde(rename = "1080p")]
    HD1080,
    /// 1280x720 (HD)
    #[serde(rename = "720p")]
    HD720,
    /// 960x540 (Quarter HD)
    #[serde(rename = "540p")]
    QHD540,
    /// Half of original resolution
    #[serde(rename = "half")]
    Half,
    /// Quarter of original resolution
    #[serde(rename = "quarter")]
    Quarter,
}

impl ProxyResolution {
    /// Get FFmpeg scale filter for this resolution.
    /// Returns None for relative resolutions (Half, Quarter) which need source dimensions.
    pub fn ffmpeg_scale(&self) -> Option<&'static str> {
        match self {
            ProxyResolution::HD1080 => Some("scale=1920:1080:force_original_aspect_ratio=decrease"),
            ProxyResolution::HD720 => Some("scale=1280:720:force_original_aspect_ratio=decrease"),
            ProxyResolution::QHD540 => Some("scale=960:540:force_original_aspect_ratio=decrease"),
            ProxyResolution::Half => None,
            ProxyResolution::Quarter => None,
        }
    }

    /// Get FFmpeg scale filter for relative resolutions given source dimensions.
    pub fn ffmpeg_scale_relative(&self, width: u32, height: u32) -> String {
        match self {
            ProxyResolution::Half => format!("scale={}:{}", width / 2, height / 2),
            ProxyResolution::Quarter => format!("scale={}:{}", width / 4, height / 4),
            _ => self.ffmpeg_scale().unwrap_or("scale=1920:1080").to_string(),
        }
    }

    /// Human-readable name.
    pub fn display_name(&self) -> &'static str {
        match self {
            ProxyResolution::HD1080 => "1080p",
            ProxyResolution::HD720 => "720p",
            ProxyResolution::QHD540 => "540p",
            ProxyResolution::Half => "Half Resolution",
            ProxyResolution::Quarter => "Quarter Resolution",
        }
    }

    /// Short identifier for filenames.
    pub fn suffix(&self) -> &'static str {
        match self {
            ProxyResolution::HD1080 => "1080p",
            ProxyResolution::HD720 => "720p",
            ProxyResolution::QHD540 => "540p",
            ProxyResolution::Half => "half",
            ProxyResolution::Quarter => "quarter",
        }
    }
}

impl Default for ProxyResolution {
    fn default() -> Self {
        ProxyResolution::HD1080
    }
}

/// Configuration for proxy generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    /// Target codec for proxy files.
    #[serde(default)]
    pub codec: ProxyCodec,

    /// Target resolution for proxy files.
    #[serde(default)]
    pub resolution: ProxyResolution,

    /// Preserve timecode from source.
    #[serde(default = "default_true")]
    pub preserve_timecode: bool,

    /// Copy all audio streams.
    #[serde(default = "default_true")]
    pub copy_audio: bool,

    /// Apply LUT for color correction (path to .cube file).
    pub lut_path: Option<String>,

    /// Force constant frame rate (helps with VFR sources).
    #[serde(default)]
    pub force_cfr: bool,

    /// Generate thumbnail during proxy creation.
    #[serde(default = "default_true")]
    pub generate_thumbnail: bool,

    /// Thumbnail position (seconds from start, or -1 for middle).
    #[serde(default = "default_thumbnail_position")]
    pub thumbnail_position: f64,

    /// Maximum allowed duration difference (ms) between source and proxy.
    #[serde(default = "default_duration_tolerance")]
    pub duration_tolerance_ms: u32,
}

fn default_true() -> bool {
    true
}

fn default_thumbnail_position() -> f64 {
    -1.0 // Middle of video
}

fn default_duration_tolerance() -> u32 {
    1 // 1ms tolerance
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            codec: ProxyCodec::default(),
            resolution: ProxyResolution::default(),
            preserve_timecode: true,
            copy_audio: true,
            lut_path: None,
            force_cfr: false,
            generate_thumbnail: true,
            thumbnail_position: -1.0,
            duration_tolerance_ms: 1,
        }
    }
}

impl ProxyConfig {
    /// Create a config optimized for fast editing (smaller files).
    pub fn fast_edit() -> Self {
        Self {
            codec: ProxyCodec::H264,
            resolution: ProxyResolution::HD720,
            ..Default::default()
        }
    }

    /// Create a config optimized for quality (ProRes).
    pub fn high_quality() -> Self {
        Self {
            codec: ProxyCodec::ProResLT,
            resolution: ProxyResolution::HD1080,
            ..Default::default()
        }
    }

    /// Create a config for offline editing (smallest files).
    pub fn offline() -> Self {
        Self {
            codec: ProxyCodec::H264,
            resolution: ProxyResolution::QHD540,
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_codec_defaults() {
        let codec = ProxyCodec::default();
        assert_eq!(codec, ProxyCodec::H264);
        assert_eq!(codec.extension(), "mp4");
    }

    #[test]
    fn test_resolution_scale() {
        assert!(ProxyResolution::HD1080.ffmpeg_scale().is_some());
        assert!(ProxyResolution::Half.ffmpeg_scale().is_none());

        let scale = ProxyResolution::Half.ffmpeg_scale_relative(3840, 2160);
        assert_eq!(scale, "scale=1920:1080");
    }

    #[test]
    fn test_config_presets() {
        let fast = ProxyConfig::fast_edit();
        assert_eq!(fast.resolution, ProxyResolution::HD720);

        let quality = ProxyConfig::high_quality();
        assert_eq!(quality.codec, ProxyCodec::ProResLT);
    }
}
