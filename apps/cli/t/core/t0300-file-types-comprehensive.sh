#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Extremely comprehensive file type testing.

This test verifies that Dits can stage and chunk a wide variety of file types
without crashing or misbehaving. The test files are lightweight synthetic
samples (magic bytes + payload) to keep runtime reasonable.
'

. ./test-lib.sh
. "$TEST_DIRECTORY/lib-chunking.sh"

write_magic_and_payload() {
	filepath="$1"
	magic="$2"
	payload_bytes="${3:-8192}"

	mkdir -p "$(dirname "$filepath")" 2>/dev/null || true

	printf "$magic" >"$filepath" || return 1
	test_write_binary "$filepath.payload" "$payload_bytes" || return 1
	cat "$filepath.payload" >>"$filepath" || return 1
	rm -f "$filepath.payload" || true
}

test_expect_success 'setup file types repo' '
	test_create_repo filetypes-test
'

# ============================================================================
# IMAGES
# ============================================================================

test_expect_success 'Image system handles JPEG files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.jpg "\xFF\xD8\xFF\xE0JFIF" 10000 &&
		test_verify_chunking test.jpg
	)
'

test_expect_success 'Image system handles PNG files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.png "\x89PNG\r\n\x1A\n" 8000 &&
		test_verify_chunking test.png
	)
'

test_expect_success 'Image system handles TIFF files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.tiff "II*\x00" 10000 &&
		test_verify_chunking test.tiff
	)
'

test_expect_success 'Image system handles RAW camera files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.cr2 "II*\x00CR2" 25000 &&
		test_verify_chunking test.cr2
	)
'

test_expect_success 'Image system handles Photoshop PSD files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.psd "8BPS\x00\x01" 50000 &&
		test_verify_chunking test.psd
	)
'

# ============================================================================
# AUDIO
# ============================================================================

test_expect_success 'Audio system handles WAV files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.wav "RIFF\x24\x00\x00\x00WAVEfmt " 20000 &&
		test_verify_chunking test.wav
	)
'

test_expect_success 'Audio system handles MP3 files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.mp3 "ID3\x03\x00\x00\x00\x00\x00\x00" 20000 &&
		test_verify_chunking test.mp3
	)
'

test_expect_success 'Audio system handles FLAC files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.flac "fLaC" 20000 &&
		test_verify_chunking test.flac
	)
'

test_expect_success 'Audio system handles AAC files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.aac "\xFF\xF1\x50\x80" 20000 &&
		test_verify_chunking test.aac
	)
'

# ============================================================================
# DOCUMENTS
# ============================================================================

test_expect_success 'Document system handles PDF files' '
	(
		cd filetypes-test &&
		printf "%s\n" "%PDF-1.4" > test.pdf &&
		printf "%s\n" "1 0 obj <<>> endobj" >> test.pdf &&
		test_verify_chunking test.pdf
	)
'

test_expect_success 'Document system handles Microsoft Office files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.docx "PK\x03\x04" 10000 &&
		write_magic_and_payload test.xlsx "PK\x03\x04" 10000 &&
		write_magic_and_payload test.pptx "PK\x03\x04" 10000 &&
		test_verify_chunking test.docx &&
		test_verify_chunking test.xlsx &&
		test_verify_chunking test.pptx
	)
'

# ============================================================================
# ARCHIVES
# ============================================================================

test_expect_success 'Archive system handles ZIP files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.zip "PK\x03\x04" 15000 &&
		test_verify_chunking test.zip
	)
'

test_expect_success 'Archive system handles TAR files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.tar "ustar\x00" 15000 &&
		test_verify_chunking test.tar
	)
'

test_expect_success 'Archive system handles GZIP files' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.gz "\x1F\x8B\x08" 15000 &&
		test_verify_chunking test.gz
	)
'

# ============================================================================
# EXECUTABLES
# ============================================================================

test_expect_success 'Binary system handles ELF executables' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.elf "\x7FELF" 20000 &&
		test_verify_chunking test.elf
	)
'

test_expect_success 'Binary system handles Mach-O executables' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.macho "\xCF\xFA\xED\xFE" 20000 &&
		test_verify_chunking test.macho
	)
'

test_expect_success 'Binary system handles Windows PE executables' '
	(
		cd filetypes-test &&
		write_magic_and_payload test.exe "MZ" 20000 &&
		test_verify_chunking test.exe
	)
'

# ============================================================================
# SOURCE + CONFIG
# ============================================================================

test_expect_success 'Source code system handles various languages' '
	(
		cd filetypes-test &&
		test_write_file main.rs "fn main() { println!(\"hi\"); }" &&
		test_write_file main.py "print(\"hi\")" &&
		test_write_file main.js "console.log(\"hi\")" &&
		test_verify_chunking main.rs &&
		test_verify_chunking main.py &&
		test_verify_chunking main.js
	)
'

test_expect_success 'Configuration system handles various formats' '
	(
		cd filetypes-test &&
		test_write_file config.json "{\"a\":1}" &&
		test_write_file config.toml "a = 1" &&
		test_write_file config.yaml "a: 1" &&
		test_verify_chunking config.json &&
		test_verify_chunking config.toml &&
		test_verify_chunking config.yaml
	)
'

# ============================================================================
# 3D + GAME ASSETS
# ============================================================================

test_expect_success '3D system handles OBJ files' '
	(
		cd filetypes-test &&
		test_write_file model.obj "v 0.0 0.0 0.0\nf 1 1 1" &&
		test_verify_chunking model.obj
	)
'

test_expect_success '3D system handles Blender files' '
	(
		cd filetypes-test &&
		write_magic_and_payload scene.blend "BLENDER" 20000 &&
		test_verify_chunking scene.blend
	)
'

test_expect_success 'Game asset system handles Unity assets' '
	(
		cd filetypes-test &&
		test_write_file unity.asset "%YAML 1.1\n--- !u!1 &1\nGameObject:" &&
		test_verify_chunking unity.asset
	)
'

test_expect_success 'Game asset system handles Unreal Engine assets' '
	(
		cd filetypes-test &&
		write_magic_and_payload asset.uasset "\xC1\x83\x2A\x9E" 20000 &&
		test_verify_chunking asset.uasset
	)
'

# ============================================================================
# SCIENTIFIC DATA
# ============================================================================

test_expect_success 'Scientific data system handles HDF5 files' '
	(
		cd filetypes-test &&
		write_magic_and_payload data.h5 "\x89HDF\r\n\x1A\n" 20000 &&
		test_verify_chunking data.h5
	)
'

test_expect_success 'Scientific data system handles FITS files' '
	(
		cd filetypes-test &&
		test_write_file data.fits "SIMPLE  =                    T" &&
		test_verify_chunking data.fits
	)
'

# ============================================================================
# FILESYSTEM / ENCODING EDGE CASES
# ============================================================================

test_expect_success 'File system handles files with extreme metadata' '
	(
		cd filetypes-test &&
		mkdir -p deep/nested/path &&
		test_write_file "deep/nested/path/space name.txt" "spaces" &&
		test_write_file "deep/nested/path/unicode-世界.txt" "unicode" &&
		test_verify_chunking "deep/nested/path/space name.txt" &&
		test_verify_chunking "deep/nested/path/unicode-世界.txt"
	)
'

test_expect_success 'File system handles mixed encoding scenarios' '
	(
		cd filetypes-test &&
		printf "line1\r\nline2\r\n" > crlf.txt &&
		printf "line1\nline2\n" > lf.txt &&
		test_verify_chunking crlf.txt &&
		test_verify_chunking lf.txt
	)
'

test_done

