# Photographer Guide

**Maturity:** Experimental

Dits can preserve exact local history for originals and derived files, and experimental photo commands can record selected edit/rendition metadata. It does not replace a DAM, cloud gallery, catalog database, or color-managed RAW pipeline, and it makes no universal storage-saving claim.

## Safe local evaluation loop

Use a disposable or backed-up project and set the identity consumed by commits:

    export DITS_AUTHOR_NAME="Your Name"
    export DITS_AUTHOR_EMAIL="you@example.com"

    dits init evaluation
    cd evaluation
    # Copy selected source assets into this directory.
    dits add .
    dits status
    dits commit -m "Import evaluation fixture"
    dits fsck

Inspect exact subcommand options with `dits <command> --help`. Measure ingest time,
checkout fidelity, and repository growth on your own committed fixture; do not extrapolate
from a synthetic chunk benchmark or another file type.

Remote transfer commands fail closed, network clone is unavailable, destructive GC is
disabled, and encryption setup is disabled. See
[`../STATUS.md`](../STATUS.md), [Getting Started](../user-guide/getting-started.md),
and the [CLI reference](../user-guide/cli-reference.md).
