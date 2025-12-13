//! NLE project file parsers.
//!
//! Parsers for extracting media references from various NLE project files:
//! - Premiere Pro (.prproj) - Gzipped XML
//! - DaVinci Resolve (.drp) - Zip containing XML
//! - Final Cut Pro (.fcpxml) - Plain XML
//! - After Effects (.aep) - Binary with embedded paths

use std::collections::HashSet;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use flate2::read::GzDecoder;
use quick_xml::events::Event;
use quick_xml::Reader;
use regex::Regex;
use thiserror::Error;
use zip::ZipArchive;

/// Parser errors.
#[derive(Debug, Error)]
pub enum ParseError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("XML parse error: {0}")]
    Xml(String),

    #[error("Zip error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("Unsupported project type: {0}")]
    UnsupportedType(String),

    #[error("Invalid project file: {0}")]
    InvalidProject(String),
}

/// Type of NLE project file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectType {
    /// Adobe Premiere Pro (.prproj)
    PremierePro,
    /// DaVinci Resolve (.drp)
    DaVinciResolve,
    /// Final Cut Pro (.fcpxml)
    FinalCutPro,
    /// After Effects (.aep)
    AfterEffects,
    /// Unknown project type
    Unknown,
}

impl ProjectType {
    /// Detect project type from file extension.
    pub fn from_path(path: &Path) -> Self {
        match path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
            Some("prproj") => Self::PremierePro,
            Some("drp") => Self::DaVinciResolve,
            Some("fcpxml") => Self::FinalCutPro,
            Some("aep") => Self::AfterEffects,
            _ => Self::Unknown,
        }
    }

    /// Get human-readable name.
    pub fn name(&self) -> &'static str {
        match self {
            Self::PremierePro => "Premiere Pro",
            Self::DaVinciResolve => "DaVinci Resolve",
            Self::FinalCutPro => "Final Cut Pro",
            Self::AfterEffects => "After Effects",
            Self::Unknown => "Unknown",
        }
    }
}

/// A media reference found in a project file.
#[derive(Debug, Clone)]
pub struct MediaReference {
    /// Original path as stored in project file.
    pub original_path: String,
    /// Normalized path (resolved relative to project location).
    pub normalized_path: PathBuf,
    /// Whether the path is absolute.
    pub is_absolute: bool,
    /// Whether the file exists on disk.
    pub exists: bool,
    /// Media type hint (video, audio, image, project).
    pub media_type: MediaType,
}

/// Type of media reference.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaType {
    Video,
    Audio,
    Image,
    Project,
    Other,
}

impl MediaType {
    /// Detect media type from file extension.
    pub fn from_path(path: &Path) -> Self {
        match path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
            Some("mp4" | "mov" | "avi" | "mkv" | "mxf" | "m4v" | "webm" | "r3d" | "braw" | "arw") => Self::Video,
            Some("wav" | "mp3" | "aac" | "aiff" | "flac" | "ogg" | "m4a") => Self::Audio,
            Some("jpg" | "jpeg" | "png" | "tiff" | "tif" | "psd" | "exr" | "dpx" | "gif" | "bmp") => Self::Image,
            Some("prproj" | "drp" | "fcpxml" | "aep") => Self::Project,
            _ => Self::Other,
        }
    }
}

/// Result of parsing a project file.
#[derive(Debug)]
pub struct ParsedProject {
    /// Path to the project file.
    pub project_path: PathBuf,
    /// Type of project.
    pub project_type: ProjectType,
    /// Media references found.
    pub references: Vec<MediaReference>,
    /// Nested project references (for recursive dependency resolution).
    pub nested_projects: Vec<MediaReference>,
}

impl ParsedProject {
    /// Get all unique normalized paths.
    pub fn all_paths(&self) -> Vec<&PathBuf> {
        self.references.iter().map(|r| &r.normalized_path).collect()
    }

    /// Get missing files (files that don't exist on disk).
    pub fn missing_files(&self) -> Vec<&MediaReference> {
        self.references.iter().filter(|r| !r.exists).collect()
    }

