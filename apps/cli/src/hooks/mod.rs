//! Hooks system - Execute scripts at key points in the workflow.
//!
//! This module provides Git-compatible hooks support for dits.

mod runner;
mod templates;

#[allow(unused_imports)]
pub use runner::{run_hook, HookResult};
pub use templates::get_sample_hook;

use std::path::Path;

/// Available hook types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HookType {
    /// Before commit is created
    PreCommit,
    /// Prepare commit message
    PrepareCommitMsg,
    /// Validate commit message
    CommitMsg,
    /// After commit is created
    PostCommit,
    /// Before push to remote
    PrePush,
    /// After merge is complete
    PostMerge,
    /// Before checkout
    PreCheckout,
    /// After checkout
    PostCheckout,
    /// Before rebase
    PreRebase,
    /// After rebase
    PostRebase,
    /// Before files are updated (during merge/checkout)
    PreAutoGc,
    /// After GC runs
    PostRewrite,
}

impl HookType {
    /// Get the filename for this hook
    pub fn filename(&self) -> &'static str {
        match self {
            HookType::PreCommit => "pre-commit",
            HookType::PrepareCommitMsg => "prepare-commit-msg",
            HookType::CommitMsg => "commit-msg",
            HookType::PostCommit => "post-commit",
            HookType::PrePush => "pre-push",
            HookType::PostMerge => "post-merge",
            HookType::PreCheckout => "pre-checkout",
            HookType::PostCheckout => "post-checkout",
            HookType::PreRebase => "pre-rebase",
            HookType::PostRebase => "post-rebase",
            HookType::PreAutoGc => "pre-auto-gc",
            HookType::PostRewrite => "post-rewrite",
        }
    }
    
    /// Get description for this hook
    pub fn description(&self) -> &'static str {
        match self {
            HookType::PreCommit => "Run before commit is created (lint, format, test)",
            HookType::PrepareCommitMsg => "Prepare the default commit message",
            HookType::CommitMsg => "Validate the commit message",
            HookType::PostCommit => "Run after commit is created (notify, deploy)",
            HookType::PrePush => "Run before push (test, validate)",
            HookType::PostMerge => "Run after merge is complete",
            HookType::PreCheckout => "Run before checkout",
            HookType::PostCheckout => "Run after checkout (dependencies, build)",
            HookType::PreRebase => "Run before rebase starts",
            HookType::PostRebase => "Run after rebase completes",
            HookType::PreAutoGc => "Run before automatic GC",
            HookType::PostRewrite => "Run after history is rewritten",
        }
    }
    
    /// Get all hook types
    pub fn all() -> &'static [HookType] {
        &[
            HookType::PreCommit,
            HookType::PrepareCommitMsg,
            HookType::CommitMsg,
            HookType::PostCommit,
            HookType::PrePush,
            HookType::PostMerge,
            HookType::PreCheckout,
            HookType::PostCheckout,
            HookType::PreRebase,
            HookType::PostRebase,
            HookType::PreAutoGc,
            HookType::PostRewrite,
        ]
    }
    
    /// Parse from string
    pub fn from_str(s: &str) -> Option<HookType> {
        match s {
            "pre-commit" => Some(HookType::PreCommit),
            "prepare-commit-msg" => Some(HookType::PrepareCommitMsg),
            "commit-msg" => Some(HookType::CommitMsg),
            "post-commit" => Some(HookType::PostCommit),
            "pre-push" => Some(HookType::PrePush),
            "post-merge" => Some(HookType::PostMerge),
            "pre-checkout" => Some(HookType::PreCheckout),
            "post-checkout" => Some(HookType::PostCheckout),
            "pre-rebase" => Some(HookType::PreRebase),
            "post-rebase" => Some(HookType::PostRebase),
            "pre-auto-gc" => Some(HookType::PreAutoGc),
            "post-rewrite" => Some(HookType::PostRewrite),
            _ => None,
        }
    }
}

/// Check if hooks directory exists
pub fn hooks_dir_exists(repo_root: &Path) -> bool {
    repo_root.join(".dits").join("hooks").exists()
}

/// Get path to hooks directory
pub fn get_hooks_dir(repo_root: &Path) -> std::path::PathBuf {
    repo_root.join(".dits").join("hooks")
}

/// Check if a specific hook exists and is executable
pub fn hook_exists(repo_root: &Path, hook_type: HookType) -> bool {
    let hook_path = get_hooks_dir(repo_root).join(hook_type.filename());
    hook_path.exists() && is_executable(&hook_path)
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = std::fs::metadata(path) {
        meta.permissions().mode() & 0o111 != 0
    } else {
        false
    }
}

#[cfg(not(unix))]
fn is_executable(path: &Path) -> bool {
    // On Windows, we just check if the file exists
    path.exists()
}
