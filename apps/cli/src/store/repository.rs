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

use std::{
    fs::{self, File},
    io::{self, BufWriter, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};

#[cfg(unix)]
fn file_mode(metadata: &std::fs::Metadata) -> u32 {
    use std::os::unix::fs::PermissionsExt;
    metadata.permissions().mode()
}

#[cfg(not(unix))]
fn file_mode(_metadata: &std::fs::Metadata) -> u32 {
    0o644
}

use thiserror::Error;
use walkdir::WalkDir;

use crate::{
    config::Config,
    core::{
        chunk_data_with_refs, chunk_data_with_refs_parallel, Author, ChunkerConfig, Commit,
        FileClassifier, FileMode, FileStatus, FileType, Hash, Hasher, IgnoreMatcher, Index,
        IndexEntry, Manifest, ManifestEntry, Mp4Metadata, StorageStrategy, StoredAtom,
    },
    mp4::Deconstructor,
    security::KeyStore,
    store::{GitTextEngine, ObjectStore, RefStore},
};

/// Minimum file size to use parallel chunking (1 MB).
/// Below this threshold, sequential chunking is faster due to lower overhead.
const PARALLEL_CHUNK_THRESHOLD: usize = 1024 * 1024;

/// Index metadata should remain tiny compared with tracked content. This cap
/// bounds both the enclosing JSON/legacy-bincode file and bincode's declared
/// collection allocations while still allowing very large working sets.
const MAX_INDEX_FILE_SIZE: u64 = 256 * 1024 * 1024;

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

    #[error("Invalid repository path '{path}': {reason}")]
    InvalidPath { path: String, reason: String },

    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Object error: {0}")]
    Object(#[from] super::objects::ObjectError),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Configuration error: {0}")]
    Config(#[from] crate::config::ConfigError),

    #[error("Index error: {0}")]
    IndexError(String),

    #[error("Invalid hash: {0}")]
    InvalidHash(#[from] hex::FromHexError),

    #[error("Git engine error: {0}")]
    GitEngine(#[from] super::git_engine::GitEngineError),

    #[error(
        "Repository encryption is disabled in this alpha because it does not yet cover every \
         storage engine and metadata path. No repository data was read or written."
    )]
    EncryptionUnsupported,
}

/// Same-directory checkout writer that keeps the destination untouched until
/// every object has been loaded and the complete byte count is known.
///
/// This bounds restore memory to one decoded chunk while preserving the prior
/// failure behavior: a missing or corrupt object cannot leave a tracked file
/// partially truncated.
struct CheckoutWriter {
    destination:          PathBuf,
    temporary:            PathBuf,
    writer:               Option<BufWriter<File>>,
    existing_permissions: Option<fs::Permissions>,
    bytes_written:        u64,
    published:            bool,
}

impl CheckoutWriter {
    fn new(destination: &Path) -> Result<Self, RepoError> {
        let parent = destination.parent().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "checkout path has no parent directory")
        })?;
        let file_name = destination
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("checkout");
        let temporary = parent.join(format!(
            ".{file_name}.{}.checkout.tmp",
            uuid::Uuid::new_v4().simple()
        ));
        let file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;

        Ok(Self {
            destination: destination.to_path_buf(),
            temporary,
            writer: Some(BufWriter::new(file)),
            existing_permissions: fs::metadata(destination).ok().map(|m| m.permissions()),
            bytes_written: 0,
            published: false,
        })
    }

    fn write_all(&mut self, data: &[u8]) -> Result<(), RepoError> {
        self.writer
            .as_mut()
            .expect("checkout writer is available before publication")
            .write_all(data)?;
        self.bytes_written = self
            .bytes_written
            .checked_add(data.len() as u64)
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "checkout size overflow"))?;
        Ok(())
    }

    fn finish(mut self, expected_size: u64) -> Result<(), RepoError> {
        if self.bytes_written != expected_size {
            return Err(RepoError::IndexError(format!(
                "checkout for '{}' reconstructed {} bytes, expected {}",
                self.destination.display(),
                self.bytes_written,
                expected_size
            )));
        }

        if let Some(writer) = self.writer.as_mut() {
            writer.flush()?;
        }
        drop(self.writer.take());

        // File::create historically retained an existing file's permissions.
        // Preserve that behavior even though publication now uses rename.
        if let Some(permissions) = self.existing_permissions.take() {
            fs::set_permissions(&self.temporary, permissions)?;
        }

        #[cfg(windows)]
        if self.destination.exists() {
            // std::fs::rename does not replace existing files on Windows.
            // The fully validated temporary file is already closed at this
            // point, so this keeps the non-atomic window platform-specific and
            // as small as the standard library permits.
            fs::remove_file(&self.destination)?;
        }

        fs::rename(&self.temporary, &self.destination)?;
        self.published = true;
        Ok(())
    }
}

impl Drop for CheckoutWriter {
    fn drop(&mut self) {
        // Close before unlinking; Windows rejects removal of an open file.
        drop(self.writer.take());
        if !self.published {
            let _ = fs::remove_file(&self.temporary);
        }
    }
}

/// Cached index with metadata for performance optimization.
#[derive(Clone)]
struct CachedIndex {
    /// The index data.
    index: Index,
    /// Last modification time of the index file.
    mtime: std::time::SystemTime,
}

#[derive(Debug)]
enum IndexTextDecodeError {
    Utf8(std::str::Utf8Error),
    Json(serde_json::Error),
}

#[derive(Debug)]
struct IndexDecodeError {
    bincode: bincode::Error,
    text:    IndexTextDecodeError,
}

impl std::fmt::Display for IndexDecodeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.text {
            IndexTextDecodeError::Utf8(error) => write!(
                f,
                "index is neither valid bincode ({}) nor UTF-8 JSON ({})",
                self.bincode, error
            ),
            IndexTextDecodeError::Json(error) => write!(
                f,
                "index is neither valid bincode ({}) nor valid JSON ({})",
                self.bincode, error
            ),
        }
    }
}

