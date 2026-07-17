# Operations Runbooks

**Maturity:** Historical

> ⚠️ Describes the quarantined backend service (see legacy/backend-crates), NOT the current product. Dits today is a local-first CLI — no server or database required. This doc is retained as design reference for a future hosted offering.

This directory contains operational runbooks for common scenarios and incidents.

## Runbook Index

### Incident Response
- [High Latency](./high-latency.md) - API response times elevated
- [Service Down](./service-down.md) - Complete or partial outage
- [Database Issues](./database-issues.md) - PostgreSQL problems

### Maintenance
- [Scaling](./scaling.md) - Horizontal and vertical scaling

### Recovery

Missing runbooks named in older indexes were never checked in and are not
current operational guidance.

## Runbook Format

Each runbook follows this structure:

1. **Overview** - What this runbook addresses
2. **Detection** - How to identify the issue
3. **Impact** - What's affected
4. **Prerequisites** - Tools and access needed
5. **Steps** - Numbered resolution steps
6. **Verification** - How to confirm resolution
7. **Post-Incident** - Follow-up actions

## On-Call Contacts

| Role | Contact |
|------|---------|
| Primary On-Call | See PagerDuty |
| Secondary On-Call | See PagerDuty |
| Engineering Lead | See escalation policy |
| Security | security@example.com |

## Escalation Policy

1. **P1 (Critical)**: Page immediately, all hands
2. **P2 (High)**: Page on-call, 15 min response
3. **P3 (Medium)**: Slack alert, 1 hour response
4. **P4 (Low)**: Ticket, next business day
