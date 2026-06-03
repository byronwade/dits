//! Content-addressed incremental object transfer.
//!
//! The heart of sync: because every object (chunk, manifest, commit, blob, and the
//! embedded git engine's objects/packs) is content-addressed, transferring a repository
//! is just "copy the objects the destination doesn't already have." This is the
//! resumable, deduplicated transfer property — an interrupted copy resumes with only the
//! missing objects, and re-syncing transfers nothing.
//!
//! This operates over the local filesystem (the network transport is a separate layer).
//! It is **purely additive**: it only ever copies missing object files, never deletes or
//! overwrites — so it can never corrupt or lose data in the destination.

use std::io;
use std::path::Path;
use walkdir::WalkDir;

/// Result of an object transfer.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct TransferStats {
    /// Object files copied (were missing in the destination).
    pub copied: usize,
    /// Object files already present in the destination (deduplicated — not transferred).
    pub skipped: usize,
    /// Bytes actually copied.
    pub bytes: u64,
}

/// Copy every object under `src_dits/objects` that `dst_dits/objects` lacks. Returns
/// transfer statistics. Existing destination objects are never touched.
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
    for entry in WalkDir::new(&src_objects).into_iter().filter_map(|e| e.ok()) {
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
        // Copy to a temp file then rename so a concurrent reader never sees a partial object.
        let tmp = dst_path.with_extension("tmp-incoming");
        std::fs::copy(entry.path(), &tmp)?;
        std::fs::rename(&tmp, &dst_path)?;
        stats.copied += 1;
        stats.bytes += entry.metadata()?.len();
    }
    Ok(stats)
}

/// Same incremental, additive transfer as [`transfer_objects`], but pulling from a remote
/// Dits HTTP server (`dits serve`). `base_url` is `http://host:port/repos/<name>`. Fetches
/// the remote object list, then downloads only the objects the destination lacks.
pub async fn transfer_objects_http(base_url: &str, dst_dits: &Path) -> anyhow::Result<TransferStats> {
    use anyhow::Context;
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::new();

    let list = client
        .get(format!("{base}/object-list"))
        .send()
        .await
        .context("requesting object list")?
        .error_for_status()
        .context("remote returned an error for object-list")?
        .text()
        .await?;

    let dst_objects = dst_dits.join("objects");
    let mut stats = TransferStats::default();
    for rel in list.lines().map(|l| l.trim()).filter(|l| !l.is_empty()) {
        let dst_path = dst_objects.join(rel);
        if dst_path.exists() {
            stats.skipped += 1;
            continue;
        }
        let bytes = client
            .get(format!("{base}/object/{rel}"))
            .send()
            .await
            .with_context(|| format!("requesting object {rel}"))?
            .error_for_status()
            .with_context(|| format!("remote error for object {rel}"))?
            .bytes()
            .await?;
        if let Some(parent) = dst_path.parent() {
            std::fs::create_dir_all(parent)?;
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
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Lay down a fake object store with `n` objects sharded by the first 2 hex chars.
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

        // Re-sync transfers nothing (everything is now present) — the dedup/resume property.
        let s2 = transfer_objects(src.path(), dst.path()).unwrap();
        assert_eq!(s2.copied, 0, "re-sync copies nothing");
        assert_eq!(s2.skipped, 3);

        // After a new object appears in the source, only that one transfers.
        fake_store(src.path(), &["eeff04"]);
        let s3 = transfer_objects(src.path(), dst.path()).unwrap();
        assert_eq!(s3.copied, 1, "only the new object transfers");

        // The copied content is byte-identical.
        let got = fs::read_to_string(
            dst.path().join("objects/chunks/cc/ccdd03"),
        )
        .unwrap();
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
        // Existing object is left untouched (content-addressed ⇒ same path means same bytes).
        assert_eq!(fs::read_to_string(&p).unwrap(), "EXISTING");
    }
}