/// A Dits repository.
pub struct Repository {
    /// Working directory (where files are).
    work_dir:        PathBuf,
    /// .dits directory.
    dits_dir:        PathBuf,
    /// Object store (for binary/chunked files).
    objects:         ObjectStore,
    /// Reference store.
    refs:            RefStore,
    /// Chunker configuration.
    chunker_config:  ChunkerConfig,
    /// Ignore pattern matcher.
    ignore:          IgnoreMatcher,
    /// Repository configuration.
    #[allow(dead_code)]
    config:          Config,
    /// Git text engine for text files (Phase 3.6).
    git_engine:      Option<GitTextEngine>,
    /// File classifier for storage strategy selection (Phase 3.6).
    file_classifier: FileClassifier,
    /// Cached index for performance (Phase 6 optimization).
    index_cache:     Mutex<Option<CachedIndex>>,
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
        let config = Self::load_config(&dits_dir)?;
        // Create chunker config from config values (avoid type mismatch between
        // binary/lib crates)
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
            index_cache: Mutex::new(None),
        })
    }

    /// Open an existing repository.
    pub fn open(path: &Path) -> Result<Self, RepoError> {
        Self::open_internal(path, true)
    }

    /// Open a repository without creating a missing embedded Git store.
    ///
    /// Integrity reports and fail-closed commands use this path so a diagnostic
    /// or rejected operation cannot mutate an older repository merely by
    /// opening it.
    pub fn open_read_only(path: &Path) -> Result<Self, RepoError> {
        Self::open_internal(path, false)
    }

    fn open_internal(path: &Path, initialize_missing_git: bool) -> Result<Self, RepoError> {
        let work_dir = Self::find_repo_root(path)?;
        let dits_dir = work_dir.join(".dits");

        if !dits_dir.exists() {
            return Err(RepoError::NotARepository(path.to_path_buf()));
        }

        // Fail before loading configuration or initializing storage for
        // repositories created with the early encryption experiment. That
        // implementation did not cover embedded Git blobs or all metadata,
        // and silently opening without a key could write plaintext into a
        // repository the user believed was protected.
        let keystore = KeyStore::new(&dits_dir);
        if keystore.exists() {
            return Err(RepoError::EncryptionUnsupported);
        }

        // Initialize ignore matcher
        let ignore = IgnoreMatcher::new(&work_dir);

        // Repository behavior is driven only by the repository-local file.
        // Global CLI preferences are selected explicitly by their consumers;
        // inheriting chunking parameters would make object boundaries depend on
        // the machine that opened the repository.
        let config = Self::load_config(&dits_dir)?;
        // Create chunker config from config values (avoid type mismatch between
        // binary/lib crates)
        let chunker_config = ChunkerConfig {
            min_size: config.chunking.min_size as u32,
            avg_size: config.chunking.target_size as u32,
            max_size: config.chunking.max_size as u32,
        };

        // Phase 3.6: Open or initialize Git text engine
        let git_engine = if GitTextEngine::exists(&dits_dir) {
            GitTextEngine::open(&dits_dir).ok()
        } else if initialize_missing_git {
            // Initialize for existing repos that don't have it yet
            GitTextEngine::init(&dits_dir).ok()
        } else {
            None
        };

        // Phase 3.6: Initialize file classifier
        let file_classifier = FileClassifier::new();

        let objects = ObjectStore::new(&dits_dir);

        Ok(Self {
            work_dir: work_dir.clone(),
            dits_dir: dits_dir.clone(),
            objects,
            refs: RefStore::new(&dits_dir),
            chunker_config,
            ignore,
            config,
            git_engine,
            file_classifier,
            index_cache: Mutex::new(None),
        })
    }

    /// Load the repository-local configuration, or defaults when no file
    /// exists. Malformed configuration is an error rather than a reason to
    /// silently change chunking behavior.
    fn load_config(dits_dir: &Path) -> Result<Config, RepoError> {
        Ok(Config::load(&dits_dir.join("config.toml"))?)
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

    /// Resolve a reference (branch name, commit prefix, or "HEAD") to a commit
    /// hash.
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

    /// Load the index with caching for performance optimization.
    /// Supports the current JSON representation and legacy bincode indexes.
    pub fn load_index(&self) -> Result<Index, RepoError> {
        let index_path = self.dits_dir.join("index");

        // Check if we have a valid cached index
        if let Ok(cache_guard) = self.index_cache.lock() {
            if let Some(ref cached) = *cache_guard {
                if index_path.exists() {
                    // Check if the file hasn't been modified since we cached it
                    if let Ok(metadata) = index_path.metadata() {
                        if let Ok(mtime) = metadata.modified() {
                            if mtime == cached.mtime {
                                // Cache is still valid
                                return Ok(cached.index.clone());
                            }
                        }
                    }
                }
            }
        }

        // Cache miss or invalid - load from disk
        if !index_path.exists() {
            let index = Index::new();
            if let Ok(mut cache_guard) = self.index_cache.lock() {
                *cache_guard = Some(CachedIndex {
                    index: index.clone(),
                    mtime: std::time::SystemTime::now(), // For new index, use current time
                });
            }
            return Ok(index);
        }

        let data = Self::read_index_bytes(&index_path)?;
        let mtime = index_path.metadata()?.modified()?;

        // Current indexes are JSON. Dispatch on the first significant byte so
        // the normal path does not pay for a guaranteed failed bincode parse,
        // while still accepting every legacy bincode index.
        let index = match Self::decode_index_bytes(&data) {
            Ok(index) => index,
            Err(error) => {
                match &error.text {
                    IndexTextDecodeError::Utf8(utf8_error) => eprintln!(
                        "Warning: Index file contains invalid UTF-8 data (bincode error: {}, \
                         UTF-8 error: {}). Creating new empty index.",
                        error.bincode, utf8_error
                    ),
                    IndexTextDecodeError::Json(json_error) => eprintln!(
                        "Warning: Index file appears to be corrupted (bincode error: {}, JSON \
                         error: {}). Creating new empty index.",
                        error.bincode, json_error
                    ),
                }

                // Preserve the existing recovery behavior: move malformed
                // bytes aside before returning a fresh index.
                let backup_path = index_path.with_extension("index.corrupted");
                if let Err(e) = fs::rename(&index_path, &backup_path) {
                    eprintln!("Warning: Could not backup corrupted index file: {}", e);
                } else {
                    eprintln!("Corrupted index file backed up to: {}", backup_path.display());
                }
                Index::new()
            },
        };

        Self::validate_index_paths(&index)?;

        // Cache the loaded index
        if let Ok(mut cache_guard) = self.index_cache.lock() {
            *cache_guard = Some(CachedIndex { index: index.clone(), mtime });
        }

        Ok(index)
    }

    /// Load the index without repairing, renaming, or caching it.
    ///
    /// Read-only diagnostics use this path because `load_index` intentionally
    /// recovers from malformed data by moving the index aside. A command that
    /// promises not to change repository metadata must instead surface the
    /// corruption as an error and leave the original bytes in place.
    pub fn load_index_read_only(&self) -> Result<Index, RepoError> {
        let index_path = self.dits_dir.join("index");
        if !index_path.exists() {
            return Ok(Index::new());
        }

        let data = Self::read_index_bytes(&index_path)?;
        let index = Self::decode_index_bytes(&data)
            .map_err(|error| RepoError::IndexError(error.to_string()))?;

        Self::validate_index_paths(&index)?;
        Ok(index)
    }

    fn save_index(&self, index: &Index) -> Result<(), RepoError> {
        Self::validate_index_paths(index)?;
        let index_path = self.dits_dir.join("index");
        let json = index.to_json();
        if json.len() as u64 > MAX_INDEX_FILE_SIZE {
            return Err(RepoError::IndexError(format!(
                "index is {} bytes; maximum supported size is {} bytes",
                json.len(),
                MAX_INDEX_FILE_SIZE
            )));
        }
        fs::write(&index_path, json).map_err(|e| RepoError::IndexError(e.to_string()))?;

        // Update cache with new mtime
        let mtime = index_path.metadata()?.modified()?;
        if let Ok(mut cache_guard) = self.index_cache.lock() {
            *cache_guard = Some(CachedIndex { index: index.clone(), mtime });
        }

        Ok(())
    }

    fn read_index_bytes(index_path: &Path) -> Result<Vec<u8>, RepoError> {
        let file_size = index_path.metadata()?.len();
        if file_size > MAX_INDEX_FILE_SIZE {
            return Err(RepoError::IndexError(format!(
                "index is {file_size} bytes; maximum supported size is {MAX_INDEX_FILE_SIZE} bytes"
            )));
        }

        let data = fs::read(index_path)?;
        if data.len() as u64 > MAX_INDEX_FILE_SIZE {
            return Err(RepoError::IndexError(format!(
                "index grew beyond the maximum supported size of {MAX_INDEX_FILE_SIZE} bytes \
                 while being read"
            )));
        }
        Ok(data)
    }

    fn index_bytes_look_like_json(data: &[u8]) -> bool {
        data.iter()
            .copied()
            .find(|byte| !byte.is_ascii_whitespace())
            .is_some_and(|byte| matches!(byte, b'{' | b'['))
    }

    fn decode_json_index(data: &[u8]) -> Result<Index, IndexTextDecodeError> {
        let json = std::str::from_utf8(data).map_err(IndexTextDecodeError::Utf8)?;
        Index::from_json(json).map_err(IndexTextDecodeError::Json)
    }

    fn decode_bincode_index(data: &[u8]) -> Result<Index, bincode::Error> {
        crate::util::deserialize_bincode_with_limit::<Index>(data, MAX_INDEX_FILE_SIZE)
    }

    fn decode_index_bytes(data: &[u8]) -> Result<Index, IndexDecodeError> {
        if Self::index_bytes_look_like_json(data) {
            let text = match Self::decode_json_index(data) {
                Ok(index) => return Ok(index),
                Err(error) => error,
            };
            let bincode = match Self::decode_bincode_index(data) {
                Ok(index) => return Ok(index),
                Err(error) => error,
            };
            Err(IndexDecodeError { bincode, text })
        } else {
            let bincode = match Self::decode_bincode_index(data) {
                Ok(index) => return Ok(index),
                Err(error) => error,
            };
            let text = match Self::decode_json_index(data) {
                Ok(index) => return Ok(index),
                Err(error) => error,
            };
            Err(IndexDecodeError { bincode, text })
        }
    }

    fn validate_index_paths(index: &Index) -> Result<(), RepoError> {
        for (path, entry) in &index.entries {
            crate::util::validate_repo_relative_path(path)
                .map_err(|reason| RepoError::InvalidPath { path: path.clone(), reason })?;
            if path != &entry.path {
                return Err(RepoError::IndexError(format!(
                    "index key '{}' does not match embedded path '{}'",
                    path, entry.path
                )));
            }
        }
        Ok(())
    }

    // ========== Add/Stage Operations ==========

    /// Add a file to the staging area.
    pub fn add(&self, path: &str) -> Result<AddResult, RepoError> {
        let (path, full_path) = self.prepare_add_path(path)?;
        let mut index = self.load_index()?;
        let (result, should_save) =
            self.add_prepared_path_to_index(&mut index, &path, &full_path)?;
        if should_save {
            self.save_index(&index)?;
        }
        Ok(result)
    }

    /// Add multiple paths while loading and publishing the index only once.
    ///
    /// Each path is isolated from the next: a failed path discards its index
    /// mutations, successful paths remain staged, and the caller receives one
    /// result per input path in the original order.
    pub fn add_paths<S: AsRef<str>>(
        &self,
        paths: &[S],
    ) -> Result<Vec<Result<AddResult, RepoError>>, RepoError> {
        if paths.is_empty() {
            return Ok(Vec::new());
        }

        // Resolve and reject malformed/ignored inputs before loading the index,
        // matching the side-effect behavior of the former per-path CLI loop.
        let prepared: Vec<_> = paths
            .iter()
            .map(|path| self.prepare_add_path(path.as_ref()))
            .collect();
        let mut index = if prepared.iter().any(Result::is_ok) {
            Some(self.load_index()?)
        } else {
            None
        };
        let mut should_save = false;
        let mut outcomes = Vec::with_capacity(paths.len());

        for path in prepared {
            let (path, full_path) = match path {
                Ok(path) => path,
                Err(error) => {
                    outcomes.push(Err(error));
                    continue;
                },
            };

            // Preserve the old per-path atomicity. Object writes may still be
            // left deduplicated in the store after an error, just as they were
            // when `add` saved only after a complete path succeeded.
            let mut candidate = index
                .as_ref()
                .expect("prepared path requires an index")
                .clone();
            match self.add_prepared_path_to_index(&mut candidate, &path, &full_path) {
                Ok((result, path_should_save)) => {
                    if path_should_save {
                        index = Some(candidate);
                        should_save = true;
                    }
                    outcomes.push(Ok(result));
                },
                Err(error) => outcomes.push(Err(error)),
            }
        }

        if should_save {
            self.save_index(index.as_ref().expect("changed path requires an index"))?;
        }
        Ok(outcomes)
    }

    fn prepare_add_path(&self, path: &str) -> Result<(String, PathBuf), RepoError> {
        // Store repository-relative paths with `/` on every platform so
        // manifests and commit hashes match across Windows and Unix.
        let path = crate::util::normalize_repo_input_path(path)
            .map_err(|reason| RepoError::InvalidPath { path: path.to_string(), reason })?;
        let full_path = if path == "." {
            self.work_dir.clone()
        } else {
            self.resolve_worktree_path(&path)?
        };

        // Missing paths are allowed through so tracked deletions can be staged.
        // Existing ignored paths fail before the index is loaded or repaired.
        if full_path.exists() && self.ignore.is_ignored_str(&path) {
            return Err(RepoError::FileIgnored(path));
        }

        Ok((path, full_path))
    }

    /// Apply one prepared path to an in-memory index. The boolean indicates
    /// whether the caller should publish the resulting index.
    fn add_prepared_path_to_index(
        &self,
        index: &mut Index,
        path: &str,
        full_path: &Path,
    ) -> Result<(AddResult, bool), RepoError> {
        if !full_path.exists() {
            let mut result = AddResult::default();
            let (matched, changed) =
                self.stage_missing_under_scope(index, path, &mut result)?;
            if matched {
                return Ok((result, changed));
            }
            return Err(RepoError::FileNotFound(path.to_string()));
        }

        // Recheck after preparation in case a batch input changed on disk.
        if self.ignore.is_ignored_str(path) {
            return Err(RepoError::FileIgnored(path.to_string()));
        }

        let mut result = AddResult::default();

        if full_path.is_file() {
            self.add_file(index, path, full_path, &mut result)?;
        } else if full_path.is_dir() {
            // Add all files in directory
            for entry in WalkDir::new(&full_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file() || e.file_type().is_symlink())
            {
                let rel_path = crate::util::normalize_separators(
                    &entry
                        .path()
                        .strip_prefix(&self.work_dir)
                        .unwrap()
                        .to_string_lossy(),
                );

                // Skip ignored files (includes .dits directory)
                if self.ignore.is_ignored_str(&rel_path) {
                    result.files_ignored += 1;
                    continue;
                }

                crate::util::validate_repo_relative_path(&rel_path)
                    .map_err(|reason| RepoError::InvalidPath { path: rel_path.clone(), reason })?;

                // Symlink versioning is not supported yet. Skip them, but count them so
                // the user is warned rather than silently losing links.
                if entry.file_type().is_symlink() {
                    result.symlinks_skipped += 1;
                    continue;
                }

                self.add_file(index, &rel_path, entry.path(), &mut result)?;
            }

            // Treat a directory add as a complete reconciliation of tracked
            // paths in that scope. Missing tracked files become staged
            // deletions; a newly staged file that disappeared is unstaged.
            self.stage_missing_under_scope(index, path, &mut result)?;
        }

        Ok((result, true))
    }

    fn stage_missing_under_scope(
        &self,
        index: &mut Index,
        scope: &str,
        result: &mut AddResult,
    ) -> Result<(bool, bool), RepoError> {
        let prefix = if scope == "." {
            None
        } else {
            Some(format!("{scope}/"))
        };
        let candidates: Vec<String> = index
            .entries
            .keys()
            .filter(|tracked| {
                scope == "."
                    || tracked.as_str() == scope
                    || prefix
                        .as_ref()
                        .is_some_and(|prefix| tracked.starts_with(prefix))
            })
            .cloned()
            .collect();

        let mut matched = false;
        let mut changed = false;
        for tracked in candidates {
            if self.resolve_worktree_path(&tracked)?.exists() {
                continue;
            }

            matched = true;
            match index.get(&tracked).map(|entry| entry.status) {
                Some(FileStatus::Added) => {
                    index.unstage(&tracked);
                    result.files_unstaged += 1;
                    changed = true;
                },
                Some(FileStatus::Deleted) | None => {},
                Some(_) => {
                    if let Some(entry) = index.entries.get_mut(&tracked) {
                        entry.status = FileStatus::Deleted;
                    }
                    result.files_deleted += 1;
                    result.files_staged += 1;
                    changed = true;
                },
            }
        }
        Ok((matched, changed))
    }

    fn status_for_updated_content(
        &self,
        index: &Index,
        path: &str,
        content_hash: Hash,
    ) -> Result<FileStatus, RepoError> {
        match index.get(path).map(|entry| entry.status) {
            None | Some(FileStatus::Added) => Ok(FileStatus::Added),
            Some(FileStatus::Deleted) => {
                let Some(base_commit_hash) = index.base_commit else {
                    return Ok(FileStatus::Added);
                };
                let base_commit = self.objects.load_commit(&base_commit_hash)?;
                let base_manifest = self.objects.load_manifest(&base_commit.manifest)?;
                Ok(match base_manifest.get(path) {
                    Some(entry) if entry.content_hash == content_hash => FileStatus::Unchanged,
                    Some(_) => FileStatus::Modified,
                    None => FileStatus::Added,
                })
            },
            Some(_) => Ok(FileStatus::Modified),
        }
    }

    /// Reconcile an add whose bytes still equal the retained index entry.
    /// Deleted entries need special handling because their retained bytes may
    /// represent either HEAD or an earlier staged modification.
    fn reconcile_equal_index_content(
        &self,
        index: &mut Index,
        path: &str,
        content_hash: Hash,
        result: &mut AddResult,
    ) -> Result<bool, RepoError> {
        let Some(existing) = index.get(path) else {
            return Ok(false);
        };
        if existing.content_hash != content_hash {
            return Ok(false);
        }

        if existing.status == FileStatus::Deleted {
            let status = self.status_for_updated_content(index, path, content_hash)?;
            if let Some(entry) = index.entries.get_mut(path) {
                entry.status = status;
            }
            if status != FileStatus::Unchanged {
                result.files_staged += 1;
            }
        }
        Ok(true)
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
        if self.reconcile_equal_index_content(index, rel_path, content_hash, result)? {
            return Ok(());
        }

        // Phase 3.6: Classify file to determine storage strategy
        let strategy = self.file_classifier.classify(full_path, Some(&data));

        // Route to appropriate storage engine
        match strategy {
            StorageStrategy::GitText => {
                self.add_text_file(index, rel_path, full_path, &data, content_hash, result)
            },
            StorageStrategy::DitsChunk => {
                self.add_binary_file(index, rel_path, full_path, &data, content_hash, result)
            },
            StorageStrategy::Hybrid => {
                // For now, treat hybrid files as binary
                // Full hybrid support will parse metadata vs payload
                self.add_binary_file(index, rel_path, full_path, &data, content_hash, result)
            },
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
        let mode = file_mode(&metadata);
        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.is_symlink() {
            FileType::Symlink
        } else {
            FileType::Regular
        };
        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(full_path)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        } else {
            String::new()
        };

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
                mode,
                file_type,
                symlink_target.clone(),
                chunk_refs,
            );
            entry.status = self.status_for_updated_content(index, rel_path, content_hash)?;
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
            mode,
            file_type,
            symlink_target,
            git_oid.unwrap_or_default(),
        );
        entry.status = self.status_for_updated_content(index, rel_path, content_hash)?;

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
        let mode = file_mode(&metadata);
        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.is_symlink() {
            FileType::Symlink
        } else {
            FileType::Regular
        };
        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(full_path)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        } else {
            String::new()
        };

        // Create index entry
        let mut entry = IndexEntry::new(
            rel_path.to_string(),
            content_hash,
            data.len() as u64,
            mtime,
            mode,
            file_type,
            symlink_target,
            chunk_refs,
        );
        entry.status = self.status_for_updated_content(index, rel_path, content_hash)?;

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    /// Check if a file is an ISO Base Media File Format (MP4/MOV family).
    /// These formats share the same atom-based structure and can use MP4-aware
    /// versioning.
    fn is_mp4_file(path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            let ext = ext.to_string_lossy().to_lowercase();
            matches!(
                ext.as_str(),
                "mp4"
                    | "m4v"
                    | "mov"
                    | "m4a"
                    | "m4b"
                    | "m4p"
                    | "3gp"
                    | "3g2"
                    | "mj2"
                    | "mqv"
                    | "f4v"
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
        // Deconstruction already parses and retains the MP4 structure. Reuse
        // it instead of parsing every media file twice.
        let deconstructed = match Deconstructor::deconstruct(full_path) {
            Ok(d) => d,
            Err(_) => {
                // Fall back to regular file handling
                return self.add_regular_file(index, rel_path, full_path, result);
            },
        };
        let structure = &deconstructed.structure;

        // Compute content hash of the full file for change detection
        let data = fs::read(full_path)?;
        let content_hash = Hasher::hash(&data);
        let actual_file_size = data.len() as u64;

        // Check if file has changed
        if self.reconcile_equal_index_content(index, rel_path, content_hash, result)? {
            return Ok(());
        }

        // Store ftyp atom
        let (ftyp_hash, ftyp_new) = self.objects.store_blob(&deconstructed.ftyp_data)?;
        if ftyp_new {
            result.new_bytes += deconstructed.ftyp_data.len() as u64;
        } else {
            result.dedup_bytes += deconstructed.ftyp_data.len() as u64;
        }

        // Store moov atom (normalized)
        let (moov_hash, moov_new) = self.objects.store_blob(&deconstructed.moov_data)?;
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
                    atom_type:   atom_type_str.to_string(),
                    hash:        None,
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
                    atom_type:   atom_type_str.to_string(),
                    hash:        Some(hash),
                    inline_data: None,
                });
            }
        }

        // Build atom order from structure.atoms
        let atom_order: Vec<String> = structure
            .atoms
            .iter()
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
        let other_atoms_size: u64 = deconstructed
            .other_atoms
            .iter()
            .map(|(_, data)| data.len() as u64)
            .sum();
        let _reconstructed_size = (deconstructed.ftyp_data.len() as u64)
            .saturating_add(other_atoms_size)
            .saturating_add(deconstructed.moov_data.len() as u64)
            .saturating_add(8)  // mdat header
            .saturating_add(deconstructed.mdat_data_size);

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
        let mode = file_mode(&metadata);
        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.is_symlink() {
            FileType::Symlink
        } else {
            FileType::Regular
        };
        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(full_path)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        } else {
            String::new()
        };

        // Create MP4-aware index entry
        let mut entry = IndexEntry::new_mp4(
            rel_path.to_string(),
            content_hash,
            actual_file_size, // Use actual file size for consistency
            mtime,
            mode,
            file_type,
            symlink_target,
            chunk_refs,
            mp4_metadata,
        );
        entry.status = self.status_for_updated_content(index, rel_path, content_hash)?;

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
        if self.reconcile_equal_index_content(index, rel_path, content_hash, result)? {
            return Ok(());
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

        // Get file mode and type
        let mode = file_mode(&metadata);
        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.file_type().is_symlink() {
            FileType::Symlink
        } else {
            FileType::Regular
        };
        let symlink_target = if file_type == FileType::Symlink {
            fs::read_link(full_path)?.to_string_lossy().to_string()
        } else {
            String::new()
        };

        // Create index entry
        let mut entry = IndexEntry::new(
            rel_path.to_string(),
            content_hash,
            data.len() as u64,
            mtime,
            mode,
            file_type,
            symlink_target,
            chunk_refs,
        );
        entry.status = self.status_for_updated_content(index, rel_path, content_hash)?;

        index.stage(entry);
        result.files_staged += 1;

        Ok(())
    }

    // ========== Status Operations ==========

    /// Get repository status.
    pub fn status(&self) -> Result<Status, RepoError> {
        let index = self.load_index()?;
        let head_manifest = self.get_head_manifest()?;

        let mut status = Status { branch: self.refs.current_branch()?, ..Default::default() };

        // Check staged files
        let mut staged_added = Vec::new();
        for (path, entry) in &index.entries {
            match entry.status {
                FileStatus::Added => staged_added.push((path.clone(), entry.content_hash)),
                FileStatus::Modified => status.staged_modified.push(path.clone()),
                FileStatus::Deleted => {
                    status.staged_deleted.push(path.clone());
                },
                FileStatus::TypeChanged => status.staged_type_changed.push(path.clone()),
                FileStatus::ModeChanged => status.staged_mode_changed.push(path.clone()),
                _ => {},
            }
        }

        // Build set of working directory files early (needed for rename detection)
        let mut working_file_paths = std::collections::HashSet::new();
        let mut working_files = Vec::new();
        for entry in WalkDir::new(&self.work_dir)
            .into_iter()
            .filter_entry(|entry| {
                if entry.depth() == 0 || !entry.file_type().is_dir() {
                    return true;
                }

                let Ok(relative) = entry.path().strip_prefix(&self.work_dir) else {
                    return false;
                };
                let relative =
                    crate::util::normalize_separators(&relative.to_string_lossy());
                self.ignore.should_descend_into(&relative)
            })
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let rel_path = crate::util::normalize_separators(
                &entry
                    .path()
                    .strip_prefix(&self.work_dir)
                    .unwrap()
                    .to_string_lossy(),
            ); // Normalize path separators (no-op on Unix; preserves literal '\' in names)

            // Skip ignored files (includes .dits directory)
            if self.ignore.is_ignored_str(&rel_path) {
                continue;
            }

            working_file_paths.insert(rel_path.clone());
            working_files.push((rel_path, entry.path().to_path_buf()));
        }

        if let Some(ref manifest) = head_manifest {
            let mut matched_old_paths = std::collections::HashSet::new();

            for (new_path, new_hash) in &staged_added {
                let mut rename_source = None;
                let new_path_norm = crate::util::normalize_separators(new_path);

                for (head_path, head_entry) in manifest.iter() {
                    if matched_old_paths.contains(head_path) {
                        continue;
                    }
                    if head_entry.content_hash != *new_hash {
                        continue;
                    }

                    let head_path_norm = crate::util::normalize_separators(head_path);
                    if head_path_norm == new_path_norm {
                        continue;
                    }
                    if working_file_paths.contains(&head_path_norm) {
                        continue;
                    }

                    rename_source = Some(head_path.clone());
                    break;
                }

                if let Some(old_path) = rename_source {
                    status
                        .staged_renamed
                        .push((old_path.clone(), new_path.clone()));
                    matched_old_paths.insert(old_path);
                } else {
                    status.staged_new.push(new_path.clone());
                }
            }

            if !matched_old_paths.is_empty() && !status.staged_deleted.is_empty() {
                status
                    .staged_deleted
                    .retain(|path| !matched_old_paths.contains(path));
            }
        } else {
            for (path, _) in staged_added {
                status.staged_new.push(path);
            }
        }

        // Process working files and detect unstaged renames
        if let Some(ref manifest) = head_manifest {
            let mut potential_rename_paths = Vec::new();
            let mut head_files_in_working = std::collections::HashSet::new();

            // First pass: identify modified, type-changed files and collect working files
            for (rel_path, full_path) in &working_files {
                head_files_in_working.insert(rel_path.clone());

                let is_staged_change = index
                    .get(rel_path)
                    .map(|entry| entry.status != FileStatus::Unchanged)
                    .unwrap_or(false);
                if is_staged_change {
                    continue;
                }

                if manifest.contains(rel_path) {
                    // File exists in HEAD - check various change types
                    let metadata = fs::metadata(full_path)?;
                    let current_mode = file_mode(&metadata);
                    let current_file_type = if metadata.is_dir() {
                        FileType::Directory
                    } else if metadata.is_symlink() {
                        FileType::Symlink
                    } else {
                        FileType::Regular
                    };

                    if let Some(manifest_entry) = manifest.get(rel_path) {
                        let data = fs::read(full_path)?;
                        let hash = Hasher::hash(&data);

                        // Check for content changes
                        let content_changed = manifest_entry.content_hash != hash;

                        // Check for type changes (only for files that exist in both)
                        let type_changed = manifest_entry.mp4_metadata.is_none()
                            && (current_file_type != FileType::Regular
                                || manifest_entry.file_type != current_file_type);

                        // Check for mode changes - convert FileMode to comparable u32
                        let manifest_mode_u32 = match manifest_entry.mode {
                            FileMode::Executable => 0o755,
                            FileMode::Symlink => 0o777, // symlinks typically have this mode
                            FileMode::Regular => 0o644,
                        };
                        let mode_changed = manifest_mode_u32 != (current_mode & 0o777);

                        // Prioritize change types: content > type > mode
                        if content_changed || type_changed || mode_changed {
                            status.modified.push(rel_path.clone());
                        }
                    }
                } else {
                    // File doesn't exist in HEAD - could be new or renamed
                    status.untracked.push(rel_path.clone());
                    potential_rename_paths.push((rel_path.clone(), full_path.clone()));
                }
            }

            // Find files that are in HEAD but missing from working directory
            let mut missing_from_working = Vec::new();
            for (head_path, head_entry) in manifest.iter() {
                if head_files_in_working.contains(head_path) {
                    continue;
                }
                let staged = index
                    .get(head_path)
                    .map(|entry| entry.status != FileStatus::Unchanged)
                    .unwrap_or(false);
                if staged {
                    continue;
                }
                missing_from_working.push((
                    head_path.clone(),
                    head_entry.content_hash,
                    head_entry.size,
                ));
            }

            // Only files whose size matches a missing source can be renames.
            // Hash each viable untracked candidate once, then match through a
            // hash map instead of rereading it for every missing path.
            let missing_sizes: std::collections::HashSet<u64> = missing_from_working
                .iter()
                .map(|(_, _, size)| *size)
                .collect();
            let mut potential_renames =
                std::collections::HashMap::<Hash, std::collections::VecDeque<String>>::new();
            if !missing_sizes.is_empty() {
                for (new_path, new_full_path) in potential_rename_paths {
                    let Ok(metadata) = fs::metadata(&new_full_path) else {
                        continue;
                    };
                    if !missing_sizes.contains(&metadata.len()) {
                        continue;
                    }
                    if let Ok(data) = fs::read(new_full_path) {
                        potential_renames
                            .entry(Hasher::hash(&data))
                            .or_default()
                            .push_back(new_path);
                    }
                }
            }

            let mut matched_new_paths = std::collections::HashSet::new();
            for (old_path, old_hash, _) in &missing_from_working {
                if let Some(new_path) = potential_renames
                    .get_mut(old_hash)
                    .and_then(|paths| paths.pop_front())
                {
                    status
                        .unstaged_renamed
                        .push((old_path.clone(), new_path.clone()));
                    matched_new_paths.insert(new_path);
                } else {
                    status.deleted.push(old_path.clone());
                }
            }
            status
                .untracked
                .retain(|path| !matched_new_paths.contains(path));
        } else {
            // No HEAD manifest, all working files are untracked
            for (rel_path, _) in working_files {
                if !index.is_staged(&rel_path) {
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

        if index.is_empty()
            || index
                .entries
                .values()
                .all(|entry| entry.status == FileStatus::Unchanged)
        {
            return Err(RepoError::NothingToCommit);
        }

        // Build manifest from index
        let mut manifest = Manifest::new();
        for (path, entry) in &index.entries {
            if entry.status == FileStatus::Deleted {
                continue;
            }
            let manifest_entry = if let Some(ref mp4_meta) = entry.mp4_metadata {
                let index_mode = entry.mode;
                let mut manifest_entry = ManifestEntry::new_mp4(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.chunks.clone(),
                    mp4_meta.clone(),
                );
                manifest_entry.mode = if index_mode & 0o111 != 0 {
                    FileMode::Executable
                } else if entry.file_type == FileType::Symlink {
                    FileMode::Symlink
                } else {
                    FileMode::Regular
                };
                manifest_entry.file_type = entry.file_type;
                manifest_entry.symlink_target = entry.symlink_target.clone();
                manifest_entry
            } else if entry.is_git_text() {
                // Phase 3.6: Text file stored in Git
                let index_mode = entry.mode;
                let mut manifest_entry = ManifestEntry::new_text(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.git_oid.clone().unwrap_or_default(),
                );
                manifest_entry.mode = if index_mode & 0o111 != 0 {
                    FileMode::Executable
                } else if entry.file_type == FileType::Symlink {
                    FileMode::Symlink
                } else {
                    FileMode::Regular
                };
                manifest_entry.file_type = entry.file_type;
                manifest_entry.symlink_target = entry.symlink_target.clone();
                manifest_entry
            } else {
                // Binary file stored as chunks
                let index_mode = entry.mode;
                let mut manifest_entry = ManifestEntry::new(
                    path.clone(),
                    entry.size,
                    entry.content_hash,
                    entry.chunks.clone(),
                );
                manifest_entry.mode = if index_mode & 0o111 != 0 {
                    FileMode::Executable
                } else if entry.file_type == FileType::Symlink {
                    FileMode::Symlink
                } else {
                    FileMode::Regular
                };
                manifest_entry.file_type = entry.file_type;
                manifest_entry.symlink_target = entry.symlink_target.clone();
                manifest_entry
            };
            manifest.add(manifest_entry);
        }

        // Store manifest
        let manifest_hash = self.objects.store_manifest(&manifest)?;

        // Get parent commit
        let parent = self.refs.resolve_head()?;
        if let Some(parent_hash) = parent {
            let parent_commit = self.objects.load_commit(&parent_hash)?;
            if parent_commit.manifest == manifest_hash {
                let mut normalized_index = Index::from_commit(parent_hash);
                for entry in index.entries.values() {
                    if entry.status == FileStatus::Deleted {
                        continue;
                    }
                    let mut normalized_entry = entry.clone();
                    normalized_entry.status = FileStatus::Unchanged;
                    normalized_index.stage(normalized_entry);
                }
                self.save_index(&normalized_index)?;
                return Err(RepoError::NothingToCommit);
            }
        }

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
        for (_path, entry) in index.entries {
            if entry.status == FileStatus::Deleted {
                continue;
            }
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
        // Capture the current HEAD manifest (if any) so we can remove files that no
        // longer exist in the target commit (branch switches should not leave
        // tracked leftovers behind).
        let previous_manifest = match self.head()? {
            Some(prev_hash) => {
                let prev_commit = self.objects.load_commit(&prev_hash)?;
                Some(self.objects.load_manifest(&prev_commit.manifest)?)
            },
            None => None,
        };

        let commit = self.objects.load_commit(hash)?;
        let manifest = self.objects.load_manifest(&commit.manifest)?;

        // Resolve every path before mutating the working tree. This prevents a
        // malformed manifest or an existing symlink ancestor from turning a
        // partial checkout into an out-of-repository write.
        if let Some(ref previous) = previous_manifest {
            for (path, _) in previous.iter() {
                self.resolve_worktree_path(path)?;
            }
        }
        for (path, _) in manifest.iter() {
            self.resolve_worktree_path(path)?;
        }

        let mut result = CheckoutResult::default();

        // Remove files that were tracked in the previous commit but do not exist in the
        // target.
        if let Some(prev_manifest) = previous_manifest {
            for (old_path, old_entry) in prev_manifest.iter() {
                if manifest.contains(old_path) {
                    continue;
                }

                let full_old_path = self.resolve_worktree_path(old_path)?;
                if !full_old_path.exists() {
                    continue;
                }

                // Best-effort safety: only remove if the working tree matches the previous
                // commit (otherwise leave it in place).
                let should_remove = match old_entry.file_type {
                    FileType::Symlink => fs::read_link(&full_old_path)
                        .ok()
                        .and_then(|p| p.to_str().map(|s| s.to_string()))
                        .map(|target| target == old_entry.symlink_target)
                        .unwrap_or(false),
                    _ => fs::read(&full_old_path)
                        .ok()
                        .map(|data| Hasher::hash(&data) == old_entry.content_hash)
                        .unwrap_or(false),
                };

                if should_remove {
                    // If this was a file or symlink, remove it. (We don't expect directories in
                    // manifests.)
                    let _ = fs::remove_file(&full_old_path);
                }
            }
        }

        for (path, entry) in manifest.iter() {
            let full_path = self.resolve_worktree_path(path)?;

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
            let full_path = self.resolve_worktree_path(path)?;

            // Get file metadata if possible
            let (mode, file_type, symlink_target) = if full_path.exists() {
                if let Ok(metadata) = fs::metadata(&full_path) {
                    let mode = file_mode(&metadata);
                    let file_type = if metadata.is_dir() {
                        FileType::Directory
                    } else if metadata.is_symlink() {
                        FileType::Symlink
                    } else {
                        FileType::Regular
                    };
                    let symlink_target = if file_type == FileType::Symlink {
                        fs::read_link(&full_path)
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_default()
                    } else {
                        String::new()
                    };
                    (mode, file_type, symlink_target)
                } else {
                    (0o644, FileType::Regular, String::new())
                }
            } else {
                (0o644, FileType::Regular, String::new())
            };

            // Recreate index entries from the manifest. These are tracked files, so mark
            // them unchanged (not staged), and preserve storage strategy
            // metadata.
            let mut idx_entry = if let Some(ref mp4_meta) = entry.mp4_metadata {
                IndexEntry::new_mp4(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    mode,
                    file_type,
                    symlink_target,
                    entry.chunks.clone(),
                    mp4_meta.clone(),
                )
            } else {
                IndexEntry::new_with_strategy(
                    path.clone(),
                    entry.content_hash,
                    entry.size,
                    0,
                    mode,
                    file_type,
                    symlink_target,
                    entry.chunks.clone(),
                    entry.storage,
                    entry.git_oid.clone(),
                )
            };
            idx_entry.status = FileStatus::Unchanged;
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
            self.objects.load_blob(ftyp_hash)?
        } else {
            // Fall back to regular checkout if no ftyp stored
            return self.checkout_regular_file(full_path, entry, result);
        };

        // Load moov data (normalized)
        let mut moov_data = if let Some(ref moov_hash) = mp4_meta.moov_hash {
            self.objects.load_blob(moov_hash)?
        } else {
            return self.checkout_regular_file(full_path, entry, result);
        };

        // Load other atoms
        let mut other_atoms_data: std::collections::HashMap<String, Vec<u8>> =
            std::collections::HashMap::new();
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

        // Chunk references carry the complete mdat byte count, so atom offsets
        // can be calculated without materializing the media payload.
        let mdat_size = entry.chunks.iter().try_fold(0u64, |total, chunk| {
            total.checked_add(chunk.size).ok_or_else(|| {
                RepoError::IndexError(format!("mdat size overflow for '{}'", entry.path))
            })
        })?;
        if mdat_size != mp4_meta.mdat_size {
            return Err(RepoError::IndexError(format!(
                "mdat size mismatch for '{}': chunk references total {}, metadata records {}",
                entry.path, mdat_size, mp4_meta.mdat_size
            )));
        }

        // Create mdat header
        let mdat_header = crate::mp4::create_mdat_header(mdat_size);

        // Determine atom order and calculate positions
        // If we have a saved atom_order, use it; otherwise use default: ftyp, moov,
        // mdat
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
                },
                "moov" => {
                    current_offset += moov_data.len() as u64;
                },
                "mdat" => {
                    mdat_data_start = current_offset + mdat_header.len() as u64;
                    current_offset += mdat_header.len() as u64 + mdat_size;
                },
                other => {
                    if let Some(data) = other_atoms_data.get(other) {
                        current_offset += data.len() as u64;
                    }
                },
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

        // Stream the reconstructed MP4 to a same-directory temporary file.
        // Only the small structural atoms and one decoded mdat chunk are held
        // in memory at a time.
        let mut writer = CheckoutWriter::new(full_path)?;

        for atom_type in &atom_order {
            match atom_type.as_str() {
                "ftyp" => {
                    writer.write_all(&ftyp_data)?;
                },
                "moov" => {
                    writer.write_all(&moov_data)?;
                },
                "mdat" => {
                    writer.write_all(&mdat_header)?;
                    for chunk_ref in &entry.chunks {
                        let chunk = self.objects.load_chunk(&chunk_ref.hash)?;
                        if chunk.data.len() as u64 != chunk_ref.size {
                            return Err(RepoError::IndexError(format!(
                                "chunk size mismatch for '{}': {} records {}, object contains {}",
                                entry.path,
                                chunk_ref.hash,
                                chunk_ref.size,
                                chunk.data.len()
                            )));
                        }
                        writer.write_all(&chunk.data)?;
                    }
                },
                other => {
                    if let Some(data) = other_atoms_data.get(other) {
                        writer.write_all(data)?;
                    }
                },
            }
        }

        writer.finish(entry.size)?;

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

    /// Checkout a regular (non-MP4) file by reassembling chunks or loading from
    /// Git.
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
                let mut writer = CheckoutWriter::new(full_path)?;
                writer.write_all(&data)?;
                writer.finish(entry.size)?;
                result.files_restored += 1;
                result.bytes_restored += entry.size;
                return Ok(());
            }
            // Fall through to chunk-based restore if Git engine not available
        }

        // Reassemble directly into a temporary worktree file. A failed object
        // load leaves the existing destination untouched.
        let mut writer = CheckoutWriter::new(full_path)?;
        for chunk_ref in &entry.chunks {
            let chunk = self.objects.load_chunk(&chunk_ref.hash)?;
            if chunk.data.len() as u64 != chunk_ref.size {
                return Err(RepoError::IndexError(format!(
                    "chunk size mismatch for '{}': {} records {}, object contains {}",
                    entry.path,
                    chunk_ref.hash,
                    chunk_ref.size,
                    chunk.data.len()
                )));
            }
            writer.write_all(&chunk.data)?;
        }

        writer.finish(entry.size)?;
        result.files_restored += 1;
        result.bytes_restored += entry.size;

        Ok(())
    }

    /// Reconstruct a manifest entry's full byte content, honoring its storage
    /// strategy (GitText files read from the git engine; others reassemble
    /// from Dits chunks). Use this anywhere you need a tracked file's
    /// committed bytes (e.g. stash reset).
    pub fn reconstruct_entry_bytes(&self, entry: &ManifestEntry) -> Result<Vec<u8>, RepoError> {
        if entry.is_git_text() {
            if let (Some(ref git_oid), Some(ref engine)) = (&entry.git_oid, &self.git_engine) {
                let oid = GitTextEngine::parse_oid(git_oid)?;
                return Ok(engine.read_blob(oid)?);
            }
            // Fall through to chunk reassembly if the git engine is
            // unavailable.
        }
        let mut data = Vec::with_capacity(entry.size as usize);
        for chunk_ref in &entry.chunks {
            let chunk = self.objects.load_chunk(&chunk_ref.hash)?;
            data.extend_from_slice(&chunk.data);
        }
        Ok(data)
    }

    // ========== Branch Operations ==========

    /// Get current branch name (None if detached HEAD).
    pub fn current_branch(&self) -> Result<Option<String>, RepoError> {
        Ok(self.refs.current_branch()?)
    }

    // ========== Accessor Methods for Extensions ==========

    /// Get reference to the Git engine (for extensions like sparse checkout).
    pub fn git_engine(&self) -> Option<&GitTextEngine> {
        self.git_engine.as_ref()
    }

    /// Resolve a canonical manifest/index path beneath the working tree.
    /// Existing symlink ancestors are rejected to keep reads and writes inside
    /// the repository.
    pub fn resolve_worktree_path(&self, path: &str) -> Result<PathBuf, RepoError> {
        crate::util::safe_join_repo_path(&self.work_dir, path).map_err(|error| {
            RepoError::InvalidPath { path: path.to_string(), reason: error.to_string() }
        })
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
            },
            None => {
                // No commits yet - can still create branch, it just won't point anywhere
                Err(RepoError::NothingToCommit)
            },
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
            chunk_count:    chunks,
            manifest_count: manifests,
            commit_count:   commits,
            storage_bytes:  storage_size,
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

    /// Compute comprehensive repo stats for a commit including deduplication
    /// metrics.
    pub fn compute_repo_dedup_stats(
        &self,
        commit_hash: &Hash,
    ) -> Result<RepoDedupStats, RepoError> {
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
                },
            }
        }

        let saved_bytes = logical_size.saturating_sub(physical_size);
        let dedup_ratio = if logical_size > 0 {
            physical_size as f64 / logical_size as f64
        } else {
            1.0
        };
        // Use saturating_sub to avoid underflow panic if physical > logical (shouldn't
        // happen but be safe)
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
        let mut all_chunk_counts: std::collections::HashMap<Hash, u64> =
            std::collections::HashMap::new();
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
            },
            None => Ok(Vec::new()),
        }
    }
}

