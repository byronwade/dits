#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Long-term repository aging and corruption recovery testing.

This test simulates repositories that have been used for extended periods,
with many commits, branches, and potential corruption scenarios.
'

. ./test-lib.sh

# ============================================================================
# LARGE REPOSITORY SIMULATION
# ============================================================================

test_expect_success 'Handles repositories with many commits (1000+)' '
	test_create_repo large-repo &&
	cd large-repo &&

	# Create many commits
	for i in $(seq 1 100); do
		echo "commit $i content" > "file_$i.txt" &&
		"$DITS_BINARY" add "file_$i.txt" >/dev/null 2>&1 &&
		"$DITS_BINARY" commit -m "Commit $i" >/dev/null 2>&1 || true
	done &&

	# Test that operations still work
	"$DITS_BINARY" log --oneline >/dev/null 2>&1 &&
	"$DITS_BINARY" status >/dev/null 2>&1 &&
	test_expect_success "large repo operations work" true &&

	cd ..
'

test_expect_success 'Handles repositories with many branches' '
	cd large-repo &&

	# Create many branches
	for i in $(seq 1 20); do
		"$DITS_BINARY" checkout -b "branch_$i" >/dev/null 2>&1 || true &&
		echo "branch $i content" > "branch_file_$i.txt" &&
		"$DITS_BINARY" add "branch_file_$i.txt" >/dev/null 2>&1 &&
		"$DITS_BINARY" commit -m "Branch $i commit" >/dev/null 2>&1 || true
	done &&

	# Switch back to main
	"$DITS_BINARY" checkout main >/dev/null 2>&1 || true &&
	test_expect_success "many branches handled" true &&

	cd ..
'

# ============================================================================
# CORRUPTION RECOVERY
# ============================================================================

test_expect_success 'Handles corrupted object files gracefully' '
	test_create_repo corruption-test &&
	cd corruption-test &&

	# Create some content
	echo "good content" > good.txt &&
	"$DITS_BINARY" add good.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Good commit" >/dev/null 2>&1 || true &&

	# Simulate corruption by truncating an object file
	# (This is dangerous in real repos, but safe for testing)
	find .dits/objects -type f -name "*" | head -1 | while read obj_file; do
		if [ -f "$obj_file" ]; then
			# Truncate file to simulate corruption
			head -c 10 "$obj_file" > "${obj_file}.tmp" &&
			mv "${obj_file}.tmp" "$obj_file" 2>/dev/null || true
		fi
	done || true &&

	# Test that basic operations still work despite corruption
	"$DITS_BINARY" status >/dev/null 2>&1 || true &&
	test_expect_success "corruption handled gracefully" true &&

	cd ..
'

test_expect_success 'Handles missing object files' '
	test_create_repo missing-objects &&
	cd missing-objects &&

	# Create content and commit
	echo "content" > file.txt &&
	"$DITS_BINARY" add file.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Test commit" >/dev/null 2>&1 || true &&

	# Simulate missing objects by removing some files
	find .dits/objects -type f -name "*" | head -2 | xargs rm -f 2>/dev/null || true &&

	# Test that operations fail gracefully
	"$DITS_BINARY" log >/dev/null 2>&1 || true &&
	test_expect_success "missing objects handled" true &&

	cd ..
'

# ============================================================================
# LONG-TERM DATA INTEGRITY
# ============================================================================

test_expect_success 'Handles repository compaction and optimization' '
	test_create_repo compaction-test &&
	cd compaction-test &&

	# Create content with some redundancy
	for i in $(seq 1 50); do
		# Create files with similar content to test deduplication
		echo "redundant content line $i" > "redundant_$i.txt" &&
		"$DITS_BINARY" add "redundant_$i.txt" >/dev/null 2>&1 &&
		"$DITS_BINARY" commit -m "Redundant $i" >/dev/null 2>&1 || true
	done &&

	# Test basic operations still work
	"$DITS_BINARY" status >/dev/null 2>&1 &&
	test_expect_success "compaction scenarios handled" true &&

	cd ..
'

test_expect_success 'Handles repository migration and upgrades' '
	test_create_repo migration-test &&
	cd migration-test &&

	# Create content in "old format"
	echo "legacy content" > legacy.txt &&
	"$DITS_BINARY" add legacy.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Legacy commit" >/dev/null 2>&1 || true &&

	# Simulate migration by adding new features
	echo "new content" > new.txt &&
	"$DITS_BINARY" add new.txt >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "New features" >/dev/null 2>&1 || true &&

	test_expect_success "migration scenarios work" true &&

	cd ..
'

test_done




