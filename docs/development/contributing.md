# Contributing to Dits

**Maturity:** Current

Dits is an alpha local-first version-control system for large media and asset
pipelines. The highest-value contributions improve correctness, format evidence,
recovery, representative fixtures, and documentation truth.

All participation is governed by the repository
[`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).

## Read first

1. [`../STATUS.md`](../STATUS.md) — current, experimental, roadmap, and historical boundaries.
2. [`../architecture/active-architecture.md`](../architecture/active-architecture.md) — live workspace and dependency direction.
3. [`../../ROADMAP.md`](../../ROADMAP.md) — dependency-ordered gates.
4. [`../adr/README.md`](../adr/README.md) — accepted decisions.
5. [`../marketing/positioning.md`](../marketing/positioning.md) — public claim rules.

## Workspace

| Path | Role |
|---|---|
| `apps/cli` | Canonical `dits` Rust binary and library modules |
| `packages/dits-core` | Shared deterministic chunking and hashing engine |
| `apps/web` | Website, documentation, and playground |
| `packages/npm` | npm launcher and packaged binary layout |
| `legacy/backend-crates` | Historical backend research; excluded from the root workspace |

PostgreSQL, Redis, Docker, or a hosted server are not required for the current
product. Do not reconnect the legacy backend to the root workspace without an
accepted architectural decision.

## Setup

Prerequisites:

- Rust stable for builds/tests and nightly rustfmt for the repository formatting check;
- Node.js 20 and npm for the website;
- Git;
- platform FUSE development libraries only when testing the optional `fuser` feature.

```bash
git clone https://github.com/YOUR_USERNAME/dits.git
cd dits

cargo build --locked -p dits
npm ci

cargo test --locked --workspace
npm --workspace apps/web run test:ci
```

## Good first contribution types

- Reduce a corruption, crash-safety, or recovery failure to a regression test.
- Add a generated or redistributable real-media fixture with documented provenance.
- Define deterministic test vectors for an object or manifest format.
- Remove a file-sized buffer from ingest and measure peak memory.
- Reconcile a command page with actual `dits --help` output.
- Label a historical or design document so it cannot be mistaken for current behavior.
- Reproduce a competitor workload fairly and publish the method and raw results.

Discuss new persistent formats, protocol changes, or broad features in an issue
before implementation.

## Correctness rules

- Preserve exact source bytes unless the command explicitly creates a derived asset.
- Keep cryptographic identity separate from perceptual similarity.
- Verify digests and lengths on untrusted reads and imports.
- Make object and ref visibility atomic.
- Version persistent formats and use deterministic encodings where IDs depend on bytes.
- Reject unsupported media layouts safely.
- Keep large-file operations bounded-memory.
- Add failure tests, not only happy-path tests.

## Documentation rules

Every product claim must be clearly current, experimental, roadmap, or
historical. A placeholder command, demo, type definition, or design page does
not make a feature current.

Measured claims require a committed artifact with the corpus, command, commit,
hardware, environment, sample count, and raw output. Never invent test counts,
customer results, capacity limits, storage savings, prices, or delivery dates.

If a change alters product truth, update implementation and tests first, then:

1. `docs/STATUS.md`;
2. concepts and active architecture;
3. the roadmap or ADR;
4. CLI/user documentation;
5. website and package copy.

## Before opening a pull request

Run the proportionate subset while developing and the complete relevant suite
before handoff:

```bash
cargo +nightly fmt --all -- --check
cargo +stable clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked --workspace

npm --workspace apps/web run lint
npm --workspace apps/web run test:ci
npm --workspace apps/web run build

bash scripts/check-cli-docs.sh
bash scripts/check-product-truth.sh
git diff --check
```

The optional all-features Rust check requires system FUSE development packages.

## Pull request shape

Use a focused branch and explain:

- the user or architectural problem;
- the current product boundary affected;
- persistent-format or compatibility impact;
- tests and fixtures added;
- commands run and any environment limitations;
- documentation or maturity labels changed;
- follow-up work deliberately left out.

Prefer reviewable changes with explicit evidence over a large speculative phase
implementation.

## Commit style

Conventional Commit prefixes are useful but not mandatory. Clear examples:

```text
fix(store): publish objects atomically after verification
test(mp4): add truncated co64 fixture
docs(status): mark remote sync as roadmap
perf(ingest): bound the read window for large assets
```

## Reporting problems

Use the structured [GitHub issue forms](https://github.com/byronwade/dits/issues/new/choose)
for reproducible bugs, evaluation questions, fixtures, and focused design
proposals. Include the Dits commit/version, OS, architecture, filesystem,
exact commands, smallest redistributable fixture, expected behavior, actual
behavior, and hashes when exact bytes are relevant.
