# Troubleshooting Guide

**Maturity:** Current

Start with [`../STATUS.md`](../STATUS.md) and inspect the exact command surface with
`dits --help` or `dits <command> --help`.

## Expected alpha behavior

- `push`, `pull`, `fetch`, and `sync` return nonzero without changing
  repository data.
- Network clone is unavailable; local filesystem clone is supported.
- Destructive garbage collection is disabled; `dits gc --dry-run` reports candidates.
- Repository encryption setup and login fail closed.
- `dits serve` is unauthenticated and must stay on trusted or isolated networks.
- The npm artifact contains only the binary targets listed in
  [`../STATUS.md`](../STATUS.md).

## Local diagnosis

    dits --version
    dits status
    dits fsck
    dits <command> --help

Preserve the repository before manual repair. Report reproducible defects through the
project issue tracker; security reports follow
[`../../SECURITY.md`](../../SECURITY.md).
