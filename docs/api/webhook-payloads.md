# Webhook Payload Schemas

Complete JSON schema definitions for all Dits webhook events.

## Common Payload Structure

All webhook payloads share this base structure:

```json
{
  "id": "evt_a1b2c3d4e5f6",
  "type": "push",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "delivery_id": "dlv_x9y8z7w6v5u4",
  "repository": { ... },
  "sender": { ... },
  "organization": { ... },
  "payload": { ... }
}
```

### Base Schema

```typescript
interface WebhookEvent {
  // Unique event ID
  id: string;

  // Event type (e.g., "push", "repo.created")
  type: string;

  // ISO 8601 timestamp
  timestamp: string;

  // Unique delivery ID (for deduplication)
  delivery_id: string;

  // Repository context
  repository: Repository;

  // User who triggered the event
  sender: User;

  // Organization (if applicable)
  organization?: Organization;

  // Event-specific payload
  payload: object;
}

interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  visibility: "public" | "private" | "internal";
  default_branch: string;
  created_at: string;
  updated_at: string;
  size_bytes: number;
  owner: User | Organization;
  clone_url: string;
  api_url: string;
  web_url: string;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  profile_url: string;
}

interface Organization {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
  profile_url: string;
}
```

## Push Events

### push

Triggered when commits are pushed to a branch.

```json
{
  "id": "evt_push_001",
  "type": "push",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "delivery_id": "dlv_abc123",
  "repository": {
    "id": "repo_xyz789",
    "name": "product-launch",
    "full_name": "acme-corp/product-launch",
    "description": "Product launch video project",
    "visibility": "private",
    "default_branch": "main",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "size_bytes": 10737418240,
    "owner": {
      "id": "org_acme",
      "name": "acme-corp",
      "display_name": "Acme Corporation",
      "avatar_url": "https://dits.io/avatars/acme.png",
      "profile_url": "https://dits.io/acme-corp"
    },
    "clone_url": "https://dits.io/acme-corp/product-launch.dits",
    "api_url": "https://api.dits.io/v1/repos/acme-corp/product-launch",
    "web_url": "https://dits.io/acme-corp/product-launch"
  },
  "sender": {
    "id": "user_jane",
    "username": "jane",
    "display_name": "Jane Developer",
    "email": "jane@acme.com",
    "avatar_url": "https://dits.io/avatars/jane.png",
    "profile_url": "https://dits.io/jane"
  },
  "payload": {
    "ref": "refs/heads/main",
    "ref_type": "branch",
    "before": "a1b2c3d4e5f6789012345678901234567890abcd",
    "after": "b2c3d4e5f6789012345678901234567890abcde1",
    "created": false,
    "deleted": false,
    "forced": false,
    "base_ref": null,
    "compare_url": "https://dits.io/acme-corp/product-launch/compare/a1b2c3d4...b2c3d4e5",
    "commits": [
      {
        "id": "b2c3d4e5f6789012345678901234567890abcde1",
        "tree_id": "c3d4e5f6789012345678901234567890abcde1f2",
        "message": "Add final color grade to hero sequence\n\nApplied LUT and secondary corrections.",
        "timestamp": "2024-01-15T10:29:00.000Z",
        "author": {
          "name": "Jane Developer",
          "email": "jane@acme.com",
          "username": "jane"
        },
        "committer": {
          "name": "Jane Developer",
          "email": "jane@acme.com",
          "username": "jane"
        },
        "url": "https://dits.io/acme-corp/product-launch/commit/b2c3d4e5",
        "added": [],
        "removed": [],
        "modified": [
          "sequences/hero.prproj",
          "footage/hero-shot.mp4"
        ]
      }
    ],
    "head_commit": {
      "id": "b2c3d4e5f6789012345678901234567890abcde1",
      "tree_id": "c3d4e5f6789012345678901234567890abcde1f2",
      "message": "Add final color grade to hero sequence",
      "timestamp": "2024-01-15T10:29:00.000Z",
      "author": {
        "name": "Jane Developer",
        "email": "jane@acme.com",
        "username": "jane"
      },
      "committer": {
        "name": "Jane Developer",
        "email": "jane@acme.com",
        "username": "jane"
      },
      "url": "https://dits.io/acme-corp/product-launch/commit/b2c3d4e5"
    },
    "pusher": {
      "name": "jane",
      "email": "jane@acme.com"
    },
    "total_commits_count": 1,
    "distinct_commits_count": 1,
    "files_changed": 2,
    "additions": 0,
    "deletions": 0,
    "size_delta_bytes": 524288
  }
}
```

### push.tag

