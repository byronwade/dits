# Reflog Data Structure

Reference update history and recovery log.

---

## Overview

The Reflog (reference log) records updates to references (branches, HEAD, tags). It provides a safety net for recovering from mistakes and understanding how the repository evolved over time.

---

## Data Structure

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single reflog entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    /// Previous commit hash (or null hash for new refs)
    pub old_hash: String,

    /// New commit hash (or null hash for deleted refs)
    pub new_hash: String,

    /// Who made the change
    pub author: Author,

    /// When the change was made
    pub timestamp: DateTime<Utc>,

    /// Timezone offset in minutes
    pub tz_offset: i32,

    /// Description of the change
    pub message: String,
}

/// Author information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Author {
    /// Author name
    pub name: String,

    /// Author email
    pub email: String,
}

/// Reflog for a specific reference
#[derive(Debug, Clone)]
pub struct Reflog {
    /// Reference name (e.g., "refs/heads/main", "HEAD")
    pub ref_name: String,

    /// Entries in reverse chronological order (newest first)
    pub entries: Vec<ReflogEntry>,
}

/// Null hash for missing references
const NULL_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";
```

---

## Operations

### Recording Entries

```rust
impl Reflog {
    /// Record a new reflog entry
    pub fn record(
        &mut self,
        old_hash: Option<&str>,
        new_hash: &str,
        author: &Author,
        message: &str,
    ) {
        let entry = ReflogEntry {
            old_hash: old_hash.unwrap_or(NULL_HASH).to_string(),
            new_hash: new_hash.to_string(),
            author: author.clone(),
            timestamp: Utc::now(),
            tz_offset: Local::now().offset().local_minus_utc() / 60,
            message: message.to_string(),
        };

        self.entries.insert(0, entry);
    }

    /// Get entry by index (0 = most recent)
    pub fn get(&self, index: usize) -> Option<&ReflogEntry> {
        self.entries.get(index)
    }

    /// Get entry by specifier (e.g., "main@{2}", "HEAD@{yesterday}")
    pub fn resolve(&self, specifier: &str) -> Option<&ReflogEntry> {
        // Parse specifier
        let spec = ReflogSpec::parse(specifier)?;

        match spec {
            ReflogSpec::Index(n) => self.get(n),
            ReflogSpec::Time(time) => self.at_time(time),
            ReflogSpec::Pattern(pat) => self.by_pattern(&pat),
        }
    }

    /// Find entry at or before a specific time
    pub fn at_time(&self, time: DateTime<Utc>) -> Option<&ReflogEntry> {
        self.entries.iter().find(|e| e.timestamp <= time)
    }

    /// Find entry matching a pattern in message
    pub fn by_pattern(&self, pattern: &str) -> Option<&ReflogEntry> {
        let regex = Regex::new(pattern).ok()?;
        self.entries.iter().find(|e| regex.is_match(&e.message))
    }
}

/// Reflog specifier parser
#[derive(Debug)]
pub enum ReflogSpec {
    /// Numeric index (e.g., @{0}, @{5})
    Index(usize),

    /// Time-based (e.g., @{yesterday}, @{2.hours.ago})
    Time(DateTime<Utc>),

    /// Pattern match (e.g., @{/commit message})
    Pattern(String),
}

impl ReflogSpec {
    pub fn parse(s: &str) -> Option<Self> {
        // Remove @{ prefix and } suffix
        let inner = s.strip_prefix("@{")?.strip_suffix("}")?;

        // Try numeric index
        if let Ok(n) = inner.parse::<usize>() {
            return Some(ReflogSpec::Index(n));
        }

        // Try time expressions
        if let Some(time) = Self::parse_time(inner) {
            return Some(ReflogSpec::Time(time));
        }

        // Try pattern (starts with /)
        if let Some(pat) = inner.strip_prefix('/') {
            return Some(ReflogSpec::Pattern(pat.to_string()));
        }

        None
    }

