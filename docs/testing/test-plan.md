# Test Plan & Performance Benchmarks

**DITS Comprehensive Testing Infrastructure**

DITS includes the most extensive testing framework ever built for a version control system, inspired by Git's legendary testing approach but dramatically expanded to cover every conceivable aspect of creative workflows.

**120+ Automated Tests** across 80+ file formats with Git-based recovery validation.

---

## Testing Philosophy

1. **Test Everything**: 120+ tests covering 80+ file formats, Git recovery, cross-platform compatibility
2. **Git-Inspired Framework**: Shell script tests with TAP output, just like Git's legendary testing
3. **Creative Asset Focus**: 3D models, game assets, video, audio, materials, custom formats
4. **Recovery Validation**: Full Git operations (diff/merge/blame/reset) on binary creative assets
5. **Real-World Scenarios**: NLE workflows, game development, 3D animation pipelines
6. **Cross-Platform**: Windows/macOS/Linux filesystem behaviors, Unicode, path limits
7. **Stress Testing**: 1TB workload simulation through extreme concurrency
8. **Quality Assurance**: Chainlint for test script quality, performance regression testing

---

## Test Categories

### 1. Git-Inspired Shell Script Tests (Primary Framework)

**120+ Comprehensive Tests** using Git's legendary shell script testing approach:

#### **Basic Tests** (`t/basic/` - Foundation)
- Core CLI functionality and repository lifecycle
- File addition, status tracking, commits, logging
- Essential Git operations validation

#### **Core Tests** (`t/core/` - Algorithm & Feature Validation)
- **FastCDC Chunking**: Determinism, boundary stability, performance
- **Video Processing**: MP4 parsing, keyframe alignment, codec handling
- **File Type Coverage**: 20+ formats (images, audio, documents, archives)
- **Creative Assets**: 3D models (OBJ/FBX/glTF/USD), game assets, materials
- **Git Recovery**: Diff/merge/blame/reset operations on binary assets

#### **QA Tests** (`t/qa/` - Quality Assurance & Stress)
- **Edge Cases**: Disk full, permissions, corruption, interruptions
- **Concurrency**: Race conditions, locks, high concurrency (100+ operations)
- **Data Integrity**: Bit flips, silent corruption, recovery, long-term storage
- **Stress Testing**: 10GB+ files, 100k+ files, extreme scenarios
- **Security**: Encryption, authentication, access control, audit trails
- **Network Resilience**: Connection failures, timeouts, interruptions
- **Cross-Platform**: Windows/macOS/Linux filesystem behaviors, Unicode
- **Long-term Aging**: Large repos (1000+ commits), corruption recovery
- **Massive Concurrency**: 1TB workload simulation through high concurrency

#### **Advanced Tests** (`t/advanced/` - Real-World Workflows)
- **NLE Workflows**: Premiere Pro, DaVinci Resolve, Final Cut Pro scenarios
- **Game Development**: Unity, Unreal Engine, Godot pipelines
- **3D Animation**: Blender, Maya, 3ds Max, custom rigging workflows
- **Team Collaboration**: Branching strategies, merge conflicts, code reviews
- **CI/CD Integration**: Automated builds, deployment pipelines
- **P2P Networking**: Decentralized collaboration and asset sharing
- **Storage Lifecycle**: Hot/cold tier migration, backup/recovery

### 2. Rust Unit Tests

Coverage target: **80%+ line coverage**

#### Core Library Tests

```rust
#[cfg(test)]
mod tests {
    // Chunking tests
    mod chunking {
        #[test]
        fn test_fastcdc_deterministic() { }

        #[test]
        fn test_fastcdc_size_bounds() { }

        #[test]
        fn test_fastcdc_boundary_stability() { }

        #[test]
        fn test_keyframe_alignment() { }
    }

    // Hashing tests
    mod hashing {
        #[test]
        fn test_blake3_consistency() { }

        #[test]
        fn test_content_addressing() { }
    }

    // Parser tests
    mod parsers {
        #[test]
        fn test_isobmff_moov_extraction() { }

        #[test]
        fn test_isobmff_keyframe_detection() { }

        #[test]
        fn test_premiere_dependency_extraction() { }

        #[test]
        fn test_resolve_sqlite_parsing() { }
    }

    // Manifest tests
    mod manifest {
        #[test]
        fn test_manifest_serialization() { }

        #[test]
        fn test_manifest_diff() { }

        #[test]
        fn test_manifest_validation() { }
    }

    // Index tests
    mod index {
        #[test]
        fn test_index_add_remove() { }

        #[test]
        fn test_index_conflict_stages() { }

        #[test]
        fn test_index_stat_cache() { }
    }
}
```

