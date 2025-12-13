# Dits Testing Strategy

This document explains Dits' comprehensive testing approach with multiple test suites serving different purposes.

## Test Suites Overview

Dits uses **two complementary test suites** that work together to ensure quality:

### 1. Rust Integration Tests (`tests/`)
**Location**: `apps/cli/tests/`
**Purpose**: Test internal Rust APIs and core functionality
**Runtime**: Fast, runs during `cargo test`
**Coverage**: Unit tests, integration tests, performance benchmarks

**What it tests:**
- Internal data structures (chunks, manifests, commits)
- Core algorithms (FastCDC, hashing, deduplication)
- Repository operations at the Rust API level
- Performance characteristics
- Edge cases and error handling

**When to use:**
- Testing new Rust functionality
- Performance regression testing
- API contract verification
- Internal logic validation

### 2. CLI Functional Tests (`t/`)
**Location**: `apps/cli/t/`
**Purpose**: Test end-to-end CLI behavior and user experience
**Runtime**: Tests actual binary, slower but comprehensive
**Coverage**: Full user workflows, CLI interface, error messages

**What it tests:**
- Command-line interface behavior
- User workflows (init → add → commit → push)
- Error messages and help text
- File handling edge cases
- Cross-platform compatibility
- Real-world usage scenarios

**When to use:**
- Testing CLI commands and flags
- User experience validation
- Integration testing
- Release verification

## Why Two Suites?

### Different Testing Levels
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Commands │ -> │   CLI Interface │ -> │  Rust Libraries │
│   (t/ tests)    │    │                 │    │ (tests/ tests)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **CLI tests** verify the complete user experience
- **Rust tests** verify the underlying implementation

### Different Performance Characteristics
- **Rust tests**: Fast (< 1 second), run frequently during development
- **CLI tests**: Slower (minutes), run during CI and releases

### Different Failure Modes
- **Rust test failures**: Indicate internal logic bugs
- **CLI test failures**: Indicate user experience issues

## Running Tests

### Run All Rust Tests
```bash
cd apps/cli
cargo test
```

### Run All CLI Tests
```bash
cd apps/cli/t
./run-tests.sh
```

### Run Specific Test Categories
```bash
# FastCDC tests
cd apps/cli/t && ./run-tests.sh -r "core/t0100"

# Video tests
cd apps/cli/t && ./run-tests.sh -r "core/t0200"

# QA tests
cd apps/cli/t && ./run-tests.sh -r "qa/"
```

## Test Organization

### CLI Tests (`t/`)
```
t/
├── basic/          # Core functionality
├── core/           # Feature-specific tests
├── qa/             # Quality assurance
├── advanced/       # Advanced features
├── infra/          # Infrastructure validation
├── perf/           # Performance tests
├── lib/            # Shared test utilities
├── lint/           # Code quality tools
└── utils/          # Test runners and helpers
```

### Rust Tests (`tests/`)
```
tests/
├── integration_tests.rs    # Comprehensive integration suite
└── README.md              # This documentation
```

## Contributing

### Adding Rust Tests
Add to `tests/integration_tests.rs` in the appropriate module:
```rust
mod my_feature_tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        // Test internal API
    }
}
```

### Adding CLI Tests
Create `t/feature/tNNNN-description.sh`:
```bash
#!/bin/sh

test_description="Test my feature"

. ./lib/test-lib.sh

# Your tests here
```

## CI Integration

Both test suites run in CI:
- **Rust tests**: Run on every PR and push
- **CLI tests**: Run on releases and nightly builds

## Best Practices

### Rust Tests
- Focus on internal API behavior
- Test edge cases and error conditions
- Include performance assertions
- Use realistic test data

### CLI Tests
- Test complete user workflows
- Verify error messages are helpful
- Test with various file types and sizes
- Include real-world usage scenarios

## Test Data

Shared test utilities:
- `t/lib/test-lib.sh` - Core CLI testing framework
- `t/lib/lib-chunking.sh` - Chunking test helpers
- `t/lib/lib-repo.sh` - Repository test helpers
- `t/lib/lib-video.sh` - Video processing helpers

## Troubleshooting

### Rust Tests Failing
- Check internal API changes
- Verify test data is realistic
- Run with `--nocapture` for debug output

### CLI Tests Failing
- Ensure binary is built (`cargo build`)
- Check file permissions
- Verify test environment setup