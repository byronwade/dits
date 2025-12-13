# Speculative Transport (Zero-Latency Uploads)

Background upload system that predicts and uploads content before the user explicitly requests it.

---

## Overview

Speculative Transport solves a critical pain point in video production: the **Save-Wait-Push** problem. Editors work for hours, then hit "Save," then wait for uploads that can take an hour or more. Speculative Transport eliminates this wait by intelligently uploading content while the user is still editing.

### The Problem

```
Traditional Workflow:
┌──────────────────────────────────────────────────────────────────┐
│  [Edit: 4 hours] → [Save] → [Chunk] → [Upload: 1 hour] → [Done] │
│                             ↑                                    │
│                    User waits here                               │
└──────────────────────────────────────────────────────────────────┘

With Speculative Transport:
┌──────────────────────────────────────────────────────────────────┐
│  [Edit: 4 hours]                                                 │
│       ↓ (continuous background sync)                             │
│  [Save] → [Push] → [2 seconds] → [Done]                          │
│                                                                  │
│  "We already have 95% of this on the server"                     │
└──────────────────────────────────────────────────────────────────┘
```

### Key Innovation

Modern NLEs (Non-Linear Editors) constantly create temporary files:
- **Premiere Pro**: Media Cache, Auto-Save (.cfa, .pek, .prproj~)
- **DaVinci Resolve**: Cache files, Optimized Media, Auto-saves
- **After Effects**: Disk Cache, Auto-Save
- **Final Cut Pro**: Render Files, Auto-Save

These temp files contain the **same binary content** that will eventually be saved. Speculative Transport watches these files, chunks them, and uploads them proactively.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER'S WORKSTATION                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────────────────────────────────────┐   │
│  │   Premiere   │    │              Dits Background Agent            │   │
│  │    Pro       │    │  ┌─────────────┐  ┌─────────────────────┐    │   │
│  └──────┬───────┘    │  │   Watcher   │  │   Speculative       │    │   │
│         │            │  │   Service   │  │   Upload Engine     │    │   │
│         │ writes     │  └──────┬──────┘  └──────────┬──────────┘    │   │
│         ▼            │         │                    │               │   │
│  ┌──────────────┐    │         │ inotify/FSEvents   │               │   │
│  │ Media Cache  │────│─────────┘                    │               │   │
│  │ Auto-Save    │    │                              │               │   │
│  │ Temp Files   │    │  ┌─────────────────────────┐ │               │   │
│  └──────────────┘    │  │    Chunk Dedup Cache    │◄┘               │   │
│                      │  │  (in-memory hash set)   │                 │   │
│                      │  └───────────┬─────────────┘                 │   │
│                      │              │                               │   │
│                      │              │ new chunks only               │   │
│                      │              ▼                               │   │
│                      │  ┌─────────────────────────┐                 │   │
│                      │  │   Upload Queue          │                 │   │
│                      │  │   (priority-ordered)    │                 │   │
│                      │  └───────────┬─────────────┘                 │   │
│                      │              │                               │   │
│                      └──────────────│───────────────────────────────┘   │
│                                     │                                    │
└─────────────────────────────────────│────────────────────────────────────┘
                                      │ QUIC
                                      ▼
                        ┌─────────────────────────────┐
                        │       Dits Server           │
                        │  ┌───────────────────────┐  │
                        │  │  Speculative Chunk    │  │
                        │  │  Store (temporary)    │  │
                        │  └───────────┬───────────┘  │
                        │              │              │
                        │              │ on push      │
                        │              ▼              │
                        │  ┌───────────────────────┐  │
                        │  │  Permanent Storage    │  │
                        │  │  (S3/GCS)             │  │
                        │  └───────────────────────┘  │
                        └─────────────────────────────┘
```

---

## Implementation

### Watcher Service

```rust
use notify::{Watcher, RecursiveMode, watcher, DebouncedEvent};
use std::sync::mpsc::channel;
use std::time::Duration;

/// Watches NLE temp directories for changes
pub struct NleWatcher {
    /// Active watchers
    watchers: Vec<notify::RecommendedWatcher>,

