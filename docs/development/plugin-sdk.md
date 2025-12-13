# Plugin SDK Documentation

Build integrations and extensions for Dits using the Plugin SDK.

---

## Overview

The Dits Plugin SDK enables developers to build:

- **NLE Plugins**: Premiere Pro, DaVinci Resolve, Final Cut Pro X
- **Editor Extensions**: VS Code, JetBrains IDEs
- **Custom Integrations**: Webhooks, automation, custom workflows
- **Storage Backends**: Custom storage providers

---

## SDK Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Plugin                           │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    UI       │  │   Logic     │  │   Events    │ │
│  │  Component  │  │  Handler    │  │  Listener   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│  ┌──────┴────────────────┴────────────────┴──────┐ │
│  │              Plugin SDK API                   │ │
│  └──────────────────────┬────────────────────────┘ │
│                         │                          │
├─────────────────────────┼──────────────────────────┤
│  ┌──────────────────────┴────────────────────────┐ │
│  │              Transport Layer                   │ │
│  │     (HTTP/REST, WebSocket, Native IPC)        │ │
│  └──────────────────────┬────────────────────────┘ │
└─────────────────────────┼──────────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │    Dits Server      │
               └─────────────────────┘
```

---

## SDK Languages

### Rust SDK

Primary SDK for high-performance integrations.

```toml
# Cargo.toml
[dependencies]
dits-sdk = "0.1"
tokio = { version = "1", features = ["full"] }
```

```rust
use dits_sdk::{Client, Repository, PushOptions};

#[tokio::main]
async fn main() -> Result<(), dits_sdk::Error> {
    // Initialize client
    let client = Client::builder()
        .endpoint("https://api.dits.io")
        .token(std::env::var("DITS_TOKEN")?)
        .build()?;

    // Open repository
    let repo = client.repository("org/project").await?;

    // Push changes
    let result = repo.push(&PushOptions::default()).await?;
    println!("Pushed {} chunks", result.chunks_uploaded);

    Ok(())
}
```

### TypeScript/JavaScript SDK

For web and Node.js integrations.

```bash
npm install @dits/sdk
```

```typescript
import { DitsClient, Repository } from '@dits/sdk';

async function main() {
  // Initialize client
  const client = new DitsClient({
    endpoint: 'https://api.dits.io',
    token: process.env.DITS_TOKEN,
  });

  // Open repository
  const repo = await client.repository('org/project');

  // Get status
  const status = await repo.status();
  console.log(`Modified files: ${status.modified.length}`);

  // Push changes
  const result = await repo.push();
  console.log(`Pushed ${result.chunksUploaded} chunks`);
}
```

### Python SDK

For scripting and automation.

```bash
pip install dits-py
```

```python
from dits import Client, PushOptions

# Initialize client
client = Client(
    endpoint="https://api.dits.io",
    token=os.environ["DITS_TOKEN"]
)

# Open repository
repo = client.repository("org/project")

# Push changes
result = repo.push(PushOptions(message="Update assets"))
print(f"Pushed {result.chunks_uploaded} chunks")
```

---

## Core API Reference

### Client

```rust
pub struct Client {
    config: ClientConfig,
    http: HttpClient,
    cache: ChunkCache,
}

impl Client {
    /// Create a new client builder
    pub fn builder() -> ClientBuilder;

    /// Get a repository by path
    pub async fn repository(&self, path: &str) -> Result<Repository>;

    /// List accessible repositories
    pub async fn list_repositories(&self) -> Result<Vec<RepositoryInfo>>;

    /// Get current user
    pub async fn current_user(&self) -> Result<User>;

    /// Authenticate with credentials
    pub async fn login(&self, username: &str, password: &str) -> Result<Token>;

    /// Authenticate with OAuth
    pub async fn oauth_login(&self, provider: OAuthProvider) -> Result<Token>;
}

pub struct ClientBuilder {
    endpoint: Option<String>,
    token: Option<String>,
    timeout: Duration,
    cache_dir: Option<PathBuf>,
    proxy: Option<String>,
}

impl ClientBuilder {
    pub fn endpoint(mut self, endpoint: &str) -> Self;
    pub fn token(mut self, token: &str) -> Self;
    pub fn timeout(mut self, timeout: Duration) -> Self;
    pub fn cache_dir(mut self, path: PathBuf) -> Self;
    pub fn proxy(mut self, proxy: &str) -> Self;
    pub fn build(self) -> Result<Client>;
}
```

### Repository

```rust
pub struct Repository {
    client: Arc<Client>,
    info: RepositoryInfo,
    local_path: Option<PathBuf>,
}

