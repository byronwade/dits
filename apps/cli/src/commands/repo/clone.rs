//! Clone command - clone a repository from a source.

use std::{
    fs, io,
    path::{Path, PathBuf},
};

use anyhow::{bail, Context, Result};

use crate::{
    config::Config,
    core::Hash,
    store::{
        remote::{Remote, RemoteStore, RemoteType},
        validate_ref_name, HeadRef, Repository,
    },
};

/// Clone a repository.
///
/// Currently supports local clones. Network clones will be added in future.
pub fn clone(source: &str, dest: Option<&str>, branch: Option<&str>) -> Result<()> {
    let source_type = RemoteType::parse(source);

    match source_type {
        RemoteType::Local(source_path) => clone_local(&source_path, dest, branch),
        RemoteType::Http(url) | RemoteType::Dits(url) | RemoteType::Ssh(url) => {
            bail!(
                "Network cloning not yet implemented.\nURL: {}\n\nFor now, use local paths or \
                 copy the repository manually.",
                url
            )
        },
    }
}

#[derive(Debug)]
struct RefSnapshot {
    head:     HeadRef,
    branches: Vec<(String, Hash)>,
    tags:     Vec<(String, Hash)>,
}

#[derive(Debug)]
enum CloneTarget {
    Branch { name: String, hash: Hash },
    Detached { hash: Hash },
    UnbornBranch { name: String },
}

impl CloneTarget {
    fn description(&self) -> String {
        match self {
            Self::Branch { name, .. } => format!("branch '{name}'"),
            Self::Detached { hash } => format!("detached commit {}", hash.short()),
            Self::UnbornBranch { name } => format!("unborn branch '{name}'"),
        }
    }
}

/// Clone a local repository.
fn clone_local(source: &Path, dest: Option<&str>, branch: Option<&str>) -> Result<()> {
    let current_dir = std::env::current_dir()?;
    let requested_source = if source.is_absolute() {
        source.to_path_buf()
    } else {
        current_dir.join(source)
    };
    let canonical_source = requested_source.canonicalize().with_context(|| {
        format!("Could not resolve clone source {}", requested_source.display())
    })?;

    // Opening through Repository validates repository-local configuration and
    // rejects unsupported encrypted repositories without mutating the source.
    let source_repo = Repository::open_read_only(&canonical_source).with_context(|| {
        format!("Source is not a readable Dits repository: {}", canonical_source.display())
    })?;
    let source_path = source_repo
        .root()
        .canonicalize()
        .context("Could not canonicalize source repository root")?;
    let source_dits = source_repo.dits_dir();

    validate_repository_metadata(source_dits)?;
    let refs = snapshot_refs(&source_repo)?;
    let target = select_target(&refs, branch)?;

    let requested_destination = if let Some(destination) = dest {
        let destination = PathBuf::from(destination);
        if destination.is_absolute() {
            destination
        } else {
            current_dir.join(destination)
        }
    } else {
        current_dir.join(
            source_path
                .file_name()
                .ok_or_else(|| anyhow::anyhow!("Cannot determine destination name from source"))?,
        )
    };
    let dest_path = resolve_destination_path(&requested_destination)?;
    if dest_path.starts_with(&source_path) {
        bail!(
            "Destination cannot be inside the source repository worktree: {}",
            dest_path.display()
        );
    }

    match fs::symlink_metadata(&dest_path) {
        Ok(_) => bail!("Destination already exists: {}", dest_path.display()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => {},
        Err(error) => {
            return Err(error)
                .with_context(|| format!("Could not inspect destination {}", dest_path.display()));
        },
    }

    println!("Cloning from {} into {}...", source_path.display(), dest_path.display());

    fs::create_dir_all(&dest_path).with_context(|| {
        format!(
            "Failed to create destination {}; a partial directory may remain",
            dest_path.display()
        )
    })?;
    {
        let _initialized = Repository::init(&dest_path).context(
            "Failed to initialize destination repository; the destination may be incomplete",
        )?;
    }

    let clone_result = complete_local_clone(source_dits, &source_path, &dest_path, &refs, &target);

    let files_restored = clone_result.map_err(|error| {
        anyhow::anyhow!(
            "Clone into {} is incomplete; the destination was left in place for inspection: \
             {error:#}",
            dest_path.display()
        )
    })?;
    match target {
        CloneTarget::UnbornBranch { name } => {
            println!("Cloned into '{}' on empty branch '{}'.", dest_path.display(), name)
        },
        _ => println!("Cloned into '{}': {} files", dest_path.display(), files_restored),
    }

    Ok(())
}

fn complete_local_clone(
    source_dits: &Path,
    source_path: &Path,
    dest_path: &Path,
    refs: &RefSnapshot,
    target: &CloneTarget,
) -> Result<usize> {
    println!("Copying objects...");
    copy_dir_recursive(&source_dits.join("objects"), &dest_path.join(".dits").join("objects"))?;
    copy_local_config(source_dits, &dest_path.join(".dits"))?;

    // Re-open only after installing the validated local configuration so
    // future adds use the same chunking behavior as the source.
    let dest_repo =
        Repository::open(dest_path).context("Failed to open initialized destination")?;

    let files_restored = match target {
        CloneTarget::Branch { hash, .. } | CloneTarget::Detached { hash } => {
            println!("Checking out {}...", target.description());
            dest_repo
                .checkout(hash)
                .with_context(|| format!("Failed to check out {}", target.description()))?
                .files_restored
        },
        CloneTarget::UnbornBranch { .. } => 0,
    };

    println!("Copying refs...");
    install_refs(&dest_repo, refs)?;
    match target {
        CloneTarget::Branch { name, .. } | CloneTarget::UnbornBranch { name } => {
            dest_repo.refs().set_head_branch(name)?;
        },
        CloneTarget::Detached { hash } => dest_repo.refs().set_head_detached(hash)?,
    }

    let mut remotes = RemoteStore::open(dest_repo.dits_dir())?;
    remotes.add(Remote::new("origin", source_path.to_string_lossy().into_owned()))?;

    Ok(files_restored)
}

/// Resolve a not-yet-created destination through its closest existing
/// ancestor. This makes containment checks account for symlinked parent
/// directories without creating anything during preflight.
fn resolve_destination_path(path: &Path) -> Result<PathBuf> {
    let mut existing = path.to_path_buf();
    let mut missing = Vec::new();

    loop {
        match fs::symlink_metadata(&existing) {
            Ok(_) => break,
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                let name = existing.file_name().ok_or_else(|| {
                    anyhow::anyhow!("Could not resolve destination {}", path.display())
                })?;
                missing.push(name.to_os_string());
                if !existing.pop() {
                    bail!("Could not resolve destination {}", path.display());
                }
            },
            Err(error) => {
                return Err(error)
                    .with_context(|| format!("Could not inspect destination {}", path.display()));
            },
        }
    }

    let mut resolved = existing.canonicalize().with_context(|| {
        format!("Could not canonicalize destination ancestor {}", existing.display())
    })?;
    for component in missing.into_iter().rev() {
        resolved.push(component);
    }
    Ok(resolved)
}

