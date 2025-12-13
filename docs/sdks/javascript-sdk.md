# JavaScript/TypeScript SDK Guide

Complete guide to using the Dits JavaScript SDK for Node.js and browser environments.

---

## Installation

```bash
# npm
npm install @dits/sdk

# yarn
yarn add @dits/sdk

# pnpm
pnpm add @dits/sdk
```

**Requirements**: Node.js 18+ or modern browser with ES2022 support

---

## Quick Start

```typescript
import { Client } from '@dits/sdk';

// Initialize client
const client = Client.fromEnv();

// Clone a repository
const repo = await client.clone('myorg/project', './project');

// Check status
const status = await repo.status();
console.log(`Modified files: ${status.modified}`);

// Pull latest changes
await repo.pull();
```

---

## TypeScript Support

The SDK is written in TypeScript with full type definitions:

```typescript
import {
  Client,
  Repository,
  Status,
  Commit,
  Author,
  CloneOptions,
  PushResult
} from '@dits/sdk';

async function main(): Promise<void> {
  const client = Client.fromEnv();
  const repo: Repository = await client.clone('myorg/project', './local');
  const status: Status = await repo.status();

  if (!status.isClean) {
    await repo.add(['*.mov']);
    await repo.commit('Update video assets');
    const result: PushResult = await repo.push();
    console.log(`Pushed ${result.chunksUploaded} chunks`);
  }
}
```

---

## Client Configuration

### From Environment

```typescript
import { Client } from '@dits/sdk';

// Reads DITS_TOKEN and DITS_ENDPOINT from environment
const client = Client.fromEnv();
```

### Direct Configuration

```typescript
import { Client, ClientConfig } from '@dits/sdk';

const client = new Client({
  endpoint: 'https://api.dits.io',
  token: 'dits_token_xxx',
  config: {
    timeout: 30000,          // 30 seconds
    maxConnections: 8,
    maxRetries: 3,
    retryDelay: 1000,        // 1 second
    cacheDir: '~/.cache/dits',
  }
});
```

### Configuration Options

```typescript
interface ClientConfig {
  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum concurrent connections */
  maxConnections?: number;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Initial retry delay in milliseconds */
  retryDelay?: number;

  /** Local cache directory */
  cacheDir?: string;

  /** HTTP proxy URL */
  proxy?: string;

  /** Custom CA certificate path */
  caCert?: string;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom fetch implementation */
  fetch?: typeof fetch;
}
```

---

## Authentication

### Token Authentication

```typescript
// From environment variable
const client = new Client({
  token: process.env.DITS_TOKEN
});

// Direct token
const client = new Client({
  token: 'dits_token_xxx'
});
```

### OAuth Flow

```typescript
import { OAuthFlow, OAuthProvider } from '@dits/sdk/auth';

// Start OAuth flow
const flow = new OAuthFlow({ provider: OAuthProvider.GitHub });
const authUrl = flow.authorizationUrl();

console.log(`Open in browser: ${authUrl}`);

// After user authorizes (e.g., in callback route)
const token = await flow.exchangeCode(code);

const client = new Client({ token: token.accessToken });
```

### API Key

```typescript
const client = new Client({
  apiKey: 'dits_api_xxx'
});
```

---

## Repository Operations

### Clone

```typescript
// Simple clone
const repo = await client.clone('myorg/project', './local-path');

// Clone with options
const repo = await client.clone('myorg/project', './local-path', {
  branch: 'develop',
  depth: 1,
  sparse: false
});

// Sparse clone
const repo = await client.clone('myorg/project', './local-path', {
  sparse: true
});
await repo.sparseAdd(['*.prproj', 'Media/**/*.mov']);
await repo.checkout();
```

### Open Existing

```typescript
import { Repository } from '@dits/sdk';

// Open repository at path
const repo = await Repository.open('./project');
```

### Create New

```typescript
// Initialize new repository
const repo = await Repository.init('./new-project');

// Add remote
await repo.remoteAdd('origin', 'https://dits.io/myorg/new-project');
```

### Repository Info

```typescript
const info = await repo.info();
console.log(`Name: ${info.name}`);
console.log(`Size: ${info.size} bytes`);
console.log(`Commits: ${info.commitCount}`);
console.log(`Default branch: ${info.defaultBranch}`);
```

---

## File Operations

### Status

