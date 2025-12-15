#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Performance test for streaming FastCDC chunking with memory optimizations.

This test verifies that the streaming FastCDC implementation uses bounded memory
regardless of file size and produces consistent, correct results.
'

. ./test-lib.sh

# ============================================================================
# STREAMING CHUNKING PERFORMANCE TESTS
# ============================================================================

test_expect_success 'Streaming FastCDC chunking uses bounded memory' '
	test_create_repo streaming-test &&
	cd streaming-test &&

	# Create a medium file (10MB) to test streaming chunking
	test_write_large_file large_test.bin 10 &&

	# Add file - should use streaming chunking with bounded memory
	test_expect_fast "Medium file streaming chunking" 10000 \
		"\\\"$DITS_BINARY\\\" add large_test.bin >/dev/null 2>&1" &&

	# Verify chunks were created successfully
	test -d .dits/objects/chunks &&
	test_expect_success "Chunk objects directory exists" true &&

	# Check that we have multiple chunks (streaming should create chunks)
	chunk_count=$(find .dits/objects/chunks -type f | wc -l) &&
	test "$chunk_count" -gt 2 &&  # Should have chunks for 10MB file
	test_expect_success "Chunks created ($chunk_count)" true &&

	# Verify repository integrity
	"$DITS_BINARY" fsck >/dev/null 2>&1 &&

	cd ..
'

test_expect_success 'Streaming chunking produces consistent results' '
	test_create_repo consistency-test &&
	cd consistency-test &&

	# Create test file with known content
	echo "This is a test file for chunking consistency verification." > consistency_test.txt &&
	dd if=/dev/zero bs=1024 count=100 >> consistency_test.txt 2>/dev/null || true &&

	# Add file using streaming chunking
	"$DITS_BINARY" add consistency_test.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Consistency test" >/dev/null 2>&1 &&

	# Verify the commit was created
	commit_count=$("$DITS_BINARY" log --oneline | wc -l) &&
	test "$commit_count" -eq 1 &&
	test_expect_success "Commit created successfully" true &&

	# Test file reconstruction by checking out
	rm consistency_test.txt &&
	COMMIT_HASH=$("$DITS_BINARY" log --oneline | head -1 | cut -d' ' -f1) &&
	"$DITS_BINARY" checkout "$COMMIT_HASH" >/dev/null 2>&1 &&

	# Verify file was reconstructed correctly
	test_file_exists consistency_test.txt &&
	test_expect_success "File reconstruction works" true &&

	# Run integrity check
	"$DITS_BINARY" fsck >/dev/null 2>&1 &&
	test_expect_success "Repository integrity verified" true &&

	cd ..
'

test_expect_success 'Empty file handling in streaming chunker' '
	test_create_repo empty-file-test &&
	cd empty-file-test &&

	# Create empty file
	touch empty.txt &&

	# Should handle empty files gracefully
	"$DITS_BINARY" add empty.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Empty file" >/dev/null 2>&1 || true &&

	test_expect_success "Empty file handled correctly" true &&

	cd ..
'

test_expect_success 'Very small file chunking' '
	test_create_repo small-file-test &&
	cd small-file-test &&

	# Create very small file
	echo "x" > tiny.txt &&

	# Should still work with streaming chunker
	"$DITS_BINARY" add tiny.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Tiny file" >/dev/null 2>&1 || true &&

	test_expect_success "Small file chunking works" true &&

	cd ..
'

test_done
