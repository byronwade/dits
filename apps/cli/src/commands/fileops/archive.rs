//! Archive command - Create archives from repository content.

use std::{
    fs::{self, File},
    io::{BufWriter, Write},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};

use crate::{
    store::Repository,
    util::{normalize_repo_input_path, validate_repo_relative_path},
};

/// Archive format
#[derive(Debug, Clone, Copy)]
pub enum ArchiveFormat {
    Tar,
    TarGz,
    Zip,
}

impl ArchiveFormat {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "tar" => Some(Self::Tar),
            "tar.gz" | "tgz" => Some(Self::TarGz),
            "zip" => Some(Self::Zip),
            _ => None,
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            Self::Tar => ".tar",
            Self::TarGz => ".tar.gz",
            Self::Zip => ".zip",
        }
    }
}

/// Options for archive command
pub struct ArchiveOptions {
    /// Output format
    pub format:   ArchiveFormat,
    /// Commit/branch/tag to archive
    pub tree_ish: String,
    /// Prefix to add to all paths
    pub prefix:   Option<String>,
    /// Output file (None = stdout, except for binary formats)
    pub output:   Option<PathBuf>,
    /// Specific paths to include
    pub paths:    Vec<String>,
}

/// Validated archive member naming and selection options.
///
/// Archive readers commonly extract paths verbatim, so both user-controlled
/// prefixes and selectors are normalized before the output file is created.
struct ArchivePaths {
    prefix:    Option<String>,
    selectors: Vec<String>,
}

impl ArchivePaths {
    fn from_options(options: &ArchiveOptions) -> Result<Self> {
        let prefix = options
            .prefix
            .as_deref()
            .map(|prefix| {
                normalize_repo_input_path(prefix).map_err(|reason| {
                    anyhow::anyhow!("Invalid archive prefix '{}': {}", prefix, reason)
                })
            })
            .transpose()?
            .filter(|prefix| prefix != ".");

        let selectors = options
            .paths
            .iter()
            .map(|selector| {
                normalize_repo_input_path(selector).map_err(|reason| {
                    anyhow::anyhow!("Invalid archive path '{}': {}", selector, reason)
                })
            })
            .collect::<Result<Vec<_>>>()?;

        Ok(Self { prefix, selectors })
    }

    fn includes(&self, path: &str) -> bool {
        self.selectors.is_empty()
            || self.selectors.iter().any(|selector| {
                selector == "."
                    || path == selector
                    || matches!(
                        path.strip_prefix(selector),
                        Some(remainder) if remainder.starts_with('/')
                    )
            })
    }

    fn member_path(&self, path: &str) -> Result<String> {
        let member = match &self.prefix {
            Some(prefix) => format!("{prefix}/{path}"),
            None => path.to_string(),
        };
        validate_repo_relative_path(&member).map_err(|reason| {
            anyhow::anyhow!("Unsafe archive member path '{}': {}", member, reason)
        })?;
        Ok(member)
    }
}

/// Create an archive from repository content
pub fn archive(options: &ArchiveOptions) -> Result<PathBuf> {
    let repo = Repository::open(Path::new(".")).context("Not in a dits repository")?;

    // Validate names before creating or truncating the output file.
    let archive_paths = ArchivePaths::from_options(options)?;

    // Resolve the tree-ish to a commit (handles HEAD, HEAD~N, branches, tags, and
    // full/short hashes — resolve_ref alone does not understand the HEAD symbolic
    // ref).
    let commit_hash = repo
        .resolve_ref_or_prefix(&options.tree_ish)?
        .with_context(|| format!("Cannot resolve '{}' to a commit", options.tree_ish))?;

    let commit = repo.load_commit(&commit_hash)?;
    let manifest = repo.load_manifest(&commit.manifest)?;

    // Resolve every selected source and member name before touching the output
    // file. Besides clearer errors, this prevents a late symlink escape from
    // leaving behind a partially written archive.
    for (path, _) in manifest.iter() {
        if archive_paths.includes(path) {
            archive_paths.member_path(path)?;
            repo.resolve_worktree_path(path)?;
        }
    }

    // Determine output path
    let output_path = match &options.output {
        Some(p) => p.clone(),
        None => {
            let name =
                format!("{}{}", options.tree_ish.replace('/', "-"), options.format.extension());
            PathBuf::from(name)
        },
    };

    // Create archive
    match options.format {
        ArchiveFormat::Zip => create_zip_archive(&repo, &manifest, &archive_paths, &output_path)?,
        ArchiveFormat::Tar => {
            create_tar_archive(&repo, &manifest, &archive_paths, &output_path, false)?
        },
        ArchiveFormat::TarGz => {
            create_tar_archive(&repo, &manifest, &archive_paths, &output_path, true)?
        },
    }

    println!("Created archive: {}", output_path.display());
    Ok(output_path)
}

