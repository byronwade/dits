#!/bin/bash
# Deterministic-as-possible fixtures. ffmpeg is NOT bit-reproducible, so we generate
# ONCE, sha256-pin in manifest.json, and cache. Re-running only regenerates if missing.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SIZE="${1:-small}"   # small | full
case "$SIZE" in
  small) DUR=8 ;;    # ~ tens of MB, CI profile
  full)  DUR=20 ;;   # showcase profile
  *) echo "usage: gen-media.sh [small|full]"; exit 1 ;;
esac
gen () { # $1 outfile  $2.. ffmpeg-args
  local out="$DIR/$1"; shift
  [ -f "$out" ] && { echo "cached $out"; return; }
  ffmpeg -y -v error -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=$DUR" "$@" "$out"
}
# v1 + variants (ProRes intra-frame for frame work; H.264 for metadata)
gen v1.mov        -c:v prores_ks -profile:v 2
# H.264 at a realistic bitrate (~40 Mbps) so per-tool store overhead doesn't dominate
# the true delta on metadata/append workloads — otherwise tiny files make CDC tools
# look artificially bad. This keeps those comparisons honest.
gen v1.mp4        -c:v libx264 -preset medium -g 60 -pix_fmt yuv420p -b:v 40M -maxrate 40M -bufsize 80M
# v2: full re-export with a brightness bump on the 8-10s window (the honest-loss case)
[ -f "$DIR/v2_reexport.mov" ] || ffmpeg -y -v error -i "$DIR/v1.mov" \
  -vf "eq=brightness=0.30:enable='between(t,8,10)'" -c:v prores_ks -profile:v 2 "$DIR/v2_reexport.mov"
# v2: metadata-only change (mdat identical)
[ -f "$DIR/v2_meta.mp4" ] || ffmpeg -y -v error -i "$DIR/v1.mp4" -c copy \
  -metadata title="Color Pass 2" -movflags +faststart "$DIR/v2_meta.mp4"
# v2: append footage — same prefix, extra tail (the CDC-friendly case)
[ -f "$DIR/v2_append.mp4" ] || {
  ffmpeg -y -v error -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=3" \
    -c:v libx264 -preset medium -g 60 -pix_fmt yuv420p "$DIR/_tail.mp4"
  printf "file '%s'\nfile '%s'\n" "$DIR/v1.mp4" "$DIR/_tail.mp4" > "$DIR/_concat.txt"
  ffmpeg -y -v error -f concat -safe 0 -i "$DIR/_concat.txt" -c copy "$DIR/v2_append.mp4"
  rm -f "$DIR/_tail.mp4" "$DIR/_concat.txt"
}
# v2: whole-clip color grade — every frame rewritten (the honest loss for everyone)
[ -f "$DIR/v2_grade.mp4" ] || ffmpeg -y -v error -i "$DIR/v1.mp4" \
  -vf "eq=contrast=1.3:saturation=1.4:brightness=0.1" -c:v libx264 -preset medium -g 60 -pix_fmt yuv420p -b:v 40M -maxrate 40M -bufsize 80M "$DIR/v2_grade.mp4"
# photo fixture for the non-destructive photo-edit workload
gen photo.png -frames:v 1
# pin hashes
( cd "$DIR" && for f in v1.mov v1.mp4 v2_reexport.mov v2_meta.mp4 v2_append.mp4 v2_grade.mp4 photo.png; do
    printf '%s  %s\n' "$(shasum -a 256 "$f" | cut -d' ' -f1)" "$f"; done > checksums.txt )
node "$DIR/../mk-manifest.mjs" "$DIR"
echo "media ready in $DIR"