/// Result of an add operation.
#[derive(Debug, Default)]
pub struct AddResult {
    pub files_staged:     usize,
    /// Tracked files whose deletion was staged.
    pub files_deleted:    usize,
    /// Newly staged files removed from the index after disappearing before a
    /// commit.
    pub files_unstaged:   usize,
    pub files_ignored:    usize,
    /// Symbolic links encountered during a directory add. Symlink versioning is
    /// not supported yet, so these are skipped — but reported so it is
    /// never silent.
    pub symlinks_skipped: usize,
    pub new_chunks:       usize,
    pub new_bytes:        u64,
    pub dedup_chunks:     usize,
    pub dedup_bytes:      u64,
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
    pub branch:              Option<String>,
    pub staged_new:          Vec<String>,
    pub staged_modified:     Vec<String>,
    pub staged_deleted:      Vec<String>,
    pub staged_renamed:      Vec<(String, String)>, // (old_path, new_path)
    pub staged_type_changed: Vec<String>,
    pub staged_mode_changed: Vec<String>,
    pub modified:            Vec<String>,
    pub deleted:             Vec<String>,
    pub untracked:           Vec<String>,
    pub unstaged_renamed:    Vec<(String, String)>, // (old_path, new_path)
}

impl Status {
    /// Check if there are any changes.
    pub fn is_clean(&self) -> bool {
        self.staged_new.is_empty()
            && self.staged_modified.is_empty()
            && self.staged_deleted.is_empty()
            && self.staged_renamed.is_empty()
            && self.staged_type_changed.is_empty()
            && self.staged_mode_changed.is_empty()
            && self.modified.is_empty()
            && self.deleted.is_empty()
            && self.unstaged_renamed.is_empty()
    }

