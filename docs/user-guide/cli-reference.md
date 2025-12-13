# CLI Reference

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Complete Command Line Interface Reference
**Version:** 1.0

---

## Implementation Status

> **All core commands are now implemented!** Network operations (HTTP/SSH remotes) are in development.

### Implemented Commands (Ready to Use)

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
| `mount` | ✅ | Mount repository as VFS (Phase 4) |
| `unmount` | ✅ | Unmount VFS (Phase 4) |
| `inspect` | ✅ | Inspect MP4 structure (Phase 2) |
| `inspect-file` | ✅ | Inspect file dedup stats (Phase 4) |
| `repo-stats` | ✅ | Show repo dedup statistics (Phase 4) |
| `segment` | ✅ | Segment video into chunks (Phase 3) |
| `assemble` | ✅ | Reassemble segmented video (Phase 3) |
| `roundtrip` | ✅ | Test MP4 deconstruct/reconstruct (Phase 2) |
| `cache-stats` | ✅ | Show cache statistics (Phase 4) |
| `fsck` | ✅ | Repository integrity check (Phase 5) |
| `meta-scan` | ✅ | Scan files and extract metadata (Phase 5) |
| `meta-show` | ✅ | Show metadata for a file (Phase 5) |
| `meta-list` | ✅ | List all stored metadata (Phase 5) |
| `video-init` | ✅ | Initialize video timeline project (Phase 5) |
| `video-add-clip` | ✅ | Add a clip to video timeline (Phase 5) |
| `video-show` | ✅ | Show a video timeline (Phase 5) |
| `video-list` | ✅ | List all video projects (Phase 5) |
| `proxy-generate` | ✅ | Generate proxies for video files (Phase 6) |
| `proxy-status` | ✅ | Show proxy generation status (Phase 6) |
| `p2p share` | ✅ | Share repository via P2P (Wormhole integration) |
| `p2p connect` | ✅ | Connect to P2P shared repository |
| `p2p status` | ✅ | Show P2P connection status |
| `p2p list` | ✅ | List active P2P shares |
| `p2p cache` | ✅ | Manage P2P cache (stats, clear, gc) |
| `p2p ping` | ✅ | Test connectivity to P2P peers |
| `p2p unmount` | ✅ | Disconnect from P2P shares |
| `proxy-list` | ✅ | List all generated proxies (Phase 6) |
| `proxy-delete` | ✅ | Delete generated proxies (Phase 6) |
| `dep-check` | ✅ | Check dependencies for project files (Phase 7) |
| `dep-graph` | ✅ | Show dependency graph (Phase 7) |
| `dep-list` | ✅ | List all project files (Phase 7) |
| `freeze-init` | ✅ | Initialize lifecycle tracking (Phase 8) |
| `freeze-status` | ✅ | Show storage tier status (Phase 8) |
| `freeze` | ✅ | Freeze chunks to colder storage (Phase 8) |
| `thaw` | ✅ | Thaw chunks from cold storage (Phase 8) |
| `freeze-policy` | ✅ | Set or view lifecycle policy (Phase 8) |
| `encrypt-init` | ✅ | Initialize encryption (Phase 9) |
| `encrypt-status` | ✅ | Show encryption status (Phase 9) |
| `login` | ✅ | Login to unlock encryption keys (Phase 9) |
| `logout` | ✅ | Logout and clear cached keys (Phase 9) |
| `change-password` | ✅ | Change encryption password (Phase 9) |
| `audit` | ✅ | Show audit log (Phase 9) |
| `audit-stats` | ✅ | Show audit statistics (Phase 9) |
| `audit-export` | ✅ | Export audit log to JSON (Phase 9) |
| `clone` | ✅ | Clone a repository (local) |
| `remote` | ✅ | Manage remote repositories |
| `push` | ✅ | Push changes to remote (local) |
| `pull` | ✅ | Pull changes from remote (local) |
| `fetch` | ✅ | Fetch from remote (local) |
| `lock` | ✅ | Lock files for exclusive editing |
| `unlock` | ✅ | Unlock files |
| `locks` | ✅ | List active locks |
| `gc` | ✅ | Garbage collection |

### Planned Features (In Development)

| Feature | Status | Description |
|---------|--------|-------------|
| `sync` | 🚧 | Bi-directional sync with remote |
| Network remotes | 🚧 | HTTP/SSH/QUIC remote support |
| `auth` | 🚧 | Authentication management for remote servers |

---

## Overview

