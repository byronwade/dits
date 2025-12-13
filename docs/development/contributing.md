# Contributing Guide

How to contribute to Dits: code, documentation, and community guidelines.

---

## Overview

Thank you for your interest in contributing to Dits! This guide covers everything you need to know to contribute effectively to the project.

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must adhere to our Code of Conduct:

### Our Standards

**Be Respectful:** Treat everyone with respect. No harassment, discrimination, or personal attacks.

**Be Constructive:** Provide helpful feedback. Focus on the code, not the person.

**Be Collaborative:** Work together towards common goals. Help others learn and grow.

**Be Professional:** Maintain professional conduct in all interactions.

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban from the project
3. Permanent ban

Report violations to: conduct@dits.io

---

## Getting Started

### Prerequisites

```bash
# Required tools
- Rust 1.75+ (rustup recommended)
- Node.js 20+ (for web UI)
- PostgreSQL 15+
- Docker (for testing)
- Git

# Optional but recommended
- cargo-watch (live reload)
- cargo-nextest (faster tests)
- just (command runner)
```

### Development Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/dits.git
cd dits

# 3. Add upstream remote
git remote add upstream https://github.com/dits-io/dits.git

# 4. Install dependencies
cargo build

# 5. Set up the database
docker-compose up -d postgres
cargo run --bin dits-migrate

# 6. Run tests to verify setup
cargo test

