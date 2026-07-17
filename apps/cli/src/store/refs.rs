//! Reference storage for branches and HEAD.

use std::{
    fs, io,
    path::{Path, PathBuf},
};

use crate::core::Hash;

/// Validate a branch or tag name before it is used as a filesystem path.
/// Safe nested names such as `feature/editor` are allowed.
pub fn validate_ref_name(name: &str) -> io::Result<()> {
    let invalid = |reason: &str| io::Error::new(io::ErrorKind::InvalidInput, reason);

    if name.is_empty() {
        return Err(invalid("reference name must not be empty"));
    }
    if name == "@" || name.starts_with('/') || name.ends_with('/') || name.contains("//") {
        return Err(invalid("reference name has an invalid boundary or empty component"));
    }
    if name.contains("..") || name.contains("@{") {
        return Err(invalid("reference name contains a reserved sequence"));
    }
    if name.chars().any(|character| {
        character.is_control()
            || character == ' '
            || matches!(character, '~' | '^' | ':' | '?' | '*' | '[' | '\\')
    }) {
        return Err(invalid("reference name contains a forbidden character"));
    }

    for component in name.split('/') {
        if component.is_empty()
            || component == "."
            || component == ".."
            || component.starts_with('.')
            || component.ends_with('.')
            || component.ends_with(".lock")
        {
            return Err(invalid("reference name contains an invalid component"));
        }
    }

    Ok(())
}

/// Reference store for branches and HEAD.
pub struct RefStore {
    /// Root path of the refs directory.
    root:      PathBuf,
    /// Path to HEAD file.
    head_path: PathBuf,
}

impl RefStore {
    /// Create a new ref store.
    pub fn new(dits_dir: &Path) -> Self {
        Self { root: dits_dir.join("refs"), head_path: dits_dir.join("HEAD") }
    }

    /// Resolve an internal ref-store path without following a symlink outside
    /// the `.dits` directory.
    fn internal_path(&self, relative: &str) -> io::Result<PathBuf> {
        let dits_dir = self.head_path.parent().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "HEAD path has no parent directory")
        })?;
        crate::util::safe_join_repo_path(dits_dir, relative)
    }

    /// Initialize the ref store.
    pub fn init(&self) -> io::Result<()> {
        fs::create_dir_all(&self.root)?;
        fs::create_dir_all(self.internal_path("refs/heads")?)?;
        fs::create_dir_all(self.internal_path("refs/tags")?)?;

        // Initialize HEAD to point to main branch
        fs::write(self.internal_path("HEAD")?, "ref: refs/heads/main\n")?;

        Ok(())
    }

    /// Get the path for a branch ref.
    fn branch_path(&self, name: &str) -> io::Result<PathBuf> {
        validate_ref_name(name)?;
        self.internal_path(&format!("refs/heads/{name}"))
    }

    /// Get the path for a tag ref.
    fn tag_path(&self, name: &str) -> io::Result<PathBuf> {
        validate_ref_name(name)?;
        self.internal_path(&format!("refs/tags/{name}"))
    }

    // ========== HEAD Operations ==========

    /// Read HEAD. Returns either a branch name or a commit hash.
    pub fn read_head(&self) -> io::Result<HeadRef> {
        let head_path = self.internal_path("HEAD")?;
        if !head_path.exists() {
            return Ok(HeadRef::Branch("main".to_string()));
        }

        let content = fs::read_to_string(head_path)?;
        let content = content.trim();

        if let Some(branch) = content.strip_prefix("ref: refs/heads/") {
            validate_ref_name(branch)?;
            Ok(HeadRef::Branch(branch.to_string()))
        } else {
            // Detached HEAD (direct commit hash)
            let hash = Hash::from_hex(content)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
            Ok(HeadRef::Detached(hash))
        }
    }

    /// Update HEAD to point to a branch.
    pub fn set_head_branch(&self, branch: &str) -> io::Result<()> {
        validate_ref_name(branch)?;
        fs::write(self.internal_path("HEAD")?, format!("ref: refs/heads/{}\n", branch))
    }

    /// Update HEAD to point directly to a commit (detached).
    pub fn set_head_detached(&self, hash: &Hash) -> io::Result<()> {
        fs::write(self.internal_path("HEAD")?, format!("{}\n", hash.to_hex()))
    }

    /// Resolve HEAD to a commit hash.
    pub fn resolve_head(&self) -> io::Result<Option<Hash>> {
        match self.read_head()? {
            HeadRef::Branch(name) => self.get_branch(&name),
            HeadRef::Detached(hash) => Ok(Some(hash)),
        }
    }

    // ========== Branch Operations ==========

    /// Get the commit hash for a branch.
    pub fn get_branch(&self, name: &str) -> io::Result<Option<Hash>> {
        let path = self.branch_path(name)?;
        if !path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&path)?;
        let hash = Hash::from_hex(content.trim())
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
        Ok(Some(hash))
    }

    /// Update a branch to point to a commit.
    pub fn set_branch(&self, name: &str, hash: &Hash) -> io::Result<()> {
        let path = self.branch_path(name)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, format!("{}\n", hash.to_hex()))
    }

    /// Delete a branch.
    pub fn delete_branch(&self, name: &str) -> io::Result<bool> {
        let path = self.branch_path(name)?;
        if path.exists() {
            fs::remove_file(&path)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// List all branches.
    pub fn list_branches(&self) -> io::Result<Vec<String>> {
        self.list_refs("heads")
    }

    /// Get the current branch name (None if detached).
    pub fn current_branch(&self) -> io::Result<Option<String>> {
        match self.read_head()? {
            HeadRef::Branch(name) => Ok(Some(name)),
            HeadRef::Detached(_) => Ok(None),
        }
    }

    // ========== Tag Operations ==========

    /// Get the commit hash for a tag.
    pub fn get_tag(&self, name: &str) -> io::Result<Option<Hash>> {
        let path = self.tag_path(name)?;
        if !path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&path)?;
        let hash = Hash::from_hex(content.trim())
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
        Ok(Some(hash))
    }

    /// Create a tag pointing to a commit.
    pub fn set_tag(&self, name: &str, hash: &Hash) -> io::Result<()> {
        let path = self.tag_path(name)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, format!("{}\n", hash.to_hex()))
    }

    /// List all tags.
    pub fn list_tags(&self) -> io::Result<Vec<String>> {
        self.list_refs("tags")
    }

    /// Delete a tag.
    pub fn delete_tag(&self, name: &str) -> io::Result<bool> {
        let path = self.tag_path(name)?;
        if path.exists() {
            fs::remove_file(path)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    fn list_refs(&self, namespace: &str) -> io::Result<Vec<String>> {
        let base = self.internal_path(&format!("refs/{namespace}"))?;
        if !base.exists() {
            return Ok(Vec::new());
        }

        let mut names = Vec::new();
        for entry in walkdir::WalkDir::new(&base)
            .min_depth(1)
            .follow_links(false)
        {
            let entry = entry.map_err(io::Error::other)?;
            if entry.file_type().is_dir() {
                continue;
            }
            if !entry.file_type().is_file() {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "reference store contains a symbolic link or special file: {}",
                        entry.path().display()
                    ),
                ));
            }
            let relative = entry
                .path()
                .strip_prefix(&base)
                .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
            let name = relative
                .components()
                .map(|component| component.as_os_str().to_str())
                .collect::<Option<Vec<_>>>()
                .map(|components| components.join("/"))
                .ok_or_else(|| {
                    io::Error::new(io::ErrorKind::InvalidData, "reference name is not valid UTF-8")
                })?;
            validate_ref_name(&name)?;
            names.push(name);
        }
        names.sort();
        Ok(names)
    }
}

