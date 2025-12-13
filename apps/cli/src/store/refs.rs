//! Reference storage for branches and HEAD.

use crate::core::Hash;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Reference store for branches and HEAD.
pub struct RefStore {
    /// Root path of the refs directory.
    root: PathBuf,
    /// Path to HEAD file.
    head_path: PathBuf,
}

impl RefStore {
    /// Create a new ref store.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            root: dits_dir.join("refs"),
            head_path: dits_dir.join("HEAD"),
        }
    }

    /// Initialize the ref store.
    pub fn init(&self) -> io::Result<()> {
        fs::create_dir_all(self.root.join("heads"))?;
        fs::create_dir_all(self.root.join("tags"))?;

        // Initialize HEAD to point to main branch
        fs::write(&self.head_path, "ref: refs/heads/main\n")?;

        Ok(())
    }

    /// Get the path for a branch ref.
    fn branch_path(&self, name: &str) -> PathBuf {
        self.root.join("heads").join(name)
    }

    /// Get the path for a tag ref.
    fn tag_path(&self, name: &str) -> PathBuf {
        self.root.join("tags").join(name)
    }

    // ========== HEAD Operations ==========

    /// Read HEAD. Returns either a branch name or a commit hash.
    pub fn read_head(&self) -> io::Result<HeadRef> {
        if !self.head_path.exists() {
            return Ok(HeadRef::Branch("main".to_string()));
        }

        let content = fs::read_to_string(&self.head_path)?;
        let content = content.trim();

        if let Some(branch) = content.strip_prefix("ref: refs/heads/") {
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
        fs::write(&self.head_path, format!("ref: refs/heads/{}\n", branch))
    }

    /// Update HEAD to point directly to a commit (detached).
    pub fn set_head_detached(&self, hash: &Hash) -> io::Result<()> {
        fs::write(&self.head_path, format!("{}\n", hash.to_hex()))
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
        let path = self.branch_path(name);
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
        let path = self.branch_path(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, format!("{}\n", hash.to_hex()))
    }

    /// Delete a branch.
    pub fn delete_branch(&self, name: &str) -> io::Result<bool> {
        let path = self.branch_path(name);
        if path.exists() {
            fs::remove_file(&path)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// List all branches.
    pub fn list_branches(&self) -> io::Result<Vec<String>> {
        let heads_dir = self.root.join("heads");
        if !heads_dir.exists() {
            return Ok(Vec::new());
        }

        let mut branches = Vec::new();
        for entry in fs::read_dir(&heads_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                if let Some(name) = entry.file_name().to_str() {
                    branches.push(name.to_string());
                }
            }
        }
        branches.sort();
        Ok(branches)
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
        let path = self.tag_path(name);
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
        let path = self.tag_path(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, format!("{}\n", hash.to_hex()))
    }

    /// List all tags.
    pub fn list_tags(&self) -> io::Result<Vec<String>> {
        let tags_dir = self.root.join("tags");
        if !tags_dir.exists() {
            return Ok(Vec::new());
        }

        let mut tags = Vec::new();
        for entry in fs::read_dir(&tags_dir)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                if let Some(name) = entry.file_name().to_str() {
                    tags.push(name.to_string());
                }
            }
        }
        tags.sort();
        Ok(tags)
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
    use super::*;
    use tempfile::tempdir;

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
