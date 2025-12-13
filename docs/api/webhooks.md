# Webhook & Event System

Real-time notifications and event-driven integrations.

---

## Overview

Dits provides a comprehensive webhook system for real-time notifications about repository events. This enables:

- CI/CD pipeline triggers
- Slack/Discord notifications
- Custom integrations
- Audit logging
- Automation workflows

---

## Event Types

### Repository Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `repo.created` | New repository created | POST /repos |
| `repo.deleted` | Repository deleted | DELETE /repos/:id |
| `repo.renamed` | Repository renamed | PATCH /repos/:id |
| `repo.visibility_changed` | Public/private toggle | PATCH /repos/:id |
| `repo.archived` | Repository archived | PATCH /repos/:id |

### Push Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `push` | Commits pushed to branch | dits push |
| `push.tag` | Tag pushed | dits push --tags |
| `push.force` | Force push | dits push --force |

### Branch Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `branch.created` | New branch created | dits branch create |
| `branch.deleted` | Branch deleted | dits branch delete |
| `branch.protection` | Protection rules changed | Settings |

### Tag Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `tag.created` | New tag created | dits tag create |
| `tag.deleted` | Tag deleted | dits tag delete |

### Lock Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `lock.acquired` | File locked | dits lock |
| `lock.released` | File unlocked | dits unlock |
| `lock.expired` | Lock expired automatically | System |
| `lock.broken` | Lock forcefully broken | dits lock break |

### Team Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `member.added` | Collaborator added | Settings |
| `member.removed` | Collaborator removed | Settings |
| `member.role_changed` | Role changed | Settings |

### Comment Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `comment.created` | Comment added | API |
| `comment.updated` | Comment edited | API |
| `comment.deleted` | Comment removed | API |

---

## Webhook Configuration

### Creating Webhooks

```bash
# CLI
dits webhook create \
    --repo myorg/project \
    --url https://example.com/webhook \
    --events push,lock.acquired,lock.released \
    --secret "my-secret-key"

# Output:
# Webhook created: whk_abc123def456
```

### API

```http
POST /api/v1/repos/:repo_id/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://example.com/webhook",
  "events": ["push", "lock.acquired", "lock.released"],
  "secret": "my-secret-key",
  "active": true,
  "config": {
    "content_type": "json",
    "insecure_ssl": false
  }
}
```

### Response

```json
{
  "id": "whk_abc123def456",
  "url": "https://example.com/webhook",
  "events": ["push", "lock.acquired", "lock.released"],
  "active": true,
  "created_at": "2025-01-08T12:00:00Z",
  "updated_at": "2025-01-08T12:00:00Z",
  "last_delivery": null,
  "config": {
    "content_type": "json",
    "insecure_ssl": false
  }
}
```

---

## Payload Format

### Common Fields

All webhook payloads include:

```json
{
  "event": "push",
  "delivery_id": "del_xyz789",
  "timestamp": "2025-01-08T12:00:00Z",
  "repository": {
    "id": "550e8400-...",
    "name": "project",
    "full_name": "myorg/project",
    "owner": {
      "id": "user-123",
      "name": "myorg",
      "type": "organization"
    }
  },
  "sender": {
    "id": "user-456",
    "name": "johndoe",
    "email": "john@example.com"
  }
}
```

### Push Event

```json
{
  "event": "push",
  "delivery_id": "del_xyz789",
  "timestamp": "2025-01-08T12:00:00Z",
  "repository": { ... },
  "sender": { ... },
  "ref": "refs/heads/main",
  "before": "a1b2c3d4e5f6...",
  "after": "f6e5d4c3b2a1...",
  "created": false,
  "deleted": false,
  "forced": false,
  "commits": [
    {
      "id": "f6e5d4c3b2a1...",
      "message": "Add new feature",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "timestamp": "2025-01-08T11:55:00Z",
      "added": ["feature.rs"],
      "modified": ["lib.rs"],
      "removed": []
    }
  ],
  "head_commit": {
    "id": "f6e5d4c3b2a1...",
    "message": "Add new feature",
    "author": { ... },
    "timestamp": "2025-01-08T11:55:00Z"
  },
  "pusher": {
    "name": "johndoe",
    "email": "john@example.com"
  },
  "compare_url": "https://dits.io/myorg/project/compare/a1b2c3d4...f6e5d4c3"
}
```

### Lock Event

```json
{
  "event": "lock.acquired",
  "delivery_id": "del_abc123",
  "timestamp": "2025-01-08T12:00:00Z",
  "repository": { ... },
  "sender": { ... },
  "lock": {
    "id": "lock-789",
    "path": "project/edit.prproj",
    "owner": {
      "id": "user-456",
      "name": "johndoe"
    },
    "locked_at": "2025-01-08T12:00:00Z",
    "expires_at": "2025-01-08T20:00:00Z",
    "reason": "Editing timeline"
  }
}
```

