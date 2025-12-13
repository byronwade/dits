#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Extremely comprehensive file type testing.

This test covers all supported file types and formats including:
- Images (JPEG, PNG, TIFF, RAW, PSD, etc.)
- Audio (WAV, MP3, AAC, FLAC, etc.)
- Documents (PDF, DOC, XLS, PPT, etc.)
- Archives (ZIP, TAR, 7Z, RAR, etc.)
- Executables and binaries
- Configuration files
- Source code files
- 3D models and animations
- Video game assets
- Scientific data formats
'

. ./test-lib.sh

# ============================================================================
# IMAGE FORMAT TESTING
# ============================================================================

test_expect_success 'Image system handles JPEG files' '
	test_create_repo filetypes-test &&
	cd filetypes-test &&

	# Create a minimal JPEG-like file (simplified header)
	perl -e "
		print pack('H*', 'FFD8FFE000104A464946000101');  # JPEG SOI and JFIF
		print chr(\$_ % 256) x 10000;  # Fake image data
		print pack('H*', 'FFD9');  # JPEG EOI
	" > test.jpg &&

	test_verify_chunking test.jpg &&
	cd ..
'

test_expect_success 'Image system handles PNG files' '
	cd filetypes-test &&
	# Create minimal PNG file
	perl -e "
		print pack('H*', '89504E470D0A1A0A');  # PNG signature
		# IHDR chunk (simplified)
		print pack('N', 13);  # Length
		print 'IHDR';         # Type
		print pack('NNC', 100, 100, 8);  # Width, height, bit depth
		print chr(2);         # Color type
		print chr(0);         # Compression
		print chr(0);         # Filter
		print chr(0);         # Interlace
		print pack('N', 0x9A9B9C9D);  # CRC (fake)
		print chr(\$_ % 256) x 5000;  # Fake image data
	" > test.png &&

	test_verify_chunking test.png &&
	cd ..
'

test_expect_success 'Image system handles TIFF files' '
	cd filetypes-test &&
	# Create minimal TIFF file
	perl -e "
		print 'II';          # Little-endian
		print pack('v', 42); # Magic number
		print pack('V', 8);  # IFD offset
		print pack('v', 1);  # Number of directory entries
		# Directory entry (simplified)
		print pack('vvVV', 256, 3, 1, 100);  # Width tag
		print pack('V', 0);  # Next IFD offset
		print chr(\$_ % 256) x 10000;  # Fake image data
	" > test.tiff &&

	test_verify_chunking test.tiff &&
	cd ..
'

test_expect_success 'Image system handles RAW camera files' '
	cd filetypes-test &&
	# Simulate CR2 (Canon RAW) file structure
	perl -e "
		print 'II';          # TIFF-like header
		print pack('H*', '2A00');  # CR2 magic
		print chr(\$_ % 256) x 100000;  # Fake RAW data
	" > test.cr2 &&

	test_verify_chunking test.cr2 &&
	cd ..
'

test_expect_success 'Image system handles Photoshop PSD files' '
	cd filetypes-test &&
	# Create minimal PSD file
	perl -e "
		print '8BPS';        # PSD signature
		print pack('n', 1);  # Version
		print chr(0) x 6;    # Reserved
		print pack('n', 3);  # Channels
		print pack('N', 100); # Height
		print pack('N', 100); # Width
		print pack('n', 8);   # Depth
		print pack('n', 3);   # Color mode
		print chr(\$_ % 256) x 50000;  # Fake image data
	" > test.psd &&

	test_verify_chunking test.psd &&
	cd ..
'

# ============================================================================
# AUDIO FORMAT TESTING
# ============================================================================

test_expect_success 'Audio system handles WAV files' '
	cd filetypes-test &&
	# Create minimal WAV file
	perl -e "
		print 'RIFF';        # RIFF header
		print pack('V', 36); # Chunk size
		print 'WAVE';        # Format
		print 'fmt ';        # Format chunk
		print pack('V', 16); # Chunk size
		print pack('vvVV', 1, 1, 44100, 88200);  # PCM, mono, 44.1kHz
		print 'data';        # Data chunk
		print pack('V', 10000); # Data size
		print chr(\$_ % 256) x 10000;  # Fake audio data
	" > test.wav &&

	test_verify_chunking test.wav &&
	cd ..
'

test_expect_success 'Audio system handles MP3 files' '
	cd filetypes-test &&
	# Create minimal MP3 file with ID3v2 tag
	perl -e "
		print 'ID3';         # ID3v2 header
		print chr(3);        # Version
		print chr(0);        # Revision
		print chr(0);        # Flags
		print chr(0) x 4;    # Size (syncsafe)
		# Fake MP3 frames
		for (my \$i = 0; \$i < 1000; \$i++) {
			print chr(0xFF);  # Frame sync
			print chr(0xFB);  # MPEG-1, Layer 3
			print chr(\$_ % 256) x 100;  # Frame data
		}
	" > test.mp3 &&

	test_verify_chunking test.mp3 &&
	cd ..
'

