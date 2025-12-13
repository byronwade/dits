# Python SDK Guide

Complete guide to using the Dits Python SDK.

---

## Installation

```bash
pip install dits-py

# With async support
pip install dits-py[async]

# With all extras
pip install dits-py[all]
```

**Requirements**: Python 3.9+

---

## Quick Start

```python
from dits import Client

# Initialize client
client = Client.from_env()

# Clone a repository
repo = client.clone("myorg/project", "./project")

# Check status
status = repo.status()
print(f"Modified files: {status.modified}")

# Pull latest changes
repo.pull()
```

---

## Async Usage

```python
import asyncio
from dits import AsyncClient

async def main():
    client = AsyncClient.from_env()

    repo = await client.clone("myorg/project", "./project")
    status = await repo.status()

    print(f"Modified: {status.modified}")

asyncio.run(main())
```

---

## Client Configuration

### From Environment

```python
from dits import Client

# Reads DITS_TOKEN and DITS_ENDPOINT
client = Client.from_env()
```

### Direct Configuration

```python
from dits import Client, ClientConfig
from datetime import timedelta

client = Client(
    endpoint="https://api.dits.io",
    token="dits_token_xxx",
    config=ClientConfig(
        timeout=timedelta(seconds=30),
        max_connections=8,
        max_retries=3,
        cache_dir="~/.cache/dits",
    )
)
```

### Configuration Options

```python
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Optional

@dataclass
class ClientConfig:
    timeout: timedelta = timedelta(seconds=30)
    max_connections: int = 4
    max_retries: int = 3
    retry_delay: timedelta = timedelta(seconds=1)
    cache_dir: Optional[Path] = None
    proxy: Optional[str] = None
    ca_cert: Optional[Path] = None
    debug: bool = False
```

---

## Authentication

### Token Authentication

```python
import os
from dits import Client

# From environment
client = Client(token=os.environ["DITS_TOKEN"])

# Direct token
client = Client(token="dits_token_xxx")
```

### OAuth Flow

```python
from dits.auth import OAuthFlow, OAuthProvider

# Start OAuth flow
flow = OAuthFlow(provider=OAuthProvider.GITHUB)
auth_url = flow.authorization_url()

print(f"Open in browser: {auth_url}")

# After user authorizes
code = input("Enter code: ")
token = flow.exchange_code(code)

client = Client(token=token.access_token)
```

### API Key

```python
client = Client(api_key="dits_api_xxx")
```

---

## Repository Operations

### Clone

```python
# Simple clone
repo = client.clone("myorg/project", "./local-path")

# Clone specific branch
repo = client.clone(
    "myorg/project",
    "./local-path",
    branch="develop"
)

# Sparse clone
repo = client.clone(
    "myorg/project",
    "./local-path",
    sparse=True
)
repo.sparse_add(["*.prproj", "Media/**/*.mov"])
repo.checkout()
```

### Open Existing

```python
from dits import Repository

# Open repository at path
repo = Repository.open("./project")
```

### Create New

```python
# Initialize new repository
repo = Repository.init("./new-project")

# Add remote
repo.remote_add("origin", "https://dits.io/myorg/new-project")
```

### Repository Info

```python
info = repo.info()
print(f"Name: {info.name}")
print(f"Size: {info.size} bytes")
print(f"Commits: {info.commit_count}")
print(f"Default branch: {info.default_branch}")
```

---

## File Operations

### Status

```python
status = repo.status()

if status.is_clean:
    print("Working directory clean")
else:
    print(f"Modified: {status.modified}")
    print(f"Added: {status.added}")
    print(f"Deleted: {status.deleted}")
    print(f"Untracked: {status.untracked}")
```

### Add Files

```python
# Add specific files
repo.add(["video.mov", "project.prproj"])

# Add all changes
repo.add(["."])

# Add with pattern
repo.add(["*.mov"])

# Add with options
repo.add(
    ["large-video.mov"],
    chunker="video-aware",
    force=False
)
```

### Remove Files

```python
# Remove from index
repo.remove(["old-file.mov"])

# Remove from disk too
repo.remove(["old-file.mov"], from_disk=True)
```

### Read File Content

```python
# Read file at HEAD
content = repo.read_file("README.md")

# Read file at specific commit
content = repo.read_file("README.md", commit="abc123")

# Read as bytes
data = repo.read_file_bytes("video.mov")

# Stream large file
with repo.stream_file("large-video.mov") as stream:
    for chunk in stream:
        process_chunk(chunk)
```

### List Files

```python
# List all files
files = repo.list_files("/")

# List files at specific commit
files = repo.list_files("/Media", commit="abc123")

for file in files:
    print(f"{file.path}: {file.size} bytes")
```

---

## Commit Operations

### Create Commit

```python
# Simple commit
repo.commit("Add new video assets")

# Commit with author
repo.commit(
    "Add new video assets",
    author=Author(name="John Doe", email="john@example.com")
)

# Commit with signature
repo.commit("Add new video assets", sign=True)
```

### View Commits