fn snapshot_refs(repo: &Repository) -> Result<RefSnapshot> {
    let head = repo
        .refs()
        .read_head()
        .context("Could not read source HEAD")?;
    let mut branches = Vec::new();
    for name in repo
        .refs()
        .list_branches()
        .context("Could not list source branches")?
    {
        let hash = repo
            .refs()
            .get_branch(&name)?
            .ok_or_else(|| anyhow::anyhow!("Source branch '{name}' disappeared while cloning"))?;
        branches.push((name, hash));
    }

    let mut tags = Vec::new();
    for name in repo
        .refs()
        .list_tags()
        .context("Could not list source tags")?
    {
        let hash = repo
            .refs()
            .get_tag(&name)?
            .ok_or_else(|| anyhow::anyhow!("Source tag '{name}' disappeared while cloning"))?;
        tags.push((name, hash));
    }

    Ok(RefSnapshot { head, branches, tags })
}

fn select_target(refs: &RefSnapshot, requested_branch: Option<&str>) -> Result<CloneTarget> {
    if let Some(name) = requested_branch {
        validate_ref_name(name)
            .with_context(|| format!("Invalid requested branch name '{name}'"))?;
        let hash = refs
            .branches
            .iter()
            .find_map(|(candidate, hash)| (candidate == name).then_some(*hash))
            .ok_or_else(|| {
                anyhow::anyhow!("Requested branch '{name}' does not exist in source repository")
            })?;
        return Ok(CloneTarget::Branch { name: name.to_string(), hash });
    }

    match &refs.head {
        HeadRef::Branch(name) => match refs
            .branches
            .iter()
            .find_map(|(candidate, hash)| (candidate == name).then_some(*hash))
        {
            Some(hash) => Ok(CloneTarget::Branch { name: name.clone(), hash }),
            None => Ok(CloneTarget::UnbornBranch { name: name.clone() }),
        },
        HeadRef::Detached(hash) => Ok(CloneTarget::Detached { hash: *hash }),
    }
}

