#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Library for video and media-related test functions

# Create a minimal test MP4 file
test_create_minimal_mp4() {
	local filename="$1"

	test_expect_success "create minimal MP4 test file $filename" '
		# This creates a very basic MP4 with ftyp and mdat boxes
		# In a real implementation, you might want to use ffmpeg or similar
		perl -e "
			# MP4 ftyp box
			print pack(\"N\", 0x20);        # size
			print \"ftyp\";                 # type
			print \"mp41\";                 # major_brand
			print pack(\"N\", 0);           # minor_version
			print \"mp41\";                 # compatible_brands

			# MP4 mdat box with some dummy data
			print pack(\"N\", 0x100);       # size
			print \"mdat\";                 # type
			print chr(\$_ % 256) for 0..247;  # dummy data
		" >"$filename"
	'
}

# Test MP4 inspection
test_mp4_inspect() {
	local filename="$1"

	test_expect_success "inspect MP4 file $filename" '
		"$DITS_BINARY" inspect "$filename" >/dev/null 2>&1
	'
}

# Test MP4 roundtrip (deconstruct/reconstruct)
test_mp4_roundtrip() {
	local input="$1"
	local output="${2:-${input%.mp4}_roundtrip.mp4}"

	test_expect_success "MP4 roundtrip $input -> $output" '
		"$DITS_BINARY" roundtrip "$input" "$output" >/dev/null 2>&1 &&
		test_file_exists "$output"
	'
}

# Test video segmentation
test_video_segment() {
	local filename="$1"
	local output_dir="${2:-${filename%.mp4}_segments}"

	test_expect_success "segment video $filename" '
		"$DITS_BINARY" segment "$filename" --output "$output_dir" >/dev/null 2>&1 &&
		test_dir_exists "$output_dir"
	'
}

# Test video reassembly
test_video_assemble() {
	local segments_dir="$1"
	local output="${2:-reassembled.mp4}"

	test_expect_success "assemble video from $segments_dir" '
		"$DITS_BINARY" assemble "$segments_dir" "$output" >/dev/null 2>&1 &&
		test_file_exists "$output"
	'
}

# Test video segmentation and reassembly roundtrip
test_video_segment_assemble_roundtrip() {
	local original="$1"
	local segments_dir="${2:-${original%.mp4}_segments}"
	local reassembled="${3:-${original%.mp4}_reassembled.mp4}"

	test_expect_success "video segment/assemble roundtrip" '
		test_video_segment "$original" "$segments_dir" &&
		test_video_assemble "$segments_dir" "$reassembled" &&
		test_file_exists "$reassembled"
	'
}

# Test proxy generation
test_proxy_generate() {
	local filename="$1"
	local resolution="${2:-1080}"

	test_expect_success "generate proxy for $filename at ${resolution}p" '
		"$DITS_BINARY" proxy-generate "$filename" --resolution "$resolution" >/dev/null 2>&1
	'
}

# Test proxy status
test_proxy_status() {
	test_expect_success "check proxy status" '
		"$DITS_BINARY" proxy-status >/dev/null 2>&1
	'
}

# Test proxy listing
test_proxy_list() {
	local verbose="${1:-false}"

	test_expect_success "list proxies" '
		if test "$verbose" = "true"
		then
			"$DITS_BINARY" proxy-list --verbose >/dev/null 2>&1
		else
			"$DITS_BINARY" proxy-list >/dev/null 2>&1
		fi
	'
}

# Test video timeline operations
test_video_timeline_init() {
	local project_name="$1"

	test_expect_success "initialize video timeline project $project_name" '
		"$DITS_BINARY" video-init "$project_name" >/dev/null 2>&1
	'
}

test_video_timeline_add_clip() {
	local project="$1"
	local file="$2"
	local in_point="$3"
	local out_point="$4"
	local start="$5"
	local track="${6:-}"

	test_expect_success "add clip to video timeline $project" '
		if test -n "$track"
		then
			"$DITS_BINARY" video-add-clip "$project" --file "$file" --in "$in_point" --out "$out_point" --start "$start" --track "$track" >/dev/null 2>&1
		else
			"$DITS_BINARY" video-add-clip "$project" --file "$file" --in "$in_point" --out "$out_point" --start "$start" >/dev/null 2>&1
		fi
	'
}

test_video_timeline_show() {
	local project="$1"

	test_expect_success "show video timeline $project" '
		"$DITS_BINARY" video-show "$project" >/dev/null 2>&1
	'
}

# Test video project dependencies
test_video_dependencies() {
	local project_file="$1"

	test_expect_success "check dependencies for $project_file" '
		"$DITS_BINARY" dep-check "$project_file" >/dev/null 2>&1
	'
}

test_video_dependency_graph() {
	local project_file="$1"
	local format="${2:-tree}"

	test_expect_success "generate dependency graph for $project_file" '
		"$DITS_BINARY" dep-graph "$project_file" --format "$format" >/dev/null 2>&1
	'
}

# Test metadata extraction
test_video_metadata() {
	local filename="$1"

	test_expect_success "extract metadata from $filename" '
		"$DITS_BINARY" meta-show "$filename" >/dev/null 2>&1
	'
}

# Test video file operations end-to-end
test_video_workflow() {
	local video_file="$1"
	local project_name="${2:-test-project}"

	test_expect_success "complete video workflow test" '
		# Initialize repo
		test_repo_init "video-repo" &&

		# Add and commit video file
		cd video-repo &&
		test_repo_commit_file . "$video_file" "dummy video content" "Add video file" &&

		# Inspect video
		test_mp4_inspect "$video_file" &&

		# Generate proxy
		test_proxy_generate "$video_file" &&

		# Check proxy status
		test_proxy_status &&

		# Initialize timeline project
		test_video_timeline_init "$project_name" &&

		# Add clip to timeline
		test_video_timeline_add_clip "$project_name" "$video_file" 0.0 10.0 0.0 &&

		# Show timeline
		test_video_timeline_show "$project_name" &&

		cd ..
	'
}

# Export all functions
export -f test_create_minimal_mp4 test_mp4_inspect test_mp4_roundtrip
export -f test_video_segment test_video_assemble test_video_segment_assemble_roundtrip
export -f test_proxy_generate test_proxy_status test_proxy_list
export -f test_video_timeline_init test_video_timeline_add_clip test_video_timeline_show
export -f test_video_dependencies test_video_dependency_graph test_video_metadata
export -f test_video_workflow