    /// File event receiver
    event_rx: std::sync::mpsc::Receiver<DebouncedEvent>,

    /// NLE detection
    nle_detector: NleDetector,

    /// Configuration
    config: WatcherConfig,
}

#[derive(Clone)]
pub struct WatcherConfig {
    /// Debounce interval (ms)
    pub debounce_ms: u64,

    /// Minimum file size to process (bytes)
    pub min_file_size: u64,

    /// File patterns to watch
    pub patterns: Vec<glob::Pattern>,

    /// Directories to ignore
    pub ignore_dirs: Vec<String>,

    /// Maximum files to track
    pub max_tracked_files: usize,
}

impl Default for WatcherConfig {
    fn default() -> Self {
        Self {
            debounce_ms: 1000,          // 1 second debounce
            min_file_size: 1024 * 1024, // 1MB minimum
            patterns: vec![
                glob::Pattern::new("*.cfa").unwrap(),   // Premiere cache
                glob::Pattern::new("*.pek").unwrap(),   // Premiere peak files
                glob::Pattern::new("*.prproj*").unwrap(), // Premiere auto-saves
                glob::Pattern::new("*.drp").unwrap(),   // Resolve projects
                glob::Pattern::new("*.braw").unwrap(),  // Blackmagic RAW
                glob::Pattern::new("*.aep").unwrap(),   // After Effects
                glob::Pattern::new("*.mov").unwrap(),
                glob::Pattern::new("*.mp4").unwrap(),
                glob::Pattern::new("*.mxf").unwrap(),
            ],
            ignore_dirs: vec![
                ".dits".to_string(),
                ".git".to_string(),
                "node_modules".to_string(),
            ],
            max_tracked_files: 10_000,
        }
    }
}

impl NleWatcher {
    pub fn new(config: WatcherConfig) -> Result<Self> {
        let (tx, rx) = channel();
        let debounce = Duration::from_millis(config.debounce_ms);

        Ok(Self {
            watchers: Vec::new(),
            event_rx: rx,
            nle_detector: NleDetector::new(),
            config,
        })
    }

    /// Start watching detected NLE directories
    pub fn start(&mut self) -> Result<()> {
        // Detect running NLEs and their cache directories
        let nle_dirs = self.nle_detector.detect_cache_directories()?;

        for dir in nle_dirs {
            info!("Watching NLE directory: {}", dir.display());

            let (tx, _) = channel();
            let mut watcher = watcher(tx, Duration::from_millis(self.config.debounce_ms))?;
            watcher.watch(&dir, RecursiveMode::Recursive)?;

            self.watchers.push(watcher);
        }

        Ok(())
    }

    /// Get next file change event
    pub fn next_event(&self) -> Option<FileChangeEvent> {
        match self.event_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(event) => self.process_event(event),
            Err(_) => None,
        }
    }

    fn process_event(&self, event: DebouncedEvent) -> Option<FileChangeEvent> {
        match event {
            DebouncedEvent::Create(path) | DebouncedEvent::Write(path) => {
                // Check if file matches patterns
                if !self.should_process(&path) {
                    return None;
                }

                // Get file metadata
                let metadata = std::fs::metadata(&path).ok()?;

                // Skip small files
                if metadata.len() < self.config.min_file_size {
                    return None;
                }

                Some(FileChangeEvent {
                    path,
                    size: metadata.len(),
                    event_type: ChangeType::Modified,
                    timestamp: std::time::Instant::now(),
                })
            }
            DebouncedEvent::Remove(path) => {
                Some(FileChangeEvent {
                    path,
                    size: 0,
                    event_type: ChangeType::Deleted,
                    timestamp: std::time::Instant::now(),
                })
            }
            _ => None,
        }
    }

    fn should_process(&self, path: &Path) -> bool {
        // Check ignore list
        for ignore in &self.config.ignore_dirs {
            if path.to_string_lossy().contains(ignore) {
                return false;
            }
        }

        // Check patterns
        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        self.config.patterns.iter().any(|p| p.matches(filename))
    }
}

