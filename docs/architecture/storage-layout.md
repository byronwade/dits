# Storage Layout Specification

Object storage organization for chunks, manifests, and metadata.

---

## Overview

Dits uses object storage (S3, GCS, Azure Blob) for chunk persistence. This document defines the storage layout, naming conventions, and organizational structure.

---

## Bucket Structure

### Single-Tenant (Self-Hosted)

```
dits-storage/
├── v1/
│   ├── chunks/
│   │   ├── 00/
│   │   │   ├── 00xxxxxx...
│   │   │   └── ...
│   │   ├── 01/
│   │   └── ff/
│   ├── manifests/
│   │   ├── {repo_id}/
│   │   │   ├── {commit_hash}.manifest
│   │   │   └── ...
│   │   └── ...
│   ├── proxies/
│   │   ├── {repo_id}/
│   │   │   ├── {asset_hash}/
│   │   │   │   ├── 1080p.mp4
│   │   │   │   ├── 720p.mp4
│   │   │   │   └── thumbnail.jpg
│   │   │   └── ...
│   │   └── ...
│   └── metadata/
│       ├── repos/
│       │   └── {repo_id}.json
│       └── bloom/
│           └── {repo_id}.bloom
```

### Multi-Tenant (SaaS)

```
dits-{region}-{tenant_id}/
├── v1/
│   ├── chunks/
│   │   └── ... (same structure)
│   ├── manifests/
│   │   └── ...
│   └── ...
```

---

## Object Key Formats

### Chunks

```
v1/chunks/{hash[0:2]}/{hash[2:4]}/{hash}
```

**Example:**
```
v1/chunks/a1/b2/a1b2c3d4e5f6...
```

**Rationale:**
- Two-level directory hashing prevents too many objects in one prefix
- Hash prefix = ~65,536 possible directories
- Each directory handles ~15,000 chunks before S3 listing issues
- Supports ~1 billion chunks per bucket

### Manifests

```
v1/manifests/{repo_id}/{commit_hash}.manifest
```

**Example:**
```
v1/manifests/550e8400-e29b-41d4-a716-446655440000/abc123def456.manifest
```

### Proxies

```
v1/proxies/{repo_id}/{asset_hash}/{resolution}.{format}
```

**Example:**
```
v1/proxies/550e8400.../a1b2c3.../1080p.mp4
v1/proxies/550e8400.../a1b2c3.../720p.mp4
v1/proxies/550e8400.../a1b2c3.../thumb-01.jpg
```

### Metadata

```
v1/metadata/{type}/{id}.{ext}
```

**Types:**
- `repos/{repo_id}.json` - Repository metadata cache
- `bloom/{repo_id}.bloom` - Chunk Bloom filters
- `stats/{repo_id}.json` - Statistics snapshots

---

## Storage Classes

### Class Mapping

| Dits Class | AWS S3 | GCS | Azure |
|------------|--------|-----|-------|
| hot | STANDARD | STANDARD | Hot |
| warm | STANDARD_IA | NEARLINE | Cool |
| cold | GLACIER | COLDLINE | Cold |
| archive | DEEP_ARCHIVE | ARCHIVE | Archive |

### Lifecycle Rules

```json
{
  "Rules": [
    {
      "ID": "TransitionToWarm",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "v1/chunks/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "ID": "TransitionToCold",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "v1/chunks/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "ID": "TransitionToArchive",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "v1/chunks/"
      },
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "ID": "CleanupDeletedChunks",
      "Status": "Enabled",
      "Filter": {
        "Tag": {
          "Key": "dits:status",
          "Value": "deleted"
        }
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

---

## Object Metadata

### Chunk Metadata

```
x-amz-meta-dits-version: 1
x-amz-meta-dits-type: chunk
x-amz-meta-dits-hash: a1b2c3d4e5f6...
x-amz-meta-dits-size: 65536
x-amz-meta-dits-compressed-size: 64000
x-amz-meta-dits-compression: zstd
x-amz-meta-dits-encrypted: true
x-amz-meta-dits-key-id: key-123
x-amz-meta-dits-created-at: 2025-01-08T12:00:00Z
```

### Manifest Metadata

```
x-amz-meta-dits-version: 1
x-amz-meta-dits-type: manifest
x-amz-meta-dits-repo-id: 550e8400-...
x-amz-meta-dits-commit: abc123def456
x-amz-meta-dits-parent: def456789abc
x-amz-meta-dits-entries: 1234
x-amz-meta-dits-total-size: 10737418240
```

### Tags

```
dits:type = chunk | manifest | proxy | metadata
dits:repo = {repo_id}
dits:status = active | deleted
dits:tier = hot | warm | cold | archive
```

---

## Replication

### Cross-Region Replication

```json
{
  "Role": "arn:aws:iam::account:role/dits-replication",
  "Rules": [
    {
      "ID": "ReplicateChunks",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "v1/chunks/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::dits-storage-eu-west-1",
        "StorageClass": "STANDARD"
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    },
    {
      "ID": "ReplicateManifests",
      "Status": "Enabled",
      "Priority": 2,
      "Filter": {
        "Prefix": "v1/manifests/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::dits-storage-eu-west-1",
        "StorageClass": "STANDARD"
      }
    }
  ]
}
```

### Multi-Region Read Configuration

```rust
pub struct MultiRegionStorage {
    /// Primary region for writes
    primary_region: String,

