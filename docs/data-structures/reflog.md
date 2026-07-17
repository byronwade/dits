# Reflog Data Structure

**Maturity:** Current

Local reflog commands record and inspect ref movement as an undo aid. The on-disk representation is an implementation detail; no remote reflog replication, retention service, or stable public schema is promised.

See [current CLI reference](../user-guide/cli-reference.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
