//! HTTP server for serving Dits repositories over the network.
//!
//! This is an unauthenticated alpha utility for trusted or isolated networks.
//! It defaults to loopback, rejects path escape in repo/object parameters, and
//! does not enable CORS. Do not expose it to the public Internet.

use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions},
    io::Read,
    path::{Component, Path, PathBuf},
    sync::Arc,
};

use axum::{extract::Path as AxumPath, http::StatusCode, response::Json, routing::get, Router};
use serde_json::json;

/// Repository server state
pub struct RepoServer {
    /// Canonical base directory containing repositories
    base_dir: PathBuf,
}

impl RepoServer {
    /// Create a new repository server
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    /// Create the Axum router with all routes.
    ///
    /// Intentionally omits CORS: browser origins must not read unauthenticated
    /// repository bytes by default.
    pub fn router(self: Arc<Self>) -> Router {
        Router::new()
            .route("/repos/:repo/refs", get(Self::get_refs))
            .route("/repos/:repo/objects/:hash", get(Self::get_object))
            // Content-addressed incremental sync: list every object path, then serve any
            // object file by its store-relative path.
            .route("/repos/:repo/object-list", get(Self::list_objects))
            .route("/repos/:repo/object/*path", get(Self::get_object_file))
            .with_state(self)
    }

    fn repo_root(&self, repo: &str) -> Result<PathBuf, StatusCode> {
        let name = validate_repo_name(repo)?;
        let repo_path = self.base_dir.join(name);
        if !repo_path.join(".dits").is_dir() {
            return Err(StatusCode::NOT_FOUND);
        }
        Ok(repo_path)
    }

    /// List every object's store-relative path (newline-separated) — the "have"
    /// set.
    async fn list_objects(
        AxumPath(repo): AxumPath<String>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<String, StatusCode> {
        let repo_path = state.repo_root(&repo)?;
        let objects_dir = repo_path.join(".dits/objects");
        if !objects_dir.is_dir() {
            return Err(StatusCode::NOT_FOUND);
        }
        let mut out = String::new();
        for entry in walkdir::WalkDir::new(&objects_dir)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            // Do not follow or advertise symlinks as object files.
            if entry.file_type().is_symlink() || !entry.file_type().is_file() {
                continue;
            }
            if let Ok(rel) = entry.path().strip_prefix(&objects_dir) {
                out.push_str(&rel.to_string_lossy());
                out.push('\n');
            }
        }
        Ok(out)
    }

    /// Serve a single object file by its store-relative path.
    async fn get_object_file(
        AxumPath((repo, path)): AxumPath<(String, String)>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<Vec<u8>, StatusCode> {
        let repo_path = state.repo_root(&repo)?;
        let objects_dir = repo_path.join(".dits/objects");
        let safe_rel = validate_object_rel_path(&path)?;
        let file = objects_dir.join(safe_rel);
        ensure_path_under(&file, &objects_dir)?;
        read_regular_file(&file)
    }

    /// Get repository refs
    async fn get_refs(
        AxumPath(repo): AxumPath<String>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        let repo_path = state.repo_root(&repo)?;
        let mut refs = HashMap::new();
        collect_refs(&repo_path.join(".dits/refs/heads"), "refs/heads", &mut refs)?;
        collect_refs(&repo_path.join(".dits/refs/tags"), "refs/tags", &mut refs)?;
        Ok(Json(json!(refs)))
    }

    /// Get an object by hash
    async fn get_object(
        AxumPath((repo, hash)): AxumPath<(String, String)>,
        state: axum::extract::State<Arc<RepoServer>>,
    ) -> Result<Vec<u8>, StatusCode> {
        let repo_path = state.repo_root(&repo)?;
        let hash = validate_object_hash(&hash)?;
        let objects_dir = repo_path.join(".dits/objects");
        let prefix = &hash[..2];
        let rest = &hash[2..];

        // Match ObjectStore::object_path layout: <type>/<2 hex>/<remaining hex>.
        for obj_type in ["chunks", "manifests", "commits", "blobs"] {
            let object_path = objects_dir.join(obj_type).join(prefix).join(rest);
            ensure_path_under(&object_path, &objects_dir)?;
            if path_is_regular_file(&object_path) {
                return read_regular_file(&object_path);
            }
        }

        Err(StatusCode::NOT_FOUND)
    }
}

fn collect_refs(
    dir: &Path,
    prefix: &str,
    refs: &mut HashMap<String, String>,
) -> Result<(), StatusCode> {
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(dir).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
        let entry = entry.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else {
            continue;
        };
        if validate_ref_name(name).is_err() {
            continue;
        }
        let path = entry.path();
        if !path_is_regular_file(&path) {
            continue;
        }
        if let Ok(content) = read_regular_file_string(&path) {
            refs.insert(format!("{prefix}/{name}"), content.trim().to_string());
        }
    }
    Ok(())
}

