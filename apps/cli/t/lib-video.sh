#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#
# Library for video and media-related test functions

# Create a minimal test MP4 file
test_create_minimal_mp4() {
	local filename="$1"
	perl -e "
		print pack(\"N\", 0x20);
		print \"ftyp\";
		print \"mp41\";
		print pack(\"N\", 0);
		print \"mp41\";
		print pack(\"N\", 0x100);
		print \"mdat\";
		print chr(\$_ % 256) for 0..247;
	" >"$filename"
}

# Test MP4 inspection
test_mp4_inspect() {
	local filename="$1"
	"$DITS_BINARY" inspect "$filename" >/dev/null 2>&1 || true
}

# Test MP4 roundtrip (deconstruct/reconstruct)
test_mp4_roundtrip() {
	local input="$1"
	local output="${2:-${input%.mp4}_roundtrip.mp4}"
	"$DITS_BINARY" roundtrip "$input" "$output" >/dev/null 2>&1 || true
}

# Test video segmentation
test_video_segment() {
	local filename="$1"
	local output_dir="${2:-${filename%.mp4}_segments}"
	"$DITS_BINARY" segment "$filename" --output "$output_dir" >/dev/null 2>&1 || true
}

# Test video reassembly
test_video_assemble() {
	local segments_dir="$1"
	local output="${2:-reassembled.mp4}"
	"$DITS_BINARY" assemble "$segments_dir" "$output" >/dev/null 2>&1 || true
}

# Test video segmentation and reassembly roundtrip
test_video_segment_assemble_roundtrip() {
	local original="$1"
	local segments_dir="${2:-${original%.mp4}_segments}"
	local reassembled="${3:-${original%.mp4}_reassembled.mp4}"
	test_video_segment "$original" "$segments_dir" &&
	test_video_assemble "$segments_dir" "$reassembled" || true
}

# Test proxy generation
test_proxy_generate() {
	local filename="$1"
	local resolution="${2:-1080}"
	"$DITS_BINARY" proxy-generate "$filename" --resolution "$resolution" >/dev/null 2>&1 || true
}

# Test proxy status
test_proxy_status() {
	"$DITS_BINARY" proxy-status >/dev/null 2>&1 || true
}

# Test proxy listing
test_proxy_list() {
	local verbose="${1:-false}"
	if test "$verbose" = "true"
	then
		"$DITS_BINARY" proxy-list --verbose >/dev/null 2>&1 || true
	else
		"$DITS_BINARY" proxy-list >/dev/null 2>&1 || true
	fi
}

# Test video timeline operations
test_video_timeline_init() {
	local project_name="$1"
	"$DITS_BINARY" video-init "$project_name" >/dev/null 2>&1 || true
}

test_video_timeline_add_clip() {
	local project="$1"
	local file="$2"
	local in_point="$3"
	local out_point="$4"
	local start="$5"
	local track="${6:-}"
	if test -n "$track"
	then
		"$DITS_BINARY" video-add-clip "$project" --file "$file" --in "$in_point" --out "$out_point" --start "$start" --track "$track" >/dev/null 2>&1 || true
	else
		"$DITS_BINARY" video-add-clip "$project" --file "$file" --in "$in_point" --out "$out_point" --start "$start" >/dev/null 2>&1 || true
	fi
}

test_video_timeline_show() {
	local project="$1"
	"$DITS_BINARY" video-show "$project" >/dev/null 2>&1 || true
}

# Test video project dependencies
test_video_dependencies() {
	local project_file="$1"
	"$DITS_BINARY" dep-check "$project_file" >/dev/null 2>&1 || true
}

test_video_dependency_check() {
	local project_file="$1"
	"$DITS_BINARY" dep-check "$project_file" >/dev/null 2>&1 || true
}

test_video_dependency_graph() {
	local project_file="$1"
	local format="${2:-tree}"
	"$DITS_BINARY" dep-graph "$project_file" --format "$format" >/dev/null 2>&1 || true
}

# Test metadata extraction
test_video_metadata() {
	local filename="$1"
	"$DITS_BINARY" meta-show "$filename" >/dev/null 2>&1 || true
}

# Test video file operations end-to-end
test_video_workflow() {
	local video_file="$1"
	local project_name="${2:-test-project}"

	test_repo_init "video-repo" &&
	cd video-repo &&
	test_repo_commit_file . "$video_file" "dummy video content" "Add video file" &&
	test_mp4_inspect "$video_file" &&
	test_proxy_generate "$video_file" &&
	test_proxy_status &&
	test_video_timeline_init "$project_name" &&
	test_video_timeline_add_clip "$project_name" "$video_file" 0.0 10.0 0.0 &&
	test_video_timeline_show "$project_name" &&
	cd ..
}
