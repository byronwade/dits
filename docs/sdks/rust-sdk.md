# Rust SDK Guide

Complete guide to using the Dits Rust SDK.

---

## Installation

```toml
# Cargo.toml
[dependencies]
dits-sdk = "0.1"
tokio = { version = "1", features = ["full"] }
```

---

## Quick Start

```rust
use dits_sdk::{Client, Repository};

#[tokio::main]
async fn main() -> Result<(), dits_sdk::Error> {
    // Initialize client
    let client = Client::from_env()?;

    // Clone a repository
    let repo = client.clone("myorg/project", "./project").await?;

    // Check status
    let status = repo.status().await?;
    println!("Modified files: {:?}", status.modified);

    // Pull latest changes
    repo.pull().await?;

    Ok(())
}
```

---

## Client Configuration

### From Environment

```rust
use dits_sdk::Client;

// Reads DITS_TOKEN and DITS_ENDPOINT from environment
let client = Client::from_env()?;
```

### Builder Pattern

```rust
use dits_sdk::{Client, ClientConfig};
use std::time::Duration;

let client = Client::builder()
    .endpoint("https://api.dits.io")
    .token("dits_token_xxx")
    .timeout(Duration::from_secs(30))
    .max_connections(8)
    .retry_config(RetryConfig {
        max_retries: 3,
        initial_delay: Duration::from_secs(1),
        ..Default::default()
    })
    .cache_dir("/tmp/dits-cache")
    .build()?;
```

### Configuration Options

```rust
pub struct ClientConfig {
    /// API endpoint URL
    pub endpoint: String,

    /// Authentication token
    pub token: Option<String>,

    /// Request timeout
    pub timeout: Duration,

    /// Maximum concurrent connections
    pub max_connections: u32,

    /// Retry configuration
    pub retry: RetryConfig,

    /// Local cache directory
    pub cache_dir: PathBuf,

    /// Enable debug logging
    pub debug: bool,

    /// Proxy URL
    pub proxy: Option<String>,

    /// Custom CA certificate
    pub ca_cert: Option<PathBuf>,

    /// User agent string
    pub user_agent: String,
}
```

---

## Authentication

### Token Authentication

```rust
// From environment variable
let client = Client::builder()
    .token(std::env::var("DITS_TOKEN")?)
    .build()?;

// Direct token
let client = Client::builder()
    .token("dits_token_xxx")
    .build()?;
```

### OAuth Flow

```rust
use dits_sdk::auth::{OAuthProvider, OAuthFlow};

// Start OAuth flow
let flow = OAuthFlow::new(OAuthProvider::GitHub);
let auth_url = flow.authorization_url();

println!("Open in browser: {}", auth_url);

// After user authorizes, exchange code for token
let token = flow.exchange_code(&code).await?;

let client = Client::builder()
    .token(token.access_token)
    .build()?;
```

### API Key

```rust
let client = Client::builder()
    .api_key("dits_api_xxx")
    .build()?;
```

---

## Repository Operations

### Clone

```rust
// Clone to local directory
let repo = client.clone("myorg/project", "./local-path").await?;

// Clone specific branch
let repo = client.clone_opts("myorg/project", "./local-path", CloneOptions {
    branch: Some("develop".into()),
    depth: None,
    sparse: false,
}).await?;

// Sparse clone (only specific paths)
let repo = client.clone_opts("myorg/project", "./local-path", CloneOptions {
    branch: None,
    depth: None,
    sparse: true,
}).await?;

repo.sparse_add(&["*.prproj", "Media/**/*.mov"]).await?;
repo.checkout().await?;
```

### Open Existing

```rust
// Open repository at path
let repo = Repository::open("./project")?;

// Or from client
let repo = client.open_repository("./project")?;
```

### Create New

```rust
// Initialize new repository
let repo = Repository::init("./new-project")?;

// Add remote
repo.remote_add("origin", "https://dits.io/myorg/new-project").await?;
```