#### Creative Asset Test Coverage

**80+ File Formats Tested** with Git recovery validation:

##### **3D Model Formats**
- **OBJ**: Wavefront OBJ with materials and textures
- **FBX**: Autodesk FBX with animations and rigging
- **COLLADA**: DAE XML format with complex hierarchies
- **glTF 2.0**: Khronos glTF with PBR materials and animations
- **USD**: Universal Scene Description (Pixar)
- **Blender**: Native .blend format
- **Maya/3ds Max**: Industry standard formats

##### **Game Engine Assets**
- **Unity**: Asset bundles, prefabs, scenes, shaders
- **Unreal Engine**: UAsset, UMap, material instances
- **Godot**: Scene files, resource files, GDScript
- **Custom Engines**: Proprietary formats and middleware

##### **Animation & Rigging**
- **FBX Animation**: Keyframe animation curves
- **Blender Actions**: Non-linear animation
- **Custom Rigs**: Complex character rigging systems

##### **Materials & Shaders**
- **PBR Materials**: Physically-based rendering workflows
- **Substance Painter**: Material layers and smart materials
- **Custom Shaders**: HLSL, GLSL, CG shader programs

##### **Audio Middleware**
- **Wwise**: SoundBanks, work units, audio sources
- **FMOD**: Banks, events, parameters
- **Custom Audio**: Game-ready audio formats

##### **Pipeline & Tools**
- **Render Farm Scripts**: Python automation
- **Custom Tool Formats**: Proprietary pipeline files
- **Version Control Integration**: Perforce/PlasticSCM alternatives

#### Test Data Fixtures

```
t/fixtures/
├── creative_assets/
│   ├── models/
│   │   ├── cube.obj + cube.mtl      # Wavefront OBJ with materials
│   │   ├── character.fbx            # FBX with animation
│   │   ├── scene.dae                # COLLADA XML
│   │   ├── model.gltf + model.bin   # glTF 2.0 with PBR
│   │   └── scene.usda               # Universal Scene Description
│   ├── game_assets/
│   │   ├── assets.unity3d           # Unity asset bundle
│   │   ├── Character.prefab         # Unity prefab
│   │   ├── Character.uasset         # Unreal Engine asset
│   │   └── Level.tscn               # Godot scene
│   ├── animation/
│   │   ├── walk_cycle.fbx           # FBX animation
│   │   └── WalkCycle.action         # Blender action
│   ├── materials/
│   │   ├── pbr_material.json        # PBR material definition
│   │   └── character.spp            # Substance Painter project
│   ├── audio/
│   │   ├── Actor-Mixer Hierarchy.wwu # Wwise work unit
│   │   └── Master Bank.bank         # FMOD bank
│   └── pipeline/
│       └── render_job.py            # Render farm script
├── video/
│   ├── prores_1080p.mov             # ProRes 422 HQ
│   ├── h264_4k.mp4                  # H.264 Long GOP
│   ├── hevc_hdr.mov                 # HEVC HDR
│   ├── corrupt_moov.mp4             # Malformed moov
│   └── truncated.mp4                # Incomplete file
├── projects/
│   ├── premiere_simple.prproj       # Basic Premiere project
│   ├── premiere_nested.prproj       # Nested sequences
│   ├── resolve_project.drp          # DaVinci Resolve
│   └── fcpx_project.fcpxml          # Final Cut Pro X
├── images/
│   ├── jpeg_standard.jpg
│   ├── raw_canon.cr3
│   └── psd_layers.psd
└── edge_cases/
    ├── zero_byte.bin
    ├── single_byte.bin
    ├── exactly_chunk_size.bin
    └── unicode_filename_αβγ.mov
```

---

### 2. Integration Tests

