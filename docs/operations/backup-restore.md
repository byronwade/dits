# Backup and Disaster Recovery Guide

**Maturity:** Design

Dits has no supported backup format, remote durability promise, point-in-time recovery service, or automated disaster-recovery contract. For alpha experiments, stop repository mutation, copy the working tree and complete .dits directory as one unit, restore into a separate path, and run dits fsck before trusting the copy.

The previous cloud-service procedures were not valid runbooks for the current local
product. See [`../STATUS.md`](../STATUS.md),
[`../user-guide/cli-reference.md`](../user-guide/cli-reference.md), and
[`../performance/benchmarks.md`](../performance/benchmarks.md) where relevant.
Operational guarantees require an implemented service and retained verification
evidence.
