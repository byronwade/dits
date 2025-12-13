# Pricing Model

Detailed pricing structure, tiers, and cost calculations for Dits.

---

## Overview

Dits uses a usage-based pricing model with predictable tiers. Pricing is based on three primary metrics:

1. **Storage** - Total data stored (after deduplication)
2. **Transfer** - Data transferred in/out
3. **Operations** - API calls and compute operations

---

## Pricing Tiers

### Free Tier

Perfect for individuals and small projects.

| Resource | Limit | Overage |
|----------|-------|---------|
| Storage | 10 GB | Not available |
| Transfer | 50 GB/month | Not available |
| Repositories | 5 | Not available |
| Team members | 1 | Not available |
| History retention | 90 days | - |
| Support | Community | - |

**Included Features:**
- Public and private repositories
- Basic chunking (no video optimization)
- Web UI access
- CLI access
- Basic integrations

**Limitations:**
- No NLE plugin access
- No API access
- No priority support
- Single region only

---

### Pro Tier - $20/user/month

For professionals and small teams.

| Resource | Included | Overage |
|----------|----------|---------|
| Storage | 100 GB | $0.02/GB/month |
| Transfer | 500 GB/month | $0.05/GB |
| Repositories | Unlimited | - |
| Team members | Up to 10 | $20/user/month |
| History retention | 1 year | - |
| Support | Email (48h) | - |

**Included Features:**
- Everything in Free
- Video-optimized chunking
- Keyframe alignment
- All NLE plugins (Premiere, Resolve, FCPX)
- API access
- Basic webhooks
- 2 regions

**Additional Pricing:**
```
Storage overage:     $0.02/GB/month
Transfer overage:    $0.05/GB
Additional users:    $20/user/month
Archive storage:     $0.004/GB/month
```

---

### Team Tier - $50/user/month

For production teams and studios.

| Resource | Included | Overage |
|----------|----------|---------|
| Storage | 500 GB | $0.015/GB/month |
| Transfer | 2 TB/month | $0.04/GB |
| Repositories | Unlimited | - |
| Team members | Up to 50 | $50/user/month |
| History retention | Unlimited | - |
| Support | Priority (24h) | - |

**Included Features:**
- Everything in Pro
- Advanced permissions (RBAC)
- SSO (SAML, OIDC)
- Audit logs
- Branch protection rules
- File locking
- All regions
- Custom integrations
- Webhook management

**Additional Pricing:**
```
Storage overage:     $0.015/GB/month
Transfer overage:    $0.04/GB
Additional users:    $50/user/month
Archive storage:     $0.003/GB/month
Cold retrieval:      $0.01/GB
```

---

### Enterprise Tier - Custom

For large organizations with custom requirements.

| Resource | Included |
|----------|----------|
| Storage | Custom |
| Transfer | Custom |
| Repositories | Unlimited |
| Team members | Unlimited |
| History retention | Unlimited + legal hold |
| Support | Dedicated (4h SLA) |

**Included Features:**
- Everything in Team
- Self-hosted option
- Hybrid cloud deployment
- Custom SLA
- Dedicated infrastructure
- Custom integrations
- On-premise support
- Compliance certifications (SOC 2, HIPAA)
- Data residency controls
- Custom contracts

**Contact sales for pricing.**

---

## Storage Pricing Details

### Storage Classes

| Class | Use Case | Price/GB/month | Retrieval |
|-------|----------|----------------|-----------|
| **Hot** | Active projects | $0.023 | Instant |
| **Warm** | Recent projects | $0.0125 | Instant |
| **Cold** | Archived projects | $0.004 | 1-5 min |
| **Archive** | Long-term storage | $0.001 | 12-48 hrs |

### Deduplication Savings

Dits uses content-addressable storage with global deduplication:

```
Actual Storage = Sum of unique chunks
Billed Storage = Actual Storage (not logical size)

Example:
- 10 team members each have 100 GB of footage
- 80% overlap (shared source footage)
- Logical size: 1,000 GB
- Actual storage: 280 GB (72% savings)
- Monthly cost: 280 GB × $0.02 = $5.60
```

### Storage Calculation

```rust
pub struct StorageMetrics {
    /// Total logical size (sum of all file sizes)
    pub logical_bytes: u64,

    /// Actual storage used (unique chunks)
    pub physical_bytes: u64,

    /// Storage by class
    pub by_class: HashMap<StorageClass, u64>,

    /// Deduplication ratio
    pub dedup_ratio: f64,
}

impl StorageMetrics {
    pub fn calculate_monthly_cost(&self, tier: &PricingTier) -> Decimal {
        let mut total = Decimal::ZERO;

        for (class, bytes) in &self.by_class {
            let gb = Decimal::from(*bytes) / Decimal::from(1_073_741_824);
            let rate = tier.storage_rate(class);
            total += gb * rate;
        }

        total
    }
}
```