impl Repository {
    // Status and information
    pub async fn status(&self) -> Result<Status>;
    pub async fn info(&self) -> Result<RepositoryInfo>;
    pub async fn branches(&self) -> Result<Vec<Branch>>;
    pub async fn tags(&self) -> Result<Vec<Tag>>;
    pub async fn commits(&self, options: &LogOptions) -> Result<Vec<Commit>>;

    // File operations
    pub async fn list_files(&self, path: &str, commit: Option<&str>) -> Result<Vec<FileEntry>>;
    pub async fn read_file(&self, path: &str, commit: Option<&str>) -> Result<Vec<u8>>;
    pub async fn file_history(&self, path: &str) -> Result<Vec<FileVersion>>;

    // Working directory operations
    pub fn add(&self, paths: &[&Path]) -> Result<()>;
    pub fn remove(&self, paths: &[&Path]) -> Result<()>;
    pub fn reset(&self, paths: &[&Path]) -> Result<()>;

    // Remote operations
    pub async fn push(&self, options: &PushOptions) -> Result<PushResult>;
    pub async fn pull(&self, options: &PullOptions) -> Result<PullResult>;
    pub async fn fetch(&self) -> Result<FetchResult>;

    // Branching
    pub async fn checkout(&self, branch: &str) -> Result<()>;
    pub async fn create_branch(&self, name: &str) -> Result<Branch>;
    pub async fn delete_branch(&self, name: &str) -> Result<()>;

    // Locking
    pub async fn lock(&self, path: &str) -> Result<Lock>;
    pub async fn unlock(&self, path: &str) -> Result<()>;
    pub async fn locks(&self) -> Result<Vec<Lock>>;
}
```

### Events

```rust
pub trait EventHandler: Send + Sync {
    /// Called when push starts
    fn on_push_start(&self, info: &PushInfo) {}

    /// Called for push progress updates
    fn on_push_progress(&self, progress: &PushProgress) {}

    /// Called when push completes
    fn on_push_complete(&self, result: &PushResult) {}

    /// Called when pull starts
    fn on_pull_start(&self, info: &PullInfo) {}

    /// Called for pull progress updates
    fn on_pull_progress(&self, progress: &PullProgress) {}

    /// Called when pull completes
    fn on_pull_complete(&self, result: &PullResult) {}

    /// Called on any error
    fn on_error(&self, error: &Error) {}

    /// Called when a file is locked/unlocked
    fn on_lock_change(&self, lock: &Lock, action: LockAction) {}

    /// Called when remote changes are detected
    fn on_remote_change(&self, changes: &RemoteChanges) {}
}

impl Repository {
    /// Subscribe to repository events
    pub fn subscribe<H: EventHandler + 'static>(&self, handler: H) -> Subscription;
}

pub struct Subscription {
    id: Uuid,
}

impl Subscription {
    /// Unsubscribe from events
    pub fn cancel(self);
}
```

### Progress Reporting

```rust
pub struct PushProgress {
    /// Total bytes to upload
    pub total_bytes: u64,

    /// Bytes uploaded so far
    pub uploaded_bytes: u64,

    /// Total chunks to upload
    pub total_chunks: usize,

    /// Chunks uploaded so far
    pub uploaded_chunks: usize,

    /// Current file being processed
    pub current_file: Option<String>,

    /// Upload speed in bytes/second
    pub speed: u64,

    /// Estimated time remaining
    pub eta: Option<Duration>,
}

impl PushProgress {
    pub fn percentage(&self) -> f64 {
        if self.total_bytes == 0 {
            100.0
        } else {
            (self.uploaded_bytes as f64 / self.total_bytes as f64) * 100.0
        }
    }
}

// Usage with callback
repo.push(&PushOptions {
    on_progress: Some(Box::new(|progress| {
        println!(
            "Uploading: {:.1}% ({}/{})",
            progress.percentage(),
            progress.uploaded_chunks,
            progress.total_chunks
        );
    })),
    ..Default::default()
}).await?;
```

---

## NLE Plugin Development

### Adobe Premiere Pro

```javascript
// manifest.json
{
  "id": "com.dits.premiere",
  "name": "Dits Version Control",
  "version": "1.0.0",
  "host": {
    "app": "PPRO",
    "minVersion": "22.0"
  },
  "api_version": 2,
  "main": "index.html"
}
```

```javascript
// main.js
const dits = require('@dits/premiere-sdk');

