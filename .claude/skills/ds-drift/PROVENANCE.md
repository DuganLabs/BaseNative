# PROVENANCE — ds-drift

## Upstream

| | |
|---|---|
| Repository | `github.com/murphytrueman/design-system-ops` |
| Commit | `2f3963ffcf20fbfaffc3ac7542ed722fff3bd669` ("Anonymise the health and stakeholder-brief sample outputs", 2026-08-22) |
| Files taken | `skills/drift-detection/SKILL.md` (291 lines), `skills/naming-audit/SKILL.md` (200), `skills/component-api-validator/SKILL.md` (231), `skills/deprecation-process/SKILL.md` (273), `skills/codemod-generator/SKILL.md` (441) |
| Upstream licence | MIT |
| Vendored | 2026-09-11 |

Upstream ships **41 skills**; five were taken, per the brief. The other 36 — including
`figma-variable-audit`, `design-to-code-check`, `theme-audit`, `adoption-report`,
`visual-report`, `system-health`, `context-engine-builder` and the agent-orchestration
files — were not vendored.

**This is a fork, not an install.** Committed here and maintained here; a marketplace
update must never overwrite it. `.gitignore` ignores `.claude/skills/*` and explicitly
un-ignores `.claude/skills/ds-drift/`.

## Structure change

Upstream is five independent top-level skills. This fork is **one skill with five
references**: `SKILL.md` carries the shared evidence discipline and routes to
`references/{drift-detection,naming-audit,component-api-validator,deprecation-process,codemod-generator}.md`.

Reason: the four gates, the tiering and the rating axes are identical across all five
checks, and five copies of them would drift apart. It also keeps the always-loaded
surface to one file, with the detail loaded on demand.

## What we kept

- **The confidence-tiering on findings — the part the brief called out as worth
  having.** Upstream expresses it as Classification A–E (intentional divergence /
  version lag / accidental drift / misunderstanding / system gap) plus severity
  weighting by component criticality. Both are preserved in `SKILL.md`, including the
  rule that a team whose divergence filled a genuine system gap did not do something
  wrong.
- **Severity weighting by blast radius** — critical-path components elevate one level.
- **The recommendation-path routing table** (classification determines response).
- **Root cause patterns** as a required report section, on upstream's reasoning that a
  cause is more actionable than a list of instances.
- **The closing note about intentional deviations**, required in every report.
- **Naming audit:** the tier-consistency and cross-tier-collision checks; the
  "semantic names must encode intent, not appearance" rule; the rename-sequencing
  guidance (renames are breaking changes); "give every violation a specific rename with
  a rationale, not a flag"; the convention-inventory-before-findings structure.
- **API validator:** the cross-library consistency frame (3a prop-naming, 3b boolean
  patterns, 3c defaults) and breaking-change detection.
- **Deprecation:** audit-usage-before-planning; the blast-radius section; the
  "deprecate, migrate, then remove" sequencing; rollback contingency; exceptions.
- **Codemod:** the dry-run requirement; "leave the original untouched, never guess" for
  untransformable patterns; report-don't-skip; the untransformable-pattern taxonomy
  (dynamic values, computed access); preserve source formatting.

## What we cut, and why

| Cut | Why |
|---|---|
| **Everything Figma** — the Figma MCP auto-pull, `figma_capture_screenshot`, `figma_get_component_for_development`, `figma_rename_variable`, `figma_edit_component_property`, the whole two-sided-migration step, "Step 6: Visual drift comparison", and Figma as a reference source | **No Figma anywhere in this repo** — `grep -ril figma` across the tree returns zero. The brief said drop it; it was also unusable. |
| **Everything Storybook** — Storybook as a comparison source in drift-detection Step 1, and `docs-coverage`-style catalog checks | **Checked first, as instructed: there is no Storybook.** No `.storybook/`, no `*.stories.*`, and zero matches for "storybook" in any `.json`, `.js`, `.ts`, `.md`, `.yml` or `.yaml` file in the repo. |
| **Chromatic integration** — visual-diff acceptance rates as a drift signal | No Chromatic, and no visual-regression service of any kind. |
| `.ds-ops-config.yml` configuration block, present in three of the five | No such file and no plan for one. Configuration by a file that does not exist is dead instruction text. |
| The `recurring` workflow (load previous report, compute drift velocity, prune by `retain_count`) | Depends on `.ds-ops-config.yml` and an output directory convention that does not exist here. |
| SCSS, Tailwind and CSS-in-JS token detection — `$variable` literals, `h-[12px]` arbitrary values, theme-object references, "infer tier from `$color-blue-500` naming" | BaseNative is **CSS custom properties only**. There is no SCSS, no Tailwind, no CSS-in-JS. |
| React/Vue/Svelte/Angular API extraction — TypeScript interfaces, PropTypes, `defineProps`, exported `let`, observed attributes, ref forwarding, render props, scoped slots, children-vs-render-props composition | None of it exists here. Components are `render*` functions returning HTML strings. Replaced with the option-key / style-axis / markup-contract model. |
| API validator 3d "Type coverage" as a percentage-of-props-typed metric | No TypeScript source. Replaced with a check that the hand-maintained `packages/components/types/index.d.ts` has not drifted, which `types/exports.test.js` already asserts. |
| API validator 3e "Event handler patterns" (`onChange` vs `onValueChange`, controlled/uncontrolled) | Components emit strings and take no callbacks. Events are `@event` attributes bound at hydrate, a runtime concern, not a component API one. |
| Codemod: jscodeshift transforms, Style Dictionary transforms, `npx tsc --noEmit` | No JSX, no TypeScript, no Style Dictionary. Replaced with the five transform types that actually occur here. |
| **Codemod: "Every codemod has a corresponding test file with ≥8 test cases" and the whole "Step 2: Generate test cases" section** | **Directly prohibited.** Eval corpus, fixtures and assertions are hand-authored by the owner, at any model tier. The fork instead names the cases that need covering and stops. |
| Cross-references to the 36 non-vendored upstream skills (`decision-record`, `contribution-workflow`, `change-communication`, `design-to-code-check`, `cicd-integration`, `session-memory`) | Not vendored; a reference to a skill that does not exist is worse than no reference. Replaced with references between the five files that are here. |
| Emoji severity keys (🔴🟠🟡⚪) | Repo house style uses none — `.claude/agents/*` and `.claude/commands/*` are emoji-free. Replaced with `Critical` / `High` / `Medium` / `Low`. |
| "Small-system note (fewer than 5 components)" | 61 components. Inapplicable. |

