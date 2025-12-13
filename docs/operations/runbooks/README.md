# Operations Runbooks

This directory contains operational runbooks for common scenarios and incidents.

## Runbook Index

### Incident Response
- [High Latency](./high-latency.md) - API response times elevated
- [Service Down](./service-down.md) - Complete or partial outage
- [Database Issues](./database-issues.md) - PostgreSQL problems
- [Storage Issues](./storage-issues.md) - S3/object storage problems

### Maintenance
- [Scaling](./scaling.md) - Horizontal and vertical scaling
- [Upgrades](./upgrades.md) - Version upgrades and rollbacks
- [Certificate Rotation](./certificate-rotation.md) - TLS certificate management

### Recovery
- [Disaster Recovery](./disaster-recovery.md) - DR failover procedures
- [Data Recovery](./data-recovery.md) - Restore deleted/corrupted data

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