### Repository Info

```rust
let info = repo.info().await?;
println!("Name: {}", info.name);
println!("Size: {} bytes", info.size);
println!("Commits: {}", info.commit_count);
println!("Default branch: {}", info.default_branch);
```

---

## File Operations

### Status

```rust
let status = repo.status().await?;

// Check for changes
if status.is_clean() {
    println!("Working directory clean");
} else {
    println!("Modified: {:?}", status.modified);
    println!("Added: {:?}", status.added);
    println!("Deleted: {:?}", status.deleted);
    println!("Untracked: {:?}", status.untracked);
}
```

### Add Files

```rust
// Add specific files
repo.add(&["video.mov", "project.prproj"]).await?;

// Add all changes
repo.add(&["."]).await?;

// Add with options
repo.add_opts(&["*.mov"], AddOptions {
    force: false,
    chunker: Chunker::VideoAware,
    ..Default::default()
}).await?;
```

### Remove Files

```rust
// Remove from index (keep on disk)
repo.remove(&["old-file.mov"]).await?;

// Remove from disk too
repo.remove_opts(&["old-file.mov"], RemoveOptions {
    from_disk: true,
    force: false,
}).await?;
```

### Read File Content

```rust
// Read file at HEAD
let content = repo.read_file("README.md", None).await?;

// Read file at specific commit
let content = repo.read_file("README.md", Some("abc123")).await?;

// Stream large file
let mut stream = repo.stream_file("video.mov", None).await?;
while let Some(chunk) = stream.next().await {
    process_chunk(chunk?);
}
```

### List Files

```rust
// List all files
let files = repo.list_files("/", None).await?;

// List files at specific commit
let files = repo.list_files("/Media", Some("abc123")).await?;

for file in files {
    println!("{}: {} bytes", file.path, file.size);
}
```

---

## Commit Operations

### Create Commit

```rust
// Simple commit
repo.commit("Add new video assets").await?;

// Commit with options
repo.commit_opts(CommitOptions {
    message: "Add new video assets".into(),
    author: Some(Author {
        name: "John Doe".into(),
        email: "john@example.com".into(),
    }),
    sign: true,
    ..Default::default()
}).await?;
```

### View Commits

```rust
// Get commit history
let commits = repo.log(LogOptions {
    limit: Some(10),
    branch: None,
    path: None,
    ..Default::default()
}).await?;

for commit in commits {
    println!("{}: {} by {}",
        &commit.hash[..8],
        commit.message,
        commit.author.name
    );
}

// Get specific commit
let commit = repo.get_commit("abc123def456").await?;
```

### Diff

```rust
// Diff working directory
let diff = repo.diff(None, None).await?;

// Diff between commits
let diff = repo.diff(Some("abc123"), Some("def456")).await?;

// Diff with options
let diff = repo.diff_opts(DiffOptions {
    from: Some("HEAD~5".into()),
    to: Some("HEAD".into()),
    paths: vec!["src/".into()],
    context_lines: 3,
    ..Default::default()
}).await?;

for file_diff in diff.files {
    println!("File: {}", file_diff.path);
    println!("  Added: {} lines", file_diff.additions);
    println!("  Removed: {} lines", file_diff.deletions);
}
```

---

## Branch Operations

### List Branches

```rust
let branches = repo.branches().await?;

for branch in branches {
    let marker = if branch.is_current { "*" } else { " " };
    println!("{} {}", marker, branch.name);
}
```

### Create Branch

```rust
// Create from HEAD
repo.create_branch("feature/new-ui").await?;

// Create from specific commit
repo.create_branch_from("feature/new-ui", "abc123").await?;
```

### Switch Branch

```rust
repo.checkout("feature/new-ui").await?;

// Create and switch
repo.checkout_new("feature/another").await?;
```

### Delete Branch

```rust
// Delete local branch
repo.delete_branch("feature/old").await?;

// Force delete
repo.delete_branch_force("feature/old").await?;
```

