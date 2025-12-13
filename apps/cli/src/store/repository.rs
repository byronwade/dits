//! Repository operations - high-level API for working with a Dits repository.
//!
//! ## Phase 3.6: Hybrid Storage
//!
//! The repository now supports hybrid storage:
//! - Text files → libgit2 (line diff, 3-way merge, blame)
//! - Binary files → Dits CDC (chunking, deduplication)
//! - NLE projects → Hybrid (Git for metadata, Dits for payload)
//!
//! Files are automatically classified by the `FileClassifier`.

use crate::config::Config;
use crate::core::{
    chunk_data_with_refs, chunk_data_with_refs_parallel, Author, ChunkerConfig, Commit,
    FileClassifier, FileStatus, Hash, Hasher, Index, IndexEntry, IgnoreMatcher, Manifest,
    ManifestEntry, Mp4Metadata, StorageStrategy, StoredAtom,
};
use crate::mp4::{Deconstructor, Mp4Parser, Mp4Structure, Reconstructor};
use crate::store::{GitTextEngine, ObjectStore, RefStore};
use std::fs::{self, File};
use std::io::{self, BufWriter, Cursor, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use thiserror::Error;
use walkdir::WalkDir;

/// Minimum file size to use parallel chunking (1 MB).
/// Below this threshold, sequential chunking is faster due to lower overhead.
const PARALLEL_CHUNK_THRESHOLD: usize = 1024 * 1024;

/// Repository errors.
#[derive(Debug, Error)]
pub enum RepoError {
    #[error("Not a Dits repository (or any parent): {0}")]
    NotARepository(PathBuf),

    #[error("Repository already exists: {0}")]
    AlreadyExists(PathBuf),

    #[error("Nothing to commit")]
    NothingToCommit,

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("File is ignored: {0}")]
    FileIgnored(String),

    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Object error: {0}")]
    Object(#[from] super::objects::ObjectError),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid hash: {0}")]
    InvalidHash(#[from] hex::FromHexError),

    #[error("Git engine error: {0}")]
    GitEngine(#[from] super::git_engine::GitEngineError),
}

/// A Dits repository.
pub struct Repository {
    /// Working directory (where files are).
    work_dir: PathBuf,
    /// .dits directory.
    dits_dir: PathBuf,
    /// Object store (for binary/chunked files).
    objects: ObjectStore,
    /// Reference store.
    refs: RefStore,
    /// Chunker configuration.
    chunker_config: ChunkerConfig,
    /// Ignore pattern matcher.
    ignore: IgnoreMatcher,
    /// Repository configuration.
    config: Config,
    /// Git text engine for text files (Phase 3.6).
    git_engine: Option<GitTextEngine>,
    /// File classifier for storage strategy selection (Phase 3.6).
    file_classifier: FileClassifier,
}

impl Repository {
    /// Initialize a new repository.
    pub fn init(path: &Path) -> Result<Self, RepoError> {
        let work_dir = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
        let dits_dir = work_dir.join(".dits");

        if dits_dir.exists() {
            return Err(RepoError::AlreadyExists(work_dir));
        }

        // Create .dits directory structure
        fs::create_dir_all(&dits_dir)?;

        let objects = ObjectStore::new(&dits_dir);
        objects.init()?;

        let refs = RefStore::new(&dits_dir);
        refs.init()?;

        // Create empty index
        let index = Index::new();
        let index_path = dits_dir.join("index");
        fs::write(&index_path, index.to_json())?;

        // Initialize ignore matcher
        let ignore = IgnoreMatcher::new(&work_dir);

        // Load config (or default)
        let config = Self::load_config(&dits_dir);
        // Create chunker config from config values (avoid type mismatch between binary/lib crates)
        let chunker_config = ChunkerConfig {
            min_size: config.chunking.min_size as u32,
            avg_size: config.chunking.target_size as u32,
            max_size: config.chunking.max_size as u32,
        };

        // Phase 3.6: Initialize Git text engine
        let git_engine = GitTextEngine::init(&dits_dir).ok();

        // Phase 3.6: Initialize file classifier
        let file_classifier = FileClassifier::new();

        Ok(Self {
            work_dir,
            dits_dir,
            objects,
            refs,
            chunker_config,
            ignore,
            config,
            git_engine,
            file_classifier,
        })
    }

    /// Open an existing repository.
    pub fn open(path: &Path) -> Result<Self, RepoError> {
        let work_dir = Self::find_repo_root(path)?;
        let dits_dir = work_dir.join(".dits");

        if !dits_dir.exists() {
            return Err(RepoError::NotARepository(path.to_path_buf()));
        }

        // Initialize ignore matcher
        let ignore = IgnoreMatcher::new(&work_dir);

        // Load config (local first, then global, then defaults)
        let config = Self::load_config(&dits_dir);
        // Create chunker config from config values (avoid type mismatch between binary/lib crates)
        let chunker_config = ChunkerConfig {
            min_size: config.chunking.min_size as u32,
            avg_size: config.chunking.target_size as u32,
            max_size: config.chunking.max_size as u32,
        };

        // Phase 3.6: Open or initialize Git text engine
        let git_engine = if GitTextEngine::exists(&dits_dir) {
            GitTextEngine::open(&dits_dir).ok()
        } else {
            // Initialize for existing repos that don't have it yet
            GitTextEngine::init(&dits_dir).ok()
        };

        // Phase 3.6: Initialize file classifier
        let file_classifier = FileClassifier::new();

        Ok(Self {
            work_dir: work_dir.clone(),
            dits_dir: dits_dir.clone(),
            objects: ObjectStore::new(&dits_dir),
            refs: RefStore::new(&dits_dir),
            chunker_config,
            ignore,
            config,
            git_engine,
            file_classifier,
        })
    }

    /// Load configuration with proper precedence: local > global > defaults.
    fn load_config(dits_dir: &Path) -> Config {
        // Try local config first
        let local_path = dits_dir.join("config.toml");
        if let Ok(config) = Config::load(&local_path) {
            return config;
        }

        // Try global config
        let global_path = crate::config::global_config_path();
        if let Ok(config) = Config::load(&global_path) {
            return config;
        }

        // Fall back to defaults
        Config::default()
    }

    /// Find the repository root by searching up from the given path.
    fn find_repo_root(path: &Path) -> Result<PathBuf, RepoError> {
        let mut current = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());

        loop {
            if current.join(".dits").exists() {
                return Ok(current);
            }

            match current.parent() {
                Some(parent) => current = parent.to_path_buf(),
                None => return Err(RepoError::NotARepository(path.to_path_buf())),
            }
        }
    }

    /// Get the working directory path.
    pub fn work_dir(&self) -> &Path {
        &self.work_dir
    }

    /// Get the .dits directory path.
    pub fn dits_dir(&self) -> &Path {
        &self.dits_dir
    }

    /// Get the repository root (same as work_dir).
    pub fn root(&self) -> &Path {
        &self.work_dir
    }

    /// Get a reference to the object store.
    pub fn objects(&self) -> &ObjectStore {
        &self.objects
    }

    /// Get a reference to the ref store.
    pub fn refs(&self) -> &RefStore {
        &self.refs
    }

    /// Resolve a reference or commit prefix to a commit hash.
    /// Supports: HEAD, HEAD~N, HEAD^N, branch names, tags, and commit prefixes.
    pub fn resolve_ref_or_prefix(&self, ref_str: &str) -> Result<Option<Hash>, RepoError> {
        // Check for relative refs (HEAD~N, branch~N, etc.)
        if let Some((base, offset)) = Self::parse_relative_ref(ref_str) {
            // Resolve the base reference first
            let base_hash = if base.eq_ignore_ascii_case("HEAD") {
                self.head()?
            } else if let Some(hash) = self.refs.get_branch(&base)? {
                Some(hash)
            } else if let Some(hash) = self.refs.get_tag(&base)? {
                Some(hash)
            } else if base.len() >= 6 {
                self.find_commit_by_prefix(&base)?
            } else {
                None
            };

            // Walk back N commits
            if let Some(hash) = base_hash {
                return self.walk_back_commits(&hash, offset);
            }
            return Ok(None);
        }

        // Try as "HEAD"
        if ref_str.eq_ignore_ascii_case("HEAD") || ref_str.eq_ignore_ascii_case("head") {
            return self.head();
        }

        // Try as branch name
        if let Some(hash) = self.refs.get_branch(ref_str)? {
            return Ok(Some(hash));
        }

        // Try as tag name
        if let Some(hash) = self.refs.get_tag(ref_str)? {
            return Ok(Some(hash));
        }

        // Try as commit prefix
        if ref_str.len() >= 6 {
            if let Some(hash) = self.find_commit_by_prefix(ref_str)? {
                return Ok(Some(hash));
            }
        }

        Ok(None)
    }

    /// Parse relative reference like HEAD~3 or main^2.
    /// Returns (base_ref, offset) or None if not a relative ref.
    fn parse_relative_ref(ref_str: &str) -> Option<(String, usize)> {
        // Check for ~ syntax (HEAD~3)
        if let Some(pos) = ref_str.find('~') {
            let base = ref_str[..pos].to_string();
            let offset_str = &ref_str[pos + 1..];
            if offset_str.is_empty() {
                return Some((base, 1)); // HEAD~ means HEAD~1
            }
            if let Ok(offset) = offset_str.parse::<usize>() {
                return Some((base, offset));
            }
        }

        // Check for ^ syntax (HEAD^, HEAD^1, HEAD^2)
        if let Some(pos) = ref_str.find('^') {
            let base = ref_str[..pos].to_string();
            let offset_str = &ref_str[pos + 1..];
            if offset_str.is_empty() {
                return Some((base, 1)); // HEAD^ means HEAD^1
            }
            if let Ok(offset) = offset_str.parse::<usize>() {
                return Some((base, offset));
            }
        }

        None
    }

    /// Walk back N commits from a starting point.
    fn walk_back_commits(&self, start: &Hash, steps: usize) -> Result<Option<Hash>, RepoError> {
        let mut current = *start;
        for _ in 0..steps {
            let commit = self.objects.load_commit(&current)?;
            match commit.parent {
                Some(parent) => current = parent,
                None => return Ok(None), // Reached root commit
            }
        }
        Ok(Some(current))
    }

    // ========== Public API for VFS/Mount ==========

    /// Get the current HEAD commit hash.
    pub fn head(&self) -> Result<Option<Hash>, RepoError> {
        Ok(self.refs.resolve_head()?)
    }

    /// Resolve a reference (branch name, commit prefix, or "HEAD") to a commit hash.
    pub fn resolve_ref(&self, ref_str: &str) -> Result<Option<Hash>, RepoError> {
        // Try as branch name first
        if let Some(hash) = self.refs.get_branch(ref_str)? {
            return Ok(Some(hash));
        }

        // Try as commit prefix
        if ref_str.len() >= 6 {
            // Try to find a commit starting with this prefix
            if let Some(hash) = self.find_commit_by_prefix(ref_str)? {
                return Ok(Some(hash));
            }
        }

        Ok(None)
    }

    /// Find a commit by hash prefix.
    fn find_commit_by_prefix(&self, prefix: &str) -> Result<Option<Hash>, RepoError> {
        // Walk commit directory looking for matches
        let commits_dir = self.dits_dir.join("objects").join("commits");
        if !commits_dir.exists() {
            return Ok(None);
        }

        for subdir in fs::read_dir(&commits_dir)? {
            let subdir = subdir?;
            if !subdir.file_type()?.is_dir() {
                continue;
            }

            let subdir_name = subdir.file_name().to_string_lossy().to_string();
            if !prefix.starts_with(&subdir_name) && !subdir_name.starts_with(prefix) {
                continue;
            }

            for file in fs::read_dir(subdir.path())? {
                let file = file?;
                let full_hex = format!("{}{}", subdir_name, file.file_name().to_string_lossy());
                if full_hex.starts_with(prefix) {
                    return Ok(Some(Hash::from_hex(&full_hex)?));
                }
            }
        }

        Ok(None)
    }

    /// Load a commit by hash.
    pub fn load_commit(&self, hash: &Hash) -> Result<Commit, RepoError> {
        Ok(self.objects.load_commit(hash)?)
    }

    /// Load a manifest by hash.
    pub fn load_manifest(&self, hash: &Hash) -> Result<Manifest, RepoError> {
        Ok(self.objects.load_manifest(hash)?)
    }

    /// Consume self and return the ObjectStore for use in VFS.
    pub fn into_object_store(self) -> ObjectStore {
        self.objects
    }

    // ========== Index Operations ==========

    /// Load the index.
    pub fn load_index(&self) -> Result<Index, RepoError> {
        let index_path = self.dits_dir.join("index");
        if !index_path.exists() {
            return Ok(Index::new());
        }
        let json = fs::read_to_string(&index_path)?;
        Ok(Index::from_json(&json)?)
    }

    /// Save the index.
    fn save_index(&self, index: &Index) -> Result<(), RepoError> {
        let index_path = self.dits_dir.join("index");
        fs::write(&index_path, index.to_json())?;
        Ok(())
    }

    // ========== Add/Stage Operations ==========

    /// Add a file to the staging area.
    pub fn add(&self, path: &str) -> Result<AddResult, RepoError> {
        let full_path = self.work_dir.join(path);

        if !full_path.exists() {
            return Err(RepoError::FileNotFound(path.to_string()));
        }

        // Check if path is ignored
        if self.ignore.is_ignored_str(path) {
            return Err(RepoError::FileIgnored(path.to_string()));
        }

        let mut index = self.load_index()?;
        let mut result = AddResult::default();

        if full_path.is_file() {
            self.add_file(&mut index, path, &full_path, &mut result)?;
        } else if full_path.is_dir() {
            // Add all files in directory
            for entry in WalkDir::new(&full_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
            {
                let rel_path = entry
                    .path()
                    .strip_prefix(&self.work_dir)
                    .unwrap()
                    .to_string_lossy()
                    .to_string();

                // Skip ignored files (includes .dits directory)
                if self.ignore.is_ignored_str(&rel_path) {
                    result.files_ignored += 1;
                    continue;
                }

                self.add_file(&mut index, &rel_path, entry.path(), &mut result)?;
            }
        }

        self.save_index(&index)?;
        Ok(result)
    }

    /// Add a single file to the index.
    ///
    /// Phase 3.6: Routes files based on storage strategy:
    /// - GitText: Store via libgit2, line-based operations
    /// - DitsChunk: Store via FastCDC chunking
    /// - Hybrid: Both (for NLE projects)
    fn add_file(
        &self,
        index: &mut Index,
        rel_path: &str,
        full_path: &Path,
        result: &mut AddResult,
    ) -> Result<(), RepoError> {
        // Check if this is an MP4 file - use specialized handler
        if Self::is_mp4_file(full_path) {
            return self.add_mp4_file(index, rel_path, full_path, result);
        }

        let data = fs::read(full_path)?;
        let content_hash = Hasher::hash(&data);

        // Check if file has changed
        if let Some(existing) = index.get(rel_path) {
            if existing.content_hash == content_hash {
                // File hasn't changed
                return Ok(());
            }
        }

        // Phase 3.6: Classify file to determine storage strategy
        let strategy = self.file_classifier.classify(full_path, Some(&data));

        // Route to appropriate storage engine
        match strategy {
            StorageStrategy::GitText => {
                self.add_text_file(index, rel_path, full_path, &data, content_hash, result)
            }
            StorageStrategy::DitsChunk => {
                self.add_binary_file(index, rel_path, full_path, &data, content_hash, result)
            }
            StorageStrategy::Hybrid => {
                // For now, treat hybrid files as binary
                // Full hybrid support will parse metadata vs payload
                self.add_binary_file(index, rel_path, full_path, &data, content_hash, result)
            }
        }
    }

    /// Add a text file using Git storage (Phase 3.6).
    ///
    /// Text files are stored via libgit2, enabling:
    /// - Line-based diff
    /// - 3-way merge with conflict markers
    /// - Blame/annotate
    fn add_text_file(
        &self,
        index: &mut Index,
        rel_path: &str,
        full_path: &Path,
        data: &[u8],
        content_hash: Hash,
        result: &mut AddResult,
    ) -> Result<(), RepoError> {
        // Get file metadata
        let metadata = fs::metadata(full_path)?;
        let mtime = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            })
            .unwrap_or(0);

        // Store in Git object store if available
        let git_oid = if let Some(ref engine) = self.git_engine {
            let oid = engine.store_blob(data)?;
            // Check if this was a new blob (simple heuristic: try to read it back)
            // In a real implementation, libgit2 doesn't tell us if it was deduped,
            // but we can infer from the fact that Git is content-addressable
            result.new_bytes += data.len() as u64;
            Some(oid.to_string())
        } else {
            // Fallback: store as Dits chunk
            let (chunks, chunk_refs) = if data.len() >= PARALLEL_CHUNK_THRESHOLD {
                chunk_data_with_refs_parallel(data, &self.chunker_config)
            } else {
                chunk_data_with_refs(data, &self.chunker_config)
            };

            for chunk in &chunks {
                let was_new = self.objects.store_chunk(chunk)?;
                if was_new {
                    result.new_chunks += 1;
                    result.new_bytes += chunk.size() as u64;
                } else {
                    result.dedup_chunks += 1;
                    result.dedup_bytes += chunk.size() as u64;
                }
            }

            // Create index entry with chunks (fallback mode)
            let mut entry = IndexEntry::new(
                rel_path.to_string(),
                content_hash,
                data.len() as u64,
                mtime,
                chunk_refs,
            );
            entry.status = if index.is_staged(rel_path) {
                FileStatus::Modified
            } else {
                FileStatus::Added
            };
            index.stage(entry);
            result.files_staged += 1;
            return Ok(());
        };

        // Create Git-backed index entry
        let mut entry = IndexEntry::new_text(
            rel_path.to_string(),
            content_hash,
            data.len() as u64,
            mtime,
            git_oid.unwrap_or_default(),
        );
        entry.status = if index.is_staged(rel_path) {
            FileStatus::Modified
        } else {
            FileStatus::Added
        };

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    /// Add a binary file using Dits CDC storage.
    fn add_binary_file(
        &self,
        index: &mut Index,
        rel_path: &str,
        full_path: &Path,
        data: &[u8],
        content_hash: Hash,
        result: &mut AddResult,
    ) -> Result<(), RepoError> {
        // Chunk the file - use parallel chunking for large files
        let (chunks, chunk_refs) = if data.len() >= PARALLEL_CHUNK_THRESHOLD {
            chunk_data_with_refs_parallel(data, &self.chunker_config)
        } else {
            chunk_data_with_refs(data, &self.chunker_config)
        };

        // Store chunks (dedup happens here)
        for chunk in &chunks {
            let was_new = self.objects.store_chunk(chunk)?;
            if was_new {
                result.new_chunks += 1;
                result.new_bytes += chunk.size() as u64;
            } else {
                result.dedup_chunks += 1;
                result.dedup_bytes += chunk.size() as u64;
            }
        }

        // Get file metadata
        let metadata = fs::metadata(full_path)?;
        let mtime = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            })
            .unwrap_or(0);

        // Create index entry
        let mut entry = IndexEntry::new(
            rel_path.to_string(),
            content_hash,
            data.len() as u64,
            mtime,
            chunk_refs,
        );
        entry.status = if index.is_staged(rel_path) {
            FileStatus::Modified
        } else {
            FileStatus::Added
        };

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    /// Check if a file is an ISO Base Media File Format (MP4/MOV family).
    /// These formats share the same atom-based structure and can use MP4-aware versioning.
    fn is_mp4_file(path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            let ext = ext.to_string_lossy().to_lowercase();
            matches!(
                ext.as_str(),
                "mp4" | "m4v" | "mov" | "m4a" | "m4b" | "m4p" | "3gp" | "3g2" | "mj2" | "mqv" | "f4v"
            )
        } else {
            false
        }
    }

    /// Add an MP4 file with structure-aware versioning.
    fn add_mp4_file(
        &self,
        index: &mut Index,
        rel_path: &str,
        full_path: &Path,
        result: &mut AddResult,
    ) -> Result<(), RepoError> {
        // Parse MP4 structure
        let structure = match Mp4Parser::parse(full_path) {
            Ok(s) => s,
            Err(_) => {
                // If parsing fails, fall back to regular file handling
                return self.add_regular_file(index, rel_path, full_path, result);
            }
        };

        // Deconstruct the MP4
        let deconstructed = match Deconstructor::deconstruct(full_path) {
            Ok(d) => d,
            Err(_) => {
                // Fall back to regular file handling
                return self.add_regular_file(index, rel_path, full_path, result);
            }
        };

        // Compute content hash of the full file for change detection
        let data = fs::read(full_path)?;
        let content_hash = Hasher::hash(&data);

        // Check if file has changed
        if let Some(existing) = index.get(rel_path) {
            if existing.content_hash == content_hash {
                return Ok(());
            }
        }

        // Store ftyp atom
        let (ftyp_hash, ftyp_new) = self.objects.store_mp4_ftyp(&deconstructed.ftyp_data)?;
        if ftyp_new {
            result.new_bytes += deconstructed.ftyp_data.len() as u64;
        } else {
            result.dedup_bytes += deconstructed.ftyp_data.len() as u64;
        }

        // Store moov atom (normalized)
        let (moov_hash, moov_new) = self.objects.store_mp4_moov(&deconstructed.moov_data)?;
        if moov_new {
            result.new_bytes += deconstructed.moov_data.len() as u64;
        } else {
            result.dedup_bytes += deconstructed.moov_data.len() as u64;
        }

        // Store other atoms (uuid, free, etc.)
        let mut stored_other_atoms = Vec::new();
        for (atom_type, atom_data) in &deconstructed.other_atoms {
            let atom_type_str = atom_type.as_fourcc();
            // For small atoms (< 64 bytes), store inline; otherwise store as blob
            if atom_data.len() < 64 {
                stored_other_atoms.push(StoredAtom {
                    atom_type: atom_type_str.to_string(),
                    hash: None,
                    inline_data: Some(atom_data.clone()),
                });
            } else {
                let (hash, was_new) = self.objects.store_blob(atom_data)?;
                if was_new {
                    result.new_bytes += atom_data.len() as u64;
                } else {
                    result.dedup_bytes += atom_data.len() as u64;
                }
                stored_other_atoms.push(StoredAtom {
                    atom_type: atom_type_str.to_string(),
                    hash: Some(hash),
                    inline_data: None,
                });
            }
        }

        // Build atom order from structure.atoms
        let atom_order: Vec<String> = structure.atoms.iter()
            .map(|a| a.atom_type.as_fourcc().to_string())
            .collect();

        // Read and chunk only the mdat data
        let mut file = File::open(full_path)?;
        file.seek(SeekFrom::Start(deconstructed.mdat_data_offset))?;
        let mut mdat_data = vec![0u8; deconstructed.mdat_data_size as usize];
        file.read_exact(&mut mdat_data)?;

        // Chunk the mdat data - use parallel chunking for large files
        let (chunks, chunk_refs) = if mdat_data.len() >= PARALLEL_CHUNK_THRESHOLD {
            chunk_data_with_refs_parallel(&mdat_data, &self.chunker_config)
        } else {
            chunk_data_with_refs(&mdat_data, &self.chunker_config)
        };

        // Store mdat chunks
        for chunk in &chunks {
            let was_new = self.objects.store_chunk(chunk)?;
            if was_new {
                result.new_chunks += 1;
                result.new_bytes += chunk.size() as u64;
            } else {
                result.dedup_chunks += 1;
                result.dedup_bytes += chunk.size() as u64;
            }
        }

        // Calculate the reconstructed file size for MP4
        // Structure: all atoms in original order
        let other_atoms_size: u64 = deconstructed.other_atoms.iter()
            .map(|(_, data)| data.len() as u64)
            .sum();
        let reconstructed_size = deconstructed.ftyp_data.len() as u64
            + other_atoms_size
            + deconstructed.moov_data.len() as u64
            + 8  // mdat header
            + deconstructed.mdat_data_size;

        // Build MP4 metadata
        // We always normalize offsets, so we always need to denormalize on checkout
        let has_offset_tables =
            !structure.stco_locations.is_empty() || !structure.co64_locations.is_empty();
        let mp4_metadata = Mp4Metadata {
            ftyp_hash: Some(ftyp_hash),
            moov_hash: Some(moov_hash),
            moov_size: deconstructed.moov_data.len() as u64,
            mdat_size: deconstructed.mdat_data_size,
            needs_offset_patching: has_offset_tables,
            stco_offsets: structure
                .stco_locations
                .iter()
                .map(|s| (s.data_offset - structure.moov.start, s.entry_count))
                .collect(),
            co64_offsets: structure
                .co64_locations
                .iter()
                .map(|c| (c.data_offset - structure.moov.start, c.entry_count))
                .collect(),
            atom_order,
            other_atoms: stored_other_atoms,
        };

        // Get file metadata
        let metadata = fs::metadata(full_path)?;
        let mtime = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            })
            .unwrap_or(0);

        // Create MP4-aware index entry
        let mut entry = IndexEntry::new_mp4(
            rel_path.to_string(),
            content_hash,
            reconstructed_size,
            mtime,
            chunk_refs,
            mp4_metadata,
        );
        entry.status = if index.is_staged(rel_path) {
            FileStatus::Modified
        } else {
            FileStatus::Added
        };

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    /// Add a regular (non-MP4) file to the index.
    fn add_regular_file(
        &self,
        index: &mut Index,
        rel_path: &str,
        full_path: &Path,
        result: &mut AddResult,
    ) -> Result<(), RepoError> {
        let data = fs::read(full_path)?;
        let content_hash = Hasher::hash(&data);

        // Check if file has changed
        if let Some(existing) = index.get(rel_path) {
            if existing.content_hash == content_hash {
                return Ok(());
            }
        }

        // Chunk the file - use parallel chunking for large files
        let (chunks, chunk_refs) = if data.len() >= PARALLEL_CHUNK_THRESHOLD {
            chunk_data_with_refs_parallel(&data, &self.chunker_config)
        } else {
            chunk_data_with_refs(&data, &self.chunker_config)
        };

        // Store chunks
        for chunk in &chunks {
            let was_new = self.objects.store_chunk(chunk)?;
            if was_new {
                result.new_chunks += 1;
                result.new_bytes += chunk.size() as u64;
            } else {
                result.dedup_chunks += 1;
                result.dedup_bytes += chunk.size() as u64;
            }
        }

        // Get file metadata
        let metadata = fs::metadata(full_path)?;
        let mtime = metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            })
            .unwrap_or(0);

        // Create index entry
        let mut entry = IndexEntry::new(
            rel_path.to_string(),
            content_hash,
            data.len() as u64,
            mtime,
            chunk_refs,
        );
        entry.status = if index.is_staged(rel_path) {
            FileStatus::Modified
        } else {
            FileStatus::Added
        };

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    // ========== Status Operations ==========

    /// Get repository status.
    pub fn status(&self) -> Result<Status, RepoError> {
        let index = self.load_index()?;
        let head_manifest = self.get_head_manifest()?;

        let mut status = Status::default();
        status.branch = self.refs.current_branch()?;

        // Check staged files
        for (path, entry) in &index.entries {
            match entry.status {
                FileStatus::Added => status.staged_new.push(path.clone()),
                FileStatus::Modified => status.staged_modified.push(path.clone()),
                FileStatus::Deleted => status.staged_deleted.push(path.clone()),
                _ => {}
            }
        }

        // Check working directory for untracked/modified files
        for entry in WalkDir::new(&self.work_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let rel_path = entry
                .path()
                .strip_prefix(&self.work_dir)
                .unwrap()
                .to_string_lossy()
                .to_string();

            // Skip ignored files (includes .dits directory)
            if self.ignore.is_ignored_str(&rel_path) {
                continue;
            }

            if !index.is_staged(&rel_path) {
                // Check if in HEAD manifest
                if let Some(ref manifest) = head_manifest {
                    if manifest.contains(&rel_path) {
                        // In HEAD but not staged - check if modified
                        let data = fs::read(entry.path())?;
                        let hash = Hasher::hash(&data);
                        if let Some(manifest_entry) = manifest.get(&rel_path) {
                            if manifest_entry.content_hash != hash {
                                status.modified.push(rel_path);
                            }
                        }
                    } else {
                        status.untracked.push(rel_path);
                    }
                } else {
                    status.untracked.push(rel_path);
                }
            }
        }

        Ok(status)
    }

    /// Get the manifest for HEAD commit.
    fn get_head_manifest(&self) -> Result<Option<Manifest>, RepoError> {
        if let Some(head_hash) = self.refs.resolve_head()? {
            let commit = self.objects.load_commit(&head_hash)?;
            let manifest = self.objects.load_manifest(&commit.manifest)?;
            Ok(Some(manifest))
        } else {
            Ok(None)
        }
    }

    // ========== Commit Operations ==========

    /// Create a commit from staged changes.
    pub fn commit(&self, message: &str) -> Result<Commit, RepoError> {
        let index = self.load_index()?;

        if index.is_empty() {
            return Err(RepoError::NothingToCommit);
        }

        // Build manifest from index
        let mut manifest = Manifest::new();
        for (path, entry) in &index.entries {
            let manifest_entry = if let Some(ref mp4_meta) = entry.mp4_metadata {
                ManifestEntry::new_mp4(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.chunks.clone(),
                    mp4_meta.clone(),
                )
            } else if entry.is_git_text() {
                // Phase 3.6: Text file stored in Git
                ManifestEntry::new_text(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.git_oid.clone().unwrap_or_default(),
                )
            } else {
                // Binary file stored as chunks
                ManifestEntry::new(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.chunks.clone(),
                )
            };
            manifest.add(manifest_entry);
        }

        // Store manifest
        let manifest_hash = self.objects.store_manifest(&manifest)?;

        // Get parent commit
        let parent = self.refs.resolve_head()?;

        // Create commit
        let author = Author::from_env();
        let commit = Commit::new(parent, manifest_hash, message, author);

        // Store commit
        self.objects.store_commit(&commit)?;

        // Update HEAD
        if let Some(branch) = self.refs.current_branch()? {
            self.refs.set_branch(&branch, &commit.hash)?;
        } else {
            self.refs.set_head_detached(&commit.hash)?;
        }

        // Update index base commit
        let mut new_index = Index::from_commit(commit.hash);
        for (path, entry) in index.entries {
            let mut new_entry = entry;
            new_entry.status = FileStatus::Unchanged;
            new_index.stage(new_entry);
        }
        self.save_index(&new_index)?;

        Ok(commit)
    }

    // ========== Checkout Operations ==========

    /// Checkout a commit, restoring all files.
    pub fn checkout(&self, hash: &Hash) -> Result<CheckoutResult, RepoError> {
        let commit = self.objects.load_commit(hash)?;
        let manifest = self.objects.load_manifest(&commit.manifest)?;

        let mut result = CheckoutResult::default();

        for (path, entry) in manifest.iter() {
            let full_path = self.work_dir.join(path);

            // Create parent directories
            if let Some(parent) = full_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Check if this is an MP4 file
            if let Some(ref mp4_meta) = entry.mp4_metadata {
                self.checkout_mp4_file(&full_path, entry, mp4_meta, &mut result)?;
            } else {
                self.checkout_regular_file(&full_path, entry, &mut result)?;
            }
        }

        // Update HEAD
        self.refs.set_head_detached(hash)?;

        // Update index
        let mut index = Index::from_commit(*hash);
        for (path, entry) in manifest.iter() {
            // Create IndexEntry with MP4 metadata if present
            let idx_entry = if let Some(ref mp4_meta) = entry.mp4_metadata {
                IndexEntry::new_mp4(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    entry.chunks.clone(),
                    mp4_meta.clone(),
                )
            } else {
                IndexEntry::new(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    entry.chunks.clone(),
                )
            };
            index.stage(idx_entry);
        }
        self.save_index(&index)?;

        Ok(result)
    }

    /// Checkout a branch.
    pub fn checkout_branch(&self, branch: &str) -> Result<CheckoutResult, RepoError> {
        if let Some(hash) = self.refs.get_branch(branch)? {
            let result = self.checkout(&hash)?;
            self.refs.set_head_branch(branch)?;
            Ok(result)
        } else {
            Err(RepoError::FileNotFound(format!("branch '{}'", branch)))
        }
    }

    /// Checkout an MP4 file with structure-aware reconstruction.
    fn checkout_mp4_file(
        &self,
        full_path: &Path,
        entry: &ManifestEntry,
        mp4_meta: &Mp4Metadata,
        result: &mut CheckoutResult,
    ) -> Result<(), RepoError> {
        // Load ftyp data
        let ftyp_data = if let Some(ref ftyp_hash) = mp4_meta.ftyp_hash {
            self.objects.load_mp4_ftyp(ftyp_hash)?
        } else {
            // Fall back to regular checkout if no ftyp stored
            return self.checkout_regular_file(full_path, entry, result);
        };

        // Load moov data (normalized)
        let mut moov_data = if let Some(ref moov_hash) = mp4_meta.moov_hash {
            self.objects.load_mp4_moov(moov_hash)?
        } else {
            return self.checkout_regular_file(full_path, entry, result);
        };

        // Load other atoms
        let mut other_atoms_data: std::collections::HashMap<String, Vec<u8>> = std::collections::HashMap::new();
        for stored_atom in &mp4_meta.other_atoms {
            let data = if let Some(ref inline_data) = stored_atom.inline_data {
                inline_data.clone()
            } else if let Some(ref hash) = stored_atom.hash {
                self.objects.load_blob(hash)?
            } else {
                continue;
            };
            other_atoms_data.insert(stored_atom.atom_type.clone(), data);
        }

        // Reassemble mdat data from chunks
        let mut mdat_data = Vec::with_capacity(mp4_meta.mdat_size as usize);
        for chunk_ref in &entry.chunks {
            let chunk = self.objects.load_chunk(&chunk_ref.hash)?;
            mdat_data.extend_from_slice(&chunk.data);
        }

        // Create mdat header
        let mdat_header = crate::mp4::create_mdat_header(mdat_data.len() as u64);

        // Determine atom order and calculate positions
        // If we have a saved atom_order, use it; otherwise use default: ftyp, moov, mdat
        let atom_order = if mp4_meta.atom_order.is_empty() {
            vec!["ftyp".to_string(), "moov".to_string(), "mdat".to_string()]
        } else {
            mp4_meta.atom_order.clone()
        };

        // Calculate where mdat data will start in the final file
        let mut current_offset: u64 = 0;
        let mut mdat_data_start: u64 = 0;
        for atom_type in &atom_order {
            match atom_type.as_str() {
                "ftyp" => {
                    current_offset += ftyp_data.len() as u64;
                }
                "moov" => {
                    current_offset += moov_data.len() as u64;
                }
                "mdat" => {
                    mdat_data_start = current_offset + mdat_header.len() as u64;
                    current_offset += mdat_header.len() as u64 + mdat_data.len() as u64;
                }
                other => {
                    if let Some(data) = other_atoms_data.get(other) {
                        current_offset += data.len() as u64;
                    }
                }
            }
        }

        // Denormalize moov offsets (convert from 0-based to actual mdat_data_start)
        if mp4_meta.needs_offset_patching {
            Self::denormalize_moov_offsets(
                &mut moov_data,
                &mp4_meta.stco_offsets,
                &mp4_meta.co64_offsets,
                mdat_data_start as i64,
            )?;
        }

        // Write the reconstructed MP4
        let file = File::create(full_path)?;
        let mut writer = BufWriter::new(file);

        for atom_type in &atom_order {
            match atom_type.as_str() {
                "ftyp" => {
                    writer.write_all(&ftyp_data)?;
                }
                "moov" => {
                    writer.write_all(&moov_data)?;
                }
                "mdat" => {
                    writer.write_all(&mdat_header)?;
                    writer.write_all(&mdat_data)?;
                }
                other => {
                    if let Some(data) = other_atoms_data.get(other) {
                        writer.write_all(data)?;
                    }
                }
            }
        }

        writer.flush()?;

        result.files_restored += 1;
        result.bytes_restored += entry.size;

        Ok(())
    }

    /// Denormalize offsets in moov data for reconstruction.
    fn denormalize_moov_offsets(
        moov_data: &mut [u8],
        stco_offsets: &[(u64, u32)],
        co64_offsets: &[(u64, u32)],
        delta: i64,
    ) -> Result<(), RepoError> {
        use byteorder::{BigEndian, ByteOrder};

        // Patch stco tables (32-bit offsets)
        for (offset, count) in stco_offsets {
            let offset = *offset as usize;
            for i in 0..*count as usize {
                let pos = offset + i * 4;
                if pos + 4 > moov_data.len() {
                    break;
                }
                let current = BigEndian::read_u32(&moov_data[pos..pos + 4]) as i64;
                let new_value = (current + delta) as u32;
                BigEndian::write_u32(&mut moov_data[pos..pos + 4], new_value);
            }
        }

        // Patch co64 tables (64-bit offsets)
        for (offset, count) in co64_offsets {
            let offset = *offset as usize;
            for i in 0..*count as usize {
                let pos = offset + i * 8;
                if pos + 8 > moov_data.len() {
                    break;
                }
                let current = BigEndian::read_u64(&moov_data[pos..pos + 8]) as i64;
                let new_value = (current + delta) as u64;
                BigEndian::write_u64(&mut moov_data[pos..pos + 8], new_value);
            }
        }

        Ok(())
    }

    /// Checkout a regular (non-MP4) file by reassembling chunks or loading from Git.
    fn checkout_regular_file(
        &self,
        full_path: &Path,
        entry: &ManifestEntry,
        result: &mut CheckoutResult,
    ) -> Result<(), RepoError> {
        // Phase 3.6: Check storage strategy
        if entry.is_git_text() {
            // Load from Git object store
            if let (Some(ref git_oid), Some(ref engine)) = (&entry.git_oid, &self.git_engine) {
                let oid = GitTextEngine::parse_oid(git_oid)?;
                let data = engine.read_blob(oid)?;
                fs::write(full_path, &data)?;
                result.files_restored += 1;
                result.bytes_restored += entry.size;
                return Ok(());
            }
            // Fall through to chunk-based restore if Git engine not available
        }

        // Reassemble file from chunks
        let mut data = Vec::with_capacity(entry.size as usize);
        for chunk_ref in &entry.chunks {
            let chunk = self.objects.load_chunk(&chunk_ref.hash)?;
            data.extend_from_slice(&chunk.data);
        }

        fs::write(full_path, &data)?;
        result.files_restored += 1;
        result.bytes_restored += entry.size;

        Ok(())
    }

    // ========== Branch Operations ==========

    /// Get current branch name (None if detached HEAD).
    pub fn current_branch(&self) -> Result<Option<String>, RepoError> {
        Ok(self.refs.current_branch()?)
    }

    /// List all branches.
    pub fn list_branches(&self) -> Result<Vec<String>, RepoError> {
        Ok(self.refs.list_branches()?)
    }

    /// Create a new branch at HEAD.
    pub fn create_branch(&self, name: &str) -> Result<(), RepoError> {
        // Get current HEAD commit
        let head = self.refs.resolve_head()?;
        match head {
            Some(hash) => {
                self.refs.set_branch(name, &hash)?;
                Ok(())
            }
            None => {
                // No commits yet - can still create branch, it just won't point anywhere
                Err(RepoError::NothingToCommit)
            }
        }
    }

    /// Delete a branch.
    pub fn delete_branch(&self, name: &str) -> Result<bool, RepoError> {
        Ok(self.refs.delete_branch(name)?)
    }

    /// Check if a branch exists.
    pub fn branch_exists(&self, name: &str) -> Result<bool, RepoError> {
        Ok(self.refs.get_branch(name)?.is_some())
    }

    // ========== Log Operations ==========

    /// Get commit history.
    pub fn log(&self, limit: usize) -> Result<Vec<Commit>, RepoError> {
        let mut commits = Vec::new();
        let mut current = self.refs.resolve_head()?;

        while let Some(hash) = current {
            if commits.len() >= limit {
                break;
            }

            let commit = self.objects.load_commit(&hash)?;
            current = commit.parent;
            commits.push(commit);
        }

        Ok(commits)
    }

    // ========== Stats ==========

    /// Get repository statistics.
    pub fn stats(&self) -> Result<RepoStats, RepoError> {
        let (chunks, manifests, commits) = self.objects.count_objects()?;
        let storage_size = self.objects.total_size()?;

        Ok(RepoStats {
            chunk_count: chunks,
            manifest_count: manifests,
            commit_count: commits,
            storage_bytes: storage_size,
        })
    }

    // ========== Phase 4: Advanced Stats ==========

    /// Get detailed file stats for all files in a commit.
    pub fn file_stats_for_commit(&self, commit_hash: &Hash) -> Result<Vec<FileStats>, RepoError> {
        let commit = self.objects.load_commit(commit_hash)?;
        let manifest = self.objects.load_manifest(&commit.manifest)?;

        let mut result = Vec::new();

        for (path, entry) in manifest.iter() {
            let chunk_hashes: Vec<Hash> = entry.chunks.iter().map(|c| c.hash).collect();

            result.push(FileStats {
                path: path.clone(),
                manifest_hash: commit.manifest,
                content_hash: entry.content_hash,
                file_size: entry.size,
                chunk_count: entry.chunks.len(),
                chunk_hashes,
                is_mp4: entry.mp4_metadata.is_some(),
            });
        }

        Ok(result)
    }

    /// Compute comprehensive repo stats for a commit including deduplication metrics.
    pub fn compute_repo_dedup_stats(&self, commit_hash: &Hash) -> Result<RepoDedupStats, RepoError> {
        let commit = self.objects.load_commit(commit_hash)?;
        let manifest = self.objects.load_manifest(&commit.manifest)?;

        let mut logical_size: u64 = 0;
        let mut unique_chunks: std::collections::HashSet<Hash> = std::collections::HashSet::new();
        let mut file_count = 0;

        for (_path, entry) in manifest.iter() {
            logical_size += entry.size;
            file_count += 1;
            for chunk_ref in &entry.chunks {
                unique_chunks.insert(chunk_ref.hash);
            }
        }

        // Calculate physical size by summing unique chunk sizes
        let mut physical_size: u64 = 0;
        for chunk_hash in &unique_chunks {
            match self.objects.chunk_size(chunk_hash) {
                Ok(size) => physical_size += size,
                Err(_) => {
                    // Chunk might not exist yet (during add), skip
                }
            }
        }

        let saved_bytes = logical_size.saturating_sub(physical_size);
        let dedup_ratio = if logical_size > 0 {
            physical_size as f64 / logical_size as f64
        } else {
            1.0
        };
        // Use saturating_sub to avoid underflow panic if physical > logical (shouldn't happen but be safe)
        let savings_percentage = if logical_size > 0 {
            (saved_bytes as f64 / logical_size as f64) * 100.0
        } else {
            0.0
        };

        Ok(RepoDedupStats {
            commit_hash: *commit_hash,
            file_count,
            logical_size,
            unique_chunk_count: unique_chunks.len(),
            physical_size,
            saved_bytes,
            dedup_ratio,
            savings_percentage,
        })
    }

    /// Compute dedup stats for a specific file in a commit.
    pub fn compute_file_dedup_stats(
        &self,
        commit_hash: &Hash,
        target_path: &str,
    ) -> Result<FileDedupStats, RepoError> {
        let commit = self.objects.load_commit(commit_hash)?;
        let manifest = self.objects.load_manifest(&commit.manifest)?;

        // Build a map of chunk -> usage count across all files
        let mut all_chunk_counts: std::collections::HashMap<Hash, u64> = std::collections::HashMap::new();
        for (_path, entry) in manifest.iter() {
            for chunk_ref in &entry.chunks {
                *all_chunk_counts.entry(chunk_ref.hash).or_insert(0) += 1;
            }
        }

        // Find the target file
        let target_entry = manifest
            .get(target_path)
            .ok_or_else(|| RepoError::FileNotFound(target_path.to_string()))?;

        let chunk_count = target_entry.chunks.len();
        let mut shared_chunk_count = 0usize;
        let mut unique_chunk_count = 0usize;
        let mut estimated_unique_bytes: u64 = 0;
        let mut chunk_hashes = Vec::new();

        for chunk_ref in &target_entry.chunks {
            chunk_hashes.push(chunk_ref.hash);
            if let Some(count) = all_chunk_counts.get(&chunk_ref.hash) {
                if *count > 1 {
                    shared_chunk_count += 1;
                } else {
                    unique_chunk_count += 1;
                    // Add to unique bytes estimate
                    if let Ok(size) = self.objects.chunk_size(&chunk_ref.hash) {
                        estimated_unique_bytes += size;
                    }
                }
            }
        }

        Ok(FileDedupStats {
            path: target_path.to_string(),
            manifest_hash: commit.manifest,
            content_hash: target_entry.content_hash,
            logical_size: target_entry.size,
            chunk_count,
            shared_chunk_count,
            unique_chunk_count,
            estimated_unique_bytes,
            chunk_hashes,
            is_mp4: target_entry.mp4_metadata.is_some(),
        })
    }

    /// List all files in the current HEAD commit.
    pub fn list_files(&self) -> Result<Vec<String>, RepoError> {
        let head = self.refs.resolve_head()?;
        match head {
            Some(hash) => {
                let commit = self.objects.load_commit(&hash)?;
                let manifest = self.objects.load_manifest(&commit.manifest)?;
                Ok(manifest.iter().map(|(path, _)| path.clone()).collect())
            }
            None => Ok(Vec::new()),
        }
    }
}

