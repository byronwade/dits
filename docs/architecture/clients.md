# Multi-Platform Client Strategy

**Project:** Dits (Data-Intensive Version Control System)
**Document:** Mobile, Web, and Desktop Client Architecture
**Objective:** Define client strategy across platforms to enable ubiquitous access to Dits repositories.

---

## Client Matrix

| Platform | Primary Use Case | Implementation | Priority |
| :--- | :--- | :--- | :--- |
| Desktop CLI | Power users, automation | Rust native | P0 (v1.0) |
| Desktop GUI | Casual users | Tauri (Rust + Web) | P1 (v1.2) |
| Web App | Review, browse, manage | SPA (React/Vue) | P1 (v1.2) |
| Mobile (iOS) | Review, approve, browse | Swift native | P2 (v2.0) |
| Mobile (Android) | Review, approve, browse | Kotlin native | P2 (v2.0) |
| IDE Extensions | Developer integration | VS Code, JetBrains | P3 (v2.x) |
| NLE Plugins | Editor integration | C++/Rust | P3 (v2.x) |

---

## Desktop Clients

### CLI Client (v1.0 - Current)

Full-featured command-line interface for power users.

```
Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                     CLI CLIENT (dits)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  CLI Layer  │   │  VFS Layer  │   │ Config Layer│           │
│  │   (clap)    │   │   (fuser)   │   │   (toml)    │           │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │  Core Library │                                  │
│              │  (dits-core)  │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│    ┌─────────┬───────┼───────┬─────────┐                       │
│    │         │       │       │         │                       │
│  ┌─▼──┐   ┌──▼─┐  ┌──▼──┐  ┌─▼──┐   ┌──▼─┐                    │
│  │Parse│   │Chunk│  │Index│  │Net │   │Auth│                    │
│  │ rs  │   │ rs  │  │(sled)│  │QUIC│   │    │                    │
│  └────┘   └────┘  └─────┘  └────┘   └────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Full repository operations
- Virtual filesystem mount
- Background daemon mode
- Scriptable for automation

---

### Desktop GUI (v1.2)

Visual interface for users who prefer GUIs.

**Technology: Tauri**
- Rust backend (shares code with CLI)
- Web frontend (React/Vue/Svelte)
- Native performance, small binary (~10MB)
- Cross-platform (macOS, Windows, Linux)

```
Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                    DESKTOP GUI (Tauri)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Web Frontend (React)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ File     │ │ History  │ │ Review   │ │ Settings │     │  │
│  │  │ Browser  │ │ View     │ │ Player   │ │          │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ IPC (JSON-RPC)                       │
│  ┌────────────────────────▼──────────────────────────────────┐  │
│  │                    Rust Backend                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ Tauri        │  │ dits-core    │  │ Native APIs  │    │  │
│  │  │ Commands     │  │ (shared)     │  │ (FS, Notify) │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**GUI Features:**
- Visual file browser with thumbnails
- Commit history timeline
- Inline video preview/playback
- Drag-and-drop staging
- Visual diff (side-by-side video)
- Settings with validation
- System tray for background sync

**Tauri Commands (IPC):**
```rust
#[tauri::command]
async fn get_status(state: State<'_, AppState>) -> Result<RepoStatus, String> {
    let repo = state.repo.lock().await;
    repo.status().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn commit(message: String, state: State<'_, AppState>) -> Result<CommitHash, String> {
    let repo = state.repo.lock().await;
    repo.commit(&message).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_thumbnail(asset_hash: String, state: State<'_, AppState>) -> Result<String, String> {
    // Returns base64-encoded thumbnail
    let repo = state.repo.lock().await;
    repo.get_thumbnail(&asset_hash).await
        .map(|bytes| base64::encode(bytes))
        .map_err(|e| e.to_string())
}
```

**Frontend Components (React):**
```tsx
// File Browser Component
function FileBrowser({ path, onSelect }: FileBrowserProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    invoke('list_files', { path }).then(setFiles);
  }, [path]);

  return (
    <div className="file-browser">
      {files.map(file => (
        <FileEntry
          key={file.path}
          file={file}
          onClick={() => onSelect(file)}
        />
      ))}
    </div>
  );
}

// Video Preview Component
function VideoPreview({ assetHash }: VideoPreviewProps) {
  const [proxyUrl, setProxyUrl] = useState<string>();

  useEffect(() => {
    invoke('get_proxy_url', { assetHash }).then(setProxyUrl);
  }, [assetHash]);

  return (
    <video
      src={proxyUrl}
      controls
      className="video-preview"
    />
  );
}
```

---

## Web Application (v1.2)

Browser-based interface for review, management, and light operations.

**Use Cases:**
- Repository browsing
- Video review and comments
- Team management
- Settings and billing
- Approve/reject workflows

**NOT for Web:**
- Heavy editing (use desktop)
- Chunk upload (use desktop)
- VFS mount (desktop only)

```
Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                       WEB APPLICATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (SPA)                     Backend (API)               │
│  ┌───────────────────────┐         ┌───────────────────────┐   │
│  │ React + TypeScript    │  REST/  │ Existing Dits Server  │   │
│  │                       │◀───────▶│ (Axum)                │   │
│  │ - Repository browser  │  WS     │                       │   │
│  │ - Video player        │         │ - /api/v1/repos       │   │
│  │ - Comment system      │         │ - /api/v1/commits     │   │
│  │ - User management     │         │ - /api/v1/assets      │   │
│  │ - Approval workflows  │         │ - /api/v1/review      │   │
│  └───────────────────────┘         └───────────────────────┘   │
│                                              │                   │
│                                              ▼                   │
│                                    ┌───────────────────────┐   │
│                                    │  Object Storage (S3)  │   │
│                                    │  - Signed URLs        │   │
│                                    │  - Direct streaming   │   │
│                                    └───────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Web Features:**

1. **Repository Browser**
```tsx
function RepositoryBrowser() {
  const { repoId } = useParams();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<Asset>();

  return (
    <div className="repo-browser">
      <Sidebar>
        <FileTree
          tree={tree}
          onSelect={setSelectedFile}
        />
      </Sidebar>
      <MainPanel>
        {selectedFile && (
          <AssetViewer asset={selectedFile} />
        )}
      </MainPanel>
    </div>
  );
}
```

2. **Video Review with Comments**
```tsx
function VideoReview({ asset }: VideoReviewProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addComment = async (text: string) => {
    const comment = await api.addComment({
      assetId: asset.id,
      timecode: currentTime,
      text,
    });
    setComments([...comments, comment]);
  };

  return (
    <div className="video-review">
      <VideoPlayer
        ref={videoRef}
        src={asset.proxyUrl}
        onTimeUpdate={setCurrentTime}
      />
      <Timeline
        duration={asset.duration}
        comments={comments}
        onSeek={(t) => videoRef.current?.seekTo(t)}
      />
      <CommentPanel
        comments={comments.filter(c => c.timecode === currentTime)}
        onAdd={addComment}
      />
    </div>
  );
}
```

3. **Approval Workflow**
```tsx
function ApprovalQueue() {
  const [pending, setPending] = useState<ReviewItem[]>([]);

  const approve = async (item: ReviewItem) => {
    await api.approve(item.id);
    setPending(pending.filter(p => p.id !== item.id));
  };

  const requestChanges = async (item: ReviewItem, notes: string) => {
    await api.requestChanges(item.id, notes);
    setPending(pending.filter(p => p.id !== item.id));
  };

  return (
    <div className="approval-queue">
      {pending.map(item => (
        <ReviewCard key={item.id} item={item}>
          <Button onClick={() => approve(item)}>Approve</Button>
          <Button onClick={() => openRequestChanges(item)}>
            Request Changes
          </Button>
        </ReviewCard>
      ))}
    </div>
  );
}
```

**API Endpoints for Web:**
```rust
// Asset streaming via signed URLs
#[axum::handler]
async fn get_asset_stream_url(
    Path((repo_id, asset_hash)): Path<(Uuid, String)>,
    auth: Auth,
) -> Result<Json<StreamUrl>, ApiError> {
    // Check permissions
    auth.require_permission(repo_id, Permission::AssetRead)?;

    // Generate signed URL valid for 1 hour
    let url = s3.generate_presigned_url(
        &format!("v1/objects/{}", asset_hash),
        Duration::hours(1),
    ).await?;

    Ok(Json(StreamUrl { url }))
}