Dits provides a git-like command line interface optimized for large binary files. Commands are organized into categories:

- **Repository Management** - init, clone, remote
- **Working with Files** - add, restore, status, diff
- **Recording Changes** - commit, tag
- **Sharing & Collaboration** - push, pull, fetch, sync
- **Branching & History** - branch, checkout, log, show
- **Virtual Filesystem** - mount, unmount
- **Collaboration** - lock, unlock
- **Configuration** - config, auth
- **Utilities** - gc, fsck, help

---

## Global Options

These options can be used with any command:

```
-v, --verbose       Increase output verbosity (use -vv for debug)
-q, --quiet         Suppress non-essential output
--no-color          Disable colored output
--json              Output in JSON format (for scripting)
-C <path>           Run as if dits was started in <path>
--config <key=val>  Override config value for this command
-h, --help          Show help for command
--version           Show dits version
```

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

Clone a repository from a remote server.

```
dits clone [OPTIONS] <URL> [DIRECTORY]
```

**Arguments:**
- `URL` - Repository URL (https:// or dits://)
- `DIRECTORY` - Local directory name (default: derived from URL)

**Options:**
```
--shallow           Clone only latest commit (no history)
--depth <n>         Clone only last n commits
--branch <name>     Clone specific branch
--single-branch     Clone only one branch
--no-checkout       Clone without checking out working tree
--progress          Show progress during clone
--filter <spec>     Partial clone filter (e.g., blob:none for metadata only)
```

**Examples:**
```bash
# Basic clone
dits clone https://dits.example.com/team/project

# Clone to specific directory
dits clone https://dits.example.com/team/project my-local-name

# Shallow clone (metadata only, hydrate on demand)
dits clone --filter blob:none https://dits.example.com/team/project

# Clone specific branch
dits clone --branch feature/vfx https://dits.example.com/team/project
```

**Output:**
```
Cloning into 'project'...
remote: Counting objects: 1,234
remote: Total 1,234 (delta 0)
Receiving objects: 100% (1,234/1,234), 45.2 MB | 12.3 MB/s
Resolving deltas: 100% (567/567)
Hydrating files: 100% (89/89), done.
```

---

### `dits remote`

Manage remote repositories.

```
dits remote [SUBCOMMAND]
```

**Subcommands:**

#### `dits remote add`
```
dits remote add <name> <url>
```

#### `dits remote remove`
```
dits remote remove <name>
```

#### `dits remote rename`
```
dits remote rename <old> <new>
```

#### `dits remote list` (default)
```
dits remote [-v]
```

#### `dits remote get-url`
```
dits remote get-url <name>
```

#### `dits remote set-url`
```
dits remote set-url <name> <url>
```

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

Show working tree status.

```
dits status [OPTIONS] [PATH...]
```

**Options:**
```
-s, --short         Give output in short format
-b, --branch        Show branch info in short format
--porcelain         Machine-readable output
--ignored           Show ignored files
--untracked <mode>  Show untracked files (no, normal, all)
```

**Examples:**
```bash
# Full status
dits status

# Short format
dits status -s

# Status of specific path
dits status footage/
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

Add file contents to the staging area.

```
dits add [OPTIONS] <PATHSPEC>...
```

**Arguments:**
- `PATHSPEC` - Files or directories to add (supports glob patterns)

**Options:**
```
-n, --dry-run       Don't actually add, just show what would happen
-v, --verbose       Show files as they are added
-f, --force         Add ignored files
-A, --all           Add all changes (new, modified, deleted)
-u, --update        Update tracked files only
-p, --patch         Interactively select hunks (not available for binary)
--progress          Show progress for large files
```

**Examples:**
```bash
# Add specific file
dits add footage/scene01.mov

# Add all files in directory
dits add footage/

# Add all changes
dits add -A

# Add with progress (useful for large files)
dits add --progress raw/*.mov

# Dry run
dits add -n *.mp4
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

Restore working tree files.

```
dits restore [OPTIONS] <PATHSPEC>...
```

**Options:**
```
-s, --staged        Restore staged content (unstage)
-W, --worktree      Restore worktree (default)
-S, --source <ref>  Restore from specific commit/tag
--ours              Use our version in conflict
--theirs            Use their version in conflict
--progress          Show progress for large files
```

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

Show changes between commits, commit and working tree, etc.

```
dits diff [OPTIONS] [<COMMIT>] [--] [<PATH>...]
dits diff [OPTIONS] <COMMIT> <COMMIT> [--] [<PATH>...]
```

**Options:**
```
--staged            Show staged changes
--stat              Show diffstat only
--name-only         Show only names of changed files
--name-status       Show names and status of changed files
--summary           Show condensed summary
--no-renames        Disable rename detection
--json              Output diff metadata in JSON
```

**Examples:**
```bash
# Show unstaged changes
dits diff

# Show staged changes
dits diff --staged

# Compare two commits
dits diff abc123 def456

# Show what changed in last commit
dits diff HEAD~1

# Just file names
dits diff --name-only HEAD~5..HEAD
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

Record changes to the repository.

```
dits commit [OPTIONS]
```

**Options:**
```
-m, --message <msg>     Commit message
-a, --all               Automatically stage modified/deleted files
--amend                 Amend previous commit
--no-verify             Skip pre-commit hooks
--allow-empty           Allow empty commits
--author <author>       Override author
--date <date>           Override date
-v, --verbose           Show diff in commit message editor
```

**Examples:**
```bash
# Commit with message
dits commit -m "Add VFX shots for scene 3"

# Commit all changed files
dits commit -a -m "Update color grade"

# Amend last commit
dits commit --amend -m "Add VFX shots for scene 3 (fixed)"

# Multi-line message
dits commit -m "Summary line" -m "Detailed description paragraph."
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

Create, list, delete, or verify tags.

```
dits tag [OPTIONS] [<TAGNAME>] [<COMMIT>]
```

**Options:**
```
-l, --list          List tags (default if no args)
-d, --delete        Delete tag
-f, --force         Replace existing tag
-m, --message <msg> Annotated tag with message
-a, --annotate      Create annotated tag
--sort <key>        Sort by key (version, creatordate)
```

**Examples:**
```bash
# List tags
dits tag

# Create lightweight tag
dits tag v1.0

# Create annotated tag
dits tag -a v1.0 -m "First release candidate"

# Tag specific commit
dits tag v1.0-beta abc1234

# Delete tag
dits tag -d v1.0-beta

# List tags matching pattern
dits tag -l "v1.*"
```

**Output:**
```
v0.9
v1.0
v1.0-rc1
```

---

## Sharing & Collaboration

### `dits push`

Upload local commits to remote repository.

```
dits push [OPTIONS] [<REMOTE>] [<REFSPEC>...]
```

**Options:**
```
-u, --set-upstream  Set upstream for branch
-f, --force         Force push (dangerous!)
--force-with-lease  Safer force push
--all               Push all branches
--tags              Push tags
--dry-run           Show what would be pushed
--progress          Show detailed progress
--no-verify         Skip pre-push hooks
```

**Examples:**
```bash
# Push current branch
dits push

# Push and set upstream
dits push -u origin main

# Push specific branch
dits push origin feature/vfx

# Push all tags
dits push --tags

# Dry run
dits push --dry-run
```

**Output:**
```
Pushing to origin (https://dits.example.com/team/project)...
Computing delta: 1,234 chunks to transfer
Uploading chunks: 100% (1,234/1,234), 45.2 MB | 12.3 MB/s
Updating refs: main -> abc1234
To https://dits.example.com/team/project
   def456..abc1234  main -> main
```

---

### `dits pull`

Fetch and integrate changes from remote.

```
dits pull [OPTIONS] [<REMOTE>] [<REFSPEC>]
```

**Options:**
```
--rebase            Rebase instead of merge
--ff-only           Fast-forward only
--no-commit         Don't auto-commit merge
--progress          Show detailed progress
--prune             Remove stale remote refs
```

**Examples:**
```bash
# Pull from default remote
dits pull

# Pull specific branch
dits pull origin main

# Pull with rebase
dits pull --rebase
```

**Output:**
```
Fetching from origin...
remote: Counting objects: 45
remote: Compressing objects: 100% (30/30)
remote: Total 45 (delta 15)
Downloading chunks: 100% (45/45), 12.3 MB | 8.5 MB/s
Updating abc1234..def5678
Fast-forward
 footage/scene02.mov | Bin 0 -> 1234567890 bytes
 1 file changed
```

---

### `dits fetch`

Download objects and refs from remote.

```
dits fetch [OPTIONS] [<REMOTE>] [<REFSPEC>...]
```

**Options:**
```
--all               Fetch all remotes
--prune             Remove stale remote refs
--tags              Fetch tags
--depth <n>         Limit fetch depth
--progress          Show progress
--dry-run           Show what would be fetched
```

**Examples:**
```bash
# Fetch from origin
dits fetch

# Fetch all remotes
dits fetch --all

# Fetch with prune
dits fetch --prune
```

---

### `dits sync`

Sync repository (combines fetch + push).

```
dits sync [OPTIONS]
```

**Options:**
```
--pull-only         Only pull, don't push
--push-only         Only push, don't pull
--progress          Show detailed progress
--bidirectional     Full bidirectional sync
```

**Examples:**
```bash
# Full sync
dits sync

# Sync with progress
dits sync --progress
```

---

## P2P Sharing (Wormhole Integration)

Dits integrates Wormhole-style peer-to-peer sharing for direct repository sharing without cloud uploads.

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
dits branch [OPTIONS] [<BRANCHNAME>] [<START-POINT>]
```

**Options:**
```
-l, --list          List branches (default)
-a, --all           List all branches (including remote)
-r, --remotes       List remote branches only
-d, --delete        Delete branch
-D                  Force delete branch
-m, --move          Rename branch
-c, --copy          Copy branch
-v, --verbose       Show commit info
--merged            List merged branches
--no-merged         List unmerged branches
```

**Examples:**
```bash
# List branches
dits branch

# Create branch
dits branch feature/vfx

# Create branch from specific commit
dits branch feature/vfx abc1234

# Delete branch
dits branch -d feature/vfx

# Rename branch
dits branch -m old-name new-name

# List all branches with details
dits branch -av
```

**Output:**
```
* main
  feature/color-grade
  feature/vfx
  remotes/origin/main
  remotes/origin/feature/vfx
```

---

### `dits checkout`

Switch branches or restore working tree files.

```
dits checkout [OPTIONS] <BRANCH>
dits checkout [OPTIONS] <COMMIT>
dits checkout [OPTIONS] [<COMMIT>] -- <PATHSPEC>...
```

**Options:**
```
-b <branch>         Create and checkout new branch
-B <branch>         Create/reset and checkout branch
--orphan <branch>   Create orphan branch
--detach            Detach HEAD
-f, --force         Force checkout (discard changes)
--progress          Show progress for file hydration
--proxy             Checkout proxy versions (Phase 6)
--resolution <res>  Specify proxy resolution (720p, 1080p)
```

**Examples:**
```bash
# Switch to branch
dits checkout feature/vfx

# Create and switch to new branch
dits checkout -b feature/color-grade

# Checkout specific commit (detached HEAD)
dits checkout abc1234

# Checkout file from specific commit
dits checkout HEAD~3 -- footage/scene01.mov

# Checkout with proxy files
dits checkout --proxy --resolution 1080p
```

**Output:**
```
Switched to branch 'feature/vfx'
Hydrating files: 100% (45/45)
Your branch is up to date with 'origin/feature/vfx'.
```

---

### `dits log`

Show commit history.

```
dits log [OPTIONS] [<REVISION>] [-- <PATH>...]
```

**Options:**
```
--oneline           Show one line per commit
--graph             Show branch graph
--all               Show all branches
--stat              Show diffstat
--name-only         Show changed file names
--name-status       Show changed files with status
-n, --max-count <n> Limit number of commits
--since <date>      Show commits since date
--until <date>      Show commits until date
--author <pattern>  Filter by author
--grep <pattern>    Filter by commit message
--follow            Follow file renames
--format <format>   Custom format string
```

**Examples:**
```bash
# Basic log
dits log

# Oneline with graph
dits log --oneline --graph

# Last 5 commits
dits log -n 5

# File history
dits log -- footage/scene01.mov

# Commits by author
dits log --author="John"

# Commits since date
dits log --since="2024-01-01"

# Custom format
dits log --format="%h %s (%an, %ar)"
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

Show various types of objects.

```
dits show [OPTIONS] <OBJECT>
```

**Options:**
```
--stat              Show diffstat
--name-only         Show file names only
--name-status       Show file names with status
--format <format>   Custom format for commit
--raw               Show raw object
```

**Examples:**
```bash
# Show commit
dits show abc1234

# Show file at commit
dits show abc1234:footage/scene01.mov

# Show tag
dits show v1.0

# Just stats
dits show --stat abc1234
```

---

## Virtual Filesystem

### `dits mount`

Mount repository as virtual filesystem.

```
dits mount [OPTIONS] [MOUNTPOINT]
```

**Options:**
```
--read-only         Mount as read-only
--allow-other       Allow other users to access
--commit <ref>      Mount specific commit
--background        Run in background
--cache-size <size> Set cache size (e.g., 10GB)
--prefetch          Enable aggressive prefetching
```

**Examples:**
```bash
# Mount to default location (/Volumes/dits-<repo> on macOS)
dits mount

# Mount to specific location
dits mount /mnt/project

# Mount read-only
dits mount --read-only /mnt/project

# Mount specific commit
dits mount --commit v1.0 /mnt/project-v1

# Mount with large cache
dits mount --cache-size 50GB /mnt/project
```

**Output:**
```
Mounting repository at /Volumes/dits-project...
Virtual filesystem ready.
  Cache: 10 GB (2.3 GB used)
  Files: 1,234 available
  Mode: read-write

Press Ctrl+C to unmount (or use 'dits unmount')
```

---

### `dits unmount`

Unmount virtual filesystem.

```
dits unmount [OPTIONS] [MOUNTPOINT]
```

**Options:**
```
-f, --force         Force unmount
--all               Unmount all Dits mounts
```

**Examples:**
```bash
# Unmount default
dits unmount

# Unmount specific
dits unmount /mnt/project

# Force unmount
dits unmount -f /mnt/project
```

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

Get and set configuration options.

```
dits config [OPTIONS] <KEY> [VALUE]
```

**Options:**
```
--global            Use global config
--local             Use local config (default)
--system            Use system config
--list              List all config
--unset             Remove config key
--edit              Open config in editor
```

**Common Keys:**
```
user.name           Your name
user.email          Your email
remote.origin.url   Remote URL
core.editor         Editor for commit messages
core.pager          Pager for output
push.default        Push behavior
pull.rebase         Pull with rebase
gc.gracePeriod      GC grace period
cache.size          Local cache size
mount.defaultPath   Default mount point
```

**Examples:**
```bash
# Set user name
dits config --global user.name "John Editor"

# Get config value
dits config user.email

# List all config
dits config --list

# Set cache size
dits config cache.size 50GB

# Edit config file
dits config --global --edit
```

---

### `dits auth`

Manage authentication.

```
dits auth [SUBCOMMAND]
```

**Subcommands:**

#### `dits auth login`
```
dits auth login [OPTIONS]
```
Options:
```
--server <url>      Server to authenticate with
--token <token>     Use access token
--sso               Use SSO authentication
```

#### `dits auth logout`
```
dits auth logout [--all]
```

#### `dits auth status`
```
dits auth status
```

#### `dits auth token`
```
dits auth token [--create | --revoke <id>]
```

**Examples:**
```bash
# Interactive login
dits auth login

# Login with token
dits auth login --token dits_xxxxx

# Check auth status
dits auth status

# Create API token
dits auth token --create

# Logout
dits auth logout
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
--aggressive        Run aggressive GC
--dry-run           Show what would be collected
--prune <date>      Prune objects older than date
--auto              Run only if needed
```

**Examples:**
```bash
# Run GC
dits gc

# Dry run
dits gc --dry-run

# Aggressive GC
dits gc --aggressive
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

Verify repository integrity.

```
dits fsck [OPTIONS]
```

**Options:**
```
--full              Full verification (slower)
--strict            Strict checking
--repair            Attempt to repair issues
--progress          Show progress
```

**Examples:**
```bash
# Quick check
dits fsck

# Full verification
dits fsck --full

# Verify and repair
dits fsck --repair
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
| `DITS_TOKEN` | Authentication token |
| `DITS_SERVER` | Default server URL |
| `DITS_DEBUG` | Enable debug output |
| `DITS_TRACE` | Enable trace logging |

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

### Initial Setup
```bash
# Configure user
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"

# Login
dits auth login

# Clone repository
dits clone https://dits.example.com/team/project
cd project
```

### Daily Workflow
```bash
# Start day: sync
dits pull

# Check status
dits status

# Lock file before editing
dits lock footage/scene01.mov

# Work on file...

# Stage and commit
dits add footage/scene01.mov
dits commit -m "Color grade scene 1"

# Push changes
dits push

# Unlock file
dits unlock footage/scene01.mov
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

# Push tag
dits push origin v1.0

# Checkout tag
dits checkout v1.0

# List tags
dits tag -l
```

### Using Virtual Filesystem
```bash
# Mount repository
dits mount /mnt/project

# Files appear instantly (hydrate on access)
ls /mnt/project/footage/

# Edit in NLE
# (files stream on demand)

# When done
dits unmount /mnt/project
```
