# Workflow: First-Time Local Setup

**Maturity:** Current

Follow [Getting Started](../user-guide/getting-started.md) for supported installation
targets or a source build. Set the identity consumed by commits, then evaluate locally:

    export DITS_AUTHOR_NAME="Your Name"
    export DITS_AUTHOR_EMAIL="you@example.com"
    dits init my-project
    cd my-project
    dits add .
    dits commit -m "Initial snapshot"
    dits fsck

There is no account signup, token login, organization setup, network clone, or remote
push workflow in the current alpha.

See [`../STATUS.md`](../STATUS.md), the
[current CLI reference](../user-guide/cli-reference.md), and
[Getting Started](../user-guide/getting-started.md).