/// Single-segment repository directory name under the configured base.
fn validate_repo_name(repo: &str) -> Result<&str, StatusCode> {
    let repo = repo.trim();
    if repo.is_empty() || repo.contains('\0') {
        return Err(StatusCode::BAD_REQUEST);
    }
    if repo.contains('/') || repo.contains('\\') || repo.contains(':') {
        return Err(StatusCode::BAD_REQUEST);
    }
    if repo == "." || repo == ".." {
        return Err(StatusCode::BAD_REQUEST);
    }
    let mut comps = Path::new(repo).components();
    match (comps.next(), comps.next()) {
        (Some(Component::Normal(c)), None) if c == std::ffi::OsStr::new(repo) => Ok(repo),
        _ => Err(StatusCode::BAD_REQUEST),
    }
}

fn validate_ref_name(name: &str) -> Result<&str, StatusCode> {
    validate_repo_name(name)
}

fn validate_object_hash(hash: &str) -> Result<&str, StatusCode> {
    if hash.len() != 64 || !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(StatusCode::BAD_REQUEST);
    }
    Ok(hash)
}

fn validate_object_rel_path(path: &str) -> Result<PathBuf, StatusCode> {
    let entry = path.trim();
    if entry.is_empty() || entry.contains('\0') || entry.contains('\\') || entry.starts_with('/') {
        return Err(StatusCode::BAD_REQUEST);
    }
    let mut safe = PathBuf::new();
    for seg in entry.split('/') {
        if seg.is_empty() || seg == "." || seg == ".." || seg.contains(':') {
            return Err(StatusCode::BAD_REQUEST);
        }
        let mut comps = Path::new(seg).components();
        match (comps.next(), comps.next()) {
            (Some(Component::Normal(c)), None) if c == std::ffi::OsStr::new(seg) => {
                safe.push(seg);
            },
            _ => return Err(StatusCode::BAD_REQUEST),
        }
    }
    if safe.as_os_str().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    Ok(safe)
}

fn ensure_path_under(path: &Path, root: &Path) -> Result<(), StatusCode> {
    let mut comps = path.components();
    let mut root_comps = root.components();
    loop {
        match (comps.next(), root_comps.next()) {
            (Some(a), Some(b)) if a == b => continue,
            (_, Some(_)) => return Err(StatusCode::BAD_REQUEST),
            (Some(Component::Normal(_)), None) => return Ok(()),
            (None, None) => return Ok(()),
            _ => return Err(StatusCode::BAD_REQUEST),
        }
    }
}

fn path_is_regular_file(path: &Path) -> bool {
    fs::symlink_metadata(path)
        .map(|m| m.file_type().is_file())
        .unwrap_or(false)
}

fn read_regular_file(path: &Path) -> Result<Vec<u8>, StatusCode> {
    let mut file = open_nofollow(path)?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(buf)
}

fn read_regular_file_string(path: &Path) -> Result<String, StatusCode> {
    let bytes = read_regular_file(path)?;
    String::from_utf8(bytes).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn open_nofollow(path: &Path) -> Result<File, StatusCode> {
    if !path_is_regular_file(path) {
        return Err(StatusCode::NOT_FOUND);
    }
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW);
    }
    options.open(path).map_err(|_| StatusCode::NOT_FOUND)
}

fn is_loopback_bind(bind: &str) -> bool {
    matches!(bind, "127.0.0.1" | "::1" | "localhost")
}