---

## Transfer Pricing Details

### Ingress (Upload)

**Free** - No charge for uploading data to Dits.

### Egress (Download)

| Destination | Pro | Team | Enterprise |
|-------------|-----|------|------------|
| Same region | Free | Free | Free |
| Same cloud provider | $0.02/GB | $0.01/GB | Custom |
| Cross-cloud | $0.05/GB | $0.04/GB | Custom |
| Internet | $0.09/GB | $0.07/GB | Custom |

### Transfer Optimization

Dits minimizes transfer costs through:

1. **Delta sync** - Only transfer changed chunks
2. **Compression** - Zstd compression (typically 10-30% reduction)
3. **Regional caching** - CDN for frequently accessed content
4. **Peer-to-peer** - Optional LAN transfer (no egress charges)

```rust
pub struct TransferMetrics {
    /// Bytes transferred
    pub bytes: u64,

    /// Transfer type
    pub transfer_type: TransferType,

    /// Source region
    pub source_region: String,

    /// Destination region
    pub dest_region: String,
}

pub enum TransferType {
    SameRegion,
    CrossRegion,
    CrossCloud,
    Internet,
}

impl TransferMetrics {
    pub fn calculate_cost(&self, tier: &PricingTier) -> Decimal {
        let gb = Decimal::from(self.bytes) / Decimal::from(1_073_741_824);
        let rate = tier.transfer_rate(&self.transfer_type);
        gb * rate
    }
}
```

---

## Operations Pricing

### API Calls

| Operation Type | Free/month | Pro/month | Team/month | Overage |
|----------------|------------|-----------|------------|---------|
| Read operations | 10,000 | 100,000 | 1,000,000 | $0.0004/1000 |
| Write operations | 1,000 | 10,000 | 100,000 | $0.005/1000 |
| List operations | 1,000 | 10,000 | 100,000 | $0.005/1000 |

### Compute Operations

| Operation | Cost |
|-----------|------|
| Chunking (per GB processed) | $0.01 |
| Proxy generation (per minute of video) | $0.02 |
| Thumbnail generation (per image) | $0.001 |
| Format conversion | $0.05/minute |

### Examples

```
Uploading 100 GB of video:
- Chunking: 100 GB × $0.01 = $1.00
- Write operations: ~1,600,000 chunks × $0.005/1000 = $8.00
- Total: $9.00

Generating proxies for 60-minute video:
- Proxy generation: 60 min × $0.02 = $1.20
- Thumbnail generation: 60 thumbnails × $0.001 = $0.06
- Total: $1.26
```

---

## Add-Ons

### Premium Support

| Level | Response Time | Price |
|-------|---------------|-------|
| Standard | 48 hours | Included (Pro+) |
| Priority | 24 hours | Included (Team+) |
| Business Critical | 4 hours | $500/month |
| Enterprise | 1 hour | $2,000/month |
| Dedicated TAM | Named contact | $5,000/month |

### Compliance Packages

| Package | Includes | Price |
|---------|----------|-------|
| SOC 2 Type II | Annual audit, reports | $1,000/month |
| HIPAA | BAA, additional controls | $2,000/month |
| GDPR | DPA, EU hosting | Included (Team+) |
| Custom compliance | Varies | Contact sales |

### Advanced Features

| Feature | Price |
|---------|-------|
| Custom domain | $10/month |
| Additional regions | $50/region/month |
| Dedicated infrastructure | $500/month base |
| SLA upgrade (99.99%) | $200/month |
| Extended audit logs (2 years) | $100/month |

---

## Discounts

### Commitment Discounts

| Term | Discount |
|------|----------|
| Monthly | 0% |
| Annual (prepaid) | 15% |
| 3-year (prepaid) | 30% |

### Volume Discounts

| Storage Volume | Discount |
|----------------|----------|
| 0 - 1 TB | 0% |
| 1 - 10 TB | 10% |
| 10 - 100 TB | 20% |
| 100+ TB | 30% |

### Special Programs

| Program | Discount | Eligibility |
|---------|----------|-------------|
| Startups | 50% for 1 year | < $5M funding, < 3 years old |
| Education | 50% | Verified edu institutions |
| Non-profit | 50% | 501(c)(3) or equivalent |
| Open source | Free Team tier | OSI-approved license |

---

## Billing

### Billing Cycle

