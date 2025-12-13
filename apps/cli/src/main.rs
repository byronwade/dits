//! Dits - Version control for video and large binary files.
//!
//! Architecture: Hybrid Universal Deduplication + File-Type Awareness
//!
//! Phases:
//! - Phase 1: Local chunking, deduplication, and commit/checkout
//! - Phase 2: Structure-aware MP4 parsing and offset patching
//! - Phase 3: GOP-aligned segmentation for partial re-encode deduplication
//! - Phase 4: Virtual filesystem (FUSE) for on-demand hydration

mod commands;
mod config {
    pub use dits::config::*;
}
mod core;
mod hooks;
mod mp4;
mod segment;
mod store;
mod vfs;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "dits")]
#[command(about = "Version control for video and large binary files")]
#[command(version)]
#[command(author)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new repository
    Init {
        /// Path to initialize (default: current directory)
        #[arg(default_value = ".")]
        path: String,
    },

    /// Add files to the staging area
    Add {
        /// Files or directories to add
        #[arg(required = true)]
        files: Vec<String>,
    },

    /// Show repository status
    Status,

    /// Create a commit from staged changes
    Commit {
        /// Commit message
        #[arg(short, long)]
        message: String,
    },

    /// Show commit history
    Log {
        /// Number of commits to show
        #[arg(short = 'n', long, default_value = "10")]
        limit: usize,
        /// Show each commit on a single line
        #[arg(long)]
        oneline: bool,
        /// Draw ASCII graph of branch structure
        #[arg(long)]
        graph: bool,
        /// Show commits from all branches
        #[arg(long)]
        all: bool,
    },

    /// Checkout a commit or branch
    Checkout {
        /// Commit hash or branch name
        target: String,
        /// Checkout mode: full (default) or proxy
        #[arg(short, long, default_value = "full")]
        mode: String,
    },

    /// List, create, or delete branches
    Branch {
        /// Branch name to create or delete
        name: Option<String>,
        /// Delete the branch
        #[arg(short, long)]
        delete: bool,
    },

    /// Switch to a different branch
    Switch {
        /// Branch name to switch to
        branch: String,
    },

    /// Show changes between commits, working tree, etc.
    Diff {
        /// Show staged changes
        #[arg(long)]
        staged: bool,
        /// Compare against specific commit
        #[arg(short, long)]
        commit: Option<String>,
        /// Specific file to diff
        file: Option<String>,
    },

    /// List, create, or delete tags
    Tag {
        /// Tag name to create or delete
        name: Option<String>,
        /// Commit to tag (default: HEAD)
        #[arg(short, long)]
        commit: Option<String>,
        /// Delete the tag
        #[arg(short, long)]
        delete: bool,
    },

    /// Merge a branch into the current branch
    Merge {
        /// Branch to merge into current branch
        branch: String,
    },

    /// Show details of a commit
    Show {
        /// Commit to show (default: HEAD)
        #[arg(default_value = "HEAD")]
        object: String,
        /// Show file statistics
        #[arg(long)]
        stat: bool,
        /// Show only file names
        #[arg(long)]
        name_only: bool,
        /// Show file names with change type
        #[arg(long)]
        name_status: bool,
        /// Don't show diff
        #[arg(long)]
        no_patch: bool,
    },

    /// Show who changed what in a file
    Blame {
        /// File to blame
        file: String,
        /// Line range (e.g., "1,10" or "5,")
        #[arg(short = 'L')]
        lines: Option<String>,
    },

    /// Show reference history (undo safety net)
    Reflog {
        /// Reference name (default: HEAD)
        #[arg(default_value = "HEAD")]
        ref_name: Option<String>,
        /// Number of entries to show
        #[arg(short = 'n', long, default_value = "20")]
        limit: usize,
    },

    /// Binary search to find bug-introducing commit
    Bisect {
        /// Action: start, good, bad, reset, status
        action: Option<String>,
        /// Commit to mark (for good/bad)
        commit: Option<String>,
    },

    /// Reapply commits on top of another base
    Rebase {
        /// Upstream branch to rebase onto
        upstream: Option<String>,
        /// Rebase onto specific commit
        #[arg(long)]
        onto: Option<String>,
        /// Continue rebase after resolving conflicts
        #[arg(long, name = "continue")]
        continue_rebase: bool,
        /// Abort current rebase
        #[arg(long)]
        abort: bool,
        /// Skip the current commit
        #[arg(long)]
        skip: bool,
    },

    /// Apply specific commits to current branch
    CherryPick {
        /// Commits to apply
        commits: Vec<String>,
        /// Apply without committing
        #[arg(long)]
        no_commit: bool,
    },

    /// Reset HEAD to a specific state
    Reset {
        /// Commit to reset to (default: HEAD)
        target: Option<String>,
        /// Soft reset (only move HEAD)
        #[arg(long)]
        soft: bool,
        /// Hard reset (reset HEAD, index, and working tree)
        #[arg(long)]
        hard: bool,
        /// Paths to unstage (reset specific files)
        #[arg(last = true)]
        paths: Vec<String>,
    },

    /// Restore working tree files or unstage
    Restore {
        /// Paths to restore
        #[arg(required = true)]
        paths: Vec<String>,
        /// Restore staged files (unstage)
        #[arg(long)]
        staged: bool,
        /// Restore working tree (default)
        #[arg(long)]
        worktree: bool,
        /// Source commit to restore from
        #[arg(short, long)]
        source: Option<String>,
        /// Use "ours" version during merge conflict
        #[arg(long)]
        ours: bool,
        /// Use "theirs" version during merge conflict
        #[arg(long)]
        theirs: bool,
    },

    /// Get and set repository or global options
    Config {
        /// Config key (e.g., user.name)
        key: Option<String>,
        /// Value to set
        value: Option<String>,
        /// Use global config file
        #[arg(long)]
        global: bool,
        /// List all config values
        #[arg(short, long)]
        list: bool,
        /// Unset a key
        #[arg(long)]
        unset: bool,
    },

    /// Stash changes in working directory
    Stash {
        /// Action: push, pop, apply, list, drop, clear, show
        action: Option<String>,
        /// Message for stash (with push)
        #[arg(short, long)]
        message: Option<String>,
        /// Stash index (for pop, apply, drop, show)
        #[arg(short, long)]
        index: Option<usize>,
    },

    /// Inspect MP4 file structure (Phase 2)
    Inspect {
        /// Path to MP4 file
        file: String,
    },

    /// Test MP4 deconstruct/reconstruct roundtrip (Phase 2)
    Roundtrip {
        /// Input MP4 file
        input: String,
        /// Output MP4 file
        output: String,
    },

    /// Segment a video into GOP-aligned chunks (Phase 3)
    Segment {
        /// Video file to segment
        file: String,
        /// Output directory for segments (default: <filename>.dits-segments)
        #[arg(short, long)]
        output: Option<String>,
        /// Segment duration in seconds
        #[arg(short, long, default_value = "2.0")]
        duration: f64,
    },

    /// Reassemble a segmented video (Phase 3)
    Assemble {
        /// Segments directory containing manifest.json
        segments_dir: String,
        /// Output video file
        output: String,
    },

    /// Mount repository as a virtual filesystem (Phase 4)
    #[cfg(feature = "fuser")]
    Mount {
        /// Mount point path
        mount_point: String,
        /// Commit to mount (default: HEAD)
        #[arg(short, long)]
        commit: Option<String>,
        /// L1 (RAM) cache size in MB
        #[arg(long, default_value = "256")]
        cache_mb: u64,
    },

    /// Unmount a virtual filesystem
    #[cfg(feature = "fuser")]
    Unmount {
        /// Mount point to unmount
        mount_point: String,
    },

    /// Show cache statistics
    CacheStats,

    /// Inspect a tracked file's deduplication statistics (Phase 4)
    InspectFile {
        /// Path to tracked file (relative to repo root)
        path: String,
        /// Show all chunk hashes
        #[arg(long)]
        chunks: bool,
    },

    /// Show repository deduplication statistics (Phase 4)
    RepoStats {
        /// Show verbose per-file breakdown
        #[arg(short, long)]
        verbose: bool,
    },

    /// Check repository integrity (Phase 5)
    Fsck {
        /// Show verbose output
        #[arg(short, long)]
        verbose: bool,
    },

    /// Scan files and extract metadata (Phase 5)
    #[command(name = "meta-scan")]
    MetaScan {
        /// Show verbose output
        #[arg(short, long)]
        verbose: bool,
    },

    /// Show metadata for a file (Phase 5)
    #[command(name = "meta-show")]
    MetaShow {
        /// Path to file (relative to repo root)
        path: String,
    },

    /// List all stored metadata (Phase 5)
    #[command(name = "meta-list")]
    MetaList,

    /// Initialize a new video timeline project (Phase 5)
    #[command(name = "video-init")]
    VideoInit {
        /// Project name
        name: String,
    },

    /// Add a clip to a video timeline (Phase 5)
    #[command(name = "video-add-clip")]
    VideoAddClip {
        /// Project name
        project: String,
        /// Path to video file (must be tracked)
        #[arg(long)]
        file: String,
        /// In-point (seconds from source start)
        #[arg(long, name = "in")]
        in_point: f64,
        /// Out-point (seconds from source start)
        #[arg(long)]
        out: f64,
        /// Start position on timeline (seconds)
        #[arg(long)]
        start: f64,
        /// Track ID (optional, defaults to first video track)
        #[arg(long)]
        track: Option<String>,
    },

    /// Show a video timeline (Phase 5)
    #[command(name = "video-show")]
    VideoShow {
        /// Project name
        name: String,
    },

    /// List all video projects (Phase 5)
    #[command(name = "video-list")]
    VideoList,

    /// Generate proxies for video files (Phase 6)
    #[command(name = "proxy-generate")]
    ProxyGenerate {
        /// Video files to generate proxies for
        files: Vec<String>,
        /// Resolution: 1080, 720, 540, half, quarter
        #[arg(short, long)]
        resolution: Option<String>,
        /// Codec: h264, h265, prores, prores-lt, dnxhr, dnxhr-sq
        #[arg(short, long)]
        codec: Option<String>,
        /// Preset: fast, hq, offline
        #[arg(short, long)]
        preset: Option<String>,
        /// Generate proxies for all tracked video files
        #[arg(long)]
        all: bool,
    },

    /// Show proxy generation status (Phase 6)
    #[command(name = "proxy-status")]
    ProxyStatus,

    /// List all generated proxies (Phase 6)
    #[command(name = "proxy-list")]
    ProxyList {
        /// Show verbose details
        #[arg(short, long)]
        verbose: bool,
    },

    /// Delete generated proxies (Phase 6)
    #[command(name = "proxy-delete")]
    ProxyDelete {
        /// Files to delete proxies for
        files: Vec<String>,
        /// Delete all proxies
        #[arg(long)]
        all: bool,
    },

    /// Check dependencies for project files (Phase 7)
    #[command(name = "dep-check")]
    DepCheck {
        /// Project files to check (default: staged project files)
        files: Vec<String>,
        /// Check all tracked project files
        #[arg(long)]
        all: bool,
        /// Fail with error if dependencies are missing
        #[arg(long)]
        strict: bool,
    },

    /// Show dependency graph for a project file (Phase 7)
    #[command(name = "dep-graph")]
    DepGraph {
        /// Project file to analyze
        file: String,
        /// Output format: tree, json, stats, list
        #[arg(short, long)]
        format: Option<String>,
    },

    /// List all project files in the repository (Phase 7)
    #[command(name = "dep-list")]
    DepList,

    /// Initialize lifecycle tracking for chunks (Phase 8)
    #[command(name = "freeze-init")]
    FreezeInit,

    /// Show storage tier status (Phase 8)
    #[command(name = "freeze-status")]
    FreezeStatus,

    /// Freeze chunks to colder storage tier (Phase 8)
    Freeze {
        /// Files to freeze
        files: Vec<String>,
        /// Target tier: warm, cold, archive
        #[arg(short, long)]
        tier: Option<String>,
        /// Apply lifecycle policy to all eligible chunks
        #[arg(long)]
        apply_policy: bool,
        /// Freeze all eligible chunks
        #[arg(long)]
        all: bool,
    },

    /// Thaw chunks from cold/archive storage (Phase 8)
    Thaw {
        /// Files to thaw
        files: Vec<String>,
        /// Thaw all frozen chunks
        #[arg(long)]
        all: bool,
    },

    /// Set or view lifecycle policy (Phase 8)
    #[command(name = "freeze-policy")]
    FreezePolicy {
        /// Policy name: default, aggressive, conservative
        name: Option<String>,
        /// List available policies
        #[arg(short, long)]
        list: bool,
    },

    /// Initialize encryption for this repository (Phase 9)
    #[command(name = "encrypt-init")]
    EncryptInit {
        /// Password (will prompt if not provided)
        #[arg(short, long)]
        password: Option<String>,
    },

    /// Show encryption status (Phase 9)
    #[command(name = "encrypt-status")]
    EncryptStatus,

    /// Login to unlock encryption keys (Phase 9)
    Login {
        /// Password (will prompt if not provided)
        #[arg(short, long)]
        password: Option<String>,
    },

    /// Logout and clear cached keys (Phase 9)
    Logout,

    /// Change encryption password (Phase 9)
    #[command(name = "change-password")]
    ChangePassword {
        /// Current password (will prompt if not provided)
        #[arg(long)]
        old: Option<String>,
        /// New password (will prompt if not provided)
        #[arg(long)]
        new: Option<String>,
    },

    /// Show audit log (Phase 9)
    Audit {
        /// Number of events to show (default: 20)
        #[arg(short = 'n', long, default_value = "20")]
        last: usize,
        /// Filter by event type
        #[arg(short, long)]
        event_type: Option<String>,
    },

    /// Show audit statistics (Phase 9)
    #[command(name = "audit-stats")]
    AuditStats,

    /// Export audit log to JSON (Phase 9)
    #[command(name = "audit-export")]
    AuditExport {
        /// Output file (stdout if not specified)
        #[arg(short, long)]
        output: Option<String>,
    },

    /// Peer-to-peer repository sharing (Wormhole integration)
    #[command(name = "p2p")]
    P2p {
        #[command(subcommand)]
        command: crate::commands::p2p::P2pCommands,
    },

    /// Clone a repository
    Clone {
        /// Source repository (path or URL)
        source: String,
        /// Destination directory
        dest: Option<String>,
        /// Branch to checkout after clone
        #[arg(short, long)]
        branch: Option<String>,
    },

    /// Manage remote repositories
    Remote {
        /// Action: add, remove, rm, rename, get-url, set-url, list
        action: Option<String>,
        /// Remote name
        name: Option<String>,
        /// Remote URL (for add/set-url)
        url: Option<String>,
        /// Show verbose output
        #[arg(short, long)]
        verbose: bool,
        /// Apply to push URL (for get-url/set-url)
        #[arg(long)]
        push: bool,
    },

    /// Push changes to a remote repository
    Push {
        /// Remote name (default: origin)
        remote: Option<String>,
        /// Branch to push (default: current branch)
        branch: Option<String>,
        /// Force push (overwrite remote)
        #[arg(short, long)]
        force: bool,
        /// Push all branches
        #[arg(long)]
        all: bool,
    },

    /// Pull changes from a remote repository
    Pull {
        /// Remote name (default: origin)
        remote: Option<String>,
        /// Branch to pull
        branch: Option<String>,
        /// Rebase instead of merge
        #[arg(short, long)]
        rebase: bool,
    },

    /// Fetch objects and refs from a remote repository
    Fetch {
        /// Remote name (default: origin)
        remote: Option<String>,
        /// Fetch from all remotes
        #[arg(long)]
        all: bool,
        /// Prune remote-tracking refs that no longer exist
        #[arg(short, long)]
        prune: bool,
    },

    /// Lock a file (for binary files)
    Lock {
        /// Path to lock
        path: String,
        /// Reason for locking
        #[arg(short, long)]
        reason: Option<String>,
        /// TTL in hours (default: 8)
        #[arg(long)]
        ttl: Option<u64>,
        /// Force lock (override existing lock)
        #[arg(short, long)]
        force: bool,
    },

    /// Unlock a file
    Unlock {
        /// Path to unlock
        path: String,
        /// Force unlock (override ownership check)
        #[arg(short, long)]
        force: bool,
    },

    /// List all file locks
    Locks {
        /// Filter by owner
        #[arg(short, long)]
        owner: Option<String>,
        /// Show verbose output
        #[arg(short, long)]
        verbose: bool,
    },

    /// Run garbage collection
    Gc {
        /// Dry run (show what would be done)
        #[arg(long)]
        dry_run: bool,
        /// Prune expired locks
        #[arg(short, long)]
        prune: bool,
        /// Aggressive mode (repack objects)
        #[arg(long)]
        aggressive: bool,
    },

    /// Remove untracked files from the working tree
    Clean {
        /// Dry run (show what would be deleted)
        #[arg(short = 'n', long)]
        dry_run: bool,
        /// Actually remove files
        #[arg(short, long)]
        force: bool,
        /// Remove untracked directories
        #[arg(short = 'd')]
        directories: bool,
        /// Remove ignored files as well
        #[arg(short = 'x')]
        remove_ignored: bool,
        /// Remove only ignored files
        #[arg(short = 'X')]
        only_ignored: bool,
        /// Exclude patterns
        #[arg(short = 'e', long)]
        exclude: Vec<String>,
        /// Paths to clean
        paths: Vec<String>,
    },

    /// Search tracked files for patterns
    Grep {
        /// Pattern to search for
        pattern: String,
        /// Show line numbers
        #[arg(short = 'n', long)]
        line_number: bool,
        /// Case insensitive search
        #[arg(short, long)]
        ignore_case: bool,
        /// Match whole words only
        #[arg(short, long)]
        word_regexp: bool,
        /// Show count only
        #[arg(short, long)]
        count: bool,
        /// Show filenames only
        #[arg(short = 'l', long)]
        files_with_matches: bool,
        /// Use fixed string (no regex)
        #[arg(short = 'F', long)]
        fixed_strings: bool,
        /// Paths to search
        paths: Vec<String>,
    },

    /// Manage multiple working trees
    Worktree {
        /// Action: add, list, remove, prune, lock, unlock
        action: String,
        /// Path or argument for action
        path: Option<String>,
        /// Branch name (for add)
        #[arg(short, long)]
        branch: Option<String>,
        /// Force operation
        #[arg(short, long)]
        force: bool,
    },

    /// Manage sparse checkout
    #[command(name = "sparse-checkout")]
    SparseCheckout {
        /// Action: init, set, add, list, disable
        action: String,
        /// Patterns to set/add
        patterns: Vec<String>,
        /// Use cone mode (directory-based)
        #[arg(long)]
        cone: bool,
    },

    /// Manage Git hooks
    Hooks {
        /// Action: list, install, uninstall, run, show
        action: String,
        /// Hook name
        hook: Option<String>,
        /// Force overwrite
        #[arg(short, long)]
        force: bool,
        /// Additional arguments for run
        #[arg(last = true)]
        args: Vec<String>,
    },

    /// Create archives from repository content
    Archive {
        /// Commit/branch/tag to archive
        #[arg(default_value = "HEAD")]
        tree_ish: String,
        /// Output format: tar, tar.gz, zip
        #[arg(long, default_value = "tar.gz")]
        format: String,
        /// Prefix to add to paths
        #[arg(long)]
        prefix: Option<String>,
        /// Output file
        #[arg(short, long)]
        output: Option<String>,
        /// Specific paths to include
        #[arg(last = true)]
        paths: Vec<String>,
    },

    /// Give a human-readable name to a commit
    Describe {
        /// Commit to describe
        commit: Option<String>,
        /// Use any tag, not just annotated
        #[arg(long)]
        tags: bool,
        /// Use any ref
        #[arg(long)]
        all: bool,
        /// Always use long format
        #[arg(long)]
        long: bool,
        /// Add dirty suffix if modified
        #[arg(long)]
        dirty: bool,
        /// Abbreviation length
        #[arg(long, default_value = "7")]
        abbrev: usize,
    },

    /// Summarize commit history by author
    Shortlog {
        /// Sort by number of commits
        #[arg(short = 'n', long)]
        numbered: bool,
        /// Show only counts
        #[arg(short, long)]
        summary: bool,
        /// Show email addresses
        #[arg(short, long)]
        email: bool,
        /// Number of commits to process
        #[arg(long, default_value = "0")]
        limit: usize,
    },

    /// Repository maintenance tasks
    Maintenance {
        /// Action: start, stop, run, status
        action: String,
        /// Task to run (gc, commit-graph, etc.)
        task: Option<String>,
    },

    /// Generate shell completions
    Completions {
        /// Shell to generate for: bash, zsh, fish, powershell
        shell: String,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Init { path } => commands::init(&path),
        Commands::Add { files } => commands::add(&files),
        Commands::Status => commands::status(),
        Commands::Commit { message } => commands::commit(&message),
        Commands::Log { limit, oneline, graph, all } => commands::log(limit, oneline, graph, all),
        Commands::Checkout { target, mode } => {
            let checkout_mode = commands::CheckoutMode::from_str(&mode)
                .unwrap_or(commands::CheckoutMode::Full);
            commands::checkout(&target, checkout_mode)
        }
        Commands::Branch { name, delete } => commands::branch(name.as_deref(), delete),
        Commands::Switch { branch } => commands::switch(&branch),
        Commands::Diff { staged, commit, file } => {
            commands::diff(staged, commit.as_deref(), file.as_deref())
        }
        Commands::Tag { name, commit, delete } => {
            commands::tag(name.as_deref(), commit.as_deref(), delete)
        }
        Commands::Merge { branch } => commands::merge(&branch),
        Commands::Show { object, stat, name_only, name_status, no_patch } => {
            commands::show(&object, stat, name_only, name_status, no_patch)
        }
        Commands::Blame { file, lines } => commands::blame(&file, lines.as_deref()),
        Commands::Reflog { ref_name, limit } => {
            commands::reflog(ref_name.as_deref(), limit)
        }
        Commands::Bisect { action, commit } => {
            commands::bisect(action.as_deref(), commit.as_deref())
        }
        Commands::Rebase { upstream, onto, continue_rebase, abort, skip } => {
            commands::rebase(upstream.as_deref(), onto.as_deref(), continue_rebase, abort, skip)
        }
        Commands::CherryPick { commits, no_commit } => {
            commands::cherry_pick(&commits, no_commit)
        }
        Commands::Reset { target, soft, hard, paths } => {
            let mode = if soft {
                commands::ResetMode::Soft
            } else if hard {
                commands::ResetMode::Hard
            } else {
                commands::ResetMode::Mixed
            };
            commands::reset(target.as_deref(), mode, &paths)
        }
        Commands::Restore { paths, staged, worktree, source, ours, theirs } => {
            commands::restore(&paths, staged, worktree, source.as_deref(), ours, theirs)
        }
        Commands::Config { key, value, global, list, unset } => {
            commands::config(key.as_deref(), value.as_deref(), global, list, unset)
        }
        Commands::Stash { action, message, index } => {
            commands::stash(action.as_deref(), message.as_deref(), index)
        }
        Commands::Inspect { file } => commands::inspect(&file),
        Commands::Roundtrip { input, output } => commands::roundtrip(&input, &output),
        Commands::Segment { file, output, duration } => commands::segment(&file, output.as_deref(), duration),
        Commands::Assemble { segments_dir, output } => commands::assemble(&segments_dir, &output),
        #[cfg(feature = "fuser")]
        Commands::Mount { mount_point, commit, cache_mb } => commands::mount(&mount_point, commit.as_deref(), cache_mb),
        #[cfg(feature = "fuser")]
        Commands::Unmount { mount_point } => commands::unmount(&mount_point),
        Commands::CacheStats => commands::cache_stats(),
        Commands::InspectFile { path, chunks } => commands::inspect_file(&path, chunks),
        Commands::RepoStats { verbose } => commands::repo_stats(verbose),
        Commands::Fsck { verbose } => commands::fsck(verbose),
        Commands::MetaScan { verbose } => commands::meta_scan(verbose),
        Commands::MetaShow { path } => commands::meta_show(&path),
        Commands::MetaList => commands::meta_list(),
        Commands::VideoInit { name } => commands::video_init(&name),
        Commands::VideoAddClip { project, file, in_point, out, start, track } => {
            commands::video_add_clip(&project, &file, in_point, out, start, track.as_deref())
        }
        Commands::VideoShow { name } => commands::video_show(&name),
        Commands::VideoList => commands::video_list(),
        Commands::ProxyGenerate { files, resolution, codec, preset, all } => {
            commands::proxy_generate(&files, resolution.as_deref(), codec.as_deref(), preset.as_deref(), all)
        }
        Commands::ProxyStatus => commands::proxy_status(),
        Commands::ProxyList { verbose } => commands::proxy_list(verbose),
        Commands::ProxyDelete { files, all } => commands::proxy_delete(&files, all),
        Commands::DepCheck { files, all, strict } => commands::dep_check(&files, all, strict),
        Commands::DepGraph { file, format } => commands::dep_graph(&file, format.as_deref()),
        Commands::DepList => commands::dep_list(),
        Commands::FreezeInit => commands::freeze_init(),
        Commands::FreezeStatus => commands::freeze_status(),
        Commands::Freeze { files, tier, apply_policy, all } => {
            commands::freeze(&files, tier.as_deref(), apply_policy, all)
        }
        Commands::Thaw { files, all } => commands::thaw(&files, all),
        Commands::FreezePolicy { name, list } => commands::freeze_policy(name.as_deref(), list),
        Commands::EncryptInit { password } => commands::encrypt_init(password.as_deref()),
        Commands::EncryptStatus => commands::encrypt_status(),
        Commands::Login { password } => commands::login(password.as_deref()),
        Commands::Logout => commands::logout(),
        Commands::ChangePassword { old, new } => commands::change_password(old.as_deref(), new.as_deref()),
        Commands::Audit { last, event_type } => commands::audit_show(last, event_type.as_deref()),
        Commands::AuditStats => commands::audit_stats(),
        Commands::AuditExport { output } => commands::audit_export(output.as_deref()),
        Commands::P2p { command } => commands::handle_p2p_command(command),
        Commands::Clone { source, dest, branch } => {
            commands::clone(&source, dest.as_deref(), branch.as_deref())
        }
        Commands::Remote { action, name, url, verbose, push } => {
            commands::remote(action.as_deref(), name.as_deref(), url.as_deref(), verbose, push)
        }
        Commands::Push { remote, branch, force, all } => {
            commands::push(remote.as_deref(), branch.as_deref(), force, all)
        }
        Commands::Pull { remote, branch, rebase } => {
            commands::pull(remote.as_deref(), branch.as_deref(), rebase)
        }
        Commands::Fetch { remote, all, prune } => {
            commands::fetch(remote.as_deref(), all, prune)
        }
        Commands::Lock { path, reason, ttl, force } => {
            commands::lock_file(&path, reason.as_deref(), ttl, force)
        }
        Commands::Unlock { path, force } => commands::unlock(&path, force),
        Commands::Locks { owner, verbose } => commands::locks(owner.as_deref(), verbose),
        Commands::Gc { dry_run, prune, aggressive } => commands::gc(dry_run, prune, aggressive),
        Commands::Clean { dry_run, force, directories, remove_ignored, only_ignored, exclude, paths } => {
            let options = commands::clean::CleanOptions {
                dry_run,
                force,
                directories,
                remove_ignored,
                only_ignored,
                exclude,
                paths,
            };
            commands::clean::clean(&options).map(|result| {
                commands::clean::print_results(&result, dry_run);
            })
        }
        Commands::Grep { pattern, line_number, ignore_case, word_regexp, count, files_with_matches, fixed_strings, paths } => {
            let options = commands::grep::GrepOptions {
                pattern,
                line_number,
                ignore_case,
                word_regexp,
                count,
                files_with_matches,
                fixed_strings,
                paths,
                ..Default::default()
            };
            commands::grep::grep(&options).map(|result| {
                commands::grep::print_results(&result, &options);
            })
        }
        Commands::Worktree { action, path, branch, force } => {
            match action.as_str() {
                "list" => commands::worktree::list().map(|wts| {
                    commands::worktree::print_list(&wts, false);
                }),
                "add" => match path {
                    Some(p) => commands::worktree::add(&p, branch.as_deref(), branch.is_none(), force).map(|wt| {
                        println!("Created worktree at {}", wt.path.display());
                    }),
                    None => Err(anyhow::anyhow!("Path required for worktree add")),
                },
                "remove" | "rm" => match path {
                    Some(p) => commands::worktree::remove(&p, force),
                    None => Err(anyhow::anyhow!("Path required for worktree remove")),
                },
                "prune" => commands::worktree::prune(false).map(|pruned| {
                    if pruned.is_empty() {
                        println!("Nothing to prune");
                    } else {
                        for p in pruned {
                            println!("Pruned {}", p.display());
                        }
                    }
                }),
                "lock" => match path {
                    Some(p) => commands::worktree::lock(&p, None),
                    None => Err(anyhow::anyhow!("Path required for worktree lock")),
                },
                "unlock" => match path {
                    Some(p) => commands::worktree::unlock(&p),
                    None => Err(anyhow::anyhow!("Path required for worktree unlock")),
                },
                _ => Err(anyhow::anyhow!("Unknown worktree action: {}. Use: list, add, remove, prune, lock, unlock", action)),
            }
        }
        Commands::SparseCheckout { action, patterns, cone } => {
            match action.as_str() {
                "init" => commands::sparse_checkout::init(cone),
                "set" => commands::sparse_checkout::set(&patterns, cone),
                "add" => commands::sparse_checkout::add(&patterns),
                "list" => commands::sparse_checkout::list().map(|patterns| {
                    for p in patterns {
                        println!("{}", p);
                    }
                }),
                "disable" => commands::sparse_checkout::disable(),
                "status" => commands::sparse_checkout::print_status(),
                _ => Err(anyhow::anyhow!("Unknown sparse-checkout action: {}. Use: init, set, add, list, disable", action)),
            }
        }
        Commands::Hooks { action, hook, force, args } => {
            match action.as_str() {
                "list" => commands::hooks::list(),
                "install" => match hook {
                    Some(h) => commands::hooks::install(&h, force),
                    None => Err(anyhow::anyhow!("Hook name required")),
                },
                "uninstall" => match hook {
                    Some(h) => commands::hooks::uninstall(&h),
                    None => Err(anyhow::anyhow!("Hook name required")),
                },
                "run" => match hook {
                    Some(h) => commands::hooks::run(&h, &args),
                    None => Err(anyhow::anyhow!("Hook name required")),
                },
                "show" => match hook {
                    Some(h) => commands::hooks::show(&h),
                    None => Err(anyhow::anyhow!("Hook name required")),
                },
                _ => Err(anyhow::anyhow!("Unknown hooks action: {}. Use: list, install, uninstall, run, show", action)),
            }
        }
        Commands::Archive { tree_ish, format, prefix, output, paths } => {
            match commands::archive::ArchiveFormat::from_str(&format) {
                Some(fmt) => {
                    let options = commands::archive::ArchiveOptions {
                        format: fmt,
                        tree_ish,
                        prefix,
                        output: output.map(std::path::PathBuf::from),
                        paths,
                    };
                    commands::archive::archive(&options).map(|_| ())
                }
                None => Err(anyhow::anyhow!("Unknown format: {}. Use: tar, tar.gz, zip", format)),
            }
        }
        Commands::Describe { commit, tags, all, long, dirty, abbrev } => {
            let options = commands::describe::DescribeOptions {
                commit,
                tags,
                all,
                long,
                dirty,
                abbrev,
                ..Default::default()
            };
            commands::describe::describe(&options).map(|result| {
                commands::describe::print_result(&result);
            })
        }
        Commands::Shortlog { numbered, summary, email, limit } => {
            let options = commands::shortlog::ShortlogOptions {
                numbered,
                summary,
                email,
                limit,
                ..Default::default()
            };
            commands::shortlog::shortlog(&options).map(|entries| {
                commands::shortlog::print_shortlog(&entries, &options);
            })
        }
        Commands::Maintenance { action, task } => {
            match action.as_str() {
                "start" => commands::maintenance::start(),
                "stop" => commands::maintenance::stop(),
                "run" => commands::maintenance::run(task.as_deref()),
                "status" => commands::maintenance::status(),
                _ => Err(anyhow::anyhow!("Unknown maintenance action: {}. Use: start, stop, run, status", action)),
            }
        }
        Commands::Completions { shell } => {
            commands::completions::generate_completions(&shell)
        }
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
