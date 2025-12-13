# Phase 5: UX, Integrity, Metadata Hooks, and Timelines

Make dits pleasant, trustworthy, and extensible: better CLI ergonomics, integrity checking, optional media-aware metadata, and a first project graph for video timelines. Still local-only; no ditshub yet.

**Objective:** Deliver a daily-usable CLI with config/branches polish, `fsck` for trust, pluggable metadata hooks, and minimal timeline objects committed alongside trees.

**Success Metric:** Users can set identity, branch and checkout, verify repo health, attach/view metadata, and version a simple video timeline object—all while existing add/commit/inspect workflows stay fast and stable.

---

## Alignment with README (core ground rules)
- Preserve core CAS invariants: BLAKE3 IDs, FastCDC defaults; metadata/timelines must not change manifest identity.
- UX polish should mirror git familiarity while staying explicit for binaries (no silent merges).
- Integrity first: fsck is detection-only in this phase; errors must be clear and actionable.
- Timelines are optional, open, and tool-agnostic; project graphs extend commits without breaking file snapshots.
- Add optional binary-aware `dits diff` summaries (size/hash/metadata) to aid review.
- Plan for optional fsck auto-repair in later phases: re-fetch missing objects or quarantine corrupt ones (off by default).

---

## Goals (zoomed in)
1) CLI feels like a real VCS (config, branches, nicer output).
2) Repo health is verifiable (`dits fsck`).
3) Domain-aware metadata can be attached per manifest (video/photo/etc.) without changing object identity.
4) A minimal video project graph type exists and can be committed/versioned.
5) Performance and ergonomics stay solid for multi-GB repos.

---

## 1) UX / Config Polish

### 1.1 `dits config` (user identity)
- Commands:
  - `dits config user.name "Byron Wade"`
  - `dits config user.email "bw@wadesinc.io"`
  - `dits config user.name` (print) / `dits config --list`.
- Core (`RepoConfig` helpers):
  - `get_user() -> Option<&UserConfig>`
  - `set_user_name(String)`
  - `set_user_email(String)`
- CLI: parse keys (`user.name`, `user.email`), update config, save.

### 1.2 Branches (simple, git-flavored)
- Commands:
  - `dits branch` (list, mark current with `*`).
  - `dits branch <name>` (create at current HEAD).
  - `dits checkout <branch>` (move HEAD ref, rebuild working tree).
- Core helpers in `Repo`:
  - `read_head_ref()`, `write_head_ref(refname)`
  - `read_ref(refname) -> Option<ObjectId>`
  - `write_ref(refname, commit_id)`
  - `list_branches() -> Vec<(String, Option<ObjectId>)>`
- Semantics: `HEAD` stores `ref: refs/heads/<branch>`; refs live in `.dits/refs/heads/`.

### 1.3 Nicer output
- Add branch name to `status`, `log`, `commit` summaries.
- Color-code: added (green), modified (yellow), deleted (red).
- Friendlier errors (repo not found, no HEAD, path not tracked).

---

## 2) Integrity: `dits fsck`

### 2.1 Checks
1. Objects: re-hash every object, verify ID matches bytes.
2. Manifests: offsets non-decreasing; sum(length) == file_size; referenced chunks exist.
3. Trees: no duplicate paths; manifest IDs exist and are manifests.
4. Commits: tree exists; parents (if any) exist and are commits.
5. Refs: each ref points to an existing commit.

### 2.2 Core outline (`Repo::fsck`)
- Return `FsckReport { objects_checked, errors: Vec<String> }`.
- Scan `.dits/objects/{chunk,manifest,tree,commit}/**`.
- Validate manifests/trees/commits/refs as above.
- CLI `dits fsck` prints summary; no auto-repair (detection-only for Phase 5).

---

## 3) Metadata Hooks (optional, manifest-scoped)

### 3.1 Storage layout
```
.dits/
  meta/
    manifest/
      9e/21/mf_9e21c38bbf5a91...json
```
- Metadata is keyed by `FileManifest` ID (version-specific, not path-specific).

### 3.2 JSON examples
Video:
```json
{
  "type": "video",
  "mime": "video/mp4",
  "duration": 123.45,
  "width": 1920,
  "height": 1080,
  "codec": "h264",
  "extra": { "has_audio": true, "bitrate": 8000000 }
}
```
Photo (RAW):
```json
{
  "type": "photo",
  "mime": "image/x-canon-cr3",
  "width": 6000,
  "height": 4000,
  "camera_model": "Canon R5",
  "iso": 1600,
  "exposure": "1/125",
  "f_number": 2.8
}
```

### 3.3 Extractor trait
```rust
pub trait MetadataExtractor {
    fn name(&self) -> &'static str;
    fn supports(&self, path: &Path, mime: Option<&str>) -> bool;
    fn extract(&self, path: &Path) -> Result<Value, String>;
}
```
- `MetadataRegistry` holds extractors; filters by `supports`.
- Phase 5 built-ins (OK to shell out for POC):
  - `BasicFileExtractor` (size, ext, mime guess).
  - `VideoFFprobeExtractor` (if `ffprobe` available).
  - `PhotoExifExtractor` (via `exiftool` or a Rust EXIF crate).

### 3.4 Store/load helpers in `Repo`
- `store_manifest_metadata(manifest_id, json)` writes under `.dits/meta/manifest/{hh}/{id}.json`.
- `load_manifest_metadata(manifest_id) -> Option<Value>`.

