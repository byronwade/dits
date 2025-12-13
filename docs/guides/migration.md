# Complete Migration Guides

Step-by-step guides for migrating to Dits from any existing workflow or version control system.

---

## Table of Contents

1. [Before You Begin](#before-you-begin)
2. [Migrating from Git LFS](#migrating-from-git-lfs)
3. [Migrating from Git (No LFS)](#migrating-from-git-no-lfs)
4. [Migrating from Perforce Helix Core](#migrating-from-perforce-helix-core)
5. [Migrating from Dropbox](#migrating-from-dropbox)
6. [Migrating from Google Drive](#migrating-from-google-drive)
7. [Migrating from Frame.io](#migrating-from-frameio)
8. [Migrating from Backblaze B2 / Amazon S3](#migrating-from-backblaze-b2--amazon-s3)
9. [Migrating from Manual File Management](#migrating-from-manual-file-management)
10. [Post-Migration Checklist](#post-migration-checklist)
11. [Parallel Operation During Transition](#parallel-operation-during-transition)
12. [Rollback Procedures](#rollback-procedures)

---

## Before You Begin

### Pre-Migration Checklist

Before migrating any project to Dits, complete this checklist:

- [ ] **Backup everything**: Create a complete backup of your project
- [ ] **Document current structure**: Note your folder organization
- [ ] **Identify large files**: List files over 100MB
- [ ] **Check disk space**: Ensure 2x your project size is available
- [ ] **Notify team**: Inform all collaborators about the migration
- [ ] **Schedule downtime**: Plan a window when no one is editing

### System Requirements

```bash
# Verify Dits is installed
dits --version

# Check available disk space
df -h .

# Verify network connectivity (if using DitsHub)
dits remote test https://ditshub.com
```

### Estimate Migration Time

| Project Size | Estimated Time | Notes |
|--------------|----------------|-------|
| < 10 GB | 5-15 minutes | Quick migration |
| 10-50 GB | 15-45 minutes | Plan for short downtime |
| 50-200 GB | 1-3 hours | Schedule migration window |
| 200+ GB | 3-8+ hours | Consider overnight migration |

---

## Migrating from Git LFS

Git LFS (Large File Storage) is a common solution for handling large files in Git repositories. Dits provides a seamless migration path.

### Why Migrate from Git LFS?

| Pain Point | Git LFS | Dits |
|------------|---------|------|
| Storage costs | Pay for every version | 80-98% deduplication |
| Clone speed | Downloads all LFS files | Sparse clone, on-demand |
| Bandwidth | Full file on each change | Only changed chunks |
| Local storage | Full copies required | VFS mounting option |
| Binary diffs | "Binary files differ" | Chunk-level changes |

### Step 1: Prepare Your Git LFS Repository

```bash
# Navigate to your Git repository
cd /path/to/your/git-repo

# Verify Git LFS status
git lfs version
git lfs ls-files

# Ensure all LFS content is downloaded
git lfs pull --all

# Check for any LFS issues
git lfs status
```

### Step 2: Audit Your Repository

```bash
# List all tracked LFS file types
git lfs track

# Count LFS files
git lfs ls-files | wc -l

# Calculate total LFS storage
git lfs ls-files --size | awk '{sum += $3} END {print sum/1024/1024 " MB"}'

# Check for mixed content (some files in LFS, similar files not)
find . -type f \( -name "*.mp4" -o -name "*.mov" \) ! -path "./.git/*" | head -20
```

### Step 3: Create a Dits Repository

```bash
# Option A: Convert in place (recommended for most cases)
dits init

# Option B: Create a new directory
mkdir ../project-dits
cd ../project-dits
dits init
cp -r ../project-git/* .
```

### Step 4: Configure Dits

```bash
# Set your identity (if not already configured globally)
dits config user.name "Your Name"
dits config user.email "your.email@example.com"

# Add remote (if using DitsHub or self-hosted)
dits remote add origin https://ditshub.com/your-org/your-project
```

### Step 5: Import with History (Optional)

If you want to preserve your Git commit history:

```bash
# Full history import (may take a while for large repos)
dits migrate from-git \
    --source . \
    --lfs \
    --history \
    --branch-filter "main,develop,release/*"

# Or import only specific branches
dits migrate from-git \
    --source . \
    --lfs \
    --history \
    --branch main
```

### Step 6: Import Without History (Fresh Start)

For a clean start without history:

```bash
# Add all files
dits add .

# Create initial commit
dits commit -m "Initial import from Git LFS"
```

### Step 7: Push to Remote

```bash
# Push all content
dits push -u origin main

# Verify push completed
dits remote show origin
```

### Step 8: Verify Migration

```bash
# Check repository status
dits status

# Verify file integrity
dits fsck

# Compare file counts
echo "Git files: $(git ls-files | wc -l)"
echo "Dits files: $(dits ls-files | wc -l)"

# Check storage savings
dits repo-stats
```

### Complete Migration Script

```bash
#!/bin/bash
# migrate-from-git-lfs.sh
# Usage: ./migrate-from-git-lfs.sh <git-repo-path> <dits-remote-url>

set -e

GIT_REPO="${1:-.}"
DITS_URL="$2"

echo "=== Git LFS to Dits Migration ==="
echo "Source: $GIT_REPO"
echo "Destination: $DITS_URL"
echo ""

# Step 1: Validate source
cd "$GIT_REPO"
if [ ! -d ".git" ]; then
    echo "Error: Not a Git repository"
    exit 1
fi

# Step 2: Ensure LFS content is local
echo "Pulling all LFS content..."
git lfs pull --all

# Step 3: Calculate storage before
STORAGE_BEFORE=$(du -sh . | cut -f1)
echo "Current storage: $STORAGE_BEFORE"

# Step 4: Initialize Dits
echo "Initializing Dits..."
dits init

# Step 5: Configure remote
if [ -n "$DITS_URL" ]; then
    dits remote add origin "$DITS_URL"
fi

# Step 6: Add all files
echo "Adding files to Dits..."
dits add .

# Step 7: Commit
echo "Creating initial commit..."
dits commit -m "Migrated from Git LFS

Source repository: $(git remote get-url origin 2>/dev/null || echo 'local')
Migration date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Original commit: $(git rev-parse HEAD)"

# Step 8: Push (if remote configured)
if [ -n "$DITS_URL" ]; then
    echo "Pushing to remote..."
    dits push -u origin main
fi

# Step 9: Verify
echo "Verifying migration..."
dits fsck

# Step 10: Report
STORAGE_AFTER=$(dits repo-stats | grep "Deduplicated size" | awk '{print $3}')
echo ""
echo "=== Migration Complete ==="
echo "Files migrated: $(dits ls-files | wc -l)"
echo "Storage before: $STORAGE_BEFORE"
echo "Storage after: $STORAGE_AFTER"
echo ""
echo "Next steps:"
echo "1. Verify your files work correctly"
echo "2. Update team documentation"
echo "3. Configure CI/CD if needed"
echo "4. Archive or remove the Git LFS repository"
```

### Team Migration Guide

For teams migrating together:

**Day 1 - Preparation:**
```bash
# Team lead: Create the Dits repository
dits init
dits remote add origin https://ditshub.com/team/project
dits add .
dits commit -m "Initial migration from Git LFS"
dits push -u origin main
```

**Day 2 - Team onboarding:**
```bash
# Each team member:
# 1. Archive old Git repo
mv project project-git-archive

# 2. Clone from Dits
dits clone https://ditshub.com/team/project

# 3. Verify setup
cd project
dits status
```

---

## Migrating from Git (No LFS)

If you have a Git repository with large binary files tracked directly (causing bloat), migrating to Dits can dramatically reduce storage.

### Why Migrate?

| Symptom | Cause | Dits Solution |
|---------|-------|---------------|
| `.git` folder is huge | Every version stored fully | Chunk-level deduplication |
| Clone takes forever | All history downloaded | Sparse clones |
| `git status` is slow | Large working tree | Optimized index |
| "Binary files differ" | No binary diff | Chunk-level changes |

### Step 1: Analyze Your Repository

```bash
# Check repository size
du -sh .git

# Find largest files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort -rnk2 | \
  head -20

# List current large files
find . -type f -size +50M ! -path "./.git/*"
```

### Step 2: Clean Up (Optional but Recommended)

```bash
# Remove files from history that shouldn't be there
# WARNING: This rewrites history!

# List files to remove
git rev-list --objects --all | grep -E "\.(mp4|mov|psd|zip)$"

# Use BFG or git-filter-repo to clean
# (backup first!)
```

### Step 3: Migrate to Dits

```bash
# Initialize Dits
dits init

# Add files
dits add .

# Commit
dits commit -m "Initial import from Git repository"

# Add remote and push
dits remote add origin https://ditshub.com/org/project
dits push -u origin main
```

### Step 4: Set Up Hybrid Workflow (Optional)

Keep Git for code, Dits for assets:

```bash
# Project structure
my-project/
├── .git/              # Git tracks code
├── .gitignore         # Ignore assets/
├── .dits/             # Dits tracks assets
├── src/               # Git
├── docs/              # Git
└── assets/            # Dits
    ├── video/
    ├── audio/
    └── images/

# .gitignore
assets/

# Initialize both systems
git init
dits init

# Git handles code
git add src/ docs/ package.json
git commit -m "Initial code commit"

# Dits handles assets
dits add assets/
dits commit -m "Initial asset commit"
```

---

## Migrating from Perforce Helix Core

Perforce is common in game development and large enterprises. Dits provides similar exclusive checkout (locking) capabilities with a more familiar Git-like workflow.

### Feature Mapping

| Perforce | Dits Equivalent |
|----------|-----------------|
| Depot | Repository |
| Changelist | Commit |
| Workspace | Working directory |
| Exclusive checkout | `dits lock` |
| Shelving | `dits stash` |
| Streams | Branches |
| P4V | DitsHub Desktop App |
| Labels | Tags |
| Triggers | Webhooks |

### Step 1: Export from Perforce

```bash
# Sync your workspace to latest
p4 sync //depot/project/...@head

# Or sync to a specific changelist
p4 sync //depot/project/...@123456

# Export changelist history (optional)
p4 changes //depot/project/... > changelist-history.txt

# Export file list
p4 files //depot/project/... > file-list.txt
```

### Step 2: Prepare Migration Directory

```bash
# Create migration directory
mkdir project-migration
cd project-migration

# Copy files from workspace
cp -r /path/to/p4/workspace/project/* .

# Remove Perforce metadata if present
find . -name ".p4*" -delete
```

### Step 3: Initialize Dits

```bash
# Initialize repository
dits init

# Configure
dits config user.name "Your Name"
dits config user.email "you@company.com"

# Add remote
dits remote add origin https://ditshub.com/company/project
```

### Step 4: Import with History (Advanced)

For preserving Perforce history:

```bash
# Use the Dits Perforce import tool
dits migrate from-perforce \
    --server perforce.company.com:1666 \
    --user your-p4-user \
    --depot "//depot/project" \
    --history \
    --map-users users.txt

# users.txt format:
# p4user1 = "Display Name" <email@company.com>
# p4user2 = "Another Name" <another@company.com>
```

### Step 5: Import Without History

```bash
# Add all files
dits add .

# Commit with migration note
dits commit -m "Migrated from Perforce

Source: //depot/project
Changelist: @head
Migration date: $(date)"

# Push
dits push -u origin main
```

### Step 6: Set Up Locking for Team

```bash
# Enable locking for specific file types
dits config lock.patterns "*.psd,*.max,*.blend,*.prproj"

# Team members should lock before editing:
dits lock models/character.blend --reason "Updating rig"

# Work on file...

# Release lock when done
dits unlock models/character.blend
```

### Workflow Translation Guide

**Perforce Workflow:**
```bash
p4 edit file.psd                    # Check out for edit
# ... make changes ...
p4 submit -d "Description"          # Check in
```

**Dits Equivalent:**
```bash
dits lock file.psd                  # Lock file (optional)
# ... make changes ...
dits add file.psd
dits commit -m "Description"
dits push
dits unlock file.psd                # Release lock
```

---

## Migrating from Dropbox

Dropbox is great for simple file sharing but lacks version control features. Dits provides proper versioning while keeping the simplicity.

### Why Migrate?

| Dropbox | Dits |
|---------|------|
| 30-180 day version history | Unlimited history |
| File-level sync only | Chunk-level sync |
| No branching | Full branch support |
| Limited offline | Complete offline support |
| Sync conflicts create copies | Proper merge/lock |

### Step 1: Ensure All Files Are Local

```bash
# Check Dropbox sync status
# In Dropbox preferences, ensure "Smart Sync" shows all files as "Local"

# Alternatively, make specific folders available offline:
# Right-click folder in Dropbox → Make available offline
```

### Step 2: Create Migration Copy

**Important**: Don't modify your Dropbox folder directly during migration.

```bash
# Create a working copy
mkdir ~/migration-workspace
cd ~/migration-workspace

# Copy from Dropbox (this may take a while for large projects)
cp -r ~/Dropbox/MyProject ./MyProject

# Or use rsync for large transfers (shows progress)
rsync -av --progress ~/Dropbox/MyProject/ ./MyProject/
```

### Step 3: Clean Up Before Migration

```bash
cd MyProject

# Remove Dropbox conflict files
find . -name "*conflicted copy*" -type f

# Review and delete or merge conflict files manually
# Then remove them:
find . -name "*conflicted copy*" -type f -delete

# Remove OS-specific files
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete
find . -name "desktop.ini" -delete

# Remove any temporary files
find . -name "*.tmp" -delete
find . -name "~*" -delete
```

### Step 4: Initialize Dits Repository

```bash
# Initialize
dits init

# Configure
dits config user.name "Your Name"
dits config user.email "you@example.com"

# Add remote
dits remote add origin https://ditshub.com/username/myproject
```

### Step 5: Add and Commit

```bash
# Add all files
dits add .

# Review what's being added
dits status

# Commit
dits commit -m "Initial import from Dropbox

Migrated from: ~/Dropbox/MyProject
Date: $(date)
File count: $(find . -type f ! -path './.dits/*' | wc -l)"

# Push to remote
dits push -u origin main
```

### Step 6: Verify and Share

```bash
# Verify migration
dits fsck
dits repo-stats

# Share with team using P2P or remote
# Option A: P2P sharing
dits p2p share
# Share the join code with team members

# Option B: Remote cloning
# Team members run:
dits clone https://ditshub.com/username/myproject
```

### Step 7: Update Your Workflow

**Before (Dropbox):**
- Save file → Auto-syncs
- No way to "checkpoint" work
- Conflicts create duplicate files

**After (Dits):**
```bash
# Make changes to files
# When ready to save a checkpoint:
dits add changed-files
dits commit -m "Description of changes"
dits push

# To get team changes:
dits pull
```

### Migration Script for Dropbox

```bash
#!/bin/bash
# migrate-from-dropbox.sh
# Usage: ./migrate-from-dropbox.sh /path/to/dropbox/folder project-name

set -e

DROPBOX_PATH="$1"
PROJECT_NAME="$2"
WORK_DIR="$HOME/dits-migration/$PROJECT_NAME"

if [ -z "$DROPBOX_PATH" ] || [ -z "$PROJECT_NAME" ]; then
    echo "Usage: $0 <dropbox-folder-path> <project-name>"
    exit 1
fi

echo "=== Dropbox to Dits Migration ==="
echo "Source: $DROPBOX_PATH"
echo "Project: $PROJECT_NAME"
echo ""

# Create workspace
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Copy files with progress
echo "Copying files from Dropbox..."
rsync -av --progress "$DROPBOX_PATH/" .

# Clean up
echo "Cleaning up Dropbox-specific files..."
find . -name "*conflicted copy*" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name ".dropbox" -delete 2>/dev/null || true
find . -name ".dropbox.attr" -delete 2>/dev/null || true

# Initialize Dits
echo "Initializing Dits repository..."
dits init

# Add and commit
echo "Adding files..."
dits add .

FILE_COUNT=$(find . -type f ! -path './.dits/*' | wc -l | tr -d ' ')
echo "Committing $FILE_COUNT files..."
dits commit -m "Migrated from Dropbox: $PROJECT_NAME

Source: $DROPBOX_PATH
Files: $FILE_COUNT
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Report
echo ""
echo "=== Migration Complete ==="
echo "Location: $WORK_DIR"
echo "Files: $FILE_COUNT"
dits repo-stats
echo ""
echo "Next steps:"
echo "1. dits remote add origin <your-remote-url>"
echo "2. dits push -u origin main"
echo "3. Stop syncing old Dropbox folder"
echo "4. Share Dits repository with team"
```

---

## Migrating from Google Drive

Similar to Dropbox, Google Drive lacks proper version control. Here's how to migrate.

### Step 1: Download Files Locally

**Option A: Google Drive Desktop App**
- Ensure files are set to "Available offline"
- Wait for sync to complete

**Option B: Google Takeout (for complete backup)**
1. Go to https://takeout.google.com
2. Select only Google Drive
3. Choose specific folders or all
4. Download the archive

**Option C: Direct download**
- Right-click folder in Drive → Download
- Extracts as a ZIP file

### Step 2: Extract and Organize

```bash
# If using Takeout or direct download
cd ~/Downloads
unzip takeout-*.zip -d google-drive-export

# Navigate to your content
cd google-drive-export/Takeout/Drive

# Or if using Drive Desktop
cd "/Volumes/GoogleDrive/My Drive/ProjectFolder"
# or on Windows: "G:\My Drive\ProjectFolder"
```

### Step 3: Migrate to Dits

```bash
# Create migration directory
mkdir ~/dits-projects/my-project
cd ~/dits-projects/my-project

# Copy files
cp -r /path/to/google-drive/content/* .

# Clean up Google-specific metadata
find . -name "*.gdoc" -delete    # Google Docs links
find . -name "*.gsheet" -delete  # Google Sheets links
find . -name "*.gslides" -delete # Google Slides links
# Note: These are just links; export actual content from Google Drive first

# Initialize and commit
dits init
dits add .
dits commit -m "Migrated from Google Drive"
dits remote add origin https://ditshub.com/you/project
dits push -u origin main
```

### Converting Google Docs

Google Docs, Sheets, and Slides are stored as cloud-only links. Export them first:

```bash
# In Google Drive:
# 1. Select all Google Docs/Sheets/Slides
# 2. Right-click → Download
# 3. They'll be converted to .docx, .xlsx, .pptx

# Or use Google Apps Script for bulk export
# Or use rclone with conversion flags:
rclone copy gdrive:MyProject ./my-project \
    --drive-export-formats docx,xlsx,pptx
```

---

## Migrating from Frame.io

Frame.io is excellent for review workflows but isn't a full version control system. Migrate to Dits for complete project management while keeping Frame.io for reviews.

### Why Migrate?

| Frame.io | Dits |
|----------|------|
| Cloud storage only | Local + cloud |
| Review-focused | Version control focused |
| Limited history | Complete version history |
| No branching | Full branch support |
| Proprietary | Open source |

### Step 1: Export from Frame.io

**Using Frame.io Desktop App:**
1. Open Frame.io Desktop
2. Select your project
3. Click "Download Project"
4. Choose destination folder
5. Wait for download to complete

**Using Frame.io API:**
```bash
# Using Frame.io CLI (if available)
frameio download --project "Project Name" --output ./frame-export

# Or use the REST API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.frame.io/v2/projects/PROJECT_ID/download
```

### Step 2: Organize Downloaded Content

```bash
cd frame-export

# Frame.io typically exports with this structure:
# project-name/
# ├── v1/
# │   └── video.mp4
# ├── v2/
# │   └── video.mp4
# └── comments.json

# Decide on structure:
# Option A: Keep all versions
# Option B: Keep only latest version (recommended for Dits)
```

### Step 3: Import to Dits

```bash
# Create Dits repository
mkdir my-project
cd my-project
dits init

# Option A: Import latest versions only
cp -r ../frame-export/latest/* .

# Option B: Import with version directories
cp -r ../frame-export/* .

# Add and commit
dits add .
dits commit -m "Migrated from Frame.io

Project: ProjectName
Migration date: $(date)
"

# Push
dits remote add origin https://ditshub.com/org/project
dits push -u origin main
```

### Step 4: Preserve Comments (Optional)

```bash
# If Frame.io exported comments as JSON
# Store them in a metadata file

# Create comments directory
mkdir -p .dits-metadata/frameio

# Copy comments
cp ../frame-export/comments.json .dits-metadata/frameio/

# Add to repository
dits add .dits-metadata/
dits commit -m "Add Frame.io comments archive"
```

### Hybrid Workflow: Dits + Frame.io

Use Dits for version control and Frame.io for client review:

```bash
# Your workflow:
# 1. Work on video in your NLE
# 2. Export and add to Dits
dits add exports/client-review-v3.mp4
dits commit -m "Client review v3 - color correction pass"
dits push

# 3. Upload to Frame.io for client review
frameio upload exports/client-review-v3.mp4 --project "Client Project"

# 4. After approval, tag in Dits
dits tag client-approved-v3

# 5. Continue with final delivery
```

---

## Migrating from Backblaze B2 / Amazon S3

If you're using cloud object storage directly for versioning, Dits provides proper version control semantics.

### Step 1: Sync Files Locally

**From Backblaze B2:**
```bash
# Using B2 CLI
b2 sync b2://your-bucket/project ./project-local

# Or using rclone
rclone sync b2:your-bucket/project ./project-local --progress
```

**From Amazon S3:**
```bash
# Using AWS CLI
aws s3 sync s3://your-bucket/project ./project-local

# Or using rclone
rclone sync s3:your-bucket/project ./project-local --progress
```

### Step 2: Handle Versioned Objects

If you have S3 versioning enabled and want to preserve versions:

```bash
# List all versions
aws s3api list-object-versions --bucket your-bucket --prefix project/

# Download specific versions
aws s3api get-object \
    --bucket your-bucket \
    --key project/video.mp4 \
    --version-id "VERSION_ID" \
    ./versions/video-v1.mp4

# Import versions chronologically to Dits
cd project-local
dits init

# Add oldest version first
cp ../versions/video-v1.mp4 ./video.mp4
dits add video.mp4
dits commit -m "Initial version"

# Add subsequent versions
cp ../versions/video-v2.mp4 ./video.mp4
dits add video.mp4
dits commit -m "Version 2"

# Continue for all versions...
```

### Step 3: Standard Migration

For simple migrations without version history:

```bash
cd project-local
dits init
dits add .
dits commit -m "Migrated from S3/B2"
dits remote add origin https://ditshub.com/org/project
dits push -u origin main
```

### Step 4: Configure Dits with S3/B2 Backend (Optional)

Dits can use S3/B2 as its storage backend:

```bash
# Configure S3 backend
dits config storage.backend s3
dits config storage.s3.bucket your-dits-bucket
dits config storage.s3.region us-east-1
dits config storage.s3.access-key YOUR_KEY
dits config storage.s3.secret-key YOUR_SECRET

# Or B2 backend
dits config storage.backend b2
dits config storage.b2.bucket your-dits-bucket
dits config storage.b2.key-id YOUR_KEY_ID
dits config storage.b2.app-key YOUR_APP_KEY
```

---

## Migrating from Manual File Management

If you've been managing versions manually (e.g., "video_final_v2_FINAL_really_final.mp4"), Dits will change your life.

### The Problem with Manual Versioning

```
project/
├── video.mp4
├── video_v2.mp4
├── video_v3.mp4
├── video_v3_fixed.mp4
├── video_final.mp4
├── video_final_v2.mp4
├── video_FINAL.mp4
├── video_FINAL_FINAL.mp4           # Which one is actually final?
├── video_FINAL_use_this_one.mp4
└── video_FINAL_for_real.mp4
```

### Step 1: Identify the Canonical Version

```bash
# Find all versions of a file
ls -la video*.mp4

# Check modification dates
ls -lt video*.mp4

# Find the largest (often most recent export)
ls -lS video*.mp4
```

### Step 2: Create Clean Project Structure

```bash
# Create new project directory
mkdir project-clean
cd project-clean

# Copy only the canonical (current) versions
cp ../project-old/video_FINAL_for_real.mp4 ./video.mp4
cp ../project-old/audio_master.wav ./audio.wav
cp ../project-old/project_file_latest.prproj ./project.prproj
```

### Step 3: Initialize Dits

```bash
# Initialize repository
dits init

# Add files
dits add .

# Commit with clear message
dits commit -m "Initial commit - clean project structure

Files migrated from manual versioning.
video.mp4 was: video_FINAL_for_real.mp4
audio.wav was: audio_master.wav
project.prproj was: project_file_latest.prproj"

# Add remote and push
dits remote add origin https://ditshub.com/you/project
dits push -u origin main
```

### Step 4: Archive Old Versions

```bash
# Create archive of old versions for reference
cd ../project-old
zip -r ../project-archive-$(date +%Y%m%d).zip .

# Store archive somewhere safe (external drive, cloud backup)
mv ../project-archive-*.zip /Volumes/Backup/

# Remove old project folder after verifying migration
# rm -rf ../project-old  # Uncomment when ready
```

### Step 5: New Workflow

**Before (Manual):**
```bash
# Save new version
cp video.mp4 video_v2.mp4
# Edit video_v2.mp4
cp video_v2.mp4 video_v3.mp4
# Repeat until madness
```

**After (Dits):**
```bash
# Edit video.mp4 directly
# When ready to checkpoint:
dits add video.mp4
dits commit -m "Color correction pass"
dits push

# Need to go back?
dits log
dits restore video.mp4 --commit abc123
```

---

## Post-Migration Checklist

After any migration, complete these verification steps:

### 1. Verify File Integrity

```bash
# Run filesystem check
dits fsck

# Verify all files are present
dits ls-files | wc -l

# Check specific important files
dits cat-file -t important-video.mp4  # Shows file type
dits inspect-file important-video.mp4  # Shows chunks and metadata
```

### 2. Test Core Workflows

```bash
# Test clone
cd /tmp
dits clone <your-repo-url> test-clone
cd test-clone
ls -la

# Test checkout (restore a file)
dits restore --staged somefile.mp4

# Test commit cycle
echo "test" > test.txt
dits add test.txt
dits commit -m "Test commit"
dits push

# Clean up test
dits rm test.txt
dits commit -m "Remove test file"
dits push
```

### 3. Update Team Documentation

```markdown
# Project Version Control

We now use Dits for version control. Here's how to get started:

## First Time Setup
1. Install Dits: https://dits.io/install
2. Clone the project: `dits clone <url>`

## Daily Workflow
1. Pull latest: `dits pull`
2. Make your changes
3. Commit: `dits add . && dits commit -m "message"`
4. Push: `dits push`

## Questions?
Contact: [Your Name] or check docs.dits.io
```

### 4. Update CI/CD Pipelines

**GitHub Actions:**
```yaml
- name: Install Dits
  run: curl -fsSL https://dits.io/install.sh | bash

- name: Clone with Dits
  run: dits clone ${{ secrets.DITS_REPO_URL }}
```

**GitLab CI:**
```yaml
before_script:
  - curl -fsSL https://dits.io/install.sh | bash
  - dits clone $DITS_REPO_URL
```

### 5. Configure Webhooks (Optional)

```bash
# Add webhook for integrations
dits webhook add https://your-service.com/dits-webhook \
    --events push,commit \
    --secret YOUR_SECRET
```

### 6. Set Up Backup Strategy

```bash
# Local backup
dits clone --mirror https://ditshub.com/org/project /backup/project.dits

# Schedule regular backups
# Add to crontab:
# 0 2 * * * dits -C /backup/project.dits fetch --all
```

---

## Parallel Operation During Transition

For larger teams, run both systems in parallel during transition:

### Week 1-2: Dual Write

```bash
# Everyone continues using old system
# Migration lead mirrors changes to Dits

# Mirror script (run daily)
#!/bin/bash
rsync -av --progress /old-system/project/ /dits-project/
cd /dits-project
dits add .
dits commit -m "Mirror from old system - $(date +%Y-%m-%d)"
dits push
```

### Week 3: Read from Dits, Write to Both

```bash
# Team clones from Dits
dits clone https://ditshub.com/org/project

# Changes still synced to old system as backup
# Migration lead verifies integrity daily
```

### Week 4: Dits Primary

```bash
# Old system becomes read-only archive
# All new work happens in Dits
# Old system retired after 30 days
```

---

## Rollback Procedures

If you need to undo the migration:

### Rollback to Git LFS

```bash
# Export from Dits
dits archive --format tar -o project-backup.tar HEAD

# Reinitialize Git LFS
cd /path/to/original/git/repo
tar xf project-backup.tar
git add .
git commit -m "Restore from Dits migration"
git lfs migrate import --include="*.mp4,*.mov,*.psd"
git push --force
```

### Rollback to Cloud Storage

```bash
# Export all files
dits archive --format dir -o /export/path HEAD

# Upload to cloud
# Dropbox: Copy to Dropbox folder
# Google Drive: Copy to Drive folder
# S3: aws s3 sync /export/path s3://bucket/project
```

### Keep Both Systems

```bash
# Dits doesn't prevent you from using other tools
# Keep your old system active if needed
# Use Dits for new work while gradually migrating
```

---

## Getting Help

If you encounter issues during migration:

- **Documentation**: [docs.dits.io/migration](https://docs.dits.io/migration)
- **Discord**: [discord.gg/dits](https://discord.gg/dits) - #migration-help channel
- **GitHub Issues**: [github.com/dits-io/dits/issues](https://github.com/dits-io/dits/issues)
- **Email Support**: migration-support@dits.io (for enterprise customers)

### Common Migration Issues

**"File too large" during migration:**
```bash
# Increase timeout
dits config transfer.timeout 30m

# Or split large files across multiple commits
find . -name "*.mp4" -size +10G | head -5 | xargs dits add
dits commit -m "Add large files (batch 1)"
dits push
```

**"Disk full" during import:**
```bash
# Use external drive
dits init /Volumes/External/project

# Or use sparse checkout
dits clone --filter=sparse https://ditshub.com/org/project
```

**"Permission denied" errors:**
```bash
# Check file permissions
ls -la problematic-file

# Fix permissions if needed
chmod 644 problematic-file

# Retry add
dits add problematic-file
```

---

## Next Steps After Migration

1. **Learn the basics**: [Getting Started Guide](../user-guide/getting-started.md)
2. **Set up your workflow**: [Video Editor's Guide](video-editors.md) or [Game Developer's Guide](game-developers.md)
3. **Configure collaboration**: [Team Setup Guide](../collaboration/team-setup.md)
4. **Optimize performance**: [Performance Guide](../troubleshooting/performance.md)