    fn parse_time(s: &str) -> Option<DateTime<Utc>> {
        let now = Utc::now();

        match s {
            "now" => Some(now),
            "yesterday" => Some(now - Duration::days(1)),
            "last week" | "1.week.ago" => Some(now - Duration::weeks(1)),
            "last month" | "1.month.ago" => Some(now - Duration::days(30)),
            _ => {
                // Parse "N.unit.ago" format
                let parts: Vec<&str> = s.split('.').collect();
                if parts.len() == 3 && parts[2] == "ago" {
                    let n: i64 = parts[0].parse().ok()?;
                    match parts[1] {
                        "second" | "seconds" => Some(now - Duration::seconds(n)),
                        "minute" | "minutes" => Some(now - Duration::minutes(n)),
                        "hour" | "hours" => Some(now - Duration::hours(n)),
                        "day" | "days" => Some(now - Duration::days(n)),
                        "week" | "weeks" => Some(now - Duration::weeks(n)),
                        "month" | "months" => Some(now - Duration::days(n * 30)),
                        _ => None,
                    }
                } else {
                    // Try ISO 8601 format
                    DateTime::parse_from_rfc3339(s)
                        .ok()
                        .map(|d| d.with_timezone(&Utc))
                }
            }
        }
    }
}
```

### Repository Integration

```rust
impl Repository {
    /// Get reflog for a reference
    pub fn reflog(&self, ref_name: &str) -> Result<Reflog> {
        let path = self.reflog_path(ref_name);

        if !path.exists() {
            return Ok(Reflog {
                ref_name: ref_name.to_string(),
                entries: Vec::new(),
            });
        }

        let content = fs::read_to_string(&path)?;
        let entries = content
            .lines()
            .map(ReflogEntry::parse)
            .collect::<Result<Vec<_>>>()?;

        Ok(Reflog {
            ref_name: ref_name.to_string(),
            entries,
        })
    }

    /// Record reflog entry when updating a reference
    pub fn update_ref_with_reflog(
        &self,
        ref_name: &str,
        old_hash: Option<&str>,
        new_hash: &str,
        message: &str,
    ) -> Result<()> {
        // Update the reference
        self.update_ref(ref_name, new_hash)?;

        // Record in reflog
        if self.config.core.log_all_ref_updates {
            let mut reflog = self.reflog(ref_name)?;
            let author = self.default_author()?;
            reflog.record(old_hash, new_hash, &author, message);
            self.save_reflog(&reflog)?;
        }

        Ok(())
    }

    /// Save reflog to disk
    fn save_reflog(&self, reflog: &Reflog) -> Result<()> {
        let path = self.reflog_path(&reflog.ref_name);

        // Ensure directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Format entries
        let content = reflog.entries
            .iter()
            .map(|e| e.format())
            .collect::<Vec<_>>()
            .join("\n");

        // Write atomically
        let temp = path.with_extension("tmp");
        fs::write(&temp, &content)?;
        fs::rename(&temp, &path)?;

        Ok(())
    }

    fn reflog_path(&self, ref_name: &str) -> PathBuf {
        self.dits_dir.join("logs").join(ref_name)
    }

    /// Expire old reflog entries
    pub fn gc_reflog(&self, ref_name: &str, options: &GcOptions) -> Result<usize> {
        let mut reflog = self.reflog(ref_name)?;
        let original_len = reflog.entries.len();

        // Remove entries older than expiry
        let cutoff = Utc::now() - options.reflog_expire;
        reflog.entries.retain(|e| e.timestamp > cutoff);

        // Keep at least some recent entries
        if reflog.entries.len() < options.reflog_keep_min {
            reflog.entries = self.reflog(ref_name)?.entries
                .into_iter()
                .take(options.reflog_keep_min)
                .collect();
        }

        let removed = original_len - reflog.entries.len();
        if removed > 0 {
            self.save_reflog(&reflog)?;
        }

        Ok(removed)
    }
}

/// Garbage collection options
pub struct GcOptions {
    /// Expire reflog entries older than this
    pub reflog_expire: Duration,

    /// Always keep at least this many entries
    pub reflog_keep_min: usize,
}