/// Detected file change
#[derive(Debug)]
pub struct FileChangeEvent {
    pub path: PathBuf,
    pub size: u64,
    pub event_type: ChangeType,
    pub timestamp: std::time::Instant,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ChangeType {
    Modified,
    Deleted,
}
```

### NLE Detection

```rust
/// Detects running NLEs and their cache directories
pub struct NleDetector {
    /// Known NLE signatures
    signatures: Vec<NleSignature>,
}

struct NleSignature {
    /// Process name to look for
    process_name: &'static str,

    /// NLE type
    nle_type: NleType,

    /// Cache directory patterns (relative to home)
    cache_dirs: Vec<&'static str>,

    /// Auto-save directory patterns
    autosave_dirs: Vec<&'static str>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NleType {
    PremierePro,
    DaVinciResolve,
    AfterEffects,
    FinalCutPro,
    UnrealEngine,
}

impl NleDetector {
    pub fn new() -> Self {
        Self {
            signatures: vec![
                NleSignature {
                    process_name: "Adobe Premiere Pro",
                    nle_type: NleType::PremierePro,
                    #[cfg(target_os = "macos")]
                    cache_dirs: vec![
                        "Library/Application Support/Adobe/Common/Media Cache Files",
                        "Library/Application Support/Adobe/Common/Media Cache",
                    ],
                    #[cfg(target_os = "windows")]
                    cache_dirs: vec![
                        "AppData/Roaming/Adobe/Common/Media Cache Files",
                        "AppData/Roaming/Adobe/Common/Media Cache",
                    ],
                    autosave_dirs: vec![
                        "Documents/Adobe/Premiere Pro/*/Adobe Premiere Pro Auto-Save",
                    ],
                },
                NleSignature {
                    process_name: "Resolve",
                    nle_type: NleType::DaVinciResolve,
                    #[cfg(target_os = "macos")]
                    cache_dirs: vec![
                        "Movies/CacheClip",  // Default first media storage location
                    ],
                    #[cfg(target_os = "windows")]
                    cache_dirs: vec![
                        "AppData/Roaming/Blackmagic Design/DaVinci Resolve/CacheClip",
                    ],
                    #[cfg(target_os = "linux")]
                    cache_dirs: vec![
                        ".local/share/DaVinciResolve/CacheClip",
                    ],
                    autosave_dirs: vec![
                        // Resolve uses database, auto-save is internal
                    ],
                },
                NleSignature {
                    process_name: "After Effects",
                    nle_type: NleType::AfterEffects,
                    #[cfg(target_os = "macos")]
                    cache_dirs: vec![
                        "Library/Caches/Adobe/After Effects",
                    ],
                    #[cfg(target_os = "windows")]
                    cache_dirs: vec![
                        "AppData/Roaming/Adobe/Common/Media Cache Files",
                    ],
                    autosave_dirs: vec![
                        "Documents/Adobe/After Effects/*/Adobe After Effects Auto-Save",
                    ],
                },
                NleSignature {
                    process_name: "Final Cut Pro",
                    nle_type: NleType::FinalCutPro,
                    cache_dirs: vec![
                        "Movies/*/Render Files",
                        "Library/Caches/com.apple.FinalCut",
                    ],
                    autosave_dirs: vec![
                        "Movies/*/Autosave Vault",
                    ],
                },
                NleSignature {
                    process_name: "UnrealEditor",
                    nle_type: NleType::UnrealEngine,
                    cache_dirs: vec![
                        "Documents/Unreal Projects/*/Saved/MovieRenderPipeline",
                        "Documents/Unreal Projects/*/Saved/Screenshots",
                    ],
                    autosave_dirs: vec![
                        "Documents/Unreal Projects/*/Saved/Autosaves",
                    ],
                },
            ],
        }
    }