### Merge

```rust
// Merge branch into current
let result = repo.merge("feature/new-ui").await?;

match result {
    MergeResult::FastForward => println!("Fast-forward merge"),
    MergeResult::Merged { commit } => println!("Merge commit: {}", commit),
    MergeResult::Conflict { files } => {
        println!("Conflicts in: {:?}", files);
        // Resolve conflicts...
        repo.resolve_all().await?;
        repo.merge_continue().await?;
    }
}
```

---

## Remote Operations

### Push

```rust
// Simple push
repo.push().await?;

// Push with options
let result = repo.push_opts(PushOptions {
    remote: "origin".into(),
    branch: None,  // Current branch
    force: false,
    tags: false,
    on_progress: Some(Box::new(|p| {
        println!("Progress: {:.1}%", p.percentage());
    })),
}).await?;

println!("Pushed {} chunks", result.chunks_uploaded);
```

### Pull

```rust
// Simple pull
repo.pull().await?;

// Pull with options
let result = repo.pull_opts(PullOptions {
    remote: "origin".into(),
    branch: None,
    rebase: false,
    on_progress: Some(Box::new(|p| {
        println!("Downloading: {}/{} chunks", p.downloaded, p.total);
    })),
}).await?;
```

### Fetch

```rust
// Fetch all
repo.fetch().await?;

// Fetch specific remote
repo.fetch_remote("upstream").await?;
```

---

## Lock Operations

### Acquire Lock

```rust
// Lock a file
let lock = repo.lock("project.prproj").await?;
println!("Lock acquired, expires at: {}", lock.expires_at);

// Lock with custom duration
let lock = repo.lock_opts("project.prproj", LockOptions {
    duration: Duration::from_secs(8 * 3600),  // 8 hours
    reason: Some("Editing timeline".into()),
}).await?;
```

### Release Lock

```rust
// Release lock
repo.unlock("project.prproj").await?;

// Force release (admin only)
repo.unlock_force("project.prproj").await?;
```

### Check Locks

```rust
// List all locks
let locks = repo.locks().await?;

for lock in locks {
    println!("{}: locked by {} until {}",
        lock.path,
        lock.owner.name,
        lock.expires_at
    );
}

// Check specific file
if let Some(lock) = repo.get_lock("project.prproj").await? {
    println!("Locked by: {}", lock.owner.name);
}
```

---

## Event Handling

### Progress Callbacks

```rust
repo.push_opts(PushOptions {
    on_progress: Some(Box::new(|progress| {
        let pct = progress.percentage();
        let speed = format_bytes(progress.speed);
        let eta = progress.eta.map(|d| format!("{:?}", d)).unwrap_or_default();

        print!("\rUploading: {:.1}% @ {}/s ETA: {}", pct, speed, eta);
        std::io::stdout().flush().unwrap();
    })),
    ..Default::default()
}).await?;
```

### Event Subscription

```rust
use dits_sdk::events::{EventHandler, Event};

struct MyHandler;

impl EventHandler for MyHandler {
    fn on_event(&self, event: Event) {
        match event {
            Event::PushStart { files } => {
                println!("Starting push of {} files", files.len());
            }
            Event::ChunkUploaded { hash, size } => {
                println!("Uploaded chunk: {} ({} bytes)", &hash[..8], size);
            }
            Event::PushComplete { result } => {
                println!("Push complete: {} chunks", result.chunks_uploaded);
            }
            Event::Error { error } => {
                eprintln!("Error: {}", error);
            }
            _ => {}
        }
    }
}

// Subscribe to events
let subscription = repo.subscribe(MyHandler);

// ... do operations ...

// Unsubscribe
subscription.cancel();
```

---

## Error Handling

### Error Types

