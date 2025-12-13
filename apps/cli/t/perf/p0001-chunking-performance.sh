#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Performance tests for FastCDC chunking.

This test measures the performance of chunking operations
and ensures they meet performance requirements.
'

. ../test-lib.sh
. ../lib-chunking.sh
. ../lib-repo.sh

# Test chunking performance for various file sizes
test_expect_success 'chunking performance - 1MB file' '
	test_create_repo perf-repo &&
	cd perf-repo &&
	test_create_chunking_file test_1mb.dat $((1024)) &&  # 1MB
	test_chunking_performance test_1mb.dat 500 &&  # 500ms max
	cd ..
'

test_expect_success 'chunking performance - 10MB file' '
	cd perf-repo &&
	test_create_chunking_file test_10mb.dat $((1024 * 10)) &&  # 10MB
	test_chunking_performance test_10mb.dat 2000 &&  # 2 seconds max
	cd ..
'

test_expect_success 'chunking performance - 100MB file' '
	cd perf-repo &&
	test_create_chunking_file test_100mb.dat $((1024 * 100)) &&  # 100MB
	test_chunking_performance test_100mb.dat 10000 &&  # 10 seconds max
	cd ..
'

# Test deduplication performance
test_expect_success 'deduplication performance' '
	cd perf-repo &&
	test_create_chunking_file original.dat $((1024 * 50)) &&  # 50MB
	cp original.dat duplicate.dat &&

	# First add should create chunks
	test_expect_fast "first add (creates chunks)" 15000 \
		"\"$DITS_BINARY\" add original.dat >/dev/null 2>&1" &&

	# Second add should be fast (deduplication)
	test_expect_fast "second add (deduplication)" 1000 \
		"\"$DITS_BINARY\" add duplicate.dat >/dev/null 2>&1" &&

	cd ..
'

# Test hashing performance
test_expect_success 'hashing performance - 100MB' '
	test_create_chunking_file hash_perf.dat $((1024 * 100)) &&
	test_expect_fast "BLAKE3 hashing 100MB" 2000 \
		"\"$DITS_BINARY\" hash hash_perf.dat >/dev/null 2>&1"
'

test_done