    /// Get paths outside a given root directory.
    pub fn paths_outside_root(&self, root: &Path) -> Vec<&MediaReference> {
        self.references.iter().filter(|r| {
            !r.normalized_path.starts_with(root)
        }).collect()
    }
}

/// Trait for project file parsers.
pub trait ProjectParser {
    /// Parse a project file and extract media references.
    fn parse(&self, path: &Path) -> Result<ParsedProject, ParseError>;

    /// Check if this parser can handle the given file.
    fn can_parse(&self, path: &Path) -> bool;
}

/// Parse any supported project file.
pub fn parse_project(path: &Path) -> Result<ParsedProject, ParseError> {
    let project_type = ProjectType::from_path(path);

    match project_type {
        ProjectType::PremierePro => PremiereParser.parse(path),
        ProjectType::DaVinciResolve => ResolveParser.parse(path),
        ProjectType::FinalCutPro => FcpParser.parse(path),
        ProjectType::AfterEffects => AfterEffectsParser.parse(path),
        ProjectType::Unknown => Err(ParseError::UnsupportedType(
            path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("unknown")
                .to_string()
        )),
    }
}

// ============================================================================
// Premiere Pro Parser (.prproj - Gzipped XML)
// ============================================================================

/// Parser for Adobe Premiere Pro project files.
pub struct PremiereParser;

impl ProjectParser for PremiereParser {
    fn parse(&self, path: &Path) -> Result<ParsedProject, ParseError> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);

        // Premiere Pro files are gzip compressed
        let decoder = GzDecoder::new(reader);
        let mut xml_content = String::new();
        let mut buf_reader = BufReader::new(decoder);
        buf_reader.read_to_string(&mut xml_content)?;

        let project_dir = path.parent().unwrap_or(Path::new("."));
        let references = parse_premiere_xml(&xml_content, project_dir)?;

        let (nested, media): (Vec<_>, Vec<_>) = references
            .into_iter()
            .partition(|r| r.media_type == MediaType::Project);

        Ok(ParsedProject {
            project_path: path.to_path_buf(),
            project_type: ProjectType::PremierePro,
            references: media,
            nested_projects: nested,
        })
    }

    fn can_parse(&self, path: &Path) -> bool {
        ProjectType::from_path(path) == ProjectType::PremierePro
    }
}

/// Parse Premiere Pro XML content.
fn parse_premiere_xml(xml: &str, project_dir: &Path) -> Result<Vec<MediaReference>, ParseError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut references = HashSet::new();
    let mut buf = Vec::new();
    let mut in_file_path = false;
    let mut in_actual_media_file_path = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = e.name();
                let local_name = std::str::from_utf8(name.as_ref()).unwrap_or("");
                if local_name == "FilePath" || local_name == "ActualMediaFilePath" {
                    in_file_path = local_name == "FilePath";
                    in_actual_media_file_path = local_name == "ActualMediaFilePath";
                }
            }
            Ok(Event::Text(e)) => {
                if in_file_path || in_actual_media_file_path {
                    let path_str = e.unescape().map_err(|e| ParseError::Xml(e.to_string()))?;
                    let path_str = path_str.trim();
                    if !path_str.is_empty() {
                        references.insert(path_str.to_string());
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name = e.name();
                let local_name = std::str::from_utf8(name.as_ref()).unwrap_or("");
                if local_name == "FilePath" {
                    in_file_path = false;
                }
                if local_name == "ActualMediaFilePath" {
                    in_actual_media_file_path = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ParseError::Xml(format!("Error at position {}: {:?}", reader.error_position(), e))),
            _ => {}
        }
        buf.clear();
    }

    Ok(references
        .into_iter()
        .map(|p| create_media_reference(&p, project_dir))
        .collect())
}

// ============================================================================
// DaVinci Resolve Parser (.drp - Zip containing XML)
// ============================================================================