```typescript
const status = await repo.status();

if (status.isClean) {
  console.log('Working directory clean');
} else {
  console.log(`Modified: ${status.modified}`);
  console.log(`Added: ${status.added}`);
  console.log(`Deleted: ${status.deleted}`);
  console.log(`Untracked: ${status.untracked}`);
}
```

### Add Files

```typescript
// Add specific files
await repo.add(['video.mov', 'project.prproj']);

// Add all changes
await repo.add(['.']);

// Add with pattern
await repo.add(['*.mov']);

// Add with options
await repo.add(['large-video.mov'], {
  chunker: 'video-aware',
  force: false
});
```

### Remove Files

```typescript
// Remove from index
await repo.remove(['old-file.mov']);

// Remove from disk too
await repo.remove(['old-file.mov'], { fromDisk: true });
```

### Read File Content

```typescript
// Read file at HEAD
const content = await repo.readFile('README.md');

// Read file at specific commit
const content = await repo.readFile('README.md', { commit: 'abc123' });

// Read as Buffer
const data = await repo.readFileBytes('video.mov');

// Stream large file
const stream = await repo.streamFile('large-video.mov');
for await (const chunk of stream) {
  processChunk(chunk);
}
```

### List Files

```typescript
// List all files
const files = await repo.listFiles('/');

// List files at specific commit
const files = await repo.listFiles('/Media', { commit: 'abc123' });

for (const file of files) {
  console.log(`${file.path}: ${file.size} bytes`);
}
```

---

## Commit Operations

### Create Commit

```typescript
// Simple commit
await repo.commit('Add new video assets');

// Commit with author
await repo.commit('Add new video assets', {
  author: { name: 'John Doe', email: 'john@example.com' }
});

// Commit with signature
await repo.commit('Add new video assets', { sign: true });
```

### View Commits

```typescript
// Get commit history
const commits = await repo.log({ limit: 10 });

for (const commit of commits) {
  console.log(`${commit.hash.slice(0, 8)}: ${commit.message} by ${commit.author.name}`);
}

// Get specific commit
const commit = await repo.getCommit('abc123def456');

// Get commits for a file
const commits = await repo.log({ path: 'video.mov' });
```

### Diff

```typescript
// Diff working directory
const diff = await repo.diff();

// Diff between commits
const diff = await repo.diff({
  from: 'abc123',
  to: 'def456'
});

// Diff specific path
const diff = await repo.diff({ paths: ['src/'] });

for (const fileDiff of diff.files) {
  console.log(`File: ${fileDiff.path}`);
  console.log(`  Added: ${fileDiff.additions} lines`);
  console.log(`  Removed: ${fileDiff.deletions} lines`);
}
```

---

## Branch Operations

### List Branches

```typescript
const branches = await repo.branches();

for (const branch of branches) {
  const marker = branch.isCurrent ? '*' : ' ';
  console.log(`${marker} ${branch.name}`);
}
```

### Create Branch

```typescript
// Create from HEAD
await repo.createBranch('feature/new-ui');

// Create from specific commit
await repo.createBranch('feature/new-ui', { from: 'abc123' });
```

### Switch Branch

```typescript
await repo.checkout('feature/new-ui');

// Create and switch
await repo.checkout('feature/another', { create: true });
```

### Delete Branch

```typescript
await repo.deleteBranch('feature/old');

// Force delete
await repo.deleteBranch('feature/old', { force: true });
```

### Merge

```typescript
const result = await repo.merge('feature/new-ui');

if (result.isConflict) {
  console.log(`Conflicts in: ${result.conflictingFiles}`);
  // Resolve conflicts...
  await repo.resolveAll();
  await repo.mergeContinue();
} else {
  console.log(`Merged successfully: ${result.commit}`);
}
```

---

## Remote Operations

### Push

```typescript
// Simple push
await repo.push();

// Push with progress
const result = await repo.push({
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
  }
});
console.log(`Pushed ${result.chunksUploaded} chunks`);

// Push specific branch
await repo.push({ branch: 'feature/new-ui' });

// Force push
await repo.push({ force: true });
```

### Pull

```typescript
// Simple pull
await repo.pull();

// Pull with progress
const result = await repo.pull({
  onProgress: (progress) => {
    console.log(`Downloading: ${progress.downloaded}/${progress.total} chunks`);
  }
});

// Pull with rebase
await repo.pull({ rebase: true });
```

### Fetch

```typescript
// Fetch all remotes
await repo.fetch();

// Fetch specific remote
await repo.fetch({ remote: 'upstream' });
```

