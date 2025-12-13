# Go SDK Guide

Complete guide to using the Dits Go SDK.

---

## Installation

```bash
go get github.com/dits-io/dits-go
```

**Requirements**: Go 1.21+

---

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/dits-io/dits-go"
)

func main() {
    ctx := context.Background()

    // Initialize client from environment
    client, err := dits.NewClientFromEnv()
    if err != nil {
        log.Fatal(err)
    }

    // Clone a repository
    repo, err := client.Clone(ctx, "myorg/project", "./project")
    if err != nil {
        log.Fatal(err)
    }

    // Check status
    status, err := repo.Status(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Modified files: %v\n", status.Modified)

    // Pull latest changes
    if err := repo.Pull(ctx); err != nil {
        log.Fatal(err)
    }
}
```

---

## Client Configuration

### From Environment

```go
import "github.com/dits-io/dits-go"

// Reads DITS_TOKEN and DITS_ENDPOINT from environment
client, err := dits.NewClientFromEnv()
```

### Direct Configuration

```go
import (
    "time"
    "github.com/dits-io/dits-go"
)

client, err := dits.NewClient(
    dits.WithEndpoint("https://api.dits.io"),
    dits.WithToken("dits_token_xxx"),
    dits.WithTimeout(30*time.Second),
    dits.WithMaxConnections(8),
    dits.WithRetry(dits.RetryConfig{
        MaxRetries:   3,
        InitialDelay: time.Second,
        MaxDelay:     30 * time.Second,
    }),
    dits.WithCacheDir("~/.cache/dits"),
)
```

### Configuration Options

```go
type ClientConfig struct {
    // API endpoint URL
    Endpoint string

    // Authentication token
    Token string

    // API key (alternative to token)
    APIKey string

    // Request timeout
    Timeout time.Duration

    // Maximum concurrent connections
    MaxConnections int

    // Retry configuration
    Retry RetryConfig

    // Local cache directory
    CacheDir string

    // HTTP proxy URL
    Proxy string

    // Custom CA certificate path
    CACert string

    // Enable debug logging
    Debug bool

    // Custom HTTP client
    HTTPClient *http.Client
}

type RetryConfig struct {
    MaxRetries   int
    InitialDelay time.Duration
    MaxDelay     time.Duration
    Multiplier   float64
}
```

---

## Authentication

### Token Authentication

```go
import "os"

// From environment variable
client, err := dits.NewClient(
    dits.WithToken(os.Getenv("DITS_TOKEN")),
)

// Direct token
client, err := dits.NewClient(
    dits.WithToken("dits_token_xxx"),
)
```

### OAuth Flow

```go
import "github.com/dits-io/dits-go/auth"

// Start OAuth flow
flow := auth.NewOAuthFlow(auth.ProviderGitHub)
authURL := flow.AuthorizationURL()

fmt.Printf("Open in browser: %s\n", authURL)

// After user authorizes
token, err := flow.ExchangeCode(ctx, code)
if err != nil {
    log.Fatal(err)
}

client, err := dits.NewClient(
    dits.WithToken(token.AccessToken),
)
```

### API Key

```go
client, err := dits.NewClient(
    dits.WithAPIKey("dits_api_xxx"),
)
```

---

## Repository Operations

### Clone

```go
// Simple clone
repo, err := client.Clone(ctx, "myorg/project", "./local-path")

// Clone with options
repo, err := client.CloneWithOptions(ctx, "myorg/project", "./local-path", dits.CloneOptions{
    Branch: "develop",
    Depth:  0,
    Sparse: false,
})

// Sparse clone
repo, err := client.CloneWithOptions(ctx, "myorg/project", "./local-path", dits.CloneOptions{
    Sparse: true,
})
repo.SparseAdd(ctx, []string{"*.prproj", "Media/**/*.mov"})
repo.Checkout(ctx)
```

### Open Existing

```go
// Open repository at path
repo, err := dits.OpenRepository("./project")

// Or from client
repo, err := client.OpenRepository("./project")
```

### Create New

```go
// Initialize new repository
repo, err := dits.InitRepository("./new-project")

// Add remote
err = repo.RemoteAdd(ctx, "origin", "https://dits.io/myorg/new-project")
```

### Repository Info

```go
info, err := repo.Info(ctx)
fmt.Printf("Name: %s\n", info.Name)
fmt.Printf("Size: %d bytes\n", info.Size)
fmt.Printf("Commits: %d\n", info.CommitCount)
fmt.Printf("Default branch: %s\n", info.DefaultBranch)
```

---

## File Operations

### Status

```go
status, err := repo.Status(ctx)

if status.IsClean() {
    fmt.Println("Working directory clean")
} else {
    fmt.Printf("Modified: %v\n", status.Modified)
    fmt.Printf("Added: %v\n", status.Added)
    fmt.Printf("Deleted: %v\n", status.Deleted)
    fmt.Printf("Untracked: %v\n", status.Untracked)
}
```

### Add Files

```go
// Add specific files
err := repo.Add(ctx, []string{"video.mov", "project.prproj"})

// Add all changes
err := repo.Add(ctx, []string{"."})

// Add with options
err := repo.AddWithOptions(ctx, []string{"*.mov"}, dits.AddOptions{
    Force:   false,
    Chunker: dits.ChunkerVideoAware,
})
```

### Remove Files

```go
// Remove from index
err := repo.Remove(ctx, []string{"old-file.mov"})

// Remove from disk too
err := repo.RemoveWithOptions(ctx, []string{"old-file.mov"}, dits.RemoveOptions{
    FromDisk: true,
    Force:    false,
})
```

### Read File Content

```go
// Read file at HEAD
content, err := repo.ReadFile(ctx, "README.md", nil)

// Read file at specific commit
content, err := repo.ReadFile(ctx, "README.md", &dits.ReadOptions{
    Commit: "abc123",
})

// Read as bytes
data, err := repo.ReadFileBytes(ctx, "video.mov", nil)

// Stream large file
reader, err := repo.StreamFile(ctx, "large-video.mov", nil)
defer reader.Close()

buf := make([]byte, 1024*1024) // 1MB buffer
for {
    n, err := reader.Read(buf)
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    processChunk(buf[:n])
}
```

### List Files

```go
// List all files
files, err := repo.ListFiles(ctx, "/", nil)

// List files at specific commit
files, err := repo.ListFiles(ctx, "/Media", &dits.ListOptions{
    Commit: "abc123",
})

for _, file := range files {
    fmt.Printf("%s: %d bytes\n", file.Path, file.Size)
}
```

---

## Commit Operations

### Create Commit

```go
// Simple commit
err := repo.Commit(ctx, "Add new video assets")

// Commit with options
err := repo.CommitWithOptions(ctx, dits.CommitOptions{
    Message: "Add new video assets",
    Author: &dits.Author{
        Name:  "John Doe",
        Email: "john@example.com",
    },
    Sign: true,
})
```

### View Commits

```go
// Get commit history
commits, err := repo.Log(ctx, dits.LogOptions{
    Limit: 10,
})

for _, commit := range commits {
    fmt.Printf("%s: %s by %s\n",
        commit.Hash[:8],
        commit.Message,
        commit.Author.Name,
    )
}

// Get specific commit
commit, err := repo.GetCommit(ctx, "abc123def456")

// Get commits for a file
commits, err := repo.Log(ctx, dits.LogOptions{
    Path: "video.mov",
})
```

### Diff

```go
// Diff working directory
diff, err := repo.Diff(ctx, nil)

// Diff between commits
diff, err := repo.Diff(ctx, &dits.DiffOptions{
    From: "abc123",
    To:   "def456",
})

// Diff specific path
diff, err := repo.Diff(ctx, &dits.DiffOptions{
    Paths: []string{"src/"},
})

for _, fileDiff := range diff.Files {
    fmt.Printf("File: %s\n", fileDiff.Path)
    fmt.Printf("  Added: %d lines\n", fileDiff.Additions)
    fmt.Printf("  Removed: %d lines\n", fileDiff.Deletions)
}
```

---

## Branch Operations

### List Branches

```go
branches, err := repo.Branches(ctx)

for _, branch := range branches {
    marker := " "
    if branch.IsCurrent {
        marker = "*"
    }
    fmt.Printf("%s %s\n", marker, branch.Name)
}
```

### Create Branch

```go
// Create from HEAD
err := repo.CreateBranch(ctx, "feature/new-ui")

// Create from specific commit
err := repo.CreateBranchFrom(ctx, "feature/new-ui", "abc123")
```

### Switch Branch

```go
err := repo.Checkout(ctx, "feature/new-ui")

// Create and switch
err := repo.CheckoutNew(ctx, "feature/another")
```

### Delete Branch

```go
// Delete local branch
err := repo.DeleteBranch(ctx, "feature/old")

// Force delete
err := repo.DeleteBranchForce(ctx, "feature/old")
```

### Merge

```go
result, err := repo.Merge(ctx, "feature/new-ui")

switch result.Status {
case dits.MergeFastForward:
    fmt.Println("Fast-forward merge")
case dits.MergeMerged:
    fmt.Printf("Merge commit: %s\n", result.Commit)
case dits.MergeConflict:
    fmt.Printf("Conflicts in: %v\n", result.ConflictingFiles)
    // Resolve conflicts...
    repo.ResolveAll(ctx)
    repo.MergeContinue(ctx)
}
```

---

## Remote Operations

### Push

```go
// Simple push
err := repo.Push(ctx)

// Push with options and progress
result, err := repo.PushWithOptions(ctx, dits.PushOptions{
    Remote: "origin",
    Branch: "",  // Current branch
    Force:  false,
    OnProgress: func(p dits.Progress) {
        fmt.Printf("\rProgress: %.1f%%", p.Percentage())
    },
})

fmt.Printf("\nPushed %d chunks\n", result.ChunksUploaded)
```

### Pull

```go
// Simple pull
err := repo.Pull(ctx)

// Pull with options
result, err := repo.PullWithOptions(ctx, dits.PullOptions{
    Remote: "origin",
    Rebase: false,
    OnProgress: func(p dits.Progress) {
        fmt.Printf("\rDownloading: %d/%d chunks", p.Downloaded, p.Total)
    },
})
```

### Fetch

```go
// Fetch all
err := repo.Fetch(ctx)

// Fetch specific remote
err := repo.FetchRemote(ctx, "upstream")
```

---

## Lock Operations

### Acquire Lock

```go
// Lock a file
lock, err := repo.Lock(ctx, "project.prproj")
fmt.Printf("Lock acquired, expires at: %v\n", lock.ExpiresAt)

// Lock with custom duration
lock, err := repo.LockWithOptions(ctx, "project.prproj", dits.LockOptions{
    Duration: 8 * time.Hour,
    Reason:   "Editing timeline",
})
```

### Release Lock

```go
// Release lock
err := repo.Unlock(ctx, "project.prproj")

// Force release (admin only)
err := repo.UnlockForce(ctx, "project.prproj")
```

### Check Locks

```go
// List all locks
locks, err := repo.Locks(ctx)

for _, lock := range locks {
    fmt.Printf("%s: locked by %s until %v\n",
        lock.Path,
        lock.Owner.Name,
        lock.ExpiresAt,
    )
}

// Check specific file
lock, err := repo.GetLock(ctx, "project.prproj")
if lock != nil {
    fmt.Printf("Locked by: %s\n", lock.Owner.Name)
}
```

---

## Error Handling

### Error Types

```go
import "github.com/dits-io/dits-go/errors"

err := repo.Push(ctx)
if err != nil {
    switch e := err.(type) {
    case *errors.AuthenticationError:
        fmt.Println("Auth failed, please login")
    case *errors.NotFoundError:
        fmt.Println("Repository not found")
    case *errors.ConflictError:
        fmt.Printf("Conflict: %v\n", e)
    case *errors.RateLimitError:
        fmt.Printf("Rate limited, retry after %v\n", e.RetryAfter)
    case *errors.NetworkError:
        fmt.Printf("Network error: %v\n", e)
    case *errors.DitsError:
        fmt.Printf("Error %s: %s\n", e.Code, e.Message)
        if e.RequestID != "" {
            fmt.Printf("Request ID: %s\n", e.RequestID)
        }
    default:
        fmt.Printf("Unknown error: %v\n", err)
    }
}
```

### Retry Logic

```go
import "github.com/dits-io/dits-go/retry"

err := retry.Do(ctx, func() error {
    return repo.Push(ctx)
}, retry.Config{
    MaxAttempts: 3,
    Backoff:     retry.ExponentialBackoff(time.Second, 30*time.Second),
    OnRetry: func(attempt int, err error) {
        fmt.Printf("Retry %d: %v\n", attempt, err)
    },
})
```

---

## Concurrency Patterns

### Goroutines

```go
import (
    "sync"
    "golang.org/x/sync/errgroup"
)

func processRepos(ctx context.Context, repos []string) error {
    client, err := dits.NewClientFromEnv()
    if err != nil {
        return err
    }

    g, ctx := errgroup.WithContext(ctx)

    // Clone all repos concurrently
    repositories := make([]*dits.Repository, len(repos))
    for i, repo := range repos {
        i, repo := i, repo // Capture loop variables
        g.Go(func() error {
            r, err := client.Clone(ctx, repo, fmt.Sprintf("./%s", path.Base(repo)))
            if err != nil {
                return err
            }
            repositories[i] = r
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return err
    }

    // Pull all concurrently
    g, ctx = errgroup.WithContext(ctx)
    for _, repo := range repositories {
        repo := repo
        g.Go(func() error {
            return repo.Pull(ctx)
        })
    }

    return g.Wait()
}
```

### Channels

```go
func streamProgress(ctx context.Context, repo *dits.Repository) <-chan dits.Progress {
    ch := make(chan dits.Progress)

    go func() {
        defer close(ch)
        repo.PushWithOptions(ctx, dits.PushOptions{
            OnProgress: func(p dits.Progress) {
                select {
                case ch <- p:
                case <-ctx.Done():
                }
            },
        })
    }()

    return ch
}

// Usage
for progress := range streamProgress(ctx, repo) {
    fmt.Printf("Progress: %.1f%%\n", progress.Percentage())
}
```

### Context Cancellation

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
defer cancel()

err := repo.Push(ctx)
if errors.Is(err, context.DeadlineExceeded) {
    fmt.Println("Push timed out")
} else if errors.Is(err, context.Canceled) {
    fmt.Println("Push was canceled")
}
```

---

## HTTP Server Integration

### net/http

```go
import (
    "encoding/json"
    "net/http"
)

func main() {
    client, _ := dits.NewClientFromEnv()

    http.HandleFunc("/repos/", func(w http.ResponseWriter, r *http.Request) {
        // Parse owner/name from path
        parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/repos/"), "/")
        if len(parts) < 2 {
            http.Error(w, "Invalid path", http.StatusBadRequest)
            return
        }

        repo, err := client.Repository(r.Context(), fmt.Sprintf("%s/%s", parts[0], parts[1]))
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        info, err := repo.Info(r.Context())
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        json.NewEncoder(w).Encode(info)
    })

    http.ListenAndServe(":8080", nil)
}
```

### Gin

```go
import "github.com/gin-gonic/gin"

func main() {
    client, _ := dits.NewClientFromEnv()

    r := gin.Default()

    r.GET("/repos/:owner/:name", func(c *gin.Context) {
        owner := c.Param("owner")
        name := c.Param("name")

        repo, err := client.Repository(c.Request.Context(), fmt.Sprintf("%s/%s", owner, name))
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        info, err := repo.Info(c.Request.Context())
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        c.JSON(http.StatusOK, info)
    })

    r.Run(":8080")
}
```

### Echo

```go
import "github.com/labstack/echo/v4"

func main() {
    client, _ := dits.NewClientFromEnv()

    e := echo.New()

    e.GET("/repos/:owner/:name", func(c echo.Context) error {
        owner := c.Param("owner")
        name := c.Param("name")

        repo, err := client.Repository(c.Request().Context(), fmt.Sprintf("%s/%s", owner, name))
        if err != nil {
            return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
        }

        info, err := repo.Info(c.Request().Context())
        if err != nil {
            return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
        }

        return c.JSON(http.StatusOK, info)
    })

    e.Start(":8080")
}
```

---

## Testing

### Mock Client

```go
import "github.com/dits-io/dits-go/testing"

func TestPush(t *testing.T) {
    client := testing.NewMockClient()
    client.AddRepository("test/repo", testing.NewMockRepository().
        WithFile("test.txt", []byte("content")),
    )

    repo, err := client.Clone(context.Background(), "test/repo", "/tmp/test")
    if err != nil {
        t.Fatal(err)
    }

    result, err := repo.Push(context.Background())
    if err != nil {
        t.Fatal(err)
    }

    if result.ChunksUploaded != 1 {
        t.Errorf("expected 1 chunk uploaded, got %d", result.ChunksUploaded)
    }
}
```

### Table-Driven Tests

```go
func TestStatus(t *testing.T) {
    tests := []struct {
        name     string
        files    map[string][]byte
        modified []string
        want     bool // IsClean
    }{
        {
            name:  "clean repository",
            files: map[string][]byte{"test.txt": []byte("content")},
            want:  true,
        },
        {
            name:     "dirty repository",
            files:    map[string][]byte{"test.txt": []byte("content")},
            modified: []string{"test.txt"},
            want:     false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := testing.NewMockRepository()
            for path, content := range tt.files {
                mockRepo.WithFile(path, content)
            }
            for _, path := range tt.modified {
                mockRepo.WithModified(path)
            }

            client := testing.NewMockClient()
            client.AddRepository("test/repo", mockRepo)

            repo, _ := client.Clone(context.Background(), "test/repo", "/tmp/test")
            status, _ := repo.Status(context.Background())

            if status.IsClean() != tt.want {
                t.Errorf("IsClean() = %v, want %v", status.IsClean(), tt.want)
            }
        })
    }
}
```

---

## Examples

### Full Workflow

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/dits-io/dits-go"
)

func main() {
    ctx := context.Background()

    // Initialize
    client, err := dits.NewClientFromEnv()
    if err != nil {
        log.Fatal(err)
    }

    // Clone repository
    repo, err := client.Clone(ctx, "myorg/video-project", "./project")
    if err != nil {
        log.Fatal(err)
    }

    // Pull latest
    if err := repo.Pull(ctx); err != nil {
        log.Fatal(err)
    }

    // Make changes
    if err := os.WriteFile("./project/new-video.mov", getVideoData(), 0644); err != nil {
        log.Fatal(err)
    }

    // Stage changes
    if err := repo.Add(ctx, []string{"new-video.mov"}); err != nil {
        log.Fatal(err)
    }

    // Commit
    if err := repo.Commit(ctx, "Add new video"); err != nil {
        log.Fatal(err)
    }

    // Push with progress
    result, err := repo.PushWithOptions(ctx, dits.PushOptions{
        OnProgress: func(p dits.Progress) {
            fmt.Printf("\rUploading: %.1f%%", p.Percentage())
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("\nPushed %d chunks (%d bytes)\n",
        result.ChunksUploaded,
        result.BytesUploaded,
    )
}
```

---

## Notes

- Requires Go 1.21+
- All operations accept context.Context for cancellation
- Implements idiomatic Go error handling
- Thread-safe for concurrent use
- Full documentation at pkg.go.dev/github.com/dits-io/dits-go