    /// Detect all cache directories for running NLEs
    pub fn detect_cache_directories(&self) -> Result<Vec<PathBuf>> {
        let mut dirs = Vec::new();
        let home = dirs::home_dir().ok_or(Error::NoHomeDirectory)?;

        // Get running processes
        let running_nles = self.detect_running_nles()?;

        for nle in running_nles {
            let sig = self.signatures.iter()
                .find(|s| s.nle_type == nle)
                .unwrap();

            // Expand cache directories
            for pattern in &sig.cache_dirs {
                for path in glob::glob(&home.join(pattern).to_string_lossy())? {
                    if let Ok(p) = path {
                        if p.exists() && p.is_dir() {
                            dirs.push(p);
                        }
                    }
                }
            }

            // Expand auto-save directories
            for pattern in &sig.autosave_dirs {
                for path in glob::glob(&home.join(pattern).to_string_lossy())? {
                    if let Ok(p) = path {
                        if p.exists() && p.is_dir() {
                            dirs.push(p);
                        }
                    }
                }
            }
        }

        Ok(dirs)
    }

    /// Detect which NLEs are currently running
    #[cfg(target_os = "macos")]
    fn detect_running_nles(&self) -> Result<Vec<NleType>> {
        use sysinfo::{ProcessExt, System, SystemExt};

        let mut sys = System::new();
        sys.refresh_processes();

        let mut running = Vec::new();

        for (_, process) in sys.processes() {
            let name = process.name();

            for sig in &self.signatures {
                if name.contains(sig.process_name) && !running.contains(&sig.nle_type) {
                    running.push(sig.nle_type);
                }
            }
        }

        Ok(running)
    }
}
```

### Speculative Upload Engine

```rust
use std::collections::HashSet;
use tokio::sync::RwLock;

/// Speculative upload engine
pub struct SpeculativeEngine {
    /// Set of chunk hashes already uploaded
    uploaded_chunks: Arc<RwLock<HashSet<Blake3Hash>>>,

    /// Set of chunk hashes pending upload
    pending_chunks: Arc<RwLock<HashSet<Blake3Hash>>>,

    /// Upload queue (priority ordered)
    upload_queue: flume::Sender<SpeculativeChunk>,

    /// Configuration
    config: SpeculativeConfig,

    /// Transport client
    client: Arc<TransportClient>,

    /// Statistics
    stats: Arc<SpeculativeStats>,
}

#[derive(Clone)]
pub struct SpeculativeConfig {
    /// Maximum upload bandwidth (bytes/sec, 0 = unlimited)
    pub max_bandwidth: u64,

    /// Priority for speculative uploads (0-100)
    /// Lower = less priority vs explicit operations
    pub priority: u8,

    /// Number of upload workers
    pub worker_count: usize,

    /// Chunk TTL on server before garbage collection (hours)
    pub chunk_ttl_hours: u32,

    /// Maximum pending queue size
    pub max_queue_size: usize,

    /// Backoff on network errors (seconds)
    pub error_backoff_secs: u64,
}

impl Default for SpeculativeConfig {
    fn default() -> Self {
        Self {
            max_bandwidth: 0,  // Unlimited
            priority: 25,      // Low priority
            worker_count: 2,   // 2 upload workers
            chunk_ttl_hours: 72, // 3 days
            max_queue_size: 10_000,
            error_backoff_secs: 30,
        }
    }
}

/// A chunk pending speculative upload
#[derive(Debug)]
pub struct SpeculativeChunk {
    pub hash: Blake3Hash,
    pub data: Vec<u8>,
    pub source_path: PathBuf,
    pub priority: u8,
    pub created_at: std::time::Instant,
}

impl SpeculativeEngine {
    pub async fn new(
        config: SpeculativeConfig,
        client: Arc<TransportClient>,
    ) -> Result<Self> {
        let (tx, rx) = flume::bounded(config.max_queue_size);

        let engine = Self {
            uploaded_chunks: Arc::new(RwLock::new(HashSet::new())),
            pending_chunks: Arc::new(RwLock::new(HashSet::new())),
            upload_queue: tx,
            config: config.clone(),
            client,
            stats: Arc::new(SpeculativeStats::new()),
        };

        // Spawn upload workers
        for i in 0..config.worker_count {
            let rx = rx.clone();
            let engine = engine.clone();

            tokio::spawn(async move {
                engine.upload_worker(i, rx).await;
            });
        }

        Ok(engine)
    }

