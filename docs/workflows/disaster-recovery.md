# Workflow: Disaster Recovery

How to recover from common problems: deleted files, corrupted projects, accidental overwrites.

---

## Prevention: Before Disaster Strikes

### Enable Regular Backups
```bash
# Ensure you commit frequently
dits add -A && dits commit -m "Checkpoint"

# Push to remote (your backup!)
dits push

# Create tags for important milestones
dits tag checkpoint-20250115 -m "Before major changes"
```

### Check Repository Health
```bash
# Verify integrity
dits fsck

# Check storage status
dits status
dits gc --dry-run  # See what would be cleaned
```

---

## Scenario 1: "I Deleted a File!"

### Recover from Last Commit
```bash
# Check what was deleted
dits status
# deleted: footage/important.mov

# Restore from last commit
dits restore footage/important.mov

# Verify it's back
ls footage/important.mov
```

### Recover from Older Commit
```bash
# Find when file existed
dits log --all -- footage/important.mov
# abc1234 (3 days ago) Added important footage
# def5678 (2 days ago) Modified important footage
# ghi7890 (1 day ago) Deleted important footage

# Restore from before deletion
dits restore --source def5678 -- footage/important.mov

# Or restore from any commit
dits checkout abc1234 -- footage/important.mov
```

### Recover Deleted File (Already Committed Deletion)
```bash
# If you already committed the deletion:
dits log --diff-filter=D --name-only
# Lists all deleted files with commit hashes

# Find the commit before deletion
dits log --all -- footage/important.mov
# def5678 Last commit with file

# Restore it
dits checkout def5678 -- footage/important.mov

# Commit the restoration
dits add footage/important.mov
dits commit -m "Restore accidentally deleted important.mov"
```

---

## Scenario 2: "I Overwrote My Changes!"

### Undo Uncommitted Overwrite
```bash
# If you haven't committed yet:
dits restore footage/scene01.mov

# This restores from last committed version
```

### Undo Committed Overwrite
```bash
# Find the version you want
dits log -- footage/scene01.mov
# abc1234 (current) Bad changes
# def5678 (1 day ago) Good version

# Restore the good version
dits checkout def5678 -- footage/scene01.mov

# Commit the fix
dits add footage/scene01.mov
dits commit -m "Revert scene01 to previous good version"
```

### Undo Entire Commit
```bash
# Undo last commit but keep changes staged
dits reset --soft HEAD~1

# Undo last commit and unstage changes
dits reset HEAD~1

# Completely undo last commit (DESTRUCTIVE)
dits reset --hard HEAD~1
```

---

## Scenario 3: "Project File Won't Open!"

### Check File Integrity
```bash
# Verify the file exists
ls -la project.prproj

# Check Dits thinks it's okay
dits fsck -- project.prproj
```

### Restore Previous Version
```bash
# List all versions of project file
dits log --oneline -- project.prproj

# Try progressively older versions
dits checkout HEAD~1 -- project.prproj
# Try opening...

# If that doesn't work, go further back
dits checkout HEAD~2 -- project.prproj
# etc.
```

### Get List of All Versions
```bash
# Show all commits with this file
dits log --oneline -- project.prproj

# Output:
# abc1234 Latest save
# def5678 Before client changes
# ghi7890 After rough cut
# jkl0123 Initial project setup

# Restore known-good version
dits checkout jkl0123 -- project.prproj
```

### Save Versions to Compare
```bash
# Export multiple versions to compare
dits show abc1234:project.prproj > project_v1.prproj
dits show def5678:project.prproj > project_v2.prproj
dits show ghi7890:project.prproj > project_v3.prproj

# Try opening each in NLE to find best recovery point
```

---

## Scenario 4: "I Messed Up the Whole Project!"

### Reset to Remote State
```bash
# CAUTION: This discards ALL local changes
dits fetch origin
dits reset --hard origin/main

# Your project now matches remote exactly
```

### Reset to Specific Tag
```bash
# If you tagged important milestones:
dits tag -l
# client-review-v1
# client-review-v2
# pre-color-grade

# Reset to that tag
dits reset --hard pre-color-grade
```

### Clone Fresh Copy
```bash
# Nuclear option: start fresh
cd ..
mv project project-broken  # Keep the broken one just in case

# Clone fresh from remote
dits clone https://dits.example.com/team/project

# Your local is now pristine
# Broken version still at project-broken if you need anything
```

---

## Scenario 5: "Someone Else Broke It!"

### Find What Changed
```bash
# See recent commits
dits log --oneline -10

# Find suspicious commit
dits show abc1234 --stat

# See exactly what changed
dits diff abc1234~1 abc1234
```

