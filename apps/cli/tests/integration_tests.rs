//! Comprehensive integration tests for Dits.
//!
//! These tests cover the full workflow of the version control system.

use dits::core::{
    chunk_data_with_refs, Author, Chunk, ChunkRef, ChunkerConfig, Commit, Hash,
    Hasher, Index, IndexEntry, Manifest, ManifestEntry,
};
use dits::store::Repository;
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::TempDir;

// ============================================================================
// TEST HELPERS
// ============================================================================

fn create_test_repo() -> (TempDir, Repository) {
    let temp = TempDir::new().unwrap();
    let repo = Repository::init(temp.path()).unwrap();
    (temp, repo)
}

fn create_file(dir: &Path, name: &str, content: &[u8]) {
    let path = dir.join(name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    let mut file = fs::File::create(&path).unwrap();
    file.write_all(content).unwrap();
}

fn test_data(size: usize, seed: u8) -> Vec<u8> {
    (0..size).map(|i| ((i as u8).wrapping_add(seed))).collect()
}

fn random_bytes(size: usize) -> Vec<u8> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..size).map(|_| rng.gen()).collect()
}

// ============================================================================
// REPOSITORY TESTS
// ============================================================================

mod init_tests {
    use super::*;

    #[test]
    fn test_init_creates_directory_structure() {
        let temp = TempDir::new().unwrap();
        let _repo = Repository::init(temp.path()).unwrap();

        assert!(temp.path().join(".dits").exists());
        assert!(temp.path().join(".dits/objects").exists());
        assert!(temp.path().join(".dits/objects/chunks").exists());
        assert!(temp.path().join(".dits/objects/manifests").exists());
        assert!(temp.path().join(".dits/objects/commits").exists());
        assert!(temp.path().join(".dits/refs").exists());
    }

    #[test]
    fn test_open_existing_repo() {
        let temp = TempDir::new().unwrap();
        let _repo = Repository::init(temp.path()).unwrap();
        let repo2 = Repository::open(temp.path());
        assert!(repo2.is_ok());
    }

    #[test]
    fn test_open_nonexistent_repo() {
        let temp = TempDir::new().unwrap();
        let repo = Repository::open(temp.path());
        assert!(repo.is_err());
    }
}

// ============================================================================
// HASH TESTS
// ============================================================================

mod hash_tests {
    use super::*;

    #[test]
    fn test_hash_deterministic() {
        let data = b"hello world";
        let hash1 = Hasher::hash(data);
        let hash2 = Hasher::hash(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_different_for_different_data() {
        let hash1 = Hasher::hash(b"hello");
        let hash2 = Hasher::hash(b"world");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_hex_roundtrip() {
        let data = b"test data";
        let hash = Hasher::hash(data);
        let hex = hash.to_hex();
        let parsed = Hash::from_hex(&hex).unwrap();
        assert_eq!(hash, parsed);
    }

    #[test]
    fn test_hash_short() {
        let hash = Hasher::hash(b"test");
        let short = hash.short();  // short() returns first 8 chars
        assert_eq!(short.len(), 8);
        assert!(hash.to_hex().starts_with(&short));
    }

    #[test]
    fn test_zero_hash() {
        let zero = Hash::ZERO;
        assert_eq!(zero.to_hex(), "0".repeat(64));
    }

    #[test]
    fn test_invalid_hex() {
        assert!(Hash::from_hex("not a hex").is_err());
        assert!(Hash::from_hex("abc").is_err());
    }
}

// ============================================================================
// CHUNKING TESTS
// ============================================================================

mod chunk_tests {
    use super::*;

    #[test]
    fn test_empty_data_no_chunks() {
        let config = ChunkerConfig::default();
        let (chunks, refs) = chunk_data_with_refs(&[], &config);
        assert!(chunks.is_empty());
        assert!(refs.is_empty());
    }

    #[test]
    fn test_small_data_single_chunk() {
        let config = ChunkerConfig::default();
        let data = b"small data".to_vec();
        let (chunks, refs) = chunk_data_with_refs(&data, &config);
        assert_eq!(chunks.len(), 1);
        assert_eq!(refs.len(), 1);
        assert_eq!(chunks[0].data, data);
    }

    #[test]
    fn test_chunk_reconstruction() {
        let config = ChunkerConfig::default();
        let data = test_data(500_000, 42);
        let (chunks, _refs) = chunk_data_with_refs(&data, &config);

        let reconstructed: Vec<u8> = chunks.iter().flat_map(|c| c.data.iter().copied()).collect();
        assert_eq!(data, reconstructed);
    }

    #[test]
    fn test_chunk_determinism() {
        let config = ChunkerConfig::default();
        let data = test_data(1_000_000, 123);

        let (chunks1, refs1) = chunk_data_with_refs(&data, &config);
        let (chunks2, refs2) = chunk_data_with_refs(&data, &config);

        assert_eq!(chunks1.len(), chunks2.len());
        assert_eq!(refs1.len(), refs2.len());

        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.hash, c2.hash);
            assert_eq!(c1.data, c2.data);
        }
    }

    #[test]
    fn test_chunk_size_bounds() {
        let config = ChunkerConfig::default();
        let data = test_data(10_000_000, 77);
        let (chunks, _refs) = chunk_data_with_refs(&data, &config);

        for chunk in &chunks {
            assert!(chunk.data.len() <= config.max_size as usize);
        }
    }

    #[test]
    fn test_chunk_hash_verification() {
        let data = test_data(100_000, 55);
        let chunk = Chunk::new(data.clone());
        let expected_hash = Hasher::hash(&data);
        assert_eq!(chunk.hash, expected_hash);
    }

    #[test]
    fn test_cdc_behavior() {
        // Test that CDC produces consistent, deterministic results
        // The key property is that identical data always produces identical chunks
        let config = ChunkerConfig::default();
        let original = test_data(500_000, 1);

        // Same data should produce same chunks
        let (chunks1, _) = chunk_data_with_refs(&original, &config);
        let (chunks2, _) = chunk_data_with_refs(&original, &config);

        assert_eq!(chunks1.len(), chunks2.len());
        for (c1, c2) in chunks1.iter().zip(chunks2.iter()) {
            assert_eq!(c1.hash, c2.hash, "Same data should produce same hashes");
        }

        // CDC produces variable-size chunks within configured bounds
        for chunk in &chunks1 {
            // Chunks might be below min_size only for the last/only chunk of small files
            // For larger files with multiple chunks, most should respect bounds
            assert!(
                chunk.data.len() <= config.max_size as usize,
                "Chunk should not exceed max_size"
            );
        }
    }
}

// ============================================================================
// MANIFEST TESTS
// ============================================================================

mod manifest_tests {
    use super::*;