/// Result of an add operation.
#[derive(Debug, Default)]
pub struct AddResult {
    pub files_staged: usize,
    pub files_ignored: usize,
    pub new_chunks: usize,
    pub new_bytes: u64,
    pub dedup_chunks: usize,
    pub dedup_bytes: u64,
}

impl AddResult {
    /// Calculate dedup ratio.
    pub fn dedup_ratio(&self) -> f64 {
        let total = self.new_bytes + self.dedup_bytes;
        if total == 0 {
            1.0
        } else {
            total as f64 / self.new_bytes as f64
        }
    }
}

/// Repository status.
#[derive(Debug, Default)]
pub struct Status {
    pub branch: Option<String>,
    pub staged_new: Vec<String>,
    pub staged_modified: Vec<String>,
    pub staged_deleted: Vec<String>,
    pub modified: Vec<String>,
    pub untracked: Vec<String>,
}

impl Status {
    /// Check if there are any changes.
    pub fn is_clean(&self) -> bool {
        self.staged_new.is_empty()
            && self.staged_modified.is_empty()
            && self.staged_deleted.is_empty()
            && self.modified.is_empty()
    }

    /// Check if there are staged changes.
    pub fn has_staged(&self) -> bool {
        !self.staged_new.is_empty()
            || !self.staged_modified.is_empty()
            || !self.staged_deleted.is_empty()
    }
}

