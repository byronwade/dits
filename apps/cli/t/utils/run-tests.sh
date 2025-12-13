#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Test runner for Dits shell script tests.
# Based on Git's test framework.

set -e

TEST_DIRECTORY=$(pwd)
export TEST_DIRECTORY

# Parse command line options
verbose=0
debug=0
immediate=0
run_list=""
prove=0

while test $# -gt 0
do
	case "$1" in
	-d|--d|--de|--deb|--debu|--debug)
		debug=1
		shift
		;;
	-i|--i|--im|--imm|--imme|--immed|--immedi|--immedia|--immediat|--immediate)
		immediate=1
		shift
		;;
	-v|--v|--ve|--ver|--verb|--verbo|--verbos|--verbose)
		verbose=1
		shift
		;;
	--prove)
		prove=1
		shift
		;;
	-r)
		shift
		run_list="$1"
		shift
		;;
	--)
		shift
		break
		;;
	*)
		break
		;;
	esac
done

# Set environment variables
if test $verbose -eq 1
then
	export GIT_TEST_VERBOSE=1
fi

if test $debug -eq 1
then
	export GIT_TEST_DEBUG=1
fi

if test $immediate -eq 1
then
	export GIT_TEST_IMMEDIATE=1
fi

# Find test scripts
test_scripts=$(find . -name "t[0-9][0-9][0-9][0-9]*.sh" -type f | sort)

# Filter by run list if specified
if test -n "$run_list"
then
	filtered_scripts=""
	for script in $test_scripts
	do
		case "$script" in
			*$run_list*)
				filtered_scripts="$filtered_scripts $script"
				;;
		esac
	done
	test_scripts="$filtered_scripts"
fi

if test -z "$test_scripts"
then
	echo "No test scripts found matching criteria" >&2
	exit 1
fi

# Run tests
if test $prove -eq 1
then
	# Use prove for parallel execution
	if command -v prove >/dev/null 2>&1
	then
		echo "Running tests with prove..."
		exec prove -j 8 --timer --formatter TAP::Formatter::Console "$@" $test_scripts
	else
		echo "prove not found, falling back to sequential execution" >&2
	fi
fi

# Sequential execution
total_tests=0
passed_tests=0
failed_tests=0
skipped_tests=0

echo "Running Dits shell script tests..."
echo "=================================="

# Check if we should run tests in parallel
if test $prove -eq 1 && command -v prove >/dev/null 2>&1
then
	echo "Running tests with prove..."
	exec prove -j "${DITS_TEST_JOBS:-8}" --timer --formatter TAP::Formatter::Console "$@" $test_scripts
fi

# Sequential execution with enhanced output
for script in $test_scripts
do
	echo ""
	echo "Running $script..."

	# Make script executable if not already
	if test ! -x "$script"
	then
		chmod +x "$script"
	fi

	# Extract test description from script
	test_description=""
	if test -f "$script"
	then
		test_description=$(grep "^test_description=" "$script" | head -1 | sed 's/test_description=//' | tr -d "'\"")
	fi

	if test -n "$test_description"
	then
		echo "  Description: $test_description"
	fi

	# Run the test with timing
	start_time=$(date +%s)
	if "$script" "$@"
	then
		end_time=$(date +%s)
		duration=$((end_time - start_time))
		echo "✓ $script PASSED (${duration}s)"
		passed_tests=$((passed_tests + 1))
	else
		end_time=$(date +%s)
		duration=$((end_time - start_time))
		echo "✗ $script FAILED (${duration}s)"
		failed_tests=$((failed_tests + 1))
	fi

	total_tests=$((total_tests + 1))
done

echo ""
echo "Test Results:"
echo "============="
echo "Total:    $total_tests"
echo "Passed:   $passed_tests"
echo "Failed:   $failed_tests"
echo "Skipped:  $skipped_tests"

if test $failed_tests -gt 0
then
	echo ""
	echo "❌ Some tests failed. Check output above for details."
	exit 1
else
	echo ""
	echo "✅ All tests passed!"
	exit 0
fi
