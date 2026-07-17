# Lock (The Guardian)

**Maturity:** Current

Dits stores advisory local binary locks in `.dits/locks.json` with a path, owner,
acquisition and expiry timestamps, and optional reason. There is no remote lock
coordinator, authoritative multi-user lease service, or hosted enforcement policy.

See [implementation status](../STATUS.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
