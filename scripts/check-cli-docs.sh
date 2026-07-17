#!/usr/bin/env bash
# check-cli-docs.sh — enforce "real or roadmap" documentation.
#
# Fails if:
#   * a real command from `dits --help` is not mentioned in the CLI reference,
#   * a known-fabricated command name reappears as if it were real,
#   * a canonical architecture/research document is missing, or
#   * a canonical document omits its maturity label.
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

# Authoritative command list, straight from the binary (portable: no
# mapfile/bash4).
COMMANDS="$("$BIN" --help 2>/dev/null \
  | sed -n '/^Commands:/,/^Options:/p' \
  | grep -E '^  [a-z]' \
  | awk '{print $1}' \
  | grep -vE '^(help)$')"

count=0
missing=()
for cmd in $COMMANDS; do
  count=$((count+1))
  # Accept the command if it appears anywhere in the reference (as `cmd` or
  # `dits cmd`).
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

# Canonical non-status documents must state whether they are Current,
# Experimental, Design, or Research. STATUS.md is itself the maturity source.
CANONICAL_DOCS=(
  "docs/concepts.md"
  "docs/data-structures/manifest-spec.md"
  "docs/architecture/active-architecture.md"
  "docs/performance/engineering-plan.md"
  "docs/research/technical-foundations.md"
  "docs/education/course-standard.md"
)

missing_docs=()
unlabelled_docs=()
for doc in "${CANONICAL_DOCS[@]}"; do
  if [[ ! -f "$doc" ]]; then
    missing_docs+=("$doc")
  elif ! grep -qE '^\*\*Maturity:\*\*' "$doc"; then
    unlabelled_docs+=("$doc")
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
if (( ${#missing_docs[@]} > 0 )); then
  echo "✗ Missing canonical documentation:"
  printf '    %s\n' "${missing_docs[@]}"
  status=1
fi
if (( ${#unlabelled_docs[@]} > 0 )); then
  echo "✗ Canonical documents without a maturity label:"
  printf '    %s\n' "${unlabelled_docs[@]}"
  status=1
fi

if (( status == 0 )); then
  echo "✓ CLI docs match the binary ($count commands documented)."
  echo "✓ Canonical architecture documents are present and maturity-labelled."
fi
exit $status
