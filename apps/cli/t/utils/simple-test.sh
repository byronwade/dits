#!/bin/sh
#
# Simple test to validate our testing infrastructure
#

. ./test-lib.sh

test_expect_success 'DITS binary exists' '
	"$DITS_BINARY" --version >/dev/null
'

test_expect_success 'Basic repository operations work' '
	test_create_repo simple-test &&
	cd simple-test &&
	test_write_file hello.txt "Hello World" &&
	"$DITS_BINARY" add hello.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Test commit" >/dev/null 2>&1 &&
	test_expect_success "basic operations work" true &&
	cd ..
'

test_done
