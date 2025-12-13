# Phase 2: Structure Awareness (Atom Exploder)

> **Status: ✅ COMPLETE** - All Phase 2 deliverables have been implemented including MP4/ISOBMFF parsing.

Execution manual for building the `dits` CLI binary on top of `dits-core`. This is where dits stops being a storage engine and starts feeling like an actual tool.

**Objective:** Build a complete local VCS-style CLI with `init`, `add`, `status`, `commit`, `log`, and `checkout` commands. Add MP4/ISOBMFF structure-aware parsing to protect container integrity.

**Success Metric:** Full local workflow works end-to-end: init repo, add files (including large binaries), commit, view history, and checkout previous states. Metadata-only changes to MP4 files cause zero payload re-upload.

---

## Alignment with README (core ground rules)
- Keep CLI semantics git-like and human-friendly; surface branch/ref names in output where available.
- Preserve hashing/chunking defaults from Phase 1 (BLAKE3; FastCDC 128 KiB / 1 MiB / 4 MiB) to keep manifests stable.
- Fail loudly and clearly: repo-not-found, nothing-to-commit, path-not-tracked should be explicit.
- Provide helpful `--help` text with examples; colors for status/log improve usability.
- Add `.ditsignore` support to skip noise (tmp/cache/node_modules); default ignore `.dits`.
- Plan for sparse/partial checkout to avoid materializing huge trees by default.
- Expose perf knobs (chunking params, concurrency) via config with safe defaults.

---

## Phase 2 Goal (zoomed in)

Build a `dits` CLI binary that supports local VCS-style workflows:
- `dits init` - Initialize a new repository
- `dits add` - Stage files for commit
- `dits status` - Show working tree status
- `dits commit` - Create a commit snapshot
- `dits log` - View commit history
- `dits checkout` - Switch to a different commit

No remotes yet; all local. This phase will:
1. Add a **CLI crate** (`dits-cli`).
2. Extend `dits-core` with helper functions to make CLI logic clean.
3. Define the **user-facing behavior** of each command.
4. Wire it all up into a single `main.rs` you can compile and run.

---

## Crate & Folder Layout

Top-level structure:
```
dits/
  crates/
    dits-core/
      ... (Phase 1 code)
    dits-cli/
      Cargo.toml
      src/
        main.rs
        commands/
          mod.rs
          init.rs
          add.rs
          status.rs
          commit.rs
          log.rs
          checkout.rs
```

- `dits-core` = library from Phase 1.
- `dits-cli` = new binary crate that depends on `dits-core`.

### `dits-cli/Cargo.toml`

```toml
[package]
name = "dits-cli"
version = "0.1.0"
edition = "2021"

[dependencies]
dits-core = { path = "../dits-core" }
clap = { version = "4.5.4", features = ["derive"] }
colored = "2.1.0"
thiserror = "1.0"
walkdir = "2.5.0"

[bin]
name = "dits"
path = "src/main.rs"
```

---

## Repo Discovery & HEAD/Refs (Core Extensions)

To make CLI commands smooth, we need extensions to `dits-core`:

### Repo Discovery

Add to `Repo` in `dits-core`:
- `Repo::discover(start_dir: &Path) -> Result<Repo, DitsError>`

**Behavior:**
- Start at `start_dir`.
- Walk upward until you find a `.dits` directory.
- If none found, return `RepoNotFound`.

### HEAD & Refs Support

Inside `.dits/` we'll use:
- `.dits/HEAD` - contains `ref: refs/heads/main` or `ref: refs/heads/<branch>`.
- `.dits/refs/heads/<branch>` - contains commit ID (like `cm_...`).

**Core operations needed:**
- `Repo::read_head_ref() -> Result<String, DitsError>` - e.g. `"refs/heads/main"`
- `Repo::read_head_commit_id() -> Result<Option<ObjectId>, DitsError>`
- `Repo::update_ref(ref_name: &str, commit_id: ObjectId) -> Result<(), DitsError>`
- `Repo::set_head_to_ref(ref_name: &str) -> Result<(), DitsError>`

**On `init`:**
1. Create `.dits/refs/heads/main` with no commit yet (or empty).
2. Write `.dits/HEAD` with `ref: refs/heads/main`.

**On first `commit`:**
- Write new commit object → get `commit_id`.
- Update `refs/heads/main` to that ID.

### Status Helper

We want a function like:
```rust
pub struct FileStatus {
    pub path: String,
    pub staged: bool,
    pub modified: bool,
    pub deleted: bool,
    pub untracked: bool,
}

pub struct RepoStatus {
    pub entries: Vec<FileStatus>,
}

impl Repo {
    pub fn status(&self) -> Result<RepoStatus, DitsError>;
}
```

