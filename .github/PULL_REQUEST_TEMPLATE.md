## What changed

Describe the user or architectural problem and the smallest coherent change that
addresses it.

## Product boundary

- Maturity affected: Current / Experimental / Design / Historical
- Persistent-format impact: None / Compatible / Migration required / Needs ADR
- Media fidelity impact: None / Describe exact-source and derived-asset behavior
- Security or recovery impact: None / Describe failure and rollback behavior

## Evidence

- Tests or fixtures added:
- Commands run:
- Checks not run, and why:
- Benchmark artifact and method, if a performance claim changed:

## Documentation and claims

- [ ] I updated `docs/STATUS.md` if current behavior changed.
- [ ] I updated concepts, architecture, an ADR, or the roadmap where required.
- [ ] I updated CLI/user docs and website/package copy after implementation truth.
- [ ] I labeled unshipped behavior as Experimental or Roadmap.
- [ ] I did not turn a component benchmark into a product-level claim.

## Safety checklist

- [ ] Exact source bytes remain recoverable, or this change explicitly creates a derived asset.
- [ ] Untrusted lengths, paths, digests, and formats fail safely.
- [ ] Data-affecting paths include failure and recovery coverage.
- [ ] No secrets, private fixtures, or proprietary media are included.