test_expect_success 'Audio system handles FLAC files' '
	cd filetypes-test &&
	# Create minimal FLAC file
	perl -e "
		print 'fLaC';        # FLAC signature
		# STREAMINFO block
		print chr(0);        # Last block flag
		print chr(0);        # Block type
		print pack('N', 34); # Block length
		print chr(\$_ % 256) x 34;  # Stream info
		# Fake audio frames
		print chr(\$_ % 256) x 50000;
	" > test.flac &&

	test_verify_chunking test.flac &&
	cd ..
'

test_expect_success 'Audio system handles AAC files' '
	cd filetypes-test &&
	# Create minimal AAC file in MP4 container
	perl -e "
		print pack('H*', '00000020667479706D703431');  # MP4 ftyp
		print chr(\$_ % 256) x 100000;  # AAC data in MP4
	" > test.aac &&

	test_verify_chunking test.aac &&
	cd ..
'

# ============================================================================
# DOCUMENT FORMAT TESTING
# ============================================================================

test_expect_success 'Document system handles PDF files' '
	cd filetypes-test &&
	# Create minimal PDF file
	cat > test.pdf << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello, World!) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000200 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF
EOF

	test_verify_chunking test.pdf &&
	cd ..
'

test_expect_success 'Document system handles Microsoft Office files' '
	cd filetypes-test &&
	# Create minimal DOCX (ZIP-based)
	mkdir -p docx_content && \
	echo '<?xml version="1.0"?><document><body><p>Hello</p></body></document>' > docx_content/document.xml && \
	cd docx_content && zip -r ../test.docx . >/dev/null 2>&1 && cd .. && \
	rm -rf docx_content && \

	test_verify_chunking test.docx &&
	cd ..
'

# ============================================================================
# ARCHIVE AND COMPRESSED FORMAT TESTING
# ============================================================================

test_expect_success 'Archive system handles ZIP files' '
	cd filetypes-test &&
	# Create a ZIP file with test content
	mkdir -p zip_content && \
	echo "test file content" > zip_content/test.txt && \
	cd zip_content && zip -r ../test.zip . >/dev/null 2>&1 && cd .. && \
	rm -rf zip_content && \

	test_verify_chunking test.zip &&
	cd ..
'

test_expect_success 'Archive system handles TAR files' '
	cd filetypes-test &&
	# Create a TAR file
	mkdir -p tar_content && \
	echo "tar test content" > tar_content/test.txt && \
	cd tar_content && tar -cf ../test.tar . >/dev/null 2>&1 && cd .. && \
	rm -rf tar_content && \

	test_verify_chunking test.tar &&
	cd ..
'

test_expect_success 'Archive system handles GZIP files' '
	cd filetypes-test &&
	echo "This is test content for gzip compression" | gzip > test.gz && \
	test_verify_chunking test.gz &&
	cd ..
'

# ============================================================================
# EXECUTABLE AND BINARY FORMAT TESTING
# ============================================================================

test_expect_success 'Binary system handles ELF executables' '
	cd filetypes-test &&
	# Create minimal ELF-like structure
	perl -e "
		print chr(0x7F); print 'ELF';  # ELF magic
		print chr(1);     # 32-bit
		print chr(1);     # Little endian
		print chr(1);     # Version
		print chr(0) x 9; # Padding
		print pack('v', 2);  # Executable
		print pack('v', 3);  # x86
		print chr(\$_ % 256) x 10000;  # Fake code/data
	" > test.elf &&

	test_verify_chunking test.elf &&
	cd ..
'

test_expect_success 'Binary system handles Mach-O executables' '
	cd filetypes-test &&
	# Create minimal Mach-O structure
	perl -e "
		print pack('N', 0xFEEDFACE);  # Mach-O magic
		print pack('N', 0x00000007);  # i386
		print pack('N', 0x00000003);  # MH_OBJECT
		print chr(\$_ % 256) x 10000;  # Fake binary data
	" > test.macho &&

	test_verify_chunking test.macho &&
	cd ..
'

test_expect_success 'Binary system handles Windows PE executables' '
	cd filetypes-test &&
	# Create minimal PE structure
	perl -e "
		print 'MZ';         # DOS MZ header
		print chr(0) x 58;  # DOS header padding
		print pack('V', 64); # PE header offset
		print chr(0) x 64;   # DOS stub
		print 'PE';         # PE signature
		print chr(0) x 2;   # Machine type placeholder
		print chr(\$_ % 256) x 10000;  # Fake PE data
	" > test.exe &&

	test_verify_chunking test.exe &&
	cd ..
'

# ============================================================================
# SOURCE CODE AND CONFIGURATION FILES
# ============================================================================

test_expect_success 'Source code system handles various languages' '
	cd filetypes-test &&

	# C source
	test_write_file test.c "#include <stdio.h>\nint main() { printf(\"Hello\\n\"); return 0; }" &&

	# Python
	test_write_file test.py "#!/usr/bin/env python3\nprint('Hello, World!')" &&

	# JavaScript
	test_write_file test.js "console.log('Hello, World!');" &&

	# Rust
	test_write_file test.rs "fn main() { println!(\"Hello, World!\"); }" &&

	# Go
	test_write_file test.go "package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"Hello\") }" &&

	for file in test.c test.py test.js test.rs test.go; do
		test_verify_chunking "$file" || exit 1
	done &&

	cd ..
