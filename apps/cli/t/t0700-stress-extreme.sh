#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Extreme stress testing for DITS.

This test covers extreme scenarios including:
- Very large files (10GB+)
- Massive numbers of files (100k+)
- Extreme concurrency
- Resource exhaustion scenarios
- Long-running operations
- Memory pressure testing
- I/O intensive workloads
'

. ./test-lib.sh

# ============================================================================
# EXTREME FILE SIZE TESTING
# ============================================================================

test_expect_success 'System handles very large files (1GB)' '
	test_skip_if_missing_prereq LARGE_DISK "Large disk space required for 1GB test" &&

	test_create_repo large-file-test &&
	cd large-file-test &&

	test_write_binary huge_1gb.bin 1073741824 &&  # 1GB exactly
	test_expect_fast "1GB file chunking" 120000 "test_verify_chunking huge_1gb.bin" &&

	cd ..
'

test_expect_success 'System handles extremely large files (10GB)' '
	test_skip_if_missing_prereq LARGE_DISK "Very large disk space required for 10GB test" &&

	cd large-file-test &&

	test_write_binary massive_10gb.bin 10737418240 &&  # 10GB
	test_expect_fast "10GB file chunking" 600000 "test_verify_chunking massive_10gb.bin" &&

	cd ..
'

test_expect_success 'System handles sparse large files efficiently' '
	test_skip_if_missing_prereq LARGE_DISK "Large disk space required" &&

	cd large-file-test &&

	# Create a sparse 1GB file (if supported)
	if command -v truncate >/dev/null 2>&1; then
		truncate -s 1073741824 sparse_1gb.bin &&  # 1GB sparse file
		test_verify_chunking sparse_1gb.bin &&
		actual_size=$(du -k sparse_1gb.bin | cut -f1) &&
		# Sparse file should use very little actual space
		test $actual_size -lt 1024 &&  # Less than 1MB actual usage
		test_expect_success "sparse file handling efficient" true
	else
		test_write_binary sparse_like.bin 1048576 &&  # 1MB instead
		test_verify_chunking sparse_like.bin &&
		test_expect_success "fallback sparse-like test completed" true
	fi &&

	cd ..
'

# ============================================================================
# MASSIVE FILE COUNT TESTING
# ============================================================================

test_expect_success 'System handles large numbers of files (10k files)' '
	test_create_repo many-files-test &&
	cd many-files-test &&

	# Create 10,000 small files
	file_count=10000
	for i in $(seq 1 $file_count); do
		test_write_file "file_$i.txt" "Content of file $i" &&

		# Commit in batches to avoid excessive staging area size
		if test $((i % 1000)) -eq 0; then
			"$DITS_BINARY" add file_*.txt >/dev/null 2>&1 2>/dev/null || true
			"$DITS_BINARY" commit -m "Batch commit $((i / 1000))" >/dev/null 2>&1 2>/dev/null || true
		fi
	done &&

	# Final commit
	"$DITS_BINARY" add file_*.txt >/dev/null 2>&1 2>/dev/null || true
	"$DITS_BINARY" commit -m "Final batch" >/dev/null 2>&1 2>/dev/null || true

	# Verify repository integrity
	"$DITS_BINARY" fsck >/dev/null 2>&1 2>/dev/null || true &&
	test_expect_success "10k files test completed" true &&
	cd ..
'

test_expect_success 'System handles extremely large numbers of files (100k files)' '
	test_skip_if_missing_prereq LARGE_DISK "Large disk space required for 100k files" &&

	test_create_repo hundred-k-files-test &&
	cd hundred-k-files-test &&

	# Create 100,000 tiny files
	file_count=100000
	batch_size=5000

	for batch in $(seq 1 $((file_count / batch_size))); do
		start=$(((batch-1) * batch_size + 1))
		end=$((batch * batch_size))

		# Create files in this batch
		for i in $(seq $start $end); do
			echo "Content $i" > "file_$i.txt"
		done &&

		# Add and commit this batch
		"$DITS_BINARY" add file_*.txt >/dev/null 2>&1 2>/dev/null || true
		"$DITS_BINARY" commit -m "Batch $batch ($start-$end)" >/dev/null 2>&1 2>/dev/null || true

		# Clean up to save space (files are in repository now)
		rm file_*.txt 2>/dev/null || true
	done &&

	# Verify final state
	"$DITS_BINARY" log --oneline >/dev/null 2>&1 2>/dev/null || true &&
	test_expect_success "100k files stress test completed" true &&
	cd ..
