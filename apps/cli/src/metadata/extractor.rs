//! Metadata extractors for different file types.

use super::FileMetadata;
use serde_json::Value;
use std::path::Path;
use std::process::Command;

/// Trait for extracting metadata from files.
pub trait MetadataExtractor: Send + Sync {
    /// Name of this extractor.
    fn name(&self) -> &'static str;

    /// Check if this extractor supports the given file.
    fn supports(&self, path: &Path, mime: Option<&str>) -> bool;

    /// Extract metadata from the file.
    fn extract(&self, path: &Path) -> Result<FileMetadata, String>;
}

/// Basic file extractor - works for all files, provides minimal info.
pub struct BasicFileExtractor;

impl BasicFileExtractor {
    /// Guess MIME type from file extension.
    fn guess_mime(path: &Path) -> String {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        match ext.as_str() {
            // Video
            "mp4" | "m4v" => "video/mp4",
            "mov" => "video/quicktime",
            "avi" => "video/x-msvideo",
            "mkv" => "video/x-matroska",
            "webm" => "video/webm",
            "wmv" => "video/x-ms-wmv",
            "flv" => "video/x-flv",
            "mxf" => "application/mxf",
            "3gp" => "video/3gpp",

            // Audio
            "mp3" => "audio/mpeg",
            "wav" => "audio/wav",
            "flac" => "audio/flac",
            "aac" => "audio/aac",
            "ogg" => "audio/ogg",
            "m4a" => "audio/mp4",
            "wma" => "audio/x-ms-wma",

            // Images
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "bmp" => "image/bmp",
            "tiff" | "tif" => "image/tiff",
            "svg" => "image/svg+xml",
            "ico" => "image/x-icon",
            "heic" | "heif" => "image/heic",

            // RAW photos
            "cr2" => "image/x-canon-cr2",
            "cr3" => "image/x-canon-cr3",
            "nef" => "image/x-nikon-nef",
            "arw" => "image/x-sony-arw",
            "dng" => "image/x-adobe-dng",
            "raf" => "image/x-fuji-raf",
            "rw2" => "image/x-panasonic-rw2",
            "orf" => "image/x-olympus-orf",

            // Documents
            "pdf" => "application/pdf",
            "doc" => "application/msword",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls" => "application/vnd.ms-excel",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "ppt" => "application/vnd.ms-powerpoint",
            "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",

            // Project files
            "prproj" => "application/x-premiere-project",
            "aep" => "application/x-aftereffects-project",
            "drp" => "application/x-davinci-resolve-project",
            "fcpxml" => "application/x-finalcut-project",

            // Text
            "txt" => "text/plain",
            "md" => "text/markdown",
            "json" => "application/json",
            "xml" => "application/xml",
            "html" | "htm" => "text/html",
            "css" => "text/css",
            "js" => "application/javascript",

            _ => "application/octet-stream",
        }
        .to_string()
    }

    /// Guess content type from MIME.
    fn content_type_from_mime(mime: &str) -> &'static str {
        if mime.starts_with("video/") {
            "video"
        } else if mime.starts_with("audio/") {
            "audio"
        } else if mime.starts_with("image/") {
            "photo"
        } else if mime.starts_with("text/") {
            "text"
        } else if mime.contains("project") {
            "project"
        } else {
            "file"
        }
    }
}

impl MetadataExtractor for BasicFileExtractor {
    fn name(&self) -> &'static str {
        "basic"
    }

    fn supports(&self, _path: &Path, _mime: Option<&str>) -> bool {
        true // Supports all files as a fallback
    }

    fn extract(&self, path: &Path) -> Result<FileMetadata, String> {
        let mime = Self::guess_mime(path);
        let content_type = Self::content_type_from_mime(&mime);

        let mut metadata = FileMetadata::new(content_type, &mime);

        // Add file size
        if let Ok(meta) = std::fs::metadata(path) {
            metadata = metadata.with_extra("size", Value::Number(meta.len().into()));
        }

        // Add extension
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            metadata = metadata.with_extra("extension", Value::String(ext.to_lowercase()));
        }

        Ok(metadata)
    }
}

/// Video metadata extractor using ffprobe.
pub struct VideoFFprobeExtractor;

