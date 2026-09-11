# PROVENANCE — ds-extract

## Upstream

| | |
|---|---|
| Repository | `github.com/pbakaus/impeccable` |
| Commit | `cb56ed6c19a07329a9fa0cd4e657bee040156593` ("Fix: detect placeholder contrast (#790) (#799)", 2026-09-10) |
| File taken | `skill/reference/extract.md` (69 lines, the "Extract Flow") |
| Upstream licence | MIT |
| Vendored | 2026-09-11 |

**Identification note — read this.** The brief named the source as
`design-system-extractor`, with no organisation. No repository by that name exists.
The pack was identified by searching GitHub for the brief's own quoted rule, *"extract
what is clearly reusable now, not everything that might someday be"*, which is a
verbatim line from `pbakaus/impeccable`'s `skill/reference/extract.md`. Two other
candidates were checked and rejected:

- `awei1122dev/Web-Design-System-Extractor-Claude-Skill` — extracts a design system
  from a *website's* HTML/CSS into a `design-system.md`. Not codebase extraction.
- `freema/mcp-design-system-extractor` — an MCP server that reads a **Storybook**.
  There is no Storybook in this repo.

If `impeccable` is the wrong lineage, this file and the skill's Step 1 are the two
places to correct.

**This is a fork, not an install.** Committed here and maintained here; a marketplace
update must never overwrite it. `.gitignore` ignores `.claude/skills/*` and explicitly
un-ignores `.claude/skills/ds-extract/`.

## What we kept

- **The incremental rule, which is the reason this pack was chosen.** Quoted almost
  verbatim in Step 4: *"Design systems grow incrementally. Extract what is clearly
  reusable now, not everything that might someday be reusable."*
- **"Only extract things used 3+ times with the same intent. Premature abstraction is
  worse than duplication."**
- **Step 5 "Migrate"** — find all instances, replace systematically, test, **delete
  dead code**. Upstream lists deletion as a bullet; here it is promoted to the skill's
  pass/fail gate (see below).
- Several of upstream's **NEVER** clauses: do not extract one-off implementations, do
  not create components so generic they are useless, do not extract things that differ
  in intent, do not create a token for every value.
- The **2-instances-at-10+-lines** threshold, which comes from the second upstream
  (`josschavez/creating-shared-components-plugin`, commit `a6f5bde1`), whose decision
  table is more granular than impeccable's flat "3+".

## What we cut, and why

| Cut | Why |
|---|---|
| Step 1 "Discover the Design System" (locate the component library, infer its structure) | The design system is `packages/components`; it is known. The step's discovery-by-search is replaced wholesale — see below. |
| Step 6 "Document" → *"Update any Storybook or component catalog"* | **There is no Storybook in this repo** — verified by grep across all file types; zero hits, and no `.storybook/` or `*.stories.*` anywhere. |
| *"Skip proper TypeScript types or prop documentation"* as a NEVER | There is no TypeScript source. Types are hand-maintained `.d.ts` under `packages/<pkg>/types/`. Rewritten to point at `packages/components/types/index.d.ts` via the CONTRIBUTING checklist. |
| Accessibility bullets ("ARIA, keyboard navigation, focus management") | Not cut in spirit, but not restated: the repo already routes this through `docs/accessibility.md`, which the CONTRIBUTING checklist requires. Duplicating it here would let the two drift. |
| `{{ask_instruction}}` template placeholder | An artefact of impeccable's build step; meaningless outside it. |
| Upstream's animation/type-style/easing extraction targets | Scoped out. The actionable surface here is components, `data-bn` contracts and `--bn-*` tokens. |

## What we rewrote, and why

1. **Discovery: search replaced by the Phase 0 scanner.** Upstream discovers by
   looking ("Find the design system…", "Find all instances: Search for the patterns you
   extracted"). This fork runs
   `cd packages/validate && node ../../scripts/component-usage.js` and reads
   `.agents/component-usage.json`, and is explicitly forbidden from grepping for markup
   patterns or writing a regex approximation of the template parser.

   Reason: a search-based sweep cannot see the two usage shapes that matter here —
   `data-bn` markup typed into a template string, and custom-element tags. Those are
   exactly why the scanner was built. The record shape and the five `kind` values are
   documented in the skill so its output can be consumed without re-deriving it.

   *Wording note:* the brief calls upstream's mechanism "LSP discovery". Upstream never
   says LSP — its discovery is search/grep based. The substitution the brief asked for
   is the one that was made; only the label differs.

2. **Gate 1 tiering added — this is the largest addition.** Upstream counts instances
   flatly. Here every record must be tiered `test` / `demo` / `build-artifact` /
   `prod-internal` / `prod-consumer` before anything is counted, and
   `usageCounts.total` may never be reported. Reason: in the last full run 728 records
   tiered to 41 real ones (5.6%), and the raw total is the single most misleading number
   in the data. The scanner emits only `isTest`, so the skill carries the other four
   tier definitions itself.

3. **Gate 2 added.** Upstream has no evidence standard for "these are duplicates".
   Added the contract test (shared `data-bn`, identical export name, or >=55% option-key
   overlap) because shared tag names and a shared `options` parameter generated 356 of
   357 candidate pairs in the audit.

4. **Migration promoted from a step to the success gate.** Upstream's Step 5 is a list
   of activities. Here it is a six-item checklist, and the skill is required to report
   the work **INCOMPLETE** — naming the remaining call sites by file and line — until
   every box is ticked. Reason: this was the owner's explicit requirement, and an
   extraction that leaves the inline copies in place has made the problem worse.

5. **Creation corrected against repo reality.** The brief states new components are
   created via `nx g`. **They cannot be: there is no Nx generator in this workspace** —
   no `generators.json`, no `executors.json`, no `tools/`, no `@nx/*` plugin
   dependency, and no `plugins` array in `nx.json`. Nx is a task runner and cache here.
   The skill therefore keeps the constraint's intent — it never hand-scaffolds, never
   improvises a layout, never edits `nx.json` or `package.json` — states the `nx g`
   finding in full, and hands back to a human against the real convention,
   `CONTRIBUTING.md` § "Adding a New Component".

6. **BaseNative authoring rules added**, with `packages/components/src/badge.js` quoted
   as the reference shape: escape through `escapeAttr`/`escapeText` from
   `@basenative/runtime/shared/escape` (**not** `escapeHtml`, which is a different local
   module in `packages/builder`), every `data-bn` contract needs a CSS rule, every axis
   value including the default needs a selector, shared internals go in
   `packages/components/src/internal/`. Each of these encodes a defect the audit
   actually found.

7. **Exclusion reporting kept but simplified** to a three-column table, tracked while
   working rather than reconstructed at the end. Upstream's optional second HTML report
   was dropped with the Tailwind report.

8. **"Never delete for zero production usage" added.** Upstream has no equivalent.
   Added because 40 of 61 components have no production usage and the scanner
   structurally cannot see same-file use, `.html` files, or dynamic contract names.

9. **Non-chaining and no-fixture-generation added** — neither exists upstream. Required
   by the brief.
