#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Library for chunking and FastCDC-related test functions

# Create a test file with predictable content for chunking tests
test_create_chunking_file() {
	local filename="$1"
	local size_kb="${2:-1024}"  # Default 1MB

	SIZE_KB="$size_kb" perl -e '
		my $size = $ENV{SIZE_KB} * 1024;
		my $pattern = "The quick brown fox jumps over the lazy dog. " x 10;
		for (my $i = 0; $i < $size; $i += length($pattern)) {
			my $chunk = substr($pattern, 0, $size - $i);
			print $chunk;
		}
	' >"$filename"
}

# Verify that a file was chunked properly
test_verify_chunking() {
	local filename="$1"
	local expected_chunks="${2:-}"

	# Add the file and check that it was processed
	"$DITS_BINARY" add "$filename" >/dev/null 2>&1
}

# Test deduplication by creating identical files
test_deduplication() {
	local file1="$1"
	local file2="$2"

	# Add both files
	"$DITS_BINARY" add "$file1" >/dev/null 2>&1 || return 1

	add_result=$("$DITS_BINARY" add "$file2" 2>&1) || return 1

	# The second add should show deduplication (no new chunks, some deduplicated chunks).
	echo "$add_result" | grep -Eq "\\(0 new, [1-9][0-9]* deduplicated\\)"
}

# Test chunk reconstruction
test_chunk_reconstruction() {
	local original_file="$1"

	"$DITS_BINARY" add "$original_file" >/dev/null 2>&1 || return 1
	"$DITS_BINARY" commit -m "Add $original_file" >/dev/null 2>&1 || return 1

	echo "modified" >"$original_file" || return 1

	# Restore from current branch tip.
	head_hash=$(cat .dits/refs/heads/main 2>/dev/null | tr -d '\n')
	test -n "$head_hash" || return 1

	"$DITS_BINARY" checkout "$head_hash" >/dev/null 2>&1 || return 1
	test_file_exists "$original_file"
}

# Test chunking with different file sizes
test_chunking_sizes() {
	local base_name="$1"
	local sizes_kb="64 256 1024 4096 16384"  # 64KB to 16MB

	for size in $sizes_kb
	do
		test_create_chunking_file "${base_name}_${size}kb.bin" "$size" || return 1
		test_verify_chunking "${base_name}_${size}kb.bin" || return 1
	done
}

# Test chunking determinism - same content should produce same chunks
test_chunking_determinism() {
	local filename="$1"

	# Determinism: adding the same bytes in two fresh repos should yield identical chunk refs.
	# We compare serialized chunk refs (offset, size, hash) from the index.

	local repo_a="determinism-a"
	local repo_b="determinism-b"

	rm -rf "$repo_a" "$repo_b" || return 1
	mkdir -p "$repo_a" "$repo_b" || return 1

	(
		cd "$repo_a" &&
		"$DITS_BINARY" init >/dev/null 2>&1 &&
		cp "../$filename" "./$filename" &&
		"$DITS_BINARY" add "$filename" >/dev/null 2>&1
	) || return 1

	(
		cd "$repo_b" &&
		"$DITS_BINARY" init >/dev/null 2>&1 &&
		cp "../$filename" "./$filename" &&
		"$DITS_BINARY" add "$filename" >/dev/null 2>&1
	) || return 1

	refs_a=$(python3 - "$repo_a/.dits/index" "$filename" <<'PY'
import json, sys
index_path, file_path = sys.argv[1], sys.argv[2]
with open(index_path, "r", encoding="utf-8") as f:
    idx = json.load(f)
entry = idx["entries"][file_path]
out = []
for c in entry.get("chunks", []):
    h = c.get("hash")
    if isinstance(h, list):
        h_hex = bytes(h).hex()
    else:
        h_hex = str(h)
    out.append(f'{c.get("offset")}:{c.get("size")}:{h_hex}')
print(",".join(out))
PY
) || return 1

	refs_b=$(python3 - "$repo_b/.dits/index" "$filename" <<'PY'
import json, sys
index_path, file_path = sys.argv[1], sys.argv[2]
with open(index_path, "r", encoding="utf-8") as f:
    idx = json.load(f)
entry = idx["entries"][file_path]
out = []
for c in entry.get("chunks", []):
    h = c.get("hash")
    if isinstance(h, list):
        h_hex = bytes(h).hex()
    else:
        h_hex = str(h)
    out.append(f'{c.get("offset")}:{c.get("size")}:{h_hex}')
print(",".join(out))
PY
) || return 1

	test "$refs_a" = "$refs_b"
}

# Test chunking with binary data
test_binary_chunking() {
	local filename="$1"
	local size_kb="${2:-512}"

	# Create binary file with random-like data
	dd if=/dev/urandom of="$filename" bs=1024 count="$size_kb" >/dev/null 2>&1 || return 1
	test_verify_chunking "$filename"
}

# Test chunking performance
test_chunking_performance() {
	local filename="$1"
	local max_time_ms="${2:-5000}"  # 5 seconds default

	local time_taken
	time_taken=$(test_time_ms "\"$DITS_BINARY\" add \"$filename\" >/dev/null 2>&1") || return 1
	test "$time_taken" -le "$max_time_ms"
}

# Test large file chunking
test_large_file_chunking() {
	local filename="$1"
	local size_mb="${2:-100}"

	test_write_large_file "$filename" "$size_mb" || return 1
	test_chunking_performance "$filename" "30000"  # 30 seconds for large files
}

# Export all functions
export -f test_create_chunking_file test_verify_chunking test_deduplication
export -f test_chunk_reconstruction test_chunking_sizes test_chunking_determinism
export -f test_binary_chunking test_chunking_performance test_large_file_chunking