impl VideoFFprobeExtractor {
    /// Check if ffprobe is available.
    pub fn is_available() -> bool {
        Command::new("ffprobe")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Video file extensions.
    fn is_video_extension(ext: &str) -> bool {
        matches!(
            ext.to_lowercase().as_str(),
            "mp4" | "m4v" | "mov" | "avi" | "mkv" | "webm" | "wmv" | "flv" | "mxf" | "3gp" | "ts" | "m2ts" | "mts"
        )
    }
}

impl MetadataExtractor for VideoFFprobeExtractor {
    fn name(&self) -> &'static str {
        "ffprobe"
    }

    fn supports(&self, path: &Path, mime: Option<&str>) -> bool {
        // Check by MIME type first
        if let Some(m) = mime {
            if m.starts_with("video/") {
                return Self::is_available();
            }
        }

        // Check by extension
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if Self::is_video_extension(ext) {
                return Self::is_available();
            }
        }

        false
    }

    fn extract(&self, path: &Path) -> Result<FileMetadata, String> {
        // Run ffprobe to get JSON metadata
        let output = Command::new("ffprobe")
            .args([
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
            ])
            .arg(path)
            .output()
            .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "ffprobe failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let json: Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

        // Extract format info
        let format = json.get("format").ok_or("No format info")?;
        let duration = format
            .get("duration")
            .and_then(|d| d.as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);

        let mime = BasicFileExtractor::guess_mime(path);

        // Find video stream
        let streams = json.get("streams").and_then(|s| s.as_array());
        let video_stream = streams.and_then(|arr| {
            arr.iter().find(|s| {
                s.get("codec_type")
                    .and_then(|t| t.as_str())
                    .map(|t| t == "video")
                    .unwrap_or(false)
            })
        });

        let (width, height, codec) = if let Some(vs) = video_stream {
            let w = vs.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let h = vs.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let c = vs
                .get("codec_name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            (w, h, c)
        } else {
            (0, 0, "unknown".to_string())
        };

        let mut metadata = FileMetadata::video(&mime, duration, width, height, &codec);

        // Add audio info
        let audio_stream = streams.and_then(|arr| {
            arr.iter().find(|s| {
                s.get("codec_type")
                    .and_then(|t| t.as_str())
                    .map(|t| t == "audio")
                    .unwrap_or(false)
            })
        });
        metadata = metadata.with_extra("has_audio", Value::Bool(audio_stream.is_some()));

        // Add bitrate
        if let Some(br) = format.get("bit_rate").and_then(|b| b.as_str()).and_then(|s| s.parse::<u64>().ok()) {
            metadata = metadata.with_extra("bitrate", Value::Number(br.into()));
        }

        // Add frame rate
        if let Some(vs) = video_stream {
            if let Some(fps_str) = vs.get("r_frame_rate").and_then(|f| f.as_str()) {
                // Parse "30/1" or "30000/1001" format
                let parts: Vec<&str> = fps_str.split('/').collect();
                if parts.len() == 2 {
                    if let (Ok(num), Ok(den)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                        if den > 0.0 {
                            let fps = num / den;
                            metadata = metadata.with_extra(
                                "frame_rate",
                                Value::Number(serde_json::Number::from_f64(fps).unwrap_or(serde_json::Number::from(0))),
                            );
                        }
                    }
                }
            }
        }

        Ok(metadata)
    }
}

/// Photo metadata extractor using exiftool or image crate.
pub struct PhotoExifExtractor;

impl PhotoExifExtractor {
    /// Check if exiftool is available.
    pub fn is_exiftool_available() -> bool {
        Command::new("exiftool")
            .arg("-ver")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Photo file extensions.
    fn is_photo_extension(ext: &str) -> bool {
        matches!(
            ext.to_lowercase().as_str(),
            "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "tiff" | "tif" | "heic" | "heif" |
            "cr2" | "cr3" | "nef" | "arw" | "dng" | "raf" | "rw2" | "orf"
        )
    }
}

impl MetadataExtractor for PhotoExifExtractor {
    fn name(&self) -> &'static str {
        "exif"
    }

    fn supports(&self, path: &Path, mime: Option<&str>) -> bool {
        // Check by MIME type first
        if let Some(m) = mime {
            if m.starts_with("image/") {
                return Self::is_exiftool_available();
            }
        }

        // Check by extension
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if Self::is_photo_extension(ext) {
                return Self::is_exiftool_available();
            }
        }