### Revert Specific Commit
```bash
# Revert a specific commit (creates new commit undoing it)
dits revert abc1234

# This keeps history clean and traceable
```

### Revert Multiple Commits
```bash
# Revert a range
dits revert abc1234..def5678

# Or revert without committing (to combine into one commit)
dits revert --no-commit abc1234
dits revert --no-commit def5678
dits commit -m "Revert broken changes from abc1234 and def5678"
```

---

## Scenario 6: "I Need a File From Way Back"

### Search History
```bash
# Find when file existed
dits log --all --full-history -- "**/lost_file.mov"

# Search for file by partial name
dits log --all --name-only | grep -i "lost"

# List all files at specific commit
dits ls-tree -r --name-only abc1234 | grep -i "scene"
```

### Browse Old Versions
```bash
# List files at old commit
dits ls-tree -r abc1234

# Show specific file from old commit
dits show abc1234:footage/old_scene.mov > recovered_scene.mov
```

### Recover from Reflog (Advanced)
```bash
# Even if you reset/deleted, reflog remembers
dits reflog

# Output:
# abc1234 HEAD@{0}: reset: moving to origin/main
# def5678 HEAD@{1}: commit: My changes (THE ONE YOU WANT)
# ghi7890 HEAD@{2}: pull

# Recover from reflog
dits checkout def5678 -- footage/important.mov
# Or reset to that state
dits reset --hard def5678
```

---

## Scenario 7: "Merge Gone Wrong"

### Abort In-Progress Merge
```bash
# If merge is still in progress:
dits merge --abort

# Back to pre-merge state
```

### Undo Completed Merge
```bash
# If you already committed the merge:
dits revert -m 1 HEAD

# This undoes the merge commit
```

### Restart Merge Carefully
```bash
# Reset to before merge
dits reset --hard HEAD~1

# Try merge again with more attention
dits merge other-branch

# Handle conflicts one by one
dits status
# Edit conflicted files...
dits add resolved_file.mov
dits commit
```

---

## Scenario 8: "Repository Is Corrupted"

### Verify Corruption
```bash
dits fsck --full

# Output might show:
# error: invalid object abc1234
# missing blob def5678
```

### Repair from Remote
```bash
# If remote is healthy, re-fetch
dits fetch --all
dits fsck

# Or start fresh
cd ..
dits clone https://dits.example.com/team/project project-fresh
```

### Manual Repair (Advanced)
```bash
# Remove corrupt objects
rm .dits/objects/ab/c1234...

# Re-fetch from remote
dits fetch origin

# Rebuild index
dits reset --hard origin/main
```

---

## Scenario 9: "I Pushed Bad Changes!"

### Communicate First
```
# IMPORTANT: Tell your team before doing anything!
# "Hey team, I pushed broken changes. Please don't pull until I fix it."
```

### Revert (Safe Option)
```bash
# Create a new commit that undoes the bad one
dits revert abc1234
dits push

# History preserved, team can pull safely
```

### Force Push (Dangerous Option)
```bash
# ONLY if team hasn't pulled yet
# AND you've communicated clearly

# Reset local to good state
dits reset --hard def5678

# Force push (DANGEROUS)
dits push --force-with-lease

# Team must re-clone or reset
```

---

## Quick Reference: Recovery Commands

| Situation | Command |
| :--- | :--- |
| Restore deleted file | `dits restore <file>` |
| Restore from old commit | `dits checkout <commit> -- <file>` |
| Undo uncommitted changes | `dits restore <file>` |
| Undo last commit (keep changes) | `dits reset --soft HEAD~1` |
| Undo last commit (discard) | `dits reset --hard HEAD~1` |
| Revert specific commit | `dits revert <commit>` |
| Find deleted files | `dits log --diff-filter=D --name-only` |
| Search file history | `dits log --all -- <path>` |
| Abort merge | `dits merge --abort` |
| Reset to remote | `dits reset --hard origin/main` |
| Check reflog | `dits reflog` |
| Verify integrity | `dits fsck` |

---

## Prevention Checklist

- [ ] Commit frequently (at least daily)
- [ ] Push to remote after important work
- [ ] Tag milestones (`dits tag before-client-feedback`)
- [ ] Run `dits fsck` periodically
- [ ] Don't use `--force` without team communication
- [ ] Keep broken project directories until confirmed recovered
- [ ] Document recovery steps for your team

---

## Emergency Contacts

If all else fails:
1. **Don't panic** - Dits keeps extensive history
2. **Stop making changes** - Preserve current state
3. **Check remote** - `dits fetch` to see if remote is healthy
4. **Contact support** - support@dits.dev with:
   - Output of `dits fsck`
   - Output of `dits log -10`
   - Description of what happened
