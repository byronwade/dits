# AI assistant guide

This file is the short entry point for coding assistants working on Dits. It is
deliberately a map to authoritative documents rather than a second architecture
specification.

## Read before changing code or copy

1. [`../STATUS.md`](../STATUS.md) — what is current, experimental, roadmap, or
   historical.
2. [`../architecture/active-architecture.md`](../architecture/active-architecture.md)
   — the live system boundary and dependency direction.
3. [`../concepts.md`](../concepts.md) — user-facing concepts and vocabulary.
4. [`../../ROADMAP.md`](../../ROADMAP.md) — dependency-ordered product gates.
5. [`../architecture/decisions/README.md`](../architecture/decisions/README.md)
   — accepted architectural decisions.
6. [`../research/technical-foundations.md`](../research/technical-foundations.md)
   — evidence and proposed future architecture.

For public copy, also read
[`../marketing/positioning.md`](../marketing/positioning.md). For the website,
follow [`../../apps/web/AGENTS.md`](../../apps/web/AGENTS.md).

## Product in one paragraph

Dits is an **open, local-first version-control system for large media and asset
pipelines**. The current alpha has a local Rust CLI, content-addressed chunk
storage, Git-shaped history, hybrid text/binary handling, MP4-aware code, and
experimental FACR/photo/proxy/VFS paths. Network `push`, `pull`, `fetch`,
`sync`, P2P transfer, hosted services, public SDKs, and NLE plug-ins are not
shipped.

## Canonical workspace

- Current product: `apps/cli` (`dits` binary and library modules).
- Website and public documentation: `apps/web`.
- npm launcher/package: `packages/npm`.
- Quarantined historical backend: `legacy/backend-crates`.

Do not import the historical backend into the current workspace or describe it
as the live architecture.

## Core implementation boundaries

| Area | Current responsibility |
|---|---|
| `apps/cli/src/core` | repository model, index, refs, commits |
| `apps/cli/src/store` | local objects and chunks |
| `apps/cli/src/mp4` | ISOBMFF/MP4 parsing and round-trip experiments |
| `apps/cli/src/facr` | experimental frame/photo representation |
| `apps/cli/src/proxy`, `segment`, `vfs` | experimental derived-media and access paths |
| `apps/cli/src/security` | local integrity/security-related behavior |
| `apps/cli/src/dependency`, `metadata`, `lifecycle` | asset metadata, graph, and lifecycle experiments |
| `apps/cli/src/p2p` | scaffolding only; no working peer transfer |
| `apps/cli/src/commands` | CLI handlers and presentation |

Keep storage identity, serialization, and verification rules in reusable library
code. Keep argument parsing and terminal presentation at the CLI boundary.

## Non-negotiable correctness rules

- Preserve exact source bytes unless a command explicitly creates a derived
  asset.
- Treat cryptographic identity and perceptual similarity as different concepts.
- Version persistent formats; use deterministic encodings where identifiers
  depend on bytes.
- Verify hashes and lengths on every untrusted read or import.
- Use atomic writes and ref updates; never expose partially written objects.
- Keep ingest bounded-memory for large inputs.
- Reject unsupported media layouts safely rather than guessing.
- Add golden fixtures and failure tests for format work.
- Never imply a placeholder command transfers or protects data.

## Documentation and marketing rules

Every capability claim must be labeled or clearly scoped as:

- **Current** — real command path and relevant tests;
- **Experimental** — runnable but unstable or incompletely validated;
- **Roadmap** — not implemented;
- **Historical** — retained context, not the current product.

Measured performance must link to a committed artifact with the corpus,
environment, commit, command, and method. Do not invent customer counts,
capacity limits, savings, prices, or timelines.

## Change checklist

Before implementation:

- confirm the request belongs to the active architecture;
- inspect existing tests and ADRs;
- decide whether a persistent format or public CLI contract changes;
- update status, concepts, roadmap, and marketing copy if product truth changes.

Before handoff:

```bash
cargo fmt --all -- --check
cargo test --workspace
npm --workspace apps/web run test:ci
npm --workspace apps/web run build
bash scripts/check-cli-docs.sh
bash scripts/check-product-truth.sh
git diff --check
```

Run the proportionate subset while iterating, then the complete relevant suite
before publishing a broad product change.