/// Parser for DaVinci Resolve project files.
pub struct ResolveParser;

impl ProjectParser for ResolveParser {
    fn parse(&self, path: &Path) -> Result<ParsedProject, ParseError> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);

        let mut archive = ZipArchive::new(reader)?;

        // Look for project.xml or similar
        let xml_content = find_and_read_xml_in_zip(&mut archive)?;

        let project_dir = path.parent().unwrap_or(Path::new("."));
        let references = parse_resolve_xml(&xml_content, project_dir)?;

        let (nested, media): (Vec<_>, Vec<_>) = references
            .into_iter()
            .partition(|r| r.media_type == MediaType::Project);

        Ok(ParsedProject {
            project_path: path.to_path_buf(),
            project_type: ProjectType::DaVinciResolve,
            references: media,
            nested_projects: nested,
        })
    }

    fn can_parse(&self, path: &Path) -> bool {
        ProjectType::from_path(path) == ProjectType::DaVinciResolve
    }
}

/// Find and read XML content from a Resolve .drp zip file.
fn find_and_read_xml_in_zip(archive: &mut ZipArchive<BufReader<File>>) -> Result<String, ParseError> {
    // Try common XML file names in Resolve projects
    let xml_names = ["project.xml", "Project.xml", "timeline.xml"];

    for name in &xml_names {
        if let Ok(mut file) = archive.by_name(name) {
            let mut content = String::new();
            file.read_to_string(&mut content)?;
            return Ok(content);
        }
    }

    // Fall back to finding any XML file
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name().ends_with(".xml") {
            let mut content = String::new();
            file.read_to_string(&mut content)?;
            return Ok(content);
        }
    }

    Err(ParseError::InvalidProject("No XML file found in .drp archive".to_string()))
}

/// Parse DaVinci Resolve XML content.
fn parse_resolve_xml(xml: &str, project_dir: &Path) -> Result<Vec<MediaReference>, ParseError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut references = HashSet::new();
    let mut buf = Vec::new();
    let mut capture_text = false;
    let mut current_element = String::new();

    // Elements that typically contain file paths in Resolve projects
    let path_elements = ["SysPath", "FilePath", "MediaPath", "ClipPath", "Source"];

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = e.name();
                let local_name = std::str::from_utf8(name.as_ref()).unwrap_or("");
                if path_elements.contains(&local_name) {
                    capture_text = true;
                    current_element = local_name.to_string();
                }

                // Also check for path attributes
                for attr in e.attributes().flatten() {
                    let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                    if key.to_lowercase().contains("path") || key.to_lowercase().contains("file") {
                        if let Ok(value) = attr.unescape_value() {
                            let value_str = value.trim();
                            if !value_str.is_empty() && looks_like_path(value_str) {
                                references.insert(value_str.to_string());
                            }
                        }
                    }
                }
            }
            Ok(Event::Text(e)) => {
                if capture_text {
                    let text = e.unescape().map_err(|e| ParseError::Xml(e.to_string()))?;
                    let text = text.trim();
                    if !text.is_empty() && looks_like_path(text) {
                        references.insert(text.to_string());
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name = e.name();
                let local_name = std::str::from_utf8(name.as_ref()).unwrap_or("");
                if local_name == current_element {
                    capture_text = false;
                    current_element.clear();
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ParseError::Xml(format!("Error at position {}: {:?}", reader.error_position(), e))),
            _ => {}
        }
        buf.clear();
    }

    Ok(references
        .into_iter()
        .map(|p| create_media_reference(&p, project_dir))
        .collect())
}

// ============================================================================
// Final Cut Pro Parser (.fcpxml - Plain XML)
// ============================================================================

/// Parser for Final Cut Pro project files.
pub struct FcpParser;

impl ProjectParser for FcpParser {
    fn parse(&self, path: &Path) -> Result<ParsedProject, ParseError> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        let mut xml_content = String::new();
        reader.read_to_string(&mut xml_content)?;

