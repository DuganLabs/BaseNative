#!/usr/bin/env bash
# pre-commit-secret-scan.sh — block obvious secret leaks before commit.
# Built with BaseNative — basenative.dev
#
# Wired as a UserPromptSubmit hook OR as a git pre-commit hook.
# When invoked from Claude Code, reads JSON on stdin; we just scan staged files.
# Exit 0 = allow, exit 1 = block (Claude Code surfaces stderr).

set -euo pipefail

# If we're not in a git repo, do nothing.
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  exit 0
fi

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

# Patterns: high-confidence secrets only. False positives are worse than misses here
# because users will start dismissing the hook.
PATTERNS=(
  # AWS
  'AKIA[0-9A-Z]{16}'
  'aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}'
  # GitHub
  'ghp_[A-Za-z0-9]{36,255}'
  'gho_[A-Za-z0-9]{36,255}'
  'ghs_[A-Za-z0-9]{36,255}'
  'github_pat_[A-Za-z0-9_]{82,}'
  # Stripe
  'sk_live_[A-Za-z0-9]{24,}'
  'rk_live_[A-Za-z0-9]{24,}'
  # OpenAI / Anthropic
  'sk-ant-[A-Za-z0-9_-]{40,}'
  'sk-proj-[A-Za-z0-9_-]{40,}'
  # Slack
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  # Google
  'AIza[0-9A-Za-z_-]{35}'
  # Generic high-entropy private keys
  '-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----'
  # Doppler service tokens
  'dp\.st\.[a-z]{2,8}\.[A-Za-z0-9]{40,}'
)

FOUND=0
while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  # Skip lockfiles and binary obvious cases.
  case "$FILE" in
    *.lock|*lock.json|*.lockb|pnpm-lock.yaml) continue ;;
    *.png|*.jpg|*.jpeg|*.webp|*.gif|*.pdf|*.zip|*.tar|*.tgz) continue ;;
  esac
  for PAT in "${PATTERNS[@]}"; do
    if git show ":$FILE" 2>/dev/null | grep -E -q "$PAT"; then
      echo "BLOCKED: possible secret in $FILE — pattern: $PAT" >&2
      FOUND=1
    fi
  done
done <<< "$STAGED"

if [ "$FOUND" -eq 1 ]; then
  echo "" >&2
  echo "Move the secret to Doppler (run the dl-doppler-setup skill) or remove it before committing." >&2
  echo "If this is a false positive, edit .claude/hooks/pre-commit-secret-scan.sh to refine the pattern." >&2
  exit 1
fi

exit 0
