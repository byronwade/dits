# 3D Artist & VFX Guide to Dits

A complete workflow guide for 3D artists, VFX professionals, motion designers, and animation studios managing large 3D assets.

---

## Table of Contents

1. [Why 3D Artists Need Dits](#why-3d-artists-need-dits)
2. [Understanding 3D Asset Workflows](#understanding-3d-asset-workflows)
3. [Setting Up Your 3D Repository](#setting-up-your-3d-repository)
4. [Blender Workflow](#blender-workflow)
5. [Maya Workflow](#maya-workflow)
6. [Cinema 4D Workflow](#cinema-4d-workflow)
7. [Houdini Workflow](#houdini-workflow)
8. [ZBrush Workflow](#zbrush-workflow)
9. [Substance Painter/Designer Workflow](#substance-painterdesigner-workflow)
10. [VFX Pipeline Integration](#vfx-pipeline-integration)
11. [Team Collaboration](#team-collaboration)
12. [Render Management](#render-management)
13. [Best Practices](#best-practices)

---

## Why 3D Artists Need Dits

**DITS is the first version control system designed specifically for 3D artists**, with comprehensive testing for all major 3D formats and workflows.

### Common Pain Points

**Scene File Chaos:**
```
project/
├── character_v1.blend
├── character_v2.blend
├── character_v2_rigged.blend
├── character_v2_rigged_FINAL.blend
├── character_v2_rigged_FINAL_fixed.blend
├── character_v2_rigged_FINAL_fixed_USE_THIS.blend
└── character_v3_ignore_everything_else.blend
```

**Storage Nightmare:**
- 50GB ZBrush sculpt × 20 iterations = 1TB
- Texture sets accumulate rapidly
- Every Houdini cache is massive
- External drives multiply

**Collaboration Disasters:**
- Modeler and rigger edit same file
- Texture artist updates break materials
- Animation changes require re-export

### Dits Solution for 3D Artists

**DITS provides comprehensive 3D asset management with full format support**:

```
# Dits advantages for 3D artists

✅ All major 3D formats: OBJ, FBX, COLLADA, glTF, USD, Blender, Maya
✅ Material support: PBR, Substance Painter, custom shaders
✅ Animation workflows: FBX animation, Blender actions, custom rigs
✅ Git operations on 3D: Diff, merge, blame work on binary assets
✅ Tested with 80+ formats: Production-ready reliability
✅ 1TB+ repository support: Handles massive 3D projects
✅ Render farm integration: Versioned render jobs and outputs
```

### Comprehensive 3D Format Support

**DITS has been tested with every major 3D software format**:

#### **Model Formats** (Fully Tested)
- **OBJ**: Wavefront OBJ with materials and textures
- **FBX**: Autodesk FBX with animations and rigging
- **COLLADA**: DAE XML format with complex hierarchies
- **glTF 2.0**: Khronos glTF with PBR materials and animations
- **USD**: Universal Scene Description (Pixar)
- **STL**: Stereolithography for 3D printing
- **PLY**: Polygon file format

#### **Software-Specific Formats** (Fully Tested)
- **Blender**: `.blend` native files
- **Maya**: `.mb` (Maya Binary), `.ma` (Maya ASCII)
- **3ds Max**: `.max` files
- **Cinema 4D**: `.c4d` files
- **Houdini**: `.hip` files, `.bgeo` geometry caches
- **ZBrush**: `.ztl` tool files, `.ZPR` project files

#### **Material & Texture Formats** (Fully Tested)
- **Substance Painter**: `.spp` project files, `.sbsar` materials
- **PBR Materials**: JSON-based PBR material definitions
- **Custom Shaders**: HLSL, GLSL, CG shader programs
- **Texture Sets**: Multiple resolution variants

#### **Animation Formats** (Fully Tested)
- **FBX Animation**: Keyframe animation curves
- **Blender Actions**: Non-linear animation data
- **Custom Rigging**: Complex character rigging systems
- **Motion Capture**: BVH, FBX mocap data

#### **Git Operations on 3D Assets**
- ✅ `dits diff` - Shows meaningful differences in 3D models
- ✅ `dits merge` - Handles 3D asset conflicts gracefully
- ✅ `dits blame` - Shows who modified which parts of models
- ✅ `dits reset` - Rollback 3D changes safely
- ✅ `dits lock` - Prevent concurrent 3D asset editing conflicts
- "Did you use my latest mesh?"

### How Dits Solves These

| Challenge | Traditional | Dits |
|-----------|-------------|------|
| Version tracking | Filename suffixes | Complete history |
| Storage | 1TB for 20 versions | ~200GB with dedup |
| Collaboration | File passing, overwrites | Locking + sync |
| Asset dependencies | Manual tracking | Manifest tracking |
| Rollback | "I think I have a backup..." | `dits restore` |

### Deduplication for 3D Files

```
File Type           │ Typical Dedup Rate │ Why
────────────────────┼────────────────────┼─────────────────────
Blender (.blend)    │ 70-90%            │ Packed data shares chunks
Maya (.ma ASCII)    │ 80-95%            │ Text-based, excellent diff
Maya (.mb Binary)   │ 60-80%            │ Structured binary
ZBrush (.ztl)       │ 80-95%            │ Large sculpts, incremental changes
Houdini (.hip)      │ 70-85%            │ Node graph + geometry
C4D (.c4d)          │ 65-80%            │ Scene structure
FBX/OBJ             │ 75-90%            │ Vertex data clusters well
Textures (PNG/EXR)  │ 40-70%            │ Depends on similarity
```

---

## Understanding 3D Asset Workflows

### Typical 3D Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  MODELING   │───▶│   RIGGING   │───▶│  ANIMATION  │───▶│  LIGHTING   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                 │                  │                  │
       ▼                 ▼                  ▼                  ▼
   dits commit      dits commit        dits commit        dits commit
   "Model v1"       "Rig complete"     "Walk cycle"       "Final light"
                                                               │
                                                               ▼
                                                    ┌─────────────────┐
                                                    │    RENDERING    │
                                                    └─────────────────┘
                                                           │
                                                           ▼
                                                    dits tag "render-v1"
```

### Asset Types and Organization

| Asset Type | Storage Strategy | Version Frequency |
|------------|------------------|-------------------|
| Scene files (.blend, .ma) | Main repo | Every significant change |
| Textures | Main repo or linked | When updated |
| Caches (sim, alembic) | Consider separate repo | Per simulation |
| Renders | Typically not versioned | Tag final versions |
| Reference images | Main repo | Rarely changes |

---

## Setting Up Your 3D Repository

### Basic Setup

```bash
# Create your 3D workspace
mkdir ~/3D_Projects
cd ~/3D_Projects

# Initialize Dits
dits init

# Configure identity
dits config user.name "Alex 3D Artist"
dits config user.email "alex@studio.com"
```

### Recommended Project Structure

```bash
# Standard 3D project structure
ProjectName/
├── .dits/                      # Dits repository
├── .ditsignore                 # Files to exclude
├── Assets/
│   ├── Characters/
│   │   ├── Hero/
│   │   │   ├── hero_model.blend
│   │   │   ├── hero_rig.blend
│   │   │   └── Textures/
│   │   └── NPC/
│   ├── Props/
│   ├── Environments/
│   └── Materials/
├── Scenes/
│   ├── shot_010/
│   ├── shot_020/
│   └── master_scene.blend
├── Exports/
│   ├── FBX/
│   ├── Alembic/
│   └── USD/
├── Renders/                    # Consider excluding from repo
│   ├── preview/
│   └── final/
├── Reference/
│   ├── concept_art/
│   └── photo_ref/
├── Cache/                      # Usually excluded
└── Temp/                       # Always excluded
```

### Essential .ditsignore

```bash
# .ditsignore for 3D projects

# Caches and simulations (regeneratable)
Cache/
cache/
*.abc.bak
*.vdb
*.bgeo
*.bgeo.sc

# Render outputs (usually kept separately)
Renders/
renders/
*.exr
*.png
# Uncomment if you want to track final renders:
# !Renders/final/

# Temporary files
Temp/
temp/
*.tmp
*.bak
*.blend1
*.blend2
*.autosave

# Application caches
*.bphys
__pycache__/
*.pyc

# Houdini backup files
*.hip.bak
backup/

# Maya backup files
*.ma.swp
incrementalSave/

# C4D backup files
*.c4d~

# ZBrush autosaves
QuickSave/
AutoSave/

# Substance cache
*.sbscache

# System files
.DS_Store
Thumbs.db
desktop.ini
```

### Initial Commit

```bash
# Add your project files
dits add .

# Initial commit
dits commit -m "Initial project setup: Character rig pipeline"

# Connect to remote
dits remote add origin https://ditshub.com/studio/character-project
dits push -u origin main
```

---

## Blender Workflow

### Project Configuration

```bash
# Blender project structure
BlenderProject/
├── .dits/
├── .ditsignore
├── Assets/
│   ├── Characters/
│   ├── Props/
│   └── Materials/
├── Scenes/
│   └── main_scene.blend
├── Textures/
└── Exports/
```

### Blender-Specific .ditsignore

```bash
# .ditsignore for Blender

# Backup files
*.blend1
*.blend2
*.blend3

# Crash recovery
blender_quit.blend

# Temp files
*.autosave

# Cache
blendcache_*/
Cache/

# BPhysics cache
*.bphys

# Rendered frames (if not tracking)
Renders/*.png
Renders/*.exr
!Renders/final/
```

### Workflow: Solo Artist

```bash
# Starting work
cd ~/Projects/BlenderProject

# Get latest (if working with remote)
dits pull

# Work on your file...
# Save in Blender (Ctrl+S)

# Commit your progress
dits add Scenes/main_scene.blend
dits commit -m "Model: Added hero character base mesh"

# Continue working...
# After completing a milestone:
dits add .
dits commit -m "Model: Hero character topology cleanup"
dits push
```

### Workflow: Linked Libraries

Blender's linked library system works excellently with Dits:

```bash
# Structure for linked workflow
Project/
├── Library/
│   ├── characters.blend      # Character assets
│   ├── props.blend           # Prop assets
│   └── materials.blend       # Material library
└── Scenes/
    └── main_scene.blend      # Links from Library/

# Update library
dits add Library/characters.blend
dits commit -m "Character: Updated hero materials"

# Team members update
dits pull

# Their linked assets update automatically when they reload
```

### Handling Large Scenes

```bash
# For very large Blender files (1GB+)
# Consider splitting into linked files

# Check file size contribution
dits repo-stats -v

# If a single file dominates storage:
# 1. Split into modular .blend files
# 2. Use Blender's linked library system
# 3. Each file can be versioned independently
```

---

## Maya Workflow

### Maya ASCII vs Binary

**Recommendation: Use Maya ASCII (.ma) when possible**

```bash
# Why ASCII?
# - Text-based = excellent deduplication (80-95%)
# - Can see actual changes in diffs
# - Merge-friendly for team work
# - Slightly larger files, but better versioning

# Why Binary (.mb)?
# - Faster save/load for huge scenes
# - Required for some plugins
# - Use only when ASCII is too slow
```

### Maya Project Setup

```bash
# Maya project structure
MayaProject/
├── .dits/
├── .ditsignore
├── scenes/
│   ├── model/
│   ├── rig/
│   └── animation/
├── sourceimages/
├── cache/                  # Usually excluded
├── images/                 # Renders, usually excluded
├── scripts/
└── data/                   # Reference data
```

### Maya-Specific .ditsignore

```bash
# .ditsignore for Maya

# Incremental saves
incrementalSave/
autosave/

# Cache files
cache/
particles/
*.pdc
*.mc
*.mcx
*.nCache

# Render outputs
images/
renderData/

# Maya temp
*.swatches
workspace.mel.bak

# Backup files
*.mb~
*.ma~

# Mental Ray cache
mentalray/
```

### Maya References Workflow

```bash
# Structure for referenced workflow
Project/
├── Assets/
│   ├── character_rig.ma      # Master rig file
│   └── props/
│       ├── sword.ma
│       └── shield.ma
└── Scenes/
    └── shot_010.ma           # References Assets/

# Update a referenced asset
cd Assets
dits add character_rig.ma
dits commit -m "Rig: Fixed IK stretch"
dits push

# Animators get update
dits pull
# Reload references in Maya to see changes
```

### Locking for Maya Collaboration

```bash
# Before working on rig (to prevent conflicts)
dits lock Assets/character_rig.ma --reason "Updating IK system"

# Work on the file...

# Release when done
dits add Assets/character_rig.ma
dits commit -m "Rig: Updated IK system with stretch"
dits push
dits unlock Assets/character_rig.ma
```

---

## Cinema 4D Workflow

### C4D Project Structure

```bash
# Cinema 4D project structure
C4DProject/
├── .dits/
├── .ditsignore
├── Scenes/
│   ├── main_project.c4d
│   └── assets/
│       ├── character.c4d
│       └── environment.c4d
├── tex/                      # Textures
├── Renders/
└── Presets/
    ├── materials/
    └── tags/
```

### C4D-Specific .ditsignore

```bash
# .ditsignore for Cinema 4D

# Backup files
*.c4d~
backup/

# Cache
Illumination/
*.gi
*.gi2

# Render outputs
Renders/preview/
*.mp4

# Keep final renders
!Renders/final/

# System
.DS_Store
```

### Take System with Dits

C4D's Take System creates variations within a single file. Use branches in Dits for major variations:

```bash
# Create branch for client options
dits branch color-option-a
# Save C4D with Option A settings
dits add scene.c4d
dits commit -m "Render: Color option A - warm tones"

dits checkout main
dits branch color-option-b
# Save C4D with Option B settings
dits add scene.c4d
dits commit -m "Render: Color option B - cool tones"

# Client chooses option A
dits checkout main
dits merge color-option-a
```

---

## Houdini Workflow

### Houdini Project Structure

```bash
# Houdini project structure
HoudiniProject/
├── .dits/
├── .ditsignore
├── hip/
│   ├── main.hip
│   ├── sim_pyro.hip
│   └── sim_flip.hip
├── geo/                      # Cached geometry
├── render/                   # Render outputs
├── scripts/
├── hda/                      # Digital assets
└── tex/                      # Textures
```

### Houdini-Specific .ditsignore

```bash
# .ditsignore for Houdini

# Backup files
*.hip.bak
backup/

# Simulation caches (large, regeneratable)
geo/*.bgeo
geo/*.bgeo.sc
geo/*.vdb
geo/*.abc

# Render outputs
render/

# Houdini temp
*.hipnc.tmp

# Keep HDAs in version control
!hda/*.hda
```

### HDA (Digital Assets) Workflow

```bash
# HDAs should ALWAYS be version controlled
hda/
├── fx_explosion.hda
├── fx_smoke.hda
└── tool_scatter.hda

# When updating an HDA
dits lock hda/fx_explosion.hda --reason "Adding controls"

# Work on HDA in Houdini
# Save the HDA

dits add hda/fx_explosion.hda
dits commit -m "HDA: fx_explosion - added turbulence control"
dits push
dits unlock hda/fx_explosion.hda

# Team members get the update
dits pull
# Reload HDAs in Houdini
```

### Simulation Cache Strategy

```bash
# Option 1: Don't version caches (recommended for most)
# Add to .ditsignore:
geo/*.bgeo
geo/*.vdb

# Re-simulate as needed after pulling hip files

# Option 2: Version critical caches in separate repo
# For hero sims that take days to compute
mkdir ~/SimCaches
cd ~/SimCaches
dits init
dits add approved_sims/
dits commit -m "Cache: Hero explosion approved v3"
```

---

## ZBrush Workflow

### ZBrush Project Structure

```bash
# ZBrush project structure
ZBrushProject/
├── .dits/
├── .ditsignore
├── ZProjects/
│   └── character_sculpt.zpr
├── ZTools/
│   ├── character_head.ztl
│   ├── character_body.ztl
│   └── accessories/
├── Alphas/
├── Exports/
│   ├── lowpoly/
│   └── highpoly/
└── Reference/
```

### ZBrush-Specific .ditsignore

```bash
# .ditsignore for ZBrush

# Autosaves (ZBrush handles its own backup)
QuickSave/
AutoSave/
ZBrush.zpr.bak

# Temp files
*.tmp
*.zbr

# Recovery files
RecoverFiles/
```

### ZBrush Deduplication Benefits

ZBrush files deduplicate extremely well:

```bash
# Example: 500MB character sculpt, 10 iterations
# Traditional: 5GB (10 × 500MB)
# With Dits: ~700MB (86% savings)

# Why? Mesh data is stored in chunks
# Small sculpting changes = few chunk changes
```

### Workflow: Sculpting Iterations

```bash
# Start of sculpt session
dits pull

# After significant progress
# Save in ZBrush (Ctrl+S)
dits add ZTools/character_head.ztl
dits commit -m "Sculpt: Primary forms - head"

# Continue sculpting...
# After more progress
dits add ZTools/character_head.ztl
dits commit -m "Sculpt: Secondary forms - wrinkles, pores"

# End of day
dits add .
dits commit -m "Sculpt: End of day progress"
dits push
```

### GoZ Integration

```bash
# When using GoZ to send to Maya/Blender/Max:

# 1. Sculpt in ZBrush
# 2. GoZ sends to target app
# 3. Work in target app
# 4. GoZ back to ZBrush

# Commit after round-trips
dits add ZTools/character.ztl
dits add ../MayaProject/scenes/character.ma
dits commit -m "Sculpt: GoZ round-trip - topology updates"
```

---

## Substance Painter/Designer Workflow

### Substance Project Structure

```bash
# Substance project structure
SubstanceProject/
├── .dits/
├── .ditsignore
├── Painter/
│   └── character_textures.spp
├── Designer/
│   └── materials/
│       ├── skin_material.sbs
│       └── metal_material.sbs
├── Exports/
│   ├── 2K/
│   └── 4K/
└── Source/
    ├── meshes/
    └── bakes/
```

### Substance-Specific .ditsignore

```bash
# .ditsignore for Substance

# Cache files
*.sbscache
cache/

# Autosaves
*.spp.autosave

# Keep exports you want versioned
Exports/4K/*.png
!Exports/final/
```

### Texture Export Workflow

```bash
# After painting textures
# Export from Substance Painter

# Commit source and exports
dits add Painter/character_textures.spp
dits add Exports/4K/
dits commit -m "Texture: Character skin complete"

# For team members using different resolutions
# They can re-export from .spp file
```

### Designer Graph Workflow

```bash
# Substance Designer graphs benefit from versioning
# Small changes = small diffs

dits add Designer/materials/procedural_metal.sbs
dits commit -m "Material: Added rust variation parameter"

# Export .sbsar for distribution
dits add Designer/exports/procedural_metal.sbsar
dits commit -m "Material: Published procedural_metal.sbsar"
```

---

## VFX Pipeline Integration

### Shot-Based Structure

```bash
# VFX show structure
ShowName/
├── .dits/
├── .ditsignore
├── Assets/
│   ├── Characters/
│   ├── Props/
│   └── Environments/
├── Shots/
│   ├── SEQ010/
│   │   ├── SH010/
│   │   │   ├── plates/
│   │   │   ├── comp/
│   │   │   └── render/
│   │   ├── SH020/
│   │   └── SH030/
│   └── SEQ020/
├── Elements/
│   ├── Explosions/
│   └── Smoke/
└── Deliveries/
```

### Department Workflow

```
Asset Department Flow:
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ MODELING │──▶│ TEXTURING│──▶│  RIGGING │──▶│PUBLISHED │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
   branch:        branch:        branch:        merge to
   modeling       texturing      rigging        main + tag
```

```bash
# Modeling completes, hands off to texturing
dits checkout main
dits pull
dits branch asset/hero-char/texturing

# Texturing works...
dits add Assets/Characters/hero/
dits commit -m "Texture: Hero character skin complete"

# Ready for rigging
dits push origin asset/hero-char/texturing

# Rigging pulls texturing branch
dits pull
dits checkout asset/hero-char/texturing
dits branch asset/hero-char/rigging

# ... continues through pipeline
```

### Asset Publishing

```bash
# When asset is approved for production
dits checkout main
dits merge asset/hero-char/rigging

# Tag as published
dits tag asset/hero-char/v1.0

# Shots can now reference this version
dits push --tags
```

### Shot-Level Versioning

```bash
# Each shot has its own workflow
cd Shots/SEQ010/SH010

# Compositor starts work
dits add comp/sh010_comp_v001.nk
dits commit -m "Comp: Initial setup, plate import"

# After client review
dits add comp/sh010_comp_v002.nk
dits commit -m "Comp: Rev 1 - color adjustments per notes"

# Final delivery
dits add comp/sh010_comp_v003.nk
dits commit -m "Comp: Final - approved"
dits tag sh010/final
```

---

## Team Collaboration

### Role-Based Workflow

```bash
# Modeler workflow
dits lock Assets/Characters/hero.blend --reason "Modeling updates"
# Work...
dits add Assets/Characters/hero.blend
dits commit -m "Model: Updated topology for deformation"
dits push
dits unlock Assets/Characters/hero.blend

# Rigger waits for modeler
dits locks  # Check if modeling is done
dits pull   # Get latest model

# Rigger works on rig
dits lock Assets/Characters/hero_rig.blend --reason "Rigging"
# ...
```

### Daily Workflow

```bash
# Start of day
cd ~/Projects/CurrentShow
dits pull

# Check what's happening
dits log --oneline -10

# See what files are locked
dits locks

# Work on your assigned files
dits lock your_file.blend
# ... work ...

# End of day
dits add .
dits commit -m "Progress: [description of work]"
dits push
dits unlock your_file.blend
```

### Handling Conflicts

```bash
# If someone else changed a file you're working on
dits pull

# If conflict on binary file
dits status
# both modified: character.blend

# For 3D files, typically choose one version
dits restore --ours character.blend    # Keep yours
# OR
dits restore --theirs character.blend  # Take theirs

# Then manually merge any needed changes
dits add character.blend
dits commit -m "Merge: Combined modeling changes"
```

### P2P for Quick Sharing

```bash
# Need to share large file with colleague quickly?
dits p2p share

# Share the join code
# They connect:
dits p2p connect ABC-123 ./project

# Direct transfer, no cloud upload needed
```

---

## Render Management

### Render Output Strategy

```bash
# Generally DON'T version render outputs
# They're:
# - Large
# - Regeneratable
# - Change frequently

# Add to .ditsignore:
Renders/
renders/
images/
*.exr
*.png

# EXCEPT for final approved renders
!Renders/final/
!Renders/approved/
```

### Tagging Render Versions

```bash
# After render is approved
mkdir -p Renders/approved/v1
# Copy approved frames

dits add Renders/approved/v1/
dits commit -m "Render: Final approved frames v1"
dits tag render/v1-approved

# If re-rendering after changes
mkdir -p Renders/approved/v2
dits add Renders/approved/v2/
dits commit -m "Render: Updated per client notes"
dits tag render/v2-approved
```

### Render Farm Integration

```bash
# Before submitting to render farm
dits push  # Ensure latest is on remote

# Render farm clones repo
dits clone https://ditshub.com/studio/project /farm/project

# Or use specific tag
dits clone --branch render/v1-approved https://...

# After render completes
# Frames go to designated output location (not version controlled)
```

---

## Best Practices

### Commit Message Conventions

```bash
# Use prefixes for clarity
dits commit -m "Model: [description]"      # Modeling work
dits commit -m "Rig: [description]"        # Rigging work
dits commit -m "Anim: [description]"       # Animation
dits commit -m "Texture: [description]"    # Texturing
dits commit -m "Light: [description]"      # Lighting
dits commit -m "Comp: [description]"       # Compositing
dits commit -m "FX: [description]"         # Effects
dits commit -m "HDA: [description]"        # Houdini digital assets
dits commit -m "Material: [description]"   # Material/shader work

# Examples
dits commit -m "Model: Hero character - base mesh complete"
dits commit -m "Rig: Added IK/FK switch to arms"
dits commit -m "Anim: Walk cycle - blocking pass"
dits commit -m "FX: Explosion sim - increased turbulence"
```

### Tagging Milestones

```bash
# Asset milestones
dits tag asset/hero/model-complete
dits tag asset/hero/rig-complete
dits tag asset/hero/v1.0-published

# Shot milestones
dits tag sh010/blocking
dits tag sh010/polish
dits tag sh010/final

# Client reviews
dits tag review/2024-06-15
dits tag approved/client-v2
```

### File Naming Conventions

```bash
# Recommended naming
asset_name_variant.ext           # hero_walk.blend
asset_name_LOD#.ext             # hero_LOD0.fbx, hero_LOD1.fbx
shot###_task_version.ext        # sh010_comp_v001.nk

# DON'T use
hero_FINAL.blend                # Use tags instead
hero_v2_FINAL_use_this.blend    # Use version control instead
```

### Storage Optimization

```bash
# Check what's using space
dits repo-stats -v

# If repo is large, check for:
# 1. Accidentally tracked caches
# 2. Render outputs in repo
# 3. Duplicate files

# Run garbage collection
dits gc

# For very large repos, use sparse checkout
dits clone --filter=sparse https://ditshub.com/studio/show
dits sparse add Shots/SEQ010/
```

### Backup Strategy

```bash
# Remote backup (DitsHub)
dits push  # Regular pushes throughout day

# Mirror for disaster recovery
dits clone --mirror https://ditshub.com/studio/show /backup/show-mirror

# Verify backup
dits -C /backup/show-mirror fsck
```

---

## Common Scenarios

### Scenario: Modeler Updated Mesh, Rig Needs Update

```bash
# Modeler pushes update
dits add Assets/Characters/hero.blend
dits commit -m "Model: Topology fix for elbow deformation"
dits push

# Rigger gets update
dits pull

# Rigger needs to update weights
dits add Assets/Characters/hero_rig.blend
dits commit -m "Rig: Updated skin weights for new topology"
dits push
```

### Scenario: Client Wants Previous Version

```bash
# Find previous version
dits log --oneline

# abc123 Texture: Final approved
# def456 Texture: Alternative color scheme
# ghi789 Texture: Original version

# Restore specific file from old commit
dits restore character_textures.spp --commit ghi789

# Or create branch to compare
dits branch review-old-version ghi789
dits checkout review-old-version
```

### Scenario: Merging Work from Multiple Artists

```bash
# Artist A worked on props
dits checkout props-update
dits add Props/
dits commit -m "Props: Updated hero weapons"
dits push origin props-update

# Artist B worked on environment
dits checkout env-update
dits add Environments/
dits commit -m "Env: Lighting adjustments"
dits push origin env-update

# Supervisor merges both
dits checkout main
dits pull
dits merge props-update
dits merge env-update
dits push
```

### Scenario: Recovering Deleted Work

```bash
# Find when file was deleted
dits log --diff-filter=D -- path/to/file.blend

# Restore from before deletion
dits restore path/to/file.blend --commit abc123^

# Add back
dits add path/to/file.blend
dits commit -m "Restore: Recovered accidentally deleted file"
```

---

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| Save progress | `dits add . && dits commit -m "..."` |
| Get team changes | `dits pull` |
| Share changes | `dits push` |
| Lock file for work | `dits lock file.blend --reason "..."` |
| Release lock | `dits unlock file.blend` |
| View history | `dits log` |
| Restore old version | `dits restore file --commit abc123` |
| Tag milestone | `dits tag milestone-name` |
| Check file sizes | `dits repo-stats -v` |

### Shell Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias ds='dits status'
alias dl='dits log --oneline -20'
alias da='dits add'
alias dc='dits commit -m'
alias dp='dits push'
alias dpl='dits pull'
alias dlk='dits lock'
alias dulk='dits unlock'
alias dlks='dits locks'
alias drs='dits repo-stats'
```

---

## Getting Help

- **Documentation**: [docs.dits.io](https://docs.dits.io)
- **3D Artist Community**: [discord.gg/dits](https://discord.gg/dits) #3d-artists channel
- **Video Tutorials**: [youtube.com/@dits](https://youtube.com/@dits)
- **GitHub Issues**: [github.com/dits-io/dits/issues](https://github.com/dits-io/dits/issues)
- **Email Support**: support@dits.io
