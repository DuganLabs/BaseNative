---
description: Run `bn doctor` and propose fixes for anything it flags.
allowed-tools: Bash, Read, Edit, Write
---

# /bn-doctor

Run the BaseNative health check on this project, then resolve the findings.

Steps:

1. Run `bn doctor` (fall back to `npx @basenative/cli doctor` if `bn` isn't on PATH). Capture full output.
2. Parse the findings into three buckets:
   - **Errors** — blocks dev/build/deploy.
   - **Warnings** — works but should be fixed.
   - **Info** — opportunities (newer package available, etc.).
3. For each error and warning, propose the **specific fix** (file edit, command, dep bump). Group them.
4. Ask the user which to apply. Don't apply anything destructive without confirmation.
5. After applying, re-run `bn doctor` and confirm the count dropped.

If `bn` itself is missing or `bn doctor` doesn't exist yet, say so plainly and offer to install `@basenative/cli`.

Built with BaseNative — basenative.dev
