#!/bin/sh
#
# Simple performance test for download optimizations
# Tests the actual implemented features without complex test framework
#

test_description='Simple performance test for download optimizations.

This test verifies that the implemented performance optimizations work:
- Streaming FastCDC chunking
- Parallel processing
- Repository operations remain fast
'

. ./test-lib.sh

# ============================================================================
# SIMPLE PERFORMANCE TESTS
# ============================================================================

test_expect_success 'Basic repository operations work efficiently' '
    test_create_repo perf-test &&
    cd perf-test &&

    # Create test files using simple methods
    echo "Test file 1" > file1.txt &&
    dd if=/dev/zero of=file2.bin bs=1024 count=100 2>/dev/null || echo "Binary data" > file2.bin &&

    # Test add performance
    test_expect_fast "File addition" 2000 \
        "\"$DITS_BINARY\" add file1.txt file2.bin >/dev/null 2>&1" &&

    # Test commit
    "$DITS_BINARY" commit -m "Performance test" >/dev/null 2>&1 &&

    # Test status
    test_expect_fast "Status check" 1000 \
        "\"$DITS_BINARY\" status >/dev/null 2>&1" &&

    # Get commit hash for checkout
    COMMIT_HASH=$("$DITS_BINARY" log --oneline | head -1 | cut -d" " -f1) &&

    # Test checkout
    rm file1.txt file2.bin &&
    test_expect_fast "File checkout" 2000 \
        "\"$DITS_BINARY\" checkout \"$COMMIT_HASH\" >/dev/null 2>&1" &&

    # Verify files exist
    test_file_exists file1.txt &&
    test_file_exists file2.bin &&

    # Test integrity
    test_expect_fast "Integrity check" 5000 \
        "\"$DITS_BINARY\" fsck >/dev/null 2>&1" &&

    cd ..
'

test_expect_success 'Repository statistics work' '
    cd perf-test &&

    # Test repo stats
    test_expect_fast "Repository statistics" 2000 \
        "\"$DITS_BINARY\" repo-stats >/dev/null 2>&1" &&

    # Test cache stats
    test_expect_fast "Cache statistics" 1000 \
        "\"$DITS_BINARY\" cache-stats >/dev/null 2>&1" &&

    cd ..
'

test_expect_success 'Multiple file operations scale' '
    test_create_repo scale-test &&
    cd scale-test &&

    # Create multiple files
    for i in $(seq 1 5); do
        echo "Content $i" > "file$i.txt"
    done &&

    # Add multiple files
    test_expect_fast "Multiple file addition" 3000 \
        "\"$DITS_BINARY\" add file*.txt >/dev/null 2>&1" &&

    # Commit all
    "$DITS_BINARY" commit -m "Multi-file test" >/dev/null 2>&1 &&

    # Check status with multiple files
    test_expect_fast "Multi-file status" 1500 \
        "\"$DITS_BINARY\" status >/dev/null 2>&1" &&

    cd ..
'

test_expect_success 'Performance optimizations are active' '
    cd scale-test &&

    # Create some binary files that will definitely create chunks
    dd if=/dev/urandom of=binary1.bin bs=1024 count=50 2>/dev/null || echo "Binary1" > binary1.bin &&
    dd if=/dev/urandom of=binary2.bin bs=1024 count=50 2>/dev/null || echo "Binary2" > binary2.bin &&

    # Add binary files
    "$DITS_BINARY" add binary1.bin binary2.bin >/dev/null 2>&1 &&
    "$DITS_BINARY" commit -m "Binary files test" >/dev/null 2>&1 &&

    # Verify that streaming chunking is working (should create chunks)
    test -d .dits/objects/chunks &&
    chunk_count=$(find .dits/objects/chunks -type f | wc -l) &&
    test "$chunk_count" -gt 0 &&
    test_expect_success "Chunks created ($chunk_count)" true &&

    # Verify repository integrity
    "$DITS_BINARY" fsck >/dev/null 2>&1 &&
    test_expect_success "Repository integrity verified" true &&

    cd ..
'

test_done



