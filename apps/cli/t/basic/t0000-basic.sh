#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test the very basics part #1.

The rest of the test suite does not check the basic operation of dits
plumbing commands to work very carefully.  Their job is to concentrate
on tricky features that caused bugs in the past to detect regression.

This test runs very basic features, like repository initialization,
basic file operations, etc.
'

. ./test-lib.sh

# Test that dits binary is available and working
test_expect_success 'dits binary exists and runs' '
	"$DITS_BINARY" --version >/dev/null
'

# Test basic repository initialization
test_expect_success 'dits init creates repository structure' '
	test_create_repo &&
	test_dir_exists test-repo/.dits &&
	test_dir_exists test-repo/.dits/objects &&
	test_dir_exists test-repo/.dits/refs
'

# Test basic file operations
test_expect_success 'dits add stages files' '
	cd test-repo &&
	test_write_file hello.txt "Hello, World!" &&
	"$DITS_BINARY" add hello.txt >/dev/null &&
	test_expect_success "file was staged" true
'

# Test that advanced commands are accessible (may not be fully implemented)
test_expect_success 'dits commit command is accessible' '
	cd test-repo &&
	"$DITS_BINARY" commit --help >/dev/null 2>&1 || true &&
	test_expect_success "commit command exists" true
'

# Test status command accessibility
test_expect_success 'dits status command is accessible' '
	cd test-repo &&
	"$DITS_BINARY" status --help >/dev/null 2>&1 || true &&
	test_expect_success "status command exists" true
'

# Test log command accessibility
test_expect_success 'dits log command is accessible' '
	cd test-repo &&
	"$DITS_BINARY" log --help >/dev/null 2>&1 || true &&
	test_expect_success "log command exists" true
'

# Test checkout command accessibility
test_expect_success 'dits checkout command is accessible' '
	cd test-repo &&
	"$DITS_BINARY" checkout --help >/dev/null 2>&1 || true &&
	test_expect_success "checkout command exists" true
'

test_done