        false
    }

    fn extract(&self, path: &Path) -> Result<FileMetadata, String> {
        // Run exiftool to get JSON metadata
        let output = Command::new("exiftool")
            .args(["-json", "-n"]) // -n for numeric values
            .arg(path)
            .output()
            .map_err(|e| format!("Failed to run exiftool: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "exiftool failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let json: Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse exiftool output: {}", e))?;

        // exiftool returns an array
        let info = json
            .as_array()
            .and_then(|arr| arr.first())
            .ok_or("No metadata returned")?;

        let width = info
            .get("ImageWidth")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;
        let height = info
            .get("ImageHeight")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let mime = BasicFileExtractor::guess_mime(path);
        let mut metadata = FileMetadata::photo(&mime, width, height);

        // Camera model
        if let Some(model) = info.get("Model").and_then(|v| v.as_str()) {
            metadata = metadata.with_extra("camera_model", Value::String(model.to_string()));
        }

        // Make
        if let Some(make) = info.get("Make").and_then(|v| v.as_str()) {
            metadata = metadata.with_extra("camera_make", Value::String(make.to_string()));
        }

        // ISO
        if let Some(iso) = info.get("ISO").and_then(|v| v.as_u64()) {
            metadata = metadata.with_extra("iso", Value::Number(iso.into()));
        }

        // Exposure time
        if let Some(exp) = info.get("ExposureTime") {
            if let Some(exp_str) = exp.as_str() {
                metadata = metadata.with_extra("exposure", Value::String(exp_str.to_string()));
            } else if let Some(exp_num) = exp.as_f64() {
                metadata = metadata.with_extra("exposure", Value::String(format!("{}", exp_num)));
            }
        }

        // F-number
        if let Some(f) = info.get("FNumber").and_then(|v| v.as_f64()) {
            metadata = metadata.with_extra(
                "f_number",
                Value::Number(serde_json::Number::from_f64(f).unwrap_or(serde_json::Number::from(0))),
            );
        }

        // Focal length
        if let Some(fl) = info.get("FocalLength").and_then(|v| v.as_f64()) {
            metadata = metadata.with_extra(
                "focal_length",
                Value::Number(serde_json::Number::from_f64(fl).unwrap_or(serde_json::Number::from(0))),
            );
        }

        // Date taken
        if let Some(date) = info.get("DateTimeOriginal").and_then(|v| v.as_str()) {
            metadata = metadata.with_extra("date_taken", Value::String(date.to_string()));
        }

        // GPS coordinates
        if let (Some(lat), Some(lon)) = (
            info.get("GPSLatitude").and_then(|v| v.as_f64()),
            info.get("GPSLongitude").and_then(|v| v.as_f64()),
        ) {
            metadata = metadata.with_extra(
                "gps_latitude",
                Value::Number(serde_json::Number::from_f64(lat).unwrap_or(serde_json::Number::from(0))),
            );
            metadata = metadata.with_extra(
                "gps_longitude",
                Value::Number(serde_json::Number::from_f64(lon).unwrap_or(serde_json::Number::from(0))),
            );
        }

        Ok(metadata)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_basic_extractor_supports_all() {
        let extractor = BasicFileExtractor;
        assert!(extractor.supports(Path::new("test.txt"), None));
        assert!(extractor.supports(Path::new("video.mp4"), Some("video/mp4")));
    }

    #[test]
    fn test_mime_guessing() {
        assert_eq!(BasicFileExtractor::guess_mime(Path::new("video.mp4")), "video/mp4");
        assert_eq!(BasicFileExtractor::guess_mime(Path::new("photo.jpg")), "image/jpeg");
        assert_eq!(BasicFileExtractor::guess_mime(Path::new("unknown.xyz")), "application/octet-stream");
    }

    #[test]
    fn test_content_type_from_mime() {
        assert_eq!(BasicFileExtractor::content_type_from_mime("video/mp4"), "video");
        assert_eq!(BasicFileExtractor::content_type_from_mime("image/jpeg"), "photo");
        assert_eq!(BasicFileExtractor::content_type_from_mime("audio/mp3"), "audio");
    }
}
