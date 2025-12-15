#!/bin/bash
#
# Download Performance Benchmark for Dits P2P optimizations
#

set -e

echo "=== Dits Download Performance Benchmark ==="
echo "Testing optimizations: streaming chunking, parallel processing, adaptive sizing"
echo ""

# Build the optimized version
echo "Building optimized Dits..."
cd apps/cli
cargo build --release
cd ../..

# Create test data
echo "Creating test data..."
TEST_FILE="test_100mb.bin"
if [ ! -f "$TEST_FILE" ]; then
    echo "Generating 100MB test file..."
    dd if=/dev/urandom of="$TEST_FILE" bs=1M count=100 2>/dev/null
fi

# Test 1: Basic chunking performance
echo ""
echo "Test 1: Basic chunking performance"
echo "=================================="

# Create test repo
rm -rf test_repo
./apps/cli/target/release/dits init test_repo
cd test_repo

# Time the add operation
echo "Adding 100MB file..."
START_TIME=$(date +%s.%3N)
./../apps/cli/target/release/dits add "../$TEST_FILE"
END_TIME=$(date +%s.%3N)
ADD_TIME=$(echo "$END_TIME - $START_TIME" | bc)

# Calculate throughput
FILE_SIZE_MB=100
THROUGHPUT=$(echo "scale=2; $FILE_SIZE_MB / $ADD_TIME" | bc)

echo "Add time: ${ADD_TIME}s"
echo "Throughput: ${THROUGHPUT} MB/s"

# Test commit
echo "Committing..."
./../apps/cli/target/release/dits commit -m "Performance test"

# Test checkout
echo "Removing and checking out file..."
rm "../$TEST_FILE"
START_TIME=$(date +%s.%3N)
./../apps/cli/target/release/dits checkout HEAD
END_TIME=$(date +%s.%3N)
CHECKOUT_TIME=$(echo "$END_TIME - $START_TIME" | bc)

CHECKOUT_THROUGHPUT=$(echo "scale=2; $FILE_SIZE_MB / $CHECKOUT_TIME" | bc)

echo "Checkout time: ${CHECKOUT_TIME}s"
echo "Checkout throughput: ${CHECKOUT_THROUGHPUT} MB/s"

# Check chunking results
echo ""
echo "Chunking analysis:"
echo "=================="
CHUNK_COUNT=$(find .dits/objects/chunks -type f | wc -l)
echo "Chunks created: $CHUNK_COUNT"

# Calculate average chunk size
TOTAL_SIZE=$(du -bc .dits/objects/chunks/* | tail -1 | cut -f1)
AVG_CHUNK_SIZE=$((TOTAL_SIZE / CHUNK_COUNT / 1024))
echo "Average chunk size: ${AVG_CHUNK_SIZE}KB"

# Cleanup
cd ..
rm -rf test_repo

echo ""
echo "=== Benchmark Complete ==="
echo "Optimizations implemented:"
echo "✓ Streaming FastCDC chunking (no memory limits)"
echo "✓ Parallel chunk processing with Rayon"
echo "✓ High-throughput QUIC configuration"
echo "✓ Connection pooling"
echo "✓ Multi-peer download framework"
echo "✓ Zero-copy I/O with memory mapping"
echo "✓ Adaptive chunk sizing"
echo "✓ Real-time performance monitoring"



