#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Library for repository-related test functions

# Initialize a test repository with common setup
test_repo_init() {
	local repo_name="${1:-test-repo}"
	local description="${2:-Test repository}"

	test_expect_success "initialize $description" '
		mkdir -p "$repo_name" &&
		cd "$repo_name" &&
		"$DITS_BINARY" init >/dev/null 2>&1 &&
		cd ..
	'

	test_expect_success "$description has proper structure" '
		cd "$repo_name" &&
		test_dir_exists .dits &&
		test_dir_exists .dits/objects &&
		test_dir_exists .dits/refs &&
		cd ..
	'
}

# Create and commit a file
test_repo_commit_file() {
	local repo_name="$1"
	local filename="$2"
	local content="$3"
	local message="${4:-Add $filename}"

	test_expect_success "create and commit $filename" '
		cd "$repo_name" &&
		test_write_file "$filename" "$content" &&
		"$DITS_BINARY" add "$filename" >/dev/null 2>&1 &&
		"$DITS_BINARY" commit -m "$message" >/dev/null 2>&1 &&
		cd ..
	'
}

# Verify repository has expected number of commits
test_repo_commit_count() {
	local repo_name="$1"
	local expected_count="$2"

	test_expect_success "repository has $expected_count commits" '
		cd "$repo_name" &&
		commit_count=$("$DITS_BINARY" log --oneline | wc -l | tr -d " ") &&
		test $commit_count -eq $expected_count &&
		cd ..
	'
}

# Verify file exists with expected content
test_repo_file_content() {
	local repo_name="$1"
	local filename="$2"
	local expected_content="$3"

	test_expect_success "$filename has expected content" '
		cd "$repo_name" &&
		actual_content=$(cat "$filename") &&
		test "$actual_content" = "$expected_content" &&
		cd ..
	'
}

# Create a branch
test_repo_create_branch() {
	local repo_name="$1"
	local branch_name="$2"
	local start_point="${3:-HEAD}"

	test_expect_success "create branch $branch_name" '
		cd "$repo_name" &&
		"$DITS_BINARY" branch "$branch_name" >/dev/null 2>&1 &&
		cd ..
	'
}

# Switch to a branch
test_repo_switch_branch() {
	local repo_name="$1"
	local branch_name="$2"

	test_expect_success "switch to branch $branch_name" '
		cd "$repo_name" &&
		"$DITS_BINARY" switch "$branch_name" >/dev/null 2>&1 &&
		cd ..
	'
}

# Merge a branch
test_repo_merge_branch() {
	local repo_name="$1"
	local branch_name="$2"
	local message="${3:-Merge $branch_name}"

	test_expect_success "merge branch $branch_name" '
		cd "$repo_name" &&
		"$DITS_BINARY" merge "$branch_name" -m "$message" >/dev/null 2>&1 &&
		cd ..
	'
}

# Check if repository is clean (no uncommitted changes)
test_repo_is_clean() {
	local repo_name="$1"

	test_expect_success "repository is clean" '
		cd "$repo_name" &&
		"$DITS_BINARY" status >/dev/null 2>&1 &&
		cd ..
	'
}

# Clone a repository
test_repo_clone() {
	local source_repo="$1"
	local dest_repo="$2"

	test_expect_success "clone $source_repo to $dest_repo" '
		"$DITS_BINARY" clone "$source_repo" "$dest_repo" >/dev/null 2>&1
	'

	test_expect_success "clone created valid repository" '
		test_dir_exists "$dest_repo/.dits"
	'
}

# Push changes to remote
test_repo_push() {
	local repo_name="$1"
	local remote="${2:-origin}"
	local branch="${3:-main}"

	test_expect_success "push to $remote $branch" '
		cd "$repo_name" &&
		"$DITS_BINARY" push "$remote" "$branch" >/dev/null 2>&1 &&
		cd ..
	'
}

# Pull changes from remote
test_repo_pull() {
	local repo_name="$1"
	local remote="${2:-origin}"
	local branch="${3:-main}"

	test_expect_success "pull from $remote $branch" '
		cd "$repo_name" &&
		"$DITS_BINARY" pull "$remote" "$branch" >/dev/null 2>&1 &&
		cd ..
	'
}

# Export all functions
export -f test_repo_init test_repo_commit_file test_repo_commit_count
export -f test_repo_file_content test_repo_create_branch test_repo_switch_branch
export -f test_repo_merge_branch test_repo_is_clean test_repo_clone
export -f test_repo_push test_repo_pull