Triggered when tags are pushed.

```json
{
  "id": "evt_push_tag_001",
  "type": "push.tag",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "delivery_id": "dlv_tag123",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "ref": "refs/tags/v1.0.0",
    "ref_type": "tag",
    "before": "0000000000000000000000000000000000000000",
    "after": "d4e5f6789012345678901234567890abcde1f23a",
    "created": true,
    "deleted": false,
    "forced": false,
    "tag": {
      "name": "v1.0.0",
      "sha": "d4e5f6789012345678901234567890abcde1f23a",
      "message": "Release v1.0.0\n\nFinal approved cut for product launch.",
      "tagger": {
        "name": "Jane Developer",
        "email": "jane@acme.com",
        "date": "2024-01-15T12:00:00.000Z"
      },
      "target": {
        "type": "commit",
        "sha": "b2c3d4e5f6789012345678901234567890abcde1"
      },
      "url": "https://dits.io/acme-corp/product-launch/releases/tag/v1.0.0"
    }
  }
}
```

### push.force

Triggered on force push.

```json
{
  "id": "evt_push_force_001",
  "type": "push.force",
  "timestamp": "2024-01-15T14:00:00.000Z",
  "delivery_id": "dlv_force123",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "ref": "refs/heads/feature-color",
    "ref_type": "branch",
    "before": "e5f6789012345678901234567890abcde1f23a4b",
    "after": "f6789012345678901234567890abcde1f23a4b5c",
    "created": false,
    "deleted": false,
    "forced": true,
    "force_reason": "rebase",
    "commits_removed": 3,
    "commits_added": 2,
    "commits": [
      {
        "id": "f6789012345678901234567890abcde1f23a4b5c",
        "message": "Squashed: Color grading improvements",
        "timestamp": "2024-01-15T13:55:00.000Z",
        "author": { "...": "..." }
      }
    ]
  }
}
```

## Repository Events

### repo.created

```json
{
  "id": "evt_repo_created_001",
  "type": "repo.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "delivery_id": "dlv_rc001",
  "repository": {
    "id": "repo_new123",
    "name": "new-project",
    "full_name": "acme-corp/new-project",
    "description": "A new video project",
    "visibility": "private",
    "default_branch": "main",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "size_bytes": 0,
    "owner": { "...": "..." },
    "clone_url": "https://dits.io/acme-corp/new-project.dits",
    "api_url": "https://api.dits.io/v1/repos/acme-corp/new-project",
    "web_url": "https://dits.io/acme-corp/new-project"
  },
  "sender": { "...": "..." },
  "organization": { "...": "..." },
  "payload": {
    "from_template": null,
    "from_fork": null,
    "settings": {
      "allow_merge_commit": true,
      "allow_squash_merge": true,
      "allow_rebase_merge": true,
      "delete_branch_on_merge": false,
      "has_lfs": true
    }
  }
}
```

### repo.deleted

```json
{
  "id": "evt_repo_deleted_001",
  "type": "repo.deleted",
  "timestamp": "2024-06-01T00:00:00.000Z",
  "delivery_id": "dlv_rd001",
  "repository": {
    "id": "repo_old456",
    "name": "archived-project",
    "full_name": "acme-corp/archived-project",
    "...": "..."
  },
  "sender": { "...": "..." },
  "payload": {
    "deletion_type": "soft",
    "recoverable_until": "2024-07-01T00:00:00.000Z",
    "storage_freed_bytes": 53687091200,
    "chunks_freed": 12500,
    "reason": "Project completed, archiving to cold storage"
  }
}
```

### repo.settings_changed

```json
{
  "id": "evt_repo_settings_001",
  "type": "repo.settings_changed",
  "timestamp": "2024-01-15T16:00:00.000Z",
  "delivery_id": "dlv_rs001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "changes": {
      "visibility": {
        "from": "private",
        "to": "public"
      },
      "description": {
        "from": "Old description",
        "to": "New description"
      }
    }
  }
}
```

## Branch Events

### branch.created

```json
{
  "id": "evt_branch_created_001",
  "type": "branch.created",
  "timestamp": "2024-01-15T09:00:00.000Z",
  "delivery_id": "dlv_bc001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "ref": "refs/heads/feature-audio-mix",
    "ref_type": "branch",
    "branch": "feature-audio-mix",
    "sha": "a1b2c3d4e5f6789012345678901234567890abcd",
    "base_branch": "main",
    "base_sha": "a1b2c3d4e5f6789012345678901234567890abcd"
  }
}
```

### branch.deleted