### Branch Event

```json
{
  "event": "branch.created",
  "delivery_id": "del_def456",
  "timestamp": "2025-01-08T12:00:00Z",
  "repository": { ... },
  "sender": { ... },
  "ref": "refs/heads/feature/new-ui",
  "ref_type": "branch",
  "base_ref": "refs/heads/main",
  "head_commit": "abc123def456..."
}
```

### Member Event

```json
{
  "event": "member.added",
  "delivery_id": "del_ghi789",
  "timestamp": "2025-01-08T12:00:00Z",
  "repository": { ... },
  "sender": { ... },
  "member": {
    "id": "user-789",
    "name": "janedoe",
    "email": "jane@example.com"
  },
  "role": "contributor",
  "inviter": {
    "id": "user-456",
    "name": "johndoe"
  }
}
```

---

## Signature Verification

### HMAC-SHA256 Signature

Webhooks are signed using HMAC-SHA256:

```
X-Dits-Signature: sha256=<signature>
```

### Verification Code

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

fn verify_signature(payload: &[u8], signature: &str, secret: &str) -> bool {
    // Parse signature header
    let sig = signature.strip_prefix("sha256=").unwrap_or("");

    // Calculate expected signature
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload);

    // Compare
    let expected = hex::encode(mac.finalize().into_bytes());
    constant_time_compare(sig, &expected)
}
```

```javascript
// Node.js
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
    const sig = signature.replace('sha256=', '');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expected)
    );
}
```

```python
# Python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    sig = signature.replace('sha256=', '')
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig, expected)
```

---

## Delivery & Retry

### Delivery Attempts

Dits attempts delivery with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 6 hours |
| 7 | 12 hours |
| 8 | 24 hours (final) |

### Success Criteria

Delivery is considered successful if:
- HTTP status code is 2xx (200-299)
- Response received within 30 seconds

### Delivery Status

```http
GET /api/v1/repos/:repo_id/webhooks/:webhook_id/deliveries
Authorization: Bearer <token>
```

```json
{
  "deliveries": [
    {
      "id": "del_xyz789",
      "event": "push",
      "status": "success",
      "status_code": 200,
      "duration_ms": 145,
      "delivered_at": "2025-01-08T12:00:00Z",
      "request": {
        "headers": { ... },
        "body": { ... }
      },
      "response": {
        "headers": { ... },
        "body": "OK"
      }
    },
    {
      "id": "del_abc123",
      "event": "lock.acquired",
      "status": "failed",
      "status_code": 500,
      "duration_ms": 2345,
      "delivered_at": "2025-01-08T11:55:00Z",
      "error": "Connection timeout",
      "next_retry_at": "2025-01-08T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

### Manual Redelivery

```http
POST /api/v1/repos/:repo_id/webhooks/:webhook_id/deliveries/:delivery_id/redeliver
Authorization: Bearer <token>
```

---

## Webhook Receiver Examples

### Express.js (Node.js)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook/dits', (req, res) => {
    // Verify signature
    const signature = req.headers['x-dits-signature'];
    if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
        return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(req.body);
    const event = req.headers['x-dits-event'];

    console.log(`Received ${event} event`);

    switch (event) {
        case 'push':
            handlePush(payload);
            break;
        case 'lock.acquired':
            handleLockAcquired(payload);
            break;
        case 'lock.released':
            handleLockReleased(payload);
            break;
        default:
            console.log(`Unhandled event: ${event}`);
    }

    res.status(200).send('OK');
});

function handlePush(payload) {
    const { repository, commits, pusher } = payload;
    console.log(`${pusher.name} pushed ${commits.length} commits to ${repository.full_name}`);

    // Trigger CI/CD
    triggerBuild(repository, commits);
}

function handleLockAcquired(payload) {
    const { lock, sender, repository } = payload;
    // Notify team
    sendSlackMessage(
        `🔒 ${sender.name} locked ${lock.path} in ${repository.name}`
    );
}
```

### Flask (Python)

```python
from flask import Flask, request, abort
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

@app.route('/webhook/dits', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-Dits-Signature', '')
    if not verify_signature(request.data, signature, WEBHOOK_SECRET):
        abort(401)

    event = request.headers.get('X-Dits-Event')
    payload = request.json

    print(f"Received {event} event")

    handlers = {
        'push': handle_push,
        'lock.acquired': handle_lock_acquired,
        'lock.released': handle_lock_released,
    }

    handler = handlers.get(event)
    if handler:
        handler(payload)
    else:
        print(f"Unhandled event: {event}")

    return 'OK', 200

def handle_push(payload):
    repository = payload['repository']
    commits = payload['commits']
    pusher = payload['pusher']

    print(f"{pusher['name']} pushed {len(commits)} commits to {repository['full_name']}")

    # Trigger processing
    process_new_commits(repository, commits)
```

### Rust (Axum)

```rust
use axum::{
    body::Bytes,
    extract::TypedHeader,
    headers::HeaderMap,
    http::StatusCode,
    routing::post,
    Router,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

async fn webhook_handler(
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    // Verify signature
    let signature = headers
        .get("x-dits-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let secret = std::env::var("WEBHOOK_SECRET").unwrap();

    if !verify_signature(&body, signature, &secret) {
        return StatusCode::UNAUTHORIZED;
    }

    let event = headers
        .get("x-dits-event")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    tracing::info!("Received {} event", event);

    match event {
        "push" => handle_push(&payload).await,
        "lock.acquired" => handle_lock(&payload).await,
        _ => tracing::warn!("Unhandled event: {}", event),
    }

    StatusCode::OK
}

fn verify_signature(payload: &[u8], signature: &str, secret: &str) -> bool {
    let sig = signature.strip_prefix("sha256=").unwrap_or("");
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(payload);
    let expected = hex::encode(mac.finalize().into_bytes());
    constant_time_eq::constant_time_eq(sig.as_bytes(), expected.as_bytes())
}
```

---

## Event Streaming

### Server-Sent Events (SSE)

```http
GET /api/v1/repos/:repo_id/events
Authorization: Bearer <token>
Accept: text/event-stream
```

```
event: push
id: evt_123
data: {"ref":"refs/heads/main","commits":[...]}

event: lock.acquired
id: evt_124
data: {"lock":{"path":"video.mov","owner":"johndoe"}}
```

### WebSocket

```javascript
const ws = new WebSocket('wss://api.dits.io/v1/ws');

ws.onopen = () => {
    // Subscribe to events
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'repo:myorg/project',
        events: ['push', 'lock.*']
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Event:', data.event, data.payload);
};
```

---

## Filtering Events

### Event Patterns

```json
{
  "events": [
    "push",           // Exact match
    "lock.*",         // All lock events
    "branch.created", // Specific branch event
    "*.deleted"       // All delete events
  ]
}
```

### Branch Filters

```json
{
  "events": ["push"],
  "filters": {
    "branches": ["main", "release/*"],
    "tags": ["v*"],
    "paths": ["src/**", "*.rs"]
  }
}
```

### Path Filters

```json
{
  "events": ["push"],
  "filters": {
    "paths": {
      "include": ["Media/**/*.mov", "Projects/*.prproj"],
      "exclude": ["**/temp/**", "**/.cache/**"]
    }
  }
}
```

---

## Best Practices

### 1. Verify Signatures

Always verify webhook signatures:

```javascript
// Bad - no verification
app.post('/webhook', (req, res) => {
    processEvent(req.body);
});

// Good - verify signature
app.post('/webhook', (req, res) => {
    if (!verifySignature(req.body, req.headers['x-dits-signature'])) {
        return res.status(401).send('Invalid signature');
    }
    processEvent(req.body);
});
```

### 2. Respond Quickly

Process webhooks asynchronously:

```javascript
app.post('/webhook', async (req, res) => {
    // Immediately acknowledge
    res.status(200).send('OK');

    // Process async
    processEventAsync(req.body);
});
```

### 3. Handle Duplicates

Use delivery ID for idempotency:

```javascript
const processedDeliveries = new Set();

app.post('/webhook', (req, res) => {
    const deliveryId = req.headers['x-dits-delivery'];

    if (processedDeliveries.has(deliveryId)) {
        return res.status(200).send('Already processed');
    }

    processedDeliveries.add(deliveryId);
    processEvent(req.body);

    res.status(200).send('OK');
});
```

### 4. Use Secret Rotation

Rotate secrets periodically:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update webhook
dits webhook update whk_abc123 --secret "$NEW_SECRET"

# Update receiver
# Deploy new secret to webhook receiver
```

---

## Monitoring

### Webhook Metrics

```
dits_webhook_deliveries_total{status="success|failed",event}
dits_webhook_delivery_duration_seconds{event}
dits_webhook_retry_count{webhook_id}
dits_webhook_queue_size
```

### Alerting

```yaml
# prometheus-rules.yaml
groups:
  - name: webhooks
    rules:
      - alert: WebhookDeliveryFailures
        expr: rate(dits_webhook_deliveries_total{status="failed"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: High webhook delivery failure rate

      - alert: WebhookQueueBacklog
        expr: dits_webhook_queue_size > 1000
        for: 10m
        annotations:
          summary: Webhook delivery queue backing up
```

---

## Notes

- Webhooks have a 30-second timeout
- Payload size limited to 10MB
- Maximum 20 webhooks per repository
- Secrets should be at least 32 characters
- Use HTTPS endpoints in production
