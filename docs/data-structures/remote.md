# Remote Data Structure

**Maturity:** Current

A configured remote contains a name, URL, and optional push URL and is stored as JSON
in `.dits/remotes`. Recording and inspecting this metadata works. `push`, `pull`,
`fetch`, and `sync` fail closed, and network clone is unavailable.

See [remote CLI status](../user-guide/cli-reference.md) and [`../STATUS.md`](../STATUS.md). Any serialized form not
explicitly governed by an accepted ADR and conformance corpus remains an implementation
detail.