// Frame-accurate comments
#[axum::handler]
async fn add_comment(
    Path((repo_id, asset_id)): Path<(Uuid, Uuid)>,
    auth: Auth,
    Json(payload): Json<AddCommentRequest>,
) -> Result<Json<Comment>, ApiError> {
    auth.require_permission(repo_id, Permission::RepoWrite)?;

    let comment = Comment {
        id: Uuid::new_v4(),
        asset_id,
        author_id: auth.user_id,
        timecode_ms: payload.timecode_ms,
        text: payload.text,
        created_at: Utc::now(),
        resolved: false,
    };

    db.insert_comment(&comment).await?;

    // Notify asset owner
    notify.send(Notification::NewComment {
        comment: comment.clone(),
    }).await;

    Ok(Json(comment))
}
```

---

## Mobile Applications (v2.0)

### iOS App (Swift)

**Use Cases:**
- Browse repositories
- Watch videos (proxy quality)
- Review and comment
- Approve/reject
- Notifications
- Quick status checks

**NOT for Mobile:**
- Heavy uploads
- Editing
- VFS

```swift
// Architecture: Clean Architecture + SwiftUI

// Domain Layer
protocol DitsRepository {
    func getRepos() async throws -> [Repo]
    func getAsset(_ id: AssetId) async throws -> Asset
    func addComment(_ comment: Comment) async throws -> Comment
}

// Data Layer
class DitsAPIRepository: DitsRepository {
    private let api: DitsAPI
    private let cache: DitsCache

    func getAsset(_ id: AssetId) async throws -> Asset {
        // Check cache first
        if let cached = cache.asset(id), !cached.isStale {
            return cached.asset
        }

        // Fetch from API
        let asset = try await api.getAsset(id)
        cache.store(asset)
        return asset
    }
}

// Presentation Layer
struct AssetDetailView: View {
    let asset: Asset
    @State private var isPlaying = false
    @StateObject private var viewModel: AssetDetailViewModel

    var body: some View {
        VStack {
            // Video player (proxy quality)
            VideoPlayer(url: asset.proxyUrl)
                .aspectRatio(16/9, contentMode: .fit)

            // Comments timeline
            CommentTimelineView(
                comments: viewModel.comments,
                onSeek: { timecode in
                    // Seek video to comment timecode
                }
            )

            // Add comment
            CommentInputView(
                onSubmit: { text in
                    viewModel.addComment(text)
                }
            )
        }
        .navigationTitle(asset.name)
    }
}

// Background sync
class SyncManager {
    func startBackgroundSync() {
        // iOS Background Tasks API
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.dits.sync",
            using: nil
        ) { task in
            self.handleSync(task as! BGAppRefreshTask)
        }
    }

    private func handleSync(_ task: BGAppRefreshTask) {
        Task {
            do {
                try await repository.syncMetadata()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }
    }
}
```

### Android App (Kotlin)

```kotlin
// Architecture: MVVM + Jetpack Compose

// Repository
class DitsRepository @Inject constructor(
    private val api: DitsApi,
    private val db: DitsDatabase,
) {
    fun getRepos(): Flow<List<Repo>> = flow {
        // Emit cached data first
        emit(db.repoDao().getAll())

        // Fetch fresh data
        val fresh = api.getRepos()
        db.repoDao().insertAll(fresh)
        emit(fresh)
    }

    suspend fun getAsset(id: String): Asset {
        return db.assetDao().get(id)
            ?: api.getAsset(id).also { db.assetDao().insert(it) }
    }
}

// ViewModel
@HiltViewModel
class AssetDetailViewModel @Inject constructor(
    private val repository: DitsRepository,
) : ViewModel() {

    private val _asset = MutableStateFlow<Asset?>(null)
    val asset: StateFlow<Asset?> = _asset.asStateFlow()

    private val _comments = MutableStateFlow<List<Comment>>(emptyList())
    val comments: StateFlow<List<Comment>> = _comments.asStateFlow()

    fun loadAsset(id: String) {
        viewModelScope.launch {
            _asset.value = repository.getAsset(id)
            _comments.value = repository.getComments(id)
        }
    }

    fun addComment(text: String, timecodeMs: Long) {
        viewModelScope.launch {
            val comment = repository.addComment(
                assetId = _asset.value!!.id,
                text = text,
                timecodeMs = timecodeMs,
            )
            _comments.value = _comments.value + comment
        }
    }
}

