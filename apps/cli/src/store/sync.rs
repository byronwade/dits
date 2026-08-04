//! Content-addressed incremental object transfer.
//!
//! The heart of sync: because every object (chunk, manifest, commit, blob, and
//! the embedded git engine's objects/packs) is content-addressed, transferring
//! a repository is just "copy the objects the destination doesn't already
//! have." This is the resumable, deduplicated transfer property — an
//! interrupted copy resumes with only the missing objects, and re-syncing
//! transfers nothing.
//!
//! This operates over the local filesystem (the network transport is a separate
//! layer). It is **purely additive**: it only ever copies missing object files,
//! never deletes or overwrites — so it can never corrupt or lose data in the
//! destination.

use std::{
    io,
    path::{Path, PathBuf},
};

use walkdir::WalkDir;

/// Result of an object transfer.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct TransferStats {
    /// Object files copied (were missing in the destination).
    pub copied:  usize,
    /// Object files already present in the destination (deduplicated — not
    /// transferred).
    pub skipped: usize,
    /// Bytes actually copied.
    pub bytes:   u64,
}

/// Copy every object under `src_dits/objects` that `dst_dits/objects` lacks.
/// Returns transfer statistics. Existing destination objects are never touched.
pub fn transfer_objects(src_dits: &Path, dst_dits: &Path) -> io::Result<TransferStats> {
    let src_objects = src_dits.join("objects");
    let dst_objects = dst_dits.join("objects");
    if !src_objects.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("source has no object store at {}", src_objects.display()),
        ));
    }

    let mut stats = TransferStats::default();
    // WalkDir does not follow symlinks by default (`follow_links` is false), so a
    // symlink inside the source object store is yielded as a symlink entry —
    // `is_file()` is false for it and it is skipped here, never copied or
    // dereferenced. That keeps the walk from escaping `src_objects` via a
    // symlink, and every `rel` below is a real relative path
    // under `src_objects` (no `..`), so the destination join stays inside
    // `dst_objects`.
    for entry in WalkDir::new(&src_objects)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = match entry.path().strip_prefix(&src_objects) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let dst_path = dst_objects.join(rel);
        if dst_path.exists() {
            // Content-addressed: same path ⇒ same content. Already have it.
            stats.skipped += 1;
            continue;
        }
        if let Some(parent) = dst_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        // Copy to a temp file then rename so a concurrent reader never sees a partial
        // object.
        let tmp = dst_path.with_extension("tmp-incoming");
        std::fs::copy(entry.path(), &tmp)?;
        std::fs::rename(&tmp, &dst_path)?;
        stats.copied += 1;
        stats.bytes += entry.metadata()?.len();
    }
    Ok(stats)
}