        let project_dir = path.parent().unwrap_or(Path::new("."));
        let references = parse_fcpxml(&xml_content, project_dir)?;

        let (nested, media): (Vec<_>, Vec<_>) = references
            .into_iter()
            .partition(|r| r.media_type == MediaType::Project);

        Ok(ParsedProject {
            project_path: path.to_path_buf(),
            project_type: ProjectType::FinalCutPro,
            references: media,
            nested_projects: nested,
        })
    }

    fn can_parse(&self, path: &Path) -> bool {
        ProjectType::from_path(path) == ProjectType::FinalCutPro
    }
}

/// Parse FCPXML content.
fn parse_fcpxml(xml: &str, project_dir: &Path) -> Result<Vec<MediaReference>, ParseError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut references = HashSet::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e) | Event::Empty(ref e)) => {
                // FCPXML uses 'src' attribute on asset and other elements
                for attr in e.attributes().flatten() {
                    let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                    if key == "src" || key == "ref" || key.contains("path") {
                        if let Ok(value) = attr.unescape_value() {
                            let value_str = value.trim();
                            // FCPXML often uses file:// URLs
                            let path_str = if value_str.starts_with("file://") {
                                decode_file_url(value_str)
                            } else {
                                value_str.to_string()
                            };
                            if !path_str.is_empty() && looks_like_path(&path_str) {
                                references.insert(path_str);
                            }
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ParseError::Xml(format!("Error at position {}: {:?}", reader.error_position(), e))),
            _ => {}
        }
        buf.clear();
    }

    Ok(references
        .into_iter()
        .map(|p| create_media_reference(&p, project_dir))
        .collect())
}

// ============================================================================
// After Effects Parser (.aep - Binary)
// ============================================================================

/// Parser for After Effects project files.
pub struct AfterEffectsParser;

impl ProjectParser for AfterEffectsParser {
    fn parse(&self, path: &Path) -> Result<ParsedProject, ParseError> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        let mut data = Vec::new();
        reader.read_to_end(&mut data)?;

        let project_dir = path.parent().unwrap_or(Path::new("."));
        let references = parse_aep_binary(&data, project_dir)?;

        let (nested, media): (Vec<_>, Vec<_>) = references
            .into_iter()
            .partition(|r| r.media_type == MediaType::Project);

        Ok(ParsedProject {
            project_path: path.to_path_buf(),
            project_type: ProjectType::AfterEffects,
            references: media,
            nested_projects: nested,
        })
    }

    fn can_parse(&self, path: &Path) -> bool {
        ProjectType::from_path(path) == ProjectType::AfterEffects
    }
}

/// Parse After Effects binary file for embedded paths.
fn parse_aep_binary(data: &[u8], project_dir: &Path) -> Result<Vec<MediaReference>, ParseError> {
    let mut references = HashSet::new();

    // Convert to string for regex matching (lossy, but AE paths are usually ASCII)
    let text = String::from_utf8_lossy(data);

    // Patterns for various path formats that might appear in AE files
    let patterns = [
        // Windows paths
        r"[A-Za-z]:\\[^\x00-\x1f\x7f-\xff]+?\.(mov|mp4|avi|wav|mp3|jpg|jpeg|png|tiff?|psd|ai|aep)",
        // Unix/Mac paths
        r"/(?:Users|Volumes|home|mnt)[^\x00-\x1f\x7f-\xff]+?\.(mov|mp4|avi|wav|mp3|jpg|jpeg|png|tiff?|psd|ai|aep)",
    ];

    for pattern in &patterns {
        if let Ok(re) = Regex::new(pattern) {
            for cap in re.find_iter(&text) {
                let path_str = cap.as_str().trim();
                if !path_str.is_empty() {
                    references.insert(path_str.to_string());
                }
            }
        }
    }

    Ok(references
        .into_iter()
        .map(|p| create_media_reference(&p, project_dir))
        .collect())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a MediaReference from a path string.
fn create_media_reference(path_str: &str, project_dir: &Path) -> MediaReference {
    let normalized = normalize_path(path_str, project_dir);
    let is_absolute = Path::new(path_str).is_absolute() ||
                      path_str.starts_with('/') ||
                      (path_str.len() > 2 && &path_str[1..2] == ":");
    let exists = normalized.exists();
    let media_type = MediaType::from_path(&normalized);

    MediaReference {
        original_path: path_str.to_string(),
        normalized_path: normalized,
        is_absolute,
        exists,
        media_type,
    }
}

/// Normalize a path (resolve relative paths, handle OS differences).
fn normalize_path(path_str: &str, project_dir: &Path) -> PathBuf {
    // Handle file:// URLs
    let path_str = if path_str.starts_with("file://") {
        decode_file_url(path_str)
    } else {
        path_str.to_string()
    };

    // Normalize separators
    let path_str = path_str.replace('\\', "/");

    let path = Path::new(&path_str);

    if path.is_absolute() {
        path.to_path_buf()
    } else {
        project_dir.join(path)
    }
}

/// Decode a file:// URL to a path.
fn decode_file_url(url: &str) -> String {
    let path = url
        .strip_prefix("file://localhost")
        .or_else(|| url.strip_prefix("file://"))
        .unwrap_or(url);

    // URL decode
    let mut result = String::new();
    let mut chars = path.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            }
        } else {
            result.push(c);
        }
    }
    result
}

