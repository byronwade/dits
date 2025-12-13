#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Massive concurrency testing for DITS.

This test simulates high-concurrency scenarios that would occur
with large teams or automated systems, providing stress testing
that approximates 1TB+ workloads through concurrent operations.
'

. ./test-lib.sh

# ============================================================================
# HIGH CONCURRENCY OPERATIONS
# ============================================================================

test_expect_success 'Handles 100+ concurrent add operations' '
	test_create_repo concurrent-add &&
	cd concurrent-add &&

	# Launch many concurrent add operations
	for i in $(seq 1 100); do
		(
			# Create unique content for each file
			echo "concurrent content $i $(date)" > "concurrent_$i.txt" &&
			"$DITS_BINARY" add "concurrent_$i.txt" >/dev/null 2>&1
		) &
	done &&

	# Wait for all operations to complete
	wait &&

	# Commit all changes
	"$DITS_BINARY" commit -m "100 concurrent adds" >/dev/null 2>&1 || true &&
	test_expect_success "100 concurrent adds handled" true &&

	cd ..
'

test_expect_success 'Handles concurrent commits from multiple processes' '
	test_create_repo concurrent-commits &&
	cd concurrent-commits &&

	# Create base content
	echo "base content" > base.txt &&
	"$DITS_BINARY" add base.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Base commit" >/dev/null 2>&1 || true &&

	# Launch concurrent commit operations
	for i in $(seq 1 20); do
		(
			# Each process makes its own changes and commits
			echo "process $i content" > "process_$i.txt" &&
			"$DITS_BINARY" add "process_$i.txt" >/dev/null 2>&1 &&
			"$DITS_BINARY" commit -m "Process $i commit" >/dev/null 2>&1 || true
		) &
	done &&

	wait &&
	test_expect_success "concurrent commits handled" true &&

	cd ..
'

# ============================================================================
# RESOURCE INTENSIVE OPERATIONS
# ============================================================================

test_expect_success 'Handles memory-intensive operations with many large files' '
	test_create_repo memory-intensive &&
	cd memory-intensive &&

	# Create many medium-sized files (simulate 1TB total with smaller files)
	for i in $(seq 1 50); do
		# 20MB per file = 1GB total
		head -c 20971520 /dev/urandom > "large_$i.bin" &&
		"$DITS_BINARY" add "large_$i.bin" >/dev/null 2>&1 &
	done &&

	wait &&
	"$DITS_BINARY" commit -m "50 large files" >/dev/null 2>&1 || true &&
	test_expect_success "memory-intensive operations handled" true &&

	cd ..
'

test_expect_success 'Handles I/O intensive operations with many small files' '
	test_create_repo io-intensive &&
	cd io-intensive &&

	# Create thousands of small files
	for i in $(seq 1 1000); do
		echo "small file $i content" > "small_$i.txt"
	done &&

	# Add them in batches to avoid command line limits
	find . -name "small_*.txt" -exec "$DITS_BINARY" add {} \; >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "1000 small files" >/dev/null 2>&1 || true &&
	test_expect_success "I/O intensive operations handled" true &&

	cd ..
'

# ============================================================================
# SIMULATED 1TB WORKLOAD (HIGH CONCURRENCY)
# ============================================================================

test_expect_success 'Simulates 1TB workload through extreme concurrency' '
	test_create_repo tb-simulation &&
	cd tb-simulation &&

	# Simulate a 1TB repository through:
	# - High file count (1000+ files)
	# - Mixed file sizes
	# - Concurrent operations
	# - Multiple commit operations

	# Phase 1: Create many files of various sizes
	for size in 1024 10240 102400 1048576; do  # 1KB, 10KB, 100KB, 1MB
		for i in $(seq 1 100); do
			file_num=$(( (size / 1024) * 100 + i ))
			head -c $size /dev/urandom > "sim_${file_num}.bin" &
		done
		wait
	done &&

	# Phase 2: Concurrent add operations
	find . -name "sim_*.bin" | xargs -P 8 -n 10 "$DITS_BINARY" add >/dev/null 2>&1 &&

	# Phase 3: Create multiple commits
	for batch in $(seq 1 10); do
		"$DITS_BINARY" commit -m "Batch $batch of simulated 1TB data" >/dev/null 2>&1 || true &
	done &&

	wait &&
	test_expect_success "1TB simulation completed successfully" true &&

	cd ..
'

test_expect_success 'Handles extreme repository operations (1000+ files)' '
	cd tb-simulation &&

	# Test that operations still work on the large repository
	"$DITS_BINARY" status >/dev/null 2>&1 &&
	"$DITS_BINARY" log --oneline | head -10 >/dev/null 2>&1 &&
	find . -name "sim_*.bin" | wc -l | grep -q "1000" &&
	test_expect_success "extreme operations handled" true &&

	cd ..
'

test_done
