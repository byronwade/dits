#!/usr/bin/env bash
# Guard public claims that previously drifted furthest from the current product.
# docs/STATUS.md remains the authority; this script turns the highest-risk
# install, maturity, security, and remote boundaries into CI invariants.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_PATHS=(
  README.md
  SECURITY.md
  docs/STATUS.md
  docs/business/compliance.md
  docs/business/sla.md
  docs/security/security-privacy.md
  docs/testing/compatibility.md
  docs/user-guide/cli-reference.md
  docs/user-guide/getting-started.md
  CHANGELOG.md
  CODE_OF_CONDUCT.md
  packages/npm/README.md
  packages/npm/package.json
  packages/npm/lib
  apps/web/src/app
  apps/web/src/components
  apps/web/src/lib
  .github/workflows/release.yml
)

status=0

# Keep this gate runnable on a clean GitHub-hosted runner and on contributor
# machines that do not have ripgrep installed. The checked tree is source-only,
# so recursive grep is a safe portable fallback for the public-path scan.
if command -v rg >/dev/null 2>&1; then
  HAS_RIPGREP=1
else
  HAS_RIPGREP=0
fi

search_public_lines() {
  local pattern="$1"
  if [[ "$HAS_RIPGREP" -eq 1 ]]; then
    rg -n \
      --glob '*.md' --glob '*.tsx' --glob '*.ts' --glob '*.js' \
      --glob '*.json' --glob '*.yml' \
      "$pattern" "${PUBLIC_PATHS[@]}"
  else
    grep -RnsE -- "$pattern" "${PUBLIC_PATHS[@]}"
  fi
}

search_file_lines() {
  local pattern="$1"
  local file="$2"
  if [[ "$HAS_RIPGREP" -eq 1 ]]; then
    rg -n "$pattern" "$file"
  else
    grep -nsE -- "$pattern" "$file"
  fi
}

file_contains() {
  local pattern="$1"
  local file="$2"
  if [[ "$HAS_RIPGREP" -eq 1 ]]; then
    rg -q "$pattern" "$file"
  else
    grep -qE -- "$pattern" "$file"
  fi
}

while IFS= read -r doc; do
  if ! sed -n '1,12p' "$doc" \
    | grep -qE '^\*\*Maturity:\*\* (Current|Experimental|Design|Historical)$'; then
    echo "✗ Maintained document lacks an exact near-top maturity label: $doc"
    status=1
  fi
done < <(
  git ls-files --cached --others --exclude-standard 'docs/*.md' 'docs/**/*.md' \
    | grep -vE '^docs/superpowers/|(^|/)AGENTS\.md$'
)

deny() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(search_public_lines "$pattern" || true)"
  if [[ -n "$matches" ]]; then
    echo "✗ $label"
    printf '%s\n' "$matches"
    status=1
  fi
}

forbid() {
  local file="$1"
  local label="$2"
  local pattern="$3"
  local matches
  matches="$(search_file_lines "$pattern" "$file" || true)"
  if [[ -n "$matches" ]]; then
    echo "✗ $label"
    printf '%s\n' "$matches"
    status=1
  fi
}