```python
# Get commit history
commits = repo.log(limit=10)

for commit in commits:
    print(f"{commit.hash[:8]}: {commit.message} by {commit.author.name}")

# Get specific commit
commit = repo.get_commit("abc123def456")

# Get commits for a file
commits = repo.log(path="video.mov")
```

### Diff

```python
# Diff working directory
diff = repo.diff()

# Diff between commits
diff = repo.diff(from_commit="abc123", to_commit="def456")

# Diff specific path
diff = repo.diff(paths=["src/"])

for file_diff in diff.files:
    print(f"File: {file_diff.path}")
    print(f"  Added: {file_diff.additions} lines")
    print(f"  Removed: {file_diff.deletions} lines")
```

---

## Branch Operations

### List Branches

```python
branches = repo.branches()

for branch in branches:
    marker = "*" if branch.is_current else " "
    print(f"{marker} {branch.name}")
```

### Create Branch

```python
# Create from HEAD
repo.create_branch("feature/new-ui")

# Create from specific commit
repo.create_branch("feature/new-ui", from_commit="abc123")
```

### Switch Branch

```python
repo.checkout("feature/new-ui")

# Create and switch
repo.checkout("feature/another", create=True)
```

### Delete Branch

```python
repo.delete_branch("feature/old")

# Force delete
repo.delete_branch("feature/old", force=True)
```

### Merge

```python
result = repo.merge("feature/new-ui")

if result.is_conflict:
    print(f"Conflicts in: {result.conflicting_files}")
    # Resolve conflicts...
    repo.resolve_all()
    repo.merge_continue()
else:
    print(f"Merged successfully: {result.commit}")
```

---

## Remote Operations

### Push

```python
# Simple push
repo.push()

# Push with progress
def on_progress(progress):
    print(f"Progress: {progress.percentage:.1f}%")

result = repo.push(on_progress=on_progress)
print(f"Pushed {result.chunks_uploaded} chunks")

# Push specific branch
repo.push(branch="feature/new-ui")

# Force push
repo.push(force=True)
```

### Pull

```python
# Simple pull
repo.pull()

# Pull with progress
def on_progress(progress):
    print(f"Downloading: {progress.downloaded}/{progress.total} chunks")

result = repo.pull(on_progress=on_progress)

# Pull with rebase
repo.pull(rebase=True)
```

### Fetch

```python
# Fetch all remotes
repo.fetch()

# Fetch specific remote
repo.fetch(remote="upstream")
```

---

## Lock Operations

### Acquire Lock

```python
from datetime import timedelta

# Lock a file
lock = repo.lock("project.prproj")
print(f"Lock acquired, expires at: {lock.expires_at}")

# Lock with custom duration
lock = repo.lock(
    "project.prproj",
    duration=timedelta(hours=8),
    reason="Editing timeline"
)
```

### Release Lock

```python
# Release lock
repo.unlock("project.prproj")

# Force release (admin only)
repo.unlock("project.prproj", force=True)
```

### Check Locks

```python
# List all locks
locks = repo.locks()

for lock in locks:
    print(f"{lock.path}: locked by {lock.owner.name} until {lock.expires_at}")

# Check specific file
lock = repo.get_lock("project.prproj")
if lock:
    print(f"Locked by: {lock.owner.name}")
```

---

## Async Operations

### Async Repository

```python
import asyncio
from dits import AsyncClient

async def main():
    client = AsyncClient.from_env()
    repo = await client.clone("myorg/project", "./project")

    # All operations are async
    status = await repo.status()
    await repo.add(["new-file.mov"])
    await repo.commit("Add file")
    await repo.push()

asyncio.run(main())
```

### Concurrent Operations

```python
import asyncio
from dits import AsyncClient

async def process_repos(repos: list[str]):
    client = AsyncClient.from_env()

    # Clone all repos concurrently
    tasks = [
        client.clone(repo, f"./{repo.split('/')[-1]}")
        for repo in repos
    ]

    repositories = await asyncio.gather(*tasks)

    # Pull all concurrently
    await asyncio.gather(*[repo.pull() for repo in repositories])

asyncio.run(process_repos([
    "myorg/project1",
    "myorg/project2",
    "myorg/project3",
]))
```

### Async Context Manager

```python
async with AsyncClient.from_env() as client:
    repo = await client.clone("myorg/project", "./project")
    await repo.pull()
```

---

## Error Handling

### Exception Types

```python
from dits.exceptions import (
    DitsError,
    AuthenticationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    NetworkError,
)

try:
    repo.push()
except AuthenticationError:
    print("Please login: dits login")
except NotFoundError:
    print("Repository not found")
except ConflictError as e:
    print(f"Conflict: {e}")
except RateLimitError as e:
    print(f"Rate limited, retry after {e.retry_after}")
except NetworkError as e:
    print(f"Network error: {e}")
except DitsError as e:
    print(f"Error {e.code}: {e.message}")
    if e.request_id:
        print(f"Request ID: {e.request_id}")
```

### Retry Decorator