### 3.5 CLI
- `dits meta scan`:
  - For HEAD commit, iterate files, run extractors, store metadata by manifest ID.
- `dits meta show <path>`:
  - Resolve path → manifest in HEAD, load metadata, pretty-print.

---

## 4) First Project Graph: Minimal Video Timeline

Start modeling edits, not just files.

### 4.1 New object type
- Extend `ObjectType` with `Project`; store under `.dits/objects/project/{hh}/{id}`.

### 4.2 Timeline schema (JSON)
```json
{
  "object_type": "project_graph",
  "version": 1,
  "kind": "video_timeline",
  "name": "main-cut",
  "tracks": [
    {
      "id": "v1",
      "type": "video",
      "clips": [
        {
          "id": "clip-001",
          "file_path": "video_v1.mp4",
          "manifest_id": "mf_9e21c38bbf5a91...",
          "in": 0.0,
          "out": 10.0,
          "start": 0.0
        }
      ]
    }
  ]
}
```
- `in/out/start` in seconds.
- `file_path` is path in the commit tree; `manifest_id` pins exact bytes used.

### 4.3 Storing project graphs
- `ProjectGraph::to_bytes/from_bytes` (JSON, versioned).
- `store_project_graph(store, &graph) -> ObjectId` (hash = BLAKE3, prefix `project`).

### 4.4 Commits referencing projects
- Extend `Commit` with optional `projects: Vec<String>` (defaults empty for old commits).
- `create_commit_with_projects(tree_id, project_ids, parents, author, message)` stores commit with project list.
- `load_projects_for_commit(commit_id) -> Vec<(ObjectId, ProjectGraph)>`.

### 4.5 CLI (minimal video workflow)
- `dits video-init <name>`: create empty `ProjectGraph`, store, commit with same tree and `projects=[id]`.
- `dits video-add-clip <project> --file <path> --in <f> --out <f> --start <f>`:
  - Load HEAD, find project by name in `projects`.
  - Resolve file path → manifest ID (from HEAD tree/manifest mapping).
  - Append clip (create track if none), store new project, commit with same tree + updated project ID, parent=HEAD.
- `dits video-show <project>`: pretty-print tracks/clips for project in HEAD.

---

## 5) Performance & Ergonomics Touch-ups

- **Parallel chunking**: optional rayon/scoped threads to chunk multiple files concurrently.
- **Configurable chunk sizes** in `.dits/config.toml`:
  ```toml
  [chunking]
  min_size = 131072   # 128 KiB
  max_size = 4194304  # 4 MiB
  ```
- **Ignore patterns**: `.ditsignore` globs (skip `.dits`, `node_modules`, `*.tmp`, etc.).
- Better error/help text across commands.

---

## 6) Phase 5 “Done” Checklist

1. **Config & branches**:
   - `dits config user.name/user.email` works and is used in commits.
   - `dits branch`, `dits checkout <branch>` behave correctly; listing marks current branch.
2. **Integrity**:
   - `dits fsck` re-hashes objects, validates manifests/trees/commits/refs, reports errors.
3. **Metadata**:
   - `dits meta scan` populates `.dits/meta/manifest/**/*.json` for supported files.
   - `dits meta show <path>` prints metadata for the file’s manifest in HEAD.
4. **Project graph (video)**:
   - `dits video-init <name>` creates a project graph commit.
   - `dits video-add-clip` updates it and commits without altering the tree.
   - `dits video-show` prints tracks/clips with manifest IDs.
5. **Perf sanity**:
   - Parallel chunking optional and stable.
   - CLI remains responsive on multi-GB repos; no OOMs.

At this point, dits is a usable, trustworthy, media-aware VCS with versioned timelines—ready for ditshub to layer UI/auth/GPU work on top.

---

## Actionable Build Order (Phase 5)

1) Config polish: add `set/get` helpers; implement `dits config` subcommand.
2) Branching: core ref helpers; CLI `branch` list/create; branch-aware `checkout`.
3) Output polish: branch in status/log/commit; colors; friendlier errors.
4) Integrity: implement `Repo::fsck`; add `dits fsck` command; basic tests.
5) Metadata: extractor trait/registry; store/load helpers; `dits meta scan/show`; ship basic extractors.
6) Project graph: add `ObjectType::Project`; store/load project graphs; extend commit schema; CLI `video-init/add-clip/show`.
7) Ergonomics/perf: optional parallel chunking; `.ditsignore`; chunk size config.

---

## Testing Strategy

- **Unit tests**: config helpers; branch/ref helpers; fsck structure checks; metadata store/load; project graph store/load.
- **Integration tests**: branch/checkout flows; fsck on healthy/broken repos; meta scan/show on sample media; video-init/add-clip/show end-to-end (tree unchanged, projects updated); optional parallel chunking smoke test.
- **Manual**: run Phase 4 POCs again (video/game/photo) with new features; verify fsck passes; verify meta scan/show returns expected metadata; verify video timeline commits appear in log and are retrievable.

---

## Future Enhancements (Post-Phase 5)

- Fast-forward enforcement and ref-locking for push/pull (when remotes are on).
- Richer metadata (waveforms, thumbnails) stored alongside manifests.
- OTIO/EDL export for project graphs; basic render-from-timeline helper.
- Branch protection and pre-push hooks once ditshub exists.
- Automatic repair modes in `fsck` (optional), plus pruning of unreachable objects.
- Interactive diff for timelines (clip-level changes).
