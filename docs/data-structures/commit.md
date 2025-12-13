# Commit (The Snapshot)

Commits capture repository state by mapping paths to asset recipes.

```rust
struct Commit {
    id: String,                       // Commit hash
    parent_id: Option<String>,        // Linear or DAG history
    author: String,                   // Identity string
    message: String,                  // Commit message
    timestamp: u64,                   // Unix epoch seconds
    assets: HashMap<String, String>,  // Map [path -> AssetHash]
}
```

Notes:
- Commit hashes derive from content (assets + metadata) to ensure integrity.
- Parent linkage supports history and branch merges.
- Asset map stores references to asset recipes, not raw files.


