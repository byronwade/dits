# Phase 1: The Engine (Foundation)

> **Status: ✅ COMPLETE** - All Phase 1 deliverables have been implemented.

Execution manual for building a real, code-ready engine. Expanded with module-level detail, data model, and concrete build order.

**Objective:** Ship a local-first CLI that chunks, dedupes, and reconstructs large binaries with git-like commits/refs, and is ready to bolt on a minimal HTTP remote.

**Success Metric (Phase 1):** Ingest a 10GB file, flip 1 byte, re-ingest, and storage grows by ~64KB (1-2 chunks) while checkout round-trips bit-for-bit.

---

## Alignment with README (core ground rules)
- Content-addressed everywhere (BLAKE3-256 with type prefixes: ch/mf/tr/cm).
- Chunking defaults: FastCDC, min 128 KiB, avg 1 MiB, max 4 MiB (keep consistent across phases).
- File-agnostic core; metadata and timelines are optional layers (do not change manifest identity).
- Safety: no silent errors—prefer explicit failures; avoid `unwrap` in prod code.
- Performance target reference: chunk 10GB in <5 minutes on dev-class hardware.

---

## Phase 1 Goal (zoomed in)
Build `dits-core` as a Rust library that can:
- Initialize a repo (`.dits/` layout).
- Store/retrieve typed objects (chunks, manifests, trees, commits).
- Chunk arbitrary files into content-addressed chunks.
- Build `FileManifest`s for files.
- Build `Tree`s and `Commit`s from the working directory + index.
- Round-trip reconstruct files from manifests and verify byte equality.

Local-only; no network yet. The Phase 2 CLI will sit atop this.

---

## Product Overview (what dits is)
- Open-source, git-like version control for large binaries (video, photo, game builds, archives, etc.).
- Core treats files as opaque bytes; optional metadata hooks add semantics without changing the core.
- Content-addressed objects: chunks, manifests, trees, commits, refs.
- CLI: `init`, `add`, `status`, `commit`, `log`, `checkout`, `restore`; later `push/pull`.
- Remote model is simple HTTP object/refs store; self-hostable and pluggable.

---

## Architecture Snapshot (Phase 1 scope)
- Local-only core: chunk store + manifests + trees + commits + refs.
- Content-addressed objects (BLAKE3) stored under `.dits/objects/` with fan-out.
- Index (staging) tracks `path -> manifest_id`.
- CLI surface for Phase 1: `init`, `add`, `status`, `commit`, `log`, `checkout`, `restore`.
- Keep IDs/layout compatible with a future HTTP remote (no protocol change later).

---

## Repo Layout & Crate Structure
```
dits/
  crates/
    dits-core/
      src/
        lib.rs
        repo.rs
        object_store.rs
        object_id.rs
        chunker.rs
        manifest.rs
        tree.rs
        commit.rs
        index.rs
        errors.rs
      Cargo.toml
```
Phase 1 code lives in `dits-core`; the CLI in Phase 2 will call into it.

---

## On-Disk Layout (repo-local)
```
.dits/
  config.toml
  objects/
    chunk/6e/1c/ch_6e1c...      # bytes
    manifest/9e/21/mf_9e21...  # json
    tree/4f/aa/tr_4faa...      # json
    commit/8d/92/cm_8d92...    # json
  refs/
    heads/main
    tags/v1.0.0
  HEAD
  index
```
- Fan-out: first 2 bytes of hash as directories to avoid hot spots.
- `index` is the staging area (path, manifest_id, status).

---

## Core Data Model (IDs with type prefixes)
- `Chunk` (`ch_<hex>`): variable-sized slice; `{ hash, length, offset_in_file }`.
- `FileManifest` (`mf_<hex>`): ordered chunks + `{ file_size, mtime, mode, file_hash }`.
- `Tree` (`tr_<hex>`): path -> manifest_id entries.
- `Commit` (`cm_<hex>`): `{ tree, parents, author, timestamp, message }`.
- `Ref`: named pointer to a commit (`refs/heads/main`, tags under `refs/tags/`).
IDs are BLAKE3-256 hex strings, prefixed by type for clarity and storage layout.

---

## Object Store (FsObjectStore)
- Trait: `put_raw(id, bytes)`, `get_raw(id)`, `exists(id)`, `path_for(id)`.
- Path scheme: `objects/{type}/{first-two-hex}/{typePrefix_fullHex}`.
- Idempotent writes: if exists, no-op.
- One implementation in Phase 1: filesystem under `.dits/objects`.

