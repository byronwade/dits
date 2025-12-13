//! FFmpeg-based proxy generator.

use super::config::{ProxyConfig, ProxyResolution};
use super::variant::{ProxyVariant, VariantType};
use crate::core::{chunk_data_with_refs_parallel, ChunkerConfig, Hash, Hasher};
use std::path::Path;
use std::process::Command;
use thiserror::Error;

/// Proxy generation errors.
#[derive(Debug, Error)]
pub enum GenerationError {
    #[error("FFmpeg not found. Please install FFmpeg.")]
    FfmpegNotFound,

    #[error("FFmpeg execution failed: {0}")]
    FfmpegFailed(String),

    #[error("Source file not found: {0}")]
    SourceNotFound(String),

    #[error("Failed to probe source: {0}")]
    ProbeFailed(String),

    #[error("Duration mismatch: source={source_ms}ms, proxy={proxy_ms}ms (tolerance={tolerance_ms}ms)")]
    DurationMismatch {
        source_ms: u64,
        proxy_ms: u64,
        tolerance_ms: u32,
    },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Unsupported source format: {0}")]
    UnsupportedFormat(String),
}

/// Result of proxy generation.
#[derive(Debug)]
pub struct ProxyResult {
    /// The generated proxy variant.
    pub variant: ProxyVariant,
    /// Path to the proxy file (temporary).
    pub proxy_path: std::path::PathBuf,
    /// Thumbnail path (if generated).
    pub thumbnail_path: Option<std::path::PathBuf>,
    /// FFmpeg command used.
    pub ffmpeg_command: String,
    /// Source duration in seconds.
    pub source_duration: f64,
    /// Proxy duration in seconds.
    pub proxy_duration: f64,
}

/// Proxy generator using FFmpeg.
pub struct ProxyGenerator {
    config: ProxyConfig,
}

impl ProxyGenerator {
    /// Create a new proxy generator with the given config.
    pub fn new(config: ProxyConfig) -> Self {
        Self { config }
    }

    /// Create a generator with default config.
    pub fn default_generator() -> Self {
        Self::new(ProxyConfig::default())
    }

    /// Check if FFmpeg is available.
    pub fn check_ffmpeg() -> Result<String, GenerationError> {
        let output = Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map_err(|_| GenerationError::FfmpegNotFound)?;

        if !output.status.success() {
            return Err(GenerationError::FfmpegNotFound);
        }

        let version = String::from_utf8_lossy(&output.stdout);
        let first_line = version.lines().next().unwrap_or("unknown");
        Ok(first_line.to_string())
    }

    /// Check if FFprobe is available.
    pub fn check_ffprobe() -> Result<String, GenerationError> {
        let output = Command::new("ffprobe")
            .arg("-version")
            .output()
            .map_err(|_| GenerationError::FfmpegNotFound)?;

        if !output.status.success() {
            return Err(GenerationError::FfmpegNotFound);
        }

        let version = String::from_utf8_lossy(&output.stdout);
        let first_line = version.lines().next().unwrap_or("unknown");
        Ok(first_line.to_string())
    }

    /// Probe source file for metadata.
    pub fn probe_source(&self, source_path: &Path) -> Result<SourceInfo, GenerationError> {
        if !source_path.exists() {
            return Err(GenerationError::SourceNotFound(
                source_path.display().to_string(),
            ));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
            ])
            .arg(source_path)
            .output()
            .map_err(|e| GenerationError::ProbeFailed(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(GenerationError::ProbeFailed(stderr.to_string()));
        }

        let json_str = String::from_utf8_lossy(&output.stdout);
        parse_ffprobe_json(&json_str)
    }

    /// Generate a proxy for the given source file.
    pub fn generate(
        &self,
        source_path: &Path,
        output_dir: &Path,
    ) -> Result<ProxyResult, GenerationError> {
        // Probe source
        let source_info = self.probe_source(source_path)?;

        // Determine output path
        let source_name = source_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "proxy".to_string());

        let proxy_filename = format!(
            "{}_{}.{}",
            source_name,
            self.config.resolution.suffix(),
            self.config.codec.extension()
        );
        let proxy_path = output_dir.join(&proxy_filename);

        // Build FFmpeg command
        let ffmpeg_args = self.build_ffmpeg_args(source_path, &proxy_path, &source_info)?;
        let ffmpeg_command = format!("ffmpeg {}", ffmpeg_args.join(" "));

        // Run FFmpeg
        let status = Command::new("ffmpeg")
            .args(&ffmpeg_args)
            .status()
            .map_err(|e| GenerationError::FfmpegFailed(e.to_string()))?;