/// Validate a single `object-list` entry returned by an **untrusted** remote.
///
/// Object-list entries are *logical* object-store paths a remote Dits server
/// (`dits serve`) hands us over HTTP. We must never assume they are
/// well-formed: a malicious or compromised remote can return traversal
/// sequences (`../../poc.txt`), absolute paths (`/etc/cron.d/x`), Windows drive
/// prefixes (`C:\…`), verbatim/device or UNC prefixes (`\\?\C:\…`,
/// `\\srv\share`), or mixed-separator tricks — any of which, if joined onto
/// `.dits/objects` and trusted to the OS to normalize, would let the remote
/// write files outside the object store (path traversal).
///
/// So we normalize by **policy, not by trusting OS path normalization**. The
/// only legal entry is a relative path of one or more `/`-separated *normal*
/// components. `/` is the sole permitted separator: it is portable and
/// predictable, and rejecting `\` outright means a Windows host can't be
/// tricked by `..\..\` even though backslash isn't a Unix separator.
/// Anything that doesn't fit is rejected up front, before the value ever
/// reaches the filesystem. Returns a safe relative path that can be joined
/// under `.dits/objects`.
fn validate_remote_object_path(rel: &str) -> anyhow::Result<PathBuf> {
    use std::path::Component;

    use anyhow::bail;

    let entry = rel.trim();
    if entry.is_empty() {
        bail!("remote object-list contained an empty entry");
    }
    // A NUL byte can truncate a path mid-syscall, hiding a different real target.
    if entry.contains('\0') {
        bail!("remote object path contains a NUL byte");
    }
    // Backslash is a separator on Windows but not Unix. The remote protocol allows
    // only `/`, so reject `\` entirely — this also kills `C:\…`, `\\?\…`, and
    // `\\server\share` forms.
    if entry.contains('\\') {
        bail!("remote object path contains a backslash: {entry:?}");
    }
    // A leading `/` is an absolute path (and, with `\` already excluded, the only
    // absolute form).
    if entry.starts_with('/') {
        bail!("remote object path is absolute: {entry:?}");
    }

    let mut safe = PathBuf::new();
    for seg in entry.split('/') {
        if seg.is_empty() {
            // Empty segment ⇒ a leading/trailing/double slash like `a//b` or `a/`.
            bail!("remote object path has an empty segment: {entry:?}");
        }
        if seg == "." || seg == ".." {
            bail!("remote object path has a relative segment: {entry:?}");
        }
        // A colon catches a Windows drive letter (`C:`) appearing as a segment.
        if seg.contains(':') {
            bail!("remote object path segment looks like a drive/scheme prefix: {entry:?}");
        }
        // Windows interprets reserved device names (CON, NUL, COM1, …) as devices even
        // when they appear inside a directory, and it strips trailing
        // dots/spaces from a component. Neither is a directory-escape, but both
        // make a write land somewhere other than the intended store file — so
        // reject them to keep object paths interpreted identically on
        // every platform. Valid object paths (hex shards +
        // `chunks`/`manifests`/`commits`) never collide with these.
        if seg.ends_with('.') || seg.ends_with(' ') {
            bail!("remote object path segment has a trailing dot or space: {entry:?}");
        }
        const WINDOWS_RESERVED: &[&str] = &[
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];
        let stem = seg.split('.').next().unwrap_or(seg).to_ascii_uppercase();
        if WINDOWS_RESERVED.contains(&stem.as_str()) {
            bail!("remote object path segment is a reserved device name: {entry:?}");
        }
        // Defense in depth: confirm the OS itself sees this segment as exactly one
        // *normal* path component (catches any platform-specific form we didn't
        // anticipate, e.g. a Windows `Prefix`/`RootDir` component sneaking
        // through).
        let mut comps = Path::new(seg).components();
        match (comps.next(), comps.next()) {
            (Some(Component::Normal(c)), None) if c == std::ffi::OsStr::new(seg) => {},
            _ => bail!("remote object path has a non-normal segment: {entry:?}"),
        }
        safe.push(seg);
    }
    Ok(safe)
}

