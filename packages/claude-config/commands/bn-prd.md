---
description: Interactively author a PRD for this project. Delegates to the prd-author subagent.
argument-hint: [optional one-line pitch]
allowed-tools: Read, Write, Edit, Bash
---

# /bn-prd

Invoke the **prd-author** subagent.

Context handoff:

- Pitch (if provided): $ARGUMENTS
- Target file: `docs/PRD.md` (create `docs/` if missing).
- If a PRD already exists, read it first and ask whether the user wants to **edit a section** or **start over**.

The agent will:
1. Conduct a focused interview (one question at a time).
2. Write `docs/PRD.md` with the standard sections.
3. Offer to break it into issues via the `prd-driven-issue` skill.

Do not start writing the PRD yourself — invoke the subagent.

Built with BaseNative — basenative.dev