    /// Check if there are staged changes.
    pub fn has_staged(&self) -> bool {
        !self.staged_new.is_empty()
            || !self.staged_modified.is_empty()
            || !self.staged_deleted.is_empty()
            || !self.staged_renamed.is_empty()
            || !self.staged_type_changed.is_empty()
            || !self.staged_mode_changed.is_empty()
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
    pub chunk_count:    usize,
    pub manifest_count: usize,
    pub commit_count:   usize,
    pub storage_bytes:  u64,
}

// ========== Phase 4: Advanced Stats Structures ==========

/// Statistics for a single file in a commit.
#[derive(Debug, Clone)]
pub struct FileStats {
    /// File path relative to repo root.
    pub path:          String,
    /// Hash of the manifest containing this file.
    pub manifest_hash: Hash,
    /// Content hash of the file.
    pub content_hash:  Hash,
    /// Logical file size in bytes.
    pub file_size:     u64,
    /// Number of chunks.
    pub chunk_count:   usize,
    /// List of chunk hashes.
    pub chunk_hashes:  Vec<Hash>,
    /// Whether this is an MP4 file with special handling.
    pub is_mp4:        bool,
}

/// Comprehensive repository deduplication statistics.
#[derive(Debug, Clone)]
pub struct RepoDedupStats {
    /// Commit hash these stats are for.
    pub commit_hash:        Hash,
    /// Number of files in the commit.
    pub file_count:         usize,
    /// Total logical size of all files (sum of file sizes).
    pub logical_size:       u64,
    /// Number of unique chunks.
    pub unique_chunk_count: usize,
    /// Physical storage size (sum of unique chunk sizes).
    pub physical_size:      u64,
    /// Bytes saved through deduplication.
    pub saved_bytes:        u64,
    /// Deduplication ratio (physical / logical). Lower is better.
    pub dedup_ratio:        f64,
    /// Percentage of storage saved. Higher is better.
    pub savings_percentage: f64,
}

/// Deduplication statistics for a single file.
#[derive(Debug, Clone)]
pub struct FileDedupStats {
    /// File path.
    pub path:                   String,
    /// Manifest hash.
    pub manifest_hash:          Hash,
    /// Content hash.
    pub content_hash:           Hash,
    /// Logical file size.
    pub logical_size:           u64,
    /// Total number of chunks.
    pub chunk_count:            usize,
    /// Chunks shared with other files in the repo.
    pub shared_chunk_count:     usize,
    /// Chunks unique to this file.
    pub unique_chunk_count:     usize,
    /// Estimated unique physical size (size of unique chunks).
    pub estimated_unique_bytes: u64,
    /// List of all chunk hashes for this file.
    pub chunk_hashes:           Vec<Hash>,
    /// Whether this is an MP4 file.
    pub is_mp4:                 bool,
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
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn test_init_repository() {
        let temp = tempdir().unwrap();
        let _repo = Repository::init(temp.path()).unwrap();

        assert!(temp.path().join(".dits").exists());
        assert!(temp.path().join(".dits/objects").exists());
        assert!(temp.path().join(".dits/refs").exists());
        assert!(temp.path().join(".dits/index").exists());
    }

