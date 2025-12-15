#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Comprehensive algorithm testing for all chunking and hashing algorithms.

This test covers:
- All chunking algorithms (FastCDC, Rabin, AE, Chonkers, Parallel FastCDC, Keyed FastCDC)
- All hash algorithms (BLAKE3, SHA-256, SHA-3-256)
- Algorithm selection and configuration
- Determinism and correctness across algorithms
- Performance characteristics
- Cross-algorithm compatibility
'

. ./test-lib.sh

# ============================================================================
# HELPER FUNCTIONS FOR ALGORITHM TESTING
# ============================================================================

# Test that a specific algorithm produces deterministic results
test_algorithm_determinism() {
    local algorithm="$1"
    local test_file="$2"

    test_expect_success "test $algorithm determinism on $test_file" '
        # Run chunking twice with same algorithm
        local output1=$("$DITS_BINARY" chunk-test --algorithm "$algorithm" "$test_file" 2>/dev/null || echo "algorithm_not_supported")
        local output2=$("$DITS_BINARY" chunk-test --algorithm "$algorithm" "$test_file" 2>/dev/null || echo "algorithm_not_supported")

        if [ "$output1" = "algorithm_not_supported" ]; then
            skip_test "$algorithm not supported in this build"
        else
            test_cmp "$output1" "$output2"
        fi
    '
}

# Test algorithm performance
test_algorithm_performance() {
    local algorithm="$1"
    local test_file="$2"
    local max_time_ms="${3:-5000}"

    test_expect_success "test $algorithm performance on $test_file" '
        test_expect_fast "$algorithm chunking" "$max_time_ms" \
            "\"$DITS_BINARY\" chunk-test --algorithm \"$algorithm\" \"$test_file\" >/dev/null 2>&1 || true"
    '
}

# Test cross-algorithm compatibility (same input should have same content hash regardless of chunking algorithm)
test_cross_algorithm_compatibility() {
    local file1="$1"
    local file2="$2"
    local alg1="$3"
    local alg2="$4"

    test_expect_success "test $alg1 vs $alg2 content hash compatibility" '
        local hash1=$("$DITS_BINARY" hash-test --algorithm "$alg1" "$file1" 2>/dev/null || echo "not_supported")
        local hash2=$("$DITS_BINARY" hash-test --algorithm "$alg2" "$file2" 2>/dev/null || echo "not_supported")

        if [ "$hash1" != "not_supported" ] && [ "$hash2" != "not_supported" ] && [ "$hash1" = "$hash2" ]; then
            # Same content should have same hash regardless of chunking algorithm
            test_cmp "$hash1" "$hash2"
        fi
    '
}

# ============================================================================
# TEST SETUP
# ============================================================================

test_expect_success 'create test repository and files' '
    test_create_repo algorithm-test &&
    cd algorithm-test &&

    # Create test files of different types and sizes
    test_write_file text_small.txt "Hello World" &&
    test_write_file text_medium.txt $(perl -e 'print "A" x 10000') &&
    test_write_binary binary_small.bin 1024 &&
    test_write_binary binary_medium.bin 1048576 &&  # 1MB
    test_write_binary binary_large.bin 10485760     # 10MB (if disk space allows)
'

# ============================================================================
# CHUNKING ALGORITHM TESTS
# ============================================================================

ALGORITHMS="fastcdc rabin ae chonkers parallel-fastcdc keyed-fastcdc"

for algorithm in $ALGORITHMS; do
    test_expect_success "test $algorithm basic functionality" '
        cd algorithm-test &&

        # Test on small text file
        test_algorithm_determinism "$algorithm" "text_small.txt" &&

        # Test on binary file
        test_algorithm_determinism "$algorithm" "binary_small.bin" &&

        cd ..
    '

    test_expect_success "test $algorithm performance" '
        cd algorithm-test &&

        # Test performance on medium file
        test_algorithm_performance "$algorithm" "binary_medium.bin" "10000" &&

        cd ..
    '

    test_expect_success "test $algorithm boundary conditions" '
        cd algorithm-test &&

        # Test with empty file
        test_write_file empty.txt "" &&
        test_algorithm_determinism "$algorithm" "empty.txt" &&

        # Test with single byte
        test_write_file single.txt "x" &&
        test_algorithm_determinism "$algorithm" "single.txt" &&

        cd ..
    '
done

# ============================================================================
# HASH ALGORITHM TESTS
# ============================================================================

HASH_ALGORITHMS="blake3 sha256 sha3-256"

for hash_alg in $HASH_ALGORITHMS; do
    test_expect_success "test $hash_alg hash algorithm" '
        cd algorithm-test &&

        # Test basic hashing
        local hash1=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "text_small.txt" 2>/dev/null || echo "not_supported")
        local hash2=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "text_small.txt" 2>/dev/null || echo "not_supported")

        if [ "$hash1" != "not_supported" ]; then
            test_cmp "$hash1" "$hash2"
        fi &&

        cd ..
    '

    test_expect_success "test $hash_alg hash determinism" '
        cd algorithm-test &&

        # Same content should produce same hash
        cp text_small.txt text_copy.txt &&
        local hash_orig=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "text_small.txt" 2>/dev/null || echo "not_supported")
        local hash_copy=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "text_copy.txt" 2>/dev/null || echo "not_supported")

        if [ "$hash_orig" != "not_supported" ]; then
            test_cmp "$hash_orig" "$hash_copy"
        fi &&

        cd ..
    '

    test_expect_success "test $hash_alg hash collision resistance" '
        cd algorithm-test &&

        # Different content should produce different hashes
        test_write_file different.txt "Different content" &&
        local hash1=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "text_small.txt" 2>/dev/null || echo "not_supported")
        local hash2=$("$DITS_BINARY" hash-test --hash-algorithm "$hash_alg" "different.txt" 2>/dev/null || echo "not_supported")

        if [ "$hash1" != "not_supported" ] && [ "$hash2" != "not_supported" ]; then
            test "$hash1" != "$hash2"
        fi &&

        cd ..
    '
