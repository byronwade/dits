#!/bin/bash
#
# Simple test to verify Dits performance optimizations work
#

set -e

echo "=== Simple Dits Performance Test ==="

# Build if needed
if [ ! -f "apps/cli/target/release/dits" ]; then
    echo "Building Dits..."
    cd apps/cli
    cargo build --release --quiet
    cd ..
fi

# Test basic functionality
echo "Testing basic repository operations..."

# Create test repo
rm -rf test_repo
./apps/cli/target/release/dits init test_repo

cd test_repo

# Create small test files
echo "Creating test files..."
echo "Hello World" > test1.txt
dd if=/dev/zero of=test2.bin bs=1024 count=100 2>/dev/null || echo "Small binary file" > test2.bin

echo "Testing add operation..."
time ./../apps/cli/target/release/dits add test1.txt test2.bin

echo "Testing commit operation..."
./../apps/cli/target/release/dits commit -m "Test commit"

echo "Testing status..."
./../apps/cli/target/release/dits status

echo "Testing checkout..."
rm test1.txt test2.bin
# Get the commit hash and checkout
COMMIT_HASH=$(./../apps/cli/target/release/dits log --oneline | head -1 | cut -d' ' -f1)
echo "Checking out commit: $COMMIT_HASH"
./../apps/cli/target/release/dits checkout "$COMMIT_HASH"

echo "Verifying files exist..."
ls -la test1.txt test2.bin

echo "Testing integrity..."
./../apps/cli/target/release/dits fsck

echo "Testing statistics..."
./../apps/cli/target/release/dits repo-stats

cd ..
rm -rf test_repo

echo "✅ All tests passed!"