/// Start the repository server.
///
/// `bind` defaults to loopback in the CLI. Binding a non-loopback address
/// prints a warning: there is no authentication.
pub async fn start_server(base_dir: PathBuf, bind: &str, port: u16) -> anyhow::Result<()> {
    let base_dir = fs::canonicalize(&base_dir).unwrap_or(base_dir);
    let server = Arc::new(RepoServer::new(base_dir));
    let app = server.router();

    let addr = format!("{bind}:{port}");
    if !is_loopback_bind(bind) {
        eprintln!(
            "WARNING: dits serve has no authentication and will expose repository refs and \
             object bytes on {addr}. Use only on a trusted or isolated network. Prefer \
             --bind 127.0.0.1 for local use."
        );
    }
    println!("Starting Dits remote server on {addr} (no auth, CORS disabled)");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::os::unix::fs::symlink;

    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use tempfile::tempdir;
    use tower::ServiceExt;

    use super::*;

    fn seed_repo(base: &Path, name: &str) -> PathBuf {
        let repo = base.join(name);
        fs::create_dir_all(repo.join(".dits/objects/chunks/ab")).unwrap();
        fs::create_dir_all(repo.join(".dits/refs/heads")).unwrap();
        let hash = "ab".to_string() + &"cd".repeat(31);
        assert_eq!(hash.len(), 64);
        fs::write(repo.join(".dits/objects/chunks/ab").join(&hash[2..]), b"object-bytes").unwrap();
        fs::write(repo.join(".dits/refs/heads/main"), "deadbeef\n").unwrap();
        repo
    }

    async fn call(app: Router, uri: &str) -> (StatusCode, Vec<u8>) {
        let response = app
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let bytes = response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec();
        (status, bytes)
    }

    #[tokio::test]
    async fn rejects_absolute_and_parent_repo_names() {
        let tmp = tempdir().unwrap();
        seed_repo(tmp.path(), "demo");
        let app = Arc::new(RepoServer::new(tmp.path().to_path_buf())).router();

        for uri in [
            "/repos/../demo/refs",
            "/repos/%2e%2e/demo/refs",
            "/repos/%2Ftmp/refs",
        ] {
            let (status, _) = call(app.clone(), uri).await;
            assert!(
                status == StatusCode::BAD_REQUEST || status == StatusCode::NOT_FOUND,
                "{uri} => {status}"
            );
        }
    }

    #[tokio::test]
    async fn rejects_hash_path_escape_and_serves_canonical_layout() {
        let tmp = tempdir().unwrap();
        seed_repo(tmp.path(), "demo");
        let app = Arc::new(RepoServer::new(tmp.path().to_path_buf())).router();
        let hash = "ab".to_string() + &"cd".repeat(31);

        let (status, body) = call(app.clone(), &format!("/repos/demo/objects/{hash}")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, b"object-bytes");

        // `:hash` is a single path segment; multi-segment escapes never reach the
        // handler (router 404). Percent-encoded dots in one segment are rejected
        // by the hex/length validator.
        let (status, _) = call(app.clone(), "/repos/demo/objects/abcd../../../../../../etc/passwd").await;
        assert_eq!(status, StatusCode::NOT_FOUND);

        let sneaky = format!("ab{}{}", "cd".repeat(30), "%2e%2e");
        let (status, _) = call(app.clone(), &format!("/repos/demo/objects/{sneaky}")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let (status, _) = call(app, "/repos/demo/objects/not-a-hash").await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn rejects_symlink_object_reads() {
        let tmp = tempdir().unwrap();
        let repo = seed_repo(tmp.path(), "demo");
        let outside = tmp.path().join("secret.txt");
        fs::write(&outside, b"should-not-leak").unwrap();
        let link = repo.join(".dits/objects/chunks/ab").join("cd".repeat(31));
        fs::remove_file(&link).unwrap();
        symlink(&outside, &link).unwrap();

        let app = Arc::new(RepoServer::new(tmp.path().to_path_buf())).router();
        let hash = "ab".to_string() + &"cd".repeat(31);
        let (status, body) = call(app, &format!("/repos/demo/objects/{hash}")).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert!(!body.windows(b"should-not-leak".len()).any(|w| w == b"should-not-leak"));
    }

    #[tokio::test]
    async fn rejects_object_path_traversal() {
        let tmp = tempdir().unwrap();
        seed_repo(tmp.path(), "demo");
        let app = Arc::new(RepoServer::new(tmp.path().to_path_buf())).router();
        let (status, _) = call(app, "/repos/demo/object/chunks/../../secret").await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn validate_repo_name_rejects_escape() {
        assert!(validate_repo_name("demo").is_ok());
        assert!(validate_repo_name("../demo").is_err());
        assert!(validate_repo_name("/etc").is_err());
        assert!(validate_repo_name("a/b").is_err());
        assert!(validate_repo_name("..").is_err());
    }
}