- Subscriptions billed monthly or annually
- Usage calculated and billed at end of month
- Invoices generated on 1st of month
- Payment due within 30 days (Net 30)

### Payment Methods

- Credit card (Visa, Mastercard, Amex)
- ACH bank transfer (US)
- Wire transfer (Enterprise)
- Invoice (Enterprise, Net 30)

### Currency

- All prices in USD
- EUR, GBP, CAD available for annual plans
- Exchange rates updated monthly

### Taxes

- Prices exclude applicable taxes
- VAT charged for EU customers (unless valid VAT ID)
- Sales tax charged based on jurisdiction

---

## Cost Estimation

### Calculator API

```rust
pub struct CostEstimate {
    /// Estimated monthly storage cost
    pub storage: Decimal,

    /// Estimated monthly transfer cost
    pub transfer: Decimal,

    /// Estimated monthly operations cost
    pub operations: Decimal,

    /// Estimated monthly add-ons cost
    pub addons: Decimal,

    /// Total estimated monthly cost
    pub total: Decimal,

    /// Breakdown by category
    pub breakdown: Vec<CostLineItem>,
}

pub struct CostCalculator {
    tier: PricingTier,
}

impl CostCalculator {
    pub fn estimate(
        &self,
        storage_gb: u64,
        transfer_gb: u64,
        users: u32,
        options: &EstimateOptions,
    ) -> CostEstimate {
        let storage_cost = self.calculate_storage(storage_gb, &options.storage_mix);
        let transfer_cost = self.calculate_transfer(transfer_gb, &options.transfer_mix);
        let user_cost = self.calculate_users(users);
        let addon_cost = self.calculate_addons(&options.addons);

        CostEstimate {
            storage: storage_cost,
            transfer: transfer_cost,
            operations: Decimal::ZERO, // Typically included
            addons: addon_cost,
            total: storage_cost + transfer_cost + user_cost + addon_cost,
            breakdown: vec![
                CostLineItem::new("Base subscription", user_cost),
                CostLineItem::new("Storage", storage_cost),
                CostLineItem::new("Transfer", transfer_cost),
                CostLineItem::new("Add-ons", addon_cost),
            ],
        }
    }
}
```

### Example Scenarios

**Solo Creator (Pro)**
```
- 50 GB storage (within included)
- 100 GB transfer/month (within included)
- 1 user

Monthly: $20
Annual: $20 × 12 × 0.85 = $204
```

**Small Studio (Team, 5 users)**
```
- 2 TB storage (500 GB included, 1.5 TB overage)
- 5 TB transfer/month (2 TB included, 3 TB overage)
- 5 users

Base: 5 × $50 = $250
Storage overage: 1,500 GB × $0.015 = $22.50
Transfer overage: 3,000 GB × $0.04 = $120
Monthly: $392.50
Annual (15% off): $4,003.50
```

**Production House (Team, 20 users)**
```
- 20 TB storage
- 50 TB transfer/month
- 20 users + SSO + Priority Support

Base: 20 × $50 = $1,000
Storage overage: 19,500 GB × $0.015 = $292.50
Transfer overage: 48,000 GB × $0.04 = $1,920
Monthly: $3,212.50

With volume discount (20%):
Monthly: $2,570
Annual (15% off): $26,214
```

---

## Comparison to Alternatives

### vs. Cloud Storage (S3, GCS)

| Feature | Dits Pro | Raw S3 |
|---------|----------|--------|
| Storage (100 GB) | $20/mo | $2.30/mo |
| Version control | Included | Manual |
| Deduplication | Automatic | None |
| Video optimization | Included | None |
| NLE integration | Included | None |
| Total cost of ownership | Lower | Higher (engineering time) |

**Note:** Raw cloud storage requires significant engineering investment to match Dits features.

### vs. Frame.io

| Feature | Dits Team | Frame.io Business |
|---------|-----------|-------------------|
| Storage | 500 GB | 500 GB |
| Price | $50/user | $25/user |
| Version control | Full | Basic |
| Offline access | Full | Limited |
| Self-hosting | Available | No |
| Source control | Yes | No |

### vs. Dropbox/Google Drive

| Feature | Dits Pro | Dropbox Plus |
|---------|----------|--------------|
| Price | $20/mo | $12/mo |
| Video versioning | Optimized | Basic |
| Deduplication | Content-aware | File-level |
| NLE integration | Native | None |
| Large file handling | Unlimited | 2 GB upload limit |

---

## Notes

- Prices subject to change with 30 days notice
- Existing contracts honored for duration
- Enterprise pricing negotiable
- Custom plans available for unique requirements
- Contact sales@dits.io for quotes