---

## Chunking & Dedup (all file types)
- Algorithm target: FastCDC (content-defined chunking).
  - Min: 128 KiB, Avg: 1 MiB, Max: 4 MiB (tuned for large binaries).
- Interim POC allowed: fixed-size chunking behind same API, so swapping to FastCDC is an internal change only.
- Pipeline:
  1) Stream bytes through CDC to find boundaries.
  2) For each chunk: compute BLAKE3; if `objects/chunk/...` missing, write; else reuse.
  3) Append `{ id, offset, length }` to the manifest.
- File hash: compute BLAKE3 over full file for end-to-end integrity (optional SHA256 mirror if needed).
Helper: `save_chunk_with_fanout(hash, bytes)` -> `.dits/objects/chunk/{hh}/{tt}/ch_<hash>`.

---

## FileManifest (v1)
```json
{
  "type": "file_manifest",
  "version": 1,
  "file_size": 10737418240,
  "mtime": 1733430000,
  "mode": 420,
  "file_hash": "b3_...",
  "chunks": [
    { "id": "ch_6e1c...", "offset": 0, "length": 1048576 },
    { "id": "ch_7ac8...", "offset": 1048576, "length": 1048576 }
  ]
}
```
- Built from chunk descriptors; persisted as JSON; ID = BLAKE3(manifest bytes) with `mf_` prefix.
- Reconstruction: stream chunk objects in order to rehydrate the file; verify optional file hash.

---

## Tree & Commit (snapshotting state)
- `Tree` entries: `{ path, manifest_id }`; ID = BLAKE3(tree JSON) with `tr_` prefix.
- `Commit`: `{ tree, parents, author{name,email}, timestamp, message }`; ID = BLAKE3(commit JSON) with `cm_` prefix.
- Phase 1 can manage parents in-memory; ref/HEAD wiring can be basic (written in Phase 2).

---

## Index (staging map)
- Stores `path -> manifest_id`.
- JSON file at `.dits/index`.
- Ops: add, remove, list; load/save via `IndexStore`.

---

## Repo API (Phase 1 ergonomics)
- `Repo::init(path)`: create `.dits/` layout and object directories.
- `Repo::open(path)`: load existing repo.
- `Repo::add_file(rel_path)`: chunk file, build manifest, return staged entry.
- `Repo::commit(author, message, parents)`: turn index into tree, create commit, return commit id.
- (Phase 2 will add refs/HEAD updates and CLI wiring.)

---

## Minimal Remote Model (future-proofing)
- Remote = object store + refs store over HTTP.
- Endpoints:
  - `GET /objects/{type}/{id}` (bytes)
  - `HEAD /objects/{type}/{id}` (existence)
  - `PUT /objects/{type}/{id}` (idempotent upload)
  - `GET /refs/{name}` (commit id)
  - `PUT /refs/{name}` (fast-forward-only at first)
- CLI behavior:
  - `push`: discover missing objects via `HEAD`, upload via `PUT`, update remote ref.
  - `pull`: fetch objects, update local ref; merge/checkout locally.

---

## Tech Stack & Repo Layout
- Language: Rust 1.75+.
- Crates: `dits-core` (Phase 1), `dits-cli` (Phase 2), `dits-remote` (Phase 3).
- Key libs: `blake3`, `fastcdc`, `serde/serde_json`, `tokio`, `clap`, `reqwest` or `hyper`, `axum` or `warp`.
- Docs/specs: `docs/spec/objects.md`, `docs/spec/remote-protocol.md`.
- Examples: `examples/basic-video`, `examples/basic-photo`, `examples/game-build`.

---

## End-to-End Flow (local)
- `dits init`: create `.dits/`, config, objects layout, empty refs/index.
- `dits add <paths>`: chunk files, store new chunks, build/store manifest, stage `path -> manifest_id`.
- `dits status`: compare working dir to last commit tree + index; show added/modified/deleted/untracked.
- `dits commit -m`: build Tree from staged entries; create Commit; move ref/HEAD (Phase 2).
- `dits log`: walk commits from HEAD (Phase 2).
- `dits checkout <commit>`: materialize tree into working dir (Phase 2).
- `dits restore <manifest> <output>`: reconstruct a single file (debug/forensics).

---

## Phase Plan (POC -> MVP)

