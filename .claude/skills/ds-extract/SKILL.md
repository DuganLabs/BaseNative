---
name: ds-extract
description: "Use this when the user asks by name to retrofit existing UI into shared components — \"extract this into a component\", \"consolidate these duplicates\", \"de-duplicate this markup\", \"retrofit the design system\". Discovers usage with scripts/component-usage.js (never live grep), tiers every record before counting, extracts only what is clearly reusable now, and migrates every production call site. Never fires automatically and never chains from another skill. Expect: an extraction that is reported INCOMPLETE until every old inline copy is deleted."
---

# ds-extract

Retrofit work, invoked **by name** by a human. This skill is a few-times tool, not a
background process — once the obvious duplication is gone it should mostly retire.

You do **not** arrive here from `ds-guard` or `ds-drift`. If you are running mid-task
without having been asked for by name, stop.

## Step 1: Discover from the scanner, never by grep

Regenerate the usage data:

```bash
cd packages/validate && node ../../scripts/component-usage.js
```

(It must run from inside a package directory — `node` is refused at the monorepo root
in this environment.) Output: `.agents/component-usage.json`.

The scanner tokenizes every string and template literal with BaseNative's **real**
tokenizer, `@basenative/validate/scan` (`scanTags`, `scanInterpolations`, `spanAt`) —
the same one the validator and the runtime's renderer use.

- **Do not grep for markup patterns.** A grep sweep cannot see the two usage shapes
  that matter here: `data-bn` markup typed into a template string, and custom-element
  tags. Those are precisely why the scanner exists.
- **Do not write a regex approximation of the template parser.** If you need to
  tokenize markup yourself, import `scanTags` / `scanInterpolations` from
  `@basenative/validate/scan`. Nothing in this repo may re-approximate that parser.

Usage record shape:

```
{ componentId, kind, repo, package, file, line, col, isTest, snippet }
```

`kind` is `import-call` | `data-bn-markup` | `custom-element-tag` for usages, and
`render-function` | `custom-element` for definitions.

## Step 2: Tier every record before you count anything

**Never report `usageCounts.total`.** It is the single most misleading number in the
data. In the last full run, 728 records tiered down to 41 real ones — 5.6%.
`renderCalendar` reports 45 usages; 43 are its own tests, 1 is a demo, 1 is real.

The scanner emits `isTest` only. Derive the rest yourself:

| Tier | How to identify | Evidence of adoption? |
|---|---|---|
| `test` | `isTest: true`, `*.test.js`, `*.spec.ts`, `packages/*/test/`, `tests/` | No |
| `demo` | `examples/**` | No |
| `build-artifact` | `examples/express/public/basenative.js`, `examples/express/public/builder.js`, any consumer `dist/` or `dist-worker/` | No |
| `prod-internal` | BaseNative package source not matching the above | **Yes** |
| `prod-consumer` | consumer-repo application source | **Yes** |

Report tiered counts, always. A component with "22 usages" that is 19 tests and 2
demos has one real call site, and the extraction case must be argued on that one.

## Step 3: Require a contract, not a coincidence

Two pieces of markup are only duplicates if a BaseNative contract says so:

- a shared `data-bn` name, **or**
- an identical exported name, **or**
- at least 55% overlap of destructured option keys.

A shared HTML tag name is **not** evidence, and neither is "both take a parameter
called `options`" — every render function in the library takes `options`, and `div`,
`span` and `button` appear in nearly all of them. Those two signals alone produced 356
of the 357 candidate pairs in the last audit, and exactly one pair survived.

Note that option-key overlap is unavailable for the render functions that take
positional parameters (`renderAdminQueueList`, `renderAdminUserList`, `renderInspector`,
`renderTreeView`, `renderNodeToElement`, `renderPaletteHTML`); judge those by contract
and body, not by key overlap.

## Step 4: Extract only what is clearly reusable now

> Design systems grow incrementally. Extract what is clearly reusable **now**, not
> everything that might someday be reusable.

Count **production** instances only (Step 2):

| Production instances | Action |
|---|---|
| 3+ with the same intent | Extract |
| 2, each 10+ lines | Extract — the complexity justifies it |
| 2, simple | Leave inline |
| 1 | Never extract |

Do not extract two things that merely look alike but differ in intent. Do not add an
option "for the future" — add it when a real instance demands it. High option-key
similarity often means the library is *already* well factored: the audit's biggest
apparent cluster (input / textarea / select / combobox / multiselect) is not
duplication, because the shared part is already in
`packages/components/src/internal/field.js`.

