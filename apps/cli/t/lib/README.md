# Test Libraries

Shared utilities and helper functions for Dits CLI tests.

## Overview

These libraries provide common functionality used across multiple test suites, following the Git test framework conventions.

## Libraries

### `test-lib.sh` - Core Testing Framework
**Purpose**: Main testing infrastructure and utilities
**Functions**:
- Test runner setup and teardown
- Assertion functions (`test_expect_success`, `test_expect_failure`)
- File and directory operations
- Output formatting and reporting
- Environment setup

### `lib-chunking.sh` - Chunking Test Helpers
**Purpose**: Utilities for testing FastCDC chunking behavior
**Functions**:
- `test_create_chunking_file()` - Create test files with predictable chunk boundaries
- `test_verify_chunking()` - Verify chunking results and deduplication
- `test_chunk_sizes()` - Validate chunk size distributions

### `lib-repo.sh` - Repository Test Helpers
**Purpose**: Common repository operations for tests
**Functions**:
- `test_repo_init()` - Initialize test repositories
- `test_repo_commit_file()` - Add and commit files
- `test_repo_verify_structure()` - Validate repository structure
- `test_repo_status()` - Check repository status

### `lib-video.sh` - Video Processing Test Helpers
**Purpose**: Video file handling and MP4-specific tests
**Functions**:
- `test_create_video_file()` - Generate test video files
- `test_verify_video_chunks()` - Validate video-aware chunking
- `test_mp4_structure()` - Check MP4 atom parsing

## Usage

Include libraries in your test files:

```bash
#!/bin/sh

test_description="Test my feature"

# Include core testing framework
. ./lib/test-lib.sh

# Include specialized libraries as needed
. ./lib/lib-repo.sh
. ./lib/lib-chunking.sh

# Your tests here
test_expect_success "my test" '
    # Test code
'
```

## Best Practices

### Creating Test Data
```bash
# Use library functions for consistent test data
test_create_chunking_file test.bin 1024  # 1MB test file

# Or create custom test data
echo "test content" > test.txt
```

### Repository Operations
```bash
# Use helper functions for common operations
test_repo_init "my-repo"
test_repo_commit_file "my-repo" "test.txt" "Test commit"
```

### Assertions
```bash
# Use descriptive test names
test_expect_success "file is properly chunked" '
    "$DITS_BINARY" add test.bin &&
    # Verify chunking results
'

test_expect_failure "invalid operation fails" '
    "$DITS_BINARY" invalid-command
'
```

## Adding New Libraries

When creating new test utilities:

1. Follow naming convention: `lib-<topic>.sh`
2. Document all public functions
3. Include usage examples
4. Test the utilities themselves
5. Update this README

## Dependencies

- `test-lib.sh` - Required by all tests
- Specialized libraries - Include only when needed
- All libraries assume `$DITS_BINARY` is set (done by test-lib.sh)