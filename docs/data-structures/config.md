# Config Data Structure

**Maturity:** Current

This document describes the configuration type in `apps/cli/src/config/mod.rs`. It is
an implementation-level TOML schema, not the broader configuration system proposed in
older design documents.

## Schema

```rust
pub struct Config {
    pub user: UserConfig,
    pub core: CoreConfig,
    pub chunking: ChunkingConfig,
    pub telemetry: TelemetrySettings,
    pub extra: BTreeMap<String, toml::Value>,
}

pub struct UserConfig {
    pub name: Option<String>,
    pub email: Option<String>,
}

pub struct CoreConfig {
    pub default_branch: String, // "main"
    pub verbose: bool,          // false
}

pub struct ChunkingConfig {
    pub target_size: u64, // 64 KiB
    pub min_size: u64,    // 16 KiB
    pub max_size: u64,    // 256 KiB
}

pub struct TelemetrySettings {
    pub enabled: bool,          // false
    pub user_id: Option<String>,
    pub last_sent: u64,         // 0
}
```

Every top-level section uses Serde defaults. An absent file therefore loads as the full
default `Config`. Unknown hand-authored TOML sections are captured in `extra`, but no
core runtime behavior is attached to them.

## Locations

| Scope | Path |
| :--- | :--- |
| Repository | `.dits/config.toml` |
| Global | `<platform config directory>/dits/config.toml` |

There is no system or worktree configuration level. `.dits/config` is a separate file
used by sparse-checkout commands and must not be confused with `.dits/config.toml`.

## Loading semantics

The current implementation selects one document; it does not field-merge a hierarchy.
The `dits config` command uses the repository file inside a repository unless
`--global` is present. Repository object processing uses repository-local chunking
settings or defaults and currently does not inherit the global file.

The global file is loaded directly by the telemetry manager. As a result,
`telemetry.enabled` has a global runtime effect, while global `chunking.*`, `user.*`,
and `core.*` values should be treated as stored preferences only.

## Key API

The dot-notation API accepts these public keys:

```text
user.name
user.email
core.default_branch
core.verbose
chunking.target_size
chunking.min_size
chunking.max_size
telemetry.enabled
```

`user.name` and `user.email` are the only optional public values and the only public
keys that can be unset. `telemetry.user_id` and `telemetry.last_sent` are internal
persistence fields and are omitted from list output.

Size parsing accepts raw bytes or `B`, `KB`, `MB`, and `GB` suffixes. Cross-field
constraints are not currently validated, so callers must preserve
`min_size <= target_size <= max_size` and values that fit the chunker representation.

## Serialization example

```toml
[user]
name = "Jane Editor"
email = "jane@example.com"

[core]
default_branch = "main"
verbose = false

[chunking]
target_size = 65536
min_size = 16384
max_size = 262144

[telemetry]
enabled = false
last_sent = 0
```

Files written by `Config::save` are pretty-printed TOML. The format has no version
field or migration layer, so it must not be presented as a stable external protocol.

## Deliberately separate data

- Remote names and URLs are JSON in `.dits/remotes`.
- Ignore rules live in `.ditsignore`.
- Hook scripts live in `.dits/hooks/` and receive `DITS_DIR` and `DITS_HOOK` as process
  context.
- Commit identity is read from `DITS_AUTHOR_NAME` / `DITS_AUTHOR_EMAIL` with Git and OS
  fallbacks; `user.*` is not wired to commit creation yet.

## Design boundary

Aliases, credentials, transfer settings, cache limits, editor/pager selection, color,
signing, compression selection, remote refspecs, system/worktree levels, environment
overrides, and command-scoped `-c` values are design-only. They are not members of the
current schema and are rejected by the dot-notation setter.