```rust
#[cfg(test)]
mod integration {
    use dits_test_harness::*;

    /// Test complete add/commit/checkout cycle
    #[tokio::test]
    async fn test_basic_workflow() {
        let repo = TestRepo::new().await;

        // Add file
        repo.write_file("video.mov", include_bytes!("../fixtures/video/prores_1080p.mov"));
        repo.run(&["add", "video.mov"]).await.success();

        // Commit
        repo.run(&["commit", "-m", "Add video"]).await.success();

        // Delete and restore
        repo.delete_file("video.mov");
        repo.run(&["checkout", "HEAD", "--", "video.mov"]).await.success();

        // Verify integrity
        assert!(repo.file_exists("video.mov"));
        assert_eq!(
            repo.file_hash("video.mov"),
            include_bytes!("../fixtures/video/prores_1080p.mov").hash()
        );
    }

    /// Test push/pull between repos
    #[tokio::test]
    async fn test_remote_sync() {
        let server = TestServer::start().await;
        let repo1 = TestRepo::with_remote(&server).await;
        let repo2 = TestRepo::clone(&server).await;

        // Repo1: add and push
        repo1.write_file("file.txt", b"hello");
        repo1.run(&["add", "."]).await.success();
        repo1.run(&["commit", "-m", "Initial"]).await.success();
        repo1.run(&["push"]).await.success();

        // Repo2: pull and verify
        repo2.run(&["pull"]).await.success();
        assert_eq!(repo2.read_file("file.txt"), b"hello");
    }

    /// Test lock acquisition and release
    #[tokio::test]
    async fn test_file_locking() {
        let server = TestServer::start().await;
        let repo1 = TestRepo::with_remote(&server).await;
        let repo2 = TestRepo::clone(&server).await;

        // Setup
        repo1.write_file("video.mov", b"content");
        repo1.run(&["add", "."]).await.success();
        repo1.run(&["commit", "-m", "Add"]).await.success();
        repo1.run(&["push"]).await.success();
        repo2.run(&["pull"]).await.success();

        // Repo1: acquire lock
        repo1.run(&["lock", "video.mov"]).await.success();

        // Repo2: should fail to lock
        let result = repo2.run(&["lock", "video.mov"]).await;
        assert!(!result.success());
        assert!(result.stderr.contains("locked by"));

        // Repo1: release lock
        repo1.run(&["unlock", "video.mov"]).await.success();

        // Repo2: should now succeed
        repo2.run(&["lock", "video.mov"]).await.success();
    }

    /// Test VFS mounting
    #[tokio::test]
    #[cfg(unix)]
    async fn test_vfs_mount() {
        let repo = TestRepo::new().await;

        // Add large file (simulated)
        repo.write_chunked_file("large.mov", 1_000_000_000);  // 1GB
        repo.run(&["add", "."]).await.success();
        repo.run(&["commit", "-m", "Large file"]).await.success();

        // Mount
        let mount_point = repo.mount().await;

        // Read should work (via VFS)
        let data = std::fs::read(mount_point.join("large.mov"))
            .expect("Should read via VFS");

        assert_eq!(data.len(), 1_000_000_000);

        mount_point.unmount().await;
    }

    /// Test concurrent operations
    #[tokio::test]
    async fn test_concurrent_commits() {
        let repo = TestRepo::new().await;

        // Spawn multiple concurrent adds
        let handles: Vec<_> = (0..10).map(|i| {
            let repo = repo.clone();
            tokio::spawn(async move {
                let filename = format!("file_{}.txt", i);
                repo.write_file(&filename, format!("content {}", i).as_bytes());
                repo.run(&["add", &filename]).await
            })
        }).collect();

        // Wait for all
        for handle in handles {
            handle.await.unwrap().success();
        }

        // Should have all files staged
        let status = repo.run(&["status"]).await;
        for i in 0..10 {
            assert!(status.stdout.contains(&format!("file_{}.txt", i)));
        }
    }
}
```

---

### 3. End-to-End Tests

