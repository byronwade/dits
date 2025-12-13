# Service Level Agreement (SLA)

Uptime guarantees, performance commitments, and remediation procedures.

---

## Overview

This SLA defines the service levels Dits commits to for paid subscription tiers. It covers availability, performance, data durability, and support response times.

---

## Definitions

| Term | Definition |
|------|------------|
| **Downtime** | Period when the Service is unavailable or degraded beyond SLI thresholds |
| **Scheduled Maintenance** | Pre-announced maintenance windows (excluded from uptime) |
| **Emergency Maintenance** | Unplanned maintenance for critical security/stability issues |
| **Service Credit** | Credit applied to customer account for SLA breach |
| **Error Rate** | Percentage of requests returning 5xx errors |
| **Latency** | Time from request receipt to response initiation (P95) |
| **Monthly Uptime Percentage** | ((Total Minutes - Downtime Minutes) / Total Minutes) × 100 |

---

## Service Level Objectives (SLOs)

### Availability

| Tier | Target Uptime | Monthly Downtime Budget |
|------|---------------|-------------------------|
| Free | No SLA | - |
| Pro | 99.9% | 43.8 minutes |
| Team | 99.95% | 21.9 minutes |
| Enterprise | 99.99% | 4.38 minutes |
| Enterprise+ | 99.999% | 26.3 seconds |

### Performance

| Metric | Pro | Team | Enterprise |
|--------|-----|------|------------|
| API Response (P50) | < 100ms | < 50ms | < 25ms |
| API Response (P95) | < 500ms | < 200ms | < 100ms |
| API Response (P99) | < 2s | < 500ms | < 250ms |
| Chunk Upload | < 1s/MB | < 500ms/MB | < 250ms/MB |
| Chunk Download | < 500ms/MB | < 250ms/MB | < 100ms/MB |
| Error Rate | < 0.1% | < 0.05% | < 0.01% |

### Data Durability

| Metric | All Tiers |
|--------|-----------|
| Annual Durability | 99.999999999% (11 nines) |
| Replication Factor | 3 (across availability zones) |
| Backup Frequency | Daily (Team+), Hourly (Enterprise+) |
| Recovery Point Objective (RPO) | 24 hours (Pro), 1 hour (Team), 15 min (Enterprise) |
| Recovery Time Objective (RTO) | 24 hours (Pro), 4 hours (Team), 1 hour (Enterprise) |

---

## Service Level Indicators (SLIs)

### Availability SLI

```rust
pub struct AvailabilitySLI {
    /// Measurement period
    period: Duration,

    /// Total requests
    total_requests: u64,

    /// Successful requests (2xx, 3xx, 4xx)
    successful_requests: u64,

    /// Failed requests (5xx, timeouts)
    failed_requests: u64,
}

impl AvailabilitySLI {
    pub fn availability_percentage(&self) -> f64 {
        if self.total_requests == 0 {
            return 100.0;
        }
        (self.successful_requests as f64 / self.total_requests as f64) * 100.0
    }

    pub fn is_within_slo(&self, tier: Tier) -> bool {
        let target = match tier {
            Tier::Pro => 99.9,
            Tier::Team => 99.95,
            Tier::Enterprise => 99.99,
            _ => return true, // No SLA
        };
        self.availability_percentage() >= target
    }
}
```

### Latency SLI

```rust
pub struct LatencySLI {
    /// Latency histogram (milliseconds)
    histogram: Histogram<u64>,
}

impl LatencySLI {
    pub fn p50(&self) -> Duration {
        Duration::from_millis(self.histogram.value_at_percentile(50.0))
    }

    pub fn p95(&self) -> Duration {
        Duration::from_millis(self.histogram.value_at_percentile(95.0))
    }

    pub fn p99(&self) -> Duration {
        Duration::from_millis(self.histogram.value_at_percentile(99.0))
    }

    pub fn is_within_slo(&self, tier: Tier) -> bool {
        let (p50_target, p95_target, p99_target) = match tier {
            Tier::Pro => (100, 500, 2000),
            Tier::Team => (50, 200, 500),
            Tier::Enterprise => (25, 100, 250),
            _ => return true,
        };

        self.p50().as_millis() <= p50_target as u128
            && self.p95().as_millis() <= p95_target as u128
            && self.p99().as_millis() <= p99_target as u128
    }
}
```

### Error Rate SLI