require() {
  local file="$1"
  local pattern="$2"
  if ! file_contains "$pattern" "$file"; then
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
deny "The npm launcher is described as downloading a binary" \
  'downloads a prebuilt binary'
deny "The published v0.1.5 npm package is described as a full platform matrix" \
  'package contains launch paths for macOS, Linux, and Windows'
deny "Fail-closed remote commands are described as successful placeholders" \
  '(push|pull|fetch|sync).{0,50}(prints|print).{0,20}placeholder'
deny "Disabled P2P scaffolding is described as active or connected" \
  'P2P repository share active|Connected to P2P repository|All P2P transfers use'
deny "An unverified project email is published as an active contact" \
  '(conduct|security|support)@dits\.(io|dev)'
deny "The disabled encryption experiment is described as shipping" \
  'at-rest encryption (is|as) (real|shipping)|Enable repository encryption for sensitive'

forbid packages/npm/lib/index.js \
  "The npm launcher recommends the nonexistent crates.io package" \
  'cargo install dits'
forbid .github/workflows/release.yml \
  "The release workflow advertises a nonexistent installer or Homebrew tap" \
  'install\.sh|brew install|Homebrew'
forbid Dockerfile \
  "The source-built CLI image is described as a supported cross-platform distribution" \
  'supported, cross-platform|supported cross-platform'

if [[ -e scripts/install.sh ]]; then
  echo "✗ A shell installer exists while every public install page says none is published"
  status=1
fi
if [[ -e scripts/Formula/dits.rb ]]; then
  echo "✗ A Homebrew formula exists while every public install page says no tap is published"
  status=1
fi

require README.md 'Open, local-first version control for large media and asset pipelines'
require README.md 'published v0\.1\.5 npm artifact contains Apple-silicon macOS and Windows x64'
require docs/STATUS.md 'Design/scaffolding — not functional product'
require docs/STATUS.md 'return a nonzero error without changing objects, refs, or the working tree'
require docs/STATUS.md '`darwin-arm64` and `win32-x64` only'
require docs/STATUS.md '`dits p2p` operation fails nonzero'
require docs/marketing/positioning.md 'Version the source\. Explain every result\.'
require apps/web/src/lib/product-story.ts 'Remote collaboration: roadmap|Open collaboration protocol'
require apps/web/src/lib/product-story.ts 'do not transfer repository data'
require packages/npm/README.md 'There is no published shell installer'
require packages/npm/README.md 'darwin-arm64'
require packages/npm/README.md 'win32-x64'
require packages/npm/package.json 'node scripts/verify-binaries\.js'
require SECURITY.md 'GitHub private vulnerability reporting'
require SECURITY.md 'does not offer a bug bounty'
require docs/business/compliance.md 'does not currently provide or claim'
require docs/business/sla.md 'does not offer a binding service'
require docs/user-guide/getting-started.md 'Remote `push`, `pull`, `fetch`, and `sync` intentionally exit nonzero'
require docs/user-guide/cli-reference.md 'fails closed, no data transfer'
require docs/user-guide/cli-reference.md 'P2P command surface'
require apps/web/src/app/docs/cli/p2p/page.tsx 'every P2P operation fails'
require .github/workflows/release.yml 'Verify tag matches the source version'
require .github/workflows/release.yml 'Manual Download'
require Dockerfile 'not a published or supported Dits image'

source_version="$(sed -n 's/^version = "\([^"]*\)"/\1/p' Cargo.toml | head -1)"
cli_version="$(sed -n 's/^version = "\([^"]*\)"/\1/p' apps/cli/Cargo.toml | head -1)"
core_version="$(sed -n 's/^version = "\([^"]*\)"/\1/p' packages/dits-core/Cargo.toml | head -1)"
npm_version="$(node -p "require('./packages/npm/package.json').version")"
lock_version="$(node -p "require('./package-lock.json').packages['packages/npm'].version")"
if [[ "$source_version" != "$cli_version" ||
      "$source_version" != "$core_version" ||
      "$source_version" != "$npm_version" ||
      "$source_version" != "$lock_version" ]]; then
  echo "✗ Workspace, CLI, core, npm package, and workspace lock versions disagree"
  echo "  workspace=$source_version cli=$cli_version core=$core_version npm=$npm_version package-lock=$lock_version"
  status=1
fi

root_node_engine="$(node -p "require('./package.json').engines.node")"
web_node_engine="$(node -p "require('./apps/web/package.json').engines.node")"
lock_root_node_engine="$(node -p "require('./package-lock.json').packages[''].engines.node")"
lock_web_node_engine="$(node -p "require('./package-lock.json').packages['apps/web'].engines.node")"
next_node_engine="$(node -p "require('./package-lock.json').packages['node_modules/next'].engines.node")"
if [[ "$root_node_engine" != "$web_node_engine" ||
      "$root_node_engine" != "$lock_root_node_engine" ||
      "$web_node_engine" != "$lock_web_node_engine" ||
      "$web_node_engine" != "$next_node_engine" ]]; then
  echo "✗ Root/web Node engine metadata disagrees with the locked Next.js requirement"
  echo "  root=$root_node_engine web=$web_node_engine lock-root=$lock_root_node_engine lock-web=$lock_web_node_engine next=$next_node_engine"
  status=1
fi

for redirect_page in \
  apps/web/src/app/ai/docs/concepts/addressing/page.tsx \
  apps/web/src/app/ai/docs/workflows/checkpoints/page.tsx \
  apps/web/src/app/ai/docs/why-dits/page.tsx; do
  require "$redirect_page" 'redirect\('
done

if (( status == 0 )); then
  echo "✓ Public product claims match the local-alpha maturity model."
  echo "✓ Install, security, legal, network, P2P, scale, and AI guardrails passed."
fi

exit $status