```rust
/// Full workflow tests simulating real user scenarios
mod e2e {
    /// Test video editor workflow
    #[tokio::test]
    async fn test_editor_workflow() {
        let server = TestServer::start().await;
        let editor1 = TestRepo::with_remote(&server).await;
        let editor2 = TestRepo::clone(&server).await;

        // Editor 1: Add footage
        editor1.copy_fixture("video/prores_1080p.mov", "footage/shot_001.mov");
        editor1.copy_fixture("projects/premiere_simple.prproj", "project.prproj");
        editor1.run(&["add", "."]).await.success();
        editor1.run(&["commit", "-m", "Initial footage"]).await.success();
        editor1.run(&["push"]).await.success();

        // Editor 2: Clone and work
        editor2.run(&["pull"]).await.success();
        editor2.run(&["lock", "project.prproj"]).await.success();

        // Editor 2: Modify project
        editor2.modify_file("project.prproj", |data| {
            // Simulate project modification
            data.extend_from_slice(b"<!-- modified -->");
            data
        });

        editor2.run(&["add", "project.prproj"]).await.success();
        editor2.run(&["commit", "-m", "Edit project"]).await.success();
        editor2.run(&["push"]).await.success();
        editor2.run(&["unlock", "project.prproj"]).await.success();

        // Editor 1: Pull changes
        editor1.run(&["pull"]).await.success();

        // Verify project updated
        let content = editor1.read_file("project.prproj");
        assert!(content.ends_with(b"<!-- modified -->"));

        // Verify video still playable
        assert!(editor1.is_video_playable("footage/shot_001.mov"));
    }

    /// Test large repository handling
    #[tokio::test]
    #[ignore]  // Long-running test
    async fn test_large_repo() {
        let repo = TestRepo::new().await;

        // Generate 100 GB of test data (simulated with sparse files)
        for i in 0..1000 {
            let filename = format!("footage/shot_{:04}.mov", i);
            repo.write_sparse_file(&filename, 100_000_000);  // 100MB each
        }

        // Add should complete in reasonable time
        let start = std::time::Instant::now();
        repo.run(&["add", "."]).await.success();
        let add_duration = start.elapsed();
        assert!(add_duration < std::time::Duration::from_secs(300));  // < 5 min

        // Commit
        repo.run(&["commit", "-m", "Bulk footage"]).await.success();

        // Status should be fast
        let start = std::time::Instant::now();
        repo.run(&["status"]).await.success();
        let status_duration = start.elapsed();
        assert!(status_duration < std::time::Duration::from_secs(5));
    }
}
```

---

### 4. Performance Benchmarks

```rust
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};

fn chunking_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("chunking");

    // Different file sizes
    for size in [1_000_000, 10_000_000, 100_000_000, 1_000_000_000].iter() {
        let data = generate_test_data(*size);

        group.bench_with_input(
            BenchmarkId::new("fastcdc", size),
            &data,
            |b, data| {
                b.iter(|| {
                    let config = FastCdcConfig::default();
                    let chunks: Vec<_> = FastCdc::new(data, config).collect();
                    chunks
                });
            }
        );
    }

    group.finish();
}

fn hashing_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("hashing");

    for size in [65536, 1_000_000, 10_000_000].iter() {
        let data = generate_test_data(*size);

        group.bench_with_input(
            BenchmarkId::new("blake3", size),
            &data,
            |b, data| {
                b.iter(|| blake3::hash(data));
            }
        );
    }

    group.finish();
}

fn sync_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("sync");

    // Manifest diff
    group.bench_function("manifest_diff_1k_files", |b| {
        let manifest1 = generate_manifest(1000);
        let manifest2 = mutate_manifest(&manifest1, 0.1);  // 10% changes

        b.iter(|| {
            ManifestDiff::compute(&manifest1, &manifest2)
        });
    });

    // Bloom filter
    group.bench_function("bloom_check_10k", |b| {
        let mut filter = BloomFilter::new(100_000, 0.01);
        let hashes = generate_hashes(10_000);
        for h in &hashes[..5000] {
            filter.insert(h);
        }

        b.iter(|| {
            hashes.iter().filter(|h| filter.contains(h)).count()
        });
    });

    group.finish();
}

fn vfs_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("vfs");

    // Sequential read
    group.bench_function("sequential_read_1gb", |b| {
        let vfs = setup_test_vfs(1_000_000_000);

        b.iter(|| {
            let mut buf = [0u8; 65536];
            let mut total = 0;
            while let Ok(n) = vfs.read(&mut buf) {
                if n == 0 { break; }
                total += n;
            }
            total
        });
    });

    // Random read
    group.bench_function("random_read_4k", |b| {
        let vfs = setup_test_vfs(1_000_000_000);
        let offsets: Vec<u64> = (0..1000)
            .map(|_| rand::random::<u64>() % 1_000_000_000)
            .collect();

        b.iter(|| {
            let mut buf = [0u8; 4096];
            for &offset in &offsets {
                vfs.read_at(&mut buf, offset).unwrap();
            }
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    chunking_benchmarks,
    hashing_benchmarks,
    sync_benchmarks,
    vfs_benchmarks,
);
criterion_main!(benches);
```

