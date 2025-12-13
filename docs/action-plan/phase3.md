# Phase 3: Virtual File System (FUSE Mount)

> **Status: ✅ COMPLETE** - VFS mounting with on-demand hydration has been implemented.

Execution manual for building FUSE-based virtual filesystem mounting and the foundation for remote protocol.

**Objective:** Enable on-demand file access via FUSE mount without downloading entire repository.

**Success Metric:** Repository can be mounted as a virtual filesystem. Files are hydrated on-demand when accessed. Video files play correctly from mounted filesystem.

---

# Phase 3 (Original): Remote Protocol & Network Sync

> **Status: 🚧 PLANNED** - Network features are planned for Phase 4.

Execution manual for building the remote HTTP API, server implementation, and push/pull functionality. This is where dits grows a network spine instead of just being a local storage engine.

**Objective:** Enable networked version control with a self-hostable remote server and push/pull commands.

**Success Metric:** Full remote workflow works: init repo, add files, commit, push to remote, pull on another machine, checkout.

---

## Alignment with README (core ground rules)
- Keep remote API minimal, open, self-hostable; Phase 3 stays single-repo, HTTP-first, QUIC later.
- Preserve object identities (BLAKE3, FastCDC chunking defaults) across local/remote; no server-side mutation of object bytes.
- Prefer fast-forward semantics by default; allow force only deliberately.
- Clear error semantics (404 for missing objects/refs, 400 for bad input); no silent fallback.
- Prepare for auth headers/tokens in remote config (future Phase 9) without changing API shapes.
- Support resumable push/pull: idempotent object PUTs, re-fetch missing manifests/trees after interruption.
- Add lightweight ref-locking to avoid concurrent ref updates; default to fast-forward enforcement.
- Emit basic observability: objects/bytes sent/received, dedup ratio, push/pull duration.

---

## Phase 3 Goal (zoomed in)

**Goal:** You can do this:

```bash
# Machine A
dits init
dits add big-video.mp4
dits commit -m "Initial"
dits remote add origin http://localhost:8080
dits push origin main

# Machine B
dits clone http://localhost:8080 my-project      # (optional in later step)
# or:
dits init my-project
cd my-project
dits remote add origin http://localhost:8080
dits pull origin main
```

Under the hood:
- A **dits-remote** HTTP server:
  - Exposes endpoints to GET/PUT/HEAD objects and GET/PUT refs.
  - Stores everything on disk in roughly the same layout as `.dits/objects`.
- The `dits` CLI:
  - Knows about **remotes** (`origin`) via a config.
  - Implements `push` and `pull` by syncing **objects** and **refs**.

Everything is open, simple, and self-hostable.

---

## HTTP API Design

We'll keep the API tiny and brutally simple.

### URL Structure (Single-Repo Remote for P3)

For Phase 3, assume **one repo per server** to keep it simple:

Base: `http://remote.host/api/v1`

**Endpoints:**

**Objects:**
- `HEAD /api/v1/objects/{type}/{id}`
- `GET  /api/v1/objects/{type}/{id}`
- `PUT  /api/v1/objects/{type}/{id}`

**Refs:**
- `GET  /api/v1/refs/{refPath}` - e.g. `refs/heads/main`, `refs/tags/v1.0.0`
- `PUT  /api/v1/refs/{refPath}`

Later you can add multi-repo like `/api/v1/repos/{owner}/{name}/objects/...`, but Phase 3 can be single-repo.

#### Object `type` values

Match your `ObjectType`:
- `chunk`
- `manifest`
- `tree`
- `commit`

#### Example object URLs

```
HEAD /api/v1/objects/chunk/ch_6e1c4d2a9f9cd5e...
GET  /api/v1/objects/manifest/mf_9e21c38bbf5a91...
PUT  /api/v1/objects/commit/cm_8d92f0e4a1b753...
```

### Object Endpoints Behavior

**HEAD /api/v1/objects/{type}/{id}**
- 200 if exists (no body).
- 404 if not.