/// Check if a string looks like a file path.
fn looks_like_path(s: &str) -> bool {
    // Must have some substance
    if s.len() < 3 {
        return false;
    }

    // Check for common path patterns
    let has_separator = s.contains('/') || s.contains('\\');
    let has_extension = s.contains('.') && s.rfind('.').map(|i| i < s.len() - 1).unwrap_or(false);
    let starts_like_path = s.starts_with('/') ||
                           s.starts_with("./") ||
                           s.starts_with("../") ||
                           (s.len() > 2 && &s[1..2] == ":") ||
                           s.starts_with("file://") ||
                           s.starts_with("Volumes/") ||
                           s.starts_with("Users/");

    // Exclude things that are clearly not paths
    let excluded = s.starts_with("http://") ||
                   s.starts_with("https://") ||
                   s.starts_with("data:") ||
                   s.contains('\n') ||
                   s.contains('\t');

    (has_separator || starts_like_path) && has_extension && !excluded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_type_detection() {
        assert_eq!(ProjectType::from_path(Path::new("project.prproj")), ProjectType::PremierePro);
        assert_eq!(ProjectType::from_path(Path::new("project.drp")), ProjectType::DaVinciResolve);
        assert_eq!(ProjectType::from_path(Path::new("project.fcpxml")), ProjectType::FinalCutPro);
        assert_eq!(ProjectType::from_path(Path::new("project.aep")), ProjectType::AfterEffects);
        assert_eq!(ProjectType::from_path(Path::new("project.txt")), ProjectType::Unknown);
    }

    #[test]
    fn test_media_type_detection() {
        assert_eq!(MediaType::from_path(Path::new("video.mp4")), MediaType::Video);
        assert_eq!(MediaType::from_path(Path::new("audio.wav")), MediaType::Audio);
        assert_eq!(MediaType::from_path(Path::new("image.png")), MediaType::Image);
        assert_eq!(MediaType::from_path(Path::new("project.prproj")), MediaType::Project);
    }

    #[test]
    fn test_looks_like_path() {
        assert!(looks_like_path("/Users/test/video.mp4"));
        assert!(looks_like_path("C:\\Users\\test\\video.mp4"));
        assert!(looks_like_path("./media/video.mp4"));
        assert!(looks_like_path("file:///Users/test/video.mp4"));
        assert!(!looks_like_path("http://example.com/video.mp4"));
        assert!(!looks_like_path("ab"));
    }

    #[test]
    fn test_file_url_decode() {
        assert_eq!(
            decode_file_url("file:///Users/test/My%20Video.mp4"),
            "/Users/test/My Video.mp4"
        );
    }
}
