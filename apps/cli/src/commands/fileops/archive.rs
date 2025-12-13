//! Archive command - Create archives from repository content.

use anyhow::{Context, Result};
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

use crate::store::Repository;

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
    pub format: ArchiveFormat,
    /// Commit/branch/tag to archive
    pub tree_ish: String,
    /// Prefix to add to all paths
    pub prefix: Option<String>,
    /// Output file (None = stdout, except for binary formats)
    pub output: Option<PathBuf>,
    /// Specific paths to include
    pub paths: Vec<String>,
}

/// Create an archive from repository content
pub fn archive(options: &ArchiveOptions) -> Result<PathBuf> {
    let repo = Repository::open(Path::new("."))
        .context("Not in a dits repository")?;
    
    // Resolve the tree-ish to a commit
    let commit_hash = repo.resolve_ref(&options.tree_ish)?
        .with_context(|| format!("Cannot resolve '{}' to a commit", options.tree_ish))?;
    
    let commit = repo.load_commit(&commit_hash)?;
    let manifest = repo.load_manifest(&commit.manifest)?;
    
    // Determine output path
    let output_path = match &options.output {
        Some(p) => p.clone(),
        None => {
            let name = format!("{}{}", options.tree_ish.replace('/', "-"), options.format.extension());
            PathBuf::from(name)
        }
    };
    
    // Create archive
    match options.format {
        ArchiveFormat::Zip => create_zip_archive(&repo, &manifest, &options, &output_path)?,
        ArchiveFormat::Tar => create_tar_archive(&repo, &manifest, &options, &output_path, false)?,
        ArchiveFormat::TarGz => create_tar_archive(&repo, &manifest, &options, &output_path, true)?,
    }
    
    println!("Created archive: {}", output_path.display());
    Ok(output_path)
}

fn create_zip_archive(
    repo: &Repository,
    manifest: &crate::core::Manifest,
    options: &ArchiveOptions,
    output_path: &Path,
) -> Result<()> {
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;
    
    let file = File::create(output_path)?;
    let mut zip = ZipWriter::new(BufWriter::new(file));
    
    let zip_options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    let repo_root = repo.root();
    
    for (path, _entry) in manifest.iter() {
        // Filter by paths if specified
        if !options.paths.is_empty() {
            let matches = options.paths.iter().any(|p| path.starts_with(p));
            if !matches {
                continue;
            }
        }
        
        // Build archive path with prefix
        let archive_path = match &options.prefix {
            Some(prefix) => format!("{}/{}", prefix.trim_end_matches('/'), path),
            None => path.clone(),
        };
        
        // Read file content from disk
        let file_path = repo_root.join(path);
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
    options: &ArchiveOptions,
    output_path: &Path,
    compress: bool,
) -> Result<()> {
    let file = File::create(output_path)?;
    
    if compress {
        let encoder = flate2::write::GzEncoder::new(BufWriter::new(file), flate2::Compression::default());
        write_tar(repo, manifest, options, encoder)?;
    } else {
        write_tar(repo, manifest, options, BufWriter::new(file))?;
    }
    
    Ok(())
}

fn write_tar<W: Write>(
    repo: &Repository,
    manifest: &crate::core::Manifest,
    options: &ArchiveOptions,
    writer: W,
) -> Result<()> {
    let mut tar = tar::Builder::new(writer);
    let repo_root = repo.root();
    
    for (path, entry) in manifest.iter() {
        // Filter by paths if specified
        if !options.paths.is_empty() {
            let matches = options.paths.iter().any(|p| path.starts_with(p));
            if !matches {
                continue;
            }
        }
        
        // Build archive path with prefix
        let archive_path = match &options.prefix {
            Some(prefix) => format!("{}/{}", prefix.trim_end_matches('/'), path),
            None => path.clone(),
        };
        
        // Read file content from disk
        let file_path = repo_root.join(path);
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
}