    /// Process a file change event
    pub async fn process_file(&self, event: FileChangeEvent) -> Result<ProcessResult> {
        if event.event_type == ChangeType::Deleted {
            return Ok(ProcessResult::Skipped);
        }

        let start = std::time::Instant::now();

        // Chunk the file
        let file = tokio::fs::File::open(&event.path).await?;
        let chunks = chunk_file_async(file, FastCdcConfig::video()).await?;

        let mut new_chunks = 0;
        let mut existing_chunks = 0;

        for chunk_info in &chunks {
            // Check if already uploaded
            if self.uploaded_chunks.read().await.contains(&chunk_info.hash) {
                existing_chunks += 1;
                continue;
            }

            // Check if already pending
            if self.pending_chunks.read().await.contains(&chunk_info.hash) {
                continue;
            }

            // Read chunk data
            let data = self.read_chunk_data(&event.path, chunk_info).await?;

            // Queue for upload
            let spec_chunk = SpeculativeChunk {
                hash: chunk_info.hash,
                data,
                source_path: event.path.clone(),
                priority: self.config.priority,
                created_at: std::time::Instant::now(),
            };

            self.pending_chunks.write().await.insert(chunk_info.hash);

            if let Err(e) = self.upload_queue.try_send(spec_chunk) {
                warn!("Upload queue full, dropping chunk: {}", e);
                self.pending_chunks.write().await.remove(&chunk_info.hash);
            } else {
                new_chunks += 1;
            }
        }

        self.stats.files_processed.fetch_add(1, Ordering::Relaxed);
        self.stats.chunks_queued.fetch_add(new_chunks, Ordering::Relaxed);

        Ok(ProcessResult::Processed {
            chunks_total: chunks.len(),
            chunks_new: new_chunks,
            chunks_existing: existing_chunks,
            duration: start.elapsed(),
        })
    }

    /// Upload worker task
    async fn upload_worker(&self, id: usize, rx: flume::Receiver<SpeculativeChunk>) {
        info!("Speculative upload worker {} started", id);

        while let Ok(chunk) = rx.recv_async().await {
            // Rate limiting
            if self.config.max_bandwidth > 0 {
                self.rate_limit(chunk.data.len()).await;
            }

            // Upload chunk
            match self.upload_chunk(&chunk).await {
                Ok(()) => {
                    // Mark as uploaded
                    self.uploaded_chunks.write().await.insert(chunk.hash);
                    self.pending_chunks.write().await.remove(&chunk.hash);
                    self.stats.chunks_uploaded.fetch_add(1, Ordering::Relaxed);
                    self.stats.bytes_uploaded.fetch_add(chunk.data.len(), Ordering::Relaxed);

                    debug!("Speculatively uploaded chunk: {}", hex::encode(&chunk.hash[..8]));
                }
                Err(e) => {
                    warn!("Speculative upload failed: {}", e);
                    self.pending_chunks.write().await.remove(&chunk.hash);
                    self.stats.upload_failures.fetch_add(1, Ordering::Relaxed);

                    // Backoff on error
                    tokio::time::sleep(Duration::from_secs(self.config.error_backoff_secs)).await;
                }
            }
        }
    }

    /// Upload a single chunk
    async fn upload_chunk(&self, chunk: &SpeculativeChunk) -> Result<()> {
        self.client.upload_speculative_chunk(
            &chunk.hash,
            &chunk.data,
            self.config.chunk_ttl_hours,
        ).await
    }

