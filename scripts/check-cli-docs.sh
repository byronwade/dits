#!/usr/bin/env bash
# check-cli-docs.sh — enforce "real or roadmap": the documented CLI must match the binary.
#
# Fails (exit 1) if:
#   * a real command from `dits --help` is not mentioned in the CLI reference, or
#   * a known-fabricated command name reappears as if it were real.
#
# Run from repo root. Builds the binary if needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="docs/user-guide/cli-reference.md"
BIN="target/debug/dits"

if [[ ! -x "$BIN" ]]; then
  echo "Building dits (debug) ..."
  cargo build -q --bin dits
fi

# Authoritative command list, straight from the binary (portable: no mapfile/bash4).
COMMANDS="$("$BIN" --help 2>/dev/null \
  | sed -n '/^Commands:/,/^Options:/p' \
  | grep -E '^  [a-z]' \
  | awk '{print $1}' \
  | grep -vE '^(help)$')"

count=0
missing=()
for cmd in $COMMANDS; do
  count=$((count+1))
  # Accept the command if it appears anywhere in the reference (as `cmd` or dits cmd).
  if ! grep -qE "(\`${cmd}\`|dits ${cmd})" "$REF"; then
    missing+=("$cmd")
  fi
done

# Commands that earlier drafts invented and must never reappear as real.
FABRICATED=(auth vfs)
fabricated_hits=()
for fake in "${FABRICATED[@]}"; do
  if grep -qE "^### \`dits ${fake}\b|\| \`${fake}\` \| ✅" "$REF"; then
    fabricated_hits+=("$fake")
  fi
done

status=0
if (( ${#missing[@]} > 0 )); then
  echo "✗ Commands in \`dits --help\` but NOT documented in $REF:"
  printf '    %s\n' "${missing[@]}"
  status=1
fi
if (( ${#fabricated_hits[@]} > 0 )); then
  echo "✗ Fabricated/non-existent commands documented as real in $REF:"
  printf '    %s\n' "${fabricated_hits[@]}"
  status=1
fi

if (( status == 0 )); then
  echo "✓ CLI docs match the binary ($count commands documented)."
fi
exit $status
