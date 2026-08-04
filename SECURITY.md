# Security Policy

**Maturity:** Current policy for the alpha source release

Dits is pre-1.0, local-first software intended for evaluation. Repository formats,
security controls, and compatibility guarantees may change between alpha releases.
Keep independent backups of important data.

## Supported versions

Security maintenance is best effort for the current `main` branch and recent alpha
releases. No version has a guaranteed support, response, or fix window.

## Report a vulnerability

Do not publish exploit details, proof-of-concept code, secrets, or affected data in a
public issue.

GitHub private vulnerability reporting is not currently enabled for this repository.
Use the [security contact
form](https://github.com/byronwade/dits/issues/new?template=security-contact.yml)
to ask a maintainer to arrange a private reporting channel. That request is a
public issue, so include no vulnerability details, proof of concept, secrets,
affected data, identifying information, paths, or logs.

Include, when available:

- the affected version or commit, platform, and component;
- reproduction steps and a minimal proof of concept;
- expected impact and required preconditions; and
- possible mitigations or fixes.

Reports are handled on a best-effort basis. The maintainers may coordinate a patch,
release note, or GitHub security advisory when warranted, but do not promise response
deadlines, release deadlines, reporter credit, or a CVE.

## Scope

Security-relevant code maintained in this repository is in scope, including:

- `packages/dits-core`;
- `apps/cli`;
- `packages/npm`; and
- `packages/dits-wasm` and `apps/web` where they contain maintained security-relevant
  code.

DitsHub, a hosted API or service, public SDKs, remote repository exchange, P2P
transfer, and third-party services are not shipped Dits products and are out of scope.
See [`docs/STATUS.md`](docs/STATUS.md) for the authoritative product boundary.

## Important alpha limitations

- `dits serve` has no authentication or authorization and exposes repository refs
  and stored object bytes. It binds to `127.0.0.1` by default; use `--bind` only
  on a trusted or isolated network behind a firewall. CORS is disabled. Do not
  expose it to the public Internet.
- The early convergent/message-locked encryption experiment is disabled and
  repositories containing its keystore fail closed. It did not cover embedded Git
  blobs or every metadata path; convergent encryption also leaks content equality.
- Local locks and audit records are not multi-user authorization or a hosted audit
  control.
- Network push, remote authentication, remote lock leases, and hosted security
  controls are not current capabilities.

## Research, legal terms, and bounties

This policy does not offer a bug bounty, paid award, certification, service-level
commitment, legal safe harbor, or authorization to test systems you do not own or have
permission to test. Researchers are responsible for complying with applicable law and
must avoid privacy violations, data loss, and service disruption.