```rust
pub struct ErrorRateSLI {
    /// Total requests
    total: u64,

    /// 5xx errors
    server_errors: u64,

    /// Timeout errors
    timeout_errors: u64,
}

impl ErrorRateSLI {
    pub fn error_rate(&self) -> f64 {
        if self.total == 0 {
            return 0.0;
        }
        ((self.server_errors + self.timeout_errors) as f64 / self.total as f64) * 100.0
    }

    pub fn is_within_slo(&self, tier: Tier) -> bool {
        let target = match tier {
            Tier::Pro => 0.1,
            Tier::Team => 0.05,
            Tier::Enterprise => 0.01,
            _ => return true,
        };
        self.error_rate() <= target
    }
}
```

---

## Service Components

### Core Services

| Service | Description | SLA Applies |
|---------|-------------|-------------|
| **API** | REST/gRPC endpoints | Yes |
| **Web UI** | Browser interface | Yes |
| **CLI** | Command-line client | No (client-side) |
| **Storage** | Chunk persistence | Yes |
| **Authentication** | Login, tokens, SSO | Yes |
| **Webhooks** | Event delivery | Best effort |

### Auxiliary Services

| Service | Description | SLA Applies |
|---------|-------------|-------------|
| **Proxy Generation** | Video transcoding | Best effort |
| **Thumbnail Generation** | Preview images | Best effort |
| **Search** | Full-text search | Best effort |
| **Analytics** | Usage dashboards | No |
| **Documentation** | docs.dits.io | No |
| **Status Page** | status.dits.io | No |

---

## Exclusions

The following are excluded from uptime calculations:

### 1. Scheduled Maintenance

- Announced at least 72 hours in advance
- Scheduled during low-usage windows (Sunday 2-6 AM UTC)
- Maximum 4 hours per month (Pro/Team)
- Maximum 2 hours per month (Enterprise)

### 2. Emergency Maintenance

- Critical security patches
- Zero-day vulnerability mitigation
- Announced as soon as practical

### 3. Customer-Caused Issues

- Misconfigured client applications
- Exceeded rate limits or quotas
- Invalid API usage
- Customer network issues

### 4. Force Majeure

- Natural disasters
- War, terrorism, civil unrest
- Government actions
- Internet backbone failures
- Cloud provider outages (AWS, GCP, Azure)

### 5. Beta/Preview Features

- Features marked as "Beta" or "Preview"
- Experimental APIs
- New regions during rollout

---

## Support Response Times

### Severity Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **S1 - Critical** | Service completely unavailable | Total outage, data loss |
| **S2 - High** | Major functionality impaired | Cannot push/pull, auth broken |
| **S3 - Medium** | Partial functionality affected | Slow performance, some errors |
| **S4 - Low** | Minor issues, workarounds exist | UI glitches, doc errors |

### Response Time Commitments

| Severity | Pro | Team | Enterprise |
|----------|-----|------|------------|
| S1 | 4 hours | 1 hour | 15 minutes |
| S2 | 8 hours | 4 hours | 1 hour |
| S3 | 24 hours | 8 hours | 4 hours |
| S4 | 72 hours | 24 hours | 8 hours |

### Resolution Time Targets

| Severity | Pro | Team | Enterprise |
|----------|-----|------|------------|
| S1 | 24 hours | 8 hours | 4 hours |
| S2 | 72 hours | 24 hours | 8 hours |
| S3 | 1 week | 72 hours | 24 hours |
| S4 | 1 month | 1 week | 72 hours |

### Support Hours

| Tier | Hours |
|------|-------|
| Pro | Business hours (9-5 PT, Mon-Fri) |
| Team | Extended hours (6 AM - 10 PM PT, Mon-Fri) |
| Enterprise | 24/7/365 |

---

## Service Credits

### Credit Calculation

| Monthly Uptime | Credit (% of Monthly Fee) |
|----------------|---------------------------|
| 99.9% - 99.0% | 10% |
| 99.0% - 95.0% | 25% |
| 95.0% - 90.0% | 50% |
| < 90.0% | 100% |

### Credit Procedure

1. **Detection**: Customer notices or is notified of outage
2. **Reporting**: Submit credit request within 30 days via support
3. **Verification**: Dits validates outage against monitoring data
4. **Credit Application**: Credit applied to next billing cycle

### Credit Limits

- Maximum credit per month: 100% of monthly subscription fee
- Credits are non-refundable and non-transferable
- Credits expire after 12 months if unused
- Credits cannot be applied to overages or add-ons

### Credit Request Template