// Initialize Dits integration
const integration = new dits.PremiereIntegration({
  onProjectOpen: async (project) => {
    console.log('Project opened:', project.path);

    // Auto-sync on project open
    const repo = await dits.openRepository(project.path);
    if (repo) {
      await showSyncPanel(repo);
    }
  },

  onProjectSave: async (project) => {
    // Check for unsaved changes
    const repo = await dits.openRepository(project.path);
    if (repo) {
      const status = await repo.status();
      if (status.hasChanges) {
        showCommitDialog(repo, status);
      }
    }
  },

  onMediaImport: async (items) => {
    // Track imported media
    for (const item of items) {
      console.log('Media imported:', item.path);
    }
  }
});

// Panel UI
function createPanel() {
  return `
    <div id="dits-panel">
      <div class="status-bar">
        <span id="branch-name"></span>
        <span id="sync-status"></span>
      </div>
      <div class="file-list" id="changed-files"></div>
      <div class="actions">
        <button id="push-btn">Push</button>
        <button id="pull-btn">Pull</button>
        <button id="commit-btn">Commit</button>
      </div>
    </div>
  `;
}

// Event handlers
document.getElementById('push-btn').addEventListener('click', async () => {
  const repo = await dits.getCurrentRepository();
  if (!repo) {
    dits.showError('No repository found');
    return;
  }

  try {
    dits.showProgress('Pushing changes...');
    const result = await repo.push({
      onProgress: (p) => dits.updateProgress(p.percentage())
    });
    dits.showSuccess(`Pushed ${result.chunksUploaded} chunks`);
  } catch (err) {
    dits.showError(err.message);
  }
});
```

### DaVinci Resolve

```python
# dits_resolve.py
import DaVinciResolveScript as dvr
from dits import Client, Repository

class DitsResolveIntegration:
    def __init__(self):
        self.resolve = dvr.scriptapp("Resolve")
        self.client = Client.from_env()
        self.project = None
        self.repo = None

    def initialize(self):
        """Initialize integration with current project"""
        self.project = self.resolve.GetProjectManager().GetCurrentProject()
        if self.project:
            project_path = self.get_project_path()
            self.repo = self.client.open_repository(project_path)

    def get_project_path(self):
        """Get the path to the project's media folder"""
        # DaVinci Resolve specific path resolution
        pass

    def sync_media_pool(self):
        """Sync media pool with Dits repository"""
        if not self.repo:
            return

        media_pool = self.project.GetMediaPool()
        root_folder = media_pool.GetRootFolder()

        # Get all clips
        clips = self._get_all_clips(root_folder)

        # Track in Dits
        for clip in clips:
            file_path = clip.GetClipProperty("File Path")
            if file_path:
                self.repo.add([file_path])

    def _get_all_clips(self, folder):
        """Recursively get all clips from folder"""
        clips = list(folder.GetClipList())
        for subfolder in folder.GetSubFolderList():
            clips.extend(self._get_all_clips(subfolder))
        return clips

    def on_project_save(self):
        """Called when project is saved"""
        if not self.repo:
            return

        status = self.repo.status()
        if status.has_changes:
            # Auto-commit or prompt user
            self.repo.commit(message="Auto-save from Resolve")

    def push_changes(self, callback=None):
        """Push changes to remote"""
        if not self.repo:
            return

        result = self.repo.push(
            on_progress=callback
        )
        return result

# Resolve script entry point
integration = DitsResolveIntegration()
integration.initialize()
```

### After Effects

```javascript
// aftereffects/main.jsx
#include "dits-sdk.jsx"

var dits = new DitsIntegration();

// Menu commands
app.menuCommand = function(cmd) {
    switch(cmd) {
        case "dits_push":
            pushProject();
            break;
        case "dits_pull":
            pullProject();
            break;
        case "dits_status":
            showStatus();
            break;
    }
};

function pushProject() {
    var project = app.project;
    if (!project.file) {
        alert("Please save the project first");
        return;
    }

    var projectPath = project.file.fsName;
    var repo = dits.openRepository(projectPath);

    if (!repo) {
        alert("No Dits repository found");
        return;
    }

    // Collect all footage items
    var footageItems = collectFootage(project);

    // Add to staging
    for (var i = 0; i < footageItems.length; i++) {
        repo.add(footageItems[i].file.fsName);
    }

    // Commit and push
    var result = repo.commit({
        message: "Update from After Effects"
    });

    if (result.success) {
        var pushResult = repo.push();
        alert("Pushed " + pushResult.chunksUploaded + " chunks");
    }
}

