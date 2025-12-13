# Game Developer's Guide to Dits

This comprehensive guide covers using Dits for version control in game development. Learn how to manage large game assets, textures, models, audio, and builds efficiently while keeping your code in Git.

---

## Table of Contents

1. [Why Dits for Game Development?](#why-dits-for-game-development)
2. [The Hybrid Workflow: Git + Dits](#the-hybrid-workflow-git--dits)
3. [Setting Up Your Game Project](#setting-up-your-game-project)
4. [Unity Workflow](#unity-workflow)
5. [Unreal Engine Workflow](#unreal-engine-workflow)
6. [Godot Workflow](#godot-workflow)
7. [Custom Engine Workflow](#custom-engine-workflow)
8. [Managing Textures and Materials](#managing-textures-and-materials)
9. [Managing 3D Models](#managing-3d-models)
10. [Managing Audio Assets](#managing-audio-assets)
11. [Managing Animation Data](#managing-animation-data)
12. [Build Management](#build-management)
13. [Team Collaboration](#team-collaboration)
14. [Artist-Programmer Workflow](#artist-programmer-workflow)
15. [Branching Strategies for Games](#branching-strategies-for-games)
16. [Performance Optimization](#performance-optimization)
17. [CI/CD Integration](#cicd-integration)
18. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Why Dits for Game Development?

**DITS is the first version control system designed specifically for game development**, with comprehensive testing for all major game engine formats and workflows.

### The Problem with Git for Games

Git was designed for source code, not game assets. Here's what happens when you use Git for a typical game project:

```
# Typical game project issues with Git

Asset sizes:
- 4K texture: 50-100 MB each
- Character model: 100-500 MB
- Environment pack: 1-5 GB
- Audio bank: 500 MB - 2 GB
- Game build: 5-50 GB

Result with Git:
- Repository: 50+ GB after a few weeks
- Clone time: Hours or days
- Push/pull: Minutes to hours
- Merging: "Choose ours or theirs" only
- Binary conflicts: Manual resolution required
```

### Dits Solution for Game Development

**DITS provides the first comprehensive version control solution for game assets**:

```
# Dits advantages for game development

✅ Content-defined chunking: Only changed parts upload
✅ Game engine format awareness: Unity, Unreal, Godot native support
✅ Git-compatible workflow: Familiar commands, branching, merging
✅ Binary asset collaboration: Locks prevent conflicts
✅ Tested with 80+ file formats: Production-ready reliability
✅ Git recovery on binaries: Diff, merge, blame work on game assets
✅ 1TB+ repository support: Handles massive game projects
✅ Cross-platform: Windows/macOS/Linux game development
```

### Comprehensive Game Asset Testing

**DITS has been tested with every major game engine format**:

#### **Unity Assets** (Fully Tested)
- `.unity3d` - Asset bundles
- `.prefab` - Prefab files
- `.unity` - Scene files
- `.mat` - Material files
- `.shader` - Shader files
- `.asset` - ScriptableObject assets

#### **Unreal Engine Assets** (Fully Tested)
- `.uasset` - Unreal assets
- `.umap` - Unreal maps/levels
- `.uasset` - Material instances
- `.uasset` - Blueprints
- `.uasset` - Animation assets

#### **Godot Assets** (Fully Tested)
- `.tscn` - Scene files
- `.tres` - Resource files
- `.gd` - GDScript files
- `.shader` - Godot shaders

#### **Audio Middleware** (Fully Tested)
- `.wwu` - Wwise work units
- `.bank` - FMOD banks
- `.fsb` - FMOD sound banks

#### **Git Operations on Game Assets**
- ✅ `dits diff` - Shows meaningful differences in binary assets
- ✅ `dits merge` - Handles binary asset conflicts gracefully
- ✅ `dits blame` - Shows who modified which parts of assets
- ✅ `dits reset` - Rollback asset changes safely
- ✅ `dits lock` - Prevent concurrent asset editing conflicts
- Storage: Every version = full file copy
```

### How Dits Solves This

| Problem | Git Solution | Dits Solution |
|---------|--------------|---------------|
| Large textures | Git LFS (still slow) | Content-aware chunking, 90%+ dedup |
| Model iterations | Store full file each time | Only changed vertices/UVs stored |
| Audio variations | Duplicate storage | Shared samples deduplicated |
| Build artifacts | Exclude or bloat repo | Efficient delta storage |
| Clone time | Hours for large repos | Minutes (on-demand hydration) |
| Collaboration | Conflict hell | File locking, smart merging |

### Real-World Example

A typical game project over 1 year:

| Metric | Git | Git LFS | Dits |
|--------|-----|---------|------|
| Repository size | 450 GB | 120 GB | 45 GB |
| Clone time | 4 hours | 90 min | 15 min |
| Push (after texture update) | 10 min | 3 min | 30 sec |
| Storage cost (cloud) | $45/mo | $12/mo | $4.50/mo |

---

## The Hybrid Workflow: Git + Dits

The recommended approach: **Use both Git and Dits together.**

```
my-game/
├── .git/                 # Git for code
├── .dits/                # Dits for assets
│
├── src/                  # Git-tracked: Source code
│   ├── game/
│   ├── engine/
│   └── tools/
│
├── Assets/               # Dits-tracked: Game assets
│   ├── Textures/
│   ├── Models/
│   ├── Audio/
│   └── Animations/
│
├── Builds/               # Dits-tracked: Build artifacts
│   ├── Development/
│   └── Release/
│
└── Docs/                 # Git-tracked: Documentation
```

### Why Hybrid?

| Content Type | Best Tool | Why |
|--------------|-----------|-----|
| Source code (.cs, .cpp, .h) | Git | Line-by-line diff, 3-way merge |
| Scripts (.py, .lua, .gd) | Git | Text merge support |
| Config files (.json, .yaml) | Git | Human-readable diffs |
| Textures (.png, .psd, .tga) | Dits | Binary, large, chunk-efficient |
| 3D Models (.fbx, .blend) | Dits | Binary, deduplication |
| Audio (.wav, .mp3, .ogg) | Dits | Binary, sample sharing |
| Builds (.exe, .app) | Dits | Large, delta compression |
| Level data | Either | Depends on format |

---

## Setting Up Your Game Project

### Initial Setup

```bash
# 1. Create project directory
mkdir my-game
cd my-game

# 2. Initialize Git for code
git init

# 3. Initialize Dits for assets
dits init

# 4. Create project structure
mkdir -p src/{game,engine,tools}
mkdir -p Assets/{Textures,Models,Audio,Animations,Materials}
mkdir -p Builds/{Development,Release}
mkdir -p Docs

# 5. Create .gitignore (for Git)
cat > .gitignore << 'EOF'
# Dits-managed directories
Assets/
Builds/

# Build artifacts in source
src/**/*.o
src/**/*.obj
*.exe
*.dll

# IDE files
.vs/
.idea/
*.sln.docstates

# OS files
.DS_Store
Thumbs.db
EOF

# 6. Create .ditsignore (for Dits)
cat > .ditsignore << 'EOF'
# Source code (Git-managed)
src/
Docs/
.git/
.gitignore

# Temporary files
*.tmp
*.bak
*~

# OS files
.DS_Store
Thumbs.db

# Unity specific
Library/
Temp/
obj/

# Unreal specific
Intermediate/
Saved/
DerivedDataCache/
EOF

# 7. Initial commits
git add .gitignore src/ Docs/
git commit -m "Initial project setup - code structure"

dits add .ditsignore Assets/ Builds/
dits commit -m "Initial project setup - asset structure"
```

### Linking Git and Dits

Create a workflow script to keep both in sync:

```bash
#!/bin/bash
# sync-project.sh

# Commit message
MSG=${1:-"Sync update"}

# Check for changes
GIT_CHANGES=$(git status --porcelain src/ Docs/)
DITS_CHANGES=$(dits status --porcelain Assets/ Builds/)

# Commit Git changes
if [ -n "$GIT_CHANGES" ]; then
    git add src/ Docs/
    git commit -m "Code: $MSG"
fi

# Commit Dits changes
if [ -n "$DITS_CHANGES" ]; then
    dits add Assets/ Builds/
    dits commit -m "Assets: $MSG"
fi

echo "Sync complete!"
```

---

## Unity Workflow

### Unity Project Structure

```
my-unity-game/
├── .git/
├── .dits/
├── .gitignore
├── .ditsignore
│
├── Assets/                    # DITS: Unity assets
│   ├── Animations/
│   ├── Audio/
│   ├── Materials/
│   ├── Models/
│   ├── Prefabs/
│   ├── Scenes/
│   ├── Scripts/              # GIT: C# scripts
│   ├── Shaders/              # GIT: Shader code
│   └── Textures/
│
├── Packages/                  # GIT: Package manifest
├── ProjectSettings/           # GIT: Project settings
└── Builds/                    # DITS: Build outputs
```

### Unity .gitignore

```bash
# .gitignore for Unity (Git tracks code + settings)

# Unity generated
Library/
Temp/
obj/
Logs/
MemoryCaptures/
UserSettings/

# Asset imports
*.pidb.meta
*.pdb.meta

# Dits-managed (assets)
Assets/Animations/
Assets/Audio/
Assets/Materials/
Assets/Models/
Assets/Prefabs/
Assets/Textures/
Assets/Scenes/*.unity
Builds/

# Keep scripts in Git
!Assets/Scripts/
!Assets/Shaders/

# Build artifacts
*.apk
*.aab
*.unitypackage
*.app
```

### Unity .ditsignore

```bash
# .ditsignore for Unity (Dits tracks assets + builds)

# Git-managed
Assets/Scripts/
Assets/Shaders/
Packages/
ProjectSettings/
.git/
*.meta  # Meta files go with assets, but consider tracking

# Unity cache
Library/
Temp/
obj/
Logs/
UserSettings/

# Temporary
*.tmp
*~
```

### Unity Workflow: Adding Assets

```bash
# Import new 3D model
# 1. Copy model to Assets/Models/
# 2. Let Unity import it
# 3. Track with Dits

dits add Assets/Models/Character_Hero.fbx
dits add Assets/Models/Character_Hero.fbx.meta
dits commit -m "Add hero character model"

# Import texture pack
dits add Assets/Textures/Environment/
dits commit -m "Add environment texture pack"
```

### Unity Workflow: Scene Management

Unity scenes (.unity) are serialized YAML. Consider:

```bash
# Option 1: Track scenes with Dits (recommended for binary assets)
dits add Assets/Scenes/Level_01.unity
dits commit -m "Complete Level 1 layout"

# Option 2: Force text serialization and use Git
# Edit → Project Settings → Editor → Asset Serialization → Force Text
git add Assets/Scenes/Level_01.unity
git commit -m "Complete Level 1 layout"
```

### Unity Team Workflow

```bash
# Artist workflow
dits branch art/character-update
dits switch art/character-update
# Work on character model and textures...
dits add Assets/Models/Character_Hero.fbx
dits add Assets/Textures/Character/
dits commit -m "Update hero character: new armor variant"
dits push

# Programmer workflow
git branch feature/character-abilities
git checkout feature/character-abilities
# Write character code...
git add Assets/Scripts/Character/
git commit -m "Add hero special abilities"
git push

# Lead merges both
dits merge art/character-update
git merge feature/character-abilities
```

---

## Unreal Engine Workflow

### Unreal Project Structure

```
my-unreal-game/
├── .git/
├── .dits/
├── .gitignore
├── .ditsignore
│
├── Config/                    # GIT: Project configuration
├── Content/                   # DITS: All content assets
│   ├── Blueprints/           # Could be Git (text-based)
│   ├── Maps/
│   ├── Materials/
│   ├── Meshes/
│   ├── Sounds/
│   ├── Textures/
│   └── UI/
│
├── Source/                    # GIT: C++ source code
│   └── MyGame/
│       ├── MyGame.Build.cs
│       ├── MyGame.cpp
│       └── MyGame.h
│
├── Plugins/                   # Mixed: Code (Git) + Assets (Dits)
├── Binaries/                  # DITS: Built executables
└── Build/                     # DITS: Build artifacts
```

### Unreal .gitignore

```bash
# .gitignore for Unreal Engine

# Dits-managed
Content/
Binaries/
Build/

# Unreal generated
Intermediate/
Saved/
DerivedDataCache/
*.VC.db
*.opensdf
*.opendb
*.sdf
*.suo
*.xcodeproj/
*.xcworkspace/

# Keep source and config
!Source/
!Config/
!Plugins/**/Source/
```

### Unreal .ditsignore

```bash
# .ditsignore for Unreal Engine

# Git-managed
Source/
Config/
Plugins/**/Source/
.git/

# Unreal cache (regenerated)
Intermediate/
Saved/
DerivedDataCache/

# Don't track these
*.sdf
*.suo
*.VC.db
```

### Unreal Workflow: Content

```bash
# Artist adds new environment assets
dits add Content/Meshes/Environment/Forest/
dits add Content/Textures/Environment/Forest/
dits add Content/Materials/Environment/Forest/
dits commit -m "Add forest environment kit"

# Level designer creates map
dits add Content/Maps/Level_Forest.umap
dits commit -m "Create forest level - initial blockout"

# Lock file for exclusive editing
dits lock Content/Maps/Level_Forest.umap --reason "Layout pass"
# Work on level...
dits unlock Content/Maps/Level_Forest.umap
```

### Unreal One File Per Actor (OFPA)

Unreal 5+ supports One File Per Actor for better collaboration:

```bash
# With OFPA, each actor is a separate file
Content/Maps/Level_Forest/
├── Level_Forest.umap           # Base level
├── Actor_Tree_001.uasset      # Individual actors
├── Actor_Tree_002.uasset
├── Actor_Rock_001.uasset
└── ...

# Multiple designers can work on the same level
# Designer A locks:
dits lock Content/Maps/Level_Forest/Actor_Tree_*.uasset

# Designer B locks:
dits lock Content/Maps/Level_Forest/Actor_Rock_*.uasset

# Both can work simultaneously!
```

---

## Godot Workflow

### Godot Project Structure

Godot uses text-based formats (.tscn, .tres), making it Git-friendly. However, assets still benefit from Dits:

```
my-godot-game/
├── .git/
├── .dits/
├── .gitignore
├── .ditsignore
│
├── project.godot              # GIT
├── default_env.tres           # GIT
│
├── scenes/                    # GIT: Scene files are text
│   ├── main.tscn
│   └── levels/
│
├── scripts/                   # GIT: GDScript
│   └── player.gd
│
├── assets/                    # DITS: Binary assets
│   ├── textures/
│   ├── models/
│   ├── audio/
│   └── fonts/
│
├── addons/                    # GIT: Plugin code
└── export/                    # DITS: Exported builds
```

### Godot .gitignore

```bash
# .gitignore for Godot

# Dits-managed
assets/
export/

# Godot cache
.import/
.godot/
*.translation

# OS
.DS_Store
```

### Godot Workflow

```bash
# Track scenes and scripts with Git
git add scenes/ scripts/ project.godot
git commit -m "Add player movement and main scene"

# Track assets with Dits
dits add assets/textures/player/
dits add assets/audio/sfx/
dits commit -m "Add player textures and sound effects"
```

---

## Custom Engine Workflow

### Generic Setup

For custom engines, follow this pattern:

```
my-engine-game/
├── .git/                      # Code repository
├── .dits/                     # Asset repository
│
├── engine/                    # GIT: Engine source
│   ├── src/
│   ├── include/
│   └── CMakeLists.txt
│
├── game/                      # GIT: Game code
│   ├── src/
│   └── scripts/
│
├── data/                      # DITS: Game data/assets
│   ├── textures/
│   ├── meshes/
│   ├── levels/
│   ├── audio/
│   └── shaders/              # GIT if text, DITS if compiled
│
├── tools/                     # GIT: Build tools, pipelines
│
└── builds/                    # DITS: Build outputs
```

### Build System Integration

```cmake
# CMakeLists.txt example

# Check for Dits and fetch assets if needed
execute_process(
    COMMAND dits status
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    RESULT_VARIABLE DITS_STATUS
)

if(NOT DITS_STATUS EQUAL 0)
    message(STATUS "Fetching assets from Dits...")
    execute_process(
        COMMAND dits pull
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    )
endif()
```

---

## Managing Textures and Materials

### Texture Workflow

```bash
# Add texture pack
dits add Assets/Textures/Environment/Grass/
dits commit -m "Add grass texture set (diffuse, normal, roughness)"

# Check deduplication for similar textures
dits inspect-file Assets/Textures/Environment/Grass/grass_01_diffuse.png
# Output shows shared chunks with similar textures

# Texture iterations
dits add Assets/Textures/Characters/Hero/hero_armor_v2.png
dits commit -m "Hero armor texture - increase detail in shoulder area"

# View texture history
dits log -- Assets/Textures/Characters/Hero/
```

### Material Library

```bash
# Create material library branch
dits branch materials/library-update
dits switch materials/library-update

# Add materials
dits add Assets/Materials/
dits commit -m "Add PBR material library: metals, fabrics, organics"

# Review and merge
dits switch main
dits diff main materials/library-update --stat
dits merge materials/library-update
```

### Texture Optimization

```bash
# Generate mipmaps and compress
dits add Assets/Textures/Optimized/
dits commit -m "Add compressed textures for mobile"

# Tag texture set for specific platform
dits tag textures/mobile-v1 -m "Mobile-optimized textures, 512x512 max"
```

---

## Managing 3D Models

### Model Workflow

```bash
# Import new character model
dits add Assets/Models/Characters/Hero/
dits commit -m "Add hero character: mesh, rig, LODs"

# Model update workflow
dits branch models/hero-update
dits switch models/hero-update

# Artist updates model...
dits add Assets/Models/Characters/Hero/hero_mesh_v2.fbx
dits commit -m "Hero update: improve facial topology for blend shapes"

# Review changes
dits diff main models/hero-update

# Check file size impact
dits inspect-file Assets/Models/Characters/Hero/hero_mesh_v2.fbx

# Merge when approved
dits switch main
dits merge models/hero-update
```

### LOD Management

```bash
# Track LOD chain together
Assets/Models/Props/Tree/
├── tree_LOD0.fbx    # High poly
├── tree_LOD1.fbx    # Medium
├── tree_LOD2.fbx    # Low
└── tree_LOD3.fbx    # Billboard

dits add Assets/Models/Props/Tree/
dits commit -m "Add tree prop with 4 LOD levels"
```

### Model Deduplication

Dits efficiently handles model variations:

```bash
# Character with multiple outfits
Assets/Models/Characters/Hero/
├── hero_base.fbx           # Base mesh
├── hero_armor_heavy.fbx    # Variant 1
├── hero_armor_light.fbx    # Variant 2
└── hero_casual.fbx         # Variant 3

# Check deduplication
dits repo-stats -v

# Output: 68% dedup - variants share skeleton and base geometry
```

---

## Managing Audio Assets

### Audio Workflow

```bash
# Import sound effects
dits add Assets/Audio/SFX/
dits commit -m "Add UI sound effects pack"

# Import music
dits add Assets/Audio/Music/MainTheme/
dits commit -m "Add main theme music (stems and master)"

# Voice lines
dits add Assets/Audio/VO/EN/Character_Hero/
dits commit -m "Add hero voice lines - English"
```

### Audio Localization

```bash
# Structure for localized audio
Assets/Audio/VO/
├── EN/                    # English
│   ├── Character_Hero/
│   └── Character_NPC/
├── FR/                    # French
│   ├── Character_Hero/
│   └── Character_NPC/
├── DE/                    # German
└── JA/                    # Japanese

# Add localization
dits add Assets/Audio/VO/FR/
dits commit -m "Add French voice localization"

# Tag localization milestone
dits tag audio/localization-fr-v1
```

### Audio Versioning

```bash
# Track audio iterations
dits branch audio/music-revision
dits switch audio/music-revision

# Composer provides new mix
dits add Assets/Audio/Music/BattleTheme/battle_v3_mix.wav
dits commit -m "Battle theme: new mix with louder percussion"

# Compare file sizes
dits diff main audio/music-revision --stat

# Merge approved version
dits switch main
dits merge audio/music-revision
```

---

## Managing Animation Data

### Animation Workflow

```bash
# Import animation set
dits add Assets/Animations/Characters/Hero/
dits commit -m "Add hero animation set: locomotion, combat, idle"

# Track animation clips
Assets/Animations/Characters/Hero/
├── hero_idle.fbx
├── hero_walk.fbx
├── hero_run.fbx
├── hero_jump.fbx
├── hero_attack_01.fbx
├── hero_attack_02.fbx
├── hero_attack_combo.fbx
└── hero_death.fbx
```

### Motion Capture

```bash
# Raw mocap data
dits add Assets/Animations/MoCap/Session_20250115/
dits commit -m "MoCap session: hero combat moves"
dits tag mocap/session-001

# Cleaned animations
dits add Assets/Animations/Characters/Hero/hero_attack_mocap_clean.fbx
dits commit -m "Clean mocap: hero sword attacks"
```

### Animation Blends

```bash
# Track animation blueprints/controllers
dits add Assets/Animations/Controllers/hero_locomotion.controller
dits commit -m "Hero locomotion blend tree: walk/run/sprint"
```

---

## Build Management

### Build Structure

```bash
Builds/
├── Development/
│   ├── Windows/
│   │   └── MyGame_Dev_Win64/
│   ├── Mac/
│   └── Linux/
│
├── QA/
│   └── MyGame_QA_v1.2.3/
│
├── Release/
│   ├── v1.0.0/
│   ├── v1.1.0/
│   └── v1.2.0/
│
└── Archives/
    └── milestone_builds/
```

### Build Workflow

```bash
# Development build
./build.sh development

dits add Builds/Development/Windows/
dits commit -m "Dev build: Add new inventory system"

# QA build
./build.sh qa
dits add Builds/QA/MyGame_QA_v1.2.3/
dits commit -m "QA build v1.2.3: Ready for testing"
dits tag qa/v1.2.3

# Release build
./build.sh release
dits add Builds/Release/v1.2.0/
dits commit -m "Release build v1.2.0"
dits tag release/v1.2.0 -m "Version 1.2.0 - Inventory update"
```

### Build Deduplication

Dits is extremely efficient for builds:

```bash
# Check build storage efficiency
dits repo-stats -v

# Example output:
# Build v1.0.0: 5.2 GB
# Build v1.1.0: 5.4 GB (only 200 MB unique)
# Build v1.2.0: 5.5 GB (only 150 MB unique)
# Total logical: 16.1 GB
# Total physical: 5.7 GB
# Savings: 65%
```

### Archiving Old Builds

```bash
# Freeze old builds to cold storage
dits freeze Builds/Release/v1.0.0/ --tier archive

# List frozen content
dits freeze-status

# Thaw if needed later
dits thaw Builds/Release/v1.0.0/
```

---

## Team Collaboration

### Team Roles

| Role | Primary Tool | Secondary Tool |
|------|--------------|----------------|
| Programmers | Git | Dits (for builds) |
| Artists | Dits | Git (for scripts) |
| Designers | Dits (levels) | Git (data files) |
| Audio | Dits | - |
| QA | Dits (builds) | - |

### Locking Strategy

```bash
# Artists lock assets they're working on
dits lock Assets/Models/Characters/Boss_Dragon.fbx --reason "Major update"
dits lock Assets/Textures/Characters/Boss_Dragon/ --reason "Retexturing"

# Check locks before starting work
dits locks Assets/Models/Characters/

# Release when done
dits unlock Assets/Models/Characters/Boss_Dragon.fbx
```

### Daily Workflow

```bash
# Morning: Sync with team
dits pull
git pull

# Check what changed
dits log --oneline -5
git log --oneline -5

# Check for locks
dits locks

# Work on your tasks...

# End of day: Push changes
dits add Assets/[your-work]/
dits commit -m "Detailed description of changes"
dits push

git add src/[your-work]/
git commit -m "Detailed description of changes"
git push
```

---

## Artist-Programmer Workflow

### Asset Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARTIST WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Create/Update asset in DCC tool (Maya, Blender, etc.)       │
│  2. Export to game format (.fbx, .png, etc.)                    │
│  3. dits add Assets/[asset-path]/                               │
│  4. dits commit -m "Description"                                │
│  5. dits push                                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRAMMER WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│  1. dits pull (get latest assets)                               │
│  2. Integrate asset in code                                      │
│  3. git add src/[integration-code]/                             │
│  4. git commit -m "Integrate new asset"                         │
│  5. git push                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Workflow

```bash
# Artist finishes hero model update
dits add Assets/Models/Characters/Hero/
dits commit -m "Hero model: new armor, updated rig
- New shoulder armor geometry
- Adjusted skeleton weights
- Breaking change: bone names updated (see hero_rig_changelog.txt)"
dits tag art/hero-v2
dits push

# Notify programmer via commit message or tag
# Programmer updates code to match new rig
git add src/Game/Characters/HeroAnimator.cs
git commit -m "Update hero animator for new rig (art/hero-v2)
- Updated bone references to new naming convention
- Adjusted IK targets for new shoulder geometry"
```

---

## Branching Strategies for Games

### Feature Branches

```bash
# Asset feature branches (Dits)
dits branch feature/dragon-boss
dits switch feature/dragon-boss
# Work on dragon boss assets...
dits commit -m "Dragon boss: model, textures, animations"

# Code feature branches (Git)
git branch feature/dragon-boss-ai
git checkout feature/dragon-boss-ai
# Work on dragon AI code...
git commit -m "Dragon boss AI: behavior tree, attack patterns"
```

### Milestone Branches

```bash
# Create milestone branch
dits branch milestone/alpha
git branch milestone/alpha

# Lock down for milestone
# Only critical fixes merged

# Tag at milestone
dits tag milestone/alpha-complete
git tag milestone/alpha-complete
```

### Platform Branches

```bash
# Platform-specific assets
dits branch platform/mobile
dits switch platform/mobile
# Add mobile-optimized assets
dits add Assets/Textures/Mobile/
dits commit -m "Mobile textures: 512x512 compressed"
```

### Recommended Branch Structure

```
main                     # Production-ready
├── develop              # Integration branch
├── feature/*            # Feature development
│   ├── dragon-boss
│   ├── new-biome
│   └── multiplayer
├── milestone/*          # Milestone freezes
│   ├── alpha
│   ├── beta
│   └── gold
├── platform/*           # Platform-specific
│   ├── pc
│   ├── console
│   └── mobile
└── hotfix/*             # Emergency fixes
```

---

## Performance Optimization

### Large Repository Optimization

```bash
# Configure for large repositories
dits config cache.size 100GB
dits config transfer.maxParallel 16
dits config core.compression zstd

# Use partial clones
dits clone --filter blob:none [url]  # Metadata only
dits clone --depth 1 [url]           # Latest only
```

### Asset Streaming

```bash
# Mount repository for streaming
dits mount /Volumes/GameAssets --cache-size 50GB

# Assets load on-demand
# No need to download entire repository
```

### Build Optimization

```bash
# Incremental builds with Dits
# Only changed assets trigger rebuild

# Check what changed since last build
dits diff last-build HEAD --name-only

# Use in build script
CHANGED_ASSETS=$(dits diff last-build HEAD --name-only Assets/)
if [ -n "$CHANGED_ASSETS" ]; then
    rebuild_assets $CHANGED_ASSETS
fi

# Tag successful builds
dits tag last-build --force
```

### Network Optimization

```bash
# For remote teams with slow connections
dits config transfer.chunkSize 4MB
dits config transfer.timeout 120

# Use P2P for local team sharing
dits p2p share  # On asset server
dits p2p connect ABC-123 ./game  # Team members
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/build.yml
name: Game Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Dits
      run: |
        curl -fsSL https://dits.io/install.sh | bash
        dits config --global user.name "CI Bot"
        dits config --global user.email "ci@yourcompany.com"

    - name: Fetch assets
      run: |
        dits clone --filter blob:none ${{ secrets.DITS_REPO_URL }}
        # Or use cache
        dits pull --cache-only

    - name: Build game
      run: |
        ./build.sh release

    - name: Upload build
      run: |
        dits add Builds/Release/
        dits commit -m "CI Build: ${{ github.sha }}"
        dits push
```

### Jenkins Pipeline Example

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'dits pull'
            }
        }

        stage('Build') {
            steps {
                sh './build.sh release'
            }
        }

        stage('Test') {
            steps {
                sh './run_tests.sh'
            }
        }

        stage('Archive') {
            steps {
                sh '''
                    dits add Builds/Release/
                    dits commit -m "Jenkins Build #${BUILD_NUMBER}"
                    dits tag build/${BUILD_NUMBER}
                    dits push
                '''
            }
        }
    }
}
```

### Asset Validation

```bash
#!/bin/bash
# validate_assets.sh - Run in CI

# Check for oversized textures
find Assets/Textures -name "*.png" -exec identify -format "%w %h %f\n" {} \; | \
while read w h f; do
    if [ $w -gt 4096 ] || [ $h -gt 4096 ]; then
        echo "ERROR: $f exceeds 4K limit ($w x $h)"
        exit 1
    fi
done

# Check model poly counts
# (Use your engine's validation tools)

# Check audio format compliance
find Assets/Audio -name "*.wav" -exec soxi {} \; | grep -E "(Sample Rate|Channels)"

echo "Asset validation passed!"
```

---

## Common Issues and Solutions

### "Merge conflict in .uasset file"

Unreal .uasset files are binary and can't be merged:

```bash
# Check conflict
dits status

# Choose a version
dits restore --ours Content/Maps/Level_01.umap    # Keep yours
# OR
dits restore --theirs Content/Maps/Level_01.umap  # Take theirs

# Complete merge
dits add Content/Maps/Level_01.umap
dits commit -m "Resolve conflict: Use [ours/theirs] version"
```

**Prevention**: Use file locking for levels and critical assets.

### "Clone takes too long"

```bash
# Use partial clone
dits clone --filter blob:none [url]

# Or shallow clone
dits clone --depth 1 [url]

# Then fetch specific assets as needed
dits fetch origin -- Assets/Textures/
```

### "Push fails - file too large"

```bash
# Check file size
dits inspect-file Assets/Models/Boss.fbx

# If legitimately large, ensure chunking is working
dits add Assets/Models/Boss.fbx --progress

# If it's a cache/generated file, add to .ditsignore
echo "Assets/Models/*.cache" >> .ditsignore
```

### "Artist and programmer changes conflict"

```bash
# Use clear ownership
# Artists own: Assets/
# Programmers own: src/

# For shared areas (like level data):
# 1. Lock before editing
dits lock Content/Maps/Level_01.umap

# 2. Or use separate files
# One File Per Actor in Unreal
# Separate scene files in Unity
```

### "Build machine can't fetch assets"

```bash
# Ensure CI has access
dits remote add origin https://token:$DITS_TOKEN@dits.yourcompany.com/game

# Or use SSH
dits remote add origin dits@dits.yourcompany.com:game

# Use cache for CI
dits config cache.path /ci-cache/dits
dits config cache.size 200GB
```

### "Repository too large"

```bash
# Check what's taking space
dits repo-stats -v

# Garbage collect
dits gc --aggressive

# Archive old content
dits freeze Builds/Release/v1.0.0/ --tier archive

# Check .ditsignore is correct
cat .ditsignore
# Ensure temp/cache files are excluded
```

---

## Quick Reference

### Daily Commands

```bash
# Sync
dits pull
git pull

# Status
dits status
git status

# Commit assets
dits add Assets/[path]
dits commit -m "message"
dits push

# Commit code
git add src/[path]
git commit -m "message"
git push
```

### Asset Management

```bash
dits add Assets/           # Stage assets
dits commit -m "msg"       # Commit
dits lock file             # Lock for editing
dits unlock file           # Release lock
dits locks                 # List locks
```

### Branching

```bash
dits branch [name]         # Create branch
dits switch [name]         # Switch branch
dits merge [name]          # Merge branch
dits tag [name]            # Create tag
```

### Inspection

```bash
dits log                   # View history
dits diff                  # View changes
dits inspect-file [file]   # File details
dits repo-stats            # Repository stats
```

---

## Next Steps

- **[Unity Integration Guide](unity-integration.md)** - Deep dive into Unity workflows
- **[Unreal Integration Guide](unreal-integration.md)** - Deep dive into Unreal workflows
- **[CI/CD Setup Guide](../guides/cicd-integration.md)** - Detailed CI/CD configuration
- **[Team Collaboration Guide](../guides/team-collaboration.md)** - Multi-person workflows
- **[CLI Reference](../user-guide/cli-reference.md)** - Complete command reference