/// Result of a checkout operation.
#[derive(Debug, Default)]
pub struct CheckoutResult {
    pub files_restored: usize,
    pub bytes_restored: u64,
}

/// Repository statistics.
#[derive(Debug, Default)]
pub struct RepoStats {
    pub chunk_count: usize,
    pub manifest_count: usize,
    pub commit_count: usize,
    pub storage_bytes: u64,
}

// ========== Phase 4: Advanced Stats Structures ==========

/// Statistics for a single file in a commit.
#[derive(Debug, Clone)]
pub struct FileStats {
    /// File path relative to repo root.
    pub path: String,
    /// Hash of the manifest containing this file.
    pub manifest_hash: Hash,
    /// Content hash of the file.
    pub content_hash: Hash,
    /// Logical file size in bytes.
    pub file_size: u64,
    /// Number of chunks.
    pub chunk_count: usize,
    /// List of chunk hashes.
    pub chunk_hashes: Vec<Hash>,
    /// Whether this is an MP4 file with special handling.
    pub is_mp4: bool,
}

/// Comprehensive repository deduplication statistics.
#[derive(Debug, Clone)]
pub struct RepoDedupStats {
    /// Commit hash these stats are for.
    pub commit_hash: Hash,
    /// Number of files in the commit.
    pub file_count: usize,
    /// Total logical size of all files (sum of file sizes).
    pub logical_size: u64,
    /// Number of unique chunks.
    pub unique_chunk_count: usize,
    /// Physical storage size (sum of unique chunk sizes).
    pub physical_size: u64,
    /// Bytes saved through deduplication.
    pub saved_bytes: u64,
    /// Deduplication ratio (physical / logical). Lower is better.
    pub dedup_ratio: f64,
    /// Percentage of storage saved. Higher is better.
    pub savings_percentage: f64,
}

