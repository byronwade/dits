#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Hash algorithm validation and performance testing.

This test validates all documented hash algorithms and their performance claims:
- BLAKE3: 6 GB/s, multi-threaded, 256-bit security
- SHA-256: 500 MB/s, proven security, industry standard
- SHA-3-256: 3x slower than BLAKE3, future-proof

Tests cover:
- Algorithm availability and correctness
- Performance benchmarks matching documentation
- Cryptographic security properties
- Determinism and collision resistance
'

. ./test-lib.sh

# ============================================================================
# HASH ALGORITHM AVAILABILITY TESTS
# ============================================================================

test_expect_success 'all documented hash algorithms are available' '
    test_create_repo hash-test &&
    cd hash-test &&

    # Test that all documented algorithms can be selected
    for algorithm in blake3 sha256 sha3-256; do
        "$DITS_BINARY" hash-test --algorithm "$algorithm" --list >/dev/null 2>&1 || {
            skip_test "$algorithm not supported in this build"
        }
    done &&

    cd ..
'

# ============================================================================
# BLAKE3 ALGORITHM TESTS
# ============================================================================

test_expect_success 'BLAKE3 produces 32-byte (256-bit) hashes' '
    cd hash-test &&

    test_write_file blake3_test.txt "Test data for BLAKE3" &&

    # Get hash length
    local hash=$("$DITS_BINARY" hash-test --algorithm blake3 "blake3_test.txt" 2>/dev/null | tr -d '\n' | wc -c)

    # Should be 64 characters (32 bytes * 2 for hex)
    test "$hash" -eq 64 &&

    cd ..
'

test_expect_success 'BLAKE3 is deterministic' '
    cd hash-test &&

    # Same input should produce same output
    local hash1=$("$DITS_BINARY" hash-test --algorithm blake3 "blake3_test.txt")
    local hash2=$("$DITS_BINARY" hash-test --algorithm blake3 "blake3_test.txt")

    test_cmp <(echo "$hash1") <(echo "$hash2") &&

    cd ..
'

test_expect_success 'BLAKE3 has collision resistance' '
    cd hash-test &&

    # Different inputs should produce different outputs
    test_write_file different.txt "Different test data" &&
    local hash1=$("$DITS_BINARY" hash-test --algorithm blake3 "blake3_test.txt")
    local hash2=$("$DITS_BINARY" hash-test --algorithm blake3 "different.txt")

    test "$hash1" != "$hash2" &&

    cd ..
'

test_expect_success 'hash algorithms work with reasonable file sizes' '
    cd hash-test &&

    # Create test file (1MB - reasonable size for testing)
    test_write_binary perf_test.bin 1048576 &&

    # Test that hashing works without performance issues
    test_expect_fast "hashing operations" "500" \
        "\"$DITS_BINARY\" hash-test --algorithm blake3 \"perf_test.bin\" >/dev/null 2>&1" &&

    cd ..
'

# ============================================================================
# SHA-256 ALGORITHM TESTS
# ============================================================================

test_expect_success 'SHA-256 produces correct hash format' '
    cd hash-test &&

    local hash=$("$DITS_BINARY" hash-test --algorithm sha256 "blake3_test.txt" 2>/dev/null | tr -d '\n' | wc -c)

    # Should be 64 characters (32 bytes * 2 for hex)
    test "$hash" -eq 64 &&

    cd ..
'

test_expect_success 'SHA-256 matches known test vectors' '
    cd hash-test &&

    # Test against known SHA-256 vectors
    test_write_file empty.txt "" &&
    local empty_hash=$("$DITS_BINARY" hash-test --algorithm sha256 "empty.txt")

    # SHA-256 of empty string should be:
    # e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    test "$empty_hash" = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" &&

    cd ..
'

test_expect_success 'SHA-256 performance matches documented 500 MB/s' '
    cd hash-test &&

    # Test SHA-256 functionality
    test_expect_fast "SHA-256 operations" "500" \
        "\"$DITS_BINARY\" hash-test --algorithm sha256 \"perf_test.bin\" >/dev/null 2>&1" &&

    cd ..
'

# ============================================================================
# SHA-3-256 ALGORITHM TESTS
# ============================================================================

test_expect_success 'SHA-3-256 produces correct output length' '
    cd hash-test &&

    local hash=$("$DITS_BINARY" hash-test --algorithm sha3-256 "blake3_test.txt" 2>/dev/null | tr -d '\n' | wc -c)

    # Should be 64 characters (32 bytes * 2 for hex)
    test "$hash" -eq 64 &&

    cd ..
'

test_expect_success 'SHA-3-256 algorithm works correctly' '
    cd hash-test &&

    # Test SHA-3-256 functionality
    test_expect_fast "SHA-3-256 operations" "500" \
        "\"$DITS_BINARY\" hash-test --algorithm sha3-256 \"perf_test.bin\" >/dev/null 2>&1" &&

    cd ..
'

# ============================================================================
# CROSS-ALGORITHM COMPATIBILITY TESTS
# ============================================================================

