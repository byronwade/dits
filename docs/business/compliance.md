# Legal & Compliance

Security certifications, data protection, and regulatory compliance documentation.

---

## Overview

This document outlines Dits' approach to legal compliance, data protection, and security certifications. It serves as a reference for customers evaluating Dits for regulated industries.

---

## Security Certifications

### SOC 2 Type II

**Status:** Certified (Annual audit)

**Scope:** Trust Service Criteria
- Security
- Availability
- Confidentiality
- Processing Integrity

**Auditor:** [Independent CPA Firm]

**Report Availability:**
- Summary available on request (all customers)
- Full report under NDA (Team+ customers)

**Controls Include:**
- Access management
- Change management
- Incident response
- Vendor management
- Data encryption
- Network security
- Business continuity

### ISO 27001

**Status:** In Progress (Target: Q4 2025)

**Scope:**
- Information Security Management System (ISMS)
- All production systems
- All customer data handling

### PCI DSS

**Status:** SAQ-A Compliant

**Scope:**
- Payment processing via Stripe
- No cardholder data stored on Dits systems
- Annual self-assessment

---

## Data Protection

### GDPR Compliance

Dits is fully compliant with the General Data Protection Regulation (EU 2016/679).

#### Lawful Basis for Processing

| Data Type | Lawful Basis | Purpose |
|-----------|--------------|---------|
| Account information | Contract | Service delivery |
| Usage data | Legitimate interest | Service improvement |
| Payment information | Contract | Billing |
| Marketing communications | Consent | Marketing |

#### Data Subject Rights

| Right | Implementation |
|-------|----------------|
| **Access** | Self-service export in settings |
| **Rectification** | Self-service profile editing |
| **Erasure** | Request via support or settings |
| **Portability** | JSON/CSV export available |
| **Restriction** | Contact support |
| **Objection** | Unsubscribe links, settings |

#### Data Processing Agreement (DPA)

Available for all customers:
- Standard DPA auto-accepted at signup
- Custom DPA negotiable (Enterprise)
- EU Standard Contractual Clauses included

```markdown
# Data Processing Agreement Summary

Processor: Dits, Inc.
Controller: Customer

Processing Activities:
- Storage and retrieval of media files
- Version control operations
- User authentication and authorization
- Usage analytics and billing

Sub-processors:
- AWS (Infrastructure)
- Stripe (Payments)
- SendGrid (Email)
- Datadog (Monitoring)

Data Location: Customer-selected region
Retention: Until deletion requested + 30 days
```

#### EU Data Residency

| Region | Data Center | Services |
|--------|-------------|----------|
| EU-West-1 | Ireland | Full service |
| EU-Central-1 | Frankfurt | Full service |
| EU-North-1 | Stockholm | Storage only |

**Guarantee:** Customer data never leaves EU region unless explicitly configured.

### CCPA Compliance

Dits complies with the California Consumer Privacy Act.

#### Consumer Rights

| Right | Implementation |
|-------|----------------|
| **Know** | Privacy policy, data export |
| **Delete** | Account deletion |
| **Opt-Out** | No data sales |
| **Non-Discrimination** | Equal service regardless of rights exercise |

#### Categories of Personal Information

| Category | Collected | Sold | Business Purpose |
|----------|-----------|------|------------------|
| Identifiers | Yes | No | Account management |
| Commercial info | Yes | No | Billing |
| Internet activity | Yes | No | Service improvement |
| Geolocation | Limited | No | Regional routing |
| Professional info | Optional | No | Team management |

### LGPD Compliance (Brazil)

| Requirement | Status |
|-------------|--------|
| Legal basis documentation | Complete |
| Data subject rights | Implemented |
| DPO appointed | Yes |
| Cross-border transfer safeguards | SCCs |
| Breach notification | 72-hour process |

---

## Industry-Specific Compliance

### HIPAA (Healthcare)

**Status:** Available (Enterprise tier with BAA)

**Covered Services:**
- Storage of PHI in media files
- Audit logging
- Access controls
- Encryption (at rest and in transit)