---

## Lock Operations

### Acquire Lock

```typescript
// Lock a file
const lock = await repo.lock('project.prproj');
console.log(`Lock acquired, expires at: ${lock.expiresAt}`);

// Lock with custom duration
const lock = await repo.lock('project.prproj', {
  duration: 8 * 60 * 60 * 1000, // 8 hours in ms
  reason: 'Editing timeline'
});
```

### Release Lock

```typescript
// Release lock
await repo.unlock('project.prproj');

// Force release (admin only)
await repo.unlock('project.prproj', { force: true });
```

### Check Locks

```typescript
// List all locks
const locks = await repo.locks();

for (const lock of locks) {
  console.log(`${lock.path}: locked by ${lock.owner.name} until ${lock.expiresAt}`);
}

// Check specific file
const lock = await repo.getLock('project.prproj');
if (lock) {
  console.log(`Locked by: ${lock.owner.name}`);
}
```

---

## Event Handling

### Progress Callbacks

```typescript
import { Progress } from '@dits/sdk';

await repo.push({
  onProgress: (progress: Progress) => {
    const pct = progress.percentage;
    const speed = progress.speedHuman; // e.g., "15.2 MB/s"
    const eta = progress.eta; // seconds or null

    process.stdout.write(`\rUploading: ${pct.toFixed(1)}% @ ${speed}`);
    if (eta) {
      process.stdout.write(` ETA: ${eta}s`);
    }
  }
});
console.log(); // New line after completion
```

### Event Emitter

```typescript
repo.on('pushStart', ({ files }) => {
  console.log(`Starting push of ${files.length} files`);
});

repo.on('chunkUploaded', ({ hash, size }) => {
  console.log(`Uploaded chunk: ${hash.slice(0, 8)} (${size} bytes)`);
});

repo.on('pushComplete', ({ result }) => {
  console.log(`Push complete: ${result.chunksUploaded} chunks`);
});

repo.on('error', ({ error }) => {
  console.error(`Error: ${error.message}`);
});
```

---

## Error Handling

### Exception Types

```typescript
import {
  DitsError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
} from '@dits/sdk/errors';

try {
  await repo.push();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Please login: dits login');
  } else if (error instanceof NotFoundError) {
    console.log('Repository not found');
  } else if (error instanceof ConflictError) {
    console.log(`Conflict: ${error.message}`);
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited, retry after ${error.retryAfter}s`);
  } else if (error instanceof NetworkError) {
    console.log(`Network error: ${error.message}`);
  } else if (error instanceof DitsError) {
    console.log(`Error ${error.code}: ${error.message}`);
    if (error.requestId) {
      console.log(`Request ID: ${error.requestId}`);
    }
  }
}
```

### Retry Wrapper

```typescript
import { withRetry } from '@dits/sdk/retry';

await withRetry(() => repo.push(), {
  maxAttempts: 3,
  backoff: 2.0,
  onRetry: (attempt, error) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  }
});
```

---

## Browser Usage

### Bundle Size

```typescript
// Full SDK
import { Client } from '@dits/sdk';

// Tree-shakeable imports
import { Client } from '@dits/sdk/client';
import { Repository } from '@dits/sdk/repository';
```

### Web Workers

```typescript
// main.ts
const worker = new Worker(new URL('./dits-worker.ts', import.meta.url));

worker.postMessage({ action: 'push', path: './project' });

worker.onmessage = (event) => {
  if (event.data.type === 'progress') {
    updateProgressBar(event.data.percentage);
  } else if (event.data.type === 'complete') {
    console.log('Push complete!');
  }
};

// dits-worker.ts
import { Repository } from '@dits/sdk';

self.onmessage = async (event) => {
  if (event.data.action === 'push') {
    const repo = await Repository.open(event.data.path);
    await repo.push({
      onProgress: (progress) => {
        self.postMessage({ type: 'progress', percentage: progress.percentage });
      }
    });
    self.postMessage({ type: 'complete' });
  }
};
```

### IndexedDB Cache

```typescript
import { Client, IndexedDBCache } from '@dits/sdk';

const client = new Client({
  token: 'dits_token_xxx',
  cache: new IndexedDBCache('dits-cache')
});
```

---

## Node.js Specific

### File System Access

```typescript
import { Client } from '@dits/sdk';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const client = Client.fromEnv();
const repo = await client.clone('myorg/project', './project');

