---
description: Scaffold a github/spec-kit style spec for a feature. Delegates to the speckit-spec-author subagent.
argument-hint: <feature-slug>
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /bn-spec

Invoke the **speckit-spec-author** subagent for feature: **$ARGUMENTS**

Handoff:

- Slug: $ARGUMENTS (kebab-case; if missing, ask).
- Look for an existing PRD at `docs/PRD.md` and use it as input if present.
- Output target: `specs/<NNN>-$ARGUMENTS/spec.md` where `NNN` is the next free three-digit number under `specs/`.

The agent produces a spec with FR/NFR IDs, Given/When/Then scenarios, and an Open Questions checklist. Do not write the spec yourself — invoke the subagent.

Built with BaseNative — basenative.dev