    /// Read replicas by region
    replicas: HashMap<String, S3Client>,

    /// Region selection strategy
    strategy: RegionStrategy,
}

pub enum RegionStrategy {
    /// Use nearest region
    NearestLatency,

    /// Use region with lowest cost
    LowestCost,

    /// Always use primary
    PrimaryOnly,

    /// Round-robin across regions
    RoundRobin,
}

impl MultiRegionStorage {
    /// Get chunk from nearest region
    pub async fn get_chunk(&self, hash: &str, client_region: &str) -> Result<Vec<u8>> {
        let region = self.select_region(client_region);
        let client = self.replicas.get(&region).unwrap_or(&self.primary);

        let key = format!("v1/chunks/{}/{}/{}", &hash[0..2], &hash[2..4], hash);

        client.get_object()
            .bucket(&self.bucket_for_region(&region))
            .key(&key)
            .send()
            .await?
            .body
            .collect()
            .await
            .map(|b| b.to_vec())
    }
}
```

---

## Access Patterns

### Direct Upload (Presigned URLs)

```rust
/// Generate presigned URL for chunk upload
pub async fn create_upload_url(
    &self,
    hash: &str,
    size: usize,
    ttl: Duration,
) -> Result<PresignedUrl> {
    let key = self.chunk_key(hash);

    let presigned = self.client
        .put_object()
        .bucket(&self.bucket)
        .key(&key)
        .content_length(size as i64)
        .content_type("application/octet-stream")
        .metadata("dits-hash", hash)
        .presigned(PresigningConfig::builder()
            .expires_in(ttl)
            .build()?)
        .await?;

    Ok(PresignedUrl {
        url: presigned.uri().to_string(),
        headers: presigned.headers().clone(),
        expires_at: Utc::now() + ttl,
    })
}
```

### Direct Download (Presigned URLs)

```rust
/// Generate presigned URL for chunk download
pub async fn create_download_url(
    &self,
    hash: &str,
    ttl: Duration,
) -> Result<PresignedUrl> {
    let key = self.chunk_key(hash);

    let presigned = self.client
        .get_object()
        .bucket(&self.bucket)
        .key(&key)
        .presigned(PresigningConfig::builder()
            .expires_in(ttl)
            .build()?)
        .await?;

    Ok(PresignedUrl {
        url: presigned.uri().to_string(),
        headers: HashMap::new(),
        expires_at: Utc::now() + ttl,
    })
}
```

### Batch Operations

```rust
/// List chunks by prefix
pub async fn list_chunks(&self, prefix: &str) -> Result<Vec<ChunkInfo>> {
    let mut chunks = Vec::new();
    let mut continuation_token = None;

    loop {
        let mut request = self.client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(format!("v1/chunks/{}", prefix));

        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }

        let response = request.send().await?;

        for object in response.contents.unwrap_or_default() {
            if let Some(key) = object.key {
                let hash = key.rsplit('/').next().unwrap_or("");
                chunks.push(ChunkInfo {
                    hash: hash.to_string(),
                    size: object.size.unwrap_or(0) as u64,
                    storage_class: object.storage_class
                        .map(|s| s.as_str().to_string())
                        .unwrap_or_else(|| "STANDARD".to_string()),
                    last_modified: object.last_modified,
                });
            }
        }

        if response.is_truncated.unwrap_or(false) {
            continuation_token = response.next_continuation_token;
        } else {
            break;
        }
    }

    Ok(chunks)
}