// Stream large file to disk
const stream = await repo.streamFile('large-video.mov');
await pipeline(stream, createWriteStream('./output.mov'));
```

### CLI Integration

```typescript
import { Client } from '@dits/sdk';
import { Command } from 'commander';

const program = new Command();

program
  .command('clone <repo> [path]')
  .option('-b, --branch <branch>', 'Branch to clone')
  .action(async (repoName, path, options) => {
    const client = Client.fromEnv();
    await client.clone(repoName, path || '.', {
      branch: options.branch
    });
  });

program.parse();
```

---

## Express Integration

```typescript
import express from 'express';
import { Client } from '@dits/sdk';

const app = express();

// Middleware to provide client
app.use((req, res, next) => {
  req.dits = Client.fromEnv();
  next();
});

// Route handler
app.get('/repos/:owner/:name', async (req, res) => {
  try {
    const repo = await req.dits.repository(`${req.params.owner}/${req.params.name}`);
    const info = await repo.info();
    res.json({ name: info.name, size: info.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

---

## Next.js Integration

### Server Components

```typescript
// app/repos/[...slug]/page.tsx
import { Client } from '@dits/sdk';

export default async function RepoPage({ params }: { params: { slug: string[] } }) {
  const client = Client.fromEnv();
  const [owner, name] = params.slug;

  const repo = await client.repository(`${owner}/${name}`);
  const info = await repo.info();

  return (
    <div>
      <h1>{info.name}</h1>
      <p>Size: {info.size} bytes</p>
      <p>Commits: {info.commitCount}</p>
    </div>
  );
}
```

### API Routes

```typescript
// app/api/repos/[...slug]/route.ts
import { Client } from '@dits/sdk';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  const client = Client.fromEnv();
  const [owner, name] = params.slug;

  const repo = await client.repository(`${owner}/${name}`);
  const info = await repo.info();

  return NextResponse.json(info);
}
```

---

## Testing

### Mock Client

```typescript
import { MockClient, MockRepository } from '@dits/sdk/testing';

describe('Repository', () => {
  it('should push changes', async () => {
    const client = new MockClient();
    client.addRepository('test/repo', new MockRepository({
      files: { 'test.txt': Buffer.from('content') }
    }));

    const repo = await client.clone('test/repo', '/tmp/test');
    const result = await repo.push();

    expect(result.chunksUploaded).toBe(1);
  });
});
```

### Jest Setup

```typescript
// jest.setup.ts
import { MockClient } from '@dits/sdk/testing';

beforeEach(() => {
  jest.clearAllMocks();
});

// Create global mock
global.mockDitsClient = new MockClient();
```

### Vitest Setup

```typescript
// vitest.setup.ts
import { MockClient } from '@dits/sdk/testing';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Examples

### Full Workflow

```typescript
import { Client } from '@dits/sdk';
import { writeFile } from 'fs/promises';

async function main() {
  // Initialize
  const client = Client.fromEnv();

  // Clone repository
  const repo = await client.clone('myorg/video-project', './project');

  // Pull latest
  await repo.pull();

  // Make changes
  await writeFile('./project/new-video.mov', getVideoData());

  // Stage changes
  await repo.add(['new-video.mov']);

  // Commit
  await repo.commit('Add new video');

  // Push with progress
  const result = await repo.push({
    onProgress: (p) => {
      process.stdout.write(`\rUploading: ${p.percentage.toFixed(1)}%`);
    }
  });

  console.log(`\nPushed ${result.chunksUploaded} chunks`);
}

main().catch(console.error);
```

### Concurrent Operations

```typescript
import { Client } from '@dits/sdk';

async function processRepos(repos: string[]) {
  const client = Client.fromEnv();

  // Clone all repos concurrently
  const repositories = await Promise.all(
    repos.map(repo =>
      client.clone(repo, `./${repo.split('/').pop()}`)
    )
  );

  // Pull all concurrently
  await Promise.all(
    repositories.map(repo => repo.pull())
  );

  console.log(`Processed ${repositories.length} repositories`);
}

processRepos([
  'myorg/project1',
  'myorg/project2',
  'myorg/project3',
]);
```

---

## Notes

- Requires Node.js 18+ or modern browser
- Full TypeScript support with type definitions
- Tree-shakeable for optimal bundle size
- Works in Node.js, browsers, and Web Workers
- Full documentation at docs.dits.io/sdk/javascript

