# CI/CD Integration Guide

**Maturity:** Current

Dits can run local CLI operations in an isolated CI workspace when the runner has a
supported binary or builds the Rust workspace from source. Dits does not provide token
authentication, network clone, remote push/pull, artifact hosting, webhooks, or an
official CI action/orb/plugin.

A bounded local check can set commit identity through the environment and exercise a
repository already present in the job workspace:

    export DITS_AUTHOR_NAME="CI"
    export DITS_AUTHOR_EMAIL="ci@example.com"
    dits status
    dits fsck

Use `dits <command> --help` for the exact command surface. Do not add remote transfer
steps expecting success; `push`, `pull`, `fetch`, and `sync` fail closed.

See [`../STATUS.md`](../STATUS.md), the
[installation boundary](../user-guide/getting-started.md), and the
[contributor test plan](../testing/test-plan.md).
