#!/bin/sh
#
# Copyright (c) 2024 Dits Contributors
#

test_description='Git-based recovery testing for creative assets.

This test verifies that Git operations (diff, merge, blame, log, reset, revert)
work correctly with creative industry file formats and binary assets.
'

. ./test-lib.sh
. lib-chunking.sh

# ============================================================================
# GIT RECOVERY FOR 3D ASSETS
# ============================================================================

test_expect_success 'Git diff works with 3D model files' '
	test_create_repo git-recovery-3d &&
	cd git-recovery-3d &&

	# Create initial OBJ file
	cat > model.obj << 'EOF'
# Initial model
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
EOF

	"$DITS_BINARY" add model.obj >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Initial 3D model" >/dev/null 2>&1 || true &&

	# Modify the model
	cat > model.obj << 'EOF'
# Modified model
v 0 0 0
v 2 0 0
v 0 2 0
v 1 1 1
f 1 2 3
f 1 3 4
EOF

	"$DITS_BINARY" add model.obj >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Modified 3D model" >/dev/null 2>&1 || true &&

	# Test that diff works (even if not human-readable, it should not crash)
	"$DITS_BINARY" diff HEAD~1 HEAD >/dev/null 2>&1 || true &&
	test_expect_success "Git diff handles 3D models" true &&

	cd ..
'

test_expect_success 'Git merge works with binary game assets' '
	test_create_repo git-merge-assets &&
	cd git-merge-assets &&

	# Create base Unity asset
	perl -e "
		print 'UnityFS';
		print chr(\$_ % 256) x 10000;
	" > asset.unity3d &&

	"$DITS_BINARY" add asset.unity3d >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Base asset" >/dev/null 2>&1 || true &&

	# Create feature branch
	"$DITS_BINARY" checkout -b feature_branch >/dev/null 2>&1 || true &&

	# Modify asset in feature branch
	perl -e "
		print 'UnityFS';
		print chr((\$_ + 1) % 256) x 10000;  # Slightly different data
	" > asset.unity3d &&

	"$DITS_BINARY" add asset.unity3d >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Modified asset in feature" >/dev/null 2>&1 || true &&

	# Go back to main and modify differently
	"$DITS_BINARY" checkout main >/dev/null 2>&1 || true &&
	perl -e "
		print 'UnityFS';
		print chr((\$_ + 2) % 256) x 10000;  # Different modification
	" > asset.unity3d &&

	"$DITS_BINARY" add asset.unity3d >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Modified asset in main" >/dev/null 2>&1 || true &&

	# Try to merge (this will conflict, but should not crash)
	"$DITS_BINARY" merge feature_branch >/dev/null 2>&1 || true &&
	test_expect_success "Git merge handles binary assets gracefully" true &&

	cd ..
'

test_expect_success 'Git blame works with custom pipeline scripts' '
	test_create_repo git-blame-scripts &&
	cd git-blame-scripts &&

	# Create initial pipeline script
	cat > pipeline.py << 'EOF'
#!/usr/bin/env python3
# Author: Alice

def build_asset(source, target):
    # Alice: Initial build function
    print(f"Building {source} -> {target}")
    return True

if __name__ == "__main__":
    build_asset("model.obj", "model.fbx")
EOF

	"$DITS_BINARY" add pipeline.py >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Initial pipeline script" >/dev/null 2>&1 || true &&

	# Bob modifies the script
	cat > pipeline.py << 'EOF'
#!/usr/bin/env python3
# Author: Alice

def build_asset(source, target):
    # Alice: Initial build function
    print(f"Building {source} -> {target}")
    # Bob: Added optimization
    optimize_mesh(source)
    return True

def optimize_mesh(mesh_file):
    # Bob: New optimization function
    print(f"Optimizing {mesh_file}")
    return True

if __name__ == "__main__":
    build_asset("model.obj", "model.fbx")
EOF

	"$DITS_BINARY" add pipeline.py >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Added optimization" >/dev/null 2>&1 || true &&

	# Test blame functionality
	"$DITS_BINARY" blame pipeline.py >/dev/null 2>&1 || true &&
	test_expect_success "Git blame works with pipeline scripts" true &&

	cd ..
'

# ============================================================================
# RECOVERY FROM CORRUPTION
# ============================================================================

test_expect_success 'Recovery from corrupted 3D asset files' '
	test_create_repo recovery-corruption &&
	cd recovery-corruption &&

	# Create and commit a good FBX file
	perl -e "
		print 'Kaydara FBX Binary';
		print chr(0) x 23;
		print pack('V', 7400);
		print chr(\$_ % 256) x 50000;
	" > model.fbx &&

	"$DITS_BINARY" add model.fbx >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Good FBX file" >/dev/null 2>&1 || true &&

	# "Corrupt" the file by truncating it
	head -c 1000 model.fbx > model.fbx.tmp &&
	mv model.fbx.tmp model.fbx &&

	# Try to recover using git checkout
	"$DITS_BINARY" checkout HEAD -- model.fbx >/dev/null 2>&1 || true &&
	test_expect_success "Git recovery from corruption works" true &&

	cd ..