    #[test]
    fn test_index_decoder_dispatches_current_json_and_legacy_bincode() {
        let mut index = Index::new();
        index.base_commit = Some(Hash::ZERO);

        let json = format!(" \n{}", index.to_json());
        assert!(Repository::index_bytes_look_like_json(json.as_bytes()));
        let decoded_json = Repository::decode_index_bytes(json.as_bytes()).unwrap();
        assert_eq!(decoded_json.base_commit, Some(Hash::ZERO));

        let legacy = bincode::serialize(&index).unwrap();
        assert!(!Repository::index_bytes_look_like_json(&legacy));
        let decoded_legacy = Repository::decode_index_bytes(&legacy).unwrap();
        assert_eq!(decoded_legacy.base_commit, Some(Hash::ZERO));

        assert!(Repository::decode_index_bytes(b"{not valid JSON").is_err());
    }

    #[test]
    fn test_open_rejects_malformed_local_config_without_rewriting_it() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let config_path = repo.dits_dir().join("config.toml");
        let malformed = b"[chunking\ntarget_size = nope\n";
        fs::write(&config_path, malformed).unwrap();
        drop(repo);

        assert!(matches!(Repository::open(temp.path()), Err(RepoError::Config(_))));
        assert_eq!(fs::read(config_path).unwrap(), malformed);
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
    fn test_add_paths_keeps_successes_when_another_path_fails() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        fs::write(temp.path().join("first.txt"), b"first").unwrap();
        fs::write(temp.path().join("second.txt"), b"second").unwrap();