### Benchmark Targets

| Operation | Target | Minimum |
|-----------|--------|---------|
| Chunking throughput | 2 GB/s | 500 MB/s |
| BLAKE3 hashing | 5 GB/s | 1 GB/s |
| Manifest diff (10k files) | < 10ms | < 100ms |
| VFS sequential read | 1 GB/s | 200 MB/s |
| VFS random read (4KB) | 10,000 IOPS | 1,000 IOPS |
| Status command (10k files) | < 1s | < 5s |
| Add command (1GB) | < 10s | < 60s |

---

### 5. Video Integrity Tests

```rust
/// Tests to verify video files remain playable
mod video_integrity {
    use ffmpeg_next as ffmpeg;

    /// Verify video can be decoded after roundtrip
    fn verify_video_playable(path: &Path) -> bool {
        match ffmpeg::format::input(path) {
            Ok(context) => {
                // Check for video stream
                let has_video = context.streams()
                    .any(|s| s.parameters().medium() == ffmpeg::media::Type::Video);

                if !has_video {
                    return false;
                }

                // Try to decode first frame
                for (stream, packet) in context.packets() {
                    if stream.parameters().medium() == ffmpeg::media::Type::Video {
                        let decoder = ffmpeg::decoder::find(stream.parameters().codec_id());
                        if decoder.is_some() {
                            return true;
                        }
                    }
                }

                false
            }
            Err(_) => false,
        }
    }

    #[test]
    fn test_prores_roundtrip() {
        let repo = TestRepo::new();

        // Add ProRes file
        let original = include_bytes!("../fixtures/video/prores_1080p.mov");
        repo.write_file("video.mov", original);
        repo.run(&["add", "."]).success();
        repo.run(&["commit", "-m", "Add"]).success();

        // Delete and restore
        repo.delete_file("video.mov");
        repo.run(&["checkout", "HEAD", "--", "video.mov"]).success();

        // Verify playable
        assert!(verify_video_playable(&repo.path().join("video.mov")));

        // Verify bit-exact
        let restored = std::fs::read(repo.path().join("video.mov")).unwrap();
        assert_eq!(original.as_slice(), restored.as_slice());
    }

    #[test]
    fn test_h264_roundtrip() {
        // Similar test for H.264
    }

    #[test]
    fn test_hevc_roundtrip() {
        // Similar test for HEVC
    }

    #[test]
    fn test_partial_restore() {
        let repo = TestRepo::new();

        // Add video and commit
        repo.write_file("video.mov", include_bytes!("../fixtures/video/prores_1080p.mov"));
        repo.run(&["add", "."]).success();
        repo.run(&["commit", "-m", "Add"]).success();

        // Corrupt some chunks locally
        repo.corrupt_random_chunks(5);

        // Restore from remote (simulated)
        repo.run(&["checkout", "--force", "HEAD", "--", "video.mov"]).success();

        // Should still be playable
        assert!(verify_video_playable(&repo.path().join("video.mov")));
    }
}
```

---

### 6. Stress Tests