'

test_expect_success 'Configuration system handles various formats' '
	cd filetypes-test &&

	# JSON
	test_write_file config.json '{"key": "value", "number": 42, "array": [1,2,3]}' &&

	# YAML
	cat > config.yaml << 'EOF'
key: value
number: 42
array:
  - item1
  - item2
EOF

	# TOML
	cat > config.toml << 'EOF'
[key]
value = "test"
number = 42

[[array]]
item = "first"
[[array]]
item = "second"
EOF

	# XML
	test_write_file config.xml '<?xml version="1.0"?><config><key>value</key><number>42</number></config>' &&

	# INI
	cat > config.ini << 'EOF'
[section]
key=value
number=42
EOF

	for file in config.json config.yaml config.toml config.xml config.ini; do
		test_verify_chunking "$file" || exit 1
	done &&

	cd ..
'

# ============================================================================
# 3D MODEL AND ANIMATION FILES
# ============================================================================

test_expect_success '3D system handles OBJ files' '
	cd filetypes-test &&
	cat > model.obj << 'EOF'
# OBJ file
v 1.000000 1.000000 -1.000000
v 1.000000 -1.000000 -1.000000
v -1.000000 -1.000000 -1.000000
f 1 2 3
EOF
	test_verify_chunking model.obj &&
	cd ..
'

test_expect_success '3D system handles Blender files' '
	cd filetypes-test &&
	# Create minimal Blender file structure (simplified)
	perl -e "
		print 'BLENDER';    # Magic
		print chr(0) x 7;   # Version padding
		print chr(\$_ % 256) x 100000;  # Fake blend data
	" > model.blend &&

	test_verify_chunking model.blend &&
	cd ..
'

# ============================================================================
# VIDEO GAME ASSETS
# ============================================================================

test_expect_success 'Game asset system handles Unity assets' '
	cd filetypes-test &&
	# Create minimal Unity asset bundle structure
	perl -e "
		print 'UnityFS';    # Unity asset magic
		print chr(0) x 12;  # Version/format data
		print chr(\$_ % 256) x 50000;  # Fake asset data
	" > asset.unity3d &&

	test_verify_chunking asset.unity3d &&
	cd ..
'

test_expect_success 'Game asset system handles Unreal Engine assets' '
	cd filetypes-test &&
	# Create minimal Unreal asset structure
	perl -e "
		print chr(0xC1) . chr(0x83) . chr(0x2A) . chr(0x9E);  # Unreal magic
		print chr(\$_ % 256) x 50000;  # Fake asset data
	" > asset.uasset &&

	test_verify_chunking asset.uasset &&
	cd ..
'

# ============================================================================
# SCIENTIFIC AND DATA FORMATS
# ============================================================================

test_expect_success 'Scientific data system handles HDF5 files' '
	cd filetypes-test &&
	# Create minimal HDF5 file structure
	perl -e "
		print chr(0x89) . 'HDF\r\n' . chr(0x1A) . chr(0x0A);  # HDF5 magic
		print chr(\$_ % 256) x 100000;  # Fake scientific data
	" > data.h5 &&

	test_verify_chunking data.h5 &&
	cd ..
'

test_expect_success 'Scientific data system handles FITS files' '
	cd filetypes-test &&
	# Create minimal FITS file
	perl -e "
		print 'SIMPLE  =                    T / conforms to FITS standard' .
			  'BITPIX  =                    8 / array data type' .
			  'NAXIS   =                    0 / number of array dimensions' .
			  chr(0) x 47;  # Pad to 80 bytes
		print chr(\$_ % 256) x 50000;  # Fake astronomical data
	" > data.fits &&

	test_verify_chunking data.fits &&
	cd ..
'

# ============================================================================
# EXTREME EDGE CASES
# ============================================================================

test_expect_success 'File system handles files with extreme metadata' '
	cd filetypes-test &&

	# File with extremely long name
	long_name=$(perl -e 'print "a" x 255') &&
	test_write_file "$long_name.txt" "content" &&

	# File with special characters in name
	test_write_file "special-chars_!@#\$%^&*().txt" "special content" &&

	# Hidden files
	test_write_file ".hidden" "hidden content" &&

	for file in "$long_name.txt" "special-chars_!@#\$%^&*().txt" ".hidden"; do
		test_verify_chunking "$file" || exit 1
	done &&

	cd ..
'

test_expect_success 'File system handles mixed encoding scenarios' '
	cd filetypes-test &&

	# File with mixed encodings
	perl -e "
		use Encode;
		print encode('utf-8', 'UTF-8 content: ñáéíóú');
		print 'Latin-1 content: ' . chr(241) . chr(225);  # Latin-1 encoded
		print chr(\$_ % 256) x 1000;  # Binary data
	" > mixed_encoding.bin &&

	test_verify_chunking mixed_encoding.bin &&
	cd ..
'

test_done
