# Workflow: Daily Editor Workflow

A typical day using Dits for video editing, from sync to commit.

---

## Morning: Start Your Day

### 1. Sync with Team
```bash
cd /path/to/project
dits pull

# Output:
# Fetching from origin...
# Downloading: 12 chunks (45.2 MB)
# Updating abc1234..def5678
# Fast-forward
#  footage/vfx/explosion_v2.mov | Bin 0 -> 234567890 bytes
#  project.prproj               | Bin modified
#  2 files changed
```

### 2. Check What's New
```bash
# See recent activity
dits log --oneline -5
# def5678 (HEAD -> main) Add VFX explosion v2 - Jane
# abc1234 Updated color grade - John
# 789abcd Added interview b-roll - Jane
# ...

# See detailed changes
dits show def5678 --stat
# footage/vfx/explosion_v2.mov | Bin 234567890 bytes
# project.prproj               | Bin modified
```

### 3. Check for Conflicts
```bash
# See who's working on what
dits locks

# Output:
# Locked files:
#   footage/scene02.mov
#     Owner: jane@example.com
#     Since: 2025-01-15 08:00:00 UTC
#     Reason: Color grading
```

---

## Working Session: Edit and Save

### 4. Lock Files Before Editing
```bash
# Lock the file you'll be editing
dits lock footage/scene01.mov --reason "Audio sync fixes"

# Output:
# Locked: footage/scene01.mov
#   Owner: you@example.com
#   Expires: 2025-01-15 22:00:00 UTC
```

### 5. Open in Your NLE

**Option A: Direct File Access**
```bash
# Open file directly
open footage/scene01.mov  # macOS
# or
start footage/scene01.mov  # Windows
```

**Option B: Virtual Filesystem (Recommended)**
```bash
# Mount repository
dits mount /Volumes/project

# Open NLE project from mounted drive
open /Volumes/project/project.prproj
```

### 6. Work on Your Edit

Edit as normal in Premiere Pro, DaVinci Resolve, Final Cut, etc.

The file is locked, so teammates can't accidentally overwrite your changes.

---

## Periodic: Save Progress

### 7. Check Status After Saving
```bash
dits status

# Output:
# On branch main
# Changes not staged for commit:
#   modified:   footage/scene01.mov
#   modified:   project.prproj
```

### 8. Review Changes
```bash
# See what changed
dits diff --stat

# Output:
# footage/scene01.mov | Bin 1234567890 -> 1234600000 bytes (+32110)
# project.prproj      | Bin modified
#
# Summary:
#   scene01.mov: 15 chunks changed (0.08%), metadata updated
#   project.prproj: 234 chunks changed
```

### 9. Stage Changes
```bash
# Stage specific files
dits add footage/scene01.mov project.prproj

# Or stage all changes
dits add -A
```

### 10. Commit with Meaningful Message
```bash
dits commit -m "Fix audio sync in scene 1, adjust cuts at 01:23:45"

# Output:
# [main ghi7890] Fix audio sync in scene 1, adjust cuts at 01:23:45
#  2 files changed, 32.1 KB delta
```

---

## Collaboration: Share and Sync

### 11. Push Changes
```bash
dits push

# Output:
# Pushing to origin...
# Computing delta: 249 chunks to transfer
# Uploading: 100% (249/249), 15.8 MB | 12.3 MB/s
# To https://dits.example.com/team/project
#    def5678..ghi7890  main -> main
```

### 12. Unlock When Done
```bash
dits unlock footage/scene01.mov

# Output:
# Unlocked: footage/scene01.mov
```

---

## End of Day: Wrap Up

### 13. Final Sync
```bash
# Pull any changes from teammates
dits pull

# Push any uncommitted work
dits status
# If changes exist:
dits add -A
dits commit -m "WIP: Scene 2 rough cut"
dits push
```