impl Default for GcOptions {
    fn default() -> Self {
        Self {
            reflog_expire: Duration::days(90),
            reflog_keep_min: 10,
        }
    }
}
```

---

## File Format

### Line Format

```
<old-hash> <new-hash> <author-name> <author-email> <timestamp> <tz-offset> <message>
```

### Example

```
a1b2c3d4... e5f6g7h8... John Doe john@example.com 1704672000 -0800 commit: Add new feature
e5f6g7h8... i9j0k1l2... John Doe john@example.com 1704758400 -0800 commit: Fix bug
i9j0k1l2... m3n4o5p6... Jane Smith jane@example.com 1704844800 -0800 merge: feature into main
```

### Parsing

```rust
impl ReflogEntry {
    /// Parse a reflog line
    pub fn parse(line: &str) -> Result<Self> {
        let parts: Vec<&str> = line.splitn(7, ' ').collect();

        if parts.len() < 7 {
            return Err(Error::InvalidReflogFormat);
        }

        let old_hash = parts[0].to_string();
        let new_hash = parts[1].to_string();
        let author_name = parts[2].to_string();
        let author_email = parts[3].to_string();
        let timestamp: i64 = parts[4].parse()?;
        let tz_offset: i32 = parts[5].parse()?;
        let message = parts[6..].join(" ");

        Ok(ReflogEntry {
            old_hash,
            new_hash,
            author: Author {
                name: author_name,
                email: author_email,
            },
            timestamp: DateTime::from_timestamp(timestamp, 0)
                .ok_or(Error::InvalidTimestamp)?
                .with_timezone(&Utc),
            tz_offset,
            message,
        })
    }

    /// Format entry as a reflog line
    pub fn format(&self) -> String {
        format!(
            "{} {} {} {} {} {:+05} {}",
            self.old_hash,
            self.new_hash,
            self.author.name,
            self.author.email,
            self.timestamp.timestamp(),
            self.tz_offset,
            self.message
        )
    }
}
```

---

## Directory Structure

```
.dits/
└── logs/
    ├── HEAD                    # HEAD reflog
    └── refs/
        ├── heads/
        │   ├── main            # main branch reflog
        │   ├── feature         # feature branch reflog
        │   └── ...
        ├── remotes/
        │   └── origin/
        │       ├── main
        │       └── ...
        └── tags/
            ├── v1.0.0
            └── ...
```

---

## Common Use Cases

### Undo Last Commit

```bash
# View recent HEAD history
dits reflog

# Output:
# e5f6g7h8 HEAD@{0}: commit: Add new feature
# a1b2c3d4 HEAD@{1}: commit: Previous commit
# ...

# Reset to previous state
dits reset --hard HEAD@{1}
```

### Recover Deleted Branch

```bash
# Find when branch was deleted
dits reflog show feature

# Output:
# m3n4o5p6 feature@{0}: branch: Deleted
# i9j0k1l2 feature@{1}: commit: Last commit on feature
# ...

# Recreate branch
dits branch feature feature@{1}
```

### Find When Change Happened

```bash
# Find commit from yesterday
dits log main@{yesterday}..main

# Find commit from 2 hours ago
dits show main@{2.hours.ago}

# Search by commit message
dits log main@{/fix bug}
```

---

## Special Reflog Messages

The following message prefixes are used by different operations:

| Prefix | Operation |
|--------|-----------|
| `commit:` | New commit created |
| `commit (amend):` | Commit amended |
| `commit (merge):` | Merge commit created |
| `checkout:` | Branch/commit checkout |
| `branch:` | Branch created/deleted |
| `reset:` | Reset operation |
| `rebase:` | Rebase operation |
| `pull:` | Pull operation |
| `push:` | Push operation (local tracking) |
| `clone:` | Initial clone |
| `fetch:` | Fetch operation |

---

## Configuration

```toml
[core]
# Whether to log ref updates (default: true)
log_all_ref_updates = true

[gc]
# Expire reflog entries after this time (default: 90 days)
reflog_expire = "90d"

# Expire unreachable reflog entries after this time (default: 30 days)
reflog_expire_unreachable = "30d"

# Always keep at least this many entries (default: 10)
reflog_keep_min = 10
```

---

## Notes

- Reflog is local-only and not synced to remotes
- HEAD reflog tracks all operations that change HEAD
- Branch reflogs track operations on specific branches
- Reflog entries expire during garbage collection
- Use `dits reflog expire` to manually prune old entries
- Useful for disaster recovery and understanding history