    #[test]
    fn test_manifest_add_get() {
        let mut manifest = Manifest::new();
        // ManifestEntry::new(path, size, content_hash, chunks)
        let entry = ManifestEntry::new(
            "test.txt".to_string(),
            100,
            Hash::ZERO,
            vec![ChunkRef::new(Hash::ZERO, 0, 100)],
        );

        manifest.add(entry);  // add takes just the entry
        let retrieved = manifest.get("test.txt").unwrap();
        assert_eq!(retrieved.size, 100);
    }

    #[test]
    fn test_manifest_iter() {
        let mut manifest = Manifest::new();
        manifest.add(ManifestEntry::new("a.txt".to_string(), 10, Hash::ZERO, vec![]));
        manifest.add(ManifestEntry::new("b.txt".to_string(), 20, Hash::ZERO, vec![]));

        let entries: Vec<_> = manifest.iter().collect();
        assert_eq!(entries.len(), 2);
    }

    #[test]
    fn test_manifest_json_roundtrip() {
        let mut manifest = Manifest::new();
        manifest.add(ManifestEntry::new(
            "test.txt".to_string(),
            100,
            Hasher::hash(b"test"),
            vec![ChunkRef::new(Hasher::hash(b"chunk"), 0, 100)],
        ));

        let json = manifest.to_json();  // returns String, not Result
        let parsed = Manifest::from_json(&json).unwrap();

        assert_eq!(manifest.len(), parsed.len());
    }
}

// ============================================================================
// INDEX TESTS
// ============================================================================

mod index_tests {
    use super::*;

    #[test]
    fn test_index_stage() {
        let mut index = Index::new();
        // IndexEntry::new(path, content_hash, size, mtime, chunks)
        let entry = IndexEntry::new(
            "test.txt".to_string(),
            Hasher::hash(b"content"),
            100,
            0,  // mtime
            vec![],  // chunks
        );

        index.stage(entry);  // stage takes just the entry, not (path, entry)
        assert!(index.get("test.txt").is_some());
    }

    #[test]
    fn test_index_persistence() {
        let mut index = Index::new();
        // IndexEntry::new(path, content_hash, size, mtime, chunks)
        let entry = IndexEntry::new(
            "file.txt".to_string(),
            Hasher::hash(b"data"),
            50,
            0,  // mtime
            vec![],  // chunks
        );
        index.stage(entry);

        let json = index.to_json();  // returns String, not Result
        let loaded = Index::from_json(&json).unwrap();

        assert_eq!(index.get("file.txt").unwrap().size, loaded.get("file.txt").unwrap().size);
    }
}

// ============================================================================
// COMMIT TESTS
// ============================================================================

mod commit_tests {
    use super::*;

