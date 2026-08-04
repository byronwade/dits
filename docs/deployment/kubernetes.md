# Kubernetes Deployment Guide

**Maturity:** Design

Dits does not publish an official container image, Helm chart, operator, hosted control
plane, database, queue, or deployable server distribution. The former manifests and
commands targeted an unimplemented backend.

Do not deploy `dits serve` as a public service: it is unauthenticated (loopback by default) and has
no authentication or authorization. It is a trusted-network object/ref utility, not a
complete repository service.

See [`../STATUS.md`](../STATUS.md) and the
[active architecture](../architecture/active-architecture.md). Deployment guidance can
become Current only after a supported server artifact, persistence contract, security
boundary, health checks, and end-to-end deployment tests exist.
