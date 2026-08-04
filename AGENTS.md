# Dits repository guidance

This file applies repository-wide. A nested `AGENTS.md` may add instructions for its
subtree but must not contradict the product boundary or claim rules below.

## Authority order

Read these sources in order before changing behavior or public claims:

1. `docs/STATUS.md` — current implementation truth and maturity.
2. `docs/architecture/active-architecture.md` — live system boundary and dependency
   direction.
3. `docs/concepts.md` — canonical user-facing concepts and vocabulary.
4. `docs/adr/README.md` and relevant ADRs — accepted architectural decisions.
5. `ROADMAP.md` — dependency-ordered future gates, not current capability.
6. Scoped code and tests — evidence for exact implementation behavior.
7. `docs/marketing/positioning.md` — allowed public framing and claim rules.

When these sources disagree, correct lower-authority material to match the higher
source. Do not infer product capability from a scaffold, test fixture, demo, or
marketing page.

## Canonical product boundary

- `packages/dits-core`: shared deterministic chunking and hashing engine.
- `apps/cli`: current Rust library and `dits` command-line product.
- `packages/dits-wasm`: standalone wrapper used by the web playground.
- `apps/web`: documentation, marketing, and playground; not evidence that a backend
  or hosted capability exists.
- `legacy/backend-crates`: historical research, excluded from the current workspace.

## Maturity labels

- **Current:** implemented, reachable in the supported product, and covered by
  representative tests.
- **Experimental:** implemented in a bounded form, with dependencies, fidelity limits,
  and safe fallback documented.
- **Design:** proposed, scaffolded, placeholder-only, or otherwise not usable as a
  product capability.
- **Historical:** retained for context and not part of the current product.

## Persistent-format gate

Any change to object IDs, chunking profiles, manifests, commits, refs, indexes, packs,
encryption envelopes, bundles, or wire formats requires:

1. an accepted or updated ADR;
2. explicit compatibility and migration behavior;
3. deterministic/canonical encoding rules and resource limits;
4. positive, malformed, and cross-version test vectors;
5. version or feature negotiation where multiple implementations may interact; and
6. coordinated updates to implementation, tests, `docs/STATUS.md`, concepts,
   architecture, roadmap, and user-facing documentation.

Current Rust `serde` or `bincode` layouts are implementation details unless an ADR and
conformance corpus explicitly make them a stable contract.

## Claims and evidence

- Keep source bytes, decoded identities, derived renditions, and perceptual matches
  distinct. Similarity is not byte identity.
- Never describe a placeholder, demo transport, fixture, or legacy crate as shipped.
- Quantitative performance or savings claims need a raw artifact, commit, hardware,
  dataset, and method. Label modeled or projected figures as such.
- Do not invent availability, durability, support, capacity, compatibility, or delivery
  commitments.
- `dits serve` is unauthenticated, binds to loopback by default, and is for
  trusted or isolated networks only when rebound. Never recommend public Internet
  exposure.

## Change order

For capability work, update implementation and tests first, then implementation status,
concepts/architecture and any ADR, roadmap, CLI/user documentation, and finally website
or package copy. Remove stale claims at every layer.

## Verification

Run the relevant subset and report anything unavailable:

```bash
cargo +nightly fmt --all -- --check
cargo +stable clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked --workspace
bash scripts/check-cli-docs.sh
bash scripts/check-product-truth.sh
npm --workspace apps/web run lint
npm --workspace apps/web run test:ci
npm --workspace apps/web run build
git diff --check
```

All-feature Rust checks may require platform libraries such as FUSE. A missing platform
dependency is a reported verification limitation, not permission to skip the remaining
checks.