**Implementation approach:**
- Load `Index`.
- Load current commit's `Tree` (if any).
- Walk the working directory (excluding `.dits`).
- For each file:
  - If not in tree and not in index → `untracked`.
  - If in index but not in tree or manifest changed → `staged`.
  - If in tree but not in index and file changed → `modified`.
- For files in tree but missing on disk → `deleted`.

You don't need a *perfect* status engine on day one. Clean and predictable is enough.

### Log Helper

Add:
```rust
pub struct CommitInfo {
    pub id: ObjectId,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
}

impl Repo {
    pub fn walk_commits_from_head(&self, max: Option<usize>) -> Result<Vec<CommitInfo>, DitsError>;
}
```

**Behavior:**
- Read HEAD commit ID.
- Iterate backwards over `parents`.
- Collect commit info until `max` or no parent.

`dits log` will format this.

---

## UX for Each CLI Command

Define what each command does *from the user's POV*.

### `dits init`

**Usage:**
```bash
dits init            # uses current directory
dits init my-project # creates directory and initializes inside it
```

**Behavior:**
- If directory doesn't exist and a path is provided → create it.
- Create `.dits` structure.
- Create `refs/heads/main` file (empty or placeholder).
- Create `HEAD` with `ref: refs/heads/main`.
- Print: `Initialized empty dits repository in <path>`

### `dits add`

**Usage:**
```bash
dits add file1.mp4
dits add dir/
dits add .          # add everything
```

**Behavior:**
- Discover repo.
- For each path:
  - Resolve relative to repo root.
  - If file:
    - Chunk and build manifest via `Repo::add_file`.
    - Insert into Index.
  - If directory:
    - Recursively add files (respect .gitignore-like config later; skip `.dits`).

**Output:**
- Print one line per file added:
  - `added file: file1.mp4`
  - `added file: photos/portrait001.cr3`

### `dits status`

**Usage:**
```bash
dits status
```

**Behavior:**
- Discover repo.
- Call `Repo::status()`.
- Pretty-print sections:

**Example output:**
```
On branch main

Changes to be committed:
  (use "dits reset <file>..." to unstage)

    added:    file1.mp4
    modified: game-build/level1.pak

Changes not staged for commit:
  (use "dits add <file>..." to update what will be committed)

    modified: photos/portrait001.cr3

Untracked files:
  (use "dits add <file>..." to include in what will be committed)

    tmp/render-test.mov
```

We don't *need* `reset` yet; you can add that later.

### `dits commit`

**Usage:**
```bash
dits commit -m "message"
```

**Behavior:**
- Discover repo.
- Check Index isn't empty; if empty → error "nothing to commit".
- Load head ref:
  - If no parent commit yet: `parent_commits = []`.
  - Else use that ID as single parent.
- Create `Tree` from Index.
- Create `Commit`.
- Update `refs/heads/main` to new commit ID.
- Print commit summary:

**Example output:**
```
[main cm_1234abcd] Initial import of video project
  3 files changed
```

We'll later add `--author`, but for now you can read name/email from config or env.

### `dits log`

**Usage:**
```bash
dits log          # show recent commits
dits log -n 5     # show last 5
```

**Behavior:**
- Discover repo.
- Walk commits from HEAD.
- Print in `git log --oneline`-ish style:

**Example output:**
```
cm_8d92f0e4a1b753 Initial import
cm_4c11e12aa8b9e8 Add intro music
cm_9a0f1ccde42210 Fix typo in credits
```

Later you can add:
- `--pretty`, `--format`, date formatting, etc.

### `dits checkout`

**Usage:**
```bash
dits checkout <commit-id>
dits checkout main     # later when branches exist
```

**Behavior:**
- Discover repo.
- Resolve argument:
  - If matches a ref name (e.g. `main`), load ref's commit ID.
  - Else try to parse as `ObjectId` (must be a `Commit`).
- Load the commit's `Tree`.
- **Warning**: This will overwrite working directory files to match that tree.
- For each entry in tree:
  - Reconstruct file from manifest using stored chunks.
- Remove any files in working dir that are not in tree (except `.dits`).
- Optionally, print:

**Example output:**
```
Note: checking out cm_8d92f0e (detached HEAD)
You are now in 'detached HEAD' state.
```

For Phase 2 you can skip full "detached HEAD" messaging and just keep it simple.

---

## CLI Implementation Structure

We'll use `clap` with subcommands.

### `src/main.rs`

Full `main.rs` wired up to subcommand modules:

