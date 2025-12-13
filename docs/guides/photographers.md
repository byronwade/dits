# Photographer's Guide to Dits

A complete workflow guide for professional photographers, photo studios, and teams managing large image libraries.

---

## Table of Contents

1. [Why Photographers Need Version Control](#why-photographers-need-version-control)
2. [Understanding Photo Workflows with Dits](#understanding-photo-workflows-with-dits)
3. [Setting Up Your Photo Repository](#setting-up-your-photo-repository)
4. [Solo Photographer Workflow](#solo-photographer-workflow)
5. [Studio Team Workflow](#studio-team-workflow)
6. [Working with RAW Files](#working-with-raw-files)
7. [Lightroom Integration](#lightroom-integration)
8. [Capture One Integration](#capture-one-integration)
9. [Photoshop Workflow](#photoshop-workflow)
10. [Client Delivery and Archival](#client-delivery-and-archival)
11. [Best Practices](#best-practices)

---

## Why Photographers Need Version Control

### The Problems You're Probably Facing

**Scenario 1: The Retouching Nightmare**
```
ClientProject/
├── portrait_final.psd
├── portrait_final_v2.psd
├── portrait_final_v2_revised.psd
├── portrait_final_v2_revised_FINAL.psd
├── portrait_final_v2_revised_FINAL_withlogo.psd
├── portrait_final_v2_revised_FINAL_withlogo_APPROVED.psd
└── portrait_final_use_this_one.psd
```

**Scenario 2: Catalog Chaos**
- Lightroom catalog on your laptop
- Different catalog on your desktop
- Backup catalog on external drive
- Which one has the latest edits?

**Scenario 3: Team Confusion**
- Photographer shoots, hands off to retoucher
- Retoucher makes edits, sends back
- Photographer makes changes, sends again
- Files overwritten, edits lost

### How Dits Solves These Problems

| Problem | Traditional Approach | Dits Solution |
|---------|---------------------|---------------|
| Version tracking | Filename suffixes | Complete history for every file |
| Collaboration | Email/Dropbox exchange | Real-time sync with locking |
| Storage bloat | Every RAW copy = full size | 80-95% deduplication |
| Finding old versions | Dig through folders | `dits log` and `dits restore` |
| Backup verification | Hope it worked | `dits fsck` verifies integrity |

---

## Understanding Photo Workflows with Dits

### Typical Photography Project Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CAPTURE   │───▶│   IMPORT    │───▶│    EDIT     │───▶│   DELIVER   │
│   (Shoot)   │    │  (Ingest)   │    │  (Retouch)  │    │  (Export)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                         │                  │                   │
                         ▼                  ▼                   ▼
                   dits commit        dits commit         dits tag
                   "Import shoot"    "Color grade"      "client-delivery"
```

### What Gets Tracked

| File Type | How Dits Handles It | Deduplication Potential |
|-----------|---------------------|------------------------|
| RAW (CR2, NEF, ARW) | Chunk-level deduplication | 60-80% across similar shots |
| TIFF | Content-aware chunking | 70-90% between versions |
| PSD | Layer-aware handling | 80-95% between edits |
| JPEG | Standard chunking | 40-60% |
| Catalog files (.lrcat) | Hybrid storage | Text portions get Git-style diff |
| XMP sidecars | Text storage | Full diff support |

---

## Setting Up Your Photo Repository

### Basic Setup

```bash
# Create your photography workspace
mkdir ~/Photography
cd ~/Photography

# Initialize Dits
dits init

# Configure your identity
dits config user.name "Jane Smith Photography"
dits config user.email "jane@janesmithphoto.com"
```

### Recommended Folder Structure

```bash
# Create standard structure
mkdir -p {Clients,Personal,Stock,Archive}
mkdir -p Clients/{2024,2025}
mkdir -p Templates

# Your structure will look like:
Photography/
├── .dits/                    # Dits repository data
├── Clients/
│   ├── 2024/
│   │   ├── 2024-03-15_Smith_Wedding/
│   │   ├── 2024-04-20_Corporate_Headshots/
│   │   └── ...
│   └── 2025/
├── Personal/
│   ├── Landscapes/
│   └── Street/
├── Stock/
│   └── Licensed/
├── Archive/                  # Completed projects
└── Templates/
    ├── Lightroom_Presets/
    └── Photoshop_Actions/
```

### Initial Commit

```bash
# Add your existing work
dits add .

# Create initial commit
dits commit -m "Initial repository setup with existing projects"

# Connect to remote (optional)
dits remote add origin https://ditshub.com/janesmithphoto/portfolio
dits push -u origin main
```

---

## Solo Photographer Workflow

### Daily Workflow

**After a Shoot:**

```bash
cd ~/Photography/Clients/2024/2024-06-15_Johnson_Family

# Import photos from card
# (Use your preferred import method: Lightroom, Photo Mechanic, etc.)

# After import is complete, commit the raw files
dits add RAW/
dits commit -m "Import: Johnson Family session - 247 photos"
```

**During Culling:**

```bash
# After marking selects in Lightroom
dits add *.lrcat *.lrcat-journal
dits commit -m "Cull: Selected 45 photos for editing"
```

**After Editing Session:**

```bash
# Commit your edits
dits add .
dits commit -m "Edit: Color correction and basic retouching - batch 1"
```

**Creating Client Deliverables:**

```bash
# Export from Lightroom/Capture One
# Then commit the exports
dits add Exports/
dits commit -m "Export: Web-res JPEGs for client review"

# Tag for easy reference
dits tag client-review-v1
```

### Workflow Commands Cheat Sheet

```bash
# See what's changed
dits status

# View project history
dits log --oneline

# See changes to specific file
dits log -- path/to/photo.psd

# Restore previous version
dits restore photo.psd --commit abc123

# Compare versions
dits diff HEAD~1 -- photo.psd
```

---

## Studio Team Workflow

### Team Roles and Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PHOTOGRAPHER │───▶│  RETOUCHER   │───▶│    CLIENT    │
│   (shoots)   │    │   (edits)    │    │  (approves)  │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
   main branch        edit branch          final tag
```

### Setting Up Team Repository

**Studio Admin:**
```bash
# Create shared repository
dits init studio-projects
cd studio-projects

# Configure shared settings
dits config lock.patterns "*.psd,*.tiff,*.psb"
dits config lock.required true

# Push to remote
dits remote add origin https://ditshub.com/studio/projects
dits push -u origin main
```

**Team Member Setup:**
```bash
# Each team member clones
dits clone https://ditshub.com/studio/projects
cd projects

# Configure identity
dits config user.name "Alex (Retoucher)"
dits config user.email "alex@studio.com"
```

### Collaborative Editing Workflow

**Photographer Shoots and Uploads:**
```bash
# Create project folder
mkdir 2024-06-20_Product_Shoot
cd 2024-06-20_Product_Shoot

# Import RAW files
# ... (import process)

# Commit and push
dits add .
dits commit -m "Import: Product shoot for ABC Brand - 150 photos"
dits push
```

**Retoucher Begins Work:**
```bash
# Get latest
dits pull

# Lock files before editing
dits lock product_hero.psd --reason "Retouching hero image"

# Work on file...

# Save progress
dits add product_hero.psd
dits commit -m "Retouch: Hero image - skin cleanup, color grade"
dits push

# Release lock when done
dits unlock product_hero.psd
```

**Handling Multiple Retouchers:**
```bash
# Check what's locked
dits locks

# Output:
# Locked files:
#   product_hero.psd     Alex (Retoucher)    "Retouching hero image"
#   lifestyle_01.psd     Jordan (Retoucher)  "Background composite"

# Pick an unlocked file
dits lock product_detail_01.psd --reason "Color correction"
# Work on it...
```

### Branch-Based Workflow

For complex projects with multiple revision rounds:

```bash
# Create branch for client review round
dits branch client-review-v1

# Make edits on branch
dits add .
dits commit -m "Adjustments per client feedback"

# If approved, merge to main
dits checkout main
dits merge client-review-v1

# Tag as final
dits tag final-approved

# Push everything
dits push --all
```

---

## Working with RAW Files

### RAW File Deduplication

Dits excels with RAW files because:
1. Similar photos (same lighting, subject) share many chunks
2. Bracket sequences share significant data
3. Panorama sequences deduplicate heavily

**Example Storage Savings:**

```bash
# After importing 500 RAW files from a wedding (150GB):
dits repo-stats

# Output:
# Total files: 500
# Total size: 150.2 GB
# Deduplicated size: 42.8 GB
# Savings: 71.5%
```

### Organizing RAW vs Derivatives

```bash
# Recommended structure per project:
ProjectName/
├── RAW/                    # Original camera files
│   ├── Card1/
│   └── Card2/
├── Selects/                # Curated RAW files (or symlinks)
├── Working/                # PSD/TIFF work files
├── Exports/                # Final deliverables
│   ├── Web/
│   ├── Print/
│   └── Archive/
├── Catalog/                # Lightroom/C1 catalog
└── Notes/                  # Shot notes, client briefs
```

### XMP Sidecar Handling

Dits handles XMP sidecars intelligently:

```bash
# XMP files are stored as text (Git-style)
# This means you get:
# - Line-by-line diff of edits
# - Merge support for non-conflicting changes
# - Tiny storage footprint

# View XMP changes
dits diff HEAD~1 -- photo.xmp

# Output shows actual settings changed:
# -  <crs:Temperature>5200</crs:Temperature>
# +  <crs:Temperature>5500</crs:Temperature>
# -  <crs:Exposure>0.00</crs:Exposure>
# +  <crs:Exposure>+0.30</crs:Exposure>
```

---

## Lightroom Integration

### Catalog Management Strategy

**Option 1: One Catalog Per Project (Recommended for Teams)**
```bash
ProjectName/
├── catalog/
│   ├── ProjectName.lrcat
│   └── ProjectName Previews.lrdata/
├── RAW/
└── Exports/

# Track the catalog
dits add catalog/
dits commit -m "Catalog: Initial import and ratings"
```

**Option 2: Master Catalog (Solo Photographers)**
```bash
Photography/
├── Master_Catalog/
│   ├── Photography.lrcat
│   └── Photography Previews.lrdata/
└── Projects/
    └── ... (organized by date/client)

# Track catalog separately
dits add Master_Catalog/Photography.lrcat
dits commit -m "Catalog: June 2024 edits"

# Note: Don't track Previews.lrdata (regeneratable)
```

### .ditsignore for Lightroom

Create a `.ditsignore` file:

```bash
# .ditsignore

# Lightroom previews (regeneratable, huge)
*.lrdata/
Previews/
Smart Previews/

# Lightroom temp files
*.lrcat-journal
*.lrcat.lock
*.lrcat-wal
*.lrcat-shm

# Backups (Lightroom makes its own)
Backups/

# Temporary exports
temp_exports/
```

### Workflow: Lightroom to Photoshop Round-Trip

```bash
# 1. Edit in Lightroom, send to Photoshop
#    (Right-click → Edit In → Photoshop)

# 2. Lightroom creates TIFF/PSD, opens in Photoshop

# 3. Save in Photoshop (Cmd+S)

# 4. Back in Lightroom, you see the edited file

# 5. Commit your work
dits add photo-Edit.psd
dits add catalog/
dits commit -m "Retouch: Portrait cleanup in Photoshop"
```

### Lightroom Presets with Dits

```bash
# Store presets in your repository
mkdir -p Templates/Lightroom_Presets

# Copy your presets here
cp -r ~/Library/Application\ Support/Adobe/Lightroom/Develop\ Presets/* \
    Templates/Lightroom_Presets/

# Track them
dits add Templates/Lightroom_Presets/
dits commit -m "Add studio Lightroom presets"

# Team members can sync presets
dits pull
cp -r Templates/Lightroom_Presets/* \
    ~/Library/Application\ Support/Adobe/Lightroom/Develop\ Presets/
```

---

## Capture One Integration

### Catalog vs Sessions

**Sessions (Recommended for Dits):**
```bash
# Capture One Session structure
ProjectName.cosessiondb/
├── CaptureOne/          # Processing settings
├── Selects/             # Marked selects
├── Output/              # Exported files
├── Trash/               # Deleted files
└── [RAW files]          # Your images

# Initialize Dits in session folder
cd ProjectName.cosessiondb
dits init
dits add .
dits commit -m "Initial session: Product shoot day 1"
```

**Catalogs:**
```bash
# For catalogs, track the .cocatalog file
dits add MyCatalog.cocatalog
# Don't track cache folders (*.cache)
```

### .ditsignore for Capture One

```bash
# .ditsignore

# Capture One caches
*.cache/
CaptureOne/Cache/
Proxies/

# Temporary files
*.tmp
*.lock

# System files
.DS_Store
Thumbs.db
```

### Capture One Styles with Dits

```bash
# Store styles in repository
mkdir -p Templates/CaptureOne_Styles

# Export styles from Capture One
# File → Export → Styles

# Track them
dits add Templates/CaptureOne_Styles/
dits commit -m "Add product photography styles"
```

---

## Photoshop Workflow

### PSD Version Control

Dits handles PSDs exceptionally well due to their layered structure:

```bash
# Large PSD files deduplicate heavily between versions
# Because unchanged layers share chunks

# Example: 500MB PSD with 50 layers
# After 10 saves with minor edits:
# - Traditional: 5GB (10 × 500MB)
# - With Dits: ~800MB (84% savings)
```

### Best Practices for PSDs

**Frequent Commits:**
```bash
# After significant work
dits add portrait_retouch.psd
dits commit -m "Retouch: Skin cleanup complete"

# After another phase
dits add portrait_retouch.psd
dits commit -m "Retouch: Color grading applied"

# After final tweaks
dits add portrait_retouch.psd
dits commit -m "Retouch: Final polish - ready for review"
```

**Using Branches for Client Revisions:**
```bash
# Client wants to see alternative color grades
dits branch color-option-warm
dits add portrait.psd
dits commit -m "Alternative: Warm color grade"

dits checkout main
dits branch color-option-cool
dits add portrait.psd
dits commit -m "Alternative: Cool color grade"

# Client chooses warm version
dits checkout main
dits merge color-option-warm
dits commit -m "Final: Client approved warm grade"
```

### Photoshop Actions with Dits

```bash
# Store actions in repository
mkdir -p Templates/Photoshop_Actions

# Export actions from Photoshop
# Window → Actions → Menu → Save Actions

# Track them
dits add Templates/Photoshop_Actions/
dits commit -m "Add studio retouching actions"
```

---

## Client Delivery and Archival

### Preparing Client Deliverables

```bash
# Create export directory
mkdir -p Exports/Client_Review_2024-06-20

# Export from Lightroom/Capture One/Photoshop
# ... (export process)

# Commit exports
dits add Exports/
dits commit -m "Export: Client review gallery - 45 images"

# Tag for reference
dits tag client-review-2024-06-20
```

### Final Delivery Workflow

```bash
# After client approval, create final exports
mkdir -p Exports/Final_Delivery

# Export high-res versions
# ... (export process)

# Commit and tag
dits add Exports/Final_Delivery/
dits commit -m "Final delivery: High-res JPEGs and TIFFs"
dits tag final-delivery-2024-06-25

# Push to remote
dits push --tags
```

### Archival Strategy

```bash
# After project completion, archive
# 1. Ensure everything is committed
dits status

# 2. Tag as archived
dits tag archived-2024-06-Johnson-Family

# 3. Push to remote for backup
dits push --tags

# 4. Optionally, move to Archive folder
mv 2024-06-15_Johnson_Family ../Archive/2024/

# 5. Update repository
dits add Archive/
dits commit -m "Archive: Johnson Family project completed"
```

### Retrieving Archived Projects

```bash
# Find archived project
dits log --all --grep="Johnson"

# Restore specific version
dits restore --commit archived-2024-06-Johnson-Family -- .

# Or create a branch to review without affecting main
dits branch review-johnson-archive archived-2024-06-Johnson-Family
dits checkout review-johnson-archive
```

---

## Best Practices

### Commit Message Guidelines

```bash
# Use prefixes for clarity:
dits commit -m "Import: [description]"      # New photos
dits commit -m "Cull: [description]"        # Selection/rating
dits commit -m "Edit: [description]"        # Lightroom/C1 edits
dits commit -m "Retouch: [description]"     # Photoshop work
dits commit -m "Export: [description]"      # Deliverables
dits commit -m "Archive: [description]"     # Project completion

# Examples:
dits commit -m "Import: Wedding ceremony - 350 photos"
dits commit -m "Cull: Selected 80 photos for editing"
dits commit -m "Edit: Color correction pass 1"
dits commit -m "Retouch: Bride portrait - skin cleanup"
dits commit -m "Export: Social media sizes for client"
```

### Tag Naming Conventions

```bash
# Milestone tags
dits tag import-complete
dits tag culling-complete
dits tag editing-complete
dits tag client-review-v1
dits tag client-approved
dits tag final-delivery
dits tag archived

# Date-based tags
dits tag 2024-06-20-client-review
dits tag 2024-06-25-final-delivery

# Version tags
dits tag v1.0-initial-edit
dits tag v2.0-client-revisions
dits tag v3.0-final
```

### Storage Optimization

```bash
# Check repository size
dits repo-stats

# Run garbage collection periodically
dits gc

# For very large repositories, use sparse checkout
dits clone --filter=sparse https://ditshub.com/studio/archive
dits sparse add 2024/Johnson_Family/

# Only download what you need
dits pull
```

### Backup Strategy

```bash
# Remote backup (primary)
dits remote add backup https://backup.ditshub.com/studio/projects
dits push backup main

# Local backup to external drive
dits clone --mirror . /Volumes/Backup/studio-mirror

# Verify backups
dits -C /Volumes/Backup/studio-mirror fsck
```

### Team Communication

```bash
# Use commit messages to communicate
dits commit -m "Edit: Color grade done - ready for @retoucher review"

# Check project history before starting
dits log --oneline -20

# See who worked on what
dits log --author="Alex" --since="last week"

# Check current locks before editing
dits locks
```

---

## Common Scenarios

### Scenario: Client Wants Older Edit Style

```bash
# Find the version with the style they liked
dits log --oneline

# abc123 Edit: Warm color grade
# def456 Edit: Cool color grade (current)

# Restore just that file to the older version
dits restore portrait.psd --commit abc123

# Or compare side-by-side
dits show abc123:portrait.psd > portrait_warm.psd
# Now you have both versions to work with
```

### Scenario: Recovering Deleted Photos

```bash
# Find when file was deleted
dits log --diff-filter=D -- photo.jpg

# Restore from commit before deletion
dits restore photo.jpg --commit abc123^

# Add back to repository
dits add photo.jpg
dits commit -m "Restore: Recovered deleted photo"
```

### Scenario: Merging Work from Two Computers

```bash
# On laptop (made edits while traveling)
dits add .
dits commit -m "Edit: Mobile edits from location shoot"
dits push

# On desktop (has different edits)
dits pull

# If conflicts:
dits status
# Shows: both modified: portrait.psd

# For PSD conflicts, choose one version
dits restore --ours portrait.psd   # Keep desktop version
# OR
dits restore --theirs portrait.psd # Keep laptop version

dits add portrait.psd
dits commit -m "Merge: Combined laptop and desktop work"
```

### Scenario: Collaborating with External Retoucher

```bash
# Share project via P2P (no cloud account needed)
dits p2p share

# Share the join code with retoucher
# Code: ABC-123-XYZ

# Retoucher connects:
dits p2p connect ABC-123-XYZ ./client-project

# After retoucher finishes and shares back:
dits pull  # Get their changes
```

---

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| Import new photos | `dits add RAW/ && dits commit -m "Import: ..."` |
| Save edit progress | `dits add . && dits commit -m "Edit: ..."` |
| See what changed | `dits status` |
| View history | `dits log` |
| Restore old version | `dits restore file --commit abc123` |
| Share with team | `dits push` |
| Get team changes | `dits pull` |
| Lock file for editing | `dits lock file.psd` |
| Release lock | `dits unlock file.psd` |
| Tag milestone | `dits tag milestone-name` |

### Keyboard-Friendly Aliases

Add to your shell config (`.bashrc` or `.zshrc`):

```bash
# Dits aliases for photography workflow
alias ds='dits status'
alias dl='dits log --oneline -20'
alias da='dits add'
alias dc='dits commit -m'
alias dp='dits push'
alias dpl='dits pull'
alias dlk='dits lock'
alias dulk='dits unlock'
alias dlks='dits locks'

# Usage:
# ds              → dits status
# dc "Import day 1" → dits commit -m "Import day 1"
```

---

## Getting Help

- **Documentation**: [docs.dits.io](https://docs.dits.io)
- **Photography Community**: [discord.gg/dits](https://discord.gg/dits) #photographers channel
- **Video Tutorials**: [youtube.com/@dits](https://youtube.com/@dits)
- **Email Support**: support@dits.io
