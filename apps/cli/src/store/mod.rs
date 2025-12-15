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
pub mod remote_server;
pub mod repository;

#[allow(unused_imports)]
pub use {
    locks::{Lock, LockError, LockStore},
    objects::ObjectStore,
    refs::RefStore,
    remote::{Remote, RemoteError, RemoteStore, RemoteType},
    repository::{
        AddResult, CheckoutResult, FileDedupStats, FileStats, RepoDedupStats, RepoError, RepoStats,
        Repository, Status,
    },
};

// Phase 3.6: Git text engine for hybrid storage
#[allow(unused_imports)]
pub use git_engine::{
    GitTextEngine, GitEngineError, GitResult,
    DiffResult, DiffHunk, DiffLine, DiffLineType, DiffStats,
    MergeResult, BlameResult, BlameLine, GitStoreStats,
};