```python
from dits.retry import retry

@retry(max_attempts=3, backoff=2.0)
def push_with_retry(repo):
    repo.push()

push_with_retry(repo)
```

### Async Retry

```python
from dits.retry import async_retry

@async_retry(max_attempts=3, backoff=2.0)
async def push_with_retry(repo):
    await repo.push()

await push_with_retry(repo)
```

---

## Progress Reporting

### Progress Callback

```python
from dits import Progress

def on_progress(progress: Progress):
    pct = progress.percentage
    speed = progress.speed_human  # e.g., "15.2 MB/s"
    eta = progress.eta  # timedelta or None

    print(f"\rUploading: {pct:.1f}% @ {speed}", end="")
    if eta:
        print(f" ETA: {eta}", end="")

repo.push(on_progress=on_progress)
print()  # New line after completion
```

### Progress Bar (with tqdm)

```python
from tqdm import tqdm

with tqdm(total=100, desc="Pushing") as pbar:
    last_pct = 0

    def update_progress(progress):
        nonlocal last_pct
        delta = progress.percentage - last_pct
        pbar.update(delta)
        last_pct = progress.percentage

    repo.push(on_progress=update_progress)
```

### Rich Progress

```python
from rich.progress import Progress, SpinnerColumn, BarColumn

with Progress(
    SpinnerColumn(),
    "[progress.description]{task.description}",
    BarColumn(),
    "[progress.percentage]{task.percentage:>3.0f}%",
) as progress:
    task = progress.add_task("Pushing...", total=100)

    def update(p):
        progress.update(task, completed=p.percentage)

    repo.push(on_progress=update)
```

---

## Context Managers

### Repository Context

```python
from dits import Repository

with Repository.open("./project") as repo:
    repo.add(["file.mov"])
    repo.commit("Add file")
    repo.push()
# Resources automatically cleaned up
```

### Lock Context

```python
# Lock is automatically released when exiting context
with repo.lock_context("project.prproj") as lock:
    print(f"Lock acquired: {lock.id}")
    # Edit the file...
# Lock automatically released
```

---

## Type Hints

The SDK is fully typed for IDE support:

```python
from dits import Client, Repository, Commit, Status
from dits.types import Author, LockInfo, BranchInfo

def process_repo(repo: Repository) -> None:
    status: Status = repo.status()
    commits: list[Commit] = repo.log(limit=10)
    branches: list[BranchInfo] = repo.branches()
```

---

## Django Integration

```python
# settings.py
DITS_TOKEN = os.environ.get("DITS_TOKEN")
DITS_ENDPOINT = os.environ.get("DITS_ENDPOINT", "https://api.dits.io")

# views.py
from django.conf import settings
from dits import Client

def get_dits_client():
    return Client(
        endpoint=settings.DITS_ENDPOINT,
        token=settings.DITS_TOKEN,
    )

def repository_view(request, owner, name):
    client = get_dits_client()
    repo = client.repository(f"{owner}/{name}")
    info = repo.info()
    return render(request, "repo.html", {"repo": info})
```

---

## FastAPI Integration

```python
from fastapi import FastAPI, Depends
from dits import AsyncClient

app = FastAPI()

async def get_dits_client():
    return AsyncClient.from_env()

@app.get("/repos/{owner}/{name}")
async def get_repository(
    owner: str,
    name: str,
    client: AsyncClient = Depends(get_dits_client)
):
    repo = await client.repository(f"{owner}/{name}")
    info = await repo.info()
    return {"name": info.name, "size": info.size}
```

---

## Testing

### Mock Client

```python
from dits.testing import MockClient, MockRepository

def test_push():
    client = MockClient()
    client.add_repository("test/repo", MockRepository(
        files={"test.txt": b"content"}
    ))

    repo = client.clone("test/repo", "/tmp/test")
    result = repo.push()

    assert result.chunks_uploaded == 1
```

### Pytest Fixtures

```python
import pytest
from dits.testing import MockClient

@pytest.fixture
def dits_client():
    return MockClient()

@pytest.fixture
def test_repo(dits_client):
    return dits_client.clone("test/repo", "/tmp/test")

def test_status(test_repo):
    status = test_repo.status()
    assert status.is_clean
```

---

## Examples

### Full Workflow

```python
from dits import Client
from pathlib import Path

def main():
    # Initialize
    client = Client.from_env()

    # Clone repository
    repo = client.clone("myorg/video-project", "./project")

    # Pull latest
    repo.pull()

    # Make changes
    Path("./project/new-video.mov").write_bytes(get_video_data())

    # Stage changes
    repo.add(["new-video.mov"])

    # Commit
    repo.commit("Add new video")

    # Push with progress
    def on_progress(p):
        print(f"\rUploading: {p.percentage:.1f}%", end="")

    result = repo.push(on_progress=on_progress)
    print(f"\nPushed {result.chunks_uploaded} chunks")

if __name__ == "__main__":
    main()
```

---

## Notes

- Requires Python 3.9+
- Sync and async APIs available
- Fully typed with type hints
- Thread-safe for concurrent use
- Full documentation at dits-py.readthedocs.io
