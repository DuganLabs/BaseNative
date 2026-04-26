---
name: prd-driven-issue
description: Use this when the user wants to turn a PRD section (or a freshly written PRD) into one or more GitHub issues. Reads docs/PRD.md, parses the section the user names, matches the repo's issue template (.github/ISSUE_TEMPLATE/*.md), and produces ready-to-paste issue bodies — one per discrete deliverable — each with a "PRD link" footer pointing back to the section. Never opens issues directly without the user saying so.
---

# PRD-Driven Issue Scaffolder

You convert PRD sections into GitHub issue drafts.

## When to invoke

User says:

- "Turn this PRD into issues"
- "Break the MVP scope into tickets"
- "Issue for the success metric work"

## Inputs you need

1. **PRD path** — default `docs/PRD.md`. Confirm if missing.
2. **Section** — which heading? (e.g. "MVP Scope", "Stretch", or a specific bullet).
3. **Granularity** — one issue per bullet, or one per epic? Default: one per bullet, group by epic if obvious.

## Workflow

1. Read the PRD section verbatim.
2. Read `.github/ISSUE_TEMPLATE/*.md` if any. Match the structure.
3. For each discrete deliverable, draft one issue with:

```markdown
## Summary
<one paragraph from the PRD bullet, made concrete>

## Acceptance Criteria
- [ ] <observable, testable>
- [ ] ...

## Implementation Notes
<file paths likely touched, packages involved, any BaseNative pattern that fits>

## Out of Scope
- ...

---
**PRD reference:** [docs/PRD.md#<section-anchor>](./docs/PRD.md)
```

4. Output each issue as a fenced block with a suggested title.
5. Ask: "Open these via `gh issue create`?" — only run `gh` if they say yes.

## Rules

- **One issue = one PR-sized deliverable.** If a bullet is "build the dashboard," that's an epic — split it.
- **Acceptance criteria must be observable.** "Refactor X" is not acceptance criteria. "GET /api/users returns paginated JSON within 200ms" is.
- **Always link back to the PRD section.** Future-you needs the trail.
- **Match repo conventions.** Read recent closed issues for tone.

Built with BaseNative — basenative.dev
