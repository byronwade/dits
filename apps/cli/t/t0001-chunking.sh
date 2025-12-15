#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test FastCDC chunking functionality.

This test verifies that the FastCDC chunking algorithm works correctly,
produces deterministic results, and handles various file types and sizes.
'

. ./test-lib.sh
. "$TEST_DIRECTORY/lib-chunking.sh"

# Test basic chunking functionality
test_expect_success 'basic chunking works' '
	test_create_repo test-chunking &&
	(
		cd test-chunking &&
		test_create_chunking_file test.bin 64 &&
		test_verify_chunking test.bin
	)
'

# Test chunking determinism
test_expect_success 'chunking is deterministic' '
	(
		cd test-chunking &&
		test_create_chunking_file deterministic.bin 128 &&
		test_chunking_determinism deterministic.bin
	)
'

# Test deduplication
test_expect_success 'deduplication works' '
	(
		cd test-chunking &&
		test_create_chunking_file original.bin 256 &&
		cp original.bin duplicate.bin &&
		test_deduplication original.bin duplicate.bin
	)
'

# Test chunk reconstruction
test_expect_success 'chunk reconstruction works' '
	(
		cd test-chunking &&
		test_create_chunking_file reconstruct.bin 512 &&
		test_chunk_reconstruction reconstruct.bin
	)
'

# Test different file sizes
test_expect_success 'chunking handles different file sizes' '
	(
		cd test-chunking &&
		test_chunking_sizes size_test
	)
'

# Test binary data chunking
test_expect_success 'chunking works with binary data' '
	(
		cd test-chunking &&
		test_binary_chunking binary.dat 256
	)
'

# Test performance (should be fast)
test_expect_success 'chunking performance is acceptable' '
	(
		cd test-chunking &&
		test_create_chunking_file perf.bin 1024 &&
		test_chunking_performance perf.bin 2000
	)
'

test_done