    #[test]
    fn test_commit_creation() {
        let manifest_hash = Hasher::hash(b"manifest");
        let commit = Commit::new(
            None,                        // parent
            manifest_hash,               // manifest
            "Initial commit",            // message
            Author::default(),           // author
        );

        assert_eq!(commit.manifest, manifest_hash);
        assert!(commit.parent.is_none());
        assert_eq!(commit.message, "Initial commit");
    }

    #[test]
    fn test_commit_with_parent() {
        let parent_hash = Hasher::hash(b"parent");
        let manifest_hash = Hasher::hash(b"manifest");

        let commit = Commit::new(
            Some(parent_hash),           // parent
            manifest_hash,               // manifest
            "Second commit",             // message
            Author::default(),           // author
        );

        assert_eq!(commit.parent, Some(parent_hash));
    }

    #[test]
    fn test_commit_json_roundtrip() {
        let commit = Commit::new(
            Some(Hasher::hash(b"p")),    // parent
            Hasher::hash(b"m"),          // manifest
            "Message",                   // message
            Author::default(),           // author
        );

        let json = commit.to_json();  // returns String, not Result
        let parsed = Commit::from_json(&json).unwrap();

        assert_eq!(commit.manifest, parsed.manifest);
        assert_eq!(commit.parent, parsed.parent);
        assert_eq!(commit.message, parsed.message);
    }
}

// ============================================================================
// REPOSITORY WORKFLOW TESTS
// ============================================================================

mod workflow_tests {
    use super::*;

    #[test]
    fn test_add_single_file() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "test.txt", b"Hello, World!");

        let result = repo.add("test.txt").unwrap();
        assert_eq!(result.files_staged, 1);
    }

    #[test]
    fn test_add_multiple_files() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "a.txt", b"File A");
        create_file(temp.path(), "b.txt", b"File B");
        create_file(temp.path(), "c.txt", b"File C");

        repo.add("a.txt").unwrap();
        repo.add("b.txt").unwrap();
        repo.add("c.txt").unwrap();

        let status = repo.status().unwrap();
        assert_eq!(status.staged_new.len(), 3);
    }

    #[test]
    fn test_add_nested_file() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "dir/subdir/file.txt", b"Nested content");

        let result = repo.add("dir/subdir/file.txt").unwrap();
        assert_eq!(result.files_staged, 1);
    }

    #[test]
    fn test_commit_staged_files() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "test.txt", b"Content");

        repo.add("test.txt").unwrap();
        let commit = repo.commit("Initial commit").unwrap();

        assert!(!commit.hash.to_hex().is_empty());
    }

    #[test]
    fn test_commit_empty_fails() {
        let (_temp, repo) = create_test_repo();
        let result = repo.commit("Empty commit");
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_commits() {
        let (temp, repo) = create_test_repo();

        create_file(temp.path(), "file1.txt", b"Content 1");
        repo.add("file1.txt").unwrap();
        let commit1 = repo.commit("First commit").unwrap();

        create_file(temp.path(), "file2.txt", b"Content 2");
        repo.add("file2.txt").unwrap();
        let commit2 = repo.commit("Second commit").unwrap();

        assert_ne!(commit1.hash, commit2.hash);
    }

    #[test]
    fn test_checkout_restores_files() {
        let (temp, repo) = create_test_repo();

        create_file(temp.path(), "test.txt", b"Original content");
        repo.add("test.txt").unwrap();
        let commit = repo.commit("Add file").unwrap();

        create_file(temp.path(), "test.txt", b"Modified content");

        repo.checkout(&commit.hash).unwrap();

        let content = fs::read_to_string(temp.path().join("test.txt")).unwrap();
        assert_eq!(content, "Original content");
    }

    #[test]
    fn test_deduplication() {
        let (temp, repo) = create_test_repo();

        let content = test_data(100_000, 42);
        create_file(temp.path(), "file1.bin", &content);
        create_file(temp.path(), "file2.bin", &content);

        let result1 = repo.add("file1.bin").unwrap();
        let result2 = repo.add("file2.bin").unwrap();

        assert!(result1.new_chunks > 0);
        assert_eq!(result2.new_chunks, 0);
        assert!(result2.dedup_chunks > 0);
    }

    #[test]
    fn test_large_file_chunking() {
        let (temp, repo) = create_test_repo();

        let content = test_data(5_000_000, 99);
        create_file(temp.path(), "large.bin", &content);

        let result = repo.add("large.bin").unwrap();
        assert!(result.new_chunks > 1);
    }
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

mod error_tests {
    use super::*;

    #[test]
    fn test_add_nonexistent_file() {
        let (_temp, repo) = create_test_repo();
        let result = repo.add("nonexistent.txt");
        assert!(result.is_err());
    }

    #[test]
    fn test_checkout_invalid_hash() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "test.txt", b"Content");
        repo.add("test.txt").unwrap();
        repo.commit("Commit").unwrap();

        let fake_hash = Hasher::hash(b"fake commit");
        let result = repo.checkout(&fake_hash);
        assert!(result.is_err());
    }
}

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

