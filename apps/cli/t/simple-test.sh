#!/bin/sh
#
# Simple test to validate basic functionality
#

. ./test-lib.sh

test_expect_success 'DITS binary exists' '
	"$DITS_BINARY" --version >/dev/null
'

test_expect_success 'Basic repository operations work' '
	test_create_repo simple-test &&
	cd simple-test &&
	echo "test content" > test.txt &&
	"$DITS_BINARY" add test.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Test commit" >/dev/null 2>&1 &&
	test_expect_success "basic operations work" true &&
	cd ..
'

test_done