**GET /api/v1/objects/{type}/{id}**
- 200 with raw bytes as body (no JSON wrapper).
- `Content-Type: application/octet-stream`.
- 404 if not found.

**PUT /api/v1/objects/{type}/{id}**
- 201 Created if stored.
- 200 OK if already existed (idempotent).
- Body = raw bytes.
- Server **does not recompute hash** — it trusts the client to send data under the right ID.
  (Later you *can* add verification for paranoia.)

### Ref Endpoints Behavior

We store refs as simple text files (just like git), but expose via HTTP.

**GET /api/v1/refs/refs/heads/main**

Response:
- 200, JSON:
  ```json
  { "commit_id": "cm_8d92f0e4a1b753..." }
  ```
- 404 if ref doesn't exist (no commit yet).

**PUT /api/v1/refs/refs/heads/main**

- Request body JSON:
  ```json
  { "commit_id": "cm_8d92f0e4a1b753..." }
  ```
- 200 on success.

For Phase 3, we'll allow blind overwrites or simple "fast-forward only" semantics; advanced concurrency rules can come later.

### Error Responses

On errors:
```json
{ "error": "Object not found", "details": "..." }
```

With appropriate HTTP status codes:
- 400 for bad input.
- 404 for missing objects/refs.
- 500 for server errors.

---

## dits-remote Server Architecture

### Crate Layout

Add another crate:
```
dits/
  crates/
    dits-core/
    dits-cli/
    dits-remote/
      Cargo.toml
      src/
        main.rs
        server.rs
```

### Storage Layout on Server

Server data dir (e.g. `/var/lib/dits-remote` or configurable):
```
remote-root/
  objects/
    chunk/
      6e/1c/ch_6e1c4d2a9f9cd5e...
    manifest/
    tree/
    commit/
  refs/
    heads/
      main
    tags/
      v1.0.0
```

It's basically the **same structure** as `.dits/objects` and `.dits/refs` for a repo, just without working directory and index.

You can even reuse `FsObjectStore` from `dits-core`.

### Server State Struct

```rust
// crates/dits-remote/src/server.rs
use std::path::PathBuf;
use std::sync::Arc;
use dits_core::object_store::FsObjectStore;

pub struct RemoteState {
    pub root: PathBuf,
    pub object_store: FsObjectStore,
}

impl RemoteState {
    pub fn new(root: PathBuf) -> Self {
        let object_store = FsObjectStore::new(root.join("objects"));
        Self { root, object_store }
    }

    pub fn refs_dir(&self) -> PathBuf {
        self.root.join("refs")
    }
}
```

### Choosing a Web Framework

Rust: use **axum** (simple, async, good ergonomics).

`Cargo.toml` example:
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1.38", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dits-core = { path = "../dits-core" }
```

### Routing

```rust
// crates/dits-remote/src/main.rs
use axum::{routing::{get, head, put}, Router};
use std::net::SocketAddr;
use std::sync::Arc;

mod server;