```json
{
  "id": "evt_branch_deleted_001",
  "type": "branch.deleted",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "delivery_id": "dlv_bd001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "ref": "refs/heads/feature-audio-mix",
    "ref_type": "branch",
    "branch": "feature-audio-mix",
    "sha": "b2c3d4e5f6789012345678901234567890abcde1",
    "merged": true,
    "merged_into": "main",
    "merged_at": "2024-01-20T09:55:00.000Z"
  }
}
```

### branch.protection

```json
{
  "id": "evt_branch_protection_001",
  "type": "branch.protection",
  "timestamp": "2024-01-10T08:00:00.000Z",
  "delivery_id": "dlv_bp001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "branch": "main",
    "action": "updated",
    "protection_rules": {
      "require_signed_commits": true,
      "require_linear_history": false,
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_approving_review_count": 2,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_status_checks": [
        "ci/render-test",
        "ci/codec-validation"
      ],
      "enforce_admins": true,
      "restrictions": {
        "users": ["lead-editor"],
        "teams": ["video-leads"]
      }
    },
    "changes": {
      "required_approving_review_count": {
        "from": 1,
        "to": 2
      }
    }
  }
}
```

## Lock Events

### lock.acquired

```json
{
  "id": "evt_lock_acquired_001",
  "type": "lock.acquired",
  "timestamp": "2024-01-15T08:00:00.000Z",
  "delivery_id": "dlv_la001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "lock": {
      "id": "lock_abc123",
      "path": "sequences/main.prproj",
      "locked_at": "2024-01-15T08:00:00.000Z",
      "expires_at": "2024-01-15T20:00:00.000Z",
      "owner": {
        "id": "user_jane",
        "username": "jane",
        "display_name": "Jane Developer"
      },
      "reason": "Editing main sequence",
      "exclusive": true
    }
  }
}
```

### lock.released

```json
{
  "id": "evt_lock_released_001",
  "type": "lock.released",
  "timestamp": "2024-01-15T17:00:00.000Z",
  "delivery_id": "dlv_lr001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "lock": {
      "id": "lock_abc123",
      "path": "sequences/main.prproj",
      "locked_at": "2024-01-15T08:00:00.000Z",
      "released_at": "2024-01-15T17:00:00.000Z",
      "owner": {
        "id": "user_jane",
        "username": "jane",
        "display_name": "Jane Developer"
      },
      "release_type": "manual",
      "held_duration_seconds": 32400
    }
  }
}
```

### lock.force_released

```json
{
  "id": "evt_lock_force_released_001",
  "type": "lock.force_released",
  "timestamp": "2024-01-16T10:00:00.000Z",
  "delivery_id": "dlv_lfr001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "lock": {
      "id": "lock_def456",
      "path": "sequences/intro.prproj",
      "original_owner": {
        "id": "user_bob",
        "username": "bob",
        "display_name": "Bob Editor"
      },
      "released_by": {
        "id": "user_admin",
        "username": "admin",
        "display_name": "Admin User"
      },
      "reason": "User on vacation, needed for urgent fix"
    }
  }
}
```

## LFS Events

### lfs.upload

```json
{
  "id": "evt_lfs_upload_001",
  "type": "lfs.upload",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "delivery_id": "dlv_lu001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "objects": [
      {
        "oid": "sha256:a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678",
        "size": 1073741824,
        "path": "footage/hero-shot.mp4",
        "uploaded_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total_size_bytes": 1073741824,
    "total_objects": 1,
    "duration_seconds": 45
  }
}
```

### lfs.download

```json
{
  "id": "evt_lfs_download_001",
  "type": "lfs.download",
  "timestamp": "2024-01-15T11:00:00.000Z",
  "delivery_id": "dlv_ld001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "objects": [
      {
        "oid": "sha256:a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678",
        "size": 1073741824,
        "path": "footage/hero-shot.mp4",
        "downloaded_at": "2024-01-15T11:00:00.000Z"
      }
    ],
    "total_size_bytes": 1073741824,
    "total_objects": 1,
    "cache_hit": false,
    "duration_seconds": 30
  }
}
```

## Member Events

### member.added

```json
{
  "id": "evt_member_added_001",
  "type": "member.added",
  "timestamp": "2024-01-05T10:00:00.000Z",
  "delivery_id": "dlv_ma001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "organization": { "...": "..." },
  "payload": {
    "member": {
      "id": "user_neweditor",
      "username": "neweditor",
      "display_name": "New Editor",
      "email": "neweditor@acme.com"
    },
    "role": "editor",
    "permissions": {
      "push": true,
      "pull": true,
      "admin": false,
      "maintain": false
    },
    "invitation": {
      "id": "inv_xyz789",
      "inviter": {
        "id": "user_jane",
        "username": "jane"
      },
      "sent_at": "2024-01-04T15:00:00.000Z",
      "accepted_at": "2024-01-05T10:00:00.000Z"
    }
  }
}
```