    /// Check how many chunks are already on server for a given file
    pub async fn check_coverage(&self, file_path: &Path) -> Result<CoverageReport> {
        let file = tokio::fs::File::open(file_path).await?;
        let chunks = chunk_file_async(file, FastCdcConfig::video()).await?;

        let hashes: Vec<_> = chunks.iter().map(|c| c.hash).collect();

        // Check server for existing chunks
        let existing = self.client.check_chunks_exist(&hashes).await?;

        let uploaded_count = existing.iter().filter(|&&b| b).count();
        let total_size: u64 = chunks.iter().map(|c| c.size as u64).sum();
        let uploaded_size: u64 = chunks.iter()
            .zip(existing.iter())
            .filter(|(_, &exists)| exists)
            .map(|(c, _)| c.size as u64)
            .sum();

        Ok(CoverageReport {
            total_chunks: chunks.len(),
            uploaded_chunks: uploaded_count,
            total_bytes: total_size,
            uploaded_bytes: uploaded_size,
            coverage_percent: if total_size > 0 {
                (uploaded_size as f64 / total_size as f64) * 100.0
            } else {
                0.0
            },
        })
    }

    /// Get current statistics
    pub fn stats(&self) -> SpeculativeStatsSnapshot {
        SpeculativeStatsSnapshot {
            files_processed: self.stats.files_processed.load(Ordering::Relaxed),
            chunks_queued: self.stats.chunks_queued.load(Ordering::Relaxed),
            chunks_uploaded: self.stats.chunks_uploaded.load(Ordering::Relaxed),
            bytes_uploaded: self.stats.bytes_uploaded.load(Ordering::Relaxed),
            upload_failures: self.stats.upload_failures.load(Ordering::Relaxed),
            pending_queue_size: self.upload_queue.len(),
        }
    }
}

/// Coverage report for a file
#[derive(Debug)]
pub struct CoverageReport {
    pub total_chunks: usize,
    pub uploaded_chunks: usize,
    pub total_bytes: u64,
    pub uploaded_bytes: u64,
    pub coverage_percent: f64,
}

/// Statistics snapshot
#[derive(Debug)]
pub struct SpeculativeStatsSnapshot {
    pub files_processed: u64,
    pub chunks_queued: u64,
    pub chunks_uploaded: u64,
    pub bytes_uploaded: usize,
    pub upload_failures: u64,
    pub pending_queue_size: usize,
}
```

### Instant Push Integration

```rust
/// Push operation that leverages speculative uploads
pub async fn push_with_speculation(
    repo: &Repository,
    speculative_engine: &SpeculativeEngine,
) -> Result<PushResult> {
    let start = std::time::Instant::now();

    // Get files to push
    let staged = repo.get_staged_files().await?;

    let mut total_chunks = 0;
    let mut already_uploaded = 0;
    let mut new_uploads = 0;
    let mut bytes_skipped = 0;
    let mut bytes_uploaded = 0;

    for file in &staged {
        // Get chunks for this file
        let chunks = repo.chunk_file(file).await?;
        total_chunks += chunks.len();

        // Check which chunks already exist (speculatively uploaded)
        let hashes: Vec<_> = chunks.iter().map(|c| c.hash).collect();
        let existing = speculative_engine.client.check_chunks_exist(&hashes).await?;

        for (chunk, exists) in chunks.iter().zip(existing.iter()) {
            if *exists {
                already_uploaded += 1;
                bytes_skipped += chunk.size;
                debug!("Chunk already on server (speculative): {}",
                    hex::encode(&chunk.hash[..8]));
            } else {
                // Upload missing chunk
                let data = repo.read_chunk_data(file, chunk).await?;
                speculative_engine.client.upload_chunk(&chunk.hash, &data).await?;
                new_uploads += 1;
                bytes_uploaded += chunk.size;
            }
        }
    }

    // Promote speculative chunks to permanent storage
    let commit = repo.create_commit(&staged).await?;
    speculative_engine.client.promote_speculative_chunks(&commit).await?;

    let duration = start.elapsed();
    let speedup = if new_uploads > 0 {
        total_chunks as f64 / new_uploads as f64
    } else {
        f64::INFINITY
    };

    Ok(PushResult {
        commit_hash: commit.hash,
        total_chunks,
        already_uploaded,
        new_uploads,
        bytes_skipped,
        bytes_uploaded,
        duration,
        speedup_factor: speedup,
    })
}

#[derive(Debug)]
pub struct PushResult {
    pub commit_hash: Blake3Hash,
    pub total_chunks: usize,
    pub already_uploaded: usize,
    pub new_uploads: usize,
    pub bytes_skipped: usize,
    pub bytes_uploaded: usize,
    pub duration: Duration,
    pub speedup_factor: f64,
}

impl std::fmt::Display for PushResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.speedup_factor.is_infinite() {
            write!(f, "Instant push! All {} chunks already on server ({} skipped). Duration: {:?}",
                self.total_chunks,
                human_bytes(self.bytes_skipped),
                self.duration)
        } else {
            write!(f, "Push complete. {}/{} chunks uploaded ({:.1}% pre-synced). {} uploaded, {} skipped. Duration: {:?} ({:.1}x faster)",
                self.new_uploads,
                self.total_chunks,
                (self.already_uploaded as f64 / self.total_chunks as f64) * 100.0,
                human_bytes(self.bytes_uploaded),
                human_bytes(self.bytes_skipped),
                self.duration,
                self.speedup_factor)
        }
    }
}
```

---

## Server-Side Handling

### Speculative Chunk Storage

```rust
/// Server-side speculative chunk store
pub struct SpeculativeStore {
    /// Redis for temporary chunk metadata
    redis: redis::Client,