// UI (Jetpack Compose)
@Composable
fun AssetDetailScreen(
    assetId: String,
    viewModel: AssetDetailViewModel = hiltViewModel(),
) {
    val asset by viewModel.asset.collectAsState()
    val comments by viewModel.comments.collectAsState()

    LaunchedEffect(assetId) {
        viewModel.loadAsset(assetId)
    }

    Column {
        // Video player
        asset?.let {
            VideoPlayer(
                url = it.proxyUrl,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
            )
        }

        // Comments
        LazyColumn {
            items(comments) { comment ->
                CommentRow(comment)
            }
        }

        // Add comment input
        CommentInput(
            onSubmit = { text, timecode ->
                viewModel.addComment(text, timecode)
            }
        )
    }
}
```

### Mobile Feature Parity

| Feature | iOS | Android | Notes |
| :--- | :---: | :---: | :--- |
| Browse repos | Yes | Yes | Full feature |
| View files | Yes | Yes | Thumbnails + metadata |
| Play video | Yes | Yes | Proxy only |
| Add comments | Yes | Yes | Frame-accurate |
| View comments | Yes | Yes | Full feature |
| Approve/reject | Yes | Yes | Workflow support |
| Push notifications | Yes | Yes | FCM/APNs |
| Offline viewing | Yes | Yes | Cached proxies |
| Upload | Limited | Limited | Small files only |
| Download | Limited | Limited | Proxy only |

---

## IDE Extensions (v2.x)

### VS Code Extension

For developers working with Dits in their workflow.

```typescript
// extension.ts
import * as vscode from 'vscode';
import { DitsClient } from './dits-client';

export function activate(context: vscode.ExtensionContext) {
    const dits = new DitsClient();

    // Status bar
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left
    );
    statusBar.text = "$(git-branch) dits";
    statusBar.show();

    // File decorations
    const decorationProvider = new DitsDecorationProvider(dits);
    vscode.window.registerFileDecorationProvider(decorationProvider);

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('dits.commit', async () => {
            const message = await vscode.window.showInputBox({
                prompt: 'Commit message',
            });
            if (message) {
                await dits.commit(message);
                vscode.window.showInformationMessage('Committed!');
            }
        }),

        vscode.commands.registerCommand('dits.push', async () => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Pushing to remote...',
            }, async (progress) => {
                await dits.push((percent) => {
                    progress.report({ increment: percent });
                });
            });
        }),

        vscode.commands.registerCommand('dits.lock', async (uri: vscode.Uri) => {
            await dits.lock(uri.fsPath);
            decorationProvider.refresh();
        }),
    );

    // Source control provider
    const scm = vscode.scm.createSourceControl('dits', 'Dits');
    const changes = scm.createResourceGroup('changes', 'Changes');

    // Watch for file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(() => refreshStatus());
    watcher.onDidCreate(() => refreshStatus());
    watcher.onDidDelete(() => refreshStatus());
}

class DitsDecorationProvider implements vscode.FileDecorationProvider {
    private dits: DitsClient;
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri>();

    get onDidChangeFileDecorations() {
        return this._onDidChangeFileDecorations.event;
    }

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        const status = this.dits.getFileStatus(uri.fsPath);

        if (status?.locked) {
            return {
                badge: '🔒',
                tooltip: `Locked by ${status.lockedBy}`,
            };
        }

        if (status?.modified) {
            return {
                badge: 'M',
                color: new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'),
            };
        }

        return undefined;
    }
}
```

### JetBrains Plugin

```kotlin
// DitsToolWindow.kt
class DitsToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val ditsPanel = DitsPanel(project)
        val content = ContentFactory.getInstance().createContent(ditsPanel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}

class DitsPanel(private val project: Project) : JPanel() {
    private val dits = DitsService.getInstance(project)

    init {
        layout = BorderLayout()

        // Status panel
        add(StatusPanel(dits), BorderLayout.NORTH)

        // File list
        add(JBScrollPane(FileListPanel(dits)), BorderLayout.CENTER)

        // Actions
        add(ActionsPanel(dits), BorderLayout.SOUTH)
    }
}

// DitsService.kt
@Service(Service.Level.PROJECT)
class DitsService(private val project: Project) {
    private val cli = DitsCli(project.basePath!!)

    fun getStatus(): DitsStatus = cli.status()

    fun commit(message: String) {
        cli.commit(message)
        project.messageBus.syncPublisher(DitsEvents.COMMITTED).onCommit()
    }

    fun push() {
        ApplicationManager.getApplication().executeOnPooledThread {
            cli.push()
            project.messageBus.syncPublisher(DitsEvents.PUSHED).onPush()
        }
    }
}
```

---

## NLE Plugins (v2.x)

### Premiere Pro Extension (CEP/UXP)

```javascript
// main.jsx (ExtendScript)
function ditsCommit(message) {
    var result = runDitsCli(['commit', '-m', message]);
    return result;
}

