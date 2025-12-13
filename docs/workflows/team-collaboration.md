# Workflow: Team Collaboration

How to effectively collaborate on video projects with multiple team members using Dits.

---

## Team Setup

### 1. Create Shared Repository

**Admin creates the repository:**
```bash
# On dits.dev web dashboard or via CLI:
dits repo create team/commercial-project --description "Q1 2025 Commercial"
```

### 2. Add Team Members

**Via web dashboard:**
1. Go to repository settings
2. Add members with appropriate roles:
   - **Admin:** Full control, manage members
   - **Editor:** Push/pull, lock files
   - **Viewer:** Read-only access

**Via CLI (admin):**
```bash
dits access grant jane@example.com --role editor
dits access grant john@example.com --role editor
dits access grant client@agency.com --role viewer
```

### 3. Team Members Clone
```bash
# Each team member clones:
dits clone https://dits.example.com/team/commercial-project
cd commercial-project
```

---

## Coordination Workflows

### Workflow A: File Locking (Recommended for Video)

Best for: Sequential editing, color grading, audio mixing

```
Timeline:
  Editor A                     Editor B
  ─────────                    ─────────
  lock scene01.mov
  edit scene01.mov
  commit & push                (scene01 read-only)
  unlock scene01.mov
                               lock scene01.mov
                               edit scene01.mov
                               commit & push
                               unlock scene01.mov
```

**Editor A's workflow:**
```bash
# Check what's available
dits locks
# No locks on scene01.mov

# Lock before editing
dits lock footage/scene01.mov --reason "Rough cut"

# Edit in NLE...

# Save and commit
dits add footage/scene01.mov project.prproj
dits commit -m "Rough cut scene 1 - selected best takes"
dits push

# Release for next editor
dits unlock footage/scene01.mov
```

**Editor B's workflow:**
```bash
# Check status
dits locks
# footage/scene01.mov locked by editor-a@example.com

# Wait or work on something else...

# Once available:
dits pull  # Get Editor A's changes
dits lock footage/scene01.mov --reason "Color grade"

# Continue editing...
```

---

### Workflow B: Branch-Based (For Parallel Work)

Best for: Experimental edits, multiple versions, A/B testing

```
Timeline:
  main                    feature/alt-edit
  ────                    ────────────────
  rough cut
       \
        `──── Editor B: alternative version
       /
  pick best version
```

**Create feature branch:**
```bash
# Editor B creates alternative version
dits checkout -b feature/alt-edit

# Make changes
dits add -A
dits commit -m "Alternative edit: faster pacing"
dits push -u origin feature/alt-edit
```

**Review and merge:**
```bash
# Editor A reviews
dits fetch
dits log origin/feature/alt-edit --oneline

# Compare versions
dits diff main origin/feature/alt-edit --stat

# Merge if approved
dits checkout main
dits merge feature/alt-edit
# or use web UI for pull request
```

---

### Workflow C: Role-Based Division

Best for: Large teams with specialized roles

```
Directory Structure:
project/
├── footage/           # Locked by: AEs during ingest
├── project-files/     # Locked by: Editors
├── graphics/          # Locked by: Motion designers
├── audio/             # Locked by: Audio engineers
└── exports/           # Locked by: Conform artist
```

**Set up role-based permissions:**
```bash
# Admin configures directory-based locks
dits config lock.rules '[
  {"pattern": "footage/**", "roles": ["ingest", "admin"]},
  {"pattern": "project-files/**", "roles": ["editor", "admin"]},
  {"pattern": "graphics/**", "roles": ["motion", "admin"]},
  {"pattern": "audio/**", "roles": ["audio", "admin"]},
  {"pattern": "exports/**", "roles": ["conform", "admin"]}
]'
```

---

## Communication Patterns

### Check Team Activity
```bash
# See recent commits
dits log --oneline -20

# See who changed what
dits log --format="%h %s (%an)" -10

# See commits by specific person
dits log --author="jane" --oneline

# See what's happening on all branches
dits log --all --oneline --graph -15
```

### Check Current Locks
```bash
# All locks
dits locks

# Locks in specific directory
dits locks footage/

# Your locks
dits locks --mine
```

### Communicate via Commit Messages
```bash
# Good team communication in commits:
dits commit -m "Scene 3: Added VFX placeholder - @jane please replace with final"
dits commit -m "Audio mix v2 - client feedback addressed (see notes.txt)"
dits commit -m "WIP: Color grade 50% complete - DO NOT EXPORT"
```

---

## Handling Conflicts

### Scenario: Concurrent Edits (Shouldn't Happen with Locks)

If someone bypasses locking and you both edit:

```bash
dits pull
# CONFLICT: footage/scene01.mov modified by both

# Options:
# 1. Keep yours
dits checkout --ours footage/scene01.mov

# 2. Keep theirs
dits checkout --theirs footage/scene01.mov

# 3. Keep both as separate files
dits checkout --keep-both footage/scene01.mov
# Creates: scene01.mov (theirs) and scene01_yours.mov

# 4. Visual comparison
dits diff --visual HEAD FETCH_HEAD -- footage/scene01.mov
```

### Scenario: Project File Conflicts

Project files (.prproj, .drp) often conflict:

```bash
# Best practice: One person "owns" the project file
dits lock project.prproj --reason "Main editor"

# If conflict occurs:
dits pull
# CONFLICT: project.prproj