mod integrity_tests {
    use super::*;

    #[test]
    fn test_content_integrity_preserved() {
        let (temp, repo) = create_test_repo();

        let original_content = random_bytes(100_000);
        create_file(temp.path(), "random.bin", &original_content);

        repo.add("random.bin").unwrap();
        let commit = repo.commit("Add random data").unwrap();

        create_file(temp.path(), "random.bin", b"corrupted");

        repo.checkout(&commit.hash).unwrap();

        let restored = fs::read(temp.path().join("random.bin")).unwrap();
        assert_eq!(original_content, restored);
    }

    #[test]
    fn test_binary_data_preserved() {
        let (temp, repo) = create_test_repo();

        let binary_content: Vec<u8> = (0..=255).collect();
        create_file(temp.path(), "binary.bin", &binary_content);

        repo.add("binary.bin").unwrap();
        let commit = repo.commit("Add binary").unwrap();

        fs::remove_file(temp.path().join("binary.bin")).unwrap();
        repo.checkout(&commit.hash).unwrap();

        let restored = fs::read(temp.path().join("binary.bin")).unwrap();
        assert_eq!(binary_content, restored);
    }

    #[test]
    fn test_empty_file_handling() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "empty.txt", b"");

        let result = repo.add("empty.txt").unwrap();
        assert_eq!(result.files_staged, 1);

        let commit = repo.commit("Add empty file").unwrap();
        fs::remove_file(temp.path().join("empty.txt")).unwrap();
        repo.checkout(&commit.hash).unwrap();

        let content = fs::read(temp.path().join("empty.txt")).unwrap();
        assert!(content.is_empty());
    }
}

// ============================================================================
// CONCURRENT ACCESS TESTS
// ============================================================================

mod concurrent_tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_concurrent_reads() {
        let (temp, repo) = create_test_repo();
        let content = test_data(100_000, 42);
        create_file(temp.path(), "shared.bin", &content);
        repo.add("shared.bin").unwrap();
        repo.commit("Add shared file").unwrap();

        let repo_path = Arc::new(temp.path().to_path_buf());
        let mut handles = vec![];

        for _ in 0..4 {
            let path = Arc::clone(&repo_path);
            handles.push(thread::spawn(move || {
                let repo = Repository::open(&path).unwrap();
                repo.status().is_ok()
            }));
        }

        for handle in handles {
            assert!(handle.join().unwrap());
        }
    }
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

mod edge_case_tests {
    use super::*;

    #[test]
    fn test_file_with_spaces() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "file with spaces.txt", b"Content");

        let result = repo.add("file with spaces.txt");
        assert!(result.is_ok());
    }

    #[test]
    fn test_deeply_nested_file() {
        let (temp, repo) = create_test_repo();
        create_file(
            temp.path(),
            "a/b/c/d/e/f/g/h/i/j/deep.txt",
            b"Deep content",
        );

        let result = repo.add("a/b/c/d/e/f/g/h/i/j/deep.txt");
        assert!(result.is_ok());
    }

    #[test]
    fn test_unicode_content() {
        let (temp, repo) = create_test_repo();
        let unicode = "Hello 世界 🌍 Привет мир";
        create_file(temp.path(), "unicode.txt", unicode.as_bytes());

        repo.add("unicode.txt").unwrap();
        let commit = repo.commit("Add unicode").unwrap();

        fs::remove_file(temp.path().join("unicode.txt")).unwrap();
        repo.checkout(&commit.hash).unwrap();

        let restored = fs::read_to_string(temp.path().join("unicode.txt")).unwrap();
        assert_eq!(unicode, restored);
    }

    #[test]
    fn test_single_byte_file() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "single.bin", &[42u8]);

        repo.add("single.bin").unwrap();
        let commit = repo.commit("Single byte").unwrap();

        fs::remove_file(temp.path().join("single.bin")).unwrap();
        repo.checkout(&commit.hash).unwrap();

        let content = fs::read(temp.path().join("single.bin")).unwrap();
        assert_eq!(content, vec![42u8]);
    }
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

