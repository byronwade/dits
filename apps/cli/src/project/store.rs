//! Project graph storage.

use super::ProjectGraph;
use crate::core::{Hash, Hasher};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Project graph storage under `.dits/objects/project/`.
pub struct ProjectStore {
    /// Base path for project objects.
    base_path: PathBuf,
}

impl ProjectStore {
    /// Create a new project store.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            base_path: dits_dir.join("objects").join("project"),
        }
    }

    /// Initialize the store (create directories).
    pub fn init(&self) -> io::Result<()> {
        fs::create_dir_all(&self.base_path)?;
        Ok(())
    }

    /// Get the path for a project object.
    fn project_path(&self, hash: &Hash) -> PathBuf {
        let hex = hash.to_hex();
        self.base_path.join(&hex[..2]).join(&hex[2..])
    }

    /// Store a project graph and return its hash.
    pub fn store(&self, project: &ProjectGraph) -> io::Result<Hash> {
        let bytes = project.to_bytes()
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        let hash = Hasher::hash(&bytes);
        let path = self.project_path(&hash);

        // Create parent directory
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Skip if already exists (content-addressed dedup)
        if !path.exists() {
            fs::write(&path, &bytes)?;
        }

        Ok(hash)
    }

    /// Load a project graph by hash.
    pub fn load(&self, hash: &Hash) -> io::Result<ProjectGraph> {
        let path = self.project_path(hash);
        let bytes = fs::read(&path)?;

        let mut project = ProjectGraph::from_bytes(&bytes)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

        project.hash = Some(*hash);
        Ok(project)
    }

    /// Check if a project exists.
    pub fn exists(&self, hash: &Hash) -> bool {
        self.project_path(hash).exists()
    }

    /// List all project hashes.
    pub fn list(&self) -> io::Result<Vec<Hash>> {
        let mut hashes = Vec::new();

        if !self.base_path.exists() {
            return Ok(hashes);
        }

        for subdir in fs::read_dir(&self.base_path)? {
            let subdir = subdir?;
            if !subdir.file_type()?.is_dir() {
                continue;
            }

            let prefix = subdir.file_name().to_string_lossy().to_string();
            if prefix.len() != 2 {
                continue;
            }

            for file in fs::read_dir(subdir.path())? {
                let file = file?;
                let suffix = file.file_name().to_string_lossy().to_string();
                let full_hex = format!("{}{}", prefix, suffix);
                if let Ok(hash) = Hash::from_hex(&full_hex) {
                    hashes.push(hash);
                }
            }
        }

        Ok(hashes)
    }

    /// Find a project by name in the list of project hashes.
    pub fn find_by_name(&self, name: &str, project_hashes: &[Hash]) -> io::Result<Option<(Hash, ProjectGraph)>> {
        for hash in project_hashes {
            if let Ok(project) = self.load(hash) {
                if project.name == name {
                    return Ok(Some((*hash, project)));
                }
            }
        }
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project::{Track, Clip, TrackType};
    use tempfile::tempdir;

    #[test]
    fn test_store_and_load() {
        let temp = tempdir().unwrap();
        let store = ProjectStore::new(temp.path());
        store.init().unwrap();

        let mut project = ProjectGraph::new_video_timeline("test");
        let track = project.get_or_create_video_track();
        track.add_clip(Clip::new("clip-001", "video.mp4", 0.0, 10.0, 0.0));

        let hash = store.store(&project).unwrap();
        assert!(store.exists(&hash));

        let loaded = store.load(&hash).unwrap();
        assert_eq!(loaded.name, "test");
        assert_eq!(loaded.tracks.len(), 1);
    }

    #[test]
    fn test_content_addressing() {
        let temp = tempdir().unwrap();
        let store = ProjectStore::new(temp.path());
        store.init().unwrap();

        let project = ProjectGraph::new_video_timeline("test");

        // Store twice, should get same hash
        let hash1 = store.store(&project).unwrap();
        let hash2 = store.store(&project).unwrap();

        assert_eq!(hash1, hash2);
    }
}
