# REST API Reference

Complete API specification for the Dits server control plane.

---

## Base URL

```
Production: https://api.dits.io/v1
Staging:    https://api.staging.dits.io/v1
Self-hosted: https://{your-domain}/api/v1
```

---

## Authentication

### Bearer Token (Sessions)

```http
Authorization: Bearer <session_token>
```

Session tokens are obtained via `/auth/login` and expire after 24 hours.

### API Token (Programmatic)

```http
Authorization: Bearer dits_<api_token>
```

API tokens are created in settings and can have scoped permissions.

### SSH Key Authentication

For git-compatible operations, SSH keys registered in user settings.

---

## Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token |
| `Content-Type` | Yes* | `application/json` for JSON, `application/octet-stream` for binary |
| `X-Request-ID` | No | Client-generated UUID for tracing |
| `X-Client-Version` | No | Client version for compatibility checks |
| `Accept-Encoding` | No | `gzip, zstd` for compressed responses |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Echo of request ID or server-generated |
| `X-RateLimit-Limit` | Requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `X-Server-Version` | Server version for compatibility |

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Repository not found",
    "details": {
      "resource_type": "repository",
      "resource_id": "abc123"
    },
    "request_id": "req_xyz789"
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `BAD_REQUEST` | Malformed request |
| 400 | `VALIDATION_ERROR` | Field validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid auth |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `RESOURCE_NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Resource already exists or conflict |
| 409 | `LOCK_CONFLICT` | File locked by another user |
| 422 | `UNPROCESSABLE` | Valid syntax but semantic error |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Temporary unavailability |

---

## Pagination

List endpoints support cursor-based pagination:

```http
GET /repos?limit=50&cursor=eyJpZCI6MTIzfQ
```

Response includes:

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6MTczfQ",
    "total_count": 1523
  }
}
```

---

# Endpoints

## Authentication

