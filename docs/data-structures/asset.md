# Asset (The File Recipe)

Files are represented as recipes over stored chunks and metadata.

```rust
struct Asset {
    path: String,           // e.g., "scenes/intro.mp4"
    file_type: String,      // e.g., "mp4"
    metadata_blob: Vec<u8>, // Header atoms such as 'moov'
    chunks: Vec<String>,    // Ordered list of chunk hashes for payload ('mdat')
}
```

Notes:
- Only the metadata blob and ordered chunk references are persisted; the full file is reconstructed on checkout or read through the virtual FS.
- Metadata edits (titles, captions, tags) avoid re-uploading payload data.
- Path serves as the logical locator within the repository tree.


