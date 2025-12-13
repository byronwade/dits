# Video Editor's Guide to Dits

This comprehensive guide covers everything video editors need to know about using Dits for version control in their editing workflows. Whether you're using Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, or Avid Media Composer, this guide will help you integrate Dits into your professional workflow.

---

## Table of Contents

1. [Why Dits for Video Editing?](#why-dits-for-video-editing)
2. [Understanding Video-Aware Version Control](#understanding-video-aware-version-control)
3. [Setting Up Your Editing Environment](#setting-up-your-editing-environment)
4. [Premiere Pro Workflow](#premiere-pro-workflow)
5. [DaVinci Resolve Workflow](#davinci-resolve-workflow)
6. [Final Cut Pro Workflow](#final-cut-pro-workflow)
7. [Avid Media Composer Workflow](#avid-media-composer-workflow)
8. [Managing Footage and Media](#managing-footage-and-media)
9. [Collaboration Workflows](#collaboration-workflows)
10. [Working with Colorists](#working-with-colorists)
11. [Working with Sound Designers](#working-with-sound-designers)
12. [Working with VFX Artists](#working-with-vfx-artists)
13. [Proxy Workflows](#proxy-workflows)
14. [Project Organization Best Practices](#project-organization-best-practices)
15. [Version Control Strategies](#version-control-strategies)
16. [Backup and Archiving](#backup-and-archiving)
17. [Performance Optimization](#performance-optimization)
18. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Why Dits for Video Editing?

### The Old Way: File Naming Chaos

Sound familiar?

```
Commercial_v1.prproj
Commercial_v2.prproj
Commercial_v2_final.prproj
Commercial_v2_final_FINAL.prproj
Commercial_v2_final_FINAL_client_changes.prproj
Commercial_v2_final_FINAL_client_changes_APPROVED.prproj
```

And then your client asks: "Can we see what version 2 looked like before the changes?"

### The Dits Way: Professional Version Control

```bash
dits log --oneline
# abc1234 Client approved - final delivery
# def5678 Apply client revisions round 2
# 890abcd Initial client review cut
# 1234567 Director's cut complete
# 89abcde Rough cut - all scenes assembled
# cdef012 Add footage for scene 5
# 3456789 Initial project setup
```

Jump to any version instantly:

```bash
# View what the project looked like at rough cut
dits checkout 89abcde

# Compare current with director's cut
dits diff 1234567 HEAD

# Go back to latest
dits switch main
```

### Key Benefits for Video Editors

| Feature | Benefit |
|---------|---------|
| **Version history** | Every save is tracked; go back to any point |
| **Branching** | Try multiple edit approaches simultaneously |
| **Deduplication** | 10 versions of a 50GB project ≠ 500GB storage |
| **Collaboration** | Multiple editors on the same project safely |
| **Backup** | Your entire project history synced to the cloud |
| **Review** | Share specific versions for client review |

---

## Understanding Video-Aware Version Control

### How Dits Handles Video Files

Unlike Git (which treats binary files as opaque blobs), Dits understands video:

```
┌─────────────────────────────────────────────────────────────────┐
│                         MP4/MOV FILE                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐                                                    │
│  │   ftyp   │  File type declaration                            │
│  └──────────┘                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        moov                               │   │
│  │  ┌────────┐ ┌────────┐ ┌────────────────────────────┐   │   │
│  │  │  mvhd  │ │  trak  │ │  Metadata, timecodes,      │   │   │
│  │  └────────┘ └────────┘ │  keyframe positions        │   │   │
│  │                        └────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        mdat                               │   │
│  │  ┌────────┬────────┬────────┬────────┬────────┬──────┐  │   │
│  │  │Frame 1 │Frame 2 │Frame 3 │Frame 4 │Frame 5 │ ...  │  │   │
│  │  │(I)     │(P)     │(P)     │(I)     │(P)     │      │  │   │
│  │  └────────┴────────┴────────┴────────┴────────┴──────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**What Dits does:**

1. **Parses the container**: Understands MP4/MOV/MXF structure
2. **Identifies keyframes**: Finds I-frame positions in the video stream
3. **Chunks at boundaries**: Splits at keyframes for optimal deduplication
4. **Preserves metadata**: Keeps timecodes, markers, chapters intact

### Why This Matters

**Scenario**: You re-export a video with a 2-second change at the end.

| System | Storage Used |
|--------|--------------|
| Git | Full file again (10 GB + 10 GB = 20 GB) |
| Dits | Only changed chunks (~200 MB for the edit) |

**Result**: 98% storage savings on typical re-renders.

---

## Setting Up Your Editing Environment

### Initial Setup

```bash
# 1. Install Dits (macOS)
brew tap dits-io/dits
brew install dits

# 2. Install VFS support
brew install macfuse

# 3. Configure your identity
dits config --global user.name "Your Name"
dits config --global user.email "you@yourcompany.com"

# 4. Set editor-friendly defaults
dits config --global core.editor "code --wait"  # VS Code
dits config --global diff.binary true
```

### Recommended Project Structure

```
project-name/
├── .dits/                    # Dits repository data
├── .ditsignore               # Files to exclude from version control
│
├── 01_RAW/                   # Camera original footage
│   ├── A_CAM/
│   │   ├── CARD_001/
│   │   └── CARD_002/
│   ├── B_CAM/
│   └── DRONE/
│
├── 02_PROXY/                 # Proxy media (optional, can exclude)
│   └── ...
│
├── 03_PROJECT/               # NLE project files
│   ├── MyProject.prproj     # Premiere Pro
│   ├── MyProject.drp        # DaVinci Resolve
│   └── MyProject.fcpbundle/ # Final Cut Pro
│
├── 04_AUDIO/                 # Audio assets
│   ├── music/
│   ├── sfx/
│   └── vo/
│
├── 05_GFX/                   # Graphics and motion graphics
│   ├── lower_thirds/
│   └── logos/
│
├── 06_EXPORTS/               # Rendered outputs
│   ├── drafts/
│   ├── reviews/
│   └── masters/
│
└── 07_DOCUMENTS/             # Scripts, notes, etc.
    ├── script.pdf
    └── notes.txt
```

### Creating a .ditsignore File

Exclude files that shouldn't be version controlled:

```bash
# .ditsignore

# Premiere Pro cache
Adobe Premiere Pro Auto-Save/
Media Cache/
*.pek
*.pkf
*.cfa

# DaVinci Resolve cache
CacheClip/
.optimized/

# Final Cut Pro render files
*/Render Files/
*/Transcoded Media/

# System files
.DS_Store
Thumbs.db
*.tmp

# Proxy files (if you regenerate them)
02_PROXY/

# Export drafts (optional - you may want to track these)
06_EXPORTS/drafts/
```

---

## Premiere Pro Workflow

### Setting Up a New Premiere Pro Project

```bash
# Create project directory
mkdir -p ~/Projects/commercial-2025
cd ~/Projects/commercial-2025

# Initialize Dits
dits init

# Create the project structure
mkdir -p {01_RAW,02_PROXY,03_PROJECT,04_AUDIO,05_GFX,06_EXPORTS,07_DOCUMENTS}

# Create .ditsignore
cat > .ditsignore << 'EOF'
Adobe Premiere Pro Auto-Save/
Media Cache/
*.pek
*.pkf
*.cfa
.DS_Store
02_PROXY/
EOF

# Initial commit
dits add .ditsignore
dits commit -m "Initial project setup"
```

### Working with Premiere Pro Projects

**Understanding .prproj files:**

Premiere Pro project files are gzip-compressed XML. Dits handles these efficiently:

```bash
# Add your project file
dits add 03_PROJECT/Commercial.prproj

# Dits output:
# Adding 03_PROJECT/Commercial.prproj...
#   Type: Premiere Pro Project (compressed XML)
#   Size: 15.2 MB
#   Strategy: Hybrid (Git text + Dits chunks)
# Done.
```

**Daily workflow:**

```bash
# Start of day: Check status
dits status

# Before major changes: Create a branch
dits branch edit/scene-5-revision
dits switch edit/scene-5-revision

# After making changes in Premiere
dits add 03_PROJECT/Commercial.prproj
dits commit -m "Revise scene 5: tighten pacing, add B-roll"

# When satisfied: Merge back to main
dits switch main
dits merge edit/scene-5-revision

# Optional: Delete the branch
dits branch -d edit/scene-5-revision
```

### Handling Premiere Pro Auto-Save

Premiere's auto-save creates many backup files. Here's how to handle them:

**Option 1: Ignore auto-saves (recommended)**

```bash
# In .ditsignore
Adobe Premiere Pro Auto-Save/
```

**Option 2: Track auto-saves in a separate branch**

```bash
# Create auto-save tracking branch
dits branch auto-saves
dits switch auto-saves

# Commit auto-saves periodically
dits add "Adobe Premiere Pro Auto-Save/"
dits commit -m "Auto-save backup $(date +%Y-%m-%d)"

# Switch back to main for real work
dits switch main
```

### Premiere Pro Media Cache

Premiere creates cache files for faster playback. These should NOT be tracked:

```bash
# Add to .ditsignore
Media Cache/
Media Cache Files/
Peak Files/
*.pek
*.pkf
*.cfa
```

**Tip**: Store media cache on a separate fast drive, not in your project folder:

`Premiere Pro → Preferences → Media Cache → Browse → (Select external SSD)`

### Importing Footage

```bash
# Copy footage to project
cp -r /Volumes/CARD_001/* 01_RAW/A_CAM/CARD_001/

# Add to Dits (this may take a while for large footage)
dits add 01_RAW/

# Commit
dits commit -m "Import A-cam footage from shoot day 1"

# Check storage efficiency
dits repo-stats
```

### Exporting and Tracking Renders

```bash
# After exporting from Premiere
mv ~/Desktop/Commercial_Draft_v1.mp4 06_EXPORTS/reviews/

# Track the export
dits add 06_EXPORTS/reviews/Commercial_Draft_v1.mp4
dits commit -m "Export: Draft v1 for client review"

# Tag for easy reference
dits tag review-v1 -m "Client review cut - Feb 15"
```

### Dynamic Link with After Effects

If you use Dynamic Link with After Effects:

```bash
# Project structure
03_PROJECT/
├── Commercial.prproj
└── Commercial_AE_Comps/
    ├── Lower_Third.aep
    ├── Logo_Animation.aep
    └── VFX_Shot_01.aep

# Track both Premiere and AE projects
dits add 03_PROJECT/
dits commit -m "Add motion graphics: lower thirds and logo animation"
```

---

## DaVinci Resolve Workflow

### Setting Up DaVinci Resolve

DaVinci Resolve can work with either:
1. **Database projects** (stored in PostgreSQL/disk database)
2. **Project files** (.drp files)

**For Dits, use .drp project files:**

```
DaVinci Resolve → Project Manager → Right-click project → Export Project Archive
```

Or enable project files by default:
```
Preferences → User → Project Save and Load → Project Backups → Save project to: Specific Location
```

### DaVinci Resolve Project Structure

```
project-name/
├── .dits/
├── .ditsignore
├── 01_RAW/                   # Original camera footage
├── 02_PROXY/                 # Optimized media
├── 03_PROJECT/
│   ├── MyProject.drp         # Main project file
│   └── MyProject.dra         # Project archive (optional)
├── 04_AUDIO/
├── 05_GFX/
│   ├── fusion/               # Fusion compositions
│   └── titles/
├── 06_EXPORTS/
│   ├── timelines/            # Individual timeline exports
│   ├── dailies/              # Daily review exports
│   └── masters/              # Final masters
└── 07_DOCUMENTS/
    └── EDLs/                 # EDL/XML exports for interchange
```

### .ditsignore for Resolve

```bash
# .ditsignore for DaVinci Resolve

# Resolve cache directories
CacheClip/
.fusion/
.gallery/

# Optimized media (regenerated from source)
02_PROXY/

# Render cache
Render Cache/

# System files
.DS_Store
Thumbs.db
```

### Workflow: Edit in Resolve

```bash
# Initialize project
cd ~/Projects/documentary-2025
dits init

# Import footage
dits add 01_RAW/
dits commit -m "Import interview footage - Day 1"

# Save Resolve project as .drp
# In Resolve: File → Export Project...
# Save to: 03_PROJECT/Documentary.drp

dits add 03_PROJECT/Documentary.drp
dits commit -m "Initial Resolve project - sync audio complete"

# Create branch for color grading
dits branch grade/look-development
dits switch grade/look-development

# Work on color...
# Save project again (same filename overwrites)

dits add 03_PROJECT/Documentary.drp
dits commit -m "Color: Develop initial look for interviews"

# Happy with the grade? Merge to main
dits switch main
dits merge grade/look-development
```

### Collaboration: Editor + Colorist

**Editor's workflow:**

```bash
# Editor finishes locked cut
dits add 03_PROJECT/Documentary.drp
dits commit -m "Picture lock - v1.0"
dits tag picture-lock-v1

# Share with colorist
dits p2p share
# → Join code: ABC-123
```

**Colorist's workflow:**

```bash
# Clone the project
dits p2p connect ABC-123 ./documentary
cd documentary

# Create color branch
dits branch grade/pass-1
dits switch grade/pass-1

# Do color grading...

dits add 03_PROJECT/Documentary.drp
dits commit -m "Color: Complete first pass grade"

# Share back
dits p2p share
# → Join code: DEF-456
```

**Editor receives color:**

```bash
# Fetch colorist's work
dits remote add colorist dits://peer/DEF-456
dits fetch colorist

# Review and merge
dits merge colorist/grade/pass-1
```

### Resolve Timelines and Versions

Use branches for different timeline versions:

```bash
# Main timeline
dits branch timeline/main
dits switch timeline/main
# Work on main cut...

# Alternative cut
dits branch timeline/directors-cut
dits switch timeline/directors-cut
# Work on director's version...

# Client version (shorter)
dits branch timeline/social-cut
dits switch timeline/social-cut
# Create 60-second version...

# Compare timelines
dits diff timeline/main timeline/directors-cut
```

---

## Final Cut Pro Workflow

### Understanding Final Cut Pro Libraries

Final Cut Pro uses a library-based structure:

```
MyProject.fcpbundle/           # The "library" (actually a folder)
├── MyProject Library.fcpbundle/
│   ├── Settings.plist
│   ├── CurrentVersion.flexolibrary
│   ├── MyProject.fcplibrary
│   └── [Event folders]/
│       ├── Original Media/      # Imported media (optional)
│       ├── Render Files/        # Rendered effects
│       ├── Transcoded Media/    # Proxies and optimized
│       └── Analysis Files/      # Audio analysis, etc.
```

### .ditsignore for Final Cut Pro

```bash
# .ditsignore for Final Cut Pro

# Render and analysis files (regenerated by FCP)
*/Render Files/
*/Analysis Files/
*/Transcoded Media/

# High quality media (track source files separately)
*/Original Media/

# System
.DS_Store
```

### Project Structure for FCP

```
project-name/
├── .dits/
├── .ditsignore
├── 01_SOURCE/                # Original media (external to library)
│   ├── camera_footage/
│   ├── audio/
│   └── graphics/
├── 02_LIBRARY/               # FCP library
│   └── MyProject.fcpbundle/
├── 03_EXPORTS/
│   ├── drafts/
│   └── masters/
└── 04_DOCUMENTS/
```

### Setting Up Final Cut Pro

**Important**: Store media outside the library for better Dits integration:

1. Create library: `File → New → Library`
2. In library settings: Uncheck "Copy to library"
3. Keep footage in `01_SOURCE/`

### Workflow: FCP Project

```bash
# Initialize
cd ~/Projects/wedding-video
dits init

# Add source media
dits add 01_SOURCE/
dits commit -m "Import wedding footage - ceremony and reception"

# Create library (in FCP)
# Save to: 02_LIBRARY/Wedding.fcpbundle/

# Add library to Dits
dits add 02_LIBRARY/
dits commit -m "Initial FCP library - footage imported"

# After editing
dits add 02_LIBRARY/Wedding.fcpbundle/
dits commit -m "Complete ceremony edit - rough cut"

# Create branch for alternate versions
dits branch edit/highlight-reel
dits switch edit/highlight-reel

# Edit the highlight version...

dits add 02_LIBRARY/
dits commit -m "5-minute highlight reel complete"
```

### Compressor Integration

Track Compressor settings:

```bash
# Export Compressor settings
# Compressor → Settings → Export Selected...
# Save to: 04_DOCUMENTS/compressor-settings/

dits add 04_DOCUMENTS/compressor-settings/
dits commit -m "Add Compressor delivery presets"
```

---

## Avid Media Composer Workflow

### Understanding Avid Projects

Avid Media Composer uses:
- **.avp** files: Project settings
- **Bins (.avb)**: Media and sequence references
- **Avid MediaFiles**: Actual media (MXF files)

### Project Structure for Avid

```
project-name/
├── .dits/
├── .ditsignore
├── 01_SOURCE/                # Original camera media
├── 02_AVID_PROJECT/          # Avid project folder
│   ├── MyProject.avp
│   ├── MyProject Bins/
│   │   ├── Assembly.avb
│   │   ├── Selects.avb
│   │   └── Sequences.avb
│   └── Settings/
├── 03_AVID_MEDIAFILES/       # Linked MXF media
│   └── MXF/
│       └── 1/
├── 04_EXPORTS/
└── 05_DOCUMENTS/
    └── EDLs/
```

### .ditsignore for Avid

```bash
# .ditsignore for Avid Media Composer

# Media files (track source separately)
03_AVID_MEDIAFILES/

# Statistics and logs
Statistics/
*.log

# Cache and temp
SearchData/
.DS_Store
```

### Workflow: Avid Project

```bash
# Initialize
dits init

# Add source media
dits add 01_SOURCE/
dits commit -m "Import original camera footage"

# Add Avid project (bins and settings, not media)
dits add 02_AVID_PROJECT/
dits commit -m "Initial Avid project setup"

# After editing
dits add 02_AVID_PROJECT/
dits commit -m "Rough cut complete - all scenes assembled"

# Export sequence for review
avidmediaexporter ... > 04_EXPORTS/rough_cut.mov
dits add 04_EXPORTS/rough_cut.mov
dits commit -m "Export rough cut for director review"
```

### Avid Bin Locking

Avid uses bin locking for collaboration. Combined with Dits:

```bash
# Before editing a sequence
dits lock 02_AVID_PROJECT/MyProject\ Bins/Sequences.avb --reason "Editing main sequence"

# Do your edits in Avid...

# When done
dits add 02_AVID_PROJECT/
dits commit -m "Complete scene 3 edit"
dits unlock 02_AVID_PROJECT/MyProject\ Bins/Sequences.avb
```

---

## Managing Footage and Media

### Importing Camera Original Footage

```bash
# Copy from camera card
rsync -av --progress /Volumes/SONY_CARD/ 01_RAW/A_CAM/CARD_001/

# Verify copy integrity
md5sum 01_RAW/A_CAM/CARD_001/*.MP4 > checksums.md5

# Add to Dits
dits add 01_RAW/A_CAM/CARD_001/
dits add checksums.md5
dits commit -m "Ingest: A-cam footage, card 001 (verified)"
```

### Organizing Multiple Cameras

```bash
01_RAW/
├── A_CAM/              # Main camera
│   ├── CARD_001/
│   └── CARD_002/
├── B_CAM/              # Secondary camera
│   └── CARD_001/
├── C_CAM/              # C-camera / gimbal
│   └── CARD_001/
├── DRONE/              # Drone footage
│   └── DJI_001/
└── AUDIO/              # External audio recorder
    └── ZOOM_001/
```

### Tracking Different Takes

Use commit messages and tags effectively:

```bash
# Commit each shoot day separately
dits add 01_RAW/A_CAM/CARD_003/
dits commit -m "Day 2: Interview pickups and B-roll city streets"

# Tag significant footage
dits tag footage/interview-main -m "Main interview - best take at 00:15:30"
```

### Dealing with Large Footage Volumes

For very large projects (1TB+):

```bash
# Enable progress display
dits config --local progress.show true

# Add in batches
dits add 01_RAW/A_CAM/ --progress
dits commit -m "Add A-cam footage"

dits add 01_RAW/B_CAM/ --progress
dits commit -m "Add B-cam footage"

# Check deduplication
dits repo-stats
```

### Archive vs Working Media

Consider a two-tier approach:

```bash
# Archive tier (full quality, not always needed)
01_RAW/
├── ARCHIVE/           # Original camera files
└── WORKING/           # Transcoded working copies

# Track archive
dits add 01_RAW/ARCHIVE/
dits commit -m "Archive: Original camera masters"

# Freeze archive to cold storage
dits freeze 01_RAW/ARCHIVE/ --tier cold
```

---

## Collaboration Workflows

### Solo Editor with Client Review

```bash
# Editor workflow
dits init
dits add .
dits commit -m "Initial project setup"

# Work on edit...
dits commit -m "Complete rough cut"
dits tag review-v1

# Export for client
dits add 06_EXPORTS/reviews/
dits commit -m "Export review v1"

# Share with client (they only see exports)
# Could use DitsHub sharing or simple file share

# Receive feedback, make changes
dits commit -m "Apply client feedback: shorten intro, add B-roll"
dits tag review-v2

# Continue until approved
dits tag final-approved
```

### Two Editors on Same Project

```bash
# Editor A: Set up project
dits init
dits add .
dits commit -m "Initial project"
dits p2p share
# → ABC-123

# Editor B: Clone project
dits p2p connect ABC-123 ./project
cd project

# Editor A: Works on scenes 1-3
dits branch edit/scenes-1-3
dits switch edit/scenes-1-3
# Edit...
dits commit -m "Complete scenes 1-3"

# Editor B: Works on scenes 4-6
dits branch edit/scenes-4-6
dits switch edit/scenes-4-6
# Edit...
dits commit -m "Complete scenes 4-6"

# Merge: Editor A merges B's work
dits fetch origin
dits merge origin/edit/scenes-4-6

# Resolve any conflicts
dits locks  # Check for locked files
dits status  # See conflict status
```

### Editor + Assistant Editor

```bash
# Lead Editor: Main creative decisions
dits branch main  # Work here

# Assistant Editor: Syncing, organizing, selects
dits branch assist/sync-footage
dits switch assist/sync-footage

# Sync audio to video
# Organize bins
# Create selects sequences

dits commit -m "Sync complete: Day 1 footage with multicam"

# Lead Editor reviews and merges
dits switch main
dits merge assist/sync-footage
```

### Remote Collaboration

For collaborators in different locations:

```bash
# Option 1: P2P direct (both online at same time)
dits p2p share  # Person A
dits p2p connect ABC-123 ./project  # Person B

# Option 2: DitsHub cloud (async collaboration)
dits remote add origin https://ditshub.com/team/project
dits push -u origin main

# Person B clones
dits clone https://ditshub.com/team/project

# Regular sync
dits pull  # Get others' changes
dits push  # Share your changes
```

---

## Working with Colorists

### Handoff to Colorist

**Editor prepares:**

```bash
# Ensure picture lock
dits tag picture-lock-v1 -m "Picture locked for color"

# Export reference movie with handles
# (In your NLE, export with burned-in timecode)

dits add 06_EXPORTS/for_color/
dits commit -m "Color handoff: Reference with TC, EDL, and XML"

# Share project
dits p2p share
# → ABC-123
```

**Colorist receives:**

```bash
# Clone project
dits p2p connect ABC-123 ./project
cd project

# Create color branch
dits branch color/grade-v1
dits switch color/grade-v1

# Import into DaVinci Resolve
# Do color grading...

# Save project
dits add 03_PROJECT/
dits commit -m "Color: Complete primary grade"

# Export graded media
dits add 06_EXPORTS/from_color/
dits commit -m "Color: Export graded ProRes masters"

# Push back
dits push
```

**Editor receives color:**

```bash
# Fetch colorist's work
dits pull

# Review color branch
dits diff picture-lock-v1 color/grade-v1

# Relink graded footage in NLE
# Verify grade

# Merge when approved
dits merge color/grade-v1
dits commit -m "Color: Approved grade integrated"
```

### Round-Trip Color Workflow

```bash
# Version tracking
dits tag color-v1  # Initial grade
# Changes needed...
dits tag color-v2  # Revisions
# Final approval
dits tag color-final
```

---

## Working with Sound Designers

### Audio Handoff

**Editor prepares:**

```bash
# Export OMF/AAF from NLE
dits add 06_EXPORTS/for_audio/
dits commit -m "Audio handoff: OMF with handles, dialogue edit complete"
dits tag audio-handoff-v1
```

**Sound designer workflow:**

```bash
# Get project
dits clone [project-url]
dits branch audio/mix-v1
dits switch audio/mix-v1

# Work in Pro Tools / Nuendo...

# Export stems and final mix
dits add 04_AUDIO/mix/
dits commit -m "Audio: Final mix - stereo and 5.1 stems"
dits push
```

**Editor receives audio:**

```bash
dits pull
dits merge audio/mix-v1

# Import mix back to NLE
# Layback audio
dits commit -m "Audio: Layback final mix"
```

---

## Working with VFX Artists

### VFX Shot Tracking

```bash
# Create VFX tracking structure
05_VFX/
├── shots/
│   ├── VFX_001/
│   │   ├── plates/           # Original plates
│   │   ├── elements/         # Additional elements
│   │   ├── renders/          # VFX renders
│   │   └── project/          # Nuke/AE project
│   ├── VFX_002/
│   └── VFX_003/
└── reference/
    └── styleframes/
```

### VFX Workflow

**Editor prepares plates:**

```bash
# Export VFX plates
dits add 05_VFX/shots/VFX_001/plates/
dits commit -m "VFX: Export plates for shot 001 - sky replacement"
dits tag vfx/001-plate-v1
```

**VFX artist works:**

```bash
dits clone [project]
dits branch vfx/shot-001
dits switch vfx/shot-001

# Work in Nuke/After Effects...

# Add render
dits add 05_VFX/shots/VFX_001/renders/
dits commit -m "VFX 001: Sky replacement - first pass"

# Version iterations
dits commit -m "VFX 001: Adjust color match"
dits commit -m "VFX 001: Add lens flare, final approved"
dits tag vfx/001-final
dits push
```

**Editor receives VFX:**

```bash
dits pull
dits merge vfx/shot-001

# Relink VFX render in timeline
dits commit -m "VFX: Integrate shot 001 final"
```

---

## Proxy Workflows

### Generating Proxies with Dits

Dits has built-in proxy generation:

```bash
# Generate proxies for footage
dits proxy-generate 01_RAW/ --resolution 1080p --codec prores-proxy

# Check status
dits proxy-status

# List generated proxies
dits proxy-list
```

### Proxy Workflow for Editing

```bash
# 1. Import high-res footage
dits add 01_RAW/
dits commit -m "Import 8K RAW footage"

# 2. Generate proxies
dits proxy-generate 01_RAW/ --resolution 1080p

# 3. Edit with proxies
# In your NLE, link to proxy versions

# 4. For final export, switch to full-res
# dits handles this automatically with VFS mounting
```

### VFS-Based Proxy Workflow

Mount with automatic proxy preference:

```bash
# Mount with proxy preference (streams proxies, fetches full-res on export)
dits mount /Volumes/Project --proxy --resolution 1080p

# In NLE:
# - Proxies stream instantly
# - Full-res fetched on-demand for export
```

---

## Project Organization Best Practices

### Naming Conventions

```bash
# Project files
[PROJECT]_[VERSION].prproj
# Example: Commercial_Nike_v1.prproj

# Exports
[PROJECT]_[VERSION]_[DATE]_[PURPOSE].[ext]
# Example: Commercial_Nike_v3_20250115_client-review.mp4

# Footage
[CAMERA]_[SCENE]_[TAKE].[ext]
# Example: A_CAM_SCENE01_TAKE03.mov
```

### Version Control Strategy

```bash
# Major versions: Tags
dits tag v1.0 -m "First assembly"
dits tag v2.0 -m "Rough cut"
dits tag v3.0 -m "Fine cut"
dits tag v4.0 -m "Picture lock"
dits tag v5.0 -m "Final master"

# Minor iterations: Commits
dits commit -m "v2.1: Shorten intro by 15 seconds"
dits commit -m "v2.2: Add interview B-roll"
dits commit -m "v2.3: Revise ending"
```

### Branch Strategy for Edits

```bash
# Main branch: Current approved version
main

# Feature branches: Specific changes
edit/scene-3-revision
edit/alternate-ending
edit/music-change

# Version branches: Major iterations
version/rough-cut
version/fine-cut
version/final

# Specialty branches: Handoffs
color/grade-v1
audio/mix-v1
vfx/all-shots
```

---

## Version Control Strategies

### Commit Frequency

**Recommended: Commit often with descriptive messages**

```bash
# Good: Specific, actionable commits
dits commit -m "Add opening title sequence"
dits commit -m "Trim interview response in scene 2"
dits commit -m "Add B-roll to cover jump cut at 05:23"
dits commit -m "Replace temp music with licensed track"

# Bad: Vague or infrequent commits
dits commit -m "Various changes"
dits commit -m "Updates"
dits commit -m "WIP"
```

### When to Branch

Create a branch when:

- Trying a significantly different approach
- Making changes that might be rejected
- Working on a specific feature/section
- Handing off to another department

```bash
# Examples
dits branch experiment/different-music
dits branch client-revision/round-2
dits branch department/color
```

### When to Tag

Create a tag for:

- Client review versions
- Milestone completions
- Approved deliverables
- Department handoffs

```bash
# Examples
dits tag review-v1 -m "First client review - rough cut"
dits tag picture-lock -m "Locked for color and audio"
dits tag delivery-broadcast -m "Final broadcast master"
```

---

## Backup and Archiving

### Continuous Backup

```bash
# Set up remote backup
dits remote add backup s3://my-bucket/projects/commercial-2025
dits push backup main

# Automated backup (add to cron/launchd)
dits push backup --all
```

### Project Archiving

```bash
# When project is complete

# 1. Final commit and tag
dits commit -m "Project complete - all deliverables rendered"
dits tag final-delivery -m "Final delivery to client"

# 2. Run garbage collection
dits gc --aggressive

# 3. Create archive
dits archive create ./commercial-2025-archive.dits

# 4. Optionally freeze to cold storage
dits freeze --all --tier archive

# 5. Verify archive
dits archive verify ./commercial-2025-archive.dits
```

### Restoring from Archive

```bash
# Restore project
dits archive extract ./commercial-2025-archive.dits ./restored-project

# Or clone from backup
dits clone s3://my-bucket/archives/commercial-2025
```

---

## Performance Optimization

### Optimizing Large Projects

```bash
# Use shallow clones for quick access
dits clone --depth 1 [url]  # Only latest version

# Partial clone (metadata only)
dits clone --filter blob:none [url]

# Enable caching
dits config cache.size 50GB
dits config cache.path /Volumes/FastSSD/dits-cache
```

### SSD/Storage Recommendations

| Use Case | Recommendation |
|----------|----------------|
| Dits cache | Fast NVMe SSD |
| Active project | NVMe SSD |
| Archive storage | HDD or cloud |
| Proxy media | SSD |

```bash
# Configure cache location
dits config --global cache.path /Volumes/FastSSD/dits-cache
```

### Network Optimization

```bash
# For slow connections
dits config transfer.maxParallel 4
dits config transfer.chunkRetries 5

# For fast connections
dits config transfer.maxParallel 16
```

---

## Common Issues and Solutions

### "File is locked by another user"

```bash
# Check who has the lock
dits locks footage/scene01.mov

# If the lock is stale (user gone)
dits unlock --force footage/scene01.mov  # Requires admin
```

### "Merge conflict in project file"

For NLE project files:

```bash
# See conflict status
dits status

# Choose a version (can't merge binary projects)
dits restore --ours 03_PROJECT/Project.prproj    # Keep yours
# OR
dits restore --theirs 03_PROJECT/Project.prproj  # Take theirs

# Complete merge
dits add 03_PROJECT/Project.prproj
dits commit -m "Resolve conflict: Kept my version of timeline"
```

### "Repository is too large"

```bash
# Check what's taking space
dits repo-stats -v

# Run garbage collection
dits gc

# Consider freezing old footage
dits freeze 01_RAW/old_footage/ --tier cold

# Check ignored files aren't being tracked
dits status --ignored
```

### "Clone/pull is very slow"

```bash
# Use shallow clone
dits clone --depth 1 [url]

# Or filter clone (metadata only)
dits clone --filter blob:none [url]

# Check network
dits p2p ping [target]

# Use local cache
dits config cache.size 100GB
```

### "Can't mount VFS"

```bash
# macOS: Check macFUSE installed
brew install macfuse

# May need to approve in System Preferences
# System Preferences → Security & Privacy → Allow

# Linux: Check FUSE installed
apt install fuse3

# Check mount permissions
ls -la /dev/fuse
```

### "Out of disk space"

```bash
# Check Dits storage usage
dits repo-stats

# Clear cache
dits cache clear

# Run garbage collection
dits gc --aggressive

# Freeze inactive content
dits freeze 01_RAW/unused_footage/ --tier archive
```

---

## Quick Reference: Video Editor Commands

```bash
# Daily workflow
dits status                          # Check status
dits add 03_PROJECT/                 # Stage project changes
dits commit -m "message"             # Save checkpoint
dits log --oneline -10               # View recent history

# Branching
dits branch edit/new-version         # Create branch
dits switch edit/new-version         # Switch to branch
dits merge edit/new-version          # Merge branch

# Collaboration
dits lock footage/scene01.mov        # Lock file
dits unlock footage/scene01.mov      # Unlock file
dits locks                           # List locks
dits p2p share                       # Share project
dits p2p connect ABC-123 ./project   # Join shared project

# Versioning
dits tag review-v1                   # Tag version
dits checkout review-v1              # View old version
dits diff review-v1 HEAD             # Compare versions

# Media
dits proxy-generate 01_RAW/          # Generate proxies
dits inspect video.mp4               # View video info
dits repo-stats                      # Check storage

# Utilities
dits gc                              # Clean up
dits mount /Volumes/Project          # Mount as drive
dits unmount /Volumes/Project        # Unmount
```

---

## Next Steps

- **[DaVinci Resolve Integration](resolve-integration.md)** - Deep dive into Resolve workflows
- **[Premiere Pro Integration](premiere-integration.md)** - Advanced Premiere features
- **[Remote Collaboration Guide](remote-collaboration.md)** - Working with distributed teams
- **[VFS Advanced Usage](../advanced/vfs.md)** - Virtual filesystem deep dive
- **[CLI Reference](../user-guide/cli-reference.md)** - Complete command reference