#[tokio::main]
async fn main() {
    let root = std::env::var("DITS_REMOTE_ROOT")
        .unwrap_or_else(|_| "./remote-data".to_string());
    let state = Arc::new(server::RemoteState::new(root.into()));

    let app = Router::new()
        .route(
            "/api/v1/objects/:otype/:id",
            get(server::get_object)
                .head(server::head_object)
                .put(server::put_object),
        )
        .route(
            "/api/v1/refs/*refpath",
            get(server::get_ref)
                .put(server::put_ref),
        )
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("dits-remote listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### Handlers (Full Implementation)

**Objects:**

```rust
// crates/dits-remote/src/server.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    body::Bytes,
    Json,
};
use std::sync::Arc;
use dits_core::object_id::{ObjectId, ObjectType};
use dits_core::object_store::ObjectStore;
use dits_core::errors::DitsError;

pub async fn head_object(
    State(state): State<Arc<RemoteState>>,
    Path((otype, id)): Path<(String, String)>,
) -> impl IntoResponse {
    match parse_object_id(&otype, &id) {
        Ok(oid) => match state.object_store.exists(&oid) {
            Ok(true) => StatusCode::OK,
            Ok(false) => StatusCode::NOT_FOUND,
            Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
        },
        Err(_) => StatusCode::BAD_REQUEST,
    }
}

pub async fn get_object(
    State(state): State<Arc<RemoteState>>,
    Path((otype, id)): Path<(String, String)>,
) -> impl IntoResponse {
    match parse_object_id(&otype, &id) {
        Ok(oid) => match state.object_store.get_raw(&oid) {
            Ok(data) => (
                StatusCode::OK,
                [("Content-Type", "application/octet-stream")],
                data,
            )
                .into_response(),
            Err(DitsError::ObjectNotFound(_)) => StatusCode::NOT_FOUND.into_response(),
            Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        },
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub async fn put_object(
    State(state): State<Arc<RemoteState>>,
    Path((otype, id)): Path<(String, String)>,
    body: Bytes,
) -> impl IntoResponse {
    match parse_object_id(&otype, &id) {
        Ok(oid) => {
            // idempotent: if already exists, just return 200
            match state.object_store.exists(&oid) {
                Ok(true) => StatusCode::OK.into_response(),
                Ok(false) => match state.object_store.put_raw(&oid, &body) {
                    Ok(()) => StatusCode::CREATED.into_response(),
                    Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
                },
                Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            }
        }
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

fn parse_object_id(otype: &str, id: &str) -> Result<ObjectId, String> {
    let object_type = match otype {
        "chunk" => ObjectType::Chunk,
        "manifest" => ObjectType::Manifest,
        "tree" => ObjectType::Tree,
        "commit" => ObjectType::Commit,
        _ => return Err("invalid object type".into()),
    };
    ObjectId::from_hex(id, object_type)
}
```

**Refs:**

```rust
#[derive(serde::Serialize, serde::Deserialize)]
pub struct RefBody {
    pub commit_id: String,
}

pub async fn get_ref(
    State(state): State<Arc<RemoteState>>,
    Path(refpath): Path<String>,
) -> impl IntoResponse {
    let path = state.refs_dir().join(refpath);
    if !path.exists() {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "ref not found"}))).into_response();
    }
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            let commit_id = content.trim().to_string();
            (StatusCode::OK, Json(RefBody { commit_id })).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "io error"}))).into_response(),
    }
}

pub async fn put_ref(
    State(state): State<Arc<RemoteState>>,
    Path(refpath): Path<String>,
    Json(body): Json<RefBody>,
) -> impl IntoResponse {
    let path = state.refs_dir().join(refpath);
    if let Some(parent) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Failed to create ref dir: {e}");
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    if let Err(e) = std::fs::write(&path, format!("{}\n", body.commit_id)) {
        eprintln!("Failed to write ref: {e}");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::OK
}
```

---

## Remote Client in `dits-core`

We need an abstraction so the CLI can talk to *any* remote implementation.

### Remote Trait

```rust
// crates/dits-core/src/remote.rs
use crate::errors::DitsError;
use crate::object_id::ObjectId;

pub trait Remote {
    fn has_object(&self, id: &ObjectId) -> Result<bool, DitsError>;
    fn upload_object(&self, id: &ObjectId, data: &[u8]) -> Result<(), DitsError>;
    fn fetch_object(&self, id: &ObjectId) -> Result<Vec<u8>, DitsError>;

    fn get_ref(&self, refname: &str) -> Result<Option<String>, DitsError>;
    fn set_ref(&self, refname: &str, commit_id: &str) -> Result<(), DitsError>;
}
```

### HttpRemote Implementation

Using `reqwest`:

```toml
# dits-core Cargo.toml
reqwest = { version = "0.12", features = ["json", "blocking"] }
```

```rust
// crates/dits-core/src/remote_http.rs
use crate::errors::DitsError;
use crate::object_id::{ObjectId, ObjectType};
use crate::remote::Remote;
use reqwest::blocking::Client;
use reqwest::StatusCode;

pub struct HttpRemote {
    base_url: String,
    client: Client,
}

impl HttpRemote {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            client: Client::new(),
        }
    }

    fn object_url(&self, id: &ObjectId) -> String {
        let otype = match id.object_type {
            ObjectType::Chunk => "chunk",
            ObjectType::Manifest => "manifest",
            ObjectType::Tree => "tree",
            ObjectType::Commit => "commit",
        };
        format!("{}/api/v1/objects/{}/{}", self.base_url, otype, id.to_hex())
    }

    fn ref_url(&self, refname: &str) -> String {
        format!("{}/api/v1/refs/{}", self.base_url, refname)
    }
}

impl Remote for HttpRemote {
    fn has_object(&self, id: &ObjectId) -> Result<bool, DitsError> {
        let url = self.object_url(id);
        let resp = self.client.head(&url).send()?;
        Ok(resp.status() == StatusCode::OK)
    }

    fn upload_object(&self, id: &ObjectId, data: &[u8]) -> Result<(), DitsError> {
        let url = self.object_url(id);
        let resp = self.client.put(&url).body(data.to_vec()).send()?;
        if resp.status().is_success() {
            Ok(())
        } else {
            Err(DitsError::InvalidState(format!(
                "upload_object failed: {}",
                resp.status()
            )))
        }
    }

    fn fetch_object(&self, id: &ObjectId) -> Result<Vec<u8>, DitsError> {
        let url = self.object_url(id);
        let resp = self.client.get(&url).send()?;
        match resp.status() {
            StatusCode::OK => Ok(resp.bytes()?.to_vec()),
            StatusCode::NOT_FOUND => Err(DitsError::ObjectNotFound(id.to_hex())),
            _ => Err(DitsError::InvalidState(format!(
                "fetch_object failed: {}",
                resp.status()
            ))),
        }
    }

    fn get_ref(&self, refname: &str) -> Result<Option<String>, DitsError> {
        let url = self.ref_url(refname);
        let resp = self.client.get(&url).send()?;
        match resp.status() {
            StatusCode::OK => {
                let v: serde_json::Value = resp.json()?;
                Ok(v.get("commit_id").and_then(|s| s.as_str()).map(|s| s.to_string()))
            }
            StatusCode::NOT_FOUND => Ok(None),
            _ => Err(DitsError::InvalidState(format!(
                "get_ref failed: {}",
                resp.status()
            ))),
        }
    }

    fn set_ref(&self, refname: &str, commit_id: &str) -> Result<(), DitsError> {
        let url = self.ref_url(refname);
        let body = serde_json::json!({ "commit_id": commit_id });
        let resp = self.client.put(&url).json(&body).send()?;
        if resp.status().is_success() {
            Ok(())
        } else {
            Err(DitsError::InvalidState(format!(
                "set_ref failed: {}",
                resp.status()
            )))
        }
    }
}
```

---

## Repo Config & Remotes

We need to teach repos about remotes and URLs.

### `.dits/config.toml`

Example:
```toml
[user]
name = "Byron"
email = "bw@wadesinc.io"

[remote.origin]
url = "http://localhost:8080"
```

### Config Struct

```rust
// crates/dits-core/src/config.rs
use crate::errors::DitsError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UserConfig {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RemoteConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RepoConfig {
    pub user: Option<UserConfig>,
    pub remote: std::collections::HashMap<String, RemoteConfig>,
}

pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn new(repo_root: &Path) -> Self {
        Self {
            path: repo_root.join(".dits").join("config.toml"),
        }
    }

    pub fn load(&self) -> Result<RepoConfig, DitsError> {
        if !self.path.exists() {
            return Ok(RepoConfig::default());
        }
        let content = fs::read_to_string(&self.path)?;
        let cfg: RepoConfig = toml::from_str(&content)?;
        Ok(cfg)
    }

    pub fn save(&self, cfg: &RepoConfig) -> Result<(), DitsError> {
        let s = toml::to_string_pretty(cfg)?;
        fs::write(&self.path, s)?;
        Ok(())
    }
}
```

---

## CLI Commands: remote, push, pull

### `dits remote add`

**Usage:**
```bash
dits remote add origin http://localhost:8080
dits remote list
```

**Implementation:**
- `remote add`:
  - Discover repo.
  - Load `config.toml`.
  - Add `[remote.origin].url = "..."`
  - Save.
- `remote list`:
  - Print all remotes and URLs.

### Push Algorithm (Phase 3 version)

**Command:**
```bash
dits push origin main
```

**High-level steps:**
1. Discover repo.
2. Get remote URL from config (`origin`).
3. Build `HttpRemote`.
4. Resolve local branch ref: `refs/heads/main` → local tip `commit_id`.
5. **Find all objects reachable from local tip**:
   - Start from commit → tree → manifests → chunks.
   - BFS, collecting all `ObjectId`s.
6. For each object ID:
   - Call `Remote::has_object`.
   - If missing, read bytes from local `ObjectStore` and `upload_object`.
7. Update remote ref `refs/heads/main`:
   - (Optional fast-forward check – P3 can be naive: just set; or:
     - If remote ref exists and isn't equal to local parent, error.)

**Pseudo-code in CLI:**
```rust
fn push(remote_name: &str, branch: &str) -> Result<(), DitsError> {
    let repo = Repo::discover(...)?;
    let cfg_store = ConfigStore::new(&repo.root);
    let cfg = cfg_store.load()?;
    let remote_cfg = cfg.remote.get(remote_name).ok_or(...)?;
    let remote = HttpRemote::new(remote_cfg.url.clone());

    let local_ref = format!("refs/heads/{}", branch);
    let local_commit_id = repo.read_ref(&local_ref)?.ok_or("no local commits")?;

    let objects_to_push = repo.collect_reachable_objects(&local_commit_id)?;

    for oid in &objects_to_push {
        if !remote.has_object(oid)? {
            let data = repo.object_store.get_raw(oid)?;
            remote.upload_object(oid, &data)?;
        }
    }

    remote.set_ref(&local_ref, &local_commit_id.to_hex())?;
    println!("Pushed {} objects to {} {}", objects_to_push.len(), remote_name, branch);
    Ok(())
}
```

**Helper functions needed in `Repo`:**
- `read_ref(name) -> Option<ObjectId>`
- `write_ref(name, commit_id)`
- `collect_reachable_objects(commit_id) -> HashSet<ObjectId>`

**`collect_reachable_objects` implementation:**
- Start at commit.
- Add commit object ID.
- For that commit:
  - Add its tree object ID.
  - For each tree entry:
    - Add manifest ID.
    - From each manifest, add all chunk IDs.
- Follow parents recursively.

### Pull Algorithm (Phase 3 version)

**Command:**
```bash
dits pull origin main
```

**Steps:**
1. Discover repo.
2. Load remote URL, build `HttpRemote`.
3. Remote ref: `refs/heads/main` → `remote_tip` commit_id (string).
4. If no remote ref:
   - Nothing to pull.
5. Convert to `ObjectId`.
6. **Fetch** reachable objects from remote:
   - BFS from `remote_tip`:
     - For each object ID:
       - If local `ObjectStore` doesn't have it:
         - `fetch_object` from remote and `put_raw` locally.
       - For commits: parse to discover parents + tree.
       - For trees: parse to discover manifest IDs.
       - For manifests: parse to discover chunk IDs.
7. Update local ref `refs/heads/main` to `remote_tip`.
8. (Optional) Warn user that they're behind/need to `checkout` to see files update.

Phase 3 can keep it simple:
- No auto-merge.
- `pull` just updates the ref and fetches objects.
- User can run `dits checkout main` to move working directory to remote tip.

---

## Phase 3 Checklist

You can call Phase 3 "done" when:

1. **dits-remote**:
   - Runs with `DITS_REMOTE_ROOT=./remote-data`.
   - Accepts GET/PUT/HEAD for objects.
   - Accepts GET/PUT for refs.
   - Stores objects and refs on disk.

2. **dits-core**:
   - Has `Remote` trait and `HttpRemote` implementation.
   - `Repo` has helper methods:
     - `read_ref`, `write_ref`
     - `collect_reachable_objects`
   - `ConfigStore` for managing remotes.

3. **dits-cli**:
   - `dits remote add <name> <url>`
   - `dits remote list`
   - `dits push <remote> <branch>`
   - `dits pull <remote> <branch>`

4. **Manual test:**
```bash
   # Terminal 1
   DITS_REMOTE_ROOT=./remote-data cargo run -p dits-remote

   # Terminal 2
   mkdir local-a && cd local-a
   dits init
   echo hello > a.txt
   dits add a.txt
   dits commit -m "Initial"
   dits remote add origin http://localhost:8080
   dits push origin main

   # Terminal 3
   mkdir ../local-b && cd ../local-b
   dits init
   dits remote add origin http://localhost:8080
   dits pull origin main
   dits checkout main
   cat a.txt   # should print "hello"
   ```

If that all works, you've got:
> A **real networked VCS for giant files**, with a clean, open remote protocol and self-hostable server.

From there, ditshub is "just" a fancier multi-tenant version of the same remote with auth, accounts, GPU jobs, and UI layered on top.

---

## Actionable Build Order (Phase 3)

1. **Create `dits-remote` crate** with axum dependencies.
2. **Implement server state** (`RemoteState`) and storage layout.
3. **Implement object handlers** (`head_object`, `get_object`, `put_object`).
4. **Implement ref handlers** (`get_ref`, `put_ref`).
5. **Wire up routing** in `main.rs` and test server starts.
6. **Add `Remote` trait** to `dits-core`.
7. **Implement `HttpRemote`** in `dits-core` using reqwest.
8. **Add `ConfigStore`** to `dits-core` for managing remotes.
9. **Extend `Repo`** with:
   - `read_ref()`, `write_ref()`
   - `collect_reachable_objects()`
10. **Implement `dits remote add/list`** commands.
11. **Implement `dits push`** command.
12. **Implement `dits pull`** command.
13. **End-to-end test** with two local repos and remote server.

---

## Future Enhancements (Post-Phase 3)

- **Multi-repo support** - `/api/v1/repos/{owner}/{name}/...` endpoints.
- **Authentication** - Basic auth, API keys, or OAuth.
- **Fast-forward enforcement** - Prevent force-push by default.
- **Concurrent push protection** - Lock refs during updates.
- **Progress bars** - Show upload/download progress for large files.
- **Resume support** - Resume interrupted push/pull operations.
- **Compression** - Optional gzip compression for object transfers.
- **Batch operations** - Upload multiple objects in one request.
- **Virtual File System (VFS)** - Mount repos as drives with on-demand chunk fetching (separate phase).

---

## Testing Strategy

**Unit tests:**
- Test `HttpRemote` against mock server.
- Test `collect_reachable_objects` with known commit graphs.
- Test config loading/saving.

**Integration tests:**
- Start `dits-remote` server, test push/pull workflow.
- Test with large files (10GB+).
- Test concurrent pushes from different clients.

**Manual testing:**
- Two-machine test (local network).
- Test with real video files.
- Test error cases (network failures, missing objects).

---

## Next Steps After Phase 3

Once Phase 3 is complete, you have a fully functional networked VCS. Future phases can add:
- **Phase 4**: Media-specific POC flows (video-aware chunking, metadata extraction).
- **Phase 5**: Virtual File System (FUSE/WinFSP) for on-demand file access.
- **Phase 6**: Advanced features (branches, merges, conflict resolution).
- **Phase 7+**: ditshub (multi-tenant cloud service with auth, UI, etc.).

