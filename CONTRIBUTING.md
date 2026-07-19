# Contributing to Dits

Dits is an early open-source project building local-first version control for
large media and asset pipelines. The best contributions make the alpha safer,
more reproducible, easier to evaluate, or more honest about its boundaries.

## Choose a starting point

- Browse [`good first issue`](https://github.com/byronwade/dits/labels/good%20first%20issue)
  for intentionally small tasks.
- Browse [`help wanted`](https://github.com/byronwade/dits/labels/help%20wanted)
  for work where outside experience is especially useful.
- Use the [issue forms](https://github.com/byronwade/dits/issues/new/choose)
  to report a bug, propose a focused change, or contribute a real-world fixture.
- Read the [full contributor guide](docs/development/contributing.md) before
  changing persistent formats, protocols, security behavior, or media fidelity.

Useful contributions do not have to be large. A reproducible failure, a
redistributable fixture, clearer documentation, or an independently reproduced
benchmark can be more valuable than a broad feature proposal.

## Local setup

```bash
git clone https://github.com/YOUR_USERNAME/dits.git
cd dits

cargo build --locked -p dits
cargo test --locked --workspace

npm ci
npm --workspace apps/web run test:ci
```

Use a focused branch and keep persistent-format changes separate from unrelated
cleanup. The root [`AGENTS.md`](AGENTS.md) defines the product boundary, claim
rules, and complete verification matrix.

## Before opening a pull request

Run the checks proportionate to your change and report anything your environment
could not run:

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

Pull requests should explain the user problem, compatibility impact, evidence,
tests, documentation changes, and deliberately deferred work. See the
[detailed pull-request guidance](docs/development/contributing.md#pull-request-shape).

## Project expectations

- Preserve exact source bytes unless a command explicitly creates a derived asset.
- Keep cryptographic identity separate from perceptual similarity.
- Treat Current, Experimental, Design, and Historical as distinct maturity levels.
- Do not present roadmap commands or scaffolding as shipped behavior.
- Add failure and recovery coverage when a change can affect stored data.
- Follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

Security vulnerabilities belong in
the process described in [`SECURITY.md`](SECURITY.md), not a public bug report.
