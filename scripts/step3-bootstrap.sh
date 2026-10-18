#!/bin/sh
# BaseNative — Step 3 bootstrap: first publish + trusted-publisher config
# for the 24 @basenative packages that do not exist on npm yet.
#
# This script lives IN the repo so there is exactly one current copy.
# Run it from a fresh clone, from anywhere:
#   git clone https://github.com/DuganLabs/BaseNative.git ~/basenative-step3
#   sh ~/basenative-step3/scripts/step3-bootstrap.sh
# It changes directory to the repo root itself (relative to its own
# location), so the caller's working directory does not matter.
#
# WHY: npm only lets a trusted publisher attach to a package that already
# exists on the registry, so each of these needs ONE manual first publish
# under the account's own npm session. After this runs once, the Release
# workflow owns all 45 packages.
#
# Prerequisites: pnpm 10, npm >= 11.15, and an active npm session
# (npm login — its 2FA covers the publishes; the trust phase may ask for
# browser auth once).
#
# Idempotent: packages already on the registry at the repo version are
# skipped; failures are collected and reported at the end.

set -u
cd "$(dirname "$0")/.." || exit 1
echo "Repo root: $(pwd)"

FAILED=""

echo "== Phase A: first publish of the 24 new packages (pnpm rewrites workspace: deps)"
for dir in admin auth-webauthn builder claude-config combobox doppler \
  eslint-config evals favicon fonts hmr icons integrations keyboard markdown \
  mcp og-image persist share station theme tsconfig validate wrangler-preset; do
  pkgdir="packages/$dir"
  name=$(node -p "require('./$pkgdir/package.json').name")
  ver=$(node -p "require('./$pkgdir/package.json').version")
  if npm view "$name@$ver" version >/dev/null 2>&1; then
    echo "skip  $name@$ver (already on npm)"
    continue
  fi
  echo "pub   $name@$ver"
  if (cd "$pkgdir" && pnpm publish --access public --no-git-checks); then
    echo "ok    $name@$ver"
  else
    echo "FAIL  $name@$ver"
    FAILED="$FAILED publish:$name"
  fi
done

echo
echo "== Phase B: attach trusted publisher (same config as the first 21)"
for dir in admin auth-webauthn builder claude-config combobox doppler \
  eslint-config evals favicon fonts hmr icons integrations keyboard markdown \
  mcp og-image persist share station theme tsconfig validate wrangler-preset; do
  name="@basenative/$dir"
  echo "trust $name"
  if npm trust github "$name" \
      --repo DuganLabs/BaseNative \
      --file release.yml \
      --env prd \
      --allow-publish -y; then
    echo "ok    $name"
  else
    echo "FAIL  $name (if a stale config exists: npm trust list $name, then npm trust revoke --id <id> $name, then re-run this phase)"
    FAILED="$FAILED trust:$name"
  fi
  sleep 2
done

echo
if [ -n "$FAILED" ]; then
  echo "Completed with failures:$FAILED"
  echo "Re-running this script is safe — finished packages are skipped."
  exit 1
fi
echo "All 24 packages published and configured."