/// Deduplication statistics for a single file.
#[derive(Debug, Clone)]
pub struct FileDedupStats {
    /// File path.
    pub path: String,
    /// Manifest hash.
    pub manifest_hash: Hash,
    /// Content hash.
    pub content_hash: Hash,
    /// Logical file size.
    pub logical_size: u64,
    /// Total number of chunks.
    pub chunk_count: usize,
    /// Chunks shared with other files in the repo.
    pub shared_chunk_count: usize,
    /// Chunks unique to this file.
    pub unique_chunk_count: usize,
    /// Estimated unique physical size (size of unique chunks).
    pub estimated_unique_bytes: u64,
    /// List of all chunk hashes for this file.
    pub chunk_hashes: Vec<Hash>,
    /// Whether this is an MP4 file.
    pub is_mp4: bool,
}

impl FileDedupStats {
    /// Calculate the percentage of chunks that are shared.
    pub fn shared_percentage(&self) -> f64 {
        if self.chunk_count > 0 {
            (self.shared_chunk_count as f64 / self.chunk_count as f64) * 100.0
        } else {
            0.0
        }
    }

    /// Calculate the percentage of chunks that are unique.
    pub fn unique_percentage(&self) -> f64 {
        if self.chunk_count > 0 {
            (self.unique_chunk_count as f64 / self.chunk_count as f64) * 100.0
        } else {
            0.0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_init_repository() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        assert!(temp.path().join(".dits").exists());
        assert!(temp.path().join(".dits/objects").exists());
        assert!(temp.path().join(".dits/refs").exists());
        assert!(temp.path().join(".dits/index").exists());
    }

    #[test]
    fn test_add_and_commit() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create a test file
        let test_file = temp.path().join("test.txt");
        fs::write(&test_file, b"hello world").unwrap();

        // Add file
        let result = repo.add("test.txt").unwrap();
        assert_eq!(result.files_staged, 1);

        // Commit
        let commit = repo.commit("Initial commit").unwrap();
        assert!(!commit.hash.is_zero());

        // Check log
        let log = repo.log(10).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].message, "Initial commit");
    }

    #[test]
    fn test_add_and_checkout() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create and commit a file
        let test_file = temp.path().join("test.txt");
        fs::write(&test_file, b"original content").unwrap();
        repo.add("test.txt").unwrap();
        let commit1 = repo.commit("First commit").unwrap();

        // Modify the file
        fs::write(&test_file, b"modified content").unwrap();

        // Checkout the original commit
        let result = repo.checkout(&commit1.hash).unwrap();
        assert_eq!(result.files_restored, 1);

        // Verify file content
        let content = fs::read_to_string(&test_file).unwrap();
        assert_eq!(content, "original content");
    }

    #[test]
    fn test_deduplication() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create two identical files
        let content = vec![0u8; 100_000]; // 100KB of zeros
        fs::write(temp.path().join("file1.bin"), &content).unwrap();
        fs::write(temp.path().join("file2.bin"), &content).unwrap();

        // Add first file
        let result1 = repo.add("file1.bin").unwrap();
        assert!(result1.new_chunks > 0);

        // Add second file (should be deduplicated)
        let result2 = repo.add("file2.bin").unwrap();
        assert_eq!(result2.new_chunks, 0); // All chunks already exist
        assert!(result2.dedup_chunks > 0);
    }

    #[test]
    fn test_status() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Initially clean with untracked files after adding one
        fs::write(temp.path().join("untracked.txt"), b"test").unwrap();

        let status = repo.status().unwrap();
        assert!(status.untracked.contains(&"untracked.txt".to_string()));

        // Stage file
        repo.add("untracked.txt").unwrap();

        let status = repo.status().unwrap();
        assert!(status.staged_new.contains(&"untracked.txt".to_string()));
        assert!(!status.untracked.contains(&"untracked.txt".to_string()));
    }

    // ========== Phase 4 Tests ==========

    #[test]
    fn test_file_stats_for_commit() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create and commit binary files (.bin uses Dits chunking)
        fs::write(temp.path().join("file1.bin"), b"hello world").unwrap();
        fs::write(temp.path().join("file2.bin"), b"goodbye world").unwrap();

        repo.add("file1.bin").unwrap();
        repo.add("file2.bin").unwrap();
        let commit = repo.commit("Test commit").unwrap();

        // Get file stats
        let stats = repo.file_stats_for_commit(&commit.hash).unwrap();

        assert_eq!(stats.len(), 2);

        let file1_stats = stats.iter().find(|s| s.path == "file1.bin").unwrap();
        assert_eq!(file1_stats.file_size, 11); // "hello world" is 11 bytes
        assert!(file1_stats.chunk_count > 0);
        assert!(!file1_stats.is_mp4);

        let file2_stats = stats.iter().find(|s| s.path == "file2.bin").unwrap();
        assert_eq!(file2_stats.file_size, 13); // "goodbye world" is 13 bytes
    }

    #[test]
    fn test_compute_repo_dedup_stats() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create two files with identical content (should dedup)
        let content = vec![42u8; 100_000]; // 100KB
        fs::write(temp.path().join("file1.bin"), &content).unwrap();
        fs::write(temp.path().join("file2.bin"), &content).unwrap();

        repo.add("file1.bin").unwrap();
        repo.add("file2.bin").unwrap();
        let commit = repo.commit("Test commit").unwrap();

        // Get repo dedup stats
        let stats = repo.compute_repo_dedup_stats(&commit.hash).unwrap();

        assert_eq!(stats.file_count, 2);
        assert_eq!(stats.logical_size, 200_000); // 2 * 100KB
        // Physical size should be ~100KB due to dedup
        assert!(stats.physical_size < stats.logical_size);
        assert!(stats.savings_percentage > 40.0); // Should save at least 40%
        assert!(stats.dedup_ratio < 0.6); // Ratio should be less than 0.6
    }

    #[test]
    fn test_compute_file_dedup_stats() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create two files with identical content
        let content = vec![42u8; 100_000]; // 100KB
        fs::write(temp.path().join("file1.bin"), &content).unwrap();
        fs::write(temp.path().join("file2.bin"), &content).unwrap();

        repo.add("file1.bin").unwrap();
        repo.add("file2.bin").unwrap();
        let commit = repo.commit("Test commit").unwrap();

        // Get file dedup stats for file1
        let stats = repo.compute_file_dedup_stats(&commit.hash, "file1.bin").unwrap();

        assert_eq!(stats.path, "file1.bin");
        assert_eq!(stats.logical_size, 100_000);
        assert!(stats.chunk_count > 0);
        // All chunks should be shared with file2
        assert_eq!(stats.shared_chunk_count, stats.chunk_count);
        assert_eq!(stats.unique_chunk_count, 0);
        assert!(stats.shared_percentage() > 99.0);
    }

    #[test]
    fn test_compute_file_dedup_stats_unique() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create two files with different content
        let content1 = vec![42u8; 100_000];
        let content2 = vec![99u8; 100_000];
        fs::write(temp.path().join("file1.bin"), &content1).unwrap();
        fs::write(temp.path().join("file2.bin"), &content2).unwrap();

        repo.add("file1.bin").unwrap();
        repo.add("file2.bin").unwrap();
        let commit = repo.commit("Test commit").unwrap();

        // Get file dedup stats for file1
        let stats = repo.compute_file_dedup_stats(&commit.hash, "file1.bin").unwrap();

        // All chunks should be unique (no sharing)
        assert_eq!(stats.shared_chunk_count, 0);
        assert_eq!(stats.unique_chunk_count, stats.chunk_count);
        assert!(stats.unique_percentage() > 99.0);
    }

    #[test]
    fn test_repo_dedup_stats_single_file() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        // Create a single binary file (.bin uses Dits chunking)
        fs::write(temp.path().join("test.bin"), b"hello world").unwrap();

        repo.add("test.bin").unwrap();
        let commit = repo.commit("Test commit").unwrap();

        // Get repo stats
        let stats = repo.compute_repo_dedup_stats(&commit.hash).unwrap();

        assert_eq!(stats.file_count, 1);
        assert_eq!(stats.logical_size, 11);
        // With a single small file, physical and logical should be equal
        assert_eq!(stats.physical_size, stats.logical_size);
        assert_eq!(stats.saved_bytes, 0);
    }
}