function collectFootage(project) {
    var footage = [];
    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);
        if (item instanceof FootageItem && item.file) {
            footage.push(item);
        }
    }
    return footage;
}
```

---

## VS Code Extension

```typescript
// extension.ts
import * as vscode from 'vscode';
import { DitsClient, Repository } from '@dits/sdk';

let client: DitsClient;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // Initialize client
    client = new DitsClient({
        endpoint: vscode.workspace.getConfiguration('dits').get('endpoint'),
        token: vscode.workspace.getConfiguration('dits').get('token'),
    });

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.command = 'dits.showStatus';
    context.subscriptions.push(statusBarItem);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('dits.push', pushCommand),
        vscode.commands.registerCommand('dits.pull', pullCommand),
        vscode.commands.registerCommand('dits.status', statusCommand),
        vscode.commands.registerCommand('dits.lock', lockCommand),
        vscode.commands.registerCommand('dits.unlock', unlockCommand),
    );

    // File decorations
    const decorationProvider = new DitsDecorationProvider(client);
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(decorationProvider)
    );

    // Source control
    const scm = vscode.scm.createSourceControl('dits', 'Dits');
    const changesGroup = scm.createResourceGroup('changes', 'Changes');
    context.subscriptions.push(scm);

    // Watch for changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(updateStatus);
    watcher.onDidCreate(updateStatus);
    watcher.onDidDelete(updateStatus);

    // Initial status update
    updateStatus();
}

async function updateStatus() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    try {
        const repo = await client.openRepository(workspaceFolder.uri.fsPath);
        if (!repo) {
            statusBarItem.hide();
            return;
        }

        const status = await repo.status();
        const branch = await repo.currentBranch();

        statusBarItem.text = `$(git-branch) ${branch.name}`;
        if (status.modified.length > 0) {
            statusBarItem.text += ` $(circle-filled) ${status.modified.length}`;
        }
        statusBarItem.show();
    } catch (err) {
        console.error('Dits status error:', err);
    }
}

async function pushCommand() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const repo = await client.openRepository(workspaceFolder.uri.fsPath);
    if (!repo) {
        vscode.window.showErrorMessage('No Dits repository found');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Dits: Pushing changes',
        cancellable: true
    }, async (progress, token) => {
        try {
            const result = await repo.push({
                onProgress: (p) => {
                    progress.report({
                        increment: p.percentage() - (progress as any)._lastPercent || 0,
                        message: `${p.uploadedChunks}/${p.totalChunks} chunks`
                    });
                    (progress as any)._lastPercent = p.percentage();
                }
            });

            vscode.window.showInformationMessage(
                `Pushed ${result.chunksUploaded} chunks`
            );
        } catch (err: any) {
            vscode.window.showErrorMessage(`Push failed: ${err.message}`);
        }
    });
}

class DitsDecorationProvider implements vscode.FileDecorationProvider {
    private client: DitsClient;
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    constructor(client: DitsClient) {
        this.client = client;
    }

    async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
        try {
            const repo = await this.client.openRepository(uri.fsPath);
            if (!repo) return undefined;

            const status = await repo.fileStatus(uri.fsPath);

            if (status.locked) {
                return {
                    badge: '🔒',
                    tooltip: `Locked by ${status.lockedBy}`,
                    color: new vscode.ThemeColor('gitDecoration.ignoredResourceForeground')
                };
            }

            if (status.modified) {
                return {
                    badge: 'M',
                    color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')
                };
            }

            if (status.added) {
                return {
                    badge: 'A',
                    color: new vscode.ThemeColor('gitDecoration.addedResourceForeground')
                };
            }
        } catch {
            return undefined;
        }
    }
}

export function deactivate() {}
```

---

## Custom Storage Backend

```rust
use async_trait::async_trait;
use dits_sdk::storage::{StorageBackend, ChunkInfo, StorageResult};

pub struct CustomStorageBackend {
    config: CustomConfig,
    client: CustomClient,
}

#[async_trait]
impl StorageBackend for CustomStorageBackend {
    /// Check if chunk exists
    async fn has_chunk(&self, hash: &str) -> StorageResult<bool> {
        self.client.exists(&self.chunk_key(hash)).await
    }

    /// Get chunk data
    async fn get_chunk(&self, hash: &str) -> StorageResult<Vec<u8>> {
        self.client.get(&self.chunk_key(hash)).await
    }

    /// Store chunk
    async fn put_chunk(&self, hash: &str, data: &[u8]) -> StorageResult<()> {
        self.client.put(&self.chunk_key(hash), data).await
    }

    /// Delete chunk
    async fn delete_chunk(&self, hash: &str) -> StorageResult<()> {
        self.client.delete(&self.chunk_key(hash)).await
    }

