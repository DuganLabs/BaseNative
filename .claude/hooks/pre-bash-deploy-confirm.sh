#!/usr/bin/env bash
# pre-bash-deploy-confirm.sh — extra confirmation gate before any wrangler deploy.
# Built with BaseNative — basenative.dev
#
# Claude Code passes the proposed Bash command on stdin (JSON). If the command
# matches a deploy pattern, we emit a "deny" decision with a reason — Claude
# will surface that and the user must explicitly re-issue the command.

set -euo pipefail

STDIN_JSON=$(cat 2>/dev/null || true)

# Extract tool_input.command from the JSON envelope.
CMD=$(printf '%s' "$STDIN_JSON" | node -e '
  let s = ""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => {
    try {
      const j = JSON.parse(s);
      const c = j?.tool_input?.command || j?.command || "";
      process.stdout.write(c);
    } catch {}
  });
' 2>/dev/null || true)

if [ -z "$CMD" ]; then
  exit 0
fi

# Patterns we want a hard pause on. Production deploys, secret writes, destructive ops.
DEPLOY_RE='wrangler (pages )?deploy|wrangler secret (put|delete)|wrangler d1 execute.*--remote.*(DROP|DELETE|TRUNCATE|ALTER)'

if printf '%s' "$CMD" | grep -E -q "$DEPLOY_RE"; then
  # Emit Claude Code hook JSON to block with a message.
  cat <<JSON
{
  "decision": "block",
  "reason": "DEPLOY GATE: '$CMD' is a production-impacting command. Re-confirm with the user, then bypass this gate by running it via the /bn-deploy command (which handles the confirmation flow). If you intend to proceed, ask the user to type the exact command back to you, then run."
}
JSON
  exit 2
fi

exit 0