**Business Associate Agreement (BAA):**
- Required for healthcare customers
- Custom terms negotiable
- Annual review included

**Technical Safeguards:**

```rust
/// HIPAA-compliant configuration
pub struct HipaaConfig {
    /// Enforce encryption at rest
    pub encryption_required: bool, // Always true

    /// Minimum encryption standard
    pub encryption_algorithm: EncryptionAlgorithm, // AES-256

    /// Audit log retention
    pub audit_retention_days: u32, // Minimum 6 years

    /// Access log detail level
    pub access_log_level: LogLevel, // Detailed

    /// Session timeout
    pub session_timeout_minutes: u32, // Maximum 15

    /// MFA requirement
    pub mfa_required: bool, // Always true
}
```

**Administrative Safeguards:**
- Workforce training documentation
- Security incident procedures
- Contingency planning
- Periodic security evaluations

### FERPA (Education)

**Status:** Compliant

**Scope:**
- Student education records in media
- Protected under FERPA provisions

**Features:**
- Role-based access control
- Audit trails
- Data minimization
- Parent/guardian access provisions

### FedRAMP (Government)

**Status:** Planned (Q2 2026)

**Target Level:** Moderate

**Current Status:**
- Using FedRAMP-authorized IaaS (AWS GovCloud)
- Security controls mapped to NIST 800-53
- 3PAO assessment scheduled

---

## Data Retention

### Default Retention Periods

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Active repository data | Indefinite | Service function |
| Deleted repository data | 30 days | Accidental deletion recovery |
| Audit logs | 2 years (Team), 7 years (Enterprise) | Compliance |
| Access logs | 90 days | Security |
| Billing records | 7 years | Tax/legal requirements |
| Support tickets | 3 years | Service improvement |
| Marketing data | Until consent withdrawn | Marketing |

### Data Deletion

```rust
/// Data deletion process
pub struct DeletionRequest {
    /// Request ID
    pub id: Uuid,

    /// Scope of deletion
    pub scope: DeletionScope,

    /// Requested by
    pub requester: UserId,

    /// Verification status
    pub verified: bool,

    /// Deletion status
    pub status: DeletionStatus,
}

pub enum DeletionScope {
    /// Single repository
    Repository(RepositoryId),

    /// All user data
    User(UserId),

    /// Entire organization
    Organization(OrganizationId),

    /// Specific file versions
    FileVersions(Vec<CommitId>),
}

pub enum DeletionStatus {
    Pending,
    Scheduled { execute_at: DateTime<Utc> },
    InProgress,
    Completed { completed_at: DateTime<Utc> },
    Failed { error: String },
}

impl DeletionRequest {
    /// Execute deletion after grace period
    pub async fn execute(&self, storage: &StorageBackend) -> Result<()> {
        match &self.scope {
            DeletionScope::Repository(repo_id) => {
                // 1. Remove from active index
                storage.remove_repository_index(repo_id).await?;

                // 2. Mark chunks for garbage collection
                storage.mark_chunks_for_gc(repo_id).await?;

                // 3. Delete manifests
                storage.delete_manifests(repo_id).await?;

                // 4. Delete proxies and thumbnails
                storage.delete_proxies(repo_id).await?;

                // 5. Purge from all caches
                storage.purge_caches(repo_id).await?;

                // 6. Log deletion for audit
                storage.log_deletion(self).await?;
            }
            // ... other scopes
        }
        Ok(())
    }
}
```

### Legal Hold

Enterprise customers can place legal holds:

```rust
pub struct LegalHold {
    /// Hold identifier
    pub id: Uuid,

    /// Scope of hold
    pub scope: HoldScope,

    /// Reason (optional, customer-provided)
    pub reason: Option<String>,

    /// Created by
    pub created_by: UserId,

    /// Created at
    pub created_at: DateTime<Utc>,

    /// Expires at (optional)
    pub expires_at: Option<DateTime<Utc>>,
}

pub enum HoldScope {
    Repository(RepositoryId),
    User(UserId),
    Organization(OrganizationId),
    DateRange {
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    },
}
```

---

## Access Control