    /// Temporary storage backend
    temp_storage: Arc<dyn StorageBackend>,

    /// Permanent storage backend
    permanent_storage: Arc<dyn StorageBackend>,
}

impl SpeculativeStore {
    /// Store a speculative chunk
    pub async fn store_speculative(
        &self,
        hash: &Blake3Hash,
        data: &[u8],
        ttl_hours: u32,
    ) -> Result<()> {
        let key = format!("spec:{}", hex::encode(hash));

        // Store in temporary storage
        self.temp_storage.put(hash, data).await?;

        // Set TTL in Redis
        let mut conn = self.redis.get_async_connection().await?;
        redis::cmd("SET")
            .arg(&key)
            .arg("1")
            .arg("EX")
            .arg(ttl_hours * 3600)
            .query_async(&mut conn)
            .await?;

        Ok(())
    }

    /// Check if chunks exist (speculative or permanent)
    pub async fn check_exist(&self, hashes: &[Blake3Hash]) -> Result<Vec<bool>> {
        let mut results = Vec::with_capacity(hashes.len());
        let mut conn = self.redis.get_async_connection().await?;

        // Pipeline Redis checks
        let mut pipe = redis::pipe();
        for hash in hashes {
            let spec_key = format!("spec:{}", hex::encode(hash));
            let perm_key = format!("perm:{}", hex::encode(hash));
            pipe.exists(&spec_key).exists(&perm_key);
        }

        let redis_results: Vec<bool> = pipe.query_async(&mut conn).await?;

        for chunk in redis_results.chunks(2) {
            let spec_exists = chunk[0];
            let perm_exists = chunk[1];
            results.push(spec_exists || perm_exists);
        }

        Ok(results)
    }

    /// Promote speculative chunks to permanent storage
    pub async fn promote(&self, commit: &Commit) -> Result<PromoteResult> {
        let mut promoted = 0;
        let mut already_permanent = 0;
        let mut conn = self.redis.get_async_connection().await?;

        for chunk_hash in &commit.chunk_hashes {
            let spec_key = format!("spec:{}", hex::encode(chunk_hash));
            let perm_key = format!("perm:{}", hex::encode(chunk_hash));

            // Check if already permanent
            let exists: bool = redis::cmd("EXISTS")
                .arg(&perm_key)
                .query_async(&mut conn)
                .await?;

            if exists {
                already_permanent += 1;
                continue;
            }

            // Move from temp to permanent storage
            let data = self.temp_storage.get(chunk_hash).await?;
            self.permanent_storage.put(chunk_hash, &data).await?;

            // Update Redis
            redis::cmd("SET")
                .arg(&perm_key)
                .arg("1")
                .query_async(&mut conn)
                .await?;
            redis::cmd("DEL")
                .arg(&spec_key)
                .query_async(&mut conn)
                .await?;

            promoted += 1;
        }

        Ok(PromoteResult {
            promoted,
            already_permanent,
        })
    }