```rust
use clap::{Parser, Subcommand};
use colored::*;
use std::env;
use std::path::PathBuf;

mod commands;

#[derive(Parser, Debug)]
#[command(name = "dits")]
#[command(about = "dits - version control for large binary/media files", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Initialize a new dits repository
    Init {
        /// Directory to initialize in (defaults to current directory)
        path: Option<PathBuf>,
    },

    /// Add file contents to the index
    Add {
        /// Files or directories to add
        paths: Vec<PathBuf>,
    },

    /// Show the working tree status
    Status,

    /// Record changes to the repository
    Commit {
        /// Commit message
        #[arg(short = 'm', long = "message")]
        message: String,
    },

    /// Show commit logs
    Log {
        /// Limit the number of commits
        #[arg(short = 'n', long = "max-count")]
        max_count: Option<usize>,
    },

    /// Switch to a different commit (or branch in the future)
    Checkout {
        /// Commit ID or ref name
        target: String,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Init { path } => commands::init::run(path),
        Commands::Add { paths } => commands::add::run(paths),
        Commands::Status => commands::status::run(),
        Commands::Commit { message } => commands::commit::run(message),
        Commands::Log { max_count } => commands::log::run(max_count),
        Commands::Checkout { target } => commands::checkout::run(target),
    };

    if let Err(err) = result {
        eprintln!("{} {}", "error:".red().bold(), err);
        std::process::exit(1);
    }
}
```

### `src/commands/mod.rs`

```rust
pub mod init;
pub mod add;
pub mod status;
pub mod commit;
pub mod log;
pub mod checkout;
```

---

## Command Implementations

Below are full examples showing how commands hook into `dits-core`. The pattern is consistent: open/discover repo, call `dits-core`, format output.

### `src/commands/init.rs`

```rust
use colored::*;
use dits_core::errors::DitsError;
use dits_core::repo::Repo;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

pub fn run(path: Option<PathBuf>) -> Result<(), DitsError> {
    let target_dir = match path {
        Some(p) => p,
        None => std::env::current_dir().map_err(|e| DitsError::InvalidState(e.to_string()))?,
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)?;
    }

    let repo = Repo::init(&target_dir)?;

    let dits_dir = repo.root.join(".dits");

    // Create HEAD and refs/heads/main
    let heads_dir = dits_dir.join("refs").join("heads");
    fs::create_dir_all(&heads_dir)?;

    let main_ref_path = heads_dir.join("main");
    if !main_ref_path.exists() {
        let mut f = fs::File::create(&main_ref_path)?;
        // Empty for now; will be filled on first commit
        f.write_all(b"")?;
    }

    let head_path = dits_dir.join("HEAD");
    if !head_path.exists() {
        let mut f = fs::File::create(&head_path)?;
        f.write_all(b"ref: refs/heads/main\n")?;
    }

    println!(
        "{} {}",
        "Initialized empty dits repository in".green().bold(),
        repo.root.join(".dits").display()
    );

    Ok(())
}
```

### `src/commands/add.rs`

```rust
use colored::*;
use dits_core::errors::DitsError;
use dits_core::index::{Index, IndexStore};
use dits_core::repo::Repo;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn discover_repo_root() -> Result<PathBuf, DitsError> {
    let cwd = std::env::current_dir()
        .map_err(|e| DitsError::InvalidState(format!("Failed to get cwd: {}", e)))?;
    dits_core::repo::Repo::discover(&cwd).map(|r| r.root)
}

fn collect_files(root: &Path, path: &Path) -> Result<Vec<PathBuf>, DitsError> {
    let full = if path.is_absolute() {
        path.to_path_buf()
    } else {
        root.join(path)
    };

    let mut result = Vec::new();

    if full.is_file() {
        result.push(full);
    } else if full.is_dir() {
        for entry in WalkDir::new(&full) {
            let entry = entry.map_err(|e| DitsError::InvalidState(e.to_string()))?;
            let p = entry.path();
            if p.is_file() {
                // Skip .dits
                if p.components().any(|c| c.as_os_str() == ".dits") {
                    continue;
                }
                result.push(p.to_path_buf());
            }
        }
    }

    Ok(result)
}

pub fn run(paths: Vec<PathBuf>) -> Result<(), DitsError> {
    if paths.is_empty() {
        return Err(DitsError::InvalidState(
            "No paths provided to 'dits add'".to_string(),
        ));
    }

    let repo_root = discover_repo_root()?;
    let repo = Repo::open(&repo_root)?;
    let mut index_store = dits_core::index::IndexStore::new(&repo_root);
    let mut index = index_store.load()?;

    for user_path in paths {
        let files = collect_files(&repo_root, &user_path)?;
        for full_file in files {
            let rel = full_file
                .strip_prefix(&repo_root)
                .map_err(|e| DitsError::InvalidState(e.to_string()))?;
            let rel_str = rel.to_string_lossy().to_string();

            let entry = repo.add_file(&rel_str)?;
            index.add(entry.path.clone(), entry.manifest_id.clone());

            println!("{} {}", "added".green().bold(), rel_str);
        }
    }

    index_store.save(&index)?;
    Ok(())
}
```

