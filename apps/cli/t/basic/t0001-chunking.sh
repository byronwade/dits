#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test FastCDC chunking functionality.

This test verifies that the FastCDC chunking algorithm works correctly,
produces deterministic results, and handles various file types and sizes.
'

. ./test-lib.sh
. ./lib-repo.sh

# Test basic chunking functionality
test_expect_success 'basic chunking works' '
	test_create_repo test-chunking &&
	cd test-chunking &&
	test_create_chunking_file test.txt 64 &&
	test_verify_chunking test.txt &&
	cd ..
'

# Test chunking determinism
test_expect_success 'chunking is deterministic' '
	cd test-chunking &&
	test_create_chunking_file deterministic.txt 128 &&
	test_chunking_determinism deterministic.txt &&
	cd ..
'

# Test deduplication
test_expect_success 'deduplication works' '
	cd test-chunking &&
	test_create_chunking_file original.txt 256 &&
	cp original.txt duplicate.txt &&
	test_deduplication original.txt duplicate.txt &&
	cd ..
'

# Test chunk reconstruction
test_expect_success 'chunk reconstruction works' '
	cd test-chunking &&
	test_create_chunking_file reconstruct.txt 512 &&
	test_chunk_reconstruction reconstruct.txt &&
	cd ..
'

# Test different file sizes
test_expect_success 'chunking handles different file sizes' '
	cd test-chunking &&
	test_chunking_sizes size_test &&
	cd ..
'

# Test binary data chunking
test_expect_success 'chunking works with binary data' '
	cd test-chunking &&
	test_binary_chunking binary.dat 256 &&
	cd ..
'

# Test performance (should be fast)
test_expect_success 'chunking performance is acceptable' '
	cd test-chunking &&
	test_create_chunking_file perf.txt 1024 &&
	test_chunking_performance perf.txt 2000 &&  # 2 seconds max
	cd ..
'

test_done