### Authentication

| Method | Availability | Security Level |
|--------|--------------|----------------|
| Password | All tiers | Basic |
| TOTP MFA | All tiers | High |
| Hardware keys (WebAuthn) | Pro+ | Very High |
| SSO (SAML) | Team+ | Enterprise |
| SSO (OIDC) | Team+ | Enterprise |

### Authorization

```rust
/// Permission model
pub enum Permission {
    // Repository permissions
    RepoRead,
    RepoWrite,
    RepoPush,
    RepoPull,
    RepoAdmin,

    // Organization permissions
    OrgMemberManage,
    OrgTeamManage,
    OrgBillingView,
    OrgBillingManage,
    OrgSettingsView,
    OrgSettingsManage,
    OrgAuditView,

    // System permissions (internal)
    SystemAdmin,
}

/// Role-based access control
pub struct Role {
    pub name: String,
    pub permissions: HashSet<Permission>,
}

impl Default for Role {
    fn default_roles() -> Vec<Role> {
        vec![
            Role {
                name: "viewer".into(),
                permissions: hashset![Permission::RepoRead, Permission::RepoPull],
            },
            Role {
                name: "contributor".into(),
                permissions: hashset![
                    Permission::RepoRead,
                    Permission::RepoWrite,
                    Permission::RepoPush,
                    Permission::RepoPull,
                ],
            },
            Role {
                name: "maintainer".into(),
                permissions: hashset![
                    Permission::RepoRead,
                    Permission::RepoWrite,
                    Permission::RepoPush,
                    Permission::RepoPull,
                    Permission::RepoAdmin,
                ],
            },
            Role {
                name: "admin".into(),
                permissions: Permission::all(),
            },
        ]
    }
}
```

### Audit Logging

All access is logged:

```rust
pub struct AuditEvent {
    /// Event ID
    pub id: Uuid,

    /// Timestamp
    pub timestamp: DateTime<Utc>,

    /// Actor
    pub actor: Actor,

    /// Action performed
    pub action: AuditAction,

    /// Resource affected
    pub resource: Resource,

    /// Outcome
    pub outcome: Outcome,

    /// Additional context
    pub context: HashMap<String, Value>,
}

pub enum AuditAction {
    // Authentication
    Login,
    Logout,
    LoginFailed,
    MfaEnabled,
    MfaDisabled,
    PasswordChanged,

    // Repository actions
    RepoCreated,
    RepoDeleted,
    RepoPush,
    RepoPull,
    RepoCloned,

    // File actions
    FileUploaded,
    FileDownloaded,
    FileDeleted,

    // Team actions
    MemberAdded,
    MemberRemoved,
    RoleChanged,

    // Administrative
    SettingsChanged,
    ApiKeyCreated,
    ApiKeyRevoked,
}
```

---

## Encryption

### At Rest

| Layer | Algorithm | Key Management |
|-------|-----------|----------------|
| Storage (S3) | AES-256 (SSE-S3) | AWS managed |
| Storage (KMS) | AES-256 (SSE-KMS) | Customer-managed |
| Database | AES-256 | AWS RDS |
| Backups | AES-256 | Separate keys |
| Client-side | AES-256-GCM | Customer-managed |

### In Transit

| Connection | Protocol | Minimum Version |
|------------|----------|-----------------|
| API | TLS | 1.2 (1.3 preferred) |
| Web UI | TLS | 1.2 (1.3 preferred) |
| Chunk transfer | QUIC | 1 |
| Internal services | mTLS | 1.3 |

### Key Management

```rust
/// Key hierarchy
pub enum KeyType {
    /// Master key (HSM-protected)
    Master,

    /// Per-organization key
    Organization(OrganizationId),

    /// Per-repository key
    Repository(RepositoryId),

    /// Per-chunk key (derived)
    Chunk(ChunkHash),
}

/// Key rotation schedule
pub struct KeyRotation {
    /// Key type
    pub key_type: KeyType,

    /// Rotation frequency
    pub frequency: Duration,

    /// Last rotation
    pub last_rotated: DateTime<Utc>,

    /// Rotation method
    pub method: RotationMethod,
}

pub enum RotationMethod {
    /// Automatic rotation
    Automatic,

    /// Manual with notification
    Manual,

    /// Customer-initiated
    CustomerInitiated,
}
```

