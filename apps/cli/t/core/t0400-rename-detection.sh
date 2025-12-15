#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Test file rename detection functionality.

This test verifies that Dits correctly detects file renames,
both for staged and unstaged changes.
'

. ./test-lib.sh

# Test 1: Unstaged rename detection
test_expect_success 'unstaged rename detection' '
	(
	test_create_repo rename-test-repo-1 &&
	cd rename-test-repo-1 &&
	
	# Create and commit a file
	echo "Original content" > original_file.txt &&
	"$DITS_BINARY" add original_file.txt &&
	"$DITS_BINARY" commit -m "Add original file" &&
	
	# Rename the file (unstaged)
	mv original_file.txt renamed_file.txt &&
	
	# Check status - should detect rename
	status_output=$("$DITS_BINARY" status) &&
	echo "$status_output" | grep -q "renamed.*original_file.txt.*renamed_file.txt" ||
	(
		echo "Status output:" &&
		echo "$status_output" &&
		false
	)
	)
'

# Test 2: Staged rename detection
test_expect_success 'staged rename detection' '
	(
	test_create_repo rename-test-repo-2 &&
	cd rename-test-repo-2 &&
	
	# Create and commit another file
	echo "Another file content" > another_original.txt &&
	"$DITS_BINARY" add another_original.txt &&
	"$DITS_BINARY" commit -m "Add another file" &&
	
	# Rename and stage
	mv another_original.txt another_renamed.txt &&
	"$DITS_BINARY" add another_renamed.txt &&
	
	# Check status - should show staged rename
	status_output=$("$DITS_BINARY" status) &&
	echo "$status_output" | grep -q "renamed.*another_original.txt.*another_renamed.txt" ||
	(
		echo "Status output:" &&
		echo "$status_output" &&
		false
	)
	)
'

# Test 3: Verify rename detection with same content hash
test_expect_success 'rename detection uses content hash matching' '
	(
	test_create_repo rename-test-repo-3 &&
	cd rename-test-repo-3 &&
	
	# Create file with known content
	echo "Hash test content" > hash_test.txt &&
	"$DITS_BINARY" add hash_test.txt &&
	"$DITS_BINARY" commit -m "Add hash test file" &&
	
	# Rename without modifying content
	mv hash_test.txt hash_test_renamed.txt &&
	
	# Should detect rename (same content = same hash)
	status_output=$("$DITS_BINARY" status) &&
	echo "$status_output" | grep -q "renamed.*hash_test.txt.*hash_test_renamed.txt" ||
	(
		echo "Hash-based rename not detected. Status:" &&
		echo "$status_output" &&
		false
	)
	)
'

# Test 4: Verify no false positive on modified file
test_expect_success 'modified file should not be detected as rename' '
	(
	test_create_repo rename-test-repo-4 &&
	cd rename-test-repo-4 &&
	
	# Create and commit file
	echo "Original" > modify_test.txt &&
	"$DITS_BINARY" add modify_test.txt &&
	"$DITS_BINARY" commit -m "Add modify test" &&
	
	# Modify the file (different content = different hash)
	echo "Modified content" > modify_test.txt &&
	
	# Should NOT detect as rename (content changed)
	status_output=$("$DITS_BINARY" status) &&
	echo "$status_output" | grep -Eq "modified:.*modify_test\\.txt" &&
	echo "$status_output" | grep -Eqv "renamed:.*modify_test\\.txt" ||
	(
		echo "Modified file incorrectly detected as rename. Status:" &&
		echo "$status_output" &&
		false
	)
	)
'

# Test 5: Verify new file is not detected as rename
test_expect_success 'new file should not be detected as rename' '
	(
	test_create_repo rename-test-repo-5 &&
	cd rename-test-repo-5 &&
	
	# Create a completely new file (not in any commit)
	echo "Brand new content" > brand_new.txt &&
	
	# Should show as untracked/new, not rename
	status_output=$("$DITS_BINARY" status) &&
	echo "$status_output" | grep -q "brand_new.txt" &&
	echo "$status_output" | grep -qv "renamed.*brand_new.txt" ||
	(
		echo "New file incorrectly detected as rename. Status:" &&
		echo "$status_output" &&
		false
	)
	)
'

# Test 6: Multiple renames
test_expect_success 'handle multiple file renames' '
	(
	test_create_repo rename-test-repo-6 &&
	cd rename-test-repo-6 &&
	
	# Create and commit multiple files
	echo "File 1" > file1.txt &&
	echo "File 2" > file2.txt &&
	"$DITS_BINARY" add file1.txt file2.txt &&
	"$DITS_BINARY" commit -m "Add multiple files" &&
	
	# Rename both
	mv file1.txt renamed_file1.txt &&
	mv file2.txt renamed_file2.txt &&
	
	# Should detect both renames
	status_output=$("$DITS_BINARY" status) &&
	rename_count=$(echo "$status_output" | grep -c "renamed" || echo "0") &&
	test $rename_count -ge 2 ||
	(
		echo "Multiple renames not detected. Status:" &&
		echo "$status_output" &&
		echo "Found $rename_count renames, expected at least 2" &&
		false
	)
	)
'

# Test 7: Rename with commit
test_expect_success 'commit preserves rename information' '
	(
	test_create_repo rename-test-repo-7 &&
	cd rename-test-repo-7 &&
	
	# Create file
	echo "Commit test" > commit_test.txt &&
	"$DITS_BINARY" add commit_test.txt &&
	"$DITS_BINARY" commit -m "Add commit test" &&
	
	# Rename and commit
	mv commit_test.txt commit_test_renamed.txt &&
	"$DITS_BINARY" add commit_test_renamed.txt &&
	"$DITS_BINARY" commit -m "Rename commit test" &&
	
	# Verify the rename was committed
	log_output=$("$DITS_BINARY" log -n 1) &&
	echo "$log_output" | grep -q "Rename commit test" ||
	(
		echo "Rename commit failed. Log:" &&
		echo "$log_output" &&
		false
	)
	)
'

test_done