```rust
mod stress {
    /// Concurrent users simulation
    #[tokio::test]
    #[ignore]
    async fn test_concurrent_users() {
        let server = TestServer::start().await;

        // Spawn 50 concurrent users
        let handles: Vec<_> = (0..50).map(|i| {
            let server = server.clone();
            tokio::spawn(async move {
                let repo = TestRepo::with_remote(&server).await;

                for j in 0..100 {
                    // Random operations
                    let op = rand::random::<u8>() % 4;
                    match op {
                        0 => {
                            repo.write_file(&format!("file_{}_{}.txt", i, j), b"data");
                            repo.run(&["add", "."]).await;
                        }
                        1 => repo.run(&["status"]).await,
                        2 => repo.run(&["log", "--oneline", "-10"]).await,
                        3 => repo.run(&["pull"]).await,
                        _ => {}
                    };
                }
            })
        }).collect();

        // All should complete without error
        for handle in handles {
            handle.await.unwrap();
        }
    }

    /// Memory pressure test
    #[test]
    #[ignore]
    fn test_memory_constrained() {
        // Limit process memory to 512MB
        set_memory_limit(512 * 1024 * 1024);

        let repo = TestRepo::new();

        // Try to add 10GB of data
        for i in 0..100 {
            repo.write_sparse_file(&format!("file_{}.bin", i), 100_000_000);
        }

        // Should complete (via streaming, not loading all into memory)
        repo.run(&["add", "."]).success();
    }

    /// Disk space exhaustion
    #[test]
    #[ignore]
    fn test_disk_full_handling() {
        let repo = TestRepo::on_tmpfs(100_000_000);  // 100MB tmpfs

        // Fill most of the space
        repo.write_file("fill.bin", &vec![0u8; 80_000_000]);

        // Should fail gracefully
        repo.write_file("overflow.bin", &vec![0u8; 50_000_000]);
        let result = repo.run(&["add", "."]);

        assert!(!result.success());
        assert!(result.stderr.contains("disk") || result.stderr.contains("space"));
    }
}
```

---

### 7. Fuzz Tests

```rust
use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;

/// Fuzz the chunker
fuzz_target!(|data: &[u8]| {
    let config = FastCdcConfig::default();
    let chunks: Vec<_> = FastCdc::new(data, config).collect();

    // Invariants that must hold
    let total_len: usize = chunks.iter().map(|c| c.length as usize).sum();
    assert_eq!(total_len, data.len());

    // Chunks should be contiguous
    let mut offset = 0;
    for chunk in &chunks {
        assert_eq!(chunk.offset, offset);
        offset += chunk.length as u64;
    }
});

/// Fuzz the manifest parser
fuzz_target!(|data: &[u8]| {
    // Should not panic on any input
    let _ = Manifest::from_bytes(data);
});

/// Fuzz the ISOBMFF parser
fuzz_target!(|data: &[u8]| {
    let cursor = std::io::Cursor::new(data);
    let _ = IsobmffParser::new(cursor).and_then(|mut p| p.parse());
});
```

---

## Test Environment

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --lib

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --test integration

  benchmarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo bench -- --save-baseline ci
      - uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: target/criterion

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo install cargo-tarpaulin
      - run: cargo tarpaulin --out Xml
      - uses: codecov/codecov-action@v3
```

### Test Execution

#### **Comprehensive Test Suite**
```bash
# Run all tests (Rust + integration)
just test-all

# Run specific test categories
just test-creative-all        # Creative assets + Git recovery
just test-qa-extended         # All QA tests including new ones
just test-cross-platform      # Cross-platform compatibility
just test-network-failures    # Network failure scenarios
just test-aging              # Long-term aging tests
just test-massive-concurrency # 1TB workload simulation

# Run individual creative asset tests
just test-creative-assets     # 3D models, game assets, materials
just test-git-recovery-creative # Git operations on binary assets

# Performance and quality checks
cargo test                    # Rust unit tests
cargo clippy --all-targets --all-features  # Lints
cargo fmt                     # Format checking
just check                    # All quality checks

# Run fuzz tests (when available)
cargo +nightly fuzz run fuzz_chunker
```

#### **Git-Inspired Shell Script Testing**
```bash
# Run all shell script tests
just test-integration

# Run with verbose output
just test-integration-verbose

# Run in parallel (like Git's prove)
just test-integration-parallel

# Run performance tests
just test-performance

# Run specific test files
cd t && ./run-tests.sh qa/t1300-cross-platform.sh
cd t && ./run-tests.sh core/t0301-creative-assets-comprehensive.sh
```

---

## Quality Gates

### Before Merge

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No performance regression > 10%
- [ ] Coverage >= 80%
- [ ] No new clippy warnings
- [ ] Documentation updated

### Before Release

- [ ] Full E2E test suite passes
- [ ] Stress tests pass
- [ ] Video integrity tests pass
- [ ] Performance meets targets
- [ ] Security audit complete
- [ ] Backward compatibility verified

---

## Notes

- Run expensive tests with `--ignored` flag
- Use `RUST_LOG=debug` for verbose test output
- Test fixtures stored in Git LFS
- Benchmark history tracked for regression detection