## What we rewrote, and why

1. **The four gates added as the skill's spine.** Upstream has no evidence standard at
   all — it classifies and rates findings, but never asks whether a finding is real.
   The gates come from `.agents/design-system-audit.md` § "The filter" and are the
   reason this fork produces different output from upstream on the same repo:

   - **Gate 1 (Tier)** — 728 usage records reduce to 41 real ones. `usageCounts.total`
     may never be reported.
   - **Gate 2 (Contract, not coincidence)** — 357 candidate pairs reduce to 1.
   - **Gate 3 (Primitive, not the token itself)** — 125 of 165 "hardcoded values" were
     comment prose or CSS fragments; two were token definitions reported as violations
     of themselves. Comments must be stripped first.
   - **Gate 4 (Reachability)** — four named scanner blind spots that bound every "dead"
     verdict.

2. **Confidence given its own axis, using the repo's existing vocabulary.** Upstream
   rates severity but never confidence. This fork adds `high` / `medium` / `low`,
   deliberately reusing `CONFIDENCE.HIGH/MEDIUM/LOW` from
   `packages/validate/src/codes.js`, where it already sits alongside `severity` in the
   diagnostic taxonomy — rather than inventing a second scale. Confidence is derived
   from which scanner blind spot a claim rests on, not asserted.

3. **"Inferred rather than read" made a required report section.** New. Every claim not
   verified against source must be listed. If the section is empty, the work was not
   done.

4. **"Suppressed, never deleted."** New. Every report states how many rows each gate
   suppressed and why, with the raw rows left in `.agents/*.json` so any suppression can
   be checked.

5. **Detection rewritten per dimension** against the real stack: token drift against
   `--bn-*` in 11 stylesheets with the `var(--bn-x, #hex)` fallback trap and the
   ambiguous-vs-unambiguous split; contract drift against `data-bn` values with no CSS
   rule, parsing selectors compound-by-compound so `:is(…)` groups and `_`-containing
   values are not silently dropped; API drift as hand-rolled `data-bn` markup; and a
   fourth dimension, **template drift**, which upstream does not have.

6. **Template drift added**, delegating to tooling that already exists —
   `packages/mcp/src/directives.js` (`DIRECTIVES`, `FORBIDDEN`),
   `packages/validate/src/foreign.js` (`FOREIGN_ATTRIBUTES` with concrete rewrites) and
   `packages/validate/src/scan.js` (the real tokenizer). The highest-value check is
   control flow on a non-`<template>` element, which silently registers an event
   listener (`BN_E_CONTROL_FLOW_ON_ELEMENT`). The known live instance in
   `examples/starter/src/pages/*.html` is named so it is not rediscovered every run.

7. **"Never regex the template language"** stated in all five files. If markup must be
   tokenized, import from `@basenative/validate/scan`.

8. **Two priors carried from the audit** so the fork does not re-derive them wrongly:
   the library has an adoption problem, not a variant-sprawl problem (12 of 19 axes have
   zero production usage because their components do); and 8 of 13 production axis
   arguments are dynamic, so any "used N ways" figure from literals alone is wrong.

9. **CI section rewritten to the real convention** — a `--check` flag implemented inside
   the generator, as `bundle-size` / `package-inventory` / `llms-txt` do in
   `.github/workflows/ci.yml`, not a `git diff --exit-code`. It also records that
   `.agents/*` has no staleness gate today.

10. **Non-chaining added.** Upstream skills route into each other freely
    (`drift-detection` → `decision-record` → `contribution-workflow`). Here the three
    skills must not chain, and ds-drift must not run mid-task.