    /// Garbage collect expired speculative chunks
    pub async fn gc_expired(&self) -> Result<u64> {
        // Redis handles TTL expiration automatically
        // This just cleans up orphaned storage

        let mut cleaned = 0;
        let mut conn = self.redis.get_async_connection().await?;

        // Scan temp storage
        let temp_keys = self.temp_storage.list_keys().await?;

        for key in temp_keys {
            let spec_key = format!("spec:{}", hex::encode(&key));

            let exists: bool = redis::cmd("EXISTS")
                .arg(&spec_key)
                .query_async(&mut conn)
                .await?;

            if !exists {
                // TTL expired, delete from storage
                self.temp_storage.delete(&key).await?;
                cleaned += 1;
            }
        }

        Ok(cleaned)
    }
}
```

---

## Configuration

```toml
# .dits/config

[speculative]
# Enable speculative transport
enabled = true

# Maximum bandwidth for speculative uploads (0 = unlimited)
max_bandwidth = "50MB/s"

# Priority (0-100, lower = less priority)
priority = 25

# Number of upload workers
workers = 2

# Server-side chunk TTL (hours)
chunk_ttl = 72

# Watch additional directories
watch_dirs = [
    "~/Projects/VideoEdit/Cache",
    "/Volumes/MediaDrive/Cache"
]

# File patterns to watch (in addition to defaults)
patterns = [
    "*.r3d",
    "*.ari"
]

# Pause during active editing (reduce I/O contention)
pause_on_active_edit = true

# Resume after idle (seconds)
resume_after_idle = 60
```

---

## CLI Commands

```bash
# Check speculative upload status
dits speculative status
# Output:
# Speculative Transport: ACTIVE
# Files processed: 1,234
# Chunks uploaded: 45,678 (12.3 GB)
# Queue depth: 23
# Upload rate: 45 MB/s

# Check coverage for a file before push
dits speculative coverage video.mp4
# Output:
# Coverage for video.mp4:
#   Total chunks: 1,234
#   Already uploaded: 1,180 (95.6%)
#   Remaining: 54 chunks (234 MB)
#   Estimated push time: 5 seconds

# Pause speculative uploads
dits speculative pause

# Resume speculative uploads
dits speculative resume

# Clear speculative queue
dits speculative clear

# Force sync a directory
dits speculative sync /path/to/cache
```

---

## Performance Characteristics

| Scenario | Traditional | With Speculative | Improvement |
|----------|-------------|------------------|-------------|
| 10GB file, 1 hour edit | 60 min upload | 3 sec push | 1200x |
| 100GB project, 8 hour edit | 5 hour upload | 30 sec push | 600x |
| Small change to large file | Re-upload whole file | Upload delta only | 100x+ |
| Multiple editors, shared footage | N × upload | 1 × upload | Nx |

---

## Security Considerations

1. **Chunk Privacy**: Speculative chunks are content-addressed; no path/filename info
2. **TTL Enforcement**: Server garbage collects uncommitted chunks after TTL
3. **Bandwidth Control**: Configurable limits prevent network saturation
4. **No Server-Side Assembly**: Chunks are meaningless without manifest (committed via push)

---

## Known Limitations

1. **Network Dependency**: Requires stable internet during editing
2. **Storage Overhead**: Temporary server storage for uncommitted chunks
3. **NLE Support**: Currently optimized for Premiere/Resolve; other NLEs may vary
4. **Power Usage**: Background sync increases power consumption on laptops

---

## Future Enhancements

1. **ML-based Prediction**: Predict which files user will save based on editing patterns
2. **Peer-to-Peer Sync**: Share speculative chunks with nearby team members
3. **Smart Scheduling**: Pause during renders, resume during playback
4. **Compression Hints**: Use NLE-specific knowledge for better compression

---

## References

- [Adobe Media Cache Documentation](https://helpx.adobe.com/premiere-pro/using/media-cache.html)
- [DaVinci Resolve Cache Management](https://documents.blackmagicdesign.com/)
- [FastCDC Algorithm](./fastcdc.md)
- [QUIC Transport Protocol](./quic-protocol.md)
