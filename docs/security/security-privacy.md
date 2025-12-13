# Security & Privacy Guide

How Dits protects your data, ensures privacy, and maintains the integrity of your repositories.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Data Integrity](#data-integrity)
3. [Encryption](#encryption)
4. [Authentication](#authentication)
5. [Authorization & Access Control](#authorization--access-control)
6. [Network Security](#network-security)
7. [Local Security](#local-security)
8. [DitsHub Security](#ditshub-security)
9. [Self-Hosted Security](#self-hosted-security)
10. [Privacy](#privacy)
11. [Security Best Practices](#security-best-practices)
12. [Compliance](#compliance)
13. [Security FAQ](#security-faq)
14. [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Security Overview

### Security Principles

Dits is built on four core security principles:

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access by default
3. **Data Integrity**: Cryptographic verification of all content
4. **Transparency**: Open source, auditable code

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   CLIENT    │  │  TRANSPORT  │  │   SERVER    │              │
│  │  SECURITY   │  │  SECURITY   │  │  SECURITY   │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ Local auth  │  │ TLS 1.3     │  │ Auth/AuthZ  │              │
│  │ Encryption  │  │ QUIC        │  │ Rate limits │              │
│  │ Key storage │  │ P2P crypto  │  │ Audit logs  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    DATA INTEGRITY                          │  │
│  │         BLAKE3 hashes on ALL content                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Integrity

### Content Addressing with BLAKE3

Every piece of content in Dits is identified by its BLAKE3 cryptographic hash:

```
File content → BLAKE3 hash → Storage identifier

Example:
  video.mp4 (10 GB) → BLAKE3 → "abc123def456..."
```

**Properties:**
- **Deterministic**: Same content always produces same hash
- **Collision-resistant**: Computationally infeasible to find two inputs with same hash
- **Tamper-evident**: Any change produces completely different hash

### Chunk Verification

Every chunk is verified when read:

```bash
# Automatic verification on every read
dits restore video.mp4

# Behind the scenes:
# 1. Read chunk from storage
# 2. Compute BLAKE3 hash
# 3. Compare with stored hash
# 4. If mismatch → Error, chunk corrupted
# 5. If match → Return chunk
```

### Repository Integrity Check

```bash
# Full integrity verification
dits fsck

# Output:
# Checking objects...
# Verifying 45,678 chunks...
#   [████████████████████████████] 100%
# All chunks verified ✓
# Checking references...
# Checking manifests...
# Repository is healthy.

# Strict checking (more thorough)
dits fsck --strict
```

### Integrity Guarantees

| Scenario | Protection |
|----------|------------|
| Bit rot on disk | Detected on read |
| Corrupted transfer | Detected, retried |
| Malicious modification | Immediately detected |
| Storage system error | Caught before use |

---

## Encryption

### Encryption in Transit

All network transfers are encrypted:

**HTTPS/TLS:**
```
dits push origin main

Connection:
- TLS 1.3
- ECDHE key exchange
- AES-256-GCM encryption
- Certificate validation
```

**QUIC Protocol:**
```
For high-bandwidth transfers:
- Built-in TLS 1.3
- 0-RTT resumption
- UDP-based (faster for large files)
```

**P2P Transfers:**
```
dits p2p share

Security:
- AES-256-GCM encryption
- SPAKE2 key exchange (from join code)
- End-to-end (no server involved)
```

### Encryption at Rest (Optional)

Enable repository encryption for sensitive content:

```bash
# Initialize encryption
dits encrypt-init

# You'll be prompted for a passphrase
Enter passphrase: ********
Confirm passphrase: ********

# All content now encrypted before storage
```

**How it works:**
```
┌─────────────┐                ┌─────────────┐
│   Content   │ ───encrypt──▶  │  Encrypted  │
│             │                │   Chunk     │
└─────────────┘                └─────────────┘
        │                             │
        │                             │
    BLAKE3 hash                  Stored in
    (plaintext)                  .dits/objects/

Decryption happens automatically when you access files.
```

**Key Derivation:**
- Argon2id for passphrase → key derivation
- Memory-hard (resists GPU attacks)
- Configurable parameters

### Encryption Options

```bash
# Check encryption status
dits config encryption.enabled

# Enable encryption for new files only
dits config encryption.enabled true

# Encrypt existing content (re-encrypts everything)
dits encrypt-all

# Change passphrase
dits encrypt-change-passphrase
```

---

## Authentication

### Local Authentication

Dits stores credentials securely:

**macOS:**
- Credentials stored in Keychain
- Protected by system authentication

**Linux:**
- Uses libsecret (GNOME Keyring, KDE Wallet)
- Falls back to encrypted file if unavailable

**Windows:**
- Windows Credential Manager
- Protected by Windows authentication

### Remote Authentication

**Token-based (Recommended):**
```bash
# Login to DitsHub
dits login

# Opens browser for authentication
# Token stored securely in keychain
```

**SSH Keys:**
```bash
# Add SSH key to DitsHub
dits ssh-add ~/.ssh/id_ed25519.pub

# Use SSH URL
dits clone git@ditshub.com:org/project.git
```

**Personal Access Tokens:**
```bash
# Create token in DitsHub settings
# Use for CI/CD and scripts

dits config credential.helper store
dits push  # Enter token when prompted
```

### Multi-Factor Authentication (MFA)

For DitsHub accounts:

```bash
# Enable in DitsHub settings
# Supported methods:
# - TOTP (authenticator apps)
# - WebAuthn (hardware keys)
# - SMS (backup only)
```

---

## Authorization & Access Control

### Repository Permissions

| Permission Level | Capabilities |
|-----------------|--------------|
| **Read** | Clone, pull, view history |
| **Write** | Push, create branches/tags |
| **Admin** | Manage settings, permissions, delete |

### Team-Based Access

```
Organization: Acme Corp
├── Team: Editors
│   └── Permissions: Write to all projects
├── Team: Reviewers
│   └── Permissions: Read to all projects
└── Team: Admins
    └── Permissions: Admin to all projects

Project: Hero Commercial
├── Editors: Write
├── Reviewers: Read
└── External Contractor (specific user): Write
```

### Branch Protection

```bash
# Protect main branch (DitsHub)
# Settings → Branches → Add rule

Protected branches:
- main
  ✓ Require pull request
  ✓ Require approval
  ✓ Require status checks
  ✓ No force push
  ✓ No deletion
```

### File-Level Permissions

```bash
# Lock patterns (prevent edits without lock)
dits config lock.required "*.psd,*.blend"

# Only users with lock can modify these files
```

---

## Network Security

### TLS Configuration

Dits enforces modern TLS:

```
Supported:
- TLS 1.3 (preferred)
- TLS 1.2 (minimum)

NOT supported:
- TLS 1.1 (disabled)
- TLS 1.0 (disabled)
- SSLv3 (disabled)
```

### Certificate Validation

```bash
# Strict certificate validation (default)
# Self-signed certs rejected

# For self-hosted with custom CA:
dits config http.sslCAInfo /path/to/ca-bundle.crt

# For testing only (NOT RECOMMENDED):
dits config http.sslVerify false  # Dangerous!
```

### Firewall Considerations

**Outbound ports (client):**
| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | HTTPS | API, web interface |
| 443 | QUIC/UDP | High-speed transfers |
| Dynamic | UDP | P2P NAT traversal |

**Inbound ports (self-hosted server):**
| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | HTTPS | API, web |
| 443 | QUIC/UDP | Transfers |

### Rate Limiting

DitsHub implements rate limiting:

```
API requests: 1000/hour per user
Clone/Push: Bandwidth limits based on plan
Authentication: 10 failed attempts → temporary lockout
```

---

## Local Security

### File Permissions

Dits sets restrictive permissions:

```bash
# .dits/ directory
drwx------  .dits/          # 700: owner only

# Config files
-rw-------  .dits/config    # 600: owner read/write

# Chunks
-r--------  .dits/objects/  # 400: owner read only
```

### Credential Storage

```bash
# Check credential helper
dits config credential.helper

# Options:
# - osxkeychain (macOS)
# - libsecret (Linux with GNOME/KDE)
# - wincred (Windows)
# - store (plain file - NOT recommended)
# - cache (temporary memory)
```

### Sensitive Data

Dits warns about potentially sensitive files:

```bash
# .ditsignore prevents accidental commits
.env
*.key
*.pem
credentials.json
secrets/

# If you try to add sensitive files:
dits add .env
Warning: .env may contain sensitive data.
Are you sure you want to add it? [y/N]
```

---

## DitsHub Security

### Infrastructure Security

**Physical Security:**
- Data centers: AWS (SOC 2 certified)
- Physical access controls
- 24/7 monitoring

**Network Security:**
- DDoS protection
- WAF (Web Application Firewall)
- VPN for administrative access

**Data Security:**
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- Regular backups
- Geographic redundancy

### Data Location

```
DitsHub regions:
- US East (Virginia)
- US West (Oregon)
- EU (Frankfurt)
- Asia Pacific (Singapore)

Data residency: Choose region for compliance
```

### Audit Logging

DitsHub logs security-relevant events:

```
Logged events:
- Authentication (success/failure)
- Authorization changes
- Repository access
- Administrative actions
- API calls
```

### Incident Response

```
Security incident process:
1. Detection (automated monitoring)
2. Containment (isolate affected systems)
3. Investigation (determine scope)
4. Notification (affected users)
5. Remediation (fix and prevent)
6. Post-mortem (lessons learned)
```

---

## Self-Hosted Security

### Server Hardening

For self-hosted Dits servers:

```bash
# Recommended setup
# 1. Dedicated server/container
# 2. Minimal OS installation
# 3. Firewall (only required ports)
# 4. Regular updates
# 5. Intrusion detection

# Example firewall (ufw)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 443/udp   # QUIC
sudo ufw enable
```

### Database Security

```bash
# PostgreSQL hardening
# 1. Strong passwords
# 2. SSL connections required
# 3. Network isolation
# 4. Regular backups
# 5. Encryption at rest

# pg_hba.conf
hostssl all all 0.0.0.0/0 scram-sha-256
```

### Secrets Management

```bash
# Environment variables (minimum)
DITS_DB_PASSWORD=xxx
DITS_JWT_SECRET=xxx
DITS_ENCRYPTION_KEY=xxx

# Better: Use secrets manager
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
```

### Monitoring

```bash
# Recommended monitoring
# - Server metrics (CPU, memory, disk)
# - Application logs
# - Security events
# - Failed authentication attempts
# - Unusual access patterns

# Prometheus metrics endpoint
curl http://localhost:9090/metrics
```

---

## Privacy

### Data We Collect (DitsHub)

**Account Information:**
- Email address
- Name (optional)
- Organization (if applicable)

**Usage Data:**
- Repository metadata (not content)
- API usage statistics
- Error reports (opt-in)

**We DO NOT:**
- Read your repository content
- Sell your data
- Share with third parties (except as required by law)

### Your Data Rights

**GDPR (EU users):**
- Access your data
- Export your data
- Delete your data
- Restrict processing

**CCPA (California users):**
- Know what data we collect
- Delete your data
- Opt-out of data sale (we don't sell)

### Data Retention

```
Active account: Data retained
Deleted account: Data deleted within 30 days
Backups: Purged within 90 days
Logs: Retained 1 year (anonymized after)
```

### Privacy Configuration

```bash
# Disable telemetry (CLI)
dits config telemetry.enabled false

# Anonymous usage (no personal data)
dits config telemetry.anonymous true
```

---

## Security Best Practices

### For Individual Users

```bash
# 1. Use strong, unique passwords
# 2. Enable MFA on your account
# 3. Use SSH keys instead of passwords
# 4. Don't commit sensitive files
# 5. Review before pushing

# Pre-push check
dits diff --stat origin/main

# Check for sensitive patterns
dits grep -E "(password|secret|key)" --staged
```

### For Teams

```bash
# 1. Use team accounts, not shared credentials
# 2. Implement branch protection
# 3. Require code review
# 4. Use file locking for binaries
# 5. Regular access audits

# Audit access
dits access-log --user all --since "30 days ago"
```

### For Organizations

```bash
# 1. Single Sign-On (SSO) integration
# 2. Enforce MFA for all users
# 3. IP allowlisting
# 4. Regular security training
# 5. Incident response plan

# SSO configuration (DitsHub Enterprise)
# Settings → Security → SAML/OIDC
```

### Sensitive File Checklist

Never commit:
- [ ] `.env` files
- [ ] API keys
- [ ] Private keys (`.pem`, `.key`)
- [ ] Credentials files
- [ ] Database dumps
- [ ] Personal data

```bash
# Good .ditsignore
.env
.env.*
*.key
*.pem
*.p12
credentials.json
secrets/
```

---

## Compliance

### Standards & Certifications

**DitsHub:**
- SOC 2 Type II (in progress)
- GDPR compliant
- CCPA compliant

**Self-Hosted:**
- You control compliance
- Dits provides tools for compliance

### HIPAA Considerations

For healthcare data:
```bash
# Use encryption at rest
dits encrypt-init

# Enable audit logging
dits config audit.enabled true

# Self-hosted recommended for PHI
# BAA available for Enterprise customers
```

### Financial Services

For regulated financial data:
```bash
# Encryption required
dits encrypt-init

# Access logging
dits config audit.detailed true

# Geographic restrictions
# Choose appropriate DitsHub region
```

---

## Security FAQ

### Is my data safe?

Yes. All data is:
- Encrypted in transit (TLS 1.3)
- Optionally encrypted at rest
- Verified with BLAKE3 hashes
- Backed up regularly (DitsHub)

### Can Dits employees read my code?

No. Repository content is:
- Stored encrypted
- Not accessed by employees
- Only you have keys (with encryption enabled)

### What if I lose my encryption passphrase?

Without the passphrase:
- Encrypted data cannot be recovered
- This is by design (no backdoors)
- **Keep your passphrase safe!**

### Is P2P sharing secure?

Yes. P2P transfers use:
- End-to-end encryption (AES-256-GCM)
- Authenticated key exchange (SPAKE2)
- No data passes through servers

### How do I rotate credentials?

```bash
# Regenerate personal access token
# 1. Go to DitsHub settings
# 2. Revoke old token
# 3. Generate new token
# 4. Update local config

dits config --unset credential.helper
dits push  # Enter new token
```

---

## Reporting Vulnerabilities

### Responsible Disclosure

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email: security@dits.io
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information

### What to Expect

```
Response timeline:
- Acknowledgment: 24 hours
- Initial assessment: 72 hours
- Status update: Weekly
- Fix timeline: Depends on severity

Critical: 24-48 hours
High: 1 week
Medium: 2 weeks
Low: Next release
```

### Bug Bounty

DitsHub offers bounties for qualifying vulnerabilities:
- Critical: $1,000 - $5,000
- High: $500 - $1,000
- Medium: $100 - $500
- Low: Recognition

Details: https://ditshub.com/security/bounty

---

## Additional Resources

- [Dits Security Whitepaper](https://docs.dits.io/security/whitepaper)
- [DitsHub Security Page](https://ditshub.com/security)
- [Self-Hosting Security Guide](../operations/self-hosting.md)
- [Compliance Documentation](https://ditshub.com/compliance)

---

## Contact

- **Security Issues**: security@dits.io
- **General Support**: support@dits.io
- **Enterprise Security**: enterprise@dits.io