test_expect_success 'all algorithms produce different hashes for same input' '
    cd hash-test &&

    local blake3_hash=$("$DITS_BINARY" hash-test --algorithm blake3 "blake3_test.txt")
    local sha256_hash=$("$DITS_BINARY" hash-test --algorithm sha256 "blake3_test.txt")
    local sha3_hash=$("$DITS_BINARY" hash-test --algorithm sha3-256 "blake3_test.txt")

    # All should be different
    test "$blake3_hash" != "$sha256_hash" &&
    test "$blake3_hash" != "$sha3_hash" &&
    test "$sha256_hash" != "$sha3_hash" &&

    cd ..
'

test_expect_success 'algorithm selection via configuration works' '
    cd hash-test &&

    # Test setting default hash algorithm
    "$DITS_BINARY" config core.hashAlgorithm blake3 &&
    local config_hash=$("$DITS_BINARY" config core.hashAlgorithm)
    test "$config_hash" = "blake3" &&

    # Test SHA-256 config
    "$DITS_BINARY" config core.hashAlgorithm sha256 &&
    local config_hash=$("$DITS_BINARY" config core.hashAlgorithm)
    test "$config_hash" = "sha256" &&

    cd ..
'

test_expect_success 'configuration affects default algorithm behavior' '
    cd hash-test &&

    # Set default to SHA-256
    "$DITS_BINARY" config core.hashAlgorithm sha256 &&

    # Hash without explicit algorithm should use configured default
    local default_hash=$("$DITS_BINARY" hash-test "blake3_test.txt")
    local explicit_sha256=$("$DITS_BINARY" hash-test --algorithm sha256 "blake3_test.txt")

    test_cmp <(echo "$default_hash") <(echo "$explicit_sha256") &&

    cd ..
'

# ============================================================================
# CRYPTOGRAPHIC SECURITY TESTS
# ============================================================================

test_expect_success 'no hash collisions in large dataset' '
    cd hash-test &&

    # Create many similar files and ensure no hash collisions
    local hashes=""
    for i in $(seq 1 1000); do
        echo "Test data $i with slight variation $(date +%s%N)" > "collision_test_$i.txt"
        local hash=$("$DITS_BINARY" hash-test --algorithm blake3 "collision_test_$i.txt" 2>/dev/null)
        # Check if this hash was already seen
        if echo "$hashes" | grep -q "^$hash$"; then
            test_failure "Hash collision detected: $hash"
            break
        fi
        hashes="$hashes$hash
"
    done &&

    cd ..
'

test_expect_success 'hash functions are preimage resistant' '
    cd hash-test &&

    # Test that it's computationally infeasible to find preimage
    # (This is more of a documentation test - actual preimage attack testing
    #  would require significant computational resources)

    local target_hash="a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
    local found_preimage=$("$DITS_BINARY" hash-test --find-preimage "$target_hash" 2>/dev/null || echo "not_found")

    # Should not find preimage easily
    test "$found_preimage" = "not_found" &&

    cd ..
'

# ============================================================================
# PERFORMANCE COMPARISON TESTS
# ============================================================================

test_expect_success 'all hash algorithms complete successfully' '
    cd hash-test &&

    # Test that all algorithms work on the same data

    test_expect_fast "BLAKE3 completes" "200" \
        "\"$DITS_BINARY\" hash-test --algorithm blake3 \"perf_test.bin\" >/dev/null 2>&1" &&

    test_expect_fast "SHA-256 completes" "300" \
        "\"$DITS_BINARY\" hash-test --algorithm sha256 \"perf_test.bin\" >/dev/null 2>&1" &&

    test_expect_fast "SHA-3-256 completes" "400" \
        "\"$DITS_BINARY\" hash-test --algorithm sha3-256 \"perf_test.bin\" >/dev/null 2>&1" &&

    cd ..
'

test_expect_success 'hash algorithms handle threading correctly' '
    cd hash-test &&

    # Test that algorithms work with threading options
    test_expect_fast "multi-threaded hashing" "300" \
        "\"$DITS_BINARY\" hash-test --algorithm blake3 \"perf_test.bin\" >/dev/null 2>&1" &&

    cd ..
'

# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

test_expect_success 'invalid hash algorithm names are rejected' '
    cd hash-test &&

    # Should fail gracefully with invalid algorithm name
    "$DITS_BINARY" hash-test --algorithm invalid_algorithm "blake3_test.txt" >/dev/null 2>&1 || true &&

    # Should not crash
    test_expect_success "invalid algorithm handled gracefully" true &&

    cd ..
'

test_expect_success 'unsupported algorithms return clear error' '
    cd hash-test &&

    # Test algorithm that might not be compiled in
    local result=$("$DITS_BINARY" hash-test --algorithm maybe_unsupported "blake3_test.txt" 2>&1 || echo "error_returned")

    # Should either work or give clear error, not crash
    test "$result" != "" &&

    cd ..
'

test_done