### member.removed

```json
{
  "id": "evt_member_removed_001",
  "type": "member.removed",
  "timestamp": "2024-02-01T12:00:00.000Z",
  "delivery_id": "dlv_mr001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "member": {
      "id": "user_oldeditor",
      "username": "oldeditor",
      "display_name": "Old Editor"
    },
    "previous_role": "editor",
    "removal_reason": "project_complete",
    "active_locks_transferred_to": "user_jane"
  }
}
```

### member.role_changed

```json
{
  "id": "evt_member_role_001",
  "type": "member.role_changed",
  "timestamp": "2024-01-20T14:00:00.000Z",
  "delivery_id": "dlv_mrc001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "member": {
      "id": "user_jane",
      "username": "jane",
      "display_name": "Jane Developer"
    },
    "previous_role": "editor",
    "new_role": "admin",
    "permissions_changed": {
      "admin": {
        "from": false,
        "to": true
      },
      "maintain": {
        "from": false,
        "to": true
      }
    }
  }
}
```

## Asset Events

### asset.uploaded

```json
{
  "id": "evt_asset_uploaded_001",
  "type": "asset.uploaded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "delivery_id": "dlv_au001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "asset": {
      "id": "asset_video001",
      "path": "footage/hero-shot.mp4",
      "hash": "blake3:a1b2c3d4e5f6789012345678901234567890abcd",
      "size_bytes": 1073741824,
      "mime_type": "video/mp4",
      "metadata": {
        "duration_ms": 180000,
        "width": 3840,
        "height": 2160,
        "frame_rate": 23.976,
        "codec": "h264",
        "audio_tracks": 2,
        "timecode_start": "01:00:00:00"
      }
    },
    "chunks_created": 16384,
    "deduplicated_chunks": 0,
    "storage_used_bytes": 1073741824,
    "commit": {
      "sha": "b2c3d4e5f6789012345678901234567890abcde1",
      "message": "Add hero shot footage"
    }
  }
}
```

### asset.transcoded

```json
{
  "id": "evt_asset_transcoded_001",
  "type": "asset.transcoded",
  "timestamp": "2024-01-15T11:30:00.000Z",
  "delivery_id": "dlv_at001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "source_asset": {
      "id": "asset_video001",
      "path": "footage/hero-shot.mp4",
      "hash": "blake3:a1b2c3d4e5f6789012345678901234567890abcd"
    },
    "outputs": [
      {
        "preset": "proxy_1080p",
        "path": "proxies/hero-shot.proxy.mp4",
        "size_bytes": 107374182,
        "resolution": "1920x1080",
        "codec": "h264",
        "bitrate": 5000000
      },
      {
        "preset": "thumbnail",
        "path": "thumbnails/hero-shot.jpg",
        "size_bytes": 102400,
        "resolution": "320x180"
      }
    ],
    "job_duration_seconds": 3600,
    "worker_id": "worker_001"
  }
}
```

## Webhook Events

### webhook.ping

Sent when a webhook is first created or tested.

```json
{
  "id": "evt_ping_001",
  "type": "webhook.ping",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "delivery_id": "dlv_ping001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "hook_id": "hook_abc123",
    "hook": {
      "id": "hook_abc123",
      "url": "https://ci.example.com/webhook",
      "events": ["push", "lock.acquired"],
      "active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "zen": "Keep your edits small and focused."
  }
}
```

## Render/Export Events

### render.started

```json
{
  "id": "evt_render_started_001",
  "type": "render.started",
  "timestamp": "2024-01-15T18:00:00.000Z",
  "delivery_id": "dlv_rs001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "job": {
      "id": "render_job_001",
      "type": "export",
      "preset": "prores_4444",
      "source": {
        "type": "sequence",
        "path": "sequences/main.prproj",
        "sequence_name": "Final Cut"
      },
      "output": {
        "path": "renders/final_cut.mov",
        "estimated_size_bytes": 53687091200
      },
      "started_at": "2024-01-15T18:00:00.000Z",
      "estimated_duration_seconds": 7200
    }
  }
}
```

### render.completed

