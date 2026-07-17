# Workflow: Daily Local Work

**Maturity:** Current

Use a backed-up repository, inspect status, stage explicit paths, commit, and verify
history locally:

    dits status
    dits add path/to/asset
    dits diff --staged
    dits commit -m "Describe the asset change"
    dits log --oneline

Branches, tags, local locks, and local filesystem clone are available. Remote transfer,
hosted review, remote locks, and shared authorization are not part of this workflow.

See [`../STATUS.md`](../STATUS.md), the
[current CLI reference](../user-guide/cli-reference.md), and
[Getting Started](../user-guide/getting-started.md).
