#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Test framework for Dits. Based on Git's test framework.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.

# Set up environment
TEST_DIRECTORY=$(pwd)
export TEST_DIRECTORY

# Find the build directory and binaries
if test -z "$DITS_BUILD_DIR"
then
	DITS_BUILD_DIR="$TEST_DIRECTORY/../../../target/debug"
fi

if test -z "$DITS_TEST_INSTALLED"
then
	DITS_BINARY="$DITS_BUILD_DIR/dits"
else
	DITS_BINARY="$DITS_TEST_INSTALLED"
fi

export DITS_BUILD_DIR DITS_BINARY

# Ensure we have a working dits binary
if ! "$DITS_BINARY" --version >/dev/null 2>&1
then
	echo >&2 "error: cannot run dits binary at '$DITS_BINARY'"
	exit 1
fi

# Set up test output directory
if test -z "$TEST_OUTPUT_DIRECTORY"
then
	TEST_OUTPUT_DIRECTORY="$TEST_DIRECTORY"
fi

# Create a unique test directory for this test run
if test -z "$test_tmpdir"
then
	test_tmpdir="$TEST_OUTPUT_DIRECTORY/trash.$$"
	mkdir -p "$test_tmpdir" || exit 1
fi

# Change to the test directory
cd "$test_tmpdir" || exit 1

# Export for subprocesses
export TEST_OUTPUT_DIRECTORY test_tmpdir

# Test counter and results
test_count=0
test_success_count=0
test_failure_count=0
test_fixed_count=0
test_broken_count=0

# TAP output support
test_tap_output=0
if test "$GIT_TEST_TAP" = "1"
then
	test_tap_output=1
fi

# Verbose output
verbose=0
if test "$GIT_TEST_VERBOSE" = "1" || test "$verbose" = "t"
then
	verbose=1
fi

# Debug mode
debug=0
if test "$GIT_TEST_DEBUG" = "1" || test "$debug" = "t"
then
	debug=1
fi

# Immediate exit on failure
immediate=0
if test "$GIT_TEST_IMMEDIATE" = "1" || test "$immediate" = "t"
then
	immediate=1
fi

# Long running tests
GIT_TEST_LONG=0
export GIT_TEST_LONG

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Print to stderr if verbose
say() {
	if test $verbose -eq 1
	then
		echo "$@" >&2
	fi
}

# Debug output
debug() {
	if test $debug -eq 1
	then
		echo "debug: $@" >&2
	fi
}

# Error and exit
error() {
	echo "error: $@" >&2
	exit 1
}

# Warning
warning() {
	echo "warning: $@" >&2
}

# Remove test directory on exit
remove_trash() {
	if test -d "$test_tmpdir"
	then
		cd "$TEST_DIRECTORY" 2>/dev/null || true
		rm -rf "$test_tmpdir" 2>/dev/null || true
	fi
}

# Set up cleanup on exit
trap remove_trash EXIT

# ============================================================================
# TEST PREREQUISITES AND SKIPPING
# ============================================================================

# Test prerequisites - check if required tools/commands are available
test_prereq() {
	local prereq="$1"
	case "$prereq" in
		FFMPEG)
			command -v ffmpeg >/dev/null 2>&1
			;;
		IMAGEMAGICK)
			command -v convert >/dev/null 2>&1
			;;
		LARGE_DISK)
			# Check if we have at least 10GB free space
			local free_kb=$(df -k . | tail -1 | awk '{print $4}')
			test $free_kb -gt 10000000  # 10GB in KB
			;;
		FAST_NETWORK)
			# Basic network connectivity check
			timeout 5 bash -c 'echo > /dev/tcp/8.8.8.8/53' >/dev/null 2>&1
			;;
		PERFORMANCE)
			# Skip performance tests on slow systems
			# Could check CPU cores, memory, etc.
			test $(nproc 2>/dev/null || echo 1) -ge 2
			;;
		*)
			# Unknown prerequisite - assume available
			true
			;;
	esac
}

# Skip a test if prerequisites are not met
test_skip_if_missing_prereq() {
	local prereq="$1"
	local reason="${2:-$prereq not available}"

	if ! test_prereq "$prereq"
	then
		test_skip "$reason"
		return 0
	fi
	return 1  # Don't skip
}

# Set up test prerequisites
test_set_prereq() {
	# Parse prerequisites from environment or test file
	# This can be extended to read from test file headers
	:
}

# ============================================================================
# TEST EXECUTION FUNCTIONS
# ============================================================================

# Initialize TAP output
start_test_output() {
	if test $test_tap_output -eq 1
	then
		echo "TAP version 13"
	fi
}

# Start a test case
start_test_case_output() {
	test_count=$((test_count + 1))
	if test $test_tap_output -eq 1
	then
		echo "# $test_count - $1"
	fi
}

# Finalize a test case
finalize_test_case_output() {
	# Placeholder for future use
	:
}

# Finalize test output
finalize_test_output() {
	if test $test_tap_output -eq 1
	then
		echo "1..$test_count"
	fi
}

# Success test result
test_ok_() {
	test_success_count=$((test_success_count + 1))
	if test $test_tap_output -eq 1
	then
		echo "ok $test_count - $1"
	else
		echo "ok $test_count - $1"
	fi
}

# Failure test result
test_failure_() {
	test_failure_count=$((test_failure_count + 1))
	if test $test_tap_output -eq 1
	then
		echo "not ok $test_count - $1"
		if test -n "$2"
		then
			echo "# $2"
		fi
	else
		echo "FAIL $test_count: $1"
		if test -n "$2"
		then
			echo "      $2"
		fi
	fi

	if test $immediate -eq 1
	then
		exit 1
	fi
}