function ditsStatus() {
    var result = runDitsCli(['status', '--json']);
    return JSON.parse(result);
}

function runDitsCli(args) {
    var projectPath = app.project.path;
    var cmd = 'dits -C "' + projectPath + '" ' + args.join(' ');
    return system.callSystem(cmd);
}

// Panel UI (index.html + panel.js)
class DitsPanel {
    constructor() {
        this.statusDiv = document.getElementById('status');
        this.refreshStatus();
    }

    async refreshStatus() {
        const status = await csInterface.evalScript('ditsStatus()');
        this.renderStatus(JSON.parse(status));
    }

    async commit() {
        const message = document.getElementById('message').value;
        await csInterface.evalScript(`ditsCommit("${message}")`);
        this.refreshStatus();
    }
}
```

### DaVinci Resolve Integration

```lua
-- dits_resolve.lua
local dits = {}

function dits.commit(message)
    local project = resolve:GetProjectManager():GetCurrentProject()
    local path = project:GetRenderSettings()['TargetDir']

    os.execute('dits -C "' .. path .. '" commit -m "' .. message .. '"')
end

function dits.status()
    local project = resolve:GetProjectManager():GetCurrentProject()
    local path = project:GetRenderSettings()['TargetDir']

    local handle = io.popen('dits -C "' .. path .. '" status --json')
    local result = handle:read("*a")
    handle:close()

    return json.decode(result)
end

-- Register menu item
resolve:AddMenuItem({
    Label = "Dits: Commit",
    Callback = function()
        local message = fu:AskUser("Commit Message", {})
        if message then
            dits.commit(message)
        end
    end
})

return dits
```

---

## Client Sync Architecture

### Offline Support Strategy

```rust
pub struct OfflineManager {
    local_db: sled::Db,
    sync_queue: VecDeque<SyncOperation>,
}

#[derive(Serialize, Deserialize)]
pub enum SyncOperation {
    // Queued operations for when back online
    Commit { message: String, staged: Vec<StagedFile> },
    AddComment { asset_id: Uuid, timecode: i64, text: String },
    Lock { path: String },
    Unlock { path: String },
}

impl OfflineManager {
    pub async fn queue_operation(&mut self, op: SyncOperation) {
        self.sync_queue.push_back(op);
        self.persist_queue().await;
    }

    pub async fn sync_when_online(&mut self, api: &DitsApi) -> Result<()> {
        while let Some(op) = self.sync_queue.pop_front() {
            match self.execute_operation(op, api).await {
                Ok(_) => self.persist_queue().await,
                Err(e) => {
                    // Re-queue on failure
                    self.sync_queue.push_front(op);
                    return Err(e);
                }
            }
        }
        Ok(())
    }
}
```

### Real-time Sync (WebSocket)

```typescript
// Client-side WebSocket handler
class DitsSyncClient {
    private ws: WebSocket;
    private handlers: Map<string, Function>;

    connect(repoId: string) {
        this.ws = new WebSocket(`wss://api.dits.dev/ws/repos/${repoId}`);

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
    }

    private handleMessage(message: SyncMessage) {
        switch (message.type) {
            case 'commit':
                this.emit('commit', message.data);
                break;
            case 'lock':
                this.emit('lock', message.data);
                break;
            case 'unlock':
                this.emit('unlock', message.data);
                break;
            case 'comment':
                this.emit('comment', message.data);
                break;
        }
    }

    on(event: string, handler: Function) {
        this.handlers.set(event, handler);
    }

    private emit(event: string, data: any) {
        this.handlers.get(event)?.(data);
    }
}

// Usage
const sync = new DitsSyncClient();
sync.connect(repoId);

sync.on('lock', (data) => {
    showNotification(`${data.user} locked ${data.file}`);
    refreshFileStatus();
});

sync.on('commit', (data) => {
    showNotification(`New commit: ${data.message}`);
    refreshHistory();
});
```

---

## Summary: Client Roadmap

| Version | Clients | Key Features |
| :--- | :--- | :--- |
| v1.0 | CLI | Full functionality, VFS mount |
| v1.2 | CLI + Desktop GUI + Web | Visual interface, browser access |
| v2.0 | + iOS + Android | Mobile review and approval |
| v2.x | + IDE + NLE plugins | Deep integration |

Each client shares:
- Common API contract
- Consistent data models
- Offline-first where appropriate
- Real-time sync via WebSocket
