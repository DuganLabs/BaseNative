---
name: dl-wcag-audit
description: Use this when the user wants an accessibility check on a running view — "audit the home page", "is this WCAG AA?", "check a11y on /pricing". Drives the Claude Preview MCP (or Chrome MCP if Preview isn't available) to load the URL, runs an axe-core injection, captures violations grouped by impact, screenshots the offending nodes, and produces a remediation list ordered by impact × ease. Expect: a markdown report with one row per violation (rule, impact, node, fix snippet).
---

# DuganLabs WCAG Audit

You produce a real, actionable a11y audit. Not a checklist — actual violations with the offending DOM and the fix.

## When to invoke

- "Run a11y on this view"
- "Is /foo WCAG AA?"
- "Audit accessibility before launch"

## Pre-flight

1. Confirm the **URL** to audit. If a dev server isn't running, start it (`pnpm dev` or per the project's CONTRIBUTING.md).
2. Confirm the **target level** — default WCAG 2.2 AA.
3. Confirm the **viewport** — desktop (1280x800) and mobile (390x844). Run both unless told otherwise.

## Workflow

1. **Load the page**. Use `mcp__Claude_Preview__preview_start` if available, else `mcp__Claude_in_Chrome__navigate`.
2. **Inject axe-core** via `preview_eval` / `javascript_tool`:
   ```js
   await import('https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js');
   const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa'] });
   return { violations: r.violations, passes: r.passes.length };
   ```
3. **Screenshot violations**: for each violation node, `preview_screenshot` with the bounding rect.
4. **Manual checks axe can't catch** — do these explicitly:
   - Tab order: tab through, note where focus goes invisible.
   - Skip link: present and works?
   - Heading order: h1 → h2 → h3, no skips.
   - Form labels: every input has an accessible name (label, aria-label, or aria-labelledby).
   - Live region announcements: any toast / inline error that should be `role="status"` or `role="alert"`?
   - Reduced-motion: does `prefers-reduced-motion` actually kill the animation?

## Output

Write to `docs/a11y-audit-<YYYY-MM-DD>.md`:

```markdown
# A11y Audit: <URL>
Date: YYYY-MM-DD · WCAG 2.2 AA · Viewports: desktop, mobile

## Summary
- Critical: N
- Serious: N
- Moderate: N
- Manual findings: N

## Violations

### 1. [critical] color-contrast — `.btn-secondary`
Selector: `button.btn-secondary:not(:hover)`
Contrast: 3.1:1 (needs 4.5:1)
Fix:
  Bump `--color-secondary-fg` from #6b7280 to #4b5563.

### 2. [serious] label — `input#email`
...

## Manual Findings
- Tab order skips the search box on mobile menu.
- Toast announcements not in a live region.

## Passes
<count and a few notable ones>
```

## Rules

- **Don't claim "AA compliant"** unless you ran both automated + the manual checks above.
- **Cite the selector and the fix.** A violation without a fix is a complaint.
- **Order by impact × ease.** Critical-and-easy first.
- **Re-run after fixes.** Don't sign off on a list — sign off on a green run.

Built with BaseNative — basenative.dev