---

## Incident Response

### Breach Notification

| Jurisdiction | Notification Timeline | Authority |
|--------------|----------------------|-----------|
| GDPR (EU) | 72 hours | Supervisory authority |
| CCPA (California) | "Most expedient time" | AG + consumers |
| HIPAA (US) | 60 days | HHS |
| LGPD (Brazil) | "Reasonable time" | ANPD |

### Incident Classification

| Severity | Definition | Response Time |
|----------|------------|---------------|
| Critical | Confirmed data breach | Immediate |
| High | Suspected breach, service compromise | 1 hour |
| Medium | Security vulnerability discovered | 4 hours |
| Low | Policy violation, minor issue | 24 hours |

### Response Process

```
1. DETECTION
   └── Automated monitoring alerts
   └── User reports
   └── Security research

2. CONTAINMENT
   └── Isolate affected systems
   └── Revoke compromised credentials
   └── Block malicious actors

3. INVESTIGATION
   └── Determine scope and impact
   └── Identify root cause
   └── Collect forensic evidence

4. NOTIFICATION
   └── Internal stakeholders
   └── Affected customers
   └── Regulatory authorities
   └── Law enforcement (if applicable)

5. REMEDIATION
   └── Patch vulnerabilities
   └── Restore from backups
   └── Implement additional controls

6. POST-INCIDENT
   └── Root cause analysis
   └── Process improvements
   └── Customer communication
   └── Regulatory reporting
```

---

## Vendor Management

### Sub-processors

| Vendor | Service | Location | DPA |
|--------|---------|----------|-----|
| AWS | Infrastructure | Various | Yes |
| Stripe | Payments | US | Yes |
| SendGrid | Email | US | Yes |
| Datadog | Monitoring | US | Yes |
| Cloudflare | CDN/Security | Various | Yes |
| PagerDuty | Incident management | US | Yes |

### Vendor Security Requirements

All vendors must:
- Maintain SOC 2 or equivalent certification
- Sign Data Processing Agreements
- Support encryption in transit and at rest
- Provide breach notification within 24 hours
- Undergo annual security review

---

## Privacy

### Privacy Policy

Full policy available at: **dits.io/privacy**

Key points:
- Minimal data collection
- No data selling
- Transparent processing
- User control over data
- Cookie consent management

### Cookie Usage

| Cookie Type | Purpose | Consent Required |
|-------------|---------|------------------|
| Essential | Authentication, security | No |
| Functional | Preferences | No |
| Analytics | Usage tracking | Yes |
| Marketing | Advertising | Yes |

---

## Export Controls

### Encryption Export

Dits uses encryption controlled under:
- US Export Administration Regulations (EAR)
- Classification: 5D002 (Mass market exemption)

### Prohibited Countries

Service not available in:
- Countries under comprehensive US sanctions
- As updated by OFAC SDN list

---

## Terms of Service

### Acceptable Use

Prohibited activities:
- Storing illegal content
- Copyright infringement
- Malware distribution
- Cryptomining
- Spam/phishing operations
- Service abuse

### Enforcement

| Violation | Response |
|-----------|----------|
| First minor | Warning |
| Repeated minor | Temporary suspension |
| Major | Immediate suspension |
| Illegal content | Termination + law enforcement |

---

## Contact

### Data Protection Officer

Email: dpo@dits.io
Address: [Company Address]

### Legal Department

Email: legal@dits.io

### Security Team

Email: security@dits.io
PGP Key: [Available on website]

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-01 | Initial release |
| 1.1 | 2024-06-01 | Added LGPD compliance |
| 1.2 | 2025-01-01 | SOC 2 Type II certification |

---

## Notes

- This document is for informational purposes
- Consult legal counsel for specific compliance requirements
- Certifications and compliance status subject to annual review
- Custom compliance packages available for Enterprise customers
