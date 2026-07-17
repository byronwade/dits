//! Common utilities for formatting and display.

use std::{
    fs, io,
    path::{Path, PathBuf},
};

use bincode::Options;

/// Deserialize legacy bincode bytes with the same fixed-integer/trailing-byte
/// behavior as `bincode::deserialize`, but with an allocation-aware byte
/// limit. The limit protects callers from tiny hostile inputs that declare
/// enormous collection lengths without changing the existing wire encoding.
pub fn deserialize_bincode_with_limit<'a, T>(data: &'a [u8], limit: u64) -> bincode::Result<T>
where
    T: serde::Deserialize<'a>,
{
    bincode::DefaultOptions::new()
        .with_fixint_encoding()
        .allow_trailing_bytes()
        .with_limit(limit)
        .deserialize(data)
}

/// Normalize a user-supplied path into Dits' portable repository syntax.
///
/// Leading `./` components and one trailing slash are removed. Parent
/// traversal, absolute paths, the internal `.dits` directory, control
/// characters, Windows-incompatible separators, and ambiguous empty
/// components are rejected on every platform.
pub fn normalize_repo_input_path(path: &str) -> Result<String, String> {
    if path.is_empty() {
        return Err("path must not be empty".to_string());
    }

    let normalized = normalize_separators(path);
    if normalized.contains('\\') {
        return Err("backslashes are not portable repository path separators".to_string());
    }
    if normalized.starts_with('/') {
        return Err("absolute paths are not allowed".to_string());
    }

    let parts: Vec<&str> = normalized.split('/').collect();
    let mut canonical = Vec::with_capacity(parts.len());
    for (index, part) in parts.iter().enumerate() {
        if part.is_empty() {
            if index + 1 == parts.len() {
                continue;
            }
            return Err("empty path components are not allowed".to_string());
        }
        if *part == "." {
            continue;
        }
        if *part == ".." {
            return Err("parent-directory traversal is not allowed".to_string());
        }
        if part.contains(':') {
            return Err(
                "colon-containing paths are not portable across supported platforms".to_string()
            );
        }
        if part.chars().any(char::is_control) {
            return Err("control characters are not allowed in repository paths".to_string());
        }
        canonical.push(*part);
    }

    if canonical.is_empty() {
        return Ok(".".to_string());
    }
    if canonical[0].eq_ignore_ascii_case(".dits") {
        return Err("the internal .dits directory cannot be tracked".to_string());
    }

    Ok(canonical.join("/"))
}

/// Validate a path already stored in an index or manifest.
pub fn validate_repo_relative_path(path: &str) -> Result<(), String> {
    let normalized = normalize_repo_input_path(path)?;
    if normalized == "." {
        return Err("a stored path must identify a file, not the repository root".to_string());
    }
    if normalized != path {
        return Err("stored path is not in canonical repository form".to_string());
    }
    Ok(())
}

/// Resolve a validated repository path without following an existing symlink
/// out of the working tree.
///
/// This is a defense-in-depth preflight for local filesystem operations. It
/// rejects symlinks in every existing component and verifies canonical
/// ancestors remain below `root` before a caller creates or writes anything.
pub fn safe_join_repo_path(root: &Path, path: &str) -> io::Result<PathBuf> {
    validate_repo_relative_path(path)
        .map_err(|reason| io::Error::new(io::ErrorKind::InvalidInput, reason))?;

    let canonical_root = root.canonicalize()?;
    let mut candidate = canonical_root.clone();

    for component in path.split('/') {
        candidate.push(component);
        match fs::symlink_metadata(&candidate) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        format!("path crosses symbolic link: {}", candidate.display()),
                    ));
                }
                let resolved = candidate.canonicalize()?;
                if !resolved.starts_with(&canonical_root) {
                    return Err(io::Error::new(
                        io::ErrorKind::PermissionDenied,
                        "path resolves outside the repository",
                    ));
                }
            },
            Err(error) if error.kind() == io::ErrorKind::NotFound => break,
            Err(error) => return Err(error),
        }
    }

    Ok(canonical_root.join(path))
}

/// Normalize a repository-relative path's separators to forward slashes.
///
/// Dits stores repository-relative paths with `/` on every platform (the same
/// convention Git uses), so manifests, indexes, and the content/commit hashes
/// derived from them are byte-for-byte identical across Windows and Unix, and a
/// repository created on one platform checks out correctly on the other.
///
/// On Unix this is a no-op: `/` is already the separator, and a literal `\` is
/// a valid filename character that must be preserved. On Windows the `\` that
/// `Path`/`strip_prefix` produce are path separators and are rewritten to `/`.
pub fn normalize_separators(path: &str) -> String {
    #[cfg(windows)]
    {
        path.replace('\\', "/")
    }
    #[cfg(not(windows))]
    {
        path.to_string()
    }
}

