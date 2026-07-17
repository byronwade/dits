# Workflow: Disaster Recovery

**Maturity:** Design

Dits has no supported backup format, remote durability promise, or automated recovery
service. For alpha evaluation, preserve the working tree and complete `.dits/`
directory together, stop mutation while copying, restore into a separate location, and
run `dits fsck`. This is conservative experimental practice, not a durability SLA.

See [`../STATUS.md`](../STATUS.md), the
[current CLI reference](../user-guide/cli-reference.md), and
[Getting Started](../user-guide/getting-started.md).
