//! Local object store for the .dits directory.
//!
//! ## Hybrid Storage Architecture (Phase 3.6)
//!
//! The storage layer now supports two engines:
//! - **GitTextEngine**: libgit2 for text files (line diff, merge, blame)
//! - **ObjectStore**: Dits CDC for binary/media files (chunking, dedup)
//!
//! Files are routed to the appropriate engine based on `StorageStrategy`.

mod objects;
mod refs;
mod git_engine;
pub mod locks;
pub mod remote;
pub mod repository;

pub use locks::{Lock, LockStore, LockError};
pub use objects::ObjectStore;
pub use refs::RefStore;
pub use remote::{Remote, RemoteStore, RemoteError, RemoteType};
pub use repository::{Repository, RepoError, AddResult, Status, CheckoutResult, RepoStats, FileStats, RepoDedupStats, FileDedupStats};

// Phase 3.6: Git text engine for hybrid storage
pub use git_engine::{
    GitTextEngine, GitEngineError, GitResult,
    DiffResult, DiffHunk, DiffLine, DiffLineType, DiffStats,
    MergeResult, BlameResult, BlameLine, GitStoreStats,
};