## Step 5: Creation is not yours to improvise

**This skill does not scaffold.** It identifies what should be extracted and migrates
call sites once the component exists. It never invents a directory layout, and it
**never edits `nx.json` or `package.json`** — Nx owns generation.

Read this carefully, because the mechanism is not what it looks like:

> **There is no Nx generator in this workspace.** `nx.json` has no `plugins` array,
> the repo has no `generators.json`, no `executors.json`, no `tools/` directory and no
> `@nx/*` plugin dependencies. Nx is used here purely as a task runner and cache
> (`run-many`, `affected`, `serve`, `bundle`). `nx g` will not scaffold a BaseNative
> component today.

So when an extraction is justified, **stop and hand back to a human** with the
proposed component name, its options and its `data-bn` contract. Do not hand-scaffold
it yourself. The actual convention is the checklist in `CONTRIBUTING.md`
§ "Adding a New Component", which a human follows:

1. `packages/components/src/<name>.js` with a `render<Name>()` function
2. Export it from `packages/components/src/index.js`
3. Add CSS to `packages/components/src/components.css` (new rules go at the **end** of
   the file — the file header says so)
4. Add tests in `packages/components/src/components.test.js`
5. Add the type declaration in `packages/components/types/index.d.ts`
6. Add an accessibility entry in `docs/accessibility.md`
7. Add API documentation in `docs/api/components.md`

Match the conventions the library already uses. `packages/components/src/badge.js` is
the reference shape:

```js
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

export function renderBadge(content = '', options = {}) {
  const variant = options.variant || 'default';
  const attrs = options.attrs || '';
  const slot = options.text != null ? escapeText(options.text) : content;
  return `<span data-bn="badge" data-variant="${escapeAttr(variant)}"${attrsSuffix(attrs)}>${slot}</span>`;
}
```

Non-negotiable when you write a new renderer:

- **Route every interpolation through `escapeAttr` / `escapeText`** from
  `@basenative/runtime/shared/escape`. This is not boilerplate: `@basenative/date`
  performs no escaping at all in its three render functions, and that is the most
  serious defect the audit found.
- **Every `data-bn` contract you emit needs a CSS rule.** 31 of the library's 180
  contracts have none, and a contract with no rule renders unstyled and silently.
- **Every style axis value needs a selector**, including the default. Callers invent
  names for an unnamed default (`md`, `top`, `default`) and every invented name lands
  unstyled.
- Shared internals go in `packages/components/src/internal/` alongside `field.js`,
  `items.js`, `tree.js`, `attrs.js`, `drag.js`.

## Step 6: Migration is mandatory — this is the success gate

**An extraction that leaves the old inline copies in place has made the problem
worse.** There are now N+1 implementations instead of N, and the scanner will report
the new one as adopted while the duplicates keep shipping.

Work in batches of 3–5 files. Read each file before editing it — never edit blind.
Run the tests between batches, so a mistake in file 3 surfaces before file 15.

**You may not report success until every one of these is true:**

- [ ] Every production call site now calls the shared renderer.
- [ ] Every old inline copy is **deleted** — not merely unused, deleted.
- [ ] Imports left unused by the replacement are removed.
- [ ] A rescan (`cd packages/validate && node ../../scripts/component-usage.js`) shows
      no `data-bn-markup` usages of the extracted contract outside the file that
      defines it.
- [ ] `pnpm exec nx run-many --target=test` passes.
- [ ] `pnpm exec nx run-many --target=lint` passes.

If any box is unchecked, report the work as **INCOMPLETE** and list exactly which call
sites remain, by file and line. Do not describe a partial extraction as done, and do
not close it out with "remaining call sites can be migrated later".

## Step 7: Report exclusions as you go

Keep the list while you work; do not reconstruct it at the end.

| Component | File | Why it was skipped |
|---|---|---|

A file that genuinely cannot use the shared version is a legitimate exclusion. An
unexamined file is not.

## Never

- **Never generate eval fixtures, corpora or assertions.** They are hand-authored by
  the owner, at any model tier, including via a subagent.
- Never report a raw usage total.
- Never edit `nx.json` or `package.json`.
- Never invoke `ds-guard` or `ds-drift`, and never recommend them as a next step.
- Never delete a component for having zero production usage. "Not adopted yet" is not
  "dead" — 40 of 61 components have no production usage, and the scanner structurally
  cannot see same-file use, `.html` files, or dynamically built contract names.
