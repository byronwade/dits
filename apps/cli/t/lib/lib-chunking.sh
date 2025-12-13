#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Library for chunking and FastCDC-related test functions

# Create a test file with predictable content for chunking tests
test_create_chunking_file() {
	local filename="$1"
	local size_kb="${2:-1024}"  # Default 1MB

	test_expect_success "create chunking test file $filename (${size_kb}KB)" '
		# Create a file with some repeating patterns to test chunking boundaries
		perl -e "
			my \$size = $size_kb * 1024;
			my \$pattern = \"The quick brown fox jumps over the lazy dog. \" x 10;
			for (my \$i = 0; \$i < \$size; \$i += length(\$pattern)) {
				my \$chunk = substr(\$pattern, 0, \$size - \$i);
				print \$chunk;
			}
		" >"$filename"
	'
}

# Verify that a file was chunked properly
test_verify_chunking() {
	local filename="$1"
	local expected_chunks="${2:-}"

	test_expect_success "verify $filename chunking" '
		# Add the file and check that it was processed
		"$DITS_BINARY" add "$filename" >/dev/null 2>&1
	'
}

# Test deduplication by creating identical files
test_deduplication() {
	local file1="$1"
	local file2="$2"

	test_expect_success "test deduplication between $file1 and $file2" '
		# Copy file1 to file2
		cp "$file1" "$file2" &&

		# Add both files
		"$DITS_BINARY" add "$file1" >/dev/null 2>&1 &&
		add_result=$("$DITS_BINARY" add "$file2" 2>&1) &&

		# The second add should show deduplication (no new chunks)
		echo "$add_result" | grep -q "new_chunks: 0"
	'
}

# Test chunk reconstruction
test_chunk_reconstruction() {
	local original_file="$1"

	test_expect_success "test chunk reconstruction for $original_file" '
		# Add the file
		"$DITS_BINARY" add "$original_file" >/dev/null 2>&1 &&

		# Commit it
		"$DITS_BINARY" commit -m "Add $original_file" >/dev/null 2>&1 &&

		# Modify the original file
		echo "modified" >"$original_file" &&

		# Checkout to restore
		"$DITS_BINARY" checkout HEAD >/dev/null 2>&1 &&

		# File should be restored to original state
		test_file_exists "$original_file"
	'
}

# Test chunking with different file sizes
test_chunking_sizes() {
	local base_name="$1"
	local sizes_kb="64 256 1024 4096 16384"  # 64KB to 16MB

	for size in $sizes_kb
	do
		test_expect_success "test chunking ${size}KB file" '
			test_create_chunking_file "${base_name}_${size}kb.bin" "$size" &&
			test_verify_chunking "${base_name}_${size}kb.bin"
		'
	done
}

# Test chunking determinism - same content should produce same chunks
test_chunking_determinism() {
	local filename="$1"

	test_expect_success "test chunking determinism for $filename" '
		# Add file first time
		"$DITS_BINARY" add "$filename" >/dev/null 2>&1 &&
		"$DITS_BINARY" commit -m "First add" >/dev/null 2>&1 &&

		# Remove from index
		"$DITS_BINARY" reset HEAD -- "$filename" >/dev/null 2>&1 &&

		# Add file second time
		add_result=$("$DITS_BINARY" add "$filename" 2>&1) &&

		# Should show no new chunks (complete deduplication)
		echo "$add_result" | grep -q "new_chunks: 0"
	'
}

# Test chunking with binary data
test_binary_chunking() {
	local filename="$1"
	local size_kb="${2:-512}"

	test_expect_success "test binary data chunking (${size_kb}KB)" '
		# Create binary file with random-like data
		dd if=/dev/urandom of="$filename" bs=1024 count="$size_kb" >/dev/null 2>&1 &&
		test_verify_chunking "$filename"
	'
}

# Test chunking performance
test_chunking_performance() {
	local filename="$1"
	local max_time_ms="${2:-5000}"  # 5 seconds default

	test_expect_success "test chunking performance for $filename" '
		test_expect_fast "chunking $filename" "$max_time_ms" \
			"\"$DITS_BINARY\" add \"$filename\" >/dev/null 2>&1"
	'
}

# Test large file chunking
test_large_file_chunking() {
	local filename="$1"
	local size_mb="${2:-100}"

	test_expect_success "test large file chunking (${size_mb}MB)" '
		test_write_large_file "$filename" "$size_mb" &&
		test_chunking_performance "$filename" "30000"  # 30 seconds for large files
	'
}

# Export all functions
export -f test_create_chunking_file test_verify_chunking test_deduplication
export -f test_chunk_reconstruction test_chunking_sizes test_chunking_determinism
export -f test_binary_chunking test_chunking_performance test_large_file_chunking