fn create_zip_archive(
    repo: &Repository,
    manifest: &crate::core::Manifest,
    archive_paths: &ArchivePaths,
    output_path: &Path,
) -> Result<()> {
    use zip::{write::SimpleFileOptions, ZipWriter};

    let file = File::create(output_path)?;
    let mut zip = ZipWriter::new(BufWriter::new(file));

    let zip_options =
        SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for (path, _entry) in manifest.iter() {
        if !archive_paths.includes(path) {
            continue;
        }

        let archive_path = archive_paths.member_path(path)?;

        // Read file content from disk
        let file_path = repo.resolve_worktree_path(path)?;
        if !file_path.exists() {
            continue; // Skip files not in working tree
        }
        let content = fs::read(&file_path)?;

        // Add to zip
        zip.start_file(&archive_path, zip_options)?;
        zip.write_all(&content)?;
    }

    zip.finish()?;
    Ok(())
}

fn create_tar_archive(
    repo: &Repository,
    manifest: &crate::core::Manifest,
    archive_paths: &ArchivePaths,
    output_path: &Path,
    compress: bool,
) -> Result<()> {
    let file = File::create(output_path)?;

    if compress {
        let encoder =
            flate2::write::GzEncoder::new(BufWriter::new(file), flate2::Compression::default());
        write_tar(repo, manifest, archive_paths, encoder)?;
    } else {
        write_tar(repo, manifest, archive_paths, BufWriter::new(file))?;
    }

    Ok(())
}

fn write_tar<W: Write>(
    repo: &Repository,
    manifest: &crate::core::Manifest,
    archive_paths: &ArchivePaths,
    writer: W,
) -> Result<()> {
    let mut tar = tar::Builder::new(writer);

    for (path, entry) in manifest.iter() {
        if !archive_paths.includes(path) {
            continue;
        }

        let archive_path = archive_paths.member_path(path)?;

        // Read file content from disk
        let file_path = repo.resolve_worktree_path(path)?;
        if !file_path.exists() {
            continue; // Skip files not in working tree
        }
        let content = fs::read(&file_path)?;

        // Create header
        let mut header = tar::Header::new_gnu();
        header.set_path(&archive_path)?;
        header.set_size(content.len() as u64);
        let mode = match entry.mode {
            crate::core::FileMode::Regular => 0o644,
            crate::core::FileMode::Executable => 0o755,
            crate::core::FileMode::Symlink => 0o777,
        };
        header.set_mode(mode);
        header.set_cksum();

        // Add to tar
        tar.append(&header, content.as_slice())?;
    }

    tar.finish()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_format_parsing() {
        assert!(matches!(ArchiveFormat::from_str("zip"), Some(ArchiveFormat::Zip)));
        assert!(matches!(ArchiveFormat::from_str("tar"), Some(ArchiveFormat::Tar)));
        assert!(matches!(ArchiveFormat::from_str("tar.gz"), Some(ArchiveFormat::TarGz)));
        assert!(ArchiveFormat::from_str("unknown").is_none());
    }

    #[test]
    fn test_archive_extension() {
        assert_eq!(ArchiveFormat::Zip.extension(), ".zip");
        assert_eq!(ArchiveFormat::TarGz.extension(), ".tar.gz");
    }

    #[test]
    fn archive_paths_are_confined_and_component_aware() {
        let options = ArchiveOptions {
            format:   ArchiveFormat::Zip,
            tree_ish: "HEAD".to_string(),
            prefix:   Some("./release/".to_string()),
            output:   None,
            paths:    vec!["src".to_string()],
        };
        let paths = ArchivePaths::from_options(&options).unwrap();

        assert!(paths.includes("src/main.rs"));
        assert!(!paths.includes("src-old/main.rs"));
        assert_eq!(paths.member_path("src/main.rs").unwrap(), "release/src/main.rs");

        for prefix in ["../escape", "/absolute", "safe/../../escape"] {
            let options = ArchiveOptions {
                format:   ArchiveFormat::Tar,
                tree_ish: "HEAD".to_string(),
                prefix:   Some(prefix.to_string()),
                output:   None,
                paths:    Vec::new(),
            };
            assert!(ArchivePaths::from_options(&options).is_err());
        }

        for selector in ["../escape", "/absolute", "safe/../../escape"] {
            let options = ArchiveOptions {
                format:   ArchiveFormat::Tar,
                tree_ish: "HEAD".to_string(),
                prefix:   None,
                output:   None,
                paths:    vec![selector.to_string()],
            };
            assert!(ArchivePaths::from_options(&options).is_err());
        }
    }
}
