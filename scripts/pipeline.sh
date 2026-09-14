#!/usr/bin/env bash
# The BaseNative pipeline, on this machine.
#
#   scripts/pipeline.sh check     # lint + tests across the monorepo — what ci.yml ran
#   scripts/pipeline.sh deploy    # build the docs site and deploy it to Pages — what deploy.yml ran
#   scripts/pipeline.sh all
#
# GitHub Actions in this org are manual-only (workflow_dispatch); this is the
# same pipeline from the same Doppler config (doppler.yaml → basenative/repository).
# Publishing packages (release.yml, changesets → GitHub Packages) stays a manual
# workflow: it needs a write:packages token that lives only in GitHub.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

WHAT="${1:-check}"

need_doppler() {
  command -v doppler >/dev/null 2>&1 || export PATH="$HOME/.local/bin:$PATH"
  command -v doppler >/dev/null 2>&1 || { echo "doppler CLI not found." >&2; exit 1; }
  doppler secrets --only-names >/dev/null 2>&1 || { echo "doppler cannot read basenative/repository from here (doppler.yaml)." >&2; exit 1; }
}

check() {
  echo "── lint"; pnpm exec nx run-many --target=lint
  echo "── test"; pnpm exec nx run-many --target=test
}

deploy() {
  need_doppler
  if [ -n "$(git status --porcelain)" ]; then
    echo "Working tree is not clean. Commit or discard first." >&2; git status --short >&2; exit 1
  fi
  echo "── build:pages + pages deploy"
  doppler run -- pnpm run deploy   # pnpm build:pages && wrangler pages deploy dist --project-name basenative
  echo "── verify"; curl -fsS -o /dev/null -w "basenative-docs.pages.dev %{http_code}\n" https://basenative-docs.pages.dev/
}

case "$WHAT" in
  check)  check ;;
  deploy) deploy ;;
  all)    check; deploy ;;
  *) echo "usage: $0 check|deploy|all" >&2; exit 2 ;;
esac