### POST /auth/login

Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret",
  "mfa_code": "123456"  // Optional, required if MFA enabled
}
```

**Response (200):**
```json
{
  "session": {
    "token": "ses_abc123...",
    "expires_at": "2025-01-09T12:00:00Z"
  },
  "user": {
    "id": "usr_xyz",
    "username": "johndoe",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Response (401 - MFA Required):**
```json
{
  "error": {
    "code": "MFA_REQUIRED",
    "message": "Multi-factor authentication required",
    "details": {
      "methods": ["totp", "webauthn"]
    }
  }
}
```

### POST /auth/logout

Invalidate current session.

**Response (204):** No content

### POST /auth/refresh

Refresh session token.

**Response (200):**
```json
{
  "session": {
    "token": "ses_newtoken...",
    "expires_at": "2025-01-10T12:00:00Z"
  }
}
```

### GET /auth/me

Get current user info.

**Response (200):**
```json
{
  "user": {
    "id": "usr_xyz",
    "username": "johndoe",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z",
    "organizations": [
      {
        "id": "org_abc",
        "name": "Acme Studios",
        "role": "admin"
      }
    ]
  }
}
```

---

## Users

### GET /users/:username

Get public user profile.

**Response (200):**
```json
{
  "user": {
    "id": "usr_xyz",
    "username": "johndoe",
    "name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /users/me

Update current user.

**Request:**
```json
{
  "name": "John D. Doe",
  "avatar_url": "https://...",
  "preferences": {
    "timezone": "America/Los_Angeles",
    "theme": "dark"
  }
}
```

**Response (200):** Updated user object

### GET /users/me/sessions

List active sessions.

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "ses_abc",
      "created_at": "2025-01-08T10:00:00Z",
      "last_active_at": "2025-01-08T14:30:00Z",
      "ip_address": "192.168.1.1",
      "user_agent": "Dits CLI/1.0",
      "current": true
    }
  ]
}
```

### DELETE /users/me/sessions/:session_id

Revoke a session.

**Response (204):** No content

### GET /users/me/tokens

List API tokens.

**Response (200):**
```json
{
  "tokens": [
    {
      "id": "tok_abc",
      "name": "CI Pipeline",
      "scopes": ["repo:read", "repo:write"],
      "created_at": "2024-06-01T00:00:00Z",
      "last_used_at": "2025-01-08T12:00:00Z",
      "expires_at": null
    }
  ]
}
```

### POST /users/me/tokens

Create API token.

**Request:**
```json
{
  "name": "GitHub Actions",
  "scopes": ["repo:read", "repo:write"],
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "token": {
    "id": "tok_xyz",
    "name": "GitHub Actions",
    "token": "dits_abc123..."  // Only shown once!
  }
}
```

### DELETE /users/me/tokens/:token_id

Revoke API token.

**Response (204):** No content

---

## Repositories

### GET /repos

List repositories accessible to user.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `owner` | string | Filter by owner username/org |
| `visibility` | string | `private`, `internal`, `public` |
| `sort` | string | `name`, `created`, `updated`, `size` |
| `direction` | string | `asc`, `desc` |
| `limit` | int | Max 100, default 30 |
| `cursor` | string | Pagination cursor |

**Response (200):**
```json
{
  "data": [
    {
      "id": "repo_abc",
      "name": "commercial-q1-2025",
      "full_name": "acme-studios/commercial-q1-2025",
      "description": "Q1 2025 Super Bowl commercial",
      "owner": {
        "type": "organization",
        "id": "org_xyz",
        "name": "acme-studios"
      },
      "visibility": "private",
      "default_branch": "main",
      "created_at": "2024-12-01T00:00:00Z",
      "updated_at": "2025-01-08T15:00:00Z",
      "stats": {
        "size_bytes": 1099511627776,
        "commit_count": 156,
        "contributor_count": 8
      }
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "...",
    "total_count": 47
  }
}
```

### POST /repos

Create repository.

**Request:**
```json
{
  "name": "documentary-2025",
  "description": "Feature documentary project",
  "visibility": "private",
  "owner": "org_xyz",  // Optional, defaults to user
  "settings": {
    "require_lock_for_edit": true,
    "auto_generate_proxies": true,
    "proxy_resolution": "1080p",
    "allowed_extensions": [".mov", ".mp4", ".mxf", ".prproj"]
  }
}
```

**Response (201):**
```json
{
  "repository": {
    "id": "repo_new",
    "name": "documentary-2025",
    "clone_url": "https://dits.io/acme-studios/documentary-2025.dits",
    "ssh_url": "git@dits.io:acme-studios/documentary-2025.dits",
    ...
  }
}
```

### GET /repos/:owner/:name

Get repository details.

**Response (200):**
```json
{
  "repository": {
    "id": "repo_abc",
    "name": "commercial-q1-2025",
    "full_name": "acme-studios/commercial-q1-2025",
    "description": "Q1 2025 Super Bowl commercial",
    "owner": { ... },
    "visibility": "private",
    "default_branch": "main",
    "clone_url": "https://dits.io/acme-studios/commercial-q1-2025.dits",
    "ssh_url": "git@dits.io:acme-studios/commercial-q1-2025.dits",
    "settings": {
      "require_lock_for_edit": true,
      "auto_generate_proxies": true,
      "max_file_size_bytes": 0,
      "allowed_extensions": []
    },
    "stats": {
      "size_bytes": 1099511627776,
      "logical_bytes": 2199023255552,
      "dedup_ratio": 2.0,
      "commit_count": 156,
      "chunk_count": 45678,
      "contributor_count": 8,
      "last_activity_at": "2025-01-08T15:00:00Z"
    },
    "permissions": {
      "admin": true,
      "push": true,
      "pull": true
    },
    "created_at": "2024-12-01T00:00:00Z",
    "updated_at": "2025-01-08T15:00:00Z"
  }
}
```

### PATCH /repos/:owner/:name

Update repository.

**Request:**
```json
{
  "description": "Updated description",
  "visibility": "internal",
  "default_branch": "production",
  "settings": {
    "require_lock_for_edit": false
  }
}
```

**Response (200):** Updated repository object

### DELETE /repos/:owner/:name

Delete repository.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `confirm` | string | Must be repository name |

**Response (204):** No content

### POST /repos/:owner/:name/transfer

Transfer repository ownership.

**Request:**
```json
{
  "new_owner": "other-org"
}
```

**Response (202):** Transfer initiated (may require acceptance)

---

## Branches

### GET /repos/:owner/:name/branches

List branches.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `protected` | bool | Filter by protection status |
| `sort` | string | `name`, `updated` |

**Response (200):**
```json
{
  "branches": [
    {
      "name": "main",
      "commit": {
        "hash": "abc123...",
        "message": "Final color grade",
        "author": "johndoe",
        "created_at": "2025-01-08T14:00:00Z"
      },
      "protected": true,
      "default": true
    },
    {
      "name": "feature/vfx-shots",
      "commit": { ... },
      "protected": false,
      "default": false,
      "ahead_behind": {
        "ahead": 12,
        "behind": 3
      }
    }
  ]
}
```

### GET /repos/:owner/:name/branches/:branch

Get branch details.

**Response (200):**
```json
{
  "branch": {
    "name": "main",
    "commit": { ... },
    "protection": {
      "enabled": true,
      "required_approvals": 2,
      "required_status_checks": ["ci/build", "ci/test"],
      "dismiss_stale_approvals": true,
      "require_linear_history": false,
      "allow_force_push": false,
      "allow_deletion": false,
      "bypass_actors": [
        { "type": "user", "id": "usr_admin" }
      ]
    }
  }
}
```

### POST /repos/:owner/:name/branches

Create branch.

**Request:**
```json
{
  "name": "feature/new-intro",
  "source": "main"  // Branch or commit hash
}
```

**Response (201):** Branch object

### DELETE /repos/:owner/:name/branches/:branch

Delete branch.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `force` | bool | Delete even if not merged |

**Response (204):** No content

### PUT /repos/:owner/:name/branches/:branch/protection

Set branch protection.

**Request:**
```json
{
  "required_approvals": 2,
  "required_status_checks": ["ci/build"],
  "dismiss_stale_approvals": true,
  "require_linear_history": true,
  "allow_force_push": false,
  "allow_deletion": false
}
```

**Response (200):** Updated protection rules

---

## Commits

### GET /repos/:owner/:name/commits

List commits.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `branch` | string | Branch name (default: default branch) |
| `path` | string | Filter by file path |
| `author` | string | Filter by author username |
| `since` | datetime | Commits after this time |
| `until` | datetime | Commits before this time |
| `limit` | int | Max 100, default 30 |

**Response (200):**
```json
{
  "commits": [
    {
      "hash": "abc123def456...",
      "short_hash": "abc123d",
      "message": "Add final VFX shots",
      "author": {
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe"
      },
      "committer": {
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe"
      },
      "created_at": "2025-01-08T14:00:00Z",
      "parents": ["def456..."],
      "stats": {
        "additions": 3,
        "deletions": 1,
        "changes": 4,
        "size_delta_bytes": 15728640
      }
    }
  ]
}
```

### GET /repos/:owner/:name/commits/:hash

Get commit details.

**Response (200):**
```json
{
  "commit": {
    "hash": "abc123...",
    "message": "Add final VFX shots\n\nDetailed description...",
    "author": { ... },
    "committer": { ... },
    "created_at": "2025-01-08T14:00:00Z",
    "parents": ["def456..."],
    "tree": "tree789...",
    "signature": {
      "verified": true,
      "signer": "johndoe",
      "key_id": "ABC123"
    },
    "files": [
      {
        "path": "footage/vfx/shot_001.mov",
        "status": "added",
        "size_bytes": 10485760,
        "chunks_added": 164,
        "chunks_removed": 0
      },
      {
        "path": "footage/vfx/shot_002.mov",
        "status": "modified",
        "size_bytes": 15728640,
        "chunks_added": 12,
        "chunks_removed": 8
      }
    ]
  }
}
```

### POST /repos/:owner/:name/commits

Create commit (server-side).

**Request:**
```json
{
  "branch": "main",
  "message": "Update project settings",
  "parent": "abc123...",  // Expected parent for conflict detection
  "manifest": {
    "files": [
      {
        "path": "project.prproj",
        "mode": "100644",
        "chunks": ["chunk1...", "chunk2..."],
        "size": 1048576
      }
    ]
  }
}
```

**Response (201):**
```json
{
  "commit": {
    "hash": "newcommit...",
    ...
  }
}
```

### GET /repos/:owner/:name/commits/:hash/manifest

Get commit manifest (file tree).

**Response (200):**
```json
{
  "manifest": {
    "version": 1,
    "files": [
      {
        "path": "footage/scene01.mov",
        "mode": "100644",
        "size": 10737418240,
        "mime_type": "video/quicktime",
        "chunks": [
          {
            "hash": "abc123...",
            "offset": 0,
            "size": 65536,
            "compressed_size": 64000
          }
        ],
        "metadata": {
          "duration_ms": 120000,
          "width": 3840,
          "height": 2160,
          "codec": "prores"
          "fps": 24
        }
      }
    ],
    "total_size": 107374182400,
    "total_chunks": 1638400
  }
}
```

---

## Tags

### GET /repos/:owner/:name/tags

List tags.

**Response (200):**
```json
{
  "tags": [
    {
      "name": "v1.0",
      "commit": "abc123...",
      "type": "annotated",
      "message": "First release candidate",
      "tagger": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "created_at": "2025-01-08T12:00:00Z"
    },
    {
      "name": "client-review-1",
      "commit": "def456...",
      "type": "lightweight",
      "created_at": "2025-01-07T10:00:00Z"
    }
  ]
}
```

### POST /repos/:owner/:name/tags

Create tag.

**Request:**
```json
{
  "name": "picture-lock",
  "commit": "abc123...",
  "message": "Picture lock for client approval",  // Makes it annotated
  "sign": true
}
```

**Response (201):** Tag object

### DELETE /repos/:owner/:name/tags/:tag

Delete tag.

**Response (204):** No content

---

## Locks

### GET /repos/:owner/:name/locks

List file locks.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `path` | string | Filter by path prefix |
| `owner` | string | Filter by lock owner |
| `include_expired` | bool | Include expired locks |

**Response (200):**
```json
{
  "locks": [
    {
      "id": "lock_abc",
      "path": "footage/scene01.mov",
      "owner": {
        "id": "usr_xyz",
        "username": "johndoe"
      },
      "locked_at": "2025-01-08T10:00:00Z",
      "expires_at": "2025-01-08T18:00:00Z",
      "reason": "Color grading in progress"
    }
  ]
}
```

### POST /repos/:owner/:name/locks

Acquire lock.

**Request:**
```json
{
  "path": "footage/scene01.mov",
  "reason": "Working on color grade",
  "ttl_seconds": 28800  // 8 hours, optional
}
```

**Response (201):**
```json
{
  "lock": {
    "id": "lock_new",
    "path": "footage/scene01.mov",
    "owner": { ... },
    "locked_at": "2025-01-08T14:00:00Z",
    "expires_at": "2025-01-08T22:00:00Z"
  }
}
```

**Response (409 - Already Locked):**
```json
{
  "error": {
    "code": "LOCK_CONFLICT",
    "message": "File is locked by another user",
    "details": {
      "lock": {
        "owner": "janedoe",
        "locked_at": "2025-01-08T10:00:00Z",
        "reason": "Editing VFX"
      }
    }
  }
}
```

### DELETE /repos/:owner/:name/locks/:lock_id

Release lock.

**Response (204):** No content

### POST /repos/:owner/:name/locks/:lock_id/refresh

Extend lock TTL.

**Request:**
```json
{
  "ttl_seconds": 28800
}
```

**Response (200):** Updated lock with new expiry

### POST /repos/:owner/:name/locks/:lock_id/force-release

Force release (admin only).

**Request:**
```json
{
  "reason": "User went home for the day"
}
```

**Response (204):** No content

---

## Chunks

### HEAD /chunks/:hash

Check if chunk exists.

**Response (200):** Chunk exists
**Response (404):** Chunk not found

### GET /chunks/:hash

Download chunk.

**Response (200):**
- `Content-Type: application/octet-stream`
- `Content-Encoding: zstd` (if compressed)
- `X-Chunk-Size: 65536`
- `X-Chunk-Compressed-Size: 64000`

Body: Raw chunk data

### POST /chunks/batch-check

Check multiple chunks existence.

**Request:**
```json
{
  "hashes": ["abc123...", "def456...", "ghi789..."]
}
```

**Response (200):**
```json
{
  "exists": ["abc123..."],
  "missing": ["def456...", "ghi789..."]
}
```

### POST /chunks/upload-url

Get presigned upload URL.

**Request:**
```json
{
  "hash": "abc123...",
  "size": 65536,
  "compressed_size": 64000
}
```

**Response (200):**
```json
{
  "upload_url": "https://s3.amazonaws.com/bucket/...",
  "expires_at": "2025-01-08T15:00:00Z",
  "headers": {
    "Content-Type": "application/octet-stream",
    "x-amz-meta-hash": "abc123..."
  }
}
```

### POST /chunks/download-urls

Get presigned download URLs (batch).

**Request:**
```json
{
  "hashes": ["abc123...", "def456..."]
}
```

**Response (200):**
```json
{
  "urls": {
    "abc123...": {
      "url": "https://s3.amazonaws.com/...",
      "expires_at": "2025-01-08T15:00:00Z"
    },
    "def456...": {
      "url": "https://s3.amazonaws.com/...",
      "expires_at": "2025-01-08T15:00:00Z"
    }
  }
}
```

---

## Push/Pull Operations

### POST /repos/:owner/:name/push

Push commits to remote.

**Request:**
```json
{
  "branch": "main",
  "commits": [
    {
      "hash": "abc123...",
      "parent": "def456...",
      "message": "Add new footage",
      "author": { "name": "John", "email": "john@example.com" },
      "created_at": "2025-01-08T14:00:00Z",
      "manifest_hash": "manifest123..."
    }
  ],
  "force": false
}
```

**Response (200):**
```json
{
  "result": "success",
  "branch": "main",
  "old_head": "def456...",
  "new_head": "abc123...",
  "commits_pushed": 1
}
```

**Response (409 - Non-fast-forward):**
```json
{
  "error": {
    "code": "NON_FAST_FORWARD",
    "message": "Push rejected: non-fast-forward update",
    "details": {
      "remote_head": "xyz789...",
      "local_base": "def456..."
    }
  }
}
```

### POST /repos/:owner/:name/fetch

Fetch refs and objects from remote.

**Request:**
```json
{
  "refs": ["refs/heads/main", "refs/tags/*"],
  "depth": null  // null = full history
}
```

**Response (200):**
```json
{
  "refs": {
    "refs/heads/main": "abc123...",
    "refs/tags/v1.0": "def456..."
  },
  "commits": [
    {
      "hash": "abc123...",
      "manifest_hash": "manifest123..."
    }
  ],
  "chunks_needed": ["chunk1...", "chunk2..."]
}
```

### GET /repos/:owner/:name/refs

Get all refs.

**Response (200):**
```json
{
  "refs": {
    "HEAD": "ref: refs/heads/main",
    "refs/heads/main": "abc123...",
    "refs/heads/feature/vfx": "def456...",
    "refs/tags/v1.0": "ghi789..."
  }
}
```

---

## Organizations

### GET /orgs

List user's organizations.

**Response (200):**
```json
{
  "organizations": [
    {
      "id": "org_abc",
      "name": "acme-studios",
      "display_name": "Acme Studios",
      "avatar_url": "https://...",
      "role": "admin"
    }
  ]
}
```

### POST /orgs

Create organization.

**Request:**
```json
{
  "name": "new-studio",
  "display_name": "New Studio Inc",
  "email": "admin@newstudio.com"
}
```

**Response (201):** Organization object

### GET /orgs/:org

Get organization details.

**Response (200):**
```json
{
  "organization": {
    "id": "org_abc",
    "name": "acme-studios",
    "display_name": "Acme Studios",
    "avatar_url": "https://...",
    "email": "admin@acme.com",
    "created_at": "2024-01-01T00:00:00Z",
    "member_count": 25,
    "repo_count": 47,
    "plan": {
      "name": "enterprise",
      "storage_limit_bytes": null,
      "member_limit": null
    }
  }
}
```

### GET /orgs/:org/members

List organization members.

**Response (200):**
```json
{
  "members": [
    {
      "user": {
        "id": "usr_xyz",
        "username": "johndoe",
        "name": "John Doe"
      },
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### PUT /orgs/:org/members/:username

Add/update member.

**Request:**
```json
{
  "role": "member"  // "owner", "admin", "member", "guest"
}
```

**Response (200):** Member object

### DELETE /orgs/:org/members/:username

Remove member.

**Response (204):** No content

---

## Webhooks

### GET /repos/:owner/:name/webhooks

List webhooks.

**Response (200):**
```json
{
  "webhooks": [
    {
      "id": "hook_abc",
      "url": "https://ci.example.com/webhook",
      "events": ["push", "tag"],
      "active": true,
      "created_at": "2024-06-01T00:00:00Z",
      "last_delivery": {
        "status": "success",
        "delivered_at": "2025-01-08T14:00:00Z"
      }
    }
  ]
}
```

### POST /repos/:owner/:name/webhooks

Create webhook.

**Request:**
```json
{
  "url": "https://ci.example.com/webhook",
  "events": ["push", "tag", "lock"],
  "secret": "webhook_secret_123",
  "active": true
}
```

**Response (201):** Webhook object

### DELETE /repos/:owner/:name/webhooks/:webhook_id

Delete webhook.

**Response (204):** No content

---

## Search

### GET /search

Search across repositories, commits, files.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `type` | string | `repo`, `commit`, `file`, `user` |
| `repo` | string | Scope to repository |
| `extension` | string | Filter by file extension |

**Response (200):**
```json
{
  "results": {
    "repositories": [
      {
        "repository": { ... },
        "match": {
          "field": "name",
          "highlights": ["<em>commercial</em>-q1-2025"]
        }
      }
    ],
    "files": [
      {
        "repository": "acme/project",
        "path": "footage/scene01.mov",
        "commit": "abc123...",
        "match": {
          "field": "path",
          "highlights": ["footage/<em>scene01</em>.mov"]
        }
      }
    ]
  },
  "total_count": 47
}
```

---

## Health & Status

### GET /health

Health check.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

### GET /status

System status.

**Response (200):**
```json
{
  "status": "operational",
  "incidents": [],
  "scheduled_maintenance": null
}
```

---

## Rate Limits

| Endpoint Category | Authenticated | Unauthenticated |
|-------------------|---------------|-----------------|
| API (general) | 5000/hour | 60/hour |
| Search | 30/minute | 10/minute |
| Chunk upload | 1000/hour | N/A |
| Chunk download | 10000/hour | N/A |

---

## Versioning

API version is included in the URL path (`/v1/`). Breaking changes will increment the version. Non-breaking additions are made to existing versions.

Deprecation warnings are sent via `X-API-Deprecation` header.

---

## SDKs

Official SDKs available:
- **Rust**: `dits-sdk` (crates.io)
- **Python**: `dits-py` (PyPI)
- **JavaScript**: `@dits/sdk` (npm)
- **Go**: `github.com/dits-io/dits-go`

---

## Notes

- All timestamps are ISO 8601 in UTC
- All sizes are in bytes unless otherwise specified
- Binary data uses base64 encoding in JSON contexts
- Large responses may be streamed with `Transfer-Encoding: chunked`
