#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test repository operations and Git-like functionality.

This test verifies that basic repository operations work correctly,
including init, add, commit, log, status, and branching.
'

. ./test-lib.sh
. "$TEST_DIRECTORY/lib-repo.sh"

# Test repository initialization
test_repo_init test-repo "basic test repository"

# Test file operations
test_repo_commit_file test-repo hello.txt "Hello, World!" "Add hello.txt"
test_repo_commit_file test-repo goodbye.txt "Goodbye, World!" "Add goodbye.txt"

# Test commit count
test_repo_commit_count test-repo 2

# Test file content preservation
test_repo_file_content test-repo hello.txt "Hello, World!"

# Test branching
test_repo_create_branch test-repo feature-branch
test_repo_switch_branch test-repo feature-branch

# Test committing on branch
test_repo_commit_file test-repo feature.txt "Feature content" "Add feature on branch"

# Test switching back
test_repo_switch_branch test-repo main

# Test that feature file is not present on main
test_expect_success 'feature file not present on main branch' '
	(
		cd test-repo &&
		test ! -f feature.txt
	)
'

# Test merging
test_repo_merge_branch test-repo feature-branch "Merge feature-branch"

# Test that feature file is now present after merge
test_expect_success 'feature file present after merge' '
	(
		cd test-repo &&
		test_file_exists feature.txt
	)
'

# Test repository status
test_repo_is_clean test-repo

# Test log functionality
test_expect_success 'log shows commits' '
	(
		cd test-repo &&
		commit_count=$("$DITS_BINARY" log --oneline | wc -l | tr -d " ") &&
		test $commit_count -ge 3
	)
'

# Test clone functionality
test_repo_clone test-repo test-repo-clone

# Test that clone has same content
test_repo_file_content test-repo-clone hello.txt "Hello, World!"

test_done