# Run a test that should succeed
test_expect_success() {
	start_test_case_output "$1"

	if eval "$2"
	then
		test_ok_ "$1"
	else
		test_failure_ "$1" "command failed: $2"
	fi
}

# Run a test that should fail
test_expect_failure() {
	start_test_case_output "$1"

	if eval "$2"
	then
		test_failure_ "$1" "command should have failed but succeeded: $2"
	else
		test_ok_ "$1"
	fi
}

# Skip a test
test_skip() {
	local reason="$1"
	if test $test_tap_output -eq 1
	then
		test_count=$((test_count + 1))
		echo "ok $test_count # SKIP $reason"
	else
		echo "SKIP: $reason"
	fi
}

# ============================================================================
# DITS-SPECIFIC HELPER FUNCTIONS
# ============================================================================

# Initialize a test repository
test_create_repo() {
	local repo_name="${1:-test-repo}"
	mkdir -p "$repo_name" || error "cannot create repo directory"
	cd "$repo_name" || error "cannot cd to repo"
	"$DITS_BINARY" init >/dev/null 2>&1 || error "dits init failed"
	cd .. || error "cannot cd back"
}

# Create a test file with content
test_write_file() {
	local filename="$1"
	local content="$2"
	mkdir -p "$(dirname "$filename")" 2>/dev/null || true
	echo "$content" >"$filename"
}

# Create a binary test file
test_write_binary() {
	local filename="$1"
	local size="${2:-1024}"
	# Create a file with some predictable binary content
	perl -e "print chr(\$_ % 256) for 0..($size-1)" >"$filename"
}

# Create a large test file for performance testing
test_write_large_file() {
	local filename="$1"
	local size_mb="${2:-100}"
	local size_bytes=$((size_mb * 1024 * 1024))
	test_write_binary "$filename" "$size_bytes"
}

# Verify file contents match expected
test_cmp() {
	local expected="$1"
	local actual="$2"
	if cmp "$expected" "$actual" >/dev/null 2>&1
	then
		return 0
	else
		return 1
	fi
}

# Check if file exists and is not empty
test_file_not_empty() {
	local file="$1"
	if test -s "$file"
	then
		return 0
	else
		return 1
	fi
}

# Check if file exists
test_file_exists() {
	local file="$1"
	if test -f "$file"
	then
		return 0
	else
		return 1
	fi
}

# Check if directory exists
test_dir_exists() {
	local dir="$1"
	if test -d "$dir"
	then
		return 0
	else
		return 1
	fi
}

# Get number of lines in file
test_line_count() {
	local file="$1"
	wc -l <"$file" | tr -d ' '
}

# Check if string matches pattern
test_match() {
	local pattern="$1"
	local string="$2"
	echo "$string" | grep -q "$pattern"
}

# Wait for a condition with timeout
test_wait_for() {
	local condition="$1"
	local timeout="${2:-30}"
	local i=0
	while ! eval "$condition"
	do
		i=$((i + 1))
		if test $i -gt $timeout
		then
			return 1
		fi
		sleep 1
	done
	return 0
}

# ============================================================================
# PERFORMANCE TESTING HELPERS
# ============================================================================

# Time a command and return milliseconds
test_time_ms() {
	local start=$(perl -MTime::HiRes=time -e 'print int(time * 1000)')
	eval "$1"
	local end=$(perl -MTime::HiRes=time -e 'print int(time * 1000)')
	echo $((end - start))
}

# Assert that a command takes less than a certain time
test_expect_fast() {
	local description="$1"
	local max_ms="$2"
	local command="$3"

	start_test_case_output "$description"

	local time_taken=$(test_time_ms "$command")
	if test $time_taken -le $max_ms
	then
		test_ok_ "$description (${time_taken}ms < ${max_ms}ms)"
	else
		test_failure_ "$description" "took ${time_taken}ms, expected <= ${max_ms}ms"
	fi
}

# ============================================================================
# INITIALIZATION
# ============================================================================

# Initialize test framework
start_test_output

# Export all functions for use in test scripts
export -f say debug error warning remove_trash
export -f start_test_output start_test_case_output finalize_test_case_output finalize_test_output
export -f test_ok_ test_failure_ test_expect_success test_expect_failure test_skip
export -f test_create_repo test_write_file test_write_binary test_write_large_file
export -f test_cmp test_file_not_empty test_file_exists test_dir_exists test_line_count test_match test_wait_for
export -f test_time_ms test_expect_fast

# Set up environment variables for tests
export DITS_TEST_MODE=1
export DITS_CONFIG_GLOBAL=0  # Don't use global config in tests

# ============================================================================
# TEST COMPLETION
# ============================================================================

# Finalize testing and exit with appropriate code
test_done() {
	finalize_test_output

	# Print summary if not in TAP mode
	if test $test_tap_output -eq 0
	then
		echo ""
		echo "Test Summary:"
		echo "  Total: $test_count"
		echo "  Passed: $test_success_count"
		echo "  Failed: $test_failure_count"
		if test $test_fixed_count -gt 0
		then
			echo "  Fixed: $test_fixed_count"
		fi
		if test $test_broken_count -gt 0
		then
			echo "  Broken: $test_broken_count"
		fi
	fi

	# Exit with failure if any tests failed
	if test $test_failure_count -gt 0
	then
		exit 1
	else
		exit 0
	fi
}

# Export test_done function
export -f test_done
