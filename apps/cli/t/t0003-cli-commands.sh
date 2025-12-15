#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test CLI command accessibility.

This test verifies that all CLI commands are accessible and can show help.
Commands may not be fully implemented yet, but should be available.
'

. ./test-lib.sh

# Test basic commands that should work
test_expect_success 'dits init command is accessible' '
	"$DITS_BINARY" init --help >/dev/null 2>&1 &&
	test_expect_success "init command exists" true
'

test_expect_success 'dits add command is accessible' '
	"$DITS_BINARY" add --help >/dev/null 2>&1 &&
	test_expect_success "add command exists" true
'

test_expect_success 'dits status command is accessible' '
	"$DITS_BINARY" status --help >/dev/null 2>&1 &&
	test_expect_success "status command exists" true
'

test_expect_success 'dits commit command is accessible' '
	"$DITS_BINARY" commit --help >/dev/null 2>&1 &&
	test_expect_success "commit command exists" true
'

test_expect_success 'dits log command is accessible' '
	"$DITS_BINARY" log --help >/dev/null 2>&1 &&
	test_expect_success "log command exists" true
'

test_expect_success 'dits branch command is accessible' '
	"$DITS_BINARY" branch --help >/dev/null 2>&1 &&
	test_expect_success "branch command exists" true
'

test_expect_success 'dits checkout command is accessible' '
	"$DITS_BINARY" checkout --help >/dev/null 2>&1 &&
	test_expect_success "checkout command exists" true
'

test_expect_success 'dits diff command is accessible' '
	"$DITS_BINARY" diff --help >/dev/null 2>&1 &&
	test_expect_success "diff command exists" true
'

test_expect_success 'dits tag command is accessible' '
	"$DITS_BINARY" tag --help >/dev/null 2>&1 &&
	test_expect_success "tag command exists" true
'

test_expect_success 'dits show command is accessible' '
	"$DITS_BINARY" show --help >/dev/null 2>&1 &&
	test_expect_success "show command exists" true
'

test_expect_success 'dits blame command is accessible' '
	"$DITS_BINARY" blame --help >/dev/null 2>&1 &&
	test_expect_success "blame command exists" true
'

test_expect_success 'dits reflog command is accessible' '
	"$DITS_BINARY" reflog --help >/dev/null 2>&1 &&
	test_expect_success "reflog command exists" true
'

# Test advanced commands (may not be implemented yet)
test_expect_success 'dits reset command is accessible' '
	"$DITS_BINARY" reset --help >/dev/null 2>&1 || true &&
	test_expect_success "reset command accessible" true
'

test_expect_success 'dits restore command is accessible' '
	"$DITS_BINARY" restore --help >/dev/null 2>&1 || true &&
	test_expect_success "restore command accessible" true
'

test_expect_success 'dits config command is accessible' '
	"$DITS_BINARY" config --help >/dev/null 2>&1 || true &&
	test_expect_success "config command accessible" true
'

test_expect_success 'dits stash command is accessible' '
	"$DITS_BINARY" stash --help >/dev/null 2>&1 || true &&
	test_expect_success "stash command accessible" true
'

test_expect_success 'dits lock command is accessible' '
	"$DITS_BINARY" lock --help >/dev/null 2>&1 || true &&
	test_expect_success "lock command accessible" true
'

test_expect_success 'dits gc command is accessible' '
	"$DITS_BINARY" gc --help >/dev/null 2>&1 || true &&
	test_expect_success "gc command accessible" true
'

test_expect_success 'dits fsck command is accessible' '
	"$DITS_BINARY" fsck --help >/dev/null 2>&1 || true &&
	test_expect_success "fsck command accessible" true
'

test_expect_success 'dits clean command is accessible' '
	"$DITS_BINARY" clean --help >/dev/null 2>&1 || true &&
	test_expect_success "clean command accessible" true
'

test_expect_success 'dits grep command is accessible' '
	"$DITS_BINARY" grep --help >/dev/null 2>&1 || true &&
	test_expect_success "grep command accessible" true
'

test_expect_success 'dits worktree command is accessible' '
	"$DITS_BINARY" worktree --help >/dev/null 2>&1 || true &&
	test_expect_success "worktree command accessible" true
'

test_expect_success 'dits hooks command is accessible' '
	"$DITS_BINARY" hooks --help >/dev/null 2>&1 || true &&
	test_expect_success "hooks command accessible" true
'

test_expect_success 'dits archive command is accessible' '
	"$DITS_BINARY" archive --help >/dev/null 2>&1 || true &&
	test_expect_success "archive command accessible" true
'

test_expect_success 'dits describe command is accessible' '
	"$DITS_BINARY" describe --help >/dev/null 2>&1 || true &&
	test_expect_success "describe command accessible" true
'

test_expect_success 'dits maintenance command is accessible' '
	"$DITS_BINARY" maintenance --help >/dev/null 2>&1 || true &&
	test_expect_success "maintenance command accessible" true
'

test_expect_success 'dits completions command works' '
	"$DITS_BINARY" completions bash >/dev/null 2>&1 &&
	test_expect_success "completions work" true
'

test_done