# Usually safest to keep one version:
dits checkout --theirs project.prproj
# Then manually re-apply your timeline changes
```

### Scenario: Someone Forgot to Unlock

```bash
# Check who has the lock
dits locks footage/scene01.mov
# Locked by: jane@example.com
# Since: 18 hours ago (Jane went home!)

# Contact Jane, or if urgent:
# Admin can force unlock
dits unlock --force footage/scene01.mov
# Warning: Jane's uncommitted changes may conflict
```

---

## Best Practices for Teams

### 1. Lock Discipline
```bash
# DO: Lock before editing
dits lock footage/scene.mov

# DO: Unlock when done, even if not committing
dits unlock footage/scene.mov

# DO: Set reasonable TTL
dits lock footage/scene.mov --ttl 4h

# DON'T: Hold locks overnight
# DON'T: Lock files "just in case"
# DON'T: Lock directories you won't fully edit
```

### 2. Commit Frequency
```bash
# DO: Commit logical units of work
dits commit -m "Scene 3: Rough cut complete"
dits commit -m "Scene 3: Added music and SFX"
dits commit -m "Scene 3: Color grade pass 1"

# DON'T: Wait until end of day with massive commit
# DON'T: Commit every 5 minutes
```

### 3. Push/Pull Cadence
```bash
# DO: Pull before starting work
dits pull

# DO: Push after completing a task
dits push

# DO: Push before meetings/lunch
dits add -A && dits commit -m "WIP before meeting" && dits push

# DON'T: Sit on changes for hours
# DON'T: Push broken/unplayable files
```

### 4. Communication
```bash
# DO: Use descriptive commit messages
dits commit -m "Fixed sync drift at 00:45:30 per client feedback"

# DO: Mention teammates when relevant
dits commit -m "Exported proxy for @jane's review"

# DO: Check locks before complaining
dits locks  # Maybe they're legitimately using it
```

### 5. Organize Files
```
# DO: Use consistent folder structure
project/
├── 01_footage/
│   ├── A_cam/
│   └── B_cam/
├── 02_audio/
├── 03_graphics/
├── 04_project_files/
└── 05_exports/
    ├── drafts/
    └── finals/

# DO: Use clear naming
footage/20250115_interview_john_a001.mov
exports/v1_client_review_20250115.mp4

# DON'T: Use generic names
footage/video1.mov
exports/final_final_v2_FINAL.mp4
```

---

## Team Scenarios

### Scenario: Editor Handoff
```bash
# Editor A completes rough cut
dits add -A
dits commit -m "Rough cut complete - ready for color"
dits push
dits unlock --all

# Notify colorist
# (via Slack, email, or commit message)

# Colorist picks up
dits pull
dits log -1  # Verify rough cut is there
dits lock footage/*.mov --reason "Color grade"
# Begin color work...
```

### Scenario: Client Review Build
```bash
# Lead editor creates review export
dits pull  # Get all latest changes

# Lock project file during export
dits lock project.prproj --reason "Creating client review"

# Export from NLE...

# Add export to repo
dits add exports/client_review_v3_20250115.mp4
dits commit -m "Client review v3 - addressed feedback on scene 2"
dits push

# Unlock
dits unlock project.prproj

# Create tag for reference
dits tag client-review-v3 -m "Sent to client 2025-01-15"
dits push --tags
```

### Scenario: Multiple Versions for Client
```bash
# Create version branches
dits checkout -b version/30sec
# Make 30-second cut...
dits commit -m "30-second version"
dits push -u origin version/30sec

dits checkout -b version/60sec
# Make 60-second cut...
dits commit -m "60-second version"
dits push -u origin version/60sec

dits checkout -b version/90sec
# Make 90-second cut...
dits commit -m "90-second version"
dits push -u origin version/90sec

# Client picks 60sec
dits checkout main
dits merge version/60sec
dits push
```

### Scenario: Emergency Fix
```bash
# Need to fix something urgently while someone has file locked
dits locks footage/scene01.mov
# Locked by: jane@example.com

# Option 1: Coordinate with Jane
# "Hey Jane, can you push your changes? I need to fix the logo."

# Option 2: Work on exported version
dits checkout HEAD~1 -- exports/master.mp4
# Make fix on previous export

# Option 3: Admin force unlock (last resort)
dits unlock --force footage/scene01.mov
# Jane will need to merge her changes manually
```

---

## Monitoring Team Activity

### Daily Standup Commands
```bash
# What happened since yesterday?
dits log --since="24 hours ago" --oneline

# Who's working on what right now?
dits locks

# Any branches need review?
dits branch -r --no-merged main
```

### Weekly Review Commands
```bash
# Commits this week
dits log --since="1 week ago" --oneline

# Storage used
dits repo stats

# Large files added
dits log --since="1 week ago" --stat | grep -E "^\s+.*\|\s+Bin"
```

---

## Quick Reference

| Task | Command |
| :--- | :--- |
| See who's working | `dits locks` |
| Lock file | `dits lock <file>` |
| Unlock file | `dits unlock <file>` |
| Get latest | `dits pull` |
| Share changes | `dits push` |
| Recent activity | `dits log --oneline -10` |
| Team branches | `dits branch -a` |
| Compare versions | `dits diff <commit1> <commit2>` |
| Force unlock (admin) | `dits unlock --force <file>` |