```json
{
  "id": "evt_render_completed_001",
  "type": "render.completed",
  "timestamp": "2024-01-15T20:00:00.000Z",
  "delivery_id": "dlv_rc001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "job": {
      "id": "render_job_001",
      "type": "export",
      "preset": "prores_4444",
      "status": "success",
      "started_at": "2024-01-15T18:00:00.000Z",
      "completed_at": "2024-01-15T20:00:00.000Z",
      "duration_seconds": 7200
    },
    "output": {
      "path": "renders/final_cut.mov",
      "size_bytes": 53687091200,
      "hash": "blake3:e5f6789012345678901234567890abcde1f23a4b",
      "download_url": "https://dits.io/acme-corp/product-launch/renders/final_cut.mov"
    },
    "metrics": {
      "frames_rendered": 216000,
      "avg_frame_time_ms": 33.3,
      "peak_memory_bytes": 17179869184
    }
  }
}
```

### render.failed

```json
{
  "id": "evt_render_failed_001",
  "type": "render.failed",
  "timestamp": "2024-01-15T19:00:00.000Z",
  "delivery_id": "dlv_rf001",
  "repository": { "...": "..." },
  "sender": { "...": "..." },
  "payload": {
    "job": {
      "id": "render_job_002",
      "type": "export",
      "preset": "h264_web",
      "status": "failed",
      "started_at": "2024-01-15T18:30:00.000Z",
      "failed_at": "2024-01-15T19:00:00.000Z"
    },
    "error": {
      "code": "CODEC_ERROR",
      "message": "Unsupported pixel format for H.264 encoder",
      "frame": 45000,
      "timecode": "00:31:15:00",
      "recoverable": false,
      "suggestions": [
        "Convert source to 8-bit before encoding",
        "Use ProRes intermediate"
      ]
    }
  }
}
```

## Delivery Headers

All webhook deliveries include these HTTP headers:

```http
POST /webhook HTTP/1.1
Host: your-server.com
Content-Type: application/json
User-Agent: Dits-Hookshot/1.0
X-Dits-Event: push
X-Dits-Delivery: dlv_abc123
X-Dits-Signature: sha256=a1b2c3d4e5f6...
X-Dits-Signature-256: sha256=a1b2c3d4e5f6...
X-Dits-Hook-ID: hook_xyz789
X-Dits-Hook-Installation-Target-ID: repo_123
X-Dits-Hook-Installation-Target-Type: repository
```

## Signature Verification

Verify webhook authenticity using HMAC-SHA256:

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

pub fn verify_signature(
    secret: &[u8],
    payload: &[u8],
    signature: &str,
) -> bool {
    // Parse signature header
    let expected = signature
        .strip_prefix("sha256=")
        .and_then(|s| hex::decode(s).ok());

    let expected = match expected {
        Some(e) => e,
        None => return false,
    };

    // Compute HMAC
    let mut mac = Hmac::<Sha256>::new_from_slice(secret)
        .expect("HMAC can take key of any size");
    mac.update(payload);

    // Constant-time comparison
    mac.verify_slice(&expected).is_ok()
}
```

```javascript
// Node.js example
const crypto = require('crypto');

function verifySignature(secret, payload, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const sig = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(sig)
  );
}
```

## TypeScript Definitions

Complete TypeScript definitions for all payloads:

```typescript
// types/webhooks.d.ts

export type WebhookEventType =
  | 'push'
  | 'push.tag'
  | 'push.force'
  | 'repo.created'
  | 'repo.deleted'
  | 'repo.settings_changed'
  | 'branch.created'
  | 'branch.deleted'
  | 'branch.protection'
  | 'lock.acquired'
  | 'lock.released'
  | 'lock.force_released'
  | 'lfs.upload'
  | 'lfs.download'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'asset.uploaded'
  | 'asset.transcoded'
  | 'webhook.ping'
  | 'render.started'
  | 'render.completed'
  | 'render.failed';

export interface WebhookEvent<T extends WebhookEventType, P> {
  id: string;
  type: T;
  timestamp: string;
  delivery_id: string;
  repository: Repository;
  sender: User;
  organization?: Organization;
  payload: P;
}

export type PushEvent = WebhookEvent<'push', PushPayload>;
export type RepoCreatedEvent = WebhookEvent<'repo.created', RepoCreatedPayload>;
// ... etc

export interface PushPayload {
  ref: string;
  ref_type: 'branch' | 'tag';
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: string | null;
  compare_url: string;
  commits: Commit[];
  head_commit: Commit;
  pusher: { name: string; email: string };
  total_commits_count: number;
  distinct_commits_count: number;
  files_changed: number;
  additions: number;
  deletions: number;
  size_delta_bytes: number;
}

// ... additional type definitions
```

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:

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

A delivery is considered failed if:
- Connection timeout (30 seconds)
- HTTP status >= 400
- Response timeout (60 seconds)
- Network error