    /// List chunks by prefix
    async fn list_chunks(&self, prefix: &str) -> StorageResult<Vec<ChunkInfo>> {
        let objects = self.client.list(&format!("chunks/{}", prefix)).await?;
        Ok(objects.into_iter().map(|o| ChunkInfo {
            hash: o.key.rsplit('/').next().unwrap().to_string(),
            size: o.size,
            created_at: o.created,
        }).collect())
    }

    /// Get presigned upload URL
    async fn create_upload_url(
        &self,
        hash: &str,
        expires_in: Duration,
    ) -> StorageResult<String> {
        self.client.presign_put(&self.chunk_key(hash), expires_in).await
    }

    /// Get presigned download URL
    async fn create_download_url(
        &self,
        hash: &str,
        expires_in: Duration,
    ) -> StorageResult<String> {
        self.client.presign_get(&self.chunk_key(hash), expires_in).await
    }
}

impl CustomStorageBackend {
    fn chunk_key(&self, hash: &str) -> String {
        format!("v1/chunks/{}/{}/{}", &hash[0..2], &hash[2..4], hash)
    }
}

// Registration
fn main() {
    dits_sdk::register_storage_backend("custom", |config| {
        Box::new(CustomStorageBackend::new(config))
    });
}
```

---

## Webhook Integration

```rust
use dits_sdk::webhooks::{WebhookHandler, WebhookEvent, WebhookResponse};

pub struct MyWebhookHandler;

#[async_trait]
impl WebhookHandler for MyWebhookHandler {
    async fn handle(&self, event: WebhookEvent) -> WebhookResponse {
        match event {
            WebhookEvent::Push { repo, commits, pusher } => {
                println!("Push to {}: {} commits by {}", repo, commits.len(), pusher);

                // Trigger CI/CD
                trigger_build(&repo, &commits).await;

                WebhookResponse::ok()
            }

            WebhookEvent::Lock { repo, path, user, action } => {
                match action {
                    LockAction::Locked => {
                        notify_team(&format!("{} locked {}", user, path)).await;
                    }
                    LockAction::Unlocked => {
                        notify_team(&format!("{} unlocked {}", user, path)).await;
                    }
                }
                WebhookResponse::ok()
            }

            WebhookEvent::Comment { repo, commit, author, body } => {
                // Post to Slack
                post_to_slack(&format!(
                    "{} commented on {}: {}",
                    author, commit, body
                )).await;

                WebhookResponse::ok()
            }

            _ => WebhookResponse::ok()
        }
    }

    fn verify_signature(&self, payload: &[u8], signature: &str) -> bool {
        let expected = hmac_sha256(payload, self.secret.as_bytes());
        constant_time_compare(&expected, signature)
    }
}
```

---

## Testing Plugins

```rust
use dits_sdk::testing::{MockClient, MockRepository};

#[tokio::test]
async fn test_plugin_push() {
    // Create mock client
    let client = MockClient::new()
        .with_repository("test/repo", MockRepository::new()
            .with_branch("main")
            .with_file("video.mp4", b"fake video content")
        );

    // Initialize plugin with mock
    let plugin = MyPlugin::new(client);

    // Trigger push
    let result = plugin.push().await.unwrap();

    // Verify behavior
    assert_eq!(result.chunks_uploaded, 1);
    assert!(client.was_called("push"));
}

#[tokio::test]
async fn test_plugin_handles_errors() {
    let client = MockClient::new()
        .with_error("push", Error::NetworkError);

    let plugin = MyPlugin::new(client);

    let result = plugin.push().await;

    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), PluginError::NetworkError));
}
```

---

## Distribution

### Publishing NLE Plugins

**Adobe Exchange:**
```bash
# Package for Adobe Exchange
dits-plugin package premiere \
    --manifest manifest.json \
    --out dits-premiere.zxp

# Sign with Adobe certificate
dits-plugin sign dits-premiere.zxp \
    --cert certificate.p12 \
    --password $CERT_PASSWORD
```

**Direct Distribution:**
```bash
# Build installer
dits-plugin installer \
    --platform windows \
    --out DitsPremiereSetup.exe

dits-plugin installer \
    --platform macos \
    --out DitsPremiereInstaller.pkg
```

### Publishing VS Code Extension

```bash
# Package extension
vsce package

# Publish to marketplace
vsce publish
```

---

## Notes

- All SDKs use semantic versioning
- Breaking changes require major version bump
- Beta features marked with `@beta` decorator
- Deprecations announced one major version in advance
- Full API reference at docs.dits.io/sdk
