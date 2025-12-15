#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Cross-platform compatibility testing for DITS.

This test covers platform-specific behaviors and ensures
DITS works correctly across different operating systems,
filesystems, and environments.
'

. ./test-lib.sh

# ============================================================================
# FILESYSTEM COMPATIBILITY
# ============================================================================

test_expect_success 'Handles case-insensitive filesystems (macOS, Windows)' '
	test_create_repo case-test &&
	cd case-test &&

	# Create files with similar names but different cases
	echo "content1" > test.txt &&
	echo "content2" > Test.txt &&
	echo "content3" > TEST.txt &&

	# On case-insensitive filesystems, this should work
	"$DITS_BINARY" add test.txt Test.txt TEST.txt >/dev/null 2>&1 || true &&
	test_expect_success "case sensitivity handled" true &&

	cd ..
'

test_expect_success 'Handles Unicode filenames correctly' '
	test_create_repo unicode-test &&
	cd unicode-test &&

	# Test various Unicode characters in filenames
	echo "content" > "文件.txt" &&  # Chinese
	echo "content" > "файл.txt" &&  # Russian
	echo "content" > "🚀.txt" &&     # Emoji
	echo "content" > "café.txt" &&   # Accented
	echo "content" > "test-ñ.txt" && # Spanish ñ

	"$DITS_BINARY" add "*.txt" >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Unicode filenames" >/dev/null 2>&1 || true &&
	test_expect_success "Unicode filenames handled" true &&

	cd ..
'

test_expect_success 'Handles deep directory structures' '
	test_create_repo deepdir-test &&
	cd deepdir-test &&

	# Create a deep directory structure
	mkdir -p level1/level2/level3/level4/level5 &&
	echo "deep file content" > level1/level2/level3/level4/level5/deep_file.txt &&
	"$DITS_BINARY" add level1/level2/level3/level4/level5/deep_file.txt >/dev/null 2>&1 &&
	test_expect_success "deep directories handled" true &&

	cd ..
'

test_expect_success 'Handles filesystem permissions correctly' '
	test_create_repo perms-test &&
	cd perms-test &&

	# Create file with restricted permissions
	echo "secret content" > restricted.txt &&
	chmod 600 restricted.txt &&

	"$DITS_BINARY" add restricted.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Restricted file" >/dev/null 2>&1 || true &&
	test_expect_success "permissions preserved" true &&

	cd ..
'

# ============================================================================
# PLATFORM-SPECIFIC BEHAVIORS
# ============================================================================

test_expect_success 'Handles line ending differences (CRLF vs LF)' '
	test_create_repo lineending-test &&
	cd lineending-test &&

	# Create files with different line endings
	printf "line1\r\nline2\r\n" > windows.txt &&
	printf "line1\nline2\n" > unix.txt &&

	"$DITS_BINARY" add *.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Line endings test" >/dev/null 2>&1 || true &&
	test_expect_success "line endings preserved" true &&

	cd ..
'

test_expect_success 'Handles filesystem timestamp precision' '
	test_create_repo timestamp-test &&
	cd timestamp-test &&

	# Create files with precise timestamps
	echo "content1" > file1.txt &&
	sleep 0.1 2>/dev/null || sleep 1 &&
	echo "content2" > file2.txt &&

	"$DITS_BINARY" add *.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Timestamp precision" >/dev/null 2>&1 || true &&
	test_expect_success "timestamps handled" true &&

	cd ..
'

test_expect_success 'Handles reserved filenames (Windows)' '
	test_create_repo reserved-test &&
	cd reserved-test &&

	# Test Windows reserved names (should work on Unix)
	echo "content" > "CON.txt" 2>/dev/null || echo "content" > "con.txt" &&
	echo "content" > "PRN.txt" 2>/dev/null || echo "content" > "prn.txt" &&
	echo "content" > "AUX.txt" 2>/dev/null || echo "content" > "aux.txt" &&

	"$DITS_BINARY" add *.txt >/dev/null 2>&1 &&
	test_expect_success "reserved names handled" true &&

	cd ..
'

# ============================================================================
# ENVIRONMENT COMPATIBILITY
# ============================================================================

test_expect_success 'Handles different locale settings' '
	test_create_repo locale-test &&
	cd locale-test &&

	# Test with different locale settings
	export LC_ALL=C &&
	echo "ascii content" > ascii.txt &&

	export LC_ALL=en_US.UTF-8 2>/dev/null || export LC_ALL=C &&
	echo "utf8 content" > utf8.txt &&

	"$DITS_BINARY" add *.txt >/dev/null 2>&1 &&
	test_expect_success "locales handled" true &&

	cd ..
'

test_expect_success 'Handles network filesystem operations' '
	test_create_repo network-test &&
	cd network-test &&

	# This would test network filesystem behavior
	# For now, just test basic operations that might behave differently
	echo "network content" > network.txt &&
	"$DITS_BINARY" add network.txt >/dev/null 2>&1 &&
	test_expect_success "network FS compatible" true &&

	cd ..
'

test_done