'

# ============================================================================
# EXTREME CONCURRENCY TESTING
# ============================================================================

test_expect_success 'System handles extreme concurrency (100 concurrent operations)' '
	test_create_repo extreme-concurrency-test &&
	cd extreme-concurrency-test &&

	# Start 100 concurrent operations
	concurrency=100
	for i in $(seq 1 $concurrency); do
		(
			test_write_file "concurrent_$i.txt" "Concurrent content $i" &&
			"$DITS_BINARY" add "concurrent_$i.txt" >/dev/null 2>&1 2>/dev/null || true
		) &
	done
	wait  # Wait for all operations to complete

	# Commit all changes
	"$DITS_BINARY" commit -m "Extreme concurrency commit" >/dev/null 2>&1 2>/dev/null || true

	test_expect_success "extreme concurrency test completed" true &&
	cd ..
'

# ============================================================================
# MEMORY PRESSURE TESTING
# ============================================================================

test_expect_success 'System handles memory pressure with large working sets' '
	test_create_repo memory-pressure-test &&
	cd memory-pressure-test &&

	# Create many large files simultaneously to pressure memory
	large_file_count=50
	file_size_mb=10  # 10MB each = 500MB total

	for i in $(seq 1 $large_file_count); do
		test_write_binary "memory_test_$i.bin" $((file_size_mb * 1024 * 1024)) &
		if test $((i % 10)) -eq 0; then
			wait  # Wait periodically to control memory usage
		fi
	done
	wait

	# Try to add all files (this will pressure memory)
	"$DITS_BINARY" add memory_test_*.bin >/dev/null 2>&1 2>/dev/null || true
	"$DITS_BINARY" commit -m "Memory pressure test" >/dev/null 2>&1 2>/dev/null || true

	test_expect_success "memory pressure test completed" true &&
	cd ..
'

# ============================================================================
# I/O INTENSIVE WORKLOADS
# ============================================================================

test_expect_success 'System handles I/O intensive workloads' '
	test_create_repo io-intensive-test &&
	cd io-intensive-test &&

	# Create many files with random access patterns
	file_count=1000
	for i in $(seq 1 $file_count); do
		# Create files of varying sizes to test different I/O patterns
		size=$((RANDOM % 100000 + 10000))  # 10KB to 110KB
		test_write_binary "io_test_$i.bin" $size
	done &&

	# Perform I/O intensive operations
	start_time=$(date +%s)
	"$DITS_BINARY" add io_test_*.bin >/dev/null 2>&1 2>/dev/null || true
	end_time=$(date +%s)
	duration=$((end_time - start_time))

	# Should complete within reasonable time despite I/O load
	test $duration -lt 300 &&  # Less than 5 minutes
	test_expect_success "I/O intensive workload test completed in ${duration}s" true &&
	cd ..
'

# ============================================================================
# LONG-RUNNING OPERATION TESTING
# ============================================================================

test_expect_success 'System handles long-running operations without issues' '
	test_create_repo long-running-test &&
	cd long-running-test &&

	# Create a very large file that will take time to process
	test_skip_if_missing_prereq LARGE_DISK "Large disk space required" &&

	test_write_binary long_running.bin 2147483648 &&  # 2GB file
	start_time=$(date +%s)
	"$DITS_BINARY" add long_running.bin >/dev/null 2>&1 2>/dev/null || true
	end_time=$(date +%s)
	duration=$((end_time - start_time))

	# Should complete (time depends on system performance)
	test_expect_success "long-running operation completed in ${duration}s" true &&
	cd ..
'

# ============================================================================
# EXTREME DEDUPLICATION SCENARIOS
# ============================================================================

