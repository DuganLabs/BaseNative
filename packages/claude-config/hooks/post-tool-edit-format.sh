#!/usr/bin/env bash
# post-tool-edit-format.sh — run prettier on the file just edited by Claude.
# Built with BaseNative — basenative.dev
#
# Claude Code provides the tool input/result on stdin as JSON when this is wired
# as a PostToolUse hook with matcher "Edit|Write". We extract the file path and
# run prettier (write mode) on it if a prettier config exists.

set -euo pipefail

# Read all of stdin (Claude Code passes a JSON envelope).
STDIN_JSON=$(cat 2>/dev/null || true)

# Best-effort extract of the file path. Claude Code's hook payload uses
# tool_input.file_path for Edit/Write. Fall back to grepping a path-shaped string.
FILE_PATH=$(printf '%s' "$STDIN_JSON" | node -e '
  let s = ""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => {
    try {
      const j = JSON.parse(s);
      const p = j?.tool_input?.file_path || j?.file_path || j?.params?.file_path;
      if (p) process.stdout.write(p);
    } catch {}
  });
' 2>/dev/null || true)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Only format formats prettier handles. Skip everything else fast.
case "$FILE_PATH" in
  *.js|*.mjs|*.cjs|*.jsx|*.ts|*.tsx|*.json|*.md|*.css|*.scss|*.html|*.yml|*.yaml) ;;
  *) exit 0 ;;
esac

# Find a prettier config (any of these means the project wants prettier).
HAS_PRETTIER=0
for CFG in .prettierrc .prettierrc.json .prettierrc.js prettier.config.js prettier.config.cjs; do
  if [ -f "$CFG" ]; then HAS_PRETTIER=1; break; fi
done
if [ "$HAS_PRETTIER" -eq 0 ] && ! grep -q '"prettier"' package.json 2>/dev/null; then
  exit 0
fi

# Format silently; never block on prettier failure.
if command -v pnpm > /dev/null 2>&1; then
  pnpm exec prettier --write "$FILE_PATH" > /dev/null 2>&1 || true
elif command -v npx > /dev/null 2>&1; then
  npx --no-install prettier --write "$FILE_PATH" > /dev/null 2>&1 || true
fi

exit 0