# 7. Start development server
cargo run --bin dits-server
```

### Repository Structure

```
dits/
├── crates/
│   ├── dits-core/        # Core library (chunking, hashing, manifests)
│   ├── dits-client/      # CLI client
│   ├── dits-server/      # API server
│   ├── dits-storage/     # Storage backends (S3, local)
│   ├── dits-parsers/     # File format parsers (ISOBMFF, NLE)
│   ├── dits-protocol/    # Wire protocol
│   └── dits-sdk/         # Rust SDK
├── web/                  # Web UI (React/TypeScript)
├── plugins/
│   ├── premiere/         # Premiere Pro plugin
│   ├── resolve/          # DaVinci Resolve plugin
│   └── vscode/           # VS Code extension
├── docs/                 # Documentation
├── tests/                # Integration tests
└── benches/              # Benchmarks
```

---

## Contribution Types

### Code Contributions

We accept contributions for:
- Bug fixes
- New features (discuss first in an issue)
- Performance improvements
- Documentation improvements
- Test coverage improvements

### Documentation

Help improve our docs:
- Fix typos and errors
- Add missing information
- Improve clarity and examples
- Translate documentation

### Issue Triage

Help manage issues:
- Reproduce and verify bugs
- Add missing information
- Suggest solutions
- Close duplicates

### Community Support

Help other users:
- Answer questions on GitHub Discussions
- Help on Discord
- Write tutorials and blog posts

---

## Development Workflow

### Branch Strategy

```
main          <- Production-ready code
├── develop   <- Integration branch (optional)
├── feature/* <- New features
├── fix/*     <- Bug fixes
├── docs/*    <- Documentation changes
└── refactor/* <- Code refactoring
```

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/my-feature

# Or bug fix branch
git checkout -b fix/issue-123
```

### Making Changes

1. **Write code** following our style guide
2. **Write tests** for new functionality
3. **Update documentation** if needed
4. **Run tests locally** before pushing

```bash
# Run tests
cargo test

# Run specific test
cargo test test_name

# Run with nextest (faster)
cargo nextest run

# Run lints
cargo clippy --all-targets --all-features

# Format code
cargo fmt

# Check for issues
just check
```

### Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**

```bash
# Feature
git commit -m "feat(chunker): add support for variable chunk sizes"

# Bug fix with issue reference
git commit -m "fix(api): handle empty repository clone

Fixes #123"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(protocol)!: change wire format to binary

BREAKING CHANGE: Wire protocol version bumped to 2.0.
Clients must upgrade to continue connecting."
```

### Pull Request Process

1. **Push your branch**
```bash
git push origin feature/my-feature
```

2. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Fill out the PR template
   - Add appropriate labels

3. **PR Template**
```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123
Related to #456

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
How to test these changes

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
```

4. **Review Process**
   - At least one maintainer review required
   - CI must pass
   - Address feedback promptly
   - Squash commits if requested

5. **Merge**
   - Maintainers will merge approved PRs
   - We use squash merge for most PRs
   - Rebase merge for multi-commit features

---

## Code Style

### Rust Style Guide

```rust
// Use rustfmt defaults with these overrides (.rustfmt.toml):
// edition = "2021"
// max_width = 100
// use_small_heuristics = "Max"

// Good: Clear, idiomatic Rust
pub fn chunk_file(path: &Path, options: &ChunkOptions) -> Result<Vec<Chunk>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);

    let chunker = FastCdc::new(
        options.min_size,
        options.avg_size,
        options.max_size,
    );

    chunker.chunk_reader(reader)
}

// Error handling: Use thiserror for library errors
#[derive(Debug, thiserror::Error)]
pub enum ChunkError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid chunk size: {size} (must be {min}-{max})")]
    InvalidSize { size: usize, min: usize, max: usize },
}

// Documentation: Use rustdoc conventions
/// Chunks a file using content-defined chunking.
///
/// # Arguments
///
/// * `path` - Path to the file to chunk
/// * `options` - Chunking options (min/avg/max size)
///
/// # Returns
///
/// A vector of chunks with their hashes and boundaries.
///
/// # Errors
///
/// Returns an error if the file cannot be read or chunking fails.
///
/// # Example
///
/// ```rust
/// use dits_core::chunk_file;
///
/// let chunks = chunk_file(Path::new("video.mp4"), &ChunkOptions::default())?;
/// println!("Created {} chunks", chunks.len());
/// ```
pub fn chunk_file(path: &Path, options: &ChunkOptions) -> Result<Vec<Chunk>> {
    // ...
}
```

### TypeScript Style Guide

```typescript
// Use Prettier + ESLint defaults

// Good: Clear types, functional style
interface ChunkUploadOptions {
  concurrency: number;
  retries: number;
  onProgress?: (progress: UploadProgress) => void;
}

async function uploadChunks(
  chunks: Chunk[],
  options: ChunkUploadOptions
): Promise<UploadResult> {
  const { concurrency, retries, onProgress } = options;

  const results = await pMap(
    chunks,
    (chunk) => uploadChunk(chunk, { retries }),
    { concurrency }
  );

  return {
    uploaded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success),
  };
}
```

### SQL Style Guide

```sql
-- Use lowercase keywords
-- Use snake_case for identifiers
-- Align columns for readability

select
    r.id,
    r.name,
    r.created_at,
    count(c.id) as commit_count
from repositories r
left join commits c on c.repository_id = r.id
where r.organization_id = $1
    and r.deleted_at is null
group by r.id, r.name, r.created_at
order by r.created_at desc
limit 100;
```

---

## Testing

### Test Categories

```rust
// Unit tests: In the same file as code
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_boundaries() {
        let data = b"hello world";
        let chunks = chunk_data(data, &ChunkOptions::default());
        assert_eq!(chunks.len(), 1);
    }
}

// Integration tests: In tests/ directory
// tests/integration/chunking_test.rs
#[tokio::test]
async fn test_end_to_end_chunking() {
    let server = TestServer::start().await;
    let client = server.client();

    let repo = client.create_repo("test").await.unwrap();
    let file = generate_test_video(1024 * 1024);

    client.push_file(&repo, &file).await.unwrap();

    let pulled = client.pull_file(&repo, &file.name).await.unwrap();
    assert_eq!(file.content, pulled.content);
}
```

### Running Tests

```bash
# All tests
cargo test

# Specific crate
cargo test -p dits-core

# Specific test
cargo test test_chunk_boundaries

# Integration tests only
cargo test --test '*'

# With coverage
cargo tarpaulin --out Html

# Benchmarks
cargo bench
```

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Integration tests for cross-component features

---

## Documentation

### Code Documentation

- All public APIs must be documented
- Include examples for complex functions
- Document error conditions
- Update changelog for user-facing changes

### Building Documentation

```bash
# Build Rust docs
cargo doc --open

# Build all documentation
just docs

# Serve documentation locally
just docs-serve
```

### Writing Documentation

```markdown
# Feature Name

Brief description of the feature.

## Overview

More detailed explanation with context.

## Usage

### Basic Example

\`\`\`rust
// Example code with comments
let result = feature.do_thing()?;
\`\`\`

### Advanced Example

\`\`\`rust
// More complex example
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `foo` | `u32` | `100` | Description of foo |

## Notes

- Important considerations
- Edge cases
- Performance implications
```

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Cycle

- Patch releases: As needed
- Minor releases: Every 4-6 weeks
- Major releases: Annually (or as needed)

### Changelog

Update `CHANGELOG.md` for user-facing changes:

```markdown
## [Unreleased]

### Added
- New feature X (#123)

### Changed
- Improved performance of Y (#456)

### Fixed
- Bug in Z (#789)

### Deprecated
- Old API method, use new method instead

### Removed
- Legacy feature after deprecation period

### Security
- Fixed vulnerability in W
```

---

## Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, show & tell
- **Discord**: Real-time chat (#dev channel)
- **Email**: dev@dits.io

### Finding Issues to Work On

Look for issues labeled:
- `good first issue`: Good for newcomers
- `help wanted`: We'd appreciate help
- `documentation`: Docs improvements needed
- `bug`: Confirmed bugs
- `enhancement`: Feature requests

### Asking Questions

Before asking:
1. Search existing issues/discussions
2. Check the documentation
3. Try to reproduce/debug

When asking:
- Provide context
- Include error messages
- Share relevant code/config
- Describe what you've tried

---

## Recognition

### Contributors

All contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- GitHub contributor graph

### Types of Recognition

- **Code contributors**: Listed in CONTRIBUTORS.md
- **Documentation contributors**: Listed in docs credits
- **Community contributors**: Highlighted in community updates
- **Core contributors**: May be invited to join maintainer team

---

## Maintainer Guidelines

### For Maintainers

```markdown
# Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are adequate
- [ ] Documentation is updated
- [ ] Changelog is updated (if needed)
- [ ] No security issues introduced
- [ ] Performance is acceptable
- [ ] Breaking changes are documented
```

### Merging PRs

1. Ensure CI passes
2. Ensure adequate review
3. Use squash merge for single-purpose PRs
4. Use rebase merge for multi-commit features
5. Delete branch after merge

### Issue Triage

Labels to apply:
- Priority: `P0` (critical), `P1` (high), `P2` (medium), `P3` (low)
- Type: `bug`, `enhancement`, `documentation`, `question`
- Status: `needs-triage`, `confirmed`, `in-progress`, `blocked`
- Area: `core`, `server`, `client`, `web`, `plugins`

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project:

- **Core**: Apache 2.0 / MIT dual license
- **Enterprise features**: Proprietary (contact for contributor agreement)

---

## Notes

- We aim to review PRs within 48 hours
- Be patient during busy periods
- Quality over speed
- Ask for help if stuck
- Have fun!
