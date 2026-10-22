#!/usr/bin/env bash
# Decide whether this CI run may use Nx Cloud.
#
# NX_CLOUD_ALLOWED_AUTHORS is a comma-separated list of commit author emails.
# Comparison is case-insensitive and exact (no substring match). An empty or
# unknown author is denied.
#
# Author source, by event:
#   push          PUSH_AUTHOR_EMAIL (github.event.head_commit.author.email)
#   pull_request  author of PR_HEAD_SHA (not the merge commit Actions checks out)
#   anything else git log -1 --format=%ae HEAD   (workflow_dispatch, schedule, …)
#
# Writes allowed=true|false to GITHUB_OUTPUT.
# Writes NX_NO_CLOUD to GITHUB_ENV. Nx skips Cloud only when that value is
# exactly "true" (an nxCloudId in nx.json still connects if the token is
# merely empty). On the denied path also writes an empty NX_CLOUD_ACCESS_TOKEN.
# This script never reads the access token; the workflow injects the secret
# only when allowed=true.
set -euo pipefail

export LC_ALL=C
export GIT_TERMINAL_PROMPT=0

if [[ -z "${GITHUB_ENV:-}" || -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "nx-cloud-access: GITHUB_ENV and GITHUB_OUTPUT must be set" >&2
  exit 1
fi

normalize() {
  printf '%s' "$1" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Prints the PR head commit's author email, or nothing when it cannot be
# resolved. Never fails the job: an unresolved author is denied below.
pr_head_author() {
  local sha sha_lc got
  sha="${PR_HEAD_SHA:-}"
  if ! printf '%s' "$sha" | grep -Eq '^[0-9a-fA-F]{40}$'; then
    echo "nx-cloud-access: pull_request head sha missing or not 40 hex digits; denying" >&2
    return 0
  fi
  sha_lc="$(printf '%s' "$sha" | tr '[:upper:]' '[:lower:]')"
  if ! git cat-file -e "${sha_lc}^{commit}" 2>/dev/null; then
    local fetched=false
    if git fetch --depth=1 origin "$sha_lc" >/dev/null 2>&1; then
      fetched=true
    elif [[ -n "${PR_NUMBER:-}" ]] && printf '%s' "${PR_NUMBER}" | grep -Eq '^[0-9]+$' \
      && git fetch --depth=1 origin "pull/${PR_NUMBER}/head" >/dev/null 2>&1; then
      fetched=true
    fi
    if [[ "$fetched" != true ]]; then
      echo "nx-cloud-access: could not fetch pull_request head ${sha_lc}; denying" >&2
      return 0
    fi
    got="$(git rev-parse FETCH_HEAD 2>/dev/null || true)"
    got="$(printf '%s' "$got" | tr '[:upper:]' '[:lower:]')"
    if [[ "$got" != "$sha_lc" ]]; then
      echo "nx-cloud-access: fetched ${got:-nothing}, not pull_request head ${sha_lc}; denying" >&2
      return 0
    fi
  fi
  git log -1 --format=%ae "$sha_lc" 2>/dev/null || true
}

author=""
event="${EVENT_NAME:-}"
if [[ "$event" == "push" ]]; then
  author="${PUSH_AUTHOR_EMAIL:-}"
elif [[ "$event" == "pull_request" ]]; then
  author="$(pr_head_author)"
else
  author="$(git log -1 --format=%ae HEAD)"
fi

author_lc="$(normalize "$author")"
allowed=false
remaining="${NX_CLOUD_ALLOWED_AUTHORS:-}"
while [[ -n "$remaining" ]]; do
  entry="${remaining%%,*}"
  case "$remaining" in
    *,*) remaining="${remaining#*,}" ;;
    *) remaining="" ;;
  esac
  entry_lc="$(normalize "$entry")"
  if [[ -n "$author_lc" && -n "$entry_lc" && "$author_lc" == "$entry_lc" ]]; then
    allowed=true
    break
  fi
done

echo "nx-cloud-access: author='${author_lc}' allowed=${allowed}"
printf 'allowed=%s\n' "$allowed" >> "$GITHUB_OUTPUT"
if [[ "$allowed" == true ]]; then
  printf 'NX_NO_CLOUD=false\n' >> "$GITHUB_ENV"
else
  printf 'NX_NO_CLOUD=true\n' >> "$GITHUB_ENV"
  printf 'NX_CLOUD_ACCESS_TOKEN=\n' >> "$GITHUB_ENV"
fi