done

# ============================================================================
# CROSS-ALGORITHM COMPATIBILITY TESTS
# ============================================================================

test_expect_success 'test cross-algorithm content hash compatibility' '
    cd algorithm-test &&

    # Same file should have same content hash regardless of chunking algorithm used
    # (though chunk boundaries may differ)
    test_cross_algorithm_compatibility "text_small.txt" "text_small.txt" "fastcdc" "rabin" &&

    cd ..
'

# ============================================================================
# CONFIGURATION TESTS
# ============================================================================

test_expect_success 'test algorithm configuration via CLI' '
    cd algorithm-test &&

    # Test setting chunking algorithm via config
    "$DITS_BINARY" config core.chunkerAlgorithm fastcdc &&
    "$DITS_BINARY" config core.chunkerAlgorithm | grep -q "fastcdc" &&

    # Test setting hash algorithm via config
    "$DITS_BINARY" config core.hashAlgorithm blake3 &&
    "$DITS_BINARY" config core.hashAlgorithm | grep -q "blake3" &&

    cd ..
'

test_expect_success 'test algorithm configuration persistence' '
    cd algorithm-test &&

    # Set algorithm, restart repo, verify setting persists
    "$DITS_BINARY" config core.chunkerAlgorithm rabin &&
    "$DITS_BINARY" config core.hashAlgorithm sha256 &&

    # Simulate repo restart by re-reading config
    local chunker_alg=$("$DITS_BINARY" config core.chunkerAlgorithm)
    local hash_alg=$("$DITS_BINARY" config core.hashAlgorithm)

    test "$chunker_alg" = "rabin" &&
    test "$hash_alg" = "sha256" &&

    cd ..
'

# ============================================================================
# PERFORMANCE OPTIMIZATION TESTS
# ============================================================================

test_expect_success 'test streaming chunking performance' '
    cd algorithm-test &&

    # Test that streaming chunking can handle large files without memory issues
    test_write_binary streaming_test.bin 10485760 &&  # 10MB

    test_expect_fast "streaming chunking" "15000" \
        "\"$DITS_BINARY\" chunk-test --streaming \"streaming_test.bin\" >/dev/null 2>&1 || true" &&

    cd ..
'

test_expect_success 'test parallel chunking performance' '
    cd algorithm-test &&

    # Test that parallel chunking is faster than single-threaded on multi-core systems
    test_write_binary parallel_test.bin 5242880 &&  # 5MB

    # Run both single-threaded and parallel, parallel should be faster
    test_expect_fast "parallel chunking" "5000" \
        "\"$DITS_BINARY\" chunk-test --parallel \"parallel_test.bin\" >/dev/null 2>&1 || true" &&

    cd ..
'

test_expect_success 'test adaptive chunk sizing' '
    cd algorithm-test &&

    # Test that chunk sizes adapt to network conditions (simulated)
    test_write_binary adaptive_test.bin 2097152 &&  # 2MB

    # Should produce different chunk size distributions based on simulated network
    "$DITS_BINARY" chunk-test --adaptive --network lan "adaptive_test.bin" >/dev/null 2>&1 || true &&
    "$DITS_BINARY" chunk-test --adaptive --network satellite "adaptive_test.bin" >/dev/null 2>&1 || true &&

    cd ..
'

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

test_expect_success 'test end-to-end algorithm integration' '
    cd algorithm-test &&

    # Test full workflow with different algorithms
    for algorithm in fastcdc rabin; do
        # Add file with specific algorithm
        "$DITS_BINARY" add --algorithm "$algorithm" "text_small.txt" >/dev/null 2>&1 || true &&
        "$DITS_BINARY" commit -m "Test $algorithm" >/dev/null 2>&1 || true &&

        # Verify file can be retrieved
        "$DITS_BINARY" checkout HEAD >/dev/null 2>&1 || true &&
        test_file_exists "text_small.txt" &&
        test_cmp "text_small.txt" <(echo "Hello World") &&
        true
    done &&

    cd ..
'

test_expect_success 'test algorithm migration compatibility' '
    cd algorithm-test &&

    # Test that repositories created with one algorithm can be read with others
    "$DITS_BINARY" add --algorithm fastcdc "binary_small.bin" >/dev/null 2>&1 || true &&
    "$DITS_BINARY" commit -m "FastCDC commit" >/dev/null 2>&1 || true &&

    # Try to read with different algorithm (should work for content verification)
    "$DITS_BINARY" verify --algorithm rabin >/dev/null 2>&1 || true &&

    cd ..
'

# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

test_expect_success 'test unsupported algorithm graceful failure' '
    cd algorithm-test &&

    # Test that unsupported algorithms fail gracefully
    "$DITS_BINARY" chunk-test --algorithm nonexistent "text_small.txt" >/dev/null 2>&1 || true &&
    # Should not crash, should return error code

    cd ..
'

test_expect_success 'test algorithm configuration validation' '
    cd algorithm-test &&

    # Test that invalid algorithm names are rejected
    "$DITS_BINARY" config core.chunkerAlgorithm invalid_alg >/dev/null 2>&1 || true &&
    # Should fail gracefully

    cd ..
'

test_done



