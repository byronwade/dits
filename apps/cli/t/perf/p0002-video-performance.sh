#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Performance tests for video operations.

This test measures the performance of video-specific operations
like MP4 parsing, proxy generation, and segmentation.
'

. ../test-lib.sh
. ../lib-video.sh
. ../lib-repo.sh

# Test MP4 inspection performance
test_expect_success 'MP4 inspection performance' '
	test_create_repo video-perf &&
	cd video-perf &&
	test_create_minimal_mp4 test.mp4 &&
	test_expect_fast "MP4 inspection" 1000 \
		"\"$DITS_BINARY\" inspect test.mp4 >/dev/null 2>&1" &&
	cd ..
'

# Test video segmentation performance (simulated)
test_expect_success 'video segmentation performance' '
	cd video-perf &&
	test_write_large_file video_50mb.mp4 50 &&
	test_expect_fast "video segmentation 50MB" 10000 \
		"\"$DITS_BINARY\" segment video_50mb.mp4 >/dev/null 2>&1" &&
	cd ..
'

# Test proxy generation performance
test_expect_success 'proxy generation performance' '
	cd video-perf &&
	test_expect_fast "proxy generation" 15000 \
		"\"$DITS_BINARY\" proxy-generate video_50mb.mp4 --resolution 720 >/dev/null 2>&1" &&
	cd ..
'

# Test video timeline operations
test_expect_success 'video timeline operations performance' '
	cd video-perf &&
	test_video_timeline_init perf-project &&

	# Add multiple clips quickly
	test_expect_fast "add multiple clips to timeline" 2000 \
		"for i in \$(seq 1 10); do
			\"$DITS_BINARY\" video-add-clip perf-project --file test.mp4 --in 0.0 --out 1.0 --start \$((i-1)) >/dev/null 2>&1
		done" &&

	cd ..
'

test_done




