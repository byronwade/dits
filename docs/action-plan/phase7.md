# Engineering Execution Manual — Phase 7 (Dependency Graph)

**Project:** Dits (Data-Intensive Version Control System)  
**Phase:** 7 — The Spiderweb Layer (Dependency Graph)  
**Objective:** Prevent “Media Offline” by parsing project files to enforce presence of all linked assets; block commits with missing dependencies and auto-fetch on checkout.

---

## Alignment with README (core ground rules)
- Keep CAS/manifest identity untouched: dependency tracking augments metadata, not file content.
- Use open parsers and transparent rules; avoid proprietary rewrites—prefer clear errors and guidance.
- Ensure checkout/pull remain deterministic: dependencies must resolve to tracked manifests/chunks.
- Prefer fast-fail with actionable errors over silent relinking; keep workflow tool-agnostic.
- Add optional export/import paths (e.g., OTIO/EDL) to keep project graphs interoperable with NLEs.

---

## Core Problem: Dangling References
Project files (.prproj/.drp/FCPXML) reference external media by path. If media isn’t tracked, collaborators hit “MEDIA OFFLINE.” Dits treats project files like manifests: dependencies must exist before push.

---

## Tech Stack (Parsers)
| Software | Format | Strategy | Rust crates |
| :--- | :--- | :--- | :--- |
| Premiere Pro | Gzipped XML | Inflate, parse `<FilePath>` | `flate2`, `quick-xml` |
| DaVinci Resolve | Zip/SQLite | Open `.drp` zip, parse XML (`project.xml`) | `zip`, `rusqlite` |
| Final Cut Pro | FCPXML | Direct XML parse | `quick-xml` |
| After Effects | RIFF/binary | Regex/string hunt | `memmap2`, `regex` |

---

## Architecture Components
### Pre-Commit Hook (Gatekeeper)
- On `dits add project.prproj`: detect, inflate, stream-parse XML, collect paths (`FilePath`/`Source`).  
- Normalize paths (win/mac separators).  
- Verify each path is tracked in `.dits/index`.  
- If missing: block commit with clear error. If present: record dependency edges in manifest.

### Asset Graph (Manifest Edges)
```rust
struct AssetManifest {
    hash: String,
    path: String,
    dependencies: Vec<String>, // hashes of required assets
}
```

### Smart Pull (Recursive Fetch)
- On checkout, resolve dependencies from manifest; auto-download missing assets so projects open with media present.

---

## Implementation Sprints
### Sprint 1: Premiere Parser
- Gzip decode `.prproj`; stream parse XML for `<FilePath>`; resolve relative paths against project location; return unique paths.

### Sprint 2: Resolve `.drp` Parser
- Open `.drp` as zip; find `project.xml`; parse for media paths (e.g., `<SysPath>`). Focus on external media links.

### Sprint 3: Outside-Repo Detector
- If dependency path is outside repo root, block commit with guidance to relocate and relink inside repo (no auto-rewrite in Phase 7).

### Sprint 4: Dependency Visualizer
- CLI `dits graph project.prproj` renders tree with missing markers.

---

## Real-World Solutions
### Drive Letter Hell
- Do not rewrite project files; rely on consistent repo structure + VFS mount to satisfy relative search. Encourage unified mount points.

### Nested Sequences
- Parsers must recurse: project A references project B, which references media; collect transitive deps.

### Binary Blobs (AE/Blender)
- Fallback regex scan for media-like paths in binary; capture probable dependencies even without full spec.

---

## Phase 7 Verification Tests
- Forgetful Editor: adding project without media fails with explicit missing-path error; succeeds after adding media.  
- Fresh Install: checkout pulls project and dependencies automatically.  
- Moved Asset: relinked path recognized (by hash) and dependency path updated in manifest.

---

## Immediate Code Action
```bash
# In dits-client
cargo add quick-xml
cargo add flate2
cargo add regex
```
Next: implement Premiere parser to unzip `.prproj`, stream XML, and return referenced file paths.


