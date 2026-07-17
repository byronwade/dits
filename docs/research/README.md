# Research

Documents in this directory are **Design** or **Research** unless explicitly
promoted through an ADR and implemented in the canonical workspace.

- [`technical-foundations.md`](technical-foundations.md) — repository-wide
  audit, external systems research, target object/media architecture, security,
  performance program, and milestone gates.

Research documents may contain options, projections, and unresolved questions.
They must not be cited as proof that a feature ships. Current behavior is
defined by code/tests, `docs/STATUS.md`, and
`docs/architecture/active-architecture.md`.

A research proposal should include:

1. the current limitation;
2. invariants that cannot regress;
3. external primary sources;
4. alternatives and rejected options;
5. format/protocol compatibility impact;
6. threat and failure model;
7. measurable acceptance criteria; and
8. an exit path if the experiment fails.