        if !status.success() {
            return Err(GenerationError::FfmpegFailed(format!(
                "FFmpeg exited with status: {}",
                status
            )));
        }

        // Probe proxy to verify
        let proxy_info = self.probe_source(&proxy_path)?;

        // Check duration tolerance
        let source_ms = (source_info.duration * 1000.0) as u64;
        let proxy_ms = (proxy_info.duration * 1000.0) as u64;
        let diff = if source_ms > proxy_ms {
            source_ms - proxy_ms
        } else {
            proxy_ms - source_ms
        };

        if diff > self.config.duration_tolerance_ms as u64 {
            // Clean up the generated file
            let _ = std::fs::remove_file(&proxy_path);
            return Err(GenerationError::DurationMismatch {
                source_ms,
                proxy_ms,
                tolerance_ms: self.config.duration_tolerance_ms,
            });
        }

        // Generate thumbnail if configured
        let thumbnail_path = if self.config.generate_thumbnail {
            self.generate_thumbnail(source_path, output_dir, &source_info)?
        } else {
            None
        };

        // Hash and chunk the proxy
        let proxy_data = std::fs::read(&proxy_path)?;
        let content_hash = Hasher::hash(&proxy_data);
        let chunker_config = ChunkerConfig::default();
        let (_, chunk_refs) = chunk_data_with_refs_parallel(&proxy_data, &chunker_config);
        let chunk_hashes: Vec<Hash> = chunk_refs.iter().map(|r| r.hash).collect();

        // Determine variant type
        let variant_type = match self.config.resolution {
            ProxyResolution::HD1080 => VariantType::Proxy1080p,
            ProxyResolution::HD720 => VariantType::Proxy720p,
            ProxyResolution::QHD540 => VariantType::Proxy540p,
            ProxyResolution::Half => VariantType::ProxyHalf,
            ProxyResolution::Quarter => VariantType::ProxyQuarter,
        };

        // Create variant - hash the source file to get parent hash
        let source_data = std::fs::read(source_path)?;
        let source_hash = Hasher::hash(&source_data);
        let mut variant = ProxyVariant::new(
            source_hash,
            variant_type,
            content_hash,
            proxy_data.len() as u64,
            chunk_hashes,
        )
        .with_video_metadata(
            proxy_info.duration,
            proxy_info.width,
            proxy_info.height,
            self.config.codec.ffmpeg_encoder(),
        )
        .with_ffmpeg_command(&ffmpeg_command);

        if let Some(ref tc) = source_info.timecode {
            variant = variant.with_timecode(tc);
        }

        Ok(ProxyResult {
            variant,
            proxy_path,
            thumbnail_path,
            ffmpeg_command,
            source_duration: source_info.duration,
            proxy_duration: proxy_info.duration,
        })
    }

    /// Build FFmpeg arguments for proxy generation.
    fn build_ffmpeg_args(
        &self,
        source_path: &Path,
        output_path: &Path,
        source_info: &SourceInfo,
    ) -> Result<Vec<String>, GenerationError> {
        let mut args = Vec::new();

        // Input
        args.push("-y".to_string()); // Overwrite output
        args.push("-i".to_string());
        args.push(source_path.display().to_string());

        // Video codec
        args.push("-c:v".to_string());
        args.push(self.config.codec.ffmpeg_encoder().to_string());

        // Codec options
        for (key, value) in self.config.codec.ffmpeg_options() {
            args.push(key.to_string());
            args.push(value.to_string());
        }

        // Scale filter
        let scale = if matches!(self.config.resolution, ProxyResolution::Half | ProxyResolution::Quarter) {
            self.config.resolution.ffmpeg_scale_relative(source_info.width, source_info.height)
        } else {
            self.config.resolution.ffmpeg_scale()
                .unwrap_or("scale=1920:1080")
                .to_string()
        };

        // Build filter chain
        let mut filters = vec![scale];

        // Apply LUT if specified
        if let Some(ref lut_path) = self.config.lut_path {
            filters.push(format!("lut3d={}", lut_path));
        }

        args.push("-vf".to_string());
        args.push(filters.join(","));

        // Audio handling
        if self.config.copy_audio {
            args.push("-c:a".to_string());
            args.push("aac".to_string());
            args.push("-b:a".to_string());
            args.push("192k".to_string());
        } else {
            args.push("-an".to_string());
        }

        // Force CFR if configured
        if self.config.force_cfr {
            args.push("-vsync".to_string());
            args.push("cfr".to_string());
        }

        // Preserve metadata
        args.push("-map_metadata".to_string());
        args.push("0".to_string());

        // Timecode handling
        if self.config.preserve_timecode {
            if let Some(ref tc) = source_info.timecode {
                args.push("-timecode".to_string());
                args.push(tc.clone());
            }
        }

        // Output
        args.push(output_path.display().to_string());

        Ok(args)
    }

    /// Generate a thumbnail from the source.
    fn generate_thumbnail(
        &self,
        source_path: &Path,
        output_dir: &Path,
        source_info: &SourceInfo,
    ) -> Result<Option<std::path::PathBuf>, GenerationError> {
        let source_name = source_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "thumb".to_string());

        let thumb_path = output_dir.join(format!("{}_thumb.jpg", source_name));

        // Calculate thumbnail position
        let position = if self.config.thumbnail_position < 0.0 {
            source_info.duration / 2.0
        } else {
            self.config.thumbnail_position.min(source_info.duration)
        };

        let status = Command::new("ffmpeg")
            .args([
                "-y",
                "-ss", &position.to_string(),
                "-i", &source_path.display().to_string(),
                "-vframes", "1",
                "-vf", "scale=320:-1",
                "-q:v", "2",
                &thumb_path.display().to_string(),
            ])
            .status()
            .map_err(|e| GenerationError::FfmpegFailed(e.to_string()))?;

        if status.success() && thumb_path.exists() {
            Ok(Some(thumb_path))
        } else {
            Ok(None)
        }
    }
}