### Phase 0 - Design & Spec (1-2 weeks)
- Lock object model, IDs, on-disk layout.
- Write `docs/spec/objects.md` (Chunk, FileManifest, Tree, Commit, Ref schemas).
- Write `docs/spec/remote-protocol.md` (HTTP endpoints, payloads, semantics).
- Decide chunking params and ID prefixes (BLAKE3 hex).

### Phase 1 - Core Library: Local Engine (2-3 weeks)
- Implement `ObjectStore` trait + filesystem backend under `.dits/objects`.
- Implement chunker: start fixed-size; keep API ready for FastCDC swap.
- Build/persist FileManifest; return manifest_id.
- Build Tree from staged `[(path, manifest_id)]`.
- Create Commit `{tree, parents, author, timestamp, message}`; update refs/HEAD (minimal).
- Implement Index (staging) format + read/write helpers.
- Tests: round-trip reconstruct; dedup when a file is modified mid-body.

### Phase 2 - CLI: Local VCS UX (2-3 weeks)
- `dits init`, `add`, `status`, `commit`, `log`, `checkout`, `restore`.
- Status logic: compare working dir vs last commit tree; show added/modified/deleted/untracked.
- Log traversal from `HEAD`; pretty output.
- Smoke test with large file modified slightly; verify only new chunks added.

### Phase 3 - Reference Remote Server (2-3 weeks)
- Implement HTTP remote: `GET/PUT/HEAD /objects/{type}/{id}`, `GET/PUT /refs/{name}` backed by filesystem storage.
- Implement `Remote` trait in `dits-core` for push/pull.
- CLI: `remote add`, `push`, `pull` (fast-forward only).
- Prep for later `clone` (init + remote + pull + checkout sugar).

### Phase 4 - POC Media & Large-File Flows (1-2 weeks)
- Large-file tests (5-50GB); measure ingest throughput, chunk count, dedup after small edits.
- `dits inspect`: per-file stats (size, chunk count, reuse rate, physical storage).
- Examples: video edits, game builds (v1/v2), photo edits; show dedup savings.

### Phase 5 - MVP Polish & Hooks (ongoing)
- UX polish: better status/log formatting; `dits config` for user identity; clearer errors/help.
- Metadata hooks: pluggable extractors by mime/type -> optional JSON attached to manifest_id.
- `dits fsck`: hash verification, manifest consistency, reachability.
- Performance: multi-threaded chunking, buffered I/O, benchmarks for HDD vs SSD.

---

## Actionable Build Order (Phase 1)
1) Create `dits-core` crate.
2) Implement `ObjectType`, `ObjectId`; add `DitsError`.
3) Implement `FsObjectStore` (path fan-out).
4) Implement `ChunkDescriptor` + `Chunker::chunk_file` (fixed-size now, CDC-ready API).
5) Implement `FileManifest` + `build_manifest` + `reconstruct_from_manifest`.
6) Implement `Tree`, `TreeEntry`, `store_tree`.
7) Implement `Commit`, `CommitAuthor`, `store_commit`.
8) Implement `Index`, `IndexStore`.
9) Implement `Repo::init`, `Repo::open`, `Repo::add_file`, `Repo::commit`.
10) Add tests: file round-trip; dedup sanity; commit/tree/index integration.

---

## Comprehensive Test & Bench Plan
1) Generate 100MB sample: `dd if=/dev/urandom of=video_v1.bin bs=1M count=100`.
2) `dits init && dits add video_v1.bin && dits commit -m "v1"`; expect `.dits/objects` ~ file size.
3) Flip byte #50,000,000 -> `video_v2.bin`; `dits add video_v2.bin && dits commit -m "v2"`.
4) Storage delta should be ~1-2 chunks (~1-2 MiB with current params; target ~64KiB when chunk size shrinks).
5) `dits checkout <v2>` then `diff video_v2.bin restored.bin` (bit-for-bit).
6) Stress: ingest 10GB file; record ingest throughput, chunk count, dedup % after a 1-byte flip.
7) Remote smoke (Phase 3+): push/pull same repo across two machines; verify refs and objects match.

---

## Open Extensions (kept compatible)
- Metadata hooks: optional per-file JSON (mime/type, dimensions) keyed by manifest_id.
- Remote HTTP API: already specified; keep IDs/layout stable.
- Project graphs (timelines/build manifests) as another object type later; core remains file-agnostic.

---

## Next If Needed
- Draft first Rust tests for round-trip and dedup.
- Swap fixed-size chunking to FastCDC inside `Chunker` without changing the public API.