### 14. Unlock All Your Files
```bash
# Release all locks
dits unlock --all

# Output:
# Unlocked 3 files:
#   footage/scene01.mov
#   footage/scene02.mov
#   project.prproj
```

### 15. Unmount Virtual Filesystem
```bash
dits unmount /Volumes/project
```

---

## Quick Reference: Daily Commands

```bash
# Start of day
dits pull                          # Get latest changes
dits log --oneline -5              # See recent activity
dits locks                         # Check who's working on what

# Before editing
dits lock <file>                   # Lock file for editing

# While working
dits status                        # Check what's changed
dits diff                          # See detailed changes
dits add <files>                   # Stage changes
dits commit -m "message"           # Save snapshot

# Sharing
dits push                          # Upload changes
dits pull                          # Download changes

# End of day
dits unlock --all                  # Release all locks
dits unmount <path>                # Unmount virtual FS
```

---

## Tips for Efficient Workflow

### 1. Commit Often
Small, frequent commits are better than large, infrequent ones:
```bash
# Good: Specific commits
dits commit -m "Fix audio sync scene 1"
dits commit -m "Adjust color grade intro"
dits commit -m "Add lower third graphics"

# Avoid: Mega commits
dits commit -m "Lots of changes"
```

### 2. Use Meaningful Messages
```bash
# Good messages
dits commit -m "Fix lip sync drift at 00:45:30 in interview"
dits commit -m "Replace temp music with licensed track"
dits commit -m "Color grade: +0.5 exposure, warmer shadows"

# Avoid vague messages
dits commit -m "Updates"
dits commit -m "Fixed stuff"
```

### 3. Lock Early, Unlock Often
```bash
# Lock when you start working
dits lock footage/scene01.mov --reason "Audio fixes"

# Unlock as soon as you're done with that file
dits unlock footage/scene01.mov

# Don't hold locks overnight unless necessary
```

### 4. Use Virtual Filesystem for Large Projects
```bash
# For projects with hundreds of files:
dits mount /Volumes/project

# Benefits:
# - Files load on demand (not all at once)
# - Save disk space
# - Faster initial project open
```

### 5. Check Before Push
```bash
# Always check status before pushing
dits status

# Review what you're about to push
dits log origin/main..HEAD --oneline
```

---

## Common Scenarios

### Scenario: Need to Switch Tasks
```bash
# Save current work
dits add -A
dits commit -m "WIP: Scene 3 rough cut"

# Switch to other work
dits checkout other-branch

# Or stash if not ready to commit
dits stash
# ... do other work ...
dits stash pop
```

### Scenario: Someone Else Has File Locked
```bash
dits lock footage/shared.mov
# Error: File locked by jane@example.com since 2h ago
# Reason: Color grading

# Options:
# 1. Wait for them to finish
# 2. Communicate and ask them to unlock
# 3. Work on different files
```

### Scenario: Need Previous Version
```bash
# View file history
dits log -- footage/scene01.mov

# Get file from specific commit
dits checkout abc1234 -- footage/scene01.mov

# Or view it without overwriting
dits show abc1234:footage/scene01.mov > /tmp/old_version.mov
```

### Scenario: Undo Recent Changes
```bash
# Undo unstaged changes to a file
dits restore footage/scene01.mov

# Undo staged changes (unstage)
dits restore --staged footage/scene01.mov

# Undo last commit (keep changes)
dits reset --soft HEAD~1

# Completely undo last commit
dits reset --hard HEAD~1
```

---

## Keyboard Shortcuts (Terminal)

For frequent commands, add aliases to your shell config:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias ds='dits status'
alias da='dits add'
alias dc='dits commit'
alias dp='dits push'
alias dl='dits pull'
alias dlog='dits log --oneline -10'
alias dlock='dits lock'
alias dunlock='dits unlock'
```

Usage:
```bash
ds              # Quick status check
da -A && dc -m "message"  # Quick commit all
dp              # Quick push
```