### `src/commands/status.rs` (Pattern)

**Implementation pattern:**
- Call `Repo::discover`, `Repo::status`.
- Print color-coded sections (staged, modified, untracked, deleted).
- Format similar to git status output.

### `src/commands/commit.rs` (Pattern)

**Implementation pattern:**
- Load `Index`, ensure not empty.
- Get parent commit ID (from head ref if present).
- Use `Repo::commit`.
- Update `refs/heads/main`.
- Print summary with commit ID and file count.

### `src/commands/log.rs` (Pattern)

**Implementation pattern:**
- Call `Repo::walk_commits_from_head(max_count)`.
- Print one line per commit with ID and message.
- Format: `cm_<short-id> <message>`

### `src/commands/checkout.rs` (Pattern)

**Implementation pattern:**
- Resolve target (ref or commit id).
- Load tree & reconstruct working dir using manifests.
- Remove files not in tree (except `.dits`).
- Print checkout confirmation.

---

## Phase 2 Completion Criteria

You can say Phase 2 is "done" when:

**Basic workflow test:**
```bash
mkdir test-repo
cd test-repo

dits init
echo "hello" > a.txt
dits add a.txt
dits commit -m "Initial"
dits status     # clean
dits log        # shows one commit

echo "world" >> a.txt
dits status     # shows modified
dits add a.txt
dits commit -m "Update a.txt"
dits log        # shows two commits
```

**Large file dedup test:**
```bash
cp 10gb-video.mp4 big.mp4
dits add big.mp4
dits commit -m "add big file"

# modify slightly / encode another version
cp big.mp4 big2.mp4
# maybe truncate or append some bytes for test

dits add big2.mp4
dits commit -m "second version of big file"
```

Then inspect `.dits/objects/chunk` and verify:
- You don't have 2x the storage of `big.mp4` + `big2.mp4`.
- Many chunks are reused.

**Checkout test:**
```bash
dits checkout <first-commit-id>
# verify files match first commit state
dits checkout main
# verify files match latest commit
```

---

## Actionable Build Order (Phase 2)

1. Create `dits-cli` crate with `Cargo.toml` dependencies.
2. Extend `dits-core::Repo` with:
   - `discover()` method
   - `read_head_ref()`, `read_head_commit_id()`, `update_ref()`, `set_head_to_ref()`
   - `status()` method returning `RepoStatus`
   - `walk_commits_from_head()` method
3. Implement `main.rs` with clap CLI structure.
4. Implement `commands/init.rs` - full implementation.
5. Implement `commands/add.rs` - full implementation.
6. Implement `commands/status.rs` - call `Repo::status()`, format output.
7. Implement `commands/commit.rs` - create commit, update refs.
8. Implement `commands/log.rs` - walk commits, format output.
9. Implement `commands/checkout.rs` - resolve target, reconstruct tree.
10. Test end-to-end workflow with small and large files.

---

## Future Enhancements (Post-Phase 2)

- Structure-aware chunking (ISOBMFF parsing for video files) - separate `moov` metadata from `mdat` media data for better dedup on metadata-only edits.
- `.ditsignore` support (like `.gitignore`).
- Branch support (create, switch, merge).
- `dits reset` to unstage files.
- `dits diff` to show changes.
- Config file support for user name/email.
- Better error messages and help text.
- Progress bars for large file operations.

---

## Testing Strategy

**Unit tests:**
- Test each command module in isolation.
- Mock `dits-core` if needed for edge cases.

**Integration tests:**
- Full workflow tests (init → add → commit → log → checkout).
- Large file handling (10GB+ files).
- Dedup verification (modify file, verify chunk reuse).

**Manual testing:**
- Real-world video project workflow.
- Multiple file types (video, photos, archives).
- Concurrent operations (if applicable).

---

## Next Steps After Phase 2

Once Phase 2 is complete, you have a fully functional local VCS. Phase 3 will add:
- Remote server implementation (HTTP API).
- `push` and `pull` commands.
- Remote discovery and configuration.