/// Source file information from FFprobe.
#[derive(Debug, Clone)]
pub struct SourceInfo {
    /// Duration in seconds.
    pub duration: f64,
    /// Video width.
    pub width: u32,
    /// Video height.
    pub height: u32,
    /// Frame rate (fps).
    pub frame_rate: f64,
    /// Video codec.
    pub codec: String,
    /// Timecode (if present).
    pub timecode: Option<String>,
    /// Has audio.
    pub has_audio: bool,
    /// File size in bytes.
    pub file_size: u64,
}

/// Parse FFprobe JSON output.
fn parse_ffprobe_json(json_str: &str) -> Result<SourceInfo, GenerationError> {
    let json: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| GenerationError::ProbeFailed(format!("JSON parse error: {}", e)))?;

    // Get format info
    let format = json.get("format")
        .ok_or_else(|| GenerationError::ProbeFailed("No format info".to_string()))?;

    let duration: f64 = format
        .get("duration")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let file_size: u64 = format
        .get("size")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    // Find video stream
    let streams = json.get("streams")
        .and_then(|v| v.as_array())
        .ok_or_else(|| GenerationError::ProbeFailed("No streams info".to_string()))?;

    let video_stream = streams
        .iter()
        .find(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("video"))
        .ok_or_else(|| GenerationError::UnsupportedFormat("No video stream found".to_string()))?;

    let width = video_stream
        .get("width")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let height = video_stream
        .get("height")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let codec = video_stream
        .get("codec_name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    // Parse frame rate
    let frame_rate = video_stream
        .get("r_frame_rate")
        .and_then(|v| v.as_str())
        .and_then(|s| {
            let parts: Vec<&str> = s.split('/').collect();
            if parts.len() == 2 {
                let num: f64 = parts[0].parse().ok()?;
                let den: f64 = parts[1].parse().ok()?;
                if den > 0.0 { Some(num / den) } else { None }
            } else {
                s.parse().ok()
            }
        })
        .unwrap_or(24.0);

    // Check for timecode
    let timecode = video_stream
        .get("tags")
        .and_then(|t| t.get("timecode"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Check for audio stream
    let has_audio = streams
        .iter()
        .any(|s| s.get("codec_type").and_then(|v| v.as_str()) == Some("audio"));

    Ok(SourceInfo {
        duration,
        width,
        height,
        frame_rate,
        codec,
        timecode,
        has_audio,
        file_size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_ffmpeg() {
        // This test will pass if FFmpeg is installed
        let result = ProxyGenerator::check_ffmpeg();
        if result.is_ok() {
            let version = result.unwrap();
            assert!(version.contains("ffmpeg"));
        }
    }

    #[test]
    fn test_default_generator() {
        let gen = ProxyGenerator::default_generator();
        assert_eq!(gen.config.codec, super::super::config::ProxyCodec::H264);
        assert_eq!(gen.config.resolution, super::super::config::ProxyResolution::HD1080);
    }
}