        let outcomes = repo
            .add_paths(&["first.txt", "missing.txt", "second.txt"])
            .unwrap();
        assert_eq!(outcomes.len(), 3);
        assert!(outcomes[0].is_ok());
        assert!(matches!(
            &outcomes[1],
            Err(RepoError::FileNotFound(path)) if path == "missing.txt"
        ));
        assert!(outcomes[2].is_ok());

        let index = repo.load_index().unwrap();
        assert!(index.get("first.txt").is_some());
        assert!(index.get("second.txt").is_some());
        assert!(index.get("missing.txt").is_none());
    }

    #[test]
    fn test_commit_rejects_unchanged_and_reverted_snapshots() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("note.txt");

        fs::write(&file, b"original").unwrap();
        repo.add("note.txt").unwrap();
        let base = repo.commit("base").unwrap();

        assert!(matches!(repo.commit("duplicate"), Err(RepoError::NothingToCommit)));

        fs::write(&file, b"changed").unwrap();
        repo.add("note.txt").unwrap();
        fs::write(&file, b"original").unwrap();
        repo.add("note.txt").unwrap();

        assert!(matches!(repo.commit("reverted"), Err(RepoError::NothingToCommit)));
        assert_eq!(repo.log(10).unwrap().len(), 1);

        let index = repo.load_index().unwrap();
        assert_eq!(index.base_commit, Some(base.hash));
        assert_eq!(index.get("note.txt").unwrap().status, FileStatus::Unchanged);
        assert!(repo.status().unwrap().is_clean());
    }

    #[test]
    fn test_readding_changed_new_file_preserves_added_status() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("new.bin");

        fs::write(&file, b"first version").unwrap();
        repo.add("new.bin").unwrap();
        fs::write(&file, b"second version").unwrap();
        repo.add("new.bin").unwrap();

        let index = repo.load_index().unwrap();
        assert_eq!(index.get("new.bin").unwrap().status, FileStatus::Added);
        let status = repo.status().unwrap();
        assert!(status.staged_new.contains(&"new.bin".to_string()));
        assert!(!status.staged_modified.contains(&"new.bin".to_string()));
    }

    #[test]
    fn test_stage_and_commit_tracked_deletion() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("remove-me.txt");

        fs::write(&file, b"tracked").unwrap();
        repo.add("remove-me.txt").unwrap();
        repo.commit("base").unwrap();
        fs::remove_file(&file).unwrap();

        let status = repo.status().unwrap();
        assert!(status.deleted.contains(&"remove-me.txt".to_string()));

        let add = repo.add("remove-me.txt").unwrap();
        assert_eq!(add.files_deleted, 1);
        assert!(repo
            .status()
            .unwrap()
            .staged_deleted
            .contains(&"remove-me.txt".to_string()));

        let staged_once = repo.load_index().unwrap().to_json();
        let repeated = repo.add("remove-me.txt").unwrap();
        assert_eq!(repeated.files_staged, 0);
        assert_eq!(repeated.files_deleted, 0);
        assert_eq!(repo.load_index().unwrap().to_json(), staged_once);

        let deletion = repo.commit("remove tracked file").unwrap();
        let manifest = repo.load_manifest(&deletion.manifest).unwrap();
        assert!(!manifest.contains("remove-me.txt"));
        assert!(!repo
            .load_index()
            .unwrap()
            .entries
            .contains_key("remove-me.txt"));
    }

    #[test]
    fn test_restoring_deleted_staged_content_compares_against_base_commit() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("tracked.bin");

        fs::write(&file, b"base bytes").unwrap();
        repo.add("tracked.bin").unwrap();
        repo.commit("base").unwrap();

        fs::write(&file, b"staged modification").unwrap();
        repo.add("tracked.bin").unwrap();
        fs::remove_file(&file).unwrap();
        repo.add("tracked.bin").unwrap();

        // The Deleted entry retains the staged-modification bytes. Restoring
        // those bytes must recover Modified, not claim they equal HEAD.
        fs::write(&file, b"staged modification").unwrap();
        repo.add("tracked.bin").unwrap();
        assert_eq!(
            repo.load_index()
                .unwrap()
                .get("tracked.bin")
                .unwrap()
                .status,
            FileStatus::Modified
        );

        // Restoring the actual base bytes cancels the staged change.
        fs::remove_file(&file).unwrap();
        repo.add("tracked.bin").unwrap();
        fs::write(&file, b"base bytes").unwrap();
        repo.add("tracked.bin").unwrap();
        assert_eq!(
            repo.load_index()
                .unwrap()
                .get("tracked.bin")
                .unwrap()
                .status,
            FileStatus::Unchanged
        );
        assert!(repo.status().unwrap().is_clean());
    }

    #[test]
    fn test_vanished_new_file_is_removed_from_index() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("temporary.txt");

        fs::write(&file, b"temporary").unwrap();
        repo.add("temporary.txt").unwrap();
        fs::remove_file(&file).unwrap();

        let add = repo.add("temporary.txt").unwrap();
        assert_eq!(add.files_unstaged, 1);
        assert!(repo.load_index().unwrap().is_empty());
        assert!(matches!(repo.commit("nothing"), Err(RepoError::NothingToCommit)));
    }

    #[test]
    fn test_unstaged_rename_candidates_are_consumed_once() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let content = b"identical content";

        fs::write(temp.path().join("first.bin"), content).unwrap();
        fs::write(temp.path().join("second.bin"), content).unwrap();
        repo.add("first.bin").unwrap();
        repo.add("second.bin").unwrap();
        repo.commit("two identical files").unwrap();

        fs::remove_file(temp.path().join("first.bin")).unwrap();
        fs::remove_file(temp.path().join("second.bin")).unwrap();
        fs::write(temp.path().join("replacement.bin"), content).unwrap();

        let status = repo.status().unwrap();
        assert_eq!(status.unstaged_renamed.len(), 1);
        assert_eq!(status.unstaged_renamed[0].1, "replacement.bin");
        assert_eq!(status.deleted.len(), 1);
        assert!(!status.untracked.contains(&"replacement.bin".to_string()));

        let accounted_sources: std::collections::HashSet<_> = status
            .unstaged_renamed
            .iter()
            .map(|(old_path, _)| old_path.as_str())
            .chain(status.deleted.iter().map(String::as_str))
            .collect();
        assert_eq!(accounted_sources, std::collections::HashSet::from(["first.bin", "second.bin"]));
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
    fn test_failed_streaming_checkout_keeps_existing_file() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let file = temp.path().join("large.bin");
        let content: Vec<u8> = (0..300_000).map(|i| (i % 251) as u8).collect();

        fs::write(&file, &content).unwrap();
        repo.add("large.bin").unwrap();
        let commit = repo.commit("chunked file").unwrap();
        let manifest = repo.objects.load_manifest(&commit.manifest).unwrap();
        let entry = manifest.get("large.bin").unwrap();
        assert!(entry.chunks.len() > 1);

        let missing = entry.chunks.last().unwrap().hash.to_hex();
        let missing_path = repo
            .dits_dir
            .join("objects/chunks")
            .join(&missing[..2])
            .join(&missing[2..]);
        fs::remove_file(missing_path).unwrap();
        fs::write(&file, b"keep existing bytes").unwrap();

        assert!(repo.checkout(&commit.hash).is_err());
        assert_eq!(fs::read(&file).unwrap(), b"keep existing bytes");
        assert!(!fs::read_dir(temp.path())
            .unwrap()
            .filter_map(Result::ok)
            .any(|entry| entry.file_name().to_string_lossy().contains("checkout.tmp")));
    }

    #[test]
    fn test_add_rejects_paths_outside_the_repository() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        for invalid in ["../outside.txt", "/tmp/outside.txt", "C:/outside.txt", ".dits/HEAD"] {
            assert!(matches!(repo.add(invalid), Err(RepoError::InvalidPath { .. })));
        }
    }

    #[test]
    fn test_read_only_open_does_not_initialize_missing_git_store() {
        let temp = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        let git_dir = repo.dits_dir().join("objects/git");
        fs::remove_dir_all(&git_dir).unwrap();

        let read_only = Repository::open_read_only(temp.path()).unwrap();
        assert!(read_only.git_engine().is_none());
        assert!(!git_dir.exists());

        let normal = Repository::open(temp.path()).unwrap();
        assert!(normal.git_engine().is_some());
        assert!(git_dir.exists());
    }

    #[cfg(unix)]
    #[test]
    fn test_checkout_rejects_symlink_parent_escape() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let repo = Repository::init(temp.path()).unwrap();
        fs::create_dir(temp.path().join("media")).unwrap();
        fs::write(temp.path().join("media/shot.bin"), b"inside").unwrap();
        repo.add("media/shot.bin").unwrap();
        let commit = repo.commit("safe snapshot").unwrap();

        fs::remove_file(temp.path().join("media/shot.bin")).unwrap();
        fs::remove_dir(temp.path().join("media")).unwrap();
        symlink(outside.path(), temp.path().join("media")).unwrap();

        assert!(matches!(repo.checkout(&commit.hash), Err(RepoError::InvalidPath { .. })));
        assert!(!outside.path().join("shot.bin").exists());
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

    #[test]
    fn test_status_pruning_preserves_negated_file_in_ignored_directory() {
        let temp = tempdir().unwrap();
        fs::write(
            temp.path().join(".ditsignore"),
            "ignored/\n!ignored/keep.txt\n",
        )
        .unwrap();
        fs::create_dir(temp.path().join("ignored")).unwrap();
        fs::write(temp.path().join("ignored/keep.txt"), b"keep").unwrap();
        fs::write(temp.path().join("ignored/drop.txt"), b"drop").unwrap();
        let repo = Repository::init(temp.path()).unwrap();

        let status = repo.status().unwrap();
        assert!(status.untracked.contains(&"ignored/keep.txt".to_string()));
        assert!(!status.untracked.contains(&"ignored/drop.txt".to_string()));
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
        let stats = repo
            .compute_file_dedup_stats(&commit.hash, "file1.bin")
            .unwrap();

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
        let stats = repo
            .compute_file_dedup_stats(&commit.hash, "file1.bin")
            .unwrap();

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