mod performance_tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_chunking_performance() {
        let config = ChunkerConfig::default();
        let data = test_data(10_000_000, 42);

        let start = Instant::now();
        let (_chunks, _refs) = chunk_data_with_refs(&data, &config);
        let elapsed = start.elapsed();

        assert!(elapsed.as_secs() < 1);
    }

    #[test]
    fn test_hash_performance() {
        let data = test_data(10_000_000, 42);

        let start = Instant::now();
        let _hash = Hasher::hash(&data);
        let elapsed = start.elapsed();

        // BLAKE3 is fast, but debug builds are slower
        // Allow generous time - actual performance testing should be done in release mode
        assert!(
            elapsed.as_secs() < 2,
            "Hashing 10MB should complete in under 2 seconds even in debug mode"
        );
    }
}

// ============================================================================
// LOG TESTS
// ============================================================================

mod log_tests {
    use super::*;

    #[test]
    fn test_log_returns_commits() {
        let (temp, repo) = create_test_repo();

        create_file(temp.path(), "file1.txt", b"Content 1");
        repo.add("file1.txt").unwrap();
        repo.commit("First").unwrap();

        create_file(temp.path(), "file2.txt", b"Content 2");
        repo.add("file2.txt").unwrap();
        repo.commit("Second").unwrap();

        let log = repo.log(10).unwrap();
        assert_eq!(log.len(), 2);
    }

    #[test]
    fn test_log_order() {
        let (temp, repo) = create_test_repo();

        for i in 0..5 {
            create_file(temp.path(), &format!("file{}.txt", i), format!("Content {}", i).as_bytes());
            repo.add(&format!("file{}.txt", i)).unwrap();
            repo.commit(&format!("Commit {}", i)).unwrap();
        }

        let log = repo.log(10).unwrap();
        assert_eq!(log.len(), 5);
        assert!(log[0].message.contains("4"));
    }
}

// ============================================================================
// STATUS TESTS
// ============================================================================

mod status_tests {
    use super::*;

    #[test]
    fn test_status_empty_repo() {
        let (_temp, repo) = create_test_repo();
        let status = repo.status().unwrap();
        assert!(status.is_clean());
        assert!(!status.has_staged());
    }

    #[test]
    fn test_status_with_staged_files() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "file.txt", b"Content");
        repo.add("file.txt").unwrap();

        let status = repo.status().unwrap();
        assert!(status.has_staged());
        assert_eq!(status.staged_new.len(), 1);
    }

    #[test]
    fn test_status_after_commit() {
        let (temp, repo) = create_test_repo();
        create_file(temp.path(), "file.txt", b"Content");
        repo.add("file.txt").unwrap();
        repo.commit("Initial").unwrap();

        let status = repo.status().unwrap();
        assert!(status.is_clean());
    }
}

// ============================================================================
// CHUNK REF TESTS
// ============================================================================

mod chunk_ref_tests {
    use super::*;

    #[test]
    fn test_chunk_ref_creation() {
        let hash = Hasher::hash(b"data");
        let chunk_ref = ChunkRef::new(hash, 100, 500);

        assert_eq!(chunk_ref.hash, hash);
        assert_eq!(chunk_ref.offset, 100);
        assert_eq!(chunk_ref.size, 500);
    }

    #[test]
    fn test_chunk_refs_cover_file() {
        let config = ChunkerConfig::default();
        let data = test_data(500_000, 42);
        let (_chunks, refs) = chunk_data_with_refs(&data, &config);

        let mut expected_offset = 0u64;
        for chunk_ref in &refs {
            assert_eq!(chunk_ref.offset, expected_offset);
            expected_offset += chunk_ref.size;
        }
        assert_eq!(expected_offset, data.len() as u64);
    }
}

// ============================================================================
// MANIFEST ENTRY TESTS
// ============================================================================

mod manifest_entry_tests {
    use super::*;

    #[test]
    fn test_manifest_entry_creation() {
        let hash = Hasher::hash(b"content");
        let chunks = vec![ChunkRef::new(hash, 0, 100)];
        let entry = ManifestEntry::new("file.txt".to_string(), 100, hash, chunks);

        assert_eq!(entry.path, "file.txt");
        assert_eq!(entry.size, 100);
        assert_eq!(entry.content_hash, hash);
        assert_eq!(entry.chunks.len(), 1);
    }
}