fn install_refs(repo: &Repository, refs: &RefSnapshot) -> Result<()> {
    for (name, hash) in &refs.branches {
        repo.refs().set_branch(name, hash)?;
    }
    for (name, hash) in &refs.tags {
        repo.refs().set_tag(name, hash)?;
    }
    Ok(())
}

/// Validate every metadata entry that clone may copy before creating the
/// destination. Symlinks and special files are rejected instead of followed.
fn validate_repository_metadata(dits_dir: &Path) -> Result<()> {
    let metadata = fs::symlink_metadata(dits_dir)
        .with_context(|| format!("Could not inspect {}", dits_dir.display()))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        bail!("Repository metadata path is not a real directory: {}", dits_dir.display());
    }

    validate_directory_tree(&dits_dir.join("objects"), "object store")?;
    match fs::symlink_metadata(dits_dir.join("refs")) {
        Ok(_) => validate_directory_tree(&dits_dir.join("refs"), "reference store")?,
        Err(error) if error.kind() == io::ErrorKind::NotFound => {},
        Err(error) => return Err(error).context("Could not inspect source reference store"),
    }
    validate_optional_regular_file(&dits_dir.join("HEAD"), "HEAD")?;
    validate_optional_regular_file(&dits_dir.join("config.toml"), "local configuration")?;
    Ok(())
}

fn validate_directory_tree(root: &Path, label: &str) -> Result<()> {
    let metadata = fs::symlink_metadata(root)
        .with_context(|| format!("Could not inspect source {label} at {}", root.display()))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        bail!("Source {label} is not a real directory: {}", root.display());
    }

    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;
        if file_type.is_symlink() {
            bail!("Refusing to copy symbolic link from source metadata: {}", path.display());
        }
        if file_type.is_dir() {
            validate_directory_tree(&path, label)?;
        } else if !file_type.is_file() {
            bail!("Refusing to copy special file from source metadata: {}", path.display());
        }
    }
    Ok(())
}

fn validate_optional_regular_file(path: &Path, label: &str) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            bail!("Refusing symbolic-link {label}: {}", path.display())
        },
        Ok(metadata) if !metadata.is_file() => {
            bail!("Source {label} is not a regular file: {}", path.display())
        },
        Ok(_) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).with_context(|| format!("Could not inspect source {label}")),
    }
}

fn copy_local_config(source_dits: &Path, dest_dits: &Path) -> Result<()> {
    let source = source_dits.join("config.toml");
    let metadata = match fs::symlink_metadata(&source) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error).context("Could not inspect source local configuration"),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        bail!("Source local configuration is not a regular file: {}", source.display());
    }

    // Parse immediately before copying as a defense against source changes
    // after Repository::open_read_only validated the same file.
    Config::load(&source).context("Source local configuration is invalid")?;
    fs::copy(&source, dest_dits.join("config.toml"))?;
    Ok(())
}

/// Recursively copy a directory without following source or destination
/// symlinks. The destination is newly initialized, but it is still checked
/// before overwriting any existing entry.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    let source_metadata = fs::symlink_metadata(src)?;
    if source_metadata.file_type().is_symlink() || !source_metadata.is_dir() {
        bail!("Source copy root is not a real directory: {}", src.display());
    }

    match fs::symlink_metadata(dst) {
        Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_dir() => {
            bail!("Destination copy root is not a real directory: {}", dst.display())
        },
        Ok(_) => {},
        Err(error) if error.kind() == io::ErrorKind::NotFound => fs::create_dir_all(dst)?,
        Err(error) => return Err(error).context("Could not inspect copy destination"),
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let source_path = entry.path();
        let destination_path = dst.join(entry.file_name());
        let file_type = entry.file_type()?;

        if file_type.is_symlink() {
            bail!("Refusing to copy symbolic link from source metadata: {}", source_path.display());
        }
        if file_type.is_dir() {
            copy_dir_recursive(&source_path, &destination_path)?;
            continue;
        }
        if !file_type.is_file() {
            bail!("Refusing to copy special file from source metadata: {}", source_path.display());
        }

        if fs::symlink_metadata(&source_path)?.file_type().is_symlink() {
            bail!("Source file became a symbolic link while cloning: {}", source_path.display());
        }
        if matches!(
            fs::symlink_metadata(&destination_path),
            Ok(metadata) if metadata.file_type().is_symlink()
        ) {
            bail!(
                "Refusing to overwrite destination symbolic link: {}",
                destination_path.display()
            );
        }
        fs::copy(&source_path, &destination_path)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clone_nonexistent_source() {
        let result = clone("/nonexistent/path", Some("/tmp/dest"), None);
        assert!(result.is_err());
    }
}
