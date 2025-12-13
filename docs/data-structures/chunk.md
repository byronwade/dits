# Chunk (The Atom)

The smallest unit of storage produced by the chunking pipeline.

```rust
struct Chunk {
    hash: String,      // BLAKE3 hash (unique ID)
    offset: u64,       // Byte offset within the original file
    length: u32,       // Chunk size (avg ~64KB)
    is_keyframe: bool, // True when chunk starts on a GOP keyframe
}
```

Key behaviors:
- Chunk boundaries are derived via FastCDC and nudged to keyframes when possible.
- Deduplication is performed by hash; identical content reuses stored chunks.
- Metadata and payload are chunked separately for container integrity.