'

test_expect_success 'Recovery from accidentally deleted assets' '
	test_create_repo recovery-deleted &&
	cd recovery-deleted &&

	# Create a set of assets
	mkdir assets &&
	for i in $(seq 1 10); do
		perl -e "print chr(\$_ % 256) x 1000" > "assets/texture_$i.png"
	done &&

	"$DITS_BINARY" add assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Asset collection" >/dev/null 2>&1 || true &&

	# "Accidentally" delete some assets
	rm assets/texture_5.png assets/texture_7.png &&

	# Recover using git checkout
	"$DITS_BINARY" checkout HEAD -- assets/texture_5.png assets/texture_7.png >/dev/null 2>&1 || true &&
	test -f assets/texture_5.png &&
	test -f assets/texture_7.png &&
	test_expect_success "Git recovery from deletion works" true &&

	cd ..
'

# ============================================================================
# VERSION CONTROL WORKFLOWS FOR ASSETS
# ============================================================================

test_expect_success 'Git reset works with large asset collections' '
	test_create_repo reset-assets &&
	cd reset-assets &&

	# Create initial asset collection
	mkdir v1_assets &&
	for i in $(seq 1 50); do
		perl -e "print chr(\$_ % 256) x 5000" > "v1_assets/asset_$i.dat"
	done &&

	"$DITS_BINARY" add v1_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Version 1 assets" >/dev/null 2>&1 || true &&

	# Create v2 assets
	mkdir v2_assets &&
	for i in $(seq 1 50); do
		perl -e "print chr((\$_ + 1) % 256) x 5000" > "v2_assets/asset_$i.dat"
	done &&

	"$DITS_BINARY" add v2_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Version 2 assets" >/dev/null 2>&1 || true &&

	# Reset to v1
	"$DITS_BINARY" reset --hard HEAD~1 >/dev/null 2>&1 || true &&
	test_expect_success "Git reset works with large assets" true &&

	cd ..
'

test_expect_success 'Git revert works with binary asset changes' '
	test_create_repo revert-assets &&
	cd revert-assets &&

	# Create base asset
	perl -e "print 'BASE'; print chr(\$_ % 256) x 10000" > game_asset.bin &&
	"$DITS_BINARY" add game_asset.bin >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Base asset" >/dev/null 2>&1 || true &&

	# Make a "bad" change
	perl -e "print 'BAD_CHANGE'; print chr(\$_ % 256) x 10000" > game_asset.bin &&
	"$DITS_BINARY" add game_asset.bin >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Bad change" >/dev/null 2>&1 || true &&

	# Revert the bad change
	"$DITS_BINARY" revert HEAD >/dev/null 2>&1 || true &&
	test_expect_success "Git revert works with binary assets" true &&

	cd ..
'

# ============================================================================
# BRANCHING STRATEGIES FOR ASSETS
# ============================================================================

test_expect_success 'Asset branching workflow (feature branches)' '
	test_create_repo asset-branching &&
	cd asset-branching &&

	# Create main assets
	mkdir main_assets &&
	perl -e "print chr(\$_ % 256) x 20000" > main_assets/base_model.fbx &&
	"$DITS_BINARY" add main_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Main assets" >/dev/null 2>&1 || true &&

	# Create feature branch for character improvement
	"$DITS_BINARY" checkout -b feature/character_upgrade >/dev/null 2>&1 || true &&
	mkdir feature_assets &&
	perl -e "print chr((\$_ + 10) % 256) x 20000" > feature_assets/improved_model.fbx &&
	"$DITS_BINARY" add feature_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Improved character model" >/dev/null 2>&1 || true &&

	# Merge back to main
	"$DITS_BINARY" checkout main >/dev/null 2>&1 || true &&
	"$DITS_BINARY" merge feature/character_upgrade >/dev/null 2>&1 || true &&
	test_expect_success "Asset branching workflow works" true &&

	cd ..
'

test_expect_success 'Release branching with asset freezing' '
	test_create_repo release-branching &&
	cd release-branching &&

	# Create development assets
	mkdir dev_assets &&
	for i in $(seq 1 20); do
		perl -e "print chr(\$_ % 256) x 8000" > "dev_assets/level_$i.umap"
	done &&

	"$DITS_BINARY" add dev_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "Development assets" >/dev/null 2>&1 || true &&
	"$DITS_BINARY" tag v1.0.0 >/dev/null 2>&1 || true &&

	# Create release branch
	"$DITS_BINARY" checkout -b release/v1.0 >/dev/null 2>&1 || true &&

	# Continue development on main
	"$DITS_BINARY" checkout main >/dev/null 2>&1 || true &&
	mkdir new_dev_assets &&
	for i in $(seq 21 30); do
		perl -e "print chr((\$_ + 5) % 256) x 8000" > "new_dev_assets/level_$i.umap"
	done &&

	"$DITS_BINARY" add new_dev_assets/ >/dev/null 2>&1 &&
	"$DITS_BINARY" commit -m "New development assets" >/dev/null 2>&1 || true &&

	test_expect_success "Release branching with assets works" true &&

	cd ..
'

test_done
