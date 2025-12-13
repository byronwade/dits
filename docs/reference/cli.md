# Dits CLI Reference

Complete command-line reference for the Dits version control system.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Repository Commands](#repository-commands)
3. [Working with Files](#working-with-files)
4. [Branching and Merging](#branching-and-merging)
5. [Remote Operations](#remote-operations)
6. [History and Inspection](#history-and-inspection)
7. [File Locking](#file-locking)
8. [P2P Sharing](#p2p-sharing)
9. [Virtual Filesystem (VFS)](#virtual-filesystem-vfs)
10. [Configuration](#configuration)
11. [Maintenance](#maintenance)
12. [Advanced Commands](#advanced-commands)

---

## Getting Started

### Installation Verification

```bash
# Check if Dits is installed
dits --version

# Get help
dits --help
dits help <command>
dits <command> --help
```

### Quick Start

```bash
# Initialize a new repository
dits init

# Add files
dits add .

# Commit changes
dits commit -m "Initial commit"

# Add remote and push
dits remote add origin https://ditshub.com/user/project
dits push -u origin main
```

---

## Repository Commands

### dits init

Initialize a new Dits repository.

```bash
dits init [options] [path]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--bare` | Create a bare repository (no working directory) |
| `--template <dir>` | Use template directory |
| `--initial-branch <name>` | Set name of initial branch (default: `main`) |

**Examples:**
```bash
# Initialize in current directory
dits init

# Initialize in specific path
dits init /path/to/project

# Initialize with custom branch name
dits init --initial-branch develop

# Create bare repository (for servers)
dits init --bare /path/to/repo.dits
```

---

### dits clone

Clone a repository from a remote source.

```bash
dits clone [options] <url> [directory]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-b, --branch <name>` | Clone specific branch |
| `--depth <n>` | Create shallow clone with n commits |
| `--filter <spec>` | Partial clone filter |
| `--mirror` | Create mirror clone |
| `--bare` | Create bare clone |
| `--sparse` | Initialize sparse checkout |
| `-j, --jobs <n>` | Number of parallel downloads |

**Examples:**
```bash
# Basic clone
dits clone https://ditshub.com/org/project

# Clone to specific directory
dits clone https://ditshub.com/org/project ./my-project

# Clone specific branch
dits clone -b develop https://ditshub.com/org/project

# Shallow clone (faster, less history)
dits clone --depth 1 https://ditshub.com/org/project

# Sparse clone (download files on demand)
dits clone --filter=sparse https://ditshub.com/org/large-project

# Parallel downloads for faster clone
dits clone -j 8 https://ditshub.com/org/project
```

---

## Working with Files

### dits add

Add file contents to the staging area.

```bash
dits add [options] [pathspec...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-A, --all` | Add all changes (tracked and untracked) |
| `-u, --update` | Add changes to tracked files only |
| `-f, --force` | Add ignored files |
| `-n, --dry-run` | Show what would be added |
| `-v, --verbose` | Show files as they're added |
| `--intent-to-add` | Record only the fact that file will be added |

**Examples:**
```bash
# Add specific file
dits add video.mp4

# Add multiple files
dits add video.mp4 audio.wav project.prproj

# Add all files in directory
dits add Assets/

# Add all changes
dits add -A

# Add only tracked files
dits add -u

# Add file matching pattern
dits add "*.psd"

# Dry run (see what would be added)
dits add -n .

# Force add ignored file
dits add -f Renders/important_output.exr
```

---

### dits rm

Remove files from the working tree and staging area.

```bash
dits rm [options] <file>...
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --force` | Force removal |
| `-r, --recursive` | Remove directories recursively |
| `--cached` | Remove from staging only (keep working file) |
| `-n, --dry-run` | Show what would be removed |

**Examples:**
```bash
# Remove file (deletes from working directory)
dits rm old_video.mp4

# Remove directory
dits rm -r OldAssets/

# Stop tracking file (keep the file locally)
dits rm --cached secret_config.json

# Dry run
dits rm -n "*.bak"
```

---

### dits mv

Move or rename a file.

```bash
dits mv [options] <source> <destination>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --force` | Force move/rename |
| `-n, --dry-run` | Show what would be moved |

**Examples:**
```bash
# Rename file
dits mv old_name.mp4 new_name.mp4

# Move file to directory
dits mv video.mp4 Assets/Video/

# Move and rename
dits mv project_v1.blend Assets/project_final.blend

# Move directory
dits mv OldFolder/ NewFolder/
```

---

### dits status

Show the working tree status.

```bash
dits status [options] [pathspec...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-s, --short` | Short format output |
| `-b, --branch` | Show branch info in short format |
| `--long` | Long format (default) |
| `--porcelain` | Machine-readable output |
| `-u, --untracked-files[=<mode>]` | Show untracked files (no/normal/all) |
| `--ignored` | Show ignored files |

**Examples:**
```bash
# Full status
dits status

# Short status
dits status -s

# Status with branch info
dits status -sb

# Show only status of specific path
dits status Assets/

# Include ignored files
dits status --ignored

# Machine-readable format
dits status --porcelain
```

**Status codes (short format):**
```
 M = modified (not staged)
M  = modified (staged)
A  = added
D  = deleted
R  = renamed
C  = copied
U  = unmerged
?? = untracked
!! = ignored
```

---

### dits diff

Show changes between commits, working tree, etc.

```bash
dits diff [options] [<commit>] [--] [<path>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--staged` / `--cached` | Show staged changes |
| `--stat` | Show diffstat |
| `--summary` | Show summary of changes |
| `--name-only` | Show only file names |
| `--name-status` | Show names and status |
| `-w, --ignore-all-space` | Ignore whitespace |

**Examples:**
```bash
# Show unstaged changes
dits diff

# Show staged changes
dits diff --staged

# Compare with specific commit
dits diff abc123

# Compare two commits
dits diff abc123..def456

# Diff specific file
dits diff -- video.mp4

# Show only changed file names
dits diff --name-only

# Show statistics
dits diff --stat
```

---

### dits commit

Record changes to the repository.

```bash
dits commit [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-m, --message <msg>` | Commit message |
| `-a, --all` | Automatically stage modified files |
| `--amend` | Amend previous commit |
| `--author <author>` | Override author |
| `--date <date>` | Override date |
| `-n, --no-verify` | Skip pre-commit hooks |
| `--allow-empty` | Allow empty commit |
| `-e, --edit` | Edit message in editor |

**Examples:**
```bash
# Basic commit
dits commit -m "Add hero character model"

# Commit with multi-line message
dits commit -m "Add hero character model

- Base mesh complete
- UV mapping done
- Ready for texturing"

# Stage and commit tracked files
dits commit -am "Quick fix to materials"

# Amend previous commit
dits commit --amend -m "Updated message"

# Amend without changing message
dits commit --amend --no-edit
```

---

### dits restore

Restore working tree files.

```bash
dits restore [options] [<pathspec>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-s, --source <tree>` | Restore from source |
| `--staged` | Restore staged content |
| `-W, --worktree` | Restore working tree (default) |
| `--ours` | Use "ours" version in conflicts |
| `--theirs` | Use "theirs" version in conflicts |
| `--merge` | Recreate conflicted merge |

**Examples:**
```bash
# Restore file from HEAD (discard changes)
dits restore video.mp4

# Restore from specific commit
dits restore --source abc123 video.mp4

# Unstage file (keep working changes)
dits restore --staged video.mp4

# Restore both staged and working
dits restore --staged --worktree video.mp4

# Resolve conflict with our version
dits restore --ours conflicted_file.psd

# Resolve conflict with their version
dits restore --theirs conflicted_file.psd
```

---

### dits stash

Stash changes in a dirty working directory.

```bash
dits stash [push | pop | list | show | drop | apply | clear]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-m, --message <msg>` | Stash message |
| `-u, --include-untracked` | Include untracked files |
| `-a, --all` | Include ignored files |
| `-k, --keep-index` | Keep staged changes |

**Examples:**
```bash
# Stash current changes
dits stash

# Stash with message
dits stash push -m "WIP: Character rigging"

# Include untracked files
dits stash -u

# List stashes
dits stash list

# Show stash contents
dits stash show
dits stash show -p  # With patch

# Apply most recent stash
dits stash pop

# Apply specific stash
dits stash apply stash@{2}

# Drop stash
dits stash drop stash@{0}

# Clear all stashes
dits stash clear
```

---

## Branching and Merging

### dits branch

List, create, or delete branches.

```bash
dits branch [options] [branch-name] [start-point]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-a, --all` | List all branches (local and remote) |
| `-r, --remotes` | List remote branches |
| `-d, --delete` | Delete branch |
| `-D` | Force delete branch |
| `-m, --move` | Rename branch |
| `-c, --copy` | Copy branch |
| `-v, --verbose` | Show commit info |
| `--list` | List branches matching pattern |

**Examples:**
```bash
# List local branches
dits branch

# List all branches
dits branch -a

# List remote branches
dits branch -r

# Create new branch
dits branch feature/new-character

# Create branch from specific commit
dits branch hotfix/fix-materials abc123

# Delete branch
dits branch -d feature/completed

# Force delete (unmerged branch)
dits branch -D feature/abandoned

# Rename current branch
dits branch -m new-name

# Rename specific branch
dits branch -m old-name new-name

# List branches with verbose info
dits branch -v

# List branches matching pattern
dits branch --list "feature/*"
```

---

### dits checkout

Switch branches or restore working tree files.

```bash
dits checkout [options] <branch>
dits checkout [options] <commit> -- <file>...
```

**Options:**
| Option | Description |
|--------|-------------|
| `-b <branch>` | Create and switch to new branch |
| `-B <branch>` | Create/reset and switch |
| `-f, --force` | Force checkout (discard changes) |
| `--detach` | Detach HEAD |
| `-t, --track` | Set up tracking |

**Examples:**
```bash
# Switch to branch
dits checkout develop

# Create and switch to new branch
dits checkout -b feature/new-lighting

# Create branch from specific point
dits checkout -b hotfix/bug-fix abc123

# Force checkout (discard local changes)
dits checkout -f main

# Checkout specific file from commit
dits checkout abc123 -- video.mp4

# Detach HEAD at commit
dits checkout --detach abc123
```

---

### dits switch

Switch branches (modern alternative to checkout for branches).

```bash
dits switch [options] <branch>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-c, --create <branch>` | Create and switch |
| `-C` | Force create (reset if exists) |
| `-d, --detach` | Detach HEAD |
| `--discard-changes` | Discard local changes |

**Examples:**
```bash
# Switch to branch
dits switch develop

# Create and switch
dits switch -c feature/new-feature

# Create from specific commit
dits switch -c hotfix/fix abc123

# Switch with detached HEAD
dits switch -d abc123
```

---

### dits merge

Join two or more development histories together.

```bash
dits merge [options] <branch>...
```

**Options:**
| Option | Description |
|--------|-------------|
| `--no-commit` | Merge but don't commit |
| `--squash` | Squash commits into one |
| `--ff-only` | Only fast-forward |
| `--no-ff` | Create merge commit even if fast-forward |
| `-m <msg>` | Merge commit message |
| `--abort` | Abort current merge |
| `--continue` | Continue after resolving conflicts |

**Examples:**
```bash
# Merge branch into current
dits merge feature/character-model

# Merge with custom message
dits merge feature/textures -m "Merge texturing work"

# Merge without commit
dits merge --no-commit feature/wip

# Squash merge
dits merge --squash feature/many-commits

# Force merge commit (no fast-forward)
dits merge --no-ff feature/complete

# Abort failed merge
dits merge --abort

# Continue after resolving conflicts
dits merge --continue
```

---

### dits rebase

Reapply commits on top of another base.

```bash
dits rebase [options] [<upstream>] [<branch>]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--onto <newbase>` | Rebase onto new base |
| `--continue` | Continue after resolving conflicts |
| `--abort` | Abort rebase |
| `--skip` | Skip current patch |

**Examples:**
```bash
# Rebase current branch onto main
dits rebase main

# Rebase onto specific commit
dits rebase --onto abc123 main feature

# Continue after conflict resolution
dits rebase --continue

# Abort rebase
dits rebase --abort
```

---

### dits tag

Create, list, delete, or verify tags.

```bash
dits tag [options] [<tagname>] [<commit>]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-l, --list` | List tags |
| `-a, --annotate` | Create annotated tag |
| `-m <msg>` | Tag message |
| `-d, --delete` | Delete tag |
| `-f, --force` | Replace existing tag |
| `-n <num>` | Show n lines of message |

**Examples:**
```bash
# List tags
dits tag

# List tags matching pattern
dits tag -l "v1.*"

# Create lightweight tag
dits tag v1.0

# Create annotated tag
dits tag -a v1.0 -m "Version 1.0 release"

# Tag specific commit
dits tag v0.9 abc123

# Delete tag
dits tag -d v1.0-beta

# Force replace tag
dits tag -f v1.0

# Show tag info
dits tag -n 5
```

---

## Remote Operations

### dits remote

Manage remote repositories.

```bash
dits remote [options]
dits remote add <name> <url>
dits remote remove <name>
dits remote rename <old> <new>
dits remote set-url <name> <url>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show URLs |
| `show <name>` | Show remote info |
| `prune <name>` | Remove stale branches |

**Examples:**
```bash
# List remotes
dits remote

# List with URLs
dits remote -v

# Add remote
dits remote add origin https://ditshub.com/org/project
dits remote add backup https://backup.example.com/project

# Remove remote
dits remote remove backup

# Rename remote
dits remote rename origin upstream

# Change URL
dits remote set-url origin https://new-url.com/project

# Show remote info
dits remote show origin

# Prune stale branches
dits remote prune origin
```

---

### dits fetch

Download objects and refs from remote.

```bash
dits fetch [options] [<remote>] [<refspec>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--all` | Fetch from all remotes |
| `-p, --prune` | Remove stale remote branches |
| `-t, --tags` | Fetch all tags |
| `--depth <n>` | Deepen shallow clone |
| `-j, --jobs <n>` | Parallel fetches |

**Examples:**
```bash
# Fetch from origin
dits fetch

# Fetch from specific remote
dits fetch upstream

# Fetch all remotes
dits fetch --all

# Fetch and prune
dits fetch -p

# Fetch tags
dits fetch --tags

# Fetch specific branch
dits fetch origin feature/character

# Parallel fetch
dits fetch -j 4 --all
```

---

### dits pull

Fetch and integrate with local branch.

```bash
dits pull [options] [<remote>] [<branch>]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--rebase` | Rebase instead of merge |
| `--no-rebase` | Merge (default) |
| `--ff-only` | Only fast-forward |
| `--no-commit` | Don't auto-commit |
| `-j, --jobs <n>` | Parallel downloads |

**Examples:**
```bash
# Pull from tracking branch
dits pull

# Pull from specific remote/branch
dits pull origin main

# Pull with rebase
dits pull --rebase

# Fast-forward only
dits pull --ff-only

# Parallel downloads
dits pull -j 8
```

---

### dits push

Update remote refs and objects.

```bash
dits push [options] [<remote>] [<refspec>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-u, --set-upstream` | Set upstream branch |
| `--all` | Push all branches |
| `--tags` | Push all tags |
| `-f, --force` | Force push (dangerous!) |
| `--force-with-lease` | Safer force push |
| `-d, --delete` | Delete remote branch |
| `-n, --dry-run` | Show what would be pushed |
| `-j, --jobs <n>` | Parallel uploads |

**Examples:**
```bash
# Push to tracking branch
dits push

# Push and set upstream
dits push -u origin feature/new-asset

# Push to specific remote/branch
dits push origin main

# Push all branches
dits push --all

# Push tags
dits push --tags

# Push branch and tags
dits push --follow-tags

# Delete remote branch
dits push -d origin feature/completed

# Force push (careful!)
dits push -f origin feature/rebased

# Safer force push
dits push --force-with-lease

# Parallel uploads
dits push -j 8

# Dry run
dits push -n
```

---

## History and Inspection

### dits log

Show commit logs.

```bash
dits log [options] [<revision-range>] [-- <path>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--oneline` | One line per commit |
| `-n <num>` | Limit to n commits |
| `--graph` | Show branch graph |
| `--all` | Show all branches |
| `--stat` | Show diffstat |
| `--author <pattern>` | Filter by author |
| `--since <date>` | Show commits since date |
| `--until <date>` | Show commits until date |
| `--grep <pattern>` | Filter by message |
| `-p, --patch` | Show patch |
| `--follow` | Follow file renames |

**Examples:**
```bash
# Basic log
dits log

# Compact view
dits log --oneline

# Last 10 commits
dits log -10

# Log with graph
dits log --graph --oneline --all

# Log with stats
dits log --stat

# Log for specific file
dits log -- video.mp4

# Follow file through renames
dits log --follow -- video.mp4

# Filter by author
dits log --author="Jane"

# Filter by date
dits log --since="2024-01-01" --until="2024-06-01"

# Filter by message
dits log --grep="fix"

# Commits affecting path
dits log -- Assets/Characters/

# Custom format
dits log --format="%h %an %s"
```

---

### dits show

Show various types of objects.

```bash
dits show [options] <object>
```

**Options:**
| Option | Description |
|--------|-------------|
| `--stat` | Show diffstat |
| `--name-only` | Show only names |
| `--format <fmt>` | Pretty-print format |

**Examples:**
```bash
# Show latest commit
dits show

# Show specific commit
dits show abc123

# Show tag
dits show v1.0

# Show file at commit
dits show abc123:video.mp4

# Show with stats
dits show --stat abc123

# Output file from history
dits show abc123:video.mp4 > old_video.mp4
```

---

### dits blame

Show what revision and author last modified each line.

```bash
dits blame [options] <file>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-L <start>,<end>` | Show only line range |
| `-w` | Ignore whitespace |
| `-e` | Show email instead of name |
| `-t` | Show timestamp |

**Examples:**
```bash
# Basic blame
dits blame script.py

# Blame specific lines
dits blame -L 10,20 script.py

# Show timestamps
dits blame -t script.py
```

---

### dits ls-files

Show information about files in index and working tree.

```bash
dits ls-files [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-c, --cached` | Show cached files (default) |
| `-m, --modified` | Show modified files |
| `-d, --deleted` | Show deleted files |
| `-o, --others` | Show untracked files |
| `-i, --ignored` | Show ignored files |
| `-s, --stage` | Show staged files with info |

**Examples:**
```bash
# List all tracked files
dits ls-files

# List modified files
dits ls-files -m

# List untracked files
dits ls-files -o

# List ignored files
dits ls-files -i

# Count tracked files
dits ls-files | wc -l
```

---

### dits inspect-file

Inspect how Dits stores a specific file.

```bash
dits inspect-file [options] <file>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-v, --verbose` | Detailed chunk information |
| `--chunks` | List all chunks |
| `--metadata` | Show file metadata |

**Examples:**
```bash
# Basic inspection
dits inspect-file video.mp4

# Output:
# File: video.mp4
# Size: 2.3 GB
# Chunks: 2,342
# Average chunk size: 1.01 MB
# Storage strategy: DitsChunk
# Content hash: abc123...

# Verbose inspection
dits inspect-file -v video.mp4

# Show metadata
dits inspect-file --metadata video.mp4
```

---

## File Locking

### dits lock

Lock a file to prevent concurrent edits.

```bash
dits lock [options] <file>...
```

**Options:**
| Option | Description |
|--------|-------------|
| `--reason <text>` | Reason for locking |
| `-f, --force` | Force lock (break existing) |

**Examples:**
```bash
# Lock file
dits lock character.blend

# Lock with reason
dits lock character.blend --reason "Updating rig"

# Lock multiple files
dits lock character.blend character_textures.psd

# Force lock (break existing lock)
dits lock -f stale_locked_file.blend
```

---

### dits unlock

Unlock a previously locked file.

```bash
dits unlock [options] <file>...
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --force` | Force unlock (break others' locks) |

**Examples:**
```bash
# Unlock file
dits unlock character.blend

# Force unlock another user's lock (admin)
dits unlock -f orphaned_file.blend
```

---

### dits locks

List all locked files.

```bash
dits locks [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--mine` | Show only my locks |
| `--user <name>` | Show locks by user |
| `--path <pattern>` | Filter by path |

**Examples:**
```bash
# List all locks
dits locks

# Output:
# Locked files:
#   character.blend      Jane (jane@studio.com)  "Rigging updates"  2h ago
#   scene.blend          Alex (alex@studio.com)  "Lighting work"    30m ago

# Show only my locks
dits locks --mine

# Filter by user
dits locks --user jane

# Filter by path
dits locks --path "Assets/*"
```

---

## P2P Sharing

### dits p2p share

Start a P2P sharing session.

```bash
dits p2p share [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--port <port>` | Use specific port |
| `--expires <duration>` | Expire after duration (e.g., "1h", "30m") |
| `--read-only` | Allow only pulls |
| `--password` | Require password |

**Examples:**
```bash
# Start sharing
dits p2p share

# Output:
# P2P sharing started
# Join code: ABC-123-XYZ
# Waiting for connections...

# Share with expiration
dits p2p share --expires 2h

# Read-only share
dits p2p share --read-only

# Password protected
dits p2p share --password
# Enter password: ****
```

---

### dits p2p connect

Connect to a P2P share.

```bash
dits p2p connect [options] <join-code> <directory>
```

**Options:**
| Option | Description |
|--------|-------------|
| `--password` | Provide password |
| `-j, --jobs <n>` | Parallel downloads |

**Examples:**
```bash
# Connect to share
dits p2p connect ABC-123-XYZ ./project

# Connect with parallel downloads
dits p2p connect -j 8 ABC-123-XYZ ./project

# Connect with password
dits p2p connect --password ABC-123-XYZ ./project
# Enter password: ****
```

---

### dits p2p status

Show P2P connection status.

```bash
dits p2p status
```

**Examples:**
```bash
dits p2p status

# Output:
# P2P Status:
#   Mode: Sharing
#   Join code: ABC-123-XYZ
#   Connected peers: 2
#   Transfer rate: 125 MB/s
#   Duration: 15m 23s
```

---

## Virtual Filesystem (VFS)

### dits vfs mount

Mount repository as a virtual filesystem.

```bash
dits vfs mount [options] <mount-point>
```

**Options:**
| Option | Description |
|--------|-------------|
| `--read-only` | Mount as read-only |
| `--cache-size <size>` | Set cache size (e.g., "10GB") |
| `--prefetch` | Prefetch common files |
| `-b, --background` | Run in background |

**Examples:**
```bash
# Mount repository
dits vfs mount /mnt/project

# Mount read-only
dits vfs mount --read-only /mnt/project

# Mount with large cache
dits vfs mount --cache-size 50GB /mnt/project

# Mount in background
dits vfs mount -b /mnt/project

# Output:
# Mounted at /mnt/project
# Files will be fetched on demand
```

---

### dits vfs unmount

Unmount a VFS mount point.

```bash
dits vfs unmount <mount-point>
```

**Examples:**
```bash
dits vfs unmount /mnt/project
```

---

### dits vfs status

Show VFS mount status.

```bash
dits vfs status
```

**Examples:**
```bash
dits vfs status

# Output:
# VFS Mounts:
#   /mnt/project
#     Repository: /Users/jane/project
#     Cache: 2.3 GB / 10 GB
#     Hydrated files: 45 / 1,234
```

---

### dits vfs hydrate

Pre-fetch files to local cache.

```bash
dits vfs hydrate [options] [<path>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--all` | Hydrate all files |
| `-j, --jobs <n>` | Parallel downloads |

**Examples:**
```bash
# Hydrate specific directory
dits vfs hydrate Assets/Characters/

# Hydrate specific files
dits vfs hydrate hero.blend hero_textures.psd

# Hydrate everything
dits vfs hydrate --all

# Parallel hydration
dits vfs hydrate -j 8 Assets/
```

---

## Configuration

### dits config

Get and set repository or global options.

```bash
dits config [options] <key> [<value>]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--global` | Use global config |
| `--local` | Use repository config (default) |
| `--list` | List all settings |
| `--unset` | Remove setting |
| `-e, --edit` | Edit config file |

**Common Settings:**
| Key | Description |
|-----|-------------|
| `user.name` | Your name |
| `user.email` | Your email |
| `core.editor` | Default editor |
| `transfer.maxParallel` | Parallel transfers |
| `cache.path` | Cache directory |
| `cache.size` | Maximum cache size |
| `lock.patterns` | Auto-lock patterns |
| `storage.backend` | Storage backend type |

**Examples:**
```bash
# Set user info
dits config --global user.name "Jane Smith"
dits config --global user.email "jane@example.com"

# Get a value
dits config user.name

# List all settings
dits config --list

# List global settings
dits config --global --list

# Edit config file
dits config -e

# Unset a value
dits config --unset user.email

# Set parallel transfers
dits config transfer.maxParallel 16

# Set cache location
dits config cache.path /Volumes/SSD/dits-cache

# Set cache size
dits config cache.size 100GB

# Auto-lock patterns
dits config lock.patterns "*.psd,*.blend,*.prproj"
```

---

## Maintenance

### dits gc

Run garbage collection.

```bash
dits gc [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--aggressive` | More thorough cleanup |
| `--prune <date>` | Prune older than date |
| `--dry-run` | Show what would be done |

**Examples:**
```bash
# Basic garbage collection
dits gc

# Aggressive cleanup
dits gc --aggressive

# Prune objects older than 2 weeks
dits gc --prune "2 weeks ago"

# Dry run
dits gc --dry-run
```

---

### dits fsck

Verify repository integrity.

```bash
dits fsck [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--full` | Full check (slower) |
| `--strict` | Strict checking |
| `--verbose` | Show all objects |

**Examples:**
```bash
# Basic check
dits fsck

# Full integrity check
dits fsck --full

# Verbose output
dits fsck --verbose
```

---

### dits repo-stats

Show repository statistics.

```bash
dits repo-stats [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-v, --verbose` | Detailed per-file info |
| `--json` | Output as JSON |

**Examples:**
```bash
# Basic stats
dits repo-stats

# Output:
# Repository Statistics:
#   Total files: 1,234
#   Total size: 45.6 GB
#   Deduplicated size: 12.3 GB
#   Deduplication ratio: 73%
#   Chunks: 45,678
#   Average chunk size: 1.02 MB

# Verbose stats
dits repo-stats -v

# JSON output
dits repo-stats --json
```

---

### dits cache

Manage local cache.

```bash
dits cache [subcommand]
```

**Subcommands:**
| Subcommand | Description |
|------------|-------------|
| `status` | Show cache status |
| `clear` | Clear cache |
| `prune` | Remove old entries |

**Examples:**
```bash
# Check cache status
dits cache status

# Clear cache
dits cache clear

# Prune old entries
dits cache prune
```

---

## Advanced Commands

### dits archive

Create an archive of files from repository.

```bash
dits archive [options] <tree-ish> [<path>...]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--format <fmt>` | Archive format (tar, zip, dir) |
| `-o, --output <file>` | Output file |
| `--prefix <prefix>` | Prepend prefix to paths |

**Examples:**
```bash
# Create tar archive
dits archive --format tar -o project.tar HEAD

# Create zip archive
dits archive --format zip -o project.zip HEAD

# Archive specific directory
dits archive --format zip -o assets.zip HEAD Assets/

# Archive with prefix
dits archive --format tar --prefix project-v1/ -o release.tar v1.0

# Export to directory
dits archive --format dir -o /export/project HEAD
```

---

### dits cat-file

Output contents or info about repository objects.

```bash
dits cat-file [options] <object>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t` | Show object type |
| `-s` | Show object size |
| `-p` | Pretty-print contents |

**Examples:**
```bash
# Show object type
dits cat-file -t abc123

# Show object size
dits cat-file -s abc123

# Print contents
dits cat-file -p abc123
```

---

### dits rev-parse

Parse revision identifiers.

```bash
dits rev-parse [options] <args>...
```

**Examples:**
```bash
# Get current commit hash
dits rev-parse HEAD

# Get branch name
dits rev-parse --abbrev-ref HEAD

# Verify revision
dits rev-parse --verify v1.0
```

---

### dits hash-object

Compute object hash for a file.

```bash
dits hash-object [options] <file>
```

**Options:**
| Option | Description |
|--------|-------------|
| `-w` | Write object to repository |
| `--stdin` | Read from stdin |

**Examples:**
```bash
# Get hash of file
dits hash-object video.mp4

# Write to repository
dits hash-object -w video.mp4
```

---

### dits migrate

Migration tools for importing from other systems.

```bash
dits migrate <subcommand> [options]
```

**Subcommands:**
| Subcommand | Description |
|------------|-------------|
| `from-git` | Import from Git repository |
| `from-perforce` | Import from Perforce |
| `from-cloud` | Import from cloud storage |
| `export-comments` | Export comments/metadata |

**Examples:**
```bash
# Import from Git LFS
dits migrate from-git --lfs --history --source .

# Import from Perforce
dits migrate from-perforce --server p4.example.com:1666 --depot //depot/project

# Import from Dropbox
dits migrate from-cloud dropbox --source ~/Dropbox/Project
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DITS_DIR` | Override .dits directory location |
| `DITS_WORK_TREE` | Override working tree |
| `DITS_CONFIG_GLOBAL` | Override global config location |
| `DITS_AUTHOR_NAME` | Override commit author name |
| `DITS_AUTHOR_EMAIL` | Override commit author email |
| `DITS_COMMITTER_NAME` | Override committer name |
| `DITS_COMMITTER_EMAIL` | Override committer email |
| `DITS_EDITOR` | Override editor |
| `DITS_PAGER` | Override pager |
| `DITS_SSH_COMMAND` | Custom SSH command |
| `DITS_TRACE` | Enable trace output |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Command line error |
| 128 | Fatal error |
| 129 | Invalid usage |

---

## Getting Help

```bash
# General help
dits help

# Command help
dits help <command>
dits <command> --help

# Online documentation
# https://docs.dits.io/cli
```