#[cfg(test)]
mod path_tests {
    #[cfg(unix)]
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn repository_paths_are_normalized_and_confined() {
        assert_eq!(normalize_repo_input_path("./media/shot.mov/").unwrap(), "media/shot.mov");
        assert_eq!(normalize_repo_input_path(".").unwrap(), ".");
        assert_eq!(normalize_repo_input_path("./").unwrap(), ".");

        for invalid in ["../outside", "/absolute", "C:/outside", "media//shot.mov", ".dits/HEAD"] {
            assert!(normalize_repo_input_path(invalid).is_err(), "accepted {invalid}");
        }

        // On Unix a backslash is a literal, non-portable filename character.
        // On Windows it is a native separator and is normalized to `/`.
        #[cfg(not(windows))]
        assert!(normalize_repo_input_path("media\\shot.mov").is_err());

        #[cfg(windows)]
        assert_eq!(normalize_repo_input_path("media\\shot.mov").unwrap(), "media/shot.mov");
    }

    #[cfg(unix)]
    #[test]
    fn safe_join_rejects_symlink_ancestors() {
        use std::os::unix::fs::symlink;

        let root = tempdir().unwrap();
        let outside = tempdir().unwrap();
        symlink(outside.path(), root.path().join("escape")).unwrap();

        assert!(safe_join_repo_path(root.path(), "escape/file.bin").is_err());
    }

    #[test]
    fn bounded_bincode_keeps_legacy_encoding_and_rejects_oversized_values() {
        let value = vec![7u8; 32];
        let mut encoded = bincode::serialize(&value).unwrap();

        assert_eq!(deserialize_bincode_with_limit::<Vec<u8>>(&encoded, 1024).unwrap(), value);
        assert!(deserialize_bincode_with_limit::<Vec<u8>>(&encoded, 8).is_err());

        // `bincode::deserialize` historically accepts trailing bytes. Keep
        // that compatibility behavior while adding the allocation limit.
        encoded.extend_from_slice(b"legacy trailing bytes");
        assert_eq!(deserialize_bincode_with_limit::<Vec<u8>>(&encoded, 1024).unwrap(), value);

        let mut hostile = bincode::serialize(&Vec::<u8>::new()).unwrap();
        hostile[..std::mem::size_of::<u64>()].copy_from_slice(&u64::MAX.to_le_bytes());
        assert!(deserialize_bincode_with_limit::<Vec<u8>>(&hostile, 1024).is_err());
    }
}

/// Format bytes as human-readable string with consistent formatting.
/// Uses 2 decimal places for MB/GB, 0 for KB/bytes for consistency.
pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.2} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.0} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Format bytes as human-readable string with short units (GiB, MiB, etc.)
/// Used for storage stats where binary units are preferred.
pub fn format_bytes_short(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.1} TiB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.1} GiB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MiB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KiB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Format percentage with consistent precision.
pub fn format_percentage(value: f64) -> String {
    format!("{:.1}%", value)
}

/// Safely calculate percentage to avoid division by zero.
pub fn safe_percentage(numerator: u64, denominator: u64) -> f64 {
    if denominator == 0 {
        0.0
    } else {
        (numerator as f64 / denominator as f64) * 100.0
    }
}

/// Format file size change with clear before/after display.
/// Shows: "37.9 MB → 28.0 MB (-9.9 MB)"
pub fn format_size_change(current_size: u64, previous_size: u64) -> String {
    let current = format_bytes(current_size);
    let previous = format_bytes(previous_size);

    if current_size > previous_size {
        let diff = format_bytes(current_size - previous_size);
        format!("{} → {} (+{})", previous, current, diff)
    } else if current_size < previous_size {
        let diff = format_bytes(previous_size - current_size);
        format!("{} → {} (-{})", previous, current, diff)
    } else {
        format!("{} (unchanged)", current)
    }
}

/// Format file size change as a simple diff (for compact displays).
/// Shows: "+1.2 MB" or "-5.7 MB" or "~"
pub fn format_size_diff(current_size: u64, previous_size: u64) -> String {
    if current_size > previous_size {
        format!("+{}", format_bytes(current_size - previous_size))
    } else if current_size < previous_size {
        format!("-{}", format_bytes(previous_size - current_size))
    } else {
        "~".to_string()
    }
}