```markdown
Subject: SLA Credit Request - [Organization Name]

Organization: [Your organization name]
Account ID: [Your account ID]
Tier: [Pro/Team/Enterprise]

Incident Details:
- Start Time: [YYYY-MM-DD HH:MM UTC]
- End Time: [YYYY-MM-DD HH:MM UTC]
- Duration: [Minutes]
- Affected Services: [API, Web UI, etc.]
- Impact: [Description of business impact]

Supporting Evidence:
- [Screenshots, logs, error messages]
- [Third-party monitoring data if available]

Requested Credit: [Amount or percentage]
```

---

## Monitoring and Reporting

### Status Page

Real-time service status available at: **status.dits.io**

Components monitored:
- API availability
- Web UI availability
- Storage systems
- Authentication services
- Regional endpoints

### Incident Communication

| Phase | Timing | Channel |
|-------|--------|---------|
| Detection | Within 5 minutes | Internal alert |
| Acknowledgment | Within 15 minutes | Status page |
| Initial Update | Within 30 minutes | Email (Enterprise) |
| Ongoing Updates | Every 30 minutes | Status page |
| Resolution | Upon fix | Status page + Email |
| Post-Mortem | Within 5 business days | Email (Team+) |

### Monthly Reports (Enterprise)

Enterprise customers receive monthly SLA reports including:

- Uptime percentage by service
- Latency percentiles (P50, P95, P99)
- Error rates
- Incident summary
- Credit status
- Trend analysis

---

## Disaster Recovery

### Backup Strategy

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Primary    │────▶│   Replica    │────▶│   Backup     │
│   (Active)   │     │  (Hot Standby)    │   (Cold)     │
│   us-east-1  │     │   us-west-2  │     │   eu-west-1  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │   Sync: < 1 min    │   Backup: Daily    │
       └────────────────────┴────────────────────┘
```

### Recovery Procedures

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Single server failure | < 1 min | 0 | Automatic failover |
| Availability zone failure | < 5 min | 0 | Cross-AZ failover |
| Region failure | < 1 hour | < 15 min | Cross-region failover |
| Multi-region failure | < 4 hours | < 1 hour | Backup restore |
| Data corruption | < 24 hours | Varies | Point-in-time recovery |

### Failover Testing

- Automated failover tests: Weekly
- Manual failover drills: Monthly (Enterprise)
- Full disaster recovery test: Quarterly (Enterprise)

---

## Data Protection

### Durability Guarantees

- 99.999999999% (11 nines) annual durability
- Achieved through:
  - 3x replication across availability zones
  - Erasure coding for cold storage
  - Cross-region backup (Team+)
  - Immutable audit logs

### Data Recovery

| Scenario | Recovery Method | Time |
|----------|-----------------|------|
| Accidental deletion | Soft-delete recovery | Immediate |
| Corruption | Version restore | Minutes |
| Ransomware | Point-in-time restore | Hours |
| Complete loss | Backup restore | Hours-Days |

### Encryption

- Data at rest: AES-256 (SSE-S3 or SSE-KMS)
- Data in transit: TLS 1.3
- Client-side: Optional convergent encryption

---

## Compliance

### Certifications

| Certification | Status | Tiers |
|---------------|--------|-------|
| SOC 2 Type II | Certified | Team+ |
| ISO 27001 | In Progress | Enterprise |
| HIPAA | Available | Enterprise (BAA required) |
| GDPR | Compliant | All |
| CCPA | Compliant | All |

### Audit Rights

Enterprise customers may request:
- Annual third-party security audit report
- Penetration test results (summary)
- Compliance attestations
- Data processing records

---

## SLA Amendments

### Notification

- SLA changes announced 30 days in advance
- Notification via email and status page
- Changes do not apply retroactively

### Grandfathering

- Existing contracts honored for their duration
- Annual renewals may include updated SLA
- Enterprise customers may negotiate custom terms

---

## Contact

### Support Channels

| Tier | Channels |
|------|----------|
| Free | Community forum, docs |
| Pro | Email (support@dits.io) |
| Team | Email, chat, phone |
| Enterprise | Dedicated Slack, phone, on-site |

### Escalation Path

1. Support Engineer
2. Support Manager
3. Engineering Lead
4. VP Engineering
5. CEO (Enterprise only)

### Emergency Contact

For S1 incidents (Enterprise):
- Phone: +1 (888) DITS-911
- Email: emergency@dits.io
- PagerDuty: Available on request

---

## Notes

- This SLA is effective as of the subscription start date
- SLA applies per-organization, not per-repository
- Free tier has no SLA guarantees
- Custom SLAs available for Enterprise customers
- All times in UTC unless otherwise specified
