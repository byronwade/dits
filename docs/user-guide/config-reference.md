# Configuration Reference

**Maturity:** Current

Current-alpha TOML and environment behavior; broader layered configuration remains Design.

This page documents the configuration behavior implemented by the current Dits alpha.

> **Current boundary:** Dits does not yet implement a Git-style layered configuration
> stack. The CLI selects either one repository file or one global file. System,
> worktree, command-line override, and arbitrary environment-variable layers are design
> work, not current behavior.

## Files and selection rules

| Scope | File | How to select it |
| :--- | :--- | :--- |
| Repository | `.dits/config.toml` | Run `dits config` inside a repository without `--global` |
| Global | the platform configuration directory plus `dits/config.toml` | Pass `--global` |

Common global locations are
`${XDG_CONFIG_HOME:-$HOME/.config}/dits/config.toml` on Linux,
`~/Library/Application Support/dits/config.toml` on macOS, and the roaming application
data directory plus `dits\config.toml` on Windows. Dits derives this location from the
operating system; there is no `DITS_CONFIG_GLOBAL` override.

Selection is intentionally simple in this alpha:

- inside a repository, an unqualified get, set, unset, or list reads only
  `.dits/config.toml`;
- `--global` always selects the global file;
- outside a repository, `dits config` and `dits config --list` select the global file;
- outside a repository, a keyed operation such as `dits config user.name` requires
  `--global` and otherwise returns a repository error; and
- values from the two files are not merged into an effective view.

Repository operations currently use repository-local chunking values or built-in
defaults. They do not inherit chunking values written with `--global`.

## Command

```text
dits config [OPTIONS] [KEY] [VALUE]

Arguments:
  [KEY]    Dot-notation key, for example user.name
  [VALUE]  New value; omit it to read the key

Options:
      --global  Use the global file
  -l, --list    List public values from the selected file
      --unset   Remove an optional key
  -h, --help    Show command help
```

Examples:

```bash
# Repository file
dits config chunking.target_size 128KB
dits config chunking.target_size
dits config --list

# Global file
dits config --global telemetry.enabled false
dits config --global --list

# Only optional identity fields can be unset
dits config --global --unset user.email
```

`--local`, `--system`, `--edit`, `--show-origin`, `--get-all`, `--add`, and top-level
`-c`/`--config` overrides do not exist.

## Accepted keys

| Key | Type/default | Current effect | Can unset? |
| :--- | :--- | :--- | :--- |
| `user.name` | optional string | Stored for compatibility; commits do not read it yet | Yes |
| `user.email` | optional string | Stored for compatibility; commits do not read it yet | Yes |
| `core.default_branch` | string, `main` | Stored only; new repositories still start on `main` | No |
| `core.verbose` | Boolean, `false` | Stored only; it is not a global verbosity switch | No |
| `chunking.target_size` | size, `64KB` | Repository-local target/average FastCDC size | No |
| `chunking.min_size` | size, `16KB` | Repository-local minimum FastCDC size | No |
| `chunking.max_size` | size, `256KB` | Repository-local maximum FastCDC size | No |
| `telemetry.enabled` | Boolean, `false` | Global opt-in telemetry switch | No |

Booleans are `true` or `false`. Sizes accept a byte count or a value suffixed with
`B`, `KB`, `MB`, or `GB`, case-insensitively. Keep
`min_size <= target_size <= max_size`; the current parser does not validate the
relationship among the three fields.

The file also contains internal `telemetry.user_id` and `telemetry.last_sent` fields.
They are intentionally omitted from `--list`; prefer `dits telemetry enable`,
`dits telemetry disable`, and `dits telemetry status` over editing telemetry internals.

Unknown keys passed to `dits config` return an error. Extra TOML sections added by hand
may round-trip through serialization, but the core configuration system does not give
them any behavior.

## Runtime support versus stored preferences

Only two parts of this schema currently drive product behavior:

- repository-local `chunking.*` values configure chunking when a repository is opened;
- global `telemetry.enabled` controls the opt-in CLI telemetry client.

The `user.*` and `core.*` keys are accepted and persisted but are not connected to
commit identity, branch initialization, verbosity, an editor, or a pager. This is a
current-alpha limitation, not an implied guarantee that those settings take effect.

## Commit identity environment

Commits currently read identity from environment variables rather than `user.*`
configuration:

| Value | Lookup order |
| :--- | :--- |
| Author name | `DITS_AUTHOR_NAME`, then `GIT_AUTHOR_NAME`, then `USER`, then `Unknown` |
| Author email | `DITS_AUTHOR_EMAIL`, then `GIT_AUTHOR_EMAIL`, then `<name>@localhost` |

```bash
export DITS_AUTHOR_NAME="Jane Editor"
export DITS_AUTHOR_EMAIL="jane@example.com"
dits commit -m "Describe the change"
```

`DITS_AUTHOR_DATE`, `DITS_COMMITTER_*`, `DITS_DIR`, `DITS_WORK_TREE`,
`DITS_CACHE_DIR`, `DITS_EDITOR`, `DITS_PAGER`, `DITS_TRACE`, and remote-auth variables
are not read as CLI configuration in the current implementation. Hook processes do
receive `DITS_DIR` and `DITS_HOOK` from Dits; those are hook context, not user-facing
configuration overrides.

## TOML format

Both supported files use TOML:

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

The `dits config` command writes a complete normalized document, including defaulted
public fields. A malformed repository TOML file prevents the repository from opening
and is left untouched. A malformed global file disables telemetry for unrelated
commands; telemetry status and mutations fail until it is repaired.

## Separate repository metadata

Not every repository setting belongs to `config.toml`:

- `dits remote` stores remote names and URLs in `.dits/remotes` as JSON. Transfer
  commands still fail closed in this alpha.
- `.ditsignore` controls ignored paths.
- sparse-checkout commands maintain their own `.dits/config` file. It is distinct from
  `.dits/config.toml` and is not managed by `dits config`.

## Design-only configuration

System-wide and worktree-specific files, layered precedence, aliases, editor/pager
selection, color settings, cache limits, credentials, transfer tuning, arbitrary
`DITS_CONFIG_*` overrides, and remote authentication remain design work. Do not add
those keys to current files expecting them to change CLI behavior.