/// Delete chunks in batch
pub async fn delete_chunks(&self, hashes: &[String]) -> Result<DeleteResult> {
    let objects: Vec<_> = hashes.iter()
        .map(|h| ObjectIdentifier::builder()
            .key(self.chunk_key(h))
            .build())
        .collect::<Result<Vec<_>, _>>()?;

    let delete = Delete::builder()
        .set_objects(Some(objects))
        .build()?;

    let response = self.client
        .delete_objects()
        .bucket(&self.bucket)
        .delete(delete)
        .send()
        .await?;

    Ok(DeleteResult {
        deleted: response.deleted.unwrap_or_default().len(),
        errors: response.errors.unwrap_or_default().len(),
    })
}
```

---

## Encryption

### Server-Side Encryption

```json
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:us-east-1:account:key/key-id"
      },
      "BucketKeyEnabled": true
    }
  ]
}
```

### Client-Side Encryption

Chunks are encrypted before upload using convergent encryption:

```rust
/// Encrypt chunk before upload
pub fn encrypt_chunk(data: &[u8], user_key: &[u8; 32]) -> EncryptedChunk {
    // Derive content key from content hash + user key
    let content_hash = blake3::hash(data);
    let key = derive_chunk_key(content_hash.as_bytes(), user_key);

    // Encrypt with AES-256-GCM
    let cipher = Aes256Gcm::new(&key.into());
    let nonce = Nonce::from_slice(&content_hash.as_bytes()[0..12]);
    let ciphertext = cipher.encrypt(nonce, data).unwrap();

    EncryptedChunk {
        ciphertext,
        key_derivation: KeyDerivation::Convergent,
    }
}
```

---

## Monitoring

### Metrics to Track

```
dits_storage_objects_total{type="chunk|manifest|proxy"}
dits_storage_bytes_total{type="chunk|manifest|proxy", class="hot|warm|cold"}
dits_storage_requests_total{operation="get|put|delete", status="success|error"}
dits_storage_latency_seconds{operation="get|put", region="us-east-1"}
dits_storage_bandwidth_bytes{direction="in|out"}
```

### Cost Monitoring

```sql
-- Daily storage cost estimate
SELECT
    DATE(calculated_at) as date,
    SUM(storage_bytes) as total_bytes,
    SUM(storage_bytes) / 1e12 * 0.023 as estimated_cost_usd
FROM repository_stats
GROUP BY DATE(calculated_at)
ORDER BY date DESC;
```

---

## Backup and Recovery

### Versioning

```json
{
  "Status": "Enabled",
  "MFADelete": "Disabled"
}
```

### Point-in-Time Recovery

1. Enable S3 versioning
2. Configure cross-region replication
3. Use AWS Backup for scheduled snapshots

```bash
# Restore deleted chunk
aws s3api list-object-versions \
    --bucket dits-storage \
    --prefix "v1/chunks/a1/b2/a1b2c3..." \
    --query 'DeleteMarkers[0].VersionId'

aws s3api delete-object \
    --bucket dits-storage \
    --key "v1/chunks/a1/b2/a1b2c3..." \
    --version-id "delete-marker-version-id"
```

---

## Capacity Planning

### Sizing Estimates

| Repository Size | Avg Chunk Size | Chunks | Storage (with dedup) |
|-----------------|----------------|--------|----------------------|
| 100 GB | 64 KB | 1.6M | 50-80 GB |
| 1 TB | 64 KB | 16M | 500-800 GB |
| 10 TB | 64 KB | 160M | 5-8 TB |
| 100 TB | 64 KB | 1.6B | 50-80 TB |

### S3 Limits to Consider

- 5 TB max object size
- 5 GB max single PUT
- 3,500 PUT/s per prefix
- 5,500 GET/s per prefix

### Mitigation Strategies

1. **Hash-based sharding**: Two-level directories distribute load
2. **Request throttling**: Client-side rate limiting
3. **Multipart upload**: For chunks > 100MB
4. **CDN caching**: CloudFront for read-heavy workloads

---

## Notes

- Always use versioning for production buckets
- Enable access logging for audit trail
- Use S3 Intelligent-Tiering for unpredictable access patterns
- Consider S3 Express One Zone for hot data
- Monitor 4xx/5xx errors for early warning
