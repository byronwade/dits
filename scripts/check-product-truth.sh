#!/usr/bin/env bash
# Guard the small set of public claims that previously drifted furthest from the
# current product. This is intentionally narrow: it prevents known false claims
# while docs/STATUS.md and the generated CLI check remain the richer authorities.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_PATHS=(
  README.md
  packages/npm/README.md
  apps/web/src/app
  apps/web/src/components
  apps/web/src/lib
)

status=0

deny() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(rg -n --glob '*.md' --glob '*.tsx' --glob '*.ts' "$pattern" "${PUBLIC_PATHS[@]}" || true)"
  if [[ -n "$matches" ]]; then
    echo "✗ $label"
    printf '%s\n' "$matches"
    status=1
  fi
}

require() {
  local file="$1"
  local pattern="$2"
  if ! rg -q "$pattern" "$file"; then
    echo "✗ Missing canonical product language in $file: $pattern"
    status=1
  fi
}

deny "Missing shell installer is advertised" \
  'raw\.githubusercontent\.com/byronwade/dits/main/install\.sh'
deny "Dits is described as production-ready" \
  'Dits is production-ready|DITS is production-ready'
deny "A stale exact test-count claim is public" \
  '469 automated tests|120\+ automated tests'
deny "The product is described as a shipped distributed VCS" \
  'distributed version control system'
deny "P2P is advertised as a shipped package feature" \
  '🌐 \*\*P2P Support\*\*'
deny "The retired instant-scale slogan is public" \
  '100 ?GB projects (feel like|with instant)'
deny "The AI research track promises delta sync" \
  'sync transfers only chunks|Moving a checkpoint between nodes'

require README.md 'Open, local-first version control for large media and asset pipelines'
require docs/STATUS.md 'Design/scaffolding — not functional product'
require docs/marketing/positioning.md 'Version the source\. Explain every result\.'
require apps/web/src/lib/product-story.ts 'Remote collaboration: roadmap|Open collaboration protocol'
require packages/npm/README.md 'There is no published shell installer'

for redirect_page in \
  apps/web/src/app/ai/docs/concepts/addressing/page.tsx \
  apps/web/src/app/ai/docs/workflows/checkpoints/page.tsx \
  apps/web/src/app/ai/docs/why-dits/page.tsx; do
  require "$redirect_page" 'redirect\('
done

if (( status == 0 )); then
  echo "✓ Public product claims match the local-alpha maturity model."
  echo "✓ Install, test-count, network, P2P, scale, and AI guardrails passed."
fi

exit $status
