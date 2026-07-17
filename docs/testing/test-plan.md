# Test Plan

**Maturity:** Current

The active test suite belongs to the root Rust workspace and the web workspace. Exact
test counts are observations for a commit, not permanent product claims.

## Required checks

    cargo +nightly fmt --all -- --check
    cargo +stable clippy --locked --all-targets --all-features -- -D warnings
    cargo test --locked --workspace
    bash scripts/check-cli-docs.sh
    bash scripts/check-product-truth.sh
    node scripts/check-markdown-links.mjs
    npm --workspace apps/web run lint
    npm --workspace apps/web run test:ci
    npm --workspace apps/web run build
    git diff --check

All-feature Rust checks can require platform libraries such as FUSE. Missing platform
dependencies are reported limitations; they do not turn an unrun check into a passing
one.

Coverage targets, performance thresholds, protocol conformance, fuzzing campaigns, and
fault injection remain Design until CI executes them with retained evidence. See
[`../STATUS.md`](../STATUS.md) and
[`../development/contributing.md`](../development/contributing.md).