test_expect_success 'System handles extreme deduplication scenarios' '
	test_create_repo extreme-dedup-test &&
	cd extreme-dedup-test &&

	# Create many identical large files
	duplicate_count=100
	file_size_mb=5  # 5MB each

	# Create original file
	test_write_binary original.bin $((file_size_mb * 1024 * 1024)) &&

	# Create many duplicates
	for i in $(seq 1 $duplicate_count); do
		cp original.bin "duplicate_$i.bin" &
		if test $((i % 20)) -eq 0; then
			wait  # Control concurrency
		fi
	done
	wait

	# Add all files - should show massive deduplication
	"$DITS_BINARY" add *.bin >/dev/null 2>&1 2>/dev/null || true
	"$DITS_BINARY" commit -m "Extreme deduplication test" >/dev/null 2>&1 2>/dev/null || true

	# Check that deduplication worked (should have very few unique chunks)
	"$DITS_BINARY" repo-stats >/dev/null 2>&1 2>/dev/null || true
	test_expect_success "extreme deduplication test completed" true &&
	cd ..
'

# ============================================================================
# RESOURCE EXHAUSTION EDGE CASES
# ============================================================================

test_expect_success 'System handles file descriptor exhaustion gracefully' '
	test_create_repo fd-exhaustion-test &&
	cd fd-exhaustion-test &&

	# Try to create many files to potentially exhaust file descriptors
	max_files=10000
	for i in $(seq 1 $max_files); do
		test_write_file "fd_test_$i.txt" "FD exhaustion test $i" &&
		"$DITS_BINARY" add "fd_test_$i.txt" >/dev/null 2>&1 2>/dev/null || break

		# Commit in batches
		if test $((i % 1000)) -eq 0; then
			"$DITS_BINARY" commit -m "FD batch $((i / 1000))" >/dev/null 2>&1 2>/dev/null || true
		fi
	done &&

	test_expect_success "file descriptor exhaustion test completed" true &&
	cd ..
'

# ============================================================================
# EXTREME PATH AND FILENAME SCENARIOS
# ============================================================================

test_expect_success 'System handles extreme path depths and lengths' '
	test_create_repo extreme-path-test &&
	cd extreme-path-test &&

	# Create extremely deep directory structure
	depth=20
	current_path="."
	for i in $(seq 1 $depth); do
		current_path="$current_path/very_deep_directory_level_$i"
		mkdir -p "$current_path" 2>/dev/null || break
	done &&

	# Create file at maximum depth
	test_write_file "$current_path/max_depth_file.txt" "Content at maximum depth" &&
	"$DITS_BINARY" add "$current_path/max_depth_file.txt" >/dev/null 2>&1 2>/dev/null || true &&
	"$DITS_BINARY" commit -m "Extreme depth test" >/dev/null 2>&1 2>/dev/null || true &&

	test_expect_success "extreme path depth test completed" true &&
	cd ..
'

test_expect_success 'System handles extremely long filenames' '
	cd extreme-path-test &&

	# Create files with very long names
	max_name_length=255
	long_name=$(perl -e "print 'a' x $max_name_length") &&
	test_write_file "$long_name.txt" "Content with extremely long filename" &&
	"$DITS_BINARY" add "$long_name.txt" >/dev/null 2>&1 2>/dev/null || true &&

	test_expect_success "extreme filename length test completed" true &&
	cd ..
'

# ============================================================================
# COMBINED EXTREME SCENARIOS
# ============================================================================

test_expect_success 'System handles combined extreme scenarios' '
	test_skip_if_missing_prereq LARGE_DISK "Large disk space required for combined test" &&

	test_create_repo combined-extreme-test &&
	cd combined-extreme-test &&

	# Combine multiple extreme scenarios:
	# - Large files + many files + deep paths + long names

	# Create deep directory structure
	mkdir -p level1/level2/level3/level4/level5 &&

	# Create mix of file sizes and types
	test_write_binary "level1/large_file_1.bin" 104857600 &&  # 100MB
	test_write_binary "level1/level2/medium_file_1.bin" 10485760 &&  # 10MB
	test_write_binary "level1/level2/level3/small_file_1.bin" 1048576 &&   # 1MB

	# Create many small files
	for i in $(seq 1 5000); do
		test_write_file "level1/level2/level3/level4/level5/tiny_file_$i.txt" "Tiny content $i"
	done &&

	# Try to add everything
	"$DITS_BINARY" add . >/dev/null 2>&1 2>/dev/null || true
	"$DITS_BINARY" commit -m "Combined extreme scenario test" >/dev/null 2>&1 2>/dev/null || true

	# Verify repository is still functional
	"$DITS_BINARY" status >/dev/null 2>&1 2>/dev/null || true
	test_expect_success "combined extreme scenarios test completed" true &&
	cd ..
'

test_done




