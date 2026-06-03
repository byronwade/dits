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
gen v1.mp4        -c:v libx264 -preset medium -g 60 -pix_fmt yuv420p
# v2: full re-export with a brightness bump on the 8-10s window (the honest-loss case)
[ -f "$DIR/v2_reexport.mov" ] || ffmpeg -y -v error -i "$DIR/v1.mov" \
  -vf "eq=brightness=0.30:enable='between(t,8,10)'" -c:v prores_ks -profile:v 2 "$DIR/v2_reexport.mov"
# v2: metadata-only change (mdat identical)
[ -f "$DIR/v2_meta.mp4" ] || ffmpeg -y -v error -i "$DIR/v1.mp4" -c copy \
  -metadata title="Color Pass 2" -movflags +faststart "$DIR/v2_meta.mp4"
# pin hashes
( cd "$DIR" && for f in v1.mov v1.mp4 v2_reexport.mov v2_meta.mp4; do
    printf '%s  %s\n' "$(shasum -a 256 "$f" | cut -d' ' -f1)" "$f"; done > checksums.txt )
node "$DIR/../mk-manifest.mjs" "$DIR"
echo "media ready in $DIR"
