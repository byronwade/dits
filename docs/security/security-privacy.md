# Security and Privacy

**Maturity:** Current

This is the security status of the current alpha, not a certification.

**Last reviewed:** 2026-07-16

Dits v0.1.5 is local-first alpha software for evaluation on disposable or
independently backed-up data. This page describes controls that exist in the
current repository; it is not a security certification or deployment guarantee.
See [`../STATUS.md`](../STATUS.md) for the authoritative product boundary.

## Trust boundary

The current product is a local CLI and library. Repository files, the `.dits`
directory, the embedded Git store, configuration, locks, and audit records are
protected by the permissions and security of the machine and account running
Dits. Anyone who can modify those files can affect the repository.

Dits does not currently provide a hosted control plane, remote identity service,
multi-user authorization, remote lock leases, or managed backup service.

## Integrity

Dits uses BLAKE3 content identifiers for its local object and chunk paths. Object
reads verify that stored bytes match the requested digest, and `dits fsck` checks
repository structures and references. Byte-identical chunks can be stored once.

These mechanisms make accidental corruption detectable; they do not authenticate
an author, prove when data was created, encrypt content, or prevent an attacker
with filesystem access from replacing repository state. Keep independent backups
and verify important restores with a separate, standard hash tool.

## Confidentiality and repository encryption

Dits does **not** currently provide supported repository-at-rest encryption. The
early encryption experiment is disabled because it did not cover the embedded Git
store or every metadata path, and its convergent design leaked content equality.

Current command behavior is deliberately fail-closed:

- `dits encrypt-init`, `dits login`, and `dits change-password` return a nonzero
  error without changing a keystore.
- `dits encrypt-status` is diagnostic and can report legacy state.
- `dits logout` can clear a legacy key cache.
- A repository containing the experimental keystore fails before normal
  repository operations.

Do not treat the legacy keystore as protection. Use operating-system access
controls and, where appropriate, independently managed full-disk, volume, or
backup encryption.

## Network exposure

Repository `push`, `pull`, `fetch`, and `sync` are not functional transports.
They return a nonzero error for both local-path and Internet remotes without
changing objects, refs, or the working tree. Network clone is also unavailable;
only local-filesystem clone is current. No TLS, QUIC, P2P, or remote-authentication
claim applies to repository exchange today.

`dits serve` is a narrow embedded object server, not a secure remote. It binds to
all network interfaces, has no authentication or authorization, and exposes refs
and stored object bytes. Run it only on a trusted or isolated network behind a
firewall. Never expose it directly to the public Internet.

## Locks, audit records, and privacy

Binary locks and audit inspection/export are local facilities. They are not
multi-user access control, tamper-proof audit evidence, or a hosted compliance
control. Local metadata and logs can reveal repository paths and activity; protect
and retain them according to your own policy.

Dits does not currently operate a hosted service or process repository content on
customers' behalf. Network features are not shipped, but commands you run and
third-party tools you install remain subject to your machine's own logging,
telemetry, and network configuration.

## Compliance, availability, and support

The project has no SOC 2 or ISO 27001 attestation, regulatory certification, BAA,
DPA, hosted data-region commitment, uptime guarantee, durability guarantee,
support response target, or incident-response SLA. See the current
[`compliance status`](../business/compliance.md) and
[`service-level status`](../business/sla.md).

## Report a vulnerability

Do not publish exploit details or sensitive data in a public issue. Follow the
repository [`security policy`](../../SECURITY.md), which directs reporters to
GitHub private vulnerability reporting when available. Reports and fixes are
handled on a best-effort basis; no response or release deadline is promised.