```rust
use dits_sdk::{Error, ErrorKind};

match repo.push().await {
    Ok(result) => println!("Success!"),
    Err(e) => {
        match e.kind() {
            ErrorKind::Authentication => {
                eprintln!("Auth failed, please login");
            }
            ErrorKind::NotFound => {
                eprintln!("Repository not found");
            }
            ErrorKind::Conflict => {
                eprintln!("Conflict: {}", e);
            }
            ErrorKind::RateLimit { retry_after } => {
                eprintln!("Rate limited, retry after {:?}", retry_after);
            }
            ErrorKind::Network => {
                eprintln!("Network error: {}", e);
            }
            _ => {
                eprintln!("Error: {}", e);
            }
        }

        // Get error code
        if let Some(code) = e.code() {
            eprintln!("Error code: {}", code);
        }

        // Get request ID for support
        if let Some(request_id) = e.request_id() {
            eprintln!("Request ID: {}", request_id);
        }
    }
}
```

### Retry Logic

```rust
use dits_sdk::retry::{retry_with_backoff, RetryConfig};

let result = retry_with_backoff(
    || async { repo.push().await },
    RetryConfig::default(),
).await?;
```

---

## Async Patterns

### Concurrent Operations

```rust
use futures::future::try_join_all;

// Upload multiple files concurrently
let futures: Vec<_> = files.iter()
    .map(|path| repo.add(&[path]))
    .collect();

try_join_all(futures).await?;
```

### Streaming

```rust
use futures::StreamExt;

// Stream chunks during download
let mut stream = repo.pull_stream().await?;

while let Some(result) = stream.next().await {
    match result {
        Ok(chunk) => {
            println!("Received chunk: {}", chunk.hash);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
        }
    }
}
```

### Cancellation

```rust
use tokio::select;
use tokio_util::sync::CancellationToken;

let token = CancellationToken::new();
let cloned_token = token.clone();

// Spawn push operation
let handle = tokio::spawn(async move {
    select! {
        result = repo.push() => result,
        _ = cloned_token.cancelled() => {
            Err(Error::cancelled())
        }
    }
});

// Cancel after timeout
tokio::time::sleep(Duration::from_secs(60)).await;
token.cancel();

let result = handle.await?;
```

---

## Testing

### Mock Client

```rust
use dits_sdk::testing::{MockClient, MockRepository};

#[tokio::test]
async fn test_push() {
    let client = MockClient::new()
        .with_repository("test/repo", MockRepository::new()
            .with_file("test.txt", b"content")
        );

    let repo = client.clone("test/repo", "/tmp/test").await.unwrap();
    let result = repo.push().await.unwrap();

    assert_eq!(result.chunks_uploaded, 1);
}
```

### Integration Tests

```rust
#[tokio::test]
#[ignore]  // Requires real server
async fn test_real_push() {
    let client = Client::from_env().unwrap();
    let repo = client.clone("test/integration", "/tmp/test").await.unwrap();

    // ... test operations
}
```

---

## Examples

### Full Workflow

```rust
use dits_sdk::{Client, Repository};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize
    let client = Client::from_env()?;

    // Clone repository
    let repo = client.clone("myorg/video-project", "./project").await?;

    // Pull latest
    repo.pull().await?;

    // Make changes
    std::fs::write("./project/new-video.mov", get_video_data())?;

    // Stage changes
    repo.add(&["new-video.mov"]).await?;

    // Commit
    repo.commit("Add new video").await?;

    // Push
    let result = repo.push_opts(PushOptions {
        on_progress: Some(Box::new(|p| {
            println!("Uploading: {:.1}%", p.percentage());
        })),
        ..Default::default()
    }).await?;

    println!("Pushed {} chunks ({} bytes)",
        result.chunks_uploaded,
        result.bytes_uploaded
    );

    Ok(())
}
```

---

## Notes

- SDK requires Rust 1.75+
- All operations are async
- Thread-safe for concurrent use
- Implements `Clone` for sharing across tasks
- Full documentation at docs.rs/dits-sdk
