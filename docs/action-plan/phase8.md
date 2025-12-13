# Engineering Execution Manual — Phase 8 (Deep Freeze)

**Project:** Dits (Data-Intensive Version Control System)  
**Phase:** 8 — Deep Freeze Layer (Lifecycle Management)  
**Objective:** Tier petabyte-scale storage by temperature; keep manifests and proxies hot, push cold data to Glacier/Archive while preserving usability and predictable thaw.

---

## Alignment with README (core ground rules)
- Preserve object immutability: tiering changes storage class, never bytes or IDs.
- Keep manifests and proxies hot to maintain instant browsing and deterministic checkouts.
- Surface costs/latency clearly (no silent thaw); align with safety/performance targets.
- Prefer standards-based storage policies (S3 lifecycle/tags) over bespoke logic where possible.
- Couple lifecycle with fsck/quarantine: detect corrupt cold objects early; allow opt-in re-fetch from remote or mark as suspect.

---

## Core Concept: Temperature-Based Storage
- Hot: editing; NVMe + S3 Standard, sub-100ms.  
- Warm: recent (≤30d); S3 Intelligent-Tiering/B2; sub-second.  
- Cold: idle (6+ months); Glacier Instant; minutes.  
- Deep: archive (2+ years); Glacier Deep Archive/LTO; 12–48h with async thaw workflow.

---

## Storage Backend
Object storage tiers (example AWS):
| Tier | AWS Class | Cost | Retrieval | Dits behavior |
| :--- | :--- | :--- | :--- | :--- |
| Hot | STANDARD | ~$23/TB | ms | Immediate streaming |
| Warm | INTELLIGENT_TIERING | ~$12–23/TB | ms | Immediate |
| Cold | GLACIER_INSTANT | ~$4/TB | ms | Immediate (higher fee) |
| Deep | DEEP_ARCHIVE | ~$1/TB | 12–48h | Thaw required UX |

---

## Architecture Components
### Reference Counter (Brain)
Tracks last access/ref counts; only freeze when all references are cold.
```sql
CREATE TABLE chunk_access_log (
    chunk_hash TEXT PRIMARY KEY,
    last_accessed_at TIMESTAMP,
    ref_count INT,
    storage_class TEXT DEFAULT 'HOT' -- HOT/WARM/COLD/DEEP
);
```

### Reaper (Background Worker)
Nightly: find cold candidates, update storage_class/tag to trigger tier transition.

### Thaw Manager (Async Queue)
Deep-frozen access returns 423/“Frozen”; client prompts cost/time, user confirms; server issues RestoreObject, notifies when hot.

---

## Implementation Sprints
### Sprint 1: Access Tracker
- Buffer access events (pull/VFS reads) in Redis; flush hourly to Postgres to update `last_accessed_at`.

### Sprint 2: Lifecycle Policy Manager
- Use S3 tags + lifecycle rules; worker sets `dits_status=deep` to let S3 move objects (no re-upload).

### Sprint 3: Ghost Manifest UX
- Keep manifests and proxies hot; browsing `dits log`/`ls` works instantly; only blobs freeze.

### Sprint 4: Restoration API
- `POST /api/assets/{hash}/thaw`: if deep, call `restore_object(..., Days=7)`, return pending + ETA; client shows defrost progress.

---

## Real-World Solutions
### Preview Problem
- Never freeze proxies; decade of proxies stays hot so users can preview before thawing masters.

### Cost Shock
- Cost estimation middleware: sum missing chunk sizes * provider retrieval rate; warn before thaw.

### Partial Restore
- Asset-level thaw: right-click `Restore High-Res` to thaw only required chunks via VFS integration.

---

## Phase 8 Verification Tests
- Freezer Burn: deep-tagged chunk fetch fails with archived state.  
- Proxy Browsing: archived project still playable via proxies; no media-offline.  
- Thaw Cycle: request thaw, poll until restored, then `dits pull` succeeds.

---

## Immediate Code Action
```bash
# In dits-server
cargo add aws-config
cargo add aws-sdk-s3
cargo add chrono
```
Next: implement Lifecycle Manager to evaluate access/refs, tag objects for tiering, and issue restores with ETA handling.