/// Same incremental, additive transfer as [`transfer_objects`], but pulling
/// from a remote Dits HTTP server (`dits serve`). `base_url` is `http://host:port/repos/<name>`. Fetches
/// the remote object list, then downloads only the objects the destination
/// lacks.
///
/// **Security:** every line of the remote object list is *untrusted input*. We
/// validate each entry with [`validate_remote_object_path`] before it touches
/// the filesystem, and enforce that the resolved write target stays inside
/// `.dits/objects`. A single unsafe entry fails the whole fetch (see
/// requirement: never silently skip a malicious entry — a remote that proves it
/// is hostile is not to be trusted for the rest of the transfer).
pub async fn transfer_objects_http(
    base_url: &str,
    dst_dits: &Path,
) -> anyhow::Result<TransferStats> {
    use anyhow::Context;
    let base = base_url.trim_end_matches('/');
    // Do not follow redirects: a hostile object-list host must not bounce GETs
    // onto link-local or metadata endpoints.
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .context("building HTTP client")?;

    let list_response = client
        .get(format!("{base}/object-list"))
        .send()
        .await
        .context("requesting object list")?;
    if list_response.status().is_redirection() {
        anyhow::bail!("remote object-list responded with a redirect; refusing to follow");
    }
    let list = list_response
        .error_for_status()
        .context("remote returned an error for object-list")?
        .text()
        .await?;

    let dst_objects = dst_dits.join("objects");
    // Ensure the object store root exists so we can canonicalize it as the
    // containment anchor.
    std::fs::create_dir_all(&dst_objects).context("creating local object store")?;
    let object_root =
        std::fs::canonicalize(&dst_objects).context("resolving local object store")?;

    let mut stats = TransferStats::default();
    for line in list.lines() {
        // Blank lines are formatting, not entries — skip them (matches prior behavior).
        // Any non-empty line, however, must pass validation or the whole fetch
        // fails.
        if line.trim().is_empty() {
            continue;
        }
        let safe_rel = validate_remote_object_path(line)?;
        let dst_path = dst_objects.join(&safe_rel);
        if dst_path.exists() {
            stats.skipped += 1;
            continue;
        }

        // Build the request URL by pushing each validated segment as a
        // *percent-encoded* path segment via the `url` crate — never by
        // interpolating the raw remote string into the URL. This preserves the
        // base path (`/repos/<name>`) and encodes anything unusual.
        let mut object_url =
            url::Url::parse(base).with_context(|| format!("invalid remote base URL: {base}"))?;
        {
            let mut segs = object_url
                .path_segments_mut()
                .map_err(|_| anyhow::anyhow!("remote base URL cannot be a base"))?;
            segs.push("object");
            for comp in safe_rel.components() {
                if let std::path::Component::Normal(seg) = comp {
                    let seg = seg
                        .to_str()
                        .context("validated object path segment was not valid UTF-8")?;
                    segs.push(seg);
                }
            }
        }

        let object_response = client
            .get(object_url.as_str())
            .send()
            .await
            .with_context(|| format!("requesting object {}", safe_rel.display()))?;
        if object_response.status().is_redirection() {
            anyhow::bail!(
                "remote object {} responded with a redirect; refusing to follow",
                safe_rel.display()
            );
        }
        let bytes = object_response
            .error_for_status()
            .with_context(|| format!("remote error for object {}", safe_rel.display()))?
            .bytes()
            .await?;

        // The destination parent is derived only from validated, normal components, so
        // it is lexically inside `dst_objects`. As defense in depth against a
        // *pre-existing* symlink in the store pointing elsewhere, we enforce
        // containment both BEFORE and after creating directories — so
        // `create_dir_all` can never materialize a directory outside the object
        // root, even via a symlinked ancestor. It only ever runs on validated paths.
        if let Some(parent) = dst_path.parent() {
            // Before creating anything: canonicalize the deepest *existing* ancestor of the
            // parent and require it to resolve inside the object root. If an existing
            // ancestor is a symlink out of the store, this bails before any
            // directory is created.
            let mut existing = parent;
            while !existing.exists() {
                match existing.parent() {
                    Some(p) => existing = p,
                    None => break,
                }
            }
            let resolved_existing =
                std::fs::canonicalize(existing).context("resolving object directory")?;
            if !resolved_existing.starts_with(&object_root) {
                anyhow::bail!("remote object path escapes the local object store");
            }

            std::fs::create_dir_all(parent).context("creating object parent directory")?;

            // After creating: re-verify the now-existing parent resolves inside the root.
            let resolved_parent =
                std::fs::canonicalize(parent).context("resolving object parent directory")?;
            if !resolved_parent.starts_with(&object_root) {
                anyhow::bail!("remote object path escapes the local object store");
            }
        }
        let tmp = dst_path.with_extension("tmp-incoming");
        std::fs::write(&tmp, &bytes)?;
        std::fs::rename(&tmp, &dst_path)?;
        stats.copied += 1;
        stats.bytes += bytes.len() as u64;
    }
    Ok(stats)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;

    /// Lay down a fake object store with `n` objects sharded by the first 2 hex
    /// chars.
    fn fake_store(dits: &Path, hashes: &[&str]) {
        for h in hashes {
            let p = dits.join("objects").join("chunks").join(&h[..2]).join(h);
            fs::create_dir_all(p.parent().unwrap()).unwrap();
            fs::write(&p, format!("content-of-{h}")).unwrap();
        }
    }

    #[test]
    fn transfers_only_missing_objects_and_is_free_on_resync() {
        let src = TempDir::new().unwrap();
        let dst = TempDir::new().unwrap();
        fake_store(src.path(), &["aabb01", "aabb02", "ccdd03"]);
        // Destination already has one of them.
        fake_store(dst.path(), &["aabb01"]);

        // First sync: copies the two the destination lacks, skips the one it has.
        let s1 = transfer_objects(src.path(), dst.path()).unwrap();
        assert_eq!(s1.copied, 2, "two missing objects copied");
        assert_eq!(s1.skipped, 1, "one already-present object skipped");
        assert!(s1.bytes > 0);

        // Re-sync transfers nothing (everything is now present) — the dedup/resume
        // property.
        let s2 = transfer_objects(src.path(), dst.path()).unwrap();
        assert_eq!(s2.copied, 0, "re-sync copies nothing");
        assert_eq!(s2.skipped, 3);

        // After a new object appears in the source, only that one transfers.
        fake_store(src.path(), &["eeff04"]);
        let s3 = transfer_objects(src.path(), dst.path()).unwrap();
        assert_eq!(s3.copied, 1, "only the new object transfers");

        // The copied content is byte-identical.
        let got = fs::read_to_string(dst.path().join("objects/chunks/cc/ccdd03")).unwrap();
        assert_eq!(got, "content-of-ccdd03");
    }

    #[test]
    fn is_additive_never_overwrites_destination() {
        let src = TempDir::new().unwrap();
        let dst = TempDir::new().unwrap();
        fake_store(src.path(), &["aabb01"]);
        // Destination has a (hypothetically different) object at the same path.
        let p = dst.path().join("objects/chunks/aa/aabb01");
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(&p, "EXISTING").unwrap();

        transfer_objects(src.path(), dst.path()).unwrap();
        // Existing object is left untouched (content-addressed ⇒ same path means same
        // bytes).
        assert_eq!(fs::read_to_string(&p).unwrap(), "EXISTING");
    }

    // --- Path validation: the security boundary for untrusted remote object-list
    // entries. ---

    #[test]
    fn validate_accepts_normal_object_paths() {
        // The real store layout: sharded chunk paths and the test-helper
        // `chunks/aa/aabb01` form.
        for ok in ["chunks/cc/ccdd03", "chunks/aa/aabb01", "manifests/de/ad/beef", "single"] {
            let got = validate_remote_object_path(ok).expect(ok);
            assert_eq!(got, PathBuf::from(ok), "should round-trip to a clean relative path");
            assert!(got.is_relative());
        }
    }

    #[test]
    fn validate_rejects_traversal_and_unsafe_paths() {
        // Each of these is a way a hostile remote could try to escape `.dits/objects`.
        // They must ALL be rejected, on every platform — note the Windows forms
        // are rejected here on Unix.
        let bad = [
            "",                                       // empty
            "   ",                                    // whitespace-only
            "../../poc-created-from-object-list.txt", // the reported PoC
            "..",                                     // bare parent
            ".",                                      // bare current
            "a/../../b",                              // traversal mid-path
            "a/./b",                                  // `.` segment
            "/etc/passwd",                            // absolute (Unix)
            "/",                                      // root
            "a//b",                                   // empty segment
            "a/b/",                                   // trailing slash ⇒ empty segment
            "C:\\Windows\\System32",                  // Windows drive + backslashes
            "C:/Windows/System32",                    // Windows drive with forward slashes
            "\\\\?\\C:\\secret",                      // verbatim/device prefix
            "\\\\server\\share\\x",                   // UNC path
            "a\\b",                                   // backslash as separator
            "..\\..\\x",                              // Windows-style traversal
            "foo\0bar",                               // NUL byte
            "CON",                                    // Windows reserved device name
            "nul",                                    // reserved, case-insensitive
            "chunks/COM1",                            // reserved name nested
            "aux.txt",                                // reserved name with extension
            "trailingdot.",                           // Windows strips trailing dot (end of entry)
            "foo./bar",                               // trailing dot on an internal segment
            "foo /bar",                               // trailing space on an internal segment
        ];
        for b in bad {
            assert!(validate_remote_object_path(b).is_err(), "expected rejection of {b:?}",);
        }
    }

    /// Spin up a throwaway HTTP server that returns `list` for `/object-list`
    /// and `body` for any `/object/*` request. Returns the base URL. The
    /// server task is detached (dropped with the runtime at test end).
    async fn spawn_fake_remote(list: &'static str, body: &'static [u8]) -> String {
        use axum::{routing::get, Router};
        let app = Router::new()
            .route("/object-list", get(move || async move { list }))
            .route("/object/*path", get(move || async move { body.to_vec() }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        format!("http://{addr}")
    }

    #[tokio::test]
    async fn http_rejects_malicious_object_list_entry_and_creates_nothing_outside_store() {
        // Repo root with a `.dits` dir; the object store lives at `.dits/objects`.
        let repo = TempDir::new().unwrap();
        let dits = repo.path().join(".dits");
        fs::create_dir_all(&dits).unwrap();

        let base = spawn_fake_remote("../../poc-created-from-object-list.txt\n", b"pwned").await;
        let result = transfer_objects_http(&base, &dits).await;

        // The fetch must fail outright — not silently skip the entry.
        assert!(result.is_err(), "malicious object-list entry must fail the fetch");

        // `.dits/objects/../../poc.txt` would have landed in the repo root — and one
        // level up, outside the repo entirely. Neither must exist, and no stray
        // parent dirs either.
        assert!(
            !repo
                .path()
                .join("poc-created-from-object-list.txt")
                .exists(),
            "no file may be created in the repo root",
        );
        let outside = repo
            .path()
            .parent()
            .unwrap()
            .join("poc-created-from-object-list.txt");
        assert!(!outside.exists(), "no file may be created outside the repo");
        // Only the object store (which we pre-create) should exist under `.dits`; the
        // traversal must not have produced any escaping directory.
        assert!(!dits.join("objects").join("tmp-incoming").exists());
    }

    #[tokio::test]
    async fn http_rejects_absolute_object_path() {
        let repo = TempDir::new().unwrap();
        let dits = repo.path().join(".dits");
        fs::create_dir_all(&dits).unwrap();

        let base = spawn_fake_remote("/etc/cron.d/evil\n", b"pwned").await;
        assert!(transfer_objects_http(&base, &dits).await.is_err());
        assert!(!Path::new("/etc/cron.d/evil").exists());
    }

    #[tokio::test]
    async fn http_rejects_windows_style_object_path_on_unix() {
        let repo = TempDir::new().unwrap();
        let dits = repo.path().join(".dits");
        fs::create_dir_all(&dits).unwrap();

        // Backslash separators / drive prefixes must be rejected even though `\` is not
        // a separator on Unix — the remote protocol forbids them entirely.
        let base = spawn_fake_remote("..\\..\\poc.txt\n", b"pwned").await;
        assert!(transfer_objects_http(&base, &dits).await.is_err());
        assert!(!repo.path().join("poc.txt").exists());
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn http_rejects_symlinked_ancestor_escaping_the_store() {
        // A *pre-existing* symlink inside the object store that points outside it must
        // not let a remote object land outside the store, and must not cause
        // directories to be created through the symlink. (Not remote-plantable,
        // but defense in depth for requirement 6.)
        let repo = TempDir::new().unwrap();
        let escape = TempDir::new().unwrap();
        let dits = repo.path().join(".dits");
        let objects = dits.join("objects");
        fs::create_dir_all(&objects).unwrap();
        // `objects/chunks` -> /some/outside/dir
        std::os::unix::fs::symlink(escape.path(), objects.join("chunks")).unwrap();

        let base = spawn_fake_remote("chunks/aa/aabb01\n", b"pwned").await;
        let result = transfer_objects_http(&base, &dits).await;
        assert!(result.is_err(), "symlinked-ancestor write must fail the fetch");
        // Nothing was written through the symlink into the outside directory.
        assert!(!escape.path().join("aa").exists(), "no dir created outside the store");
        assert!(!escape.path().join("aa/aabb01").exists(), "no file created outside the store");
    }

    #[tokio::test]
    async fn http_transfers_valid_object_path() {
        let repo = TempDir::new().unwrap();
        let dits = repo.path().join(".dits");
        fs::create_dir_all(&dits).unwrap();

        let base = spawn_fake_remote("chunks/aa/aabb01\n", b"valid-content").await;
        let stats = transfer_objects_http(&base, &dits).await.unwrap();
        assert_eq!(stats.copied, 1, "the one valid object is transferred");

        let written = dits.join("objects/chunks/aa/aabb01");
        assert_eq!(fs::read(&written).unwrap(), b"valid-content");

        // Re-fetch is free: the object is already present.
        let stats2 = transfer_objects_http(&base, &dits).await.unwrap();
        assert_eq!(stats2.copied, 0);
        assert_eq!(stats2.skipped, 1);
    }
}
