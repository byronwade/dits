# CLI Reference

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Complete Command Line Interface Reference
**Version:** 1.0

---

## Implementation Status

> **Dits is a local-first CLI.** All local version-control, MP4, FACR/photo, locking,
> encryption, audit, freeze/thaw, and dependency commands work today. **Networked
> collaboration is on the roadmap and not implemented yet:** `push`, `pull`, `fetch`,
> `sync`, network `clone`, `remote`/`serve`, and all `p2p` subcommands currently print
> placeholders and do **not** transfer data. `clone` works only against a **local
> filesystem path**. See [Roadmap — Not Implemented Yet](#roadmap--not-implemented-yet).
>
> **Note:** There is **no** `auth` or `vfs` command. `mount` / `unmount` exist **only when
> the CLI is built with the `fuser` feature** (`cargo build --features fuser`, requires
> macFUSE/libfuse); they are absent from default builds. Authentication is for **local
> encryption keys** via `login` / `logout` / `change-password` — not remote servers.

### Implemented Commands (Ready to Use)

**DITS exposes 80+ subcommands** (run `dits --help` for the full list) across version control, MP4/FACR media tooling, locking, encryption, audit, freeze/thaw, and dependency analysis. The commands below work today on a local repository.

#### **Core Git Operations** (Phase 3.5)
| Command | Status | Description |
|---------|--------|-------------|
| `init` | ✅ | Initialize a new repository |
| `add` | ✅ | Add files to staging area |
| `status` | ✅ | Show repository status |
| `commit` | ✅ | Create a commit |
| `log` | ✅ | Show commit history |
| `checkout` | ✅ | Checkout a commit or branch |
| `branch` | ✅ | List, create, or delete branches |
| `switch` | ✅ | Switch to a different branch |
| `diff` | ✅ | Show changes between commits |
| `tag` | ✅ | Create, list, or delete tags |
| `merge` | ✅ | Merge branches |
| `reset` | ✅ | Reset HEAD to a specific state |
| `restore` | ✅ | Restore working tree files |
| `config` | ✅ | Get and set configuration |
| `stash` | ✅ | Stash changes |

#### **Advanced Git Operations**
| Command | Status | Description |
|---------|--------|-------------|
| `rebase` | ✅ | Rebase commits |
| `cherry-pick` | ✅ | Apply specific commits |
| `bisect` | ✅ | Binary search for bugs |
| `reflog` | ✅ | Show reference logs |
| `blame` | ✅ | Show authorship by line |
| `show` | ✅ | Show object details |
| `grep` | ✅ | Search repository content |
| `worktree` | ✅ | Manage multiple worktrees |
| `sparse-checkout` | ✅ | Check out only specified paths |
| `hooks` | ✅ | Manage Git hooks |
| `archive` | ✅ | Create archives |
| `describe` | ✅ | Describe commits |
| `shortlog` | ✅ | Summarize git log output |
| `maintenance` | ✅ | Run maintenance tasks |
| `completions` | ✅ | Generate shell completions |

#### **Creative Workflow Commands** (Phase 5-6)
| Command | Status | Description |
|---------|--------|-------------|
| `video-init` | ✅ | Initialize video timeline project |
| `video-add-clip` | ✅ | Add a clip to video timeline |
| `video-show` | ✅ | Show a video timeline |
| `video-list` | ✅ | List all video projects |
| `proxy-generate` | ✅ | Generate proxies for video files |
| `proxy-status` | ✅ | Show proxy generation status |
| `proxy-list` | ✅ | List proxy files |
| `proxy-delete` | ✅ | Delete proxy files |

#### **Asset Management** (Phase 5)
| Command | Status | Description |
|---------|--------|-------------|
| `segment` | ✅ | Segment video into chunks |
| `assemble` | ✅ | Reassemble segmented video |
| `roundtrip` | ✅ | Test MP4 deconstruct/reconstruct |
| `mount` | ⚙️ | Mount repository as VFS — **requires `--features fuser` build** |
| `unmount` | ⚙️ | Unmount VFS — **requires `--features fuser` build** |
| `inspect` | ✅ | Inspect MP4 structure |
| `inspect-file` | ✅ | Inspect file dedup stats |
| `repo-stats` | ✅ | Show repo dedup statistics |
| `cache-stats` | ✅ | Show cache statistics |
| `fsck` | ✅ | Repository integrity check |
| `meta-scan` | ✅ | Scan files and extract metadata |
| `meta-show` | ✅ | Show metadata for a file |
| `meta-list` | ✅ | List all stored metadata |

#### **Collaboration & Security** (Phase 7-9)
| Command | Status | Description |
|---------|--------|-------------|
| `remote` | 🚧 | Manage remote config (config/scaffolding only — no transfer) |
| `push` | 🚧 | Roadmap — prints placeholder, does not transfer data |
| `pull` | 🚧 | Roadmap — prints placeholder, does not transfer data |
| `fetch` | 🚧 | Roadmap — prints placeholder, does not transfer data |
| `clone` | ⚠️ | Local-filesystem path only; network clone is roadmap |
| `lock` | ✅ | Lock files for editing |
| `unlock` | ✅ | Unlock files |
| `locks` | ✅ | List active locks |
| `login` | ✅ | Authenticate user |
| `logout` | ✅ | Log out user |
| `change-password` | ✅ | Change user password |
| `audit` | ✅ | Show audit logs |
| `audit-stats` | ✅ | Show audit statistics |
| `audit-export` | ✅ | Export audit logs |

#### **Lifecycle & Maintenance**
| Command | Status | Description |
|---------|--------|-------------|
| `freeze-init` | ✅ | Initialize freeze storage |
| `freeze-status` | ✅ | Show freeze status |
| `freeze` | ✅ | Freeze repository to cold storage |
| `thaw` | ✅ | Thaw repository from cold storage |
| `freeze-policy` | ✅ | Configure freeze policies |
| `encrypt-init` | ✅ | Initialize encryption |
| `encrypt-status` | ✅ | Show encryption status |
| `dep-check` | ✅ | Check dependencies |
| `dep-graph` | ✅ | Show dependency graph |
| `dep-list` | ✅ | List dependencies |
| `gc` | ✅ | Run garbage collection (does not yet repack) |
| `clean` | ✅ | Clean untracked files |
| `maintenance` | ✅ | Run maintenance tasks |

#### **FACR Frame Engine & Photos** (requires FFmpeg)
| Command | Status | Description |
|---------|--------|-------------|
| `facr-add` | ✅ | Ingest a video into the frame-addressable store |
| `facr-checkout` | ✅ | Reconstruct a playable video from a FACR manifest |
| `facr-trim` | ✅ | Non-destructively trim a manifest (stores zero new frames) |
| `facr-import-edl` | ✅ | Import a CMX3600 EDL into a manifest referencing a source clip (zero new frames) |
| `facr-import-otio` | ✅ | Import an OTIO timeline JSON into a manifest referencing a source clip (zero new frames) |
| `fetch-objects` | ✅ | Pull missing objects from another dits repo — local path OR a `dits serve` http:// URL (content-addressed, incremental) |
| `facr-demo` | ✅ | Demonstrate frame-level dedup on a synthetic clip |
| `photo-add` | ✅ | Store a photo once, start a non-destructive edit history |
| `photo-edit` | ✅ | Append non-destructive edits (stores zero new image bytes) |
| `photo-render` | ✅ | Render a photo manifest by applying its edit log |

#### **Advanced Local Features**
| Command | Status | Description |
|---------|--------|-------------|
| `worktree` | ✅ | Manage multiple working trees |
| `sparse-checkout` | ✅ | Check out only specified paths |
| `hooks` | ✅ | Manage Git-style hooks |
| `archive` | ✅ | Create tar/zip archives |
| `describe` | ✅ | Describe commits with tags |
| `shortlog` | ✅ | Summarize git log output |
| `completions` | ✅ | Generate shell completions |
| `telemetry` | ✅ | Manage telemetry settings |

### Roadmap — Not Implemented Yet

These commands exist in the CLI but are **scaffolding only**: they print placeholders and do **not** transfer data. Do not rely on them.

| Command | Status | Description |
|---------|--------|-------------|
| `push` | 🚧 | Networked push — placeholder, no data transfer |
| `pull` | 🚧 | Networked pull — placeholder, no data transfer |
| `fetch` | 🚧 | Networked fetch — placeholder, no data transfer |
| `sync` | 🚧 | Bi-directional sync — placeholder, no data transfer |
| `clone` (network) | 🚧 | Only **local-path** clone works; network clone is roadmap |
| `remote` | 🚧 | Manages remote config/scaffolding only |
| `serve` | 🚧 | Remote server scaffolding only |
| `p2p` (all subcommands) | 🚧 | Wormhole P2P — scaffolding; no transfer, NAT traversal, or QUIC |
| QUIC delta transport | 🚧 | Designed, not implemented |

> There is **no** `auth` or `vfs` command (earlier drafts invented them). `mount`/`unmount`
> are real but **feature-gated** behind `--features fuser` and absent from default builds.
> `login`/`logout`/`change-password` manage local encryption keys only.

---

## Overview

Dits provides a git-like command line interface optimized for large binary files. Commands are organized into categories:

- **Repository Management** - init, clone (local path)
- **Working with Files** - add, restore, status, diff
- **Recording Changes** - commit, tag
- **Branching & History** - branch, checkout, log, show
- **Media / FACR** - facr-add, facr-checkout, facr-trim, photo-add, photo-edit, photo-render
- **Collaboration** - lock, unlock, locks
- **Configuration** - config
- **Utilities** - gc, fsck, help
- **Roadmap (not implemented)** - push, pull, fetch, sync, remote, serve, p2p

---

## Global Options

The only options accepted on the top-level `dits` command are:

```
-h, --help          Show help for command
-V, --version       Show dits version
```

Individual subcommands have their own flags (shown per command below, and via
`dits <command> --help`). Flags like `--verbose`, `--json`, or `-C <path>` are **not**
global — only the subcommands that document them accept them.

---

## Repository Management

### `dits init`

Initialize a new Dits repository.

```
dits init [OPTIONS] [PATH]
```

**Arguments:**
- `PATH` - Directory to initialize (default: current directory)

**Options:**
```
--bare              Create a bare repository (no working directory)
--template <path>   Use custom template directory
--initial-branch <name>  Set initial branch name (default: main)
```

**Examples:**
```bash
# Initialize in current directory
dits init

# Initialize in specific directory
dits init my-project

# Initialize with custom branch name
dits init --initial-branch production
```

**Output:**
```
Initialized empty Dits repository in /path/to/my-project/.dits/
```

---

### `dits clone`

Clone a repository. **Only cloning from a local filesystem path works today.**
Cloning from a network URL is roadmap and not implemented.

```
dits clone [OPTIONS] <SOURCE> [DEST]
```

**Arguments:**
- `SOURCE` - Source repository (a local path; URL support is roadmap)
- `DEST` - Destination directory (default: derived from source)

**Options:**
```
-b, --branch <BRANCH>   Branch to checkout after clone
```

> 🚧 **Roadmap — not implemented yet:** network clone (URLs) and partial/shallow
> clone flags (`--depth`, `--filter`, `--single-branch`, …) do not exist. Only a
> local-filesystem copy is supported.

**Examples:**
```bash
# Clone from a local path
dits clone /path/to/source-repo my-local-copy

# Clone and check out a specific branch
dits clone -b feature/vfx /path/to/source-repo
```

---

### `dits remote`

Manage remote repository **configuration**. Remotes can be recorded, but no data is
transferred — `push`/`pull`/`fetch` against them are roadmap.

```
dits remote [OPTIONS] [ACTION] [NAME] [URL]
```

**Arguments:**
- `ACTION` - One of: `add`, `remove` (`rm`), `rename`, `get-url`, `set-url`, `list`
- `NAME` - Remote name
- `URL` - Remote URL (for `add` / `set-url`)

**Options:**
```
-v, --verbose   Show verbose output
    --push      Apply to push URL (for get-url/set-url)
```

> 🚧 **Roadmap:** `remote` only stores configuration. Actual data transfer to/from a
> remote is not implemented.

**Examples:**
```bash
# List remotes
dits remote -v
# origin  https://dits.example.com/team/project (fetch)
# origin  https://dits.example.com/team/project (push)

# Add a remote
dits remote add upstream https://dits.example.com/other/project

# Remove a remote
dits remote remove upstream
```

---

## Working with Files

### `dits status`

Show repository status.

```
dits status
```

This command takes no options or arguments beyond `-h/--help`.

**Examples:**
```bash
# Show working tree status
dits status
```

**Output:**
```
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "dits restore --staged <file>..." to unstage)
        new file:   footage/scene01.mov

Changes not staged for commit:
  (use "dits add <file>..." to update what will be committed)
  (use "dits restore <file>..." to discard changes)
        modified:   project.prproj

Untracked files:
  (use "dits add <file>..." to include in what will be committed)
        exports/draft.mp4
```

---

### `dits add`

Add files to the staging area.

```
dits add <FILES>...
```

**Arguments:**
- `FILES` - Files or directories to add

This command takes no options beyond `-h/--help`.

**Examples:**
```bash
# Add specific file
dits add footage/scene01.mov

# Add all files in directory
dits add footage/

# Add multiple paths
dits add footage/ project.prproj
```

**Output:**
```
Adding footage/scene01.mov...
  Parsing container: MP4 (moov + mdat)
  Chunking: 1,234 chunks (avg 64KB)
  Deduplication: 1,200 new, 34 existing (97% unique)
  Total: 78.5 MB added to staging
Done.
```

---

### `dits restore`

Restore working tree files or unstage.

```
dits restore [OPTIONS] <PATHS>...
```

**Arguments:**
- `PATHS` - Paths to restore

**Options:**
```
    --staged           Restore staged files (unstage)
    --worktree         Restore working tree (default)
-s, --source <SOURCE>  Source commit to restore from
    --ours             Use "ours" version during merge conflict
    --theirs           Use "theirs" version during merge conflict
```

> Note: `restore` does not yet do full merge-conflict resolution.

**Examples:**
```bash
# Discard changes to file
dits restore project.prproj

# Unstage a file
dits restore --staged footage/scene01.mov

# Restore from specific commit
dits restore --source HEAD~3 footage/scene01.mov

# Restore entire directory
dits restore footage/
```

---

### `dits diff`

Show changes between commits, working tree, etc.

```
dits diff [OPTIONS] [FILE]
```

**Arguments:**
- `FILE` - Specific file to diff

**Options:**
```
    --staged           Show staged changes
-c, --commit <COMMIT>  Compare against a specific commit
```

**Examples:**
```bash
# Show unstaged changes
dits diff

# Show staged changes
dits diff --staged

# Compare against a specific commit
dits diff --commit abc123

# Diff a specific file
dits diff footage/scene01.mov
```

**Output (for binary files):**
```
diff --dits a/footage/scene01.mov b/footage/scene01.mov
Binary file modified
  - Size: 1,234,567,890 bytes -> 1,234,600,000 bytes (+32,110)
  - Duration: 00:30:00.00 -> 00:30:02.00 (+2s)
  - Chunks changed: 15 of 19,284 (0.08%)
  - Metadata: moov atom updated

To view visual diff:
  dits diff --visual a/footage/scene01.mov b/footage/scene01.mov
```

---

## Recording Changes

### `dits commit`

Create a commit from staged changes.

```
dits commit --message <MESSAGE>
```

**Options:**
```
-m, --message <MESSAGE>   Commit message (required)
```

**Examples:**
```bash
# Commit staged changes with a message
dits commit -m "Add VFX shots for scene 3"
```

**Output:**
```
[main abc1234] Add VFX shots for scene 3
 3 files changed, 2.3 GB added
 create mode 100644 footage/vfx/explosion_01.mov
 create mode 100644 footage/vfx/explosion_02.mov
 modify mode 100644 project.prproj
```

---

### `dits tag`

List, create, or delete tags.

```
dits tag [OPTIONS] [NAME]
```

**Arguments:**
- `NAME` - Tag name to create or delete

**Options:**
```
-c, --commit <COMMIT>   Commit to tag (default: HEAD)
-d, --delete            Delete the tag
    --sort <SORT>       Sort order for listing tags: name, created, version [default: name]
```

**Examples:**
```bash
# List tags
dits tag

# Create a tag at HEAD
dits tag v1.0

# Tag a specific commit
dits tag v1.0-beta --commit abc1234

# Delete tag
dits tag -d v1.0-beta

# List tags sorted by version
dits tag --sort version
```

**Output:**
```
v0.9
v1.0
v1.0-rc1
```

---

## Sharing & Collaboration

> 🚧 **Roadmap — not implemented yet.** Everything in this section (`push`, `pull`,
> `fetch`, `sync`) currently prints a placeholder and does **not** transfer any data.
> The commands exist so the interface is stable, but networked collaboration is not
> functional. Use a local-path `clone` for local mirroring.

### `dits push`

Push changes to a remote repository.

> 🚧 **Roadmap — not implemented yet.** Prints a placeholder; no data is transferred.

```
dits push [OPTIONS] [REMOTE] [BRANCH]
```

**Arguments:**
- `REMOTE` - Remote name (default: origin)
- `BRANCH` - Branch to push (default: current branch)

**Options:**
```
-f, --force   Force push (overwrite remote)
    --all     Push all branches
```

**Examples:**
```bash
# Intended usage once implemented:
dits push
dits push origin feature/vfx
dits push --all
```

---

### `dits pull`

Pull changes from a remote repository.

> 🚧 **Roadmap — not implemented yet.** Prints a placeholder; no data is transferred.

```
dits pull [OPTIONS] [REMOTE] [BRANCH]
```

**Arguments:**
- `REMOTE` - Remote name (default: origin)
- `BRANCH` - Branch to pull

**Options:**
```
-r, --rebase   Rebase instead of merge
```

**Examples:**
```bash
# Intended usage once implemented:
dits pull
dits pull origin main
dits pull --rebase
```

---

### `dits fetch`

Fetch objects and refs from a remote repository.

> 🚧 **Roadmap — not implemented yet.** Prints a placeholder; no data is transferred.

```
dits fetch [OPTIONS] [REMOTE]
```

**Arguments:**
- `REMOTE` - Remote name (default: origin)

**Options:**
```
    --all     Fetch from all remotes
-p, --prune   Prune remote-tracking refs that no longer exist
```

**Examples:**
```bash
# Intended usage once implemented:
dits fetch
dits fetch --all
dits fetch --prune
```

---

### `dits sync`

Synchronize with a remote repository (bi-directional).

> 🚧 **Roadmap — not implemented yet.** Prints a placeholder; no data is transferred.

```
dits sync [OPTIONS] [REMOTE] [BRANCH]
```

**Arguments:**
- `REMOTE` - Remote name (default: origin)
- `BRANCH` - Branch to sync (default: current branch)

**Options:**
```
    --force     Force sync (resolve conflicts automatically)
    --dry-run   Dry run - show what would be synced
```

**Examples:**
```bash
# Intended usage once implemented:
dits sync
dits sync --dry-run
```

---

### `dits serve`

Start a remote server for this repository.

> 🚧 **Roadmap — not implemented yet.** Scaffolding only; does not serve live transfers.

```
dits serve [OPTIONS]
```

**Options:**
```
-p, --port <PORT>          Port to listen on [default: 8080]
-b, --base-dir <BASE_DIR>  Base directory containing repositories
```

---

## P2P Sharing (Wormhole Integration)

> 🚧 **Roadmap — not implemented yet.** All `p2p` subcommands below are **scaffolding**:
> no data transfer, no NAT traversal, no QUIC sync. The commands run and print output,
> but they do not move repository data between peers. This entire section documents the
> intended design, not working functionality.

Dits is designed to integrate Wormhole-style peer-to-peer sharing for direct repository sharing without cloud uploads.

### `dits p2p share`

Share a repository for peer-to-peer access with a join code.

```
dits p2p share [OPTIONS] [PATH]
```

**Arguments:**
- `PATH`: Path to repository (default: current directory)

**Options:**
```
-n, --name <NAME>     Custom name for this share
-p, --port <PORT>     Port to listen on (default: 4433)
-b, --bind <ADDR>     Bind address (default: 0.0.0.0)
-d, --daemon          Run in background as daemon
```

**Examples:**
```bash
# Share current directory
dits p2p share

# Share with custom name and port
dits p2p share --name "My Project" --port 8080

# Share specific directory
dits p2p share ./projects/vfx
```

**Output:**
```
🚀 P2P repository share active!
📋 Join code: ABC-123
🌐 Listening on 0.0.0.0:4433
📁 Repository: /path/to/repo
```

### `dits p2p connect`

Connect to a shared repository using a join code.

```
dits p2p connect [OPTIONS] <TARGET> <PATH>
```

**Arguments:**
- `TARGET`: Join code (e.g., "ABC-123") or direct address
- `PATH`: Local path to mount the repository

**Options:**
```
-t, --timeout <SECS>  Connection timeout (default: 30)
```

**Examples:**
```bash
# Connect with join code
dits p2p connect ABC-123 ./shared-repo

# Connect with timeout
dits p2p connect ABC-123 ./shared-repo --timeout 60
```

**Output:**
```
🔗 Connecting to P2P repository...
🎯 Target: ABC-123
📁 Local path: ./shared-repo
⏱️  Timeout: 30s
✅ Connected to P2P repository!
📁 Repository mounted at: ./shared-repo
```

### `dits p2p status`

Show status of active P2P connections and shares.

```
dits p2p status
```

**Output:**
```
📊 P2P Status
════════════
Active shares: 1
Active connections: 0

Shares:
- Repository: My Project
  Join code: ABC-123
  Port: 4433
  Peers connected: 2

Connections:
- (No active connections)
```

### `dits p2p list`

List all active P2P shares and connections.

```
dits p2p list
```

**Output:**
```
📋 Active P2P Shares
═══════════════════
Repository: My Project
Join code: ABC-123
Port: 4433
Status: Active
Connected peers: 2

Repository: Shared Assets
Join code: DEF-456
Port: 8080
Status: Active
Connected peers: 1
```

### `dits p2p cache`

Manage local P2P cache for performance optimization.

```
dits p2p cache <COMMAND>
```

**Commands:**
- `stats [--detailed]`: Show cache statistics
- `clear`: Clear cache contents
- `path`: Show cache directory location
- `gc`: Run garbage collection

**Examples:**
```bash
# Show cache stats
dits p2p cache stats

# Detailed cache breakdown
dits p2p cache stats --detailed

# Clear cache
dits p2p cache clear

# Show cache location
dits p2p cache path

# Run garbage collection
dits p2p cache gc
```

### `dits p2p ping`

Test connectivity to P2P peers.

```
dits p2p ping [OPTIONS] <TARGET>
```

**Arguments:**
- `TARGET`: Join code or peer address

**Options:**
```
-c, --count <NUM>     Number of pings (default: 4)
-i, --interval <SEC>  Interval between pings (default: 1)
-t, --timeout <SEC>   Timeout per ping (default: 5)
```

**Examples:**
```bash
# Ping with join code
dits p2p ping ABC-123

# Multiple pings with custom interval
dits p2p ping ABC-123 --count 10 --interval 2
```

**Output:**
```
🏓 Pinging ABC-123
   Count: 4, Interval: 1s, Timeout: 5s

64 bytes from ABC-123: seq=1 ttl=64 time=12.3ms
64 bytes from ABC-123: seq=2 ttl=64 time=11.8ms
64 bytes from ABC-123: seq=3 ttl=64 time=12.1ms
64 bytes from ABC-123: seq=4 ttl=64 time=11.9ms

--- ABC-123 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
round-trip min/avg/max = 11.8/12.0/12.3 ms
```

### `dits p2p unmount`

Disconnect from P2P shared repositories.

```
dits p2p unmount [OPTIONS] [TARGET]
```

**Arguments:**
- `TARGET`: Share ID or mount path to unmount

**Options:**
```
-f, --force  Force unmount even if busy
    --all    Unmount all connected repositories
```

**Examples:**
```bash
# Unmount specific share
dits p2p unmount ABC-123

# Force unmount
dits p2p unmount ABC-123 --force

# Unmount all
dits p2p unmount --all
```

**Output:**
```
🔌 Unmounting repository: ABC-123
✅ Repository unmounted
```

### P2P Security Features

- **End-to-end encryption**: All P2P transfers use SPAKE2 key exchange
- **Join codes**: Time-limited, cryptographically secure access codes
- **NAT traversal**: Works through firewalls and home networks
- **Direct connections**: No intermediate servers store your data
- **Repository validation**: All received data is verified with BLAKE3

### P2P vs Traditional Sharing

| Feature | P2P Sharing | Cloud Upload |
|---------|-------------|--------------|
| Speed | Direct transfer | Upload + download |
| Privacy | Direct connection | Data through cloud |
| Cost | Free | Storage fees |
| Setup | Join code only | Account + permissions |
| Offline | Works offline | Requires internet |
| Security | End-to-end encrypted | Provider encryption |

---

## Branching & History

### `dits branch`

List, create, or delete branches.

```
dits branch [OPTIONS] [NAME]
```

**Arguments:**
- `NAME` - Branch name to create or delete

**Options:**
```
-d, --delete        Delete the branch
```

With no arguments, lists branches.

**Examples:**
```bash
# List branches
dits branch

# Create branch
dits branch feature/vfx

# Delete branch
dits branch -d feature/vfx
```

**Output:**
```
* main
  feature/color-grade
  feature/vfx
```

---

### `dits checkout`

Checkout a commit or branch.

```
dits checkout [OPTIONS] <TARGET>
```

**Arguments:**
- `TARGET` - Commit hash or branch name

**Options:**
```
-m, --mode <MODE>   Checkout mode: full (default) or proxy [default: full]
```

> To create a new branch, use `dits branch <name>` then `dits switch <name>`. There is no
> `-b` shortcut, `--detach`, or `--resolution` flag.

**Examples:**
```bash
# Switch to branch
dits checkout feature/vfx

# Checkout a specific commit
dits checkout abc1234

# Checkout using proxy media (Phase 6)
dits checkout --mode proxy main
```

**Output:**
```
Switched to branch 'feature/vfx'
Hydrating files: 100% (45/45)
```

---

### `dits log`

Show commit history.

```
dits log [OPTIONS]
```

**Options:**
```
-n, --limit <LIMIT>   Number of commits to show [default: 10]
    --oneline         Show each commit on a single line
    --graph           Draw ASCII graph of branch structure
    --all             Show commits from all branches
```

**Examples:**
```bash
# Basic log (last 10 commits)
dits log

# Oneline with graph
dits log --oneline --graph

# Last 5 commits
dits log -n 5

# All branches
dits log --all
```

**Output:**
```
commit abc1234 (HEAD -> main, origin/main)
Author: John Editor <john@example.com>
Date:   Mon Jan 15 14:30:00 2025 -0800

    Add VFX shots for scene 3

    - Added explosion effects
    - Updated project file with new compositions

commit def5678
Author: Jane Colorist <jane@example.com>
Date:   Sun Jan 14 10:15:00 2025 -0800

    Apply final color grade to all scenes
```

---

### `dits show`

Show details of a commit.

```
dits show [OPTIONS] [OBJECT]
```

**Arguments:**
- `OBJECT` - Commit to show (default: HEAD)

**Options:**
```
    --stat          Show file statistics
    --name-only     Show only file names
    --name-status   Show file names with change type
    --no-patch      Don't show the diff
```

**Examples:**
```bash
# Show HEAD
dits show

# Show a specific commit
dits show abc1234

# Just stats
dits show --stat abc1234
```

---

## Virtual Filesystem

> ℹ️ **There is no `dits mount` / `dits unmount` command.** The virtual filesystem (VFS)
> is an **internal** module used by `checkout` and the proxy system — it is not exposed
> as a user-facing mount command. Earlier drafts of this reference documented `dits mount`
> and `dits unmount`; those commands were never implemented. To work with files, use
> `checkout`, `restore`, and the FACR/photo commands.

---

## Collaboration

### `dits lock`

Lock files for exclusive editing.

```
dits lock [OPTIONS] <PATHSPEC>...
```

**Options:**
```
-f, --force         Force acquire lock (break existing)
--reason <text>     Reason for locking
--ttl <duration>    Lock time-to-live (default: 8h)
--json              Output lock info as JSON
```

**Examples:**
```bash
# Lock a file
dits lock footage/scene01.mov

# Lock with reason
dits lock --reason "Color grading" footage/scene01.mov

# Lock with custom TTL
dits lock --ttl 24h footage/scene01.mov

# Lock multiple files
dits lock footage/*.mov
```

**Output:**
```
Locked: footage/scene01.mov
  Owner: john@example.com
  Acquired: 2025-01-15 14:30:00 UTC
  Expires: 2025-01-15 22:30:00 UTC
  Reason: Color grading
```

---

### `dits unlock`

Release file locks.

```
dits unlock [OPTIONS] <PATHSPEC>...
```

**Options:**
```
-f, --force         Force unlock (admin only)
--all               Unlock all your locks
```

**Examples:**
```bash
# Unlock file
dits unlock footage/scene01.mov

# Unlock all your locks
dits unlock --all

# Force unlock (admin)
dits unlock -f footage/scene01.mov
```

---

### `dits locks`

List current locks.

```
dits locks [OPTIONS] [PATH]
```

**Options:**
```
--mine              Show only your locks
--all               Show all locks (including expired)
--json              Output as JSON
```

**Examples:**
```bash
# List all locks
dits locks

# List your locks
dits locks --mine

# List locks in directory
dits locks footage/
```

**Output:**
```
Locked files:
  footage/scene01.mov
    Owner: john@example.com
    Since: 2025-01-15 14:30:00 UTC
    Expires in: 6h 30m
    Reason: Color grading

  footage/scene02.mov
    Owner: jane@example.com
    Since: 2025-01-15 10:00:00 UTC
    Expires in: 2h 00m
```

---

## Configuration

### `dits config`

Get and set repository or global options.

```
dits config [OPTIONS] [KEY] [VALUE]
```

**Arguments:**
- `KEY` - Config key (e.g., `user.name`)
- `VALUE` - Value to set (omit to read the key)

**Options:**
```
    --global   Use global config file
-l, --list     List all config values
    --unset    Unset a key
```

**Common Keys:**
```
user.name           Your name
user.email          Your email
cache.path          Local cache directory
```

> Keys related to remote/network behavior (e.g. `push.default`, `transfer.protocol`) have
> no effect today — networked sync is roadmap.

**Examples:**
```bash
# Set user name
dits config --global user.name "John Editor"

# Get config value
dits config user.email

# List all config
dits config --list

# Unset a key
dits config --unset user.email
```

---

### Authentication (local encryption keys)

> ℹ️ **There is no `dits auth` command.** Authentication in Dits is for **local
> encryption keys only** — not remote servers. Use the top-level `login`, `logout`, and
> `change-password` commands (Phase 9). Earlier drafts documented `dits auth login
> --sso/--token/--server`; that remote-auth flow does not exist.

```
dits login              # Unlock encryption keys (prompts for password)
dits logout             # Clear cached keys
dits change-password    # Change the encryption password
dits encrypt-init       # Initialize encryption for this repository
dits encrypt-status     # Show encryption status
```

Run `dits login --help` (and the others) for their exact flags.

---

## FACR Frame Engine & Photos

The FACR (Frame-Addressable Content Repository) engine stores video at the **frame** level
so edits like trims and re-grades store only the frames that actually changed. The photo
commands apply the same idea to still images with a non-destructive edit log. **All of these
commands require FFmpeg to be installed.**

### `dits facr-add`

Ingest a real video into the frame-addressable store.

```
dits facr-add [OPTIONS] <INPUT>
```

**Arguments:**
- `INPUT` - Path to the input video

**Options:**
```
--store <STORE>        Frame store directory (default: .dits-facr)
--manifest <MANIFEST>  Where to write the clip manifest (default: <input>.facr.json)
```

**Example:**
```bash
dits facr-add footage/scene01.mov
# Writes frames into .dits-facr/ and a manifest at footage/scene01.mov.facr.json
```

---

### `dits facr-checkout`

Reconstruct a playable video from a FACR manifest.

```
dits facr-checkout [OPTIONS] <MANIFEST> <OUTPUT>
```

**Arguments:**
- `MANIFEST` - Path to the clip manifest (`.facr.json`)
- `OUTPUT` - Output video path

**Options:**
```
--store <STORE>   Frame store directory (default: .dits-facr)
```

**Example:**
```bash
dits facr-checkout footage/scene01.mov.facr.json rebuilt.mov
```

---

### `dits facr-trim`

Non-destructively trim a FACR manifest to a frame range. **Stores zero new frames** —
trimming only rewrites the manifest.

```
dits facr-trim [OPTIONS] <MANIFEST>
```

**Arguments:**
- `MANIFEST` - Path to the clip manifest (`.facr.json`)

**Options:**
```
--start <START>   First frame to keep (0-based, inclusive) [default: 0]
--end <END>       Last frame to keep (exclusive); defaults to end of clip
--out <OUT>       Output manifest path (default: <manifest>.trimmed.json)
```

**Example:**
```bash
dits facr-trim footage/scene01.mov.facr.json --start 100 --end 400
```

---

### `dits facr-demo`

Demonstrate FACR frame-level dedup: commit a synthetic clip, re-grade some frames, and show
that only the changed frames are stored.

```
dits facr-demo [OPTIONS]
```

**Options:**
```
--frames <FRAMES>     Number of frames in the synthetic clip [default: 300]
--regrade <REGRADE>   Number of frames to re-grade in the second version [default: 5]
```

**Example:**
```bash
dits facr-demo --frames 300 --regrade 5
```

---

### `dits photo-add`

Store a photo once and start a non-destructive edit history.

```
dits photo-add [OPTIONS] <INPUT>
```

**Arguments:**
- `INPUT` - Path to the source image (jpg/png/tiff/etc.)

**Options:**
```
--store <STORE>        Object store directory (default: .dits-facr)
--manifest <MANIFEST>  Where to write the photo manifest (default: <input>.photo.json)
```

**Example:**
```bash
dits photo-add shoot/IMG_0001.cr2
```

---

### `dits photo-edit`

Append non-destructive edits to a photo manifest. **Stores zero new image bytes** — only the
edit log changes.

```
dits photo-edit [OPTIONS] <MANIFEST>
```

**Arguments:**
- `MANIFEST` - Path to the photo manifest (`.photo.json`)

**Options:**
```
--exposure <EXPOSURE>            Exposure adjustment in stops (e.g. 0.5)
--contrast <CONTRAST>            Contrast multiplier (1.0 = unchanged)
--saturation <SATURATION>        Saturation multiplier (1.0 = unchanged)
--white-balance <WHITE_BALANCE>  White balance in Kelvin
--rotate <ROTATE>                Clockwise rotation in degrees (90/180/270)
--crop <CROP>                    Crop rectangle as x,y,w,h
--out <OUT>                      Output manifest (default: overwrite input)
```

**Example:**
```bash
dits photo-edit shoot/IMG_0001.cr2.photo.json --exposure 0.5 --white-balance 5600
```

---

### `dits photo-render`

Render a photo manifest into an image by applying its edit log.

```
dits photo-render [OPTIONS] <MANIFEST> <OUTPUT>
```

**Arguments:**
- `MANIFEST` - Path to the photo manifest (`.photo.json`)
- `OUTPUT` - Output image path

**Options:**
```
--store <STORE>   Object store directory (default: .dits-facr)
```

**Example:**
```bash
dits photo-render shoot/IMG_0001.cr2.photo.json export/IMG_0001.jpg
```

---

## Introspection (Phase 4)

### `dits inspect-file`

Inspect a tracked file's deduplication statistics.

```
dits inspect-file [OPTIONS] <PATH>
```

**Arguments:**
- `PATH` - Path to tracked file (relative to repo root)

**Options:**
```
--chunks            Show all chunk hashes
```

**Examples:**
```bash
# Inspect a file
dits inspect-file footage/scene01.mov

# Show all chunk hashes
dits inspect-file --chunks footage/scene01.mov
```

**Output:**
```
Inspecting: footage/scene01.mov

File Information:
  Path:         footage/scene01.mov
  Commit:       abc1234def5
  Manifest:     9e21c38bbf5
  Content hash: 8d92f0e4a1b
  Type:         MP4 (structure-aware)

Size:
  Logical size:          10.00 GiB (10737418240 bytes)
  Estimated unique size: 208.00 MiB (218103808 bytes)

Chunk Breakdown:
  Total chunks:  10240
  Shared chunks: 10032 (98.0%)
  Unique chunks: 208 (2.0%)

Deduplication Analysis:
  This file shares 10032 chunks with other files in the repo.
  Estimated storage savings: 9.79 GiB (98.0% of file)
```

---

### `dits repo-stats`

Show repository deduplication statistics.

```
dits repo-stats [OPTIONS]
```

**Options:**
```
-v, --verbose       Show per-file breakdown
```

**Examples:**
```bash
# Basic stats
dits repo-stats

# Verbose with per-file breakdown
dits repo-stats -v
```

**Output:**
```
Repository Statistics (commit abc1234)

  Branch: main
  Commit: abc1234def5
  Message: Add footage for episode 2

Files:
  Tracked files: 12

Storage:
  Logical size:  128.00 GiB (sum of all file sizes)
  Physical size: 87.30 GiB (actual storage used)

Deduplication:
  Unique chunks: 93542
  Space saved:   40.70 GiB (31.8%)
  Dedup ratio:   0.682 (physical / logical, lower is better)

Analysis:
  ✓ Good deduplication. Significant chunk reuse detected.
```

**Verbose Output (-v):**
```
Per-File Breakdown:
  Path                                       Size        Chunks     Type
  --------------------------------------------------------------------------
  footage/scene01.mov                        10.0 GiB    10240      MP4
  footage/scene02.mov                        12.3 GiB    12595      MP4
  footage/scene01_v2.mov                     10.2 GiB    10445      MP4
  project.prproj                             2.1 MiB     3          file
  ...
```

---

## Utilities

### `dits gc`

Run garbage collection.

```
dits gc [OPTIONS]
```

**Options:**
```
    --dry-run      Dry run (show what would be done)
-p, --prune        Prune expired locks
    --aggressive   Aggressive mode (repack objects)
```

> Note: `gc` does not yet repack objects in normal mode.

**Examples:**
```bash
# Run GC
dits gc

# Dry run
dits gc --dry-run

# Prune expired locks
dits gc --prune
```

**Output:**
```
Running garbage collection...
  Scanning objects: 12,345
  Orphaned chunks: 234 (1.2 GB)
  Expired stashes: 3

Reclaimed: 1.2 GB
Duration: 45s
```

---

### `dits fsck`

Check repository integrity.

```
dits fsck [OPTIONS]
```

**Options:**
```
-v, --verbose   Show verbose output
```

**Examples:**
```bash
# Integrity check
dits fsck

# Verbose check
dits fsck -v
```

**Output:**
```
Checking repository integrity...
  Objects: 12,345 verified
  Commits: 567 verified
  Manifests: 89 verified

Repository is healthy.
```

---

### `dits help`

Show help information.

```
dits help [COMMAND]
```

**Examples:**
```bash
# General help
dits help

# Command-specific help
dits help add

# Short form
dits add --help
```

---

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `DITS_DIR` | Override .dits directory location |
| `DITS_WORK_TREE` | Override working tree location |
| `DITS_CACHE_DIR` | Override cache directory |
| `DITS_CONFIG_GLOBAL` | Override global config path |
| `DITS_EDITOR` | Editor for commit messages |
| `DITS_PAGER` | Pager for output |
| `DITS_DEBUG` | Enable debug output |
| `DITS_TRACE` | Enable trace logging |

> `DITS_TOKEN` / `DITS_SERVER` (remote auth/server) are roadmap and have no effect today.

---

## Exit Codes

| Code | Meaning |
| :--- | :--- |
| 0 | Success |
| 1 | General error |
| 2 | Command line usage error |
| 3 | Authentication error |
| 4 | Network error |
| 5 | Repository error |
| 6 | Lock conflict |
| 7 | Merge conflict |
| 128+ | Fatal error (signal number + 128) |

---

## Examples: Common Workflows

> 🚧 Networked steps (`push`, `pull`, network `clone`) shown below are **roadmap** and do
> not transfer data yet. Today, Dits is fully usable as a **local** repository.

### Initial Setup (local)
```bash
# Configure user
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"

# Start a new local repository
dits init my-project
cd my-project

# (Optional) clone an existing repository from a local path
# dits clone /path/to/source-repo my-project
```

### Daily Workflow (local)
```bash
# Check status
dits status

# Lock file before editing (advisory locking)
dits lock footage/scene01.mov

# Work on file...

# Stage and commit
dits add footage/scene01.mov
dits commit -m "Color grade scene 1"

# Unlock file
dits unlock footage/scene01.mov

# 🚧 Roadmap: `dits pull` / `dits push` to sync with a remote (not implemented)
```

### Reviewing History
```bash
# View recent commits
dits log --oneline -10

# See what changed in a commit
dits show abc1234

# See file history
dits log -- footage/scene01.mov

# Compare versions
dits diff v1.0 HEAD -- footage/
```

### Working with Tags
```bash
# Create release tag
dits tag -a v1.0 -m "Final delivery"

# Checkout tag
dits checkout v1.0

# List tags
dits tag -l

# 🚧 Roadmap: `dits push origin v1.0` to publish a tag (not implemented)
```

### Frame-Level Video Editing (FACR, requires FFmpeg)
```bash
# Ingest a clip into the frame store
dits facr-add footage/scene01.mov

# Non-destructively trim it (stores zero new frames)
dits facr-trim footage/scene01.mov.facr.json --start 100 --end 400

# Reconstruct a playable file
dits facr-checkout footage/scene01.mov.facr.trimmed.json scene01_trimmed.mov
```

### Non-Destructive Photo Editing (requires FFmpeg)
```bash
# Store the photo once
dits photo-add shoot/IMG_0001.cr2

# Append edits (stores zero new image bytes)
dits photo-edit shoot/IMG_0001.cr2.photo.json --exposure 0.5 --white-balance 5600

# Render the result
dits photo-render shoot/IMG_0001.cr2.photo.json export/IMG_0001.jpg
```
