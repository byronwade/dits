//! Local object store for the .dits directory.
//!
//! ## Hybrid Storage Architecture (Phase 3.6)
//!
//! The storage layer now supports two engines:
//! - **GitTextEngine**: libgit2 for text files (line diff, merge, blame)
//! - **ObjectStore**: Dits CDC for binary/media files (chunking, dedup)
//!
//! Files are routed to the appropriate engine based on `StorageStrategy`.

mod git_engine;
pub mod locks;
mod objects;
mod refs;
pub mod remote;
pub mod remote_server;
pub mod repository;
pub mod sync;

// Phase 3.6: Git text engine for hybrid storage
#[allow(unused_imports)]
pub use git_engine::{
    BlameLine, BlameResult, DiffHunk, DiffLine, DiffLineType, DiffResult, DiffStats,
    GitEngineError, GitResult, GitStoreStats, GitTextEngine, MergeResult,
};
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