/// What HEAD points to.
#[derive(Debug, Clone)]
pub enum HeadRef {
    /// HEAD points to a branch.
    Branch(String),
    /// HEAD points directly to a commit (detached).
    Detached(Hash),
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn test_init_and_read_head() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();

        match refs.read_head().unwrap() {
            HeadRef::Branch(name) => assert_eq!(name, "main"),
            _ => panic!("Expected branch ref"),
        }
    }

    #[test]
    fn test_branch_operations() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();

        let hash = Hash::from_bytes([1u8; 32]);

        // Set branch
        refs.set_branch("main", &hash).unwrap();
        assert_eq!(refs.get_branch("main").unwrap(), Some(hash));

        // List branches
        let branches = refs.list_branches().unwrap();
        assert!(branches.contains(&"main".to_string()));

        // Create new branch
        refs.set_branch("feature", &hash).unwrap();
        let branches = refs.list_branches().unwrap();
        assert_eq!(branches.len(), 2);

        // Delete branch
        refs.delete_branch("feature").unwrap();
        let branches = refs.list_branches().unwrap();
        assert_eq!(branches.len(), 1);
    }

    #[test]
    fn test_nested_refs_and_traversal_rejection() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();
        let hash = Hash::from_bytes([2u8; 32]);

        refs.set_branch("feature/editor", &hash).unwrap();
        refs.set_tag("review/v1", &hash).unwrap();
        assert!(refs
            .list_branches()
            .unwrap()
            .contains(&"feature/editor".to_string()));
        assert!(refs.list_tags().unwrap().contains(&"review/v1".to_string()));

        for invalid in ["../HEAD", "/absolute", "bad.lock", "bad@{name", "bad\\name"] {
            assert!(refs.set_branch(invalid, &hash).is_err(), "accepted {invalid}");
            assert!(refs.set_tag(invalid, &hash).is_err(), "accepted {invalid}");
        }
    }

    #[test]
    fn test_rejects_malicious_symbolic_head() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();
        fs::write(temp.path().join("HEAD"), "ref: refs/heads/../outside\n").unwrap();

        assert!(refs.read_head().is_err());
    }

    #[cfg(unix)]
    #[test]
    fn test_rejects_symlinked_ref_storage() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();
        let hash = Hash::from_bytes([3u8; 32]);

        let linked_ref = temp.path().join("refs/heads/linked");
        symlink(outside.path().join("target"), &linked_ref).unwrap();
        assert!(refs.list_branches().is_err());
        fs::remove_file(linked_ref).unwrap();

        fs::remove_dir(temp.path().join("refs/heads")).unwrap();
        symlink(outside.path(), temp.path().join("refs/heads")).unwrap();

        assert!(refs.set_branch("escaped", &hash).is_err());
        assert!(!outside.path().join("escaped").exists());
    }

    #[test]
    fn test_resolve_head() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();

        // Initially no commit
        assert!(refs.resolve_head().unwrap().is_none());

        // Set main branch
        let hash = Hash::from_bytes([1u8; 32]);
        refs.set_branch("main", &hash).unwrap();

        // Now HEAD resolves to the commit
        assert_eq!(refs.resolve_head().unwrap(), Some(hash));
    }

    #[test]
    fn test_detached_head() {
        let temp = tempdir().unwrap();
        let refs = RefStore::new(temp.path());
        refs.init().unwrap();

        let hash = Hash::from_bytes([1u8; 32]);
        refs.set_head_detached(&hash).unwrap();

        match refs.read_head().unwrap() {
            HeadRef::Detached(h) => assert_eq!(h, hash),
            _ => panic!("Expected detached head"),
        }

        assert!(refs.current_branch().unwrap().is_none());
    }
}
