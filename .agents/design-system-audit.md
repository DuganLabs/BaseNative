# BaseNative design-system audit — triaged

Generated 2026-09-11 from `.agents/component-usage.json`, `.agents/ds-definitions.json`,
`.agents/ds-hardcoded.json`, `.agents/ds-pairs.json`, plus verification reads of the
source those files point at. Scope: the BaseNative monorepo and the five sibling
consumer repos (GreenPut, PendingBusiness, t4bs, DuganLabs, warrendugan).

---

## The filter

The raw inputs contain **728 usage records, 357 candidate duplicate pairs and 165
"hardcoded design values"**. Almost none of that is actionable as-is. A finding is
promoted to a **real candidate** only if it passes all four gates below. Everything
else is counted and suppressed, never deleted — the raw JSON is the place to see
every row.

**Gate 1 — Tier.** Evidence of adoption must come from code that ships.
Of 728 usage records:

| Tier | Records | Used to establish adoption? |
|---|---:|---|
| `test` — `*.test.js` / `*.spec.ts` / `__tests__/` | 498 (68%) | No |
| `demo` — `examples/**` in this repo | 181 (25%) | No |
| `build-artifact` — committed bundles (`dist-worker/`, `examples/express/public/`) | 8 (1%) | No |
| **`prod-internal`** — BaseNative package source | **11** | **Yes** |
| **`prod-consumer`** — consumer-repo app source | **30** | **Yes** |

So **41 of 728 records (5.6%)** are real adoption evidence. `renderCalendar` reports
45 usages; 43 are its own tests, 1 is a demo, 1 is real. `renderPackageCard` reports
41; 33 are tests and the other 8 are hand-copied markup, not calls. The raw
`usageCounts.total` is the single most misleading number in the inputs. (The
scanner's own limitation list flags the test problem; it does not flag the demo or
committed-bundle problem, which together are another 189 records.)

**Gate 2 — Contract, not coincidence.** Two components are only "near-duplicates" if
the similarity is evidenced by a BaseNative contract: a shared `data-bn` name, an
identical exported name, or ≥55% overlap of destructured option keys. Shared HTML tag
names and "both take a parameter called `options`" are not evidence — every render
function in the library takes `options`, and `div`/`span`/`button` are in almost all of
them. Those two signals alone generate **356 of the 357** pairs in `ds-pairs.json`.

**Gate 3 — Primitive, and not the token itself.** A "hardcoded design value" must be a
single normalised primitive (a hex colour, or a number carrying `px`/`rem`/`em`),
appearing in a real CSS declaration after comments are stripped, and must not be the
`--bn-*` custom-property declaration that defines the token it would be replaced by.

**Gate 4 — Reachability.** "Dead" is only asserted after checking the shapes the
scanner structurally cannot see. It requires an `import { X }` statement in the same
file before it will count a call, it walks only `.js/.mjs/.cjs/.ts/.jsx/.tsx`, and it
attributes a custom element to whichever file last called `customElements.define`.
Anything reachable through one of those shapes is downgraded, not asserted dead.

### Suppressed counts

| Input | Rows in | Suppressed | Reported | Why suppressed |
|---|---:|---:|---:|---|
| `component-usage.json` usage records | 728 | 687 | 41 | Gate 1 — test / demo / committed-bundle tiers |
| `ds-pairs.json` candidate pairs | 357 | 356 | 1 direct + 4 re-derived | Gate 2 — shared tag name and shared `options` param are not evidence |
| `ds-hardcoded.json` values | 165 | 127 | (recounted — see §3) | Gate 3 — 125 of them are comment prose or partial CSS rules, not values |
| Components with zero *production* usage | 41 | 38 | 3 examined + 4 corrected | Gate 4 — "not adopted yet" ≠ "dead" |

Everything suppressed is still in the four JSON files under `.agents/`.

### Where I had to go past the inputs

Three of the four inputs turned out to be unreliable in ways that change the answer,
so the following were **re-derived from source rather than taken from the JSON**:

- **Hardcoded value counts** — `ds-hardcoded.json` does not strip CSS comments and
  undercounts badly. It reports `1px` 4 times in 4 files; there are **32** in 5 files.
  It reports `#ffffff` in `packages/components/src/theme.css`, where the actual text is
  `rgb(255 255 255 / 0.02)` inside a token *definition*, and `#2e5bff` in
  `packages/combobox/src/styles.css`, where the three occurrences are a contrast-ratio
  note in a comment, the `--cb-border-focus` token definition, and an `rgba()` — none
  of them a violation. §3 is a fresh count.
- **Per-component variants and props** — `ds-definitions.json` aggregates
  `dataAttributes` **per file, not per function**, so `renderProgress` and
  `renderSpinner` (both in `progress.js`) each inherit the other's contracts, and its
  `variants` field is populated for exactly 1 of 61 components. §1 and §4 read each
  function's own body, and take the variant vocabulary from the stylesheets by parsing
  selectors compound-by-compound — an adjacency-only match on
  `[data-bn=…][data-axis=…]` silently drops every value inside an `:is(…)` group and
  every value containing an underscore, which between them hide 23 of the 23 declared
  `pipeline-block` statuses and `calendar-event`'s `in_progress`.
- **Custom-element ownership** — all four `bn-builder-*` elements are attributed to
  `builder-element.js` because it re-`define()`s them (guarded) after their own files
  already did. See §5.

`scanTags`/`scanInterpolations` from `packages/validate/src/scan.js` (already exposed
at `@basenative/validate/scan`) were used for all markup tokenizing; no regex
approximation of the template parser was written.


## What to actually do, in order

| # | Finding | Where | Evidence | Effort |
|---|---|---|---|---|
| 1 | `renderBadge` is passed `variant: 'neutral'`, which has no CSS rule — two badges render unstyled in production | `GreenPut/apps/tenant-site/src/scanner.ts:47,48` | §4 | 1 line |
| 2 | `renderCard` escapes a `variant` into `data-variant` that **no stylesheet reads**; a consumer is already passing it | `packages/components/src/card.js` + same file as above | §4 | small |
| 3 | `builder.css` fallbacks reference 12 `--bn-color-*` names, **9 of which are never declared** — the builder ships a dark palette the token system cannot theme | `packages/builder/src/builder.css`, 33 sites | §3b | medium |
| 4 | `@basenative/date` performs **no escaping at all** in its three render functions | `packages/date/src/*.js` | §1 | small |
| 5 | `1px`/`2px` → `--bn-border-width`/`--bn-border-width-thick`: 54 mechanical substitutions in 5 files | `components.css`, `builder.css`, `combobox`, `keyboard`, `reset.css` | §3a | mechanical |
| 6 | `renderCombobox` exists twice, and both claim `data-bn="combobox"` with different rules in two stylesheets | `combobox` + `components` | §2 D1 | medium |
| 7 | `renderDatepicker`/`renderTimepicker`/`renderDateRange` are one function three times (~18–22 lines removable) | `packages/date/src/` | §2 D2 | small |
| 8 | 31 of 180 `data-bn` contracts have no CSS rule; `date`, `marketplace` and `admin` ship no stylesheet at all | across 5 packages | §1 | design call |
| 9 | `DuganLabs` hand-rolls `renderPackageCard`'s markup in two files rather than calling it | `DuganLabs/worker/index.js`, `pages/js/ecosystem.js` | §1 | small |
| 10 | `builder-element.js:114–117` re-`define()`s four custom elements their own files already registered — and that misattribution is why they read as unused | `packages/builder/src/builder-element.js` | §5 | 4 lines |

Two things this audit says **not** to do: don't merge `renderCheckbox`/`renderToggle`
(§2 D4 — saves 6 lines, costs a branch), and don't factor the
input/textarea/select/combobox/multiselect cluster (§2 D5 — the shared part is already
in `internal/field.js`; the residue is per-control markup that must differ).

---

## 1. Every component

61 components: 55 `render*` functions returning HTML strings, 6 custom elements.
"Style axes with CSS rules" is the set of values that actually have a selector
(`[data-bn="x"][data-<axis>="v"]`, including inside `:is(…)` groups), resolved from
each function's **own** `data-bn` contracts — not the file-level aggregate in
`ds-definitions.json`, which gives `renderProgress` and `renderSpinner` each other's
contracts because they share `progress.js`. CSS declares only non-default values, so
each axis carries one more, unnamed, implicit default (`+d`).

Sorted by production usage, then total. Blank cell = zero.

| Component | Package | Style axes with CSS rules (`+d` = implicit default) | Props / options | BN prod | Cons. prod | Demo | Test | Bundle | Total |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| `renderPackageCard` | `marketplace` | — | 9 opts: `author`, `category`, `description`, `downloads`, `name` …+4 |  | 8 |  | 33 |  | 41 |
| `renderBadge` | `components` | `variant` (5+d): default, error, primary, success, warning | 1 opts: `variant` | 1 | 4 | 13 | 6 |  | 24 |
| `renderDialog` | `components` | `size` (2+d): lg, sm | 10 opts: `attrs`, `closable`, `content`, `description`, `footer` …+5 |  | 4 | 2 | 21 |  | 27 |
| `renderButton` | `components` | `size` (2+d): lg, sm<br>`variant` (4+d): destructive, ghost, primary, secondary | 5 opts: `attrs`, `disabled`, `size`, `type`, `variant` |  | 3 | 59 | 6 |  | 68 |
| `renderTable` | `components` | — | 5 opts: `attrs`, `caption`, `columns`, `emptyMessage`, `rows` |  | 2 | 5 | 14 | 1 | 22 |
| `renderTabs` | `components` | `variant` (1+d): pills | 5 opts: `activeTab`, `attrs`, `id`, `tabs`, `variant` |  | 2 | 2 | 12 |  | 16 |
| `renderAdminQueueList` | `admin` | — | positional: `items`, `approveLabel`, `rejectLabel`, `emptyLabel`, `actionHandler` |  | 2 |  | 3 |  | 5 |
| `renderGlyph` | `favicon` | — | positional: `kind`, `spec`, `palette` | 2 |  |  |  |  | 2 |
| `renderCalendar` | `components` | `continues` (3+d): after, before, both<br>`status` (7+d): canceled, cancelled, completed, in_progress, invoiced, paid, scheduled | 9 opts: `attrs`, `emptyMessage`, `events`, `hours`, `id` …+4 |  | 1 | 1 | 43 |  | 45 |
| `renderCard` | `components` | — | 4 opts: `body`, `footer`, `header`, `variant` |  | 1 | 9 | 9 | 3 | 22 |
| `renderPipeline` | `components` | — | 5 opts: `attrs`, `cards`, `columns`, `emptyMessage`, `id` |  | 1 | 1 | 20 |  | 22 |
| `renderInspector` | `builder` | — | positional: `state`, `palette` | 1 |  |  | 8 |  | 9 |
| `renderPipelineBlock` | `components` | `status` (23+d): accepted, active, canceled, cancelled, completed, contacted …+17 | 5 opts: `attrs`, `id`, `status`, `subtitle`, `title` |  | 1 |  | 8 |  | 9 |
| `renderFaviconSvg` | `favicon` | — | 1 opts: `kind` | 1 |  |  | 5 |  | 6 |
| `renderTreeView` | `builder` | — | positional: `state` | 1 |  |  | 5 |  | 6 |
| `renderCanvas` | `visual-builder` | — | positional: `canvas`, `componentMap` | 1 |  |  | 2 |  | 3 |
| `renderNode` | `visual-builder` | — | positional: `node`, `componentMap` | 1 |  |  | 2 |  | 3 |
| `renderMaskableSvg` | `favicon` | — | 1 opts: `kind` | 1 |  |  | 1 |  | 2 |
| `renderAdminUserList` | `admin` | — | positional: `users`, `results`, `query`, `currentHandle`, `roles` |  | 1 |  |  |  | 1 |
| `renderAppleSvg` | `favicon` | — | positional: `spec` | 1 |  |  |  |  | 1 |
| `renderNodeToElement` | `builder` | — | positional: `doc`, `node`, `palette` | 1 |  |  |  |  | 1 |
| `renderInput` | `components` | — | 11 opts: `attrs`, `disabled`, `error`, `helpText`, `id` …+6 |  |  | 11 | 14 |  | 25 |
| `renderAlert` | `components` | `variant` (4+d): error, info, success, warning | 2 opts: `dismissible`, `variant` |  |  | 11 | 9 |  | 20 |
| `renderAvatar` | `components` | `shape` (1+d): square<br>`size` (3+d): lg, sm, xl | 6 opts: `alt`, `attrs`, `name`, `shape`, `size` …+1 |  |  | 9 | 11 |  | 20 |
| `renderDatepicker` | `date` | — | 9 opts: `attrs`, `disabled`, `id`, `label`, `max` …+4 |  |  |  | 18 |  | 18 |
| `renderEmail` | `notify` | — | positional: `template`, `data` |  |  |  | 18 |  | 18 |
| `renderSelect` | `components` | — | 11 opts: `attrs`, `disabled`, `error`, `helpText`, `id` …+6 |  |  | 4 | 12 |  | 16 |
| `renderDataGrid` | `components` | `sorted` (2+d): asc, desc | 13 opts: `attrs`, `caption`, `columns`, `emptyMessage`, `id` …+8 |  |  | 2 | 13 |  | 15 |
| `renderPagination` | `components` | — | 4 opts: `baseUrl`, `currentPage`, `totalPages`, `window` |  |  | 5 | 9 |  | 14 |
| `renderTimepicker` | `date` | — | 10 opts: `attrs`, `disabled`, `id`, `label`, `max` …+5 |  |  |  | 14 |  | 14 |
| `renderCommandPalette` | `components` | — | 5 opts: `attrs`, `commands`, `id`, `open`, `placeholder` |  |  | 2 | 11 |  | 13 |
| `renderTree` | `components` | `level` (3+d): 1, 2, 3 | 5 opts: `attrs`, `expanded`, `id`, `items`, `selected` |  |  | 2 | 11 |  | 13 |
| `renderCheckbox` | `components` | — | 7 opts: `attrs`, `checked`, `disabled`, `id`, `label` …+2 |  |  | 3 | 9 |  | 12 |
| `renderDropdownMenu` | `components` | `position` (2+d): left, right | 5 opts: `attrs`, `id`, `items`, `position`, `trigger` |  |  | 2 | 10 |  | 12 |
| `renderTextarea` | `components` | — | 11 opts: `attrs`, `disabled`, `error`, `helpText`, `id` …+6 |  |  | 3 | 9 |  | 12 |
| `renderBreadcrumb` | `components` | — | 3 opts: `attrs`, `items`, `separator` |  |  | 2 | 9 |  | 11 |
| `renderTooltip` | `components` | `position` (3+d): bottom, left, right | 5 opts: `attrs`, `content`, `id`, `position`, `trigger` |  |  | 2 | 9 |  | 11 |
| `renderVirtualList` | `components` | — | 7 opts: `attrs`, `containerHeight`, `id`, `itemHeight`, `items` …+2 |  |  | 2 | 9 |  | 11 |
| `renderAccordion` | `components` | — | 4 opts: `attrs`, `id`, `items`, `multiple` |  |  | 3 | 7 |  | 10 |
| `renderDateRange` | `date` | — | 11 opts: `attrs`, `disabled`, `id`, `label`, `max` …+6 |  |  |  | 10 |  | 10 |
| `renderDrawer` | `components` | `position` (1+d): left<br>`size` (2+d): lg, sm | 9 opts: `attrs`, `closable`, `content`, `id`, `open` …+4 |  |  | 2 | 8 |  | 10 |
| `renderRadioGroup` | `components` | — | 6 opts: `attrs`, `disabled`, `items`, `label`, `name` …+1 |  |  | 3 | 7 |  | 10 |
| `renderSpinner` | `components` | `size` (2+d): lg, sm | 2 opts: `label`, `size` |  |  | 6 | 4 |  | 10 |
| `renderCombobox` | `combobox` | — | 9 opts: `allowCreate`, `ariaDescribedBy`, `id`, `label`, `name` …+4 |  |  |  | 9 |  | 9 |
| `renderCombobox` | `components` | — | 9 opts: `attrs`, `disabled`, `id`, `items`, `label` …+4 |  |  | 2 | 7 |  | 9 |
| `renderMultiselect` | `components` | — | 8 opts: `attrs`, `disabled`, `id`, `items`, `label` …+3 |  |  | 2 | 7 |  | 9 |
| `renderToggle` | `components` | — | 6 opts: `attrs`, `checked`, `disabled`, `id`, `label` …+1 |  |  | 3 | 6 |  | 9 |
| `renderTreeGrid` | `components` | — | 5 opts: `attrs`, `columns`, `expanded`, `id`, `items` |  |  |  | 9 |  | 9 |
| `renderProgress` | `components` | — | 4 opts: `attrs`, `label`, `max`, `value` |  |  | 3 | 5 |  | 8 |
| `renderSkeleton` | `components` | `variant` (1+d): circle | 4 opts: `count`, `height`, `variant`, `width` |  |  | 2 | 6 |  | 8 |
| `renderWithBoundary` | `runtime` | — | 2 opts: `fallback`, `onError` |  |  |  | 7 |  | 7 |
| `renderKeyboard` | `keyboard` | — | 6 opts: `disabled`, `id`, `label`, `layout`, `primary` …+1 |  |  |  | 6 |  | 6 |
| `renderLayoutGrid` | `components` | — | 6 opts: `cells`, `columns`, `editable`, `gap`, `id` …+1 |  |  | 1 | 5 |  | 6 |
| `renderToastContainer` | `components` | `position` (4+d): bottom-left, bottom-right, top-left, top-right | positional: `position` |  |  | 2 | 2 |  | 4 |
| `bn-builder-canvas` | `builder` | — | — (custom element) |  |  |  |  | 1 | 1 |
| `bn-builder-inspector` | `builder` | — | — (custom element) |  |  |  |  | 1 | 1 |
| `bn-builder-palette` | `builder` | — | — (custom element) |  |  |  |  | 1 | 1 |
| `bn-builder-tree` | `builder` | — | — (custom element) |  |  |  |  | 1 | 1 |
| `bn-builder` | `builder` | — | — (custom element) |  |  |  |  |  | 0 |
| `bn-canvas` | `visual-builder` | — | — (custom element) |  |  |  |  |  | 0 |
| `renderPaletteHTML` | `builder` | — | — |  |  |  |  |  | 0 |

**Read of the table**

- **21 of 61 components have any production usage at all.** The other 40 are
  exercised only by their own tests, the `examples/` apps, or a committed bundle.
- Consumer adoption is concentrated in five components — `renderPackageCard` (8),
  `renderBadge` (4), `renderDialog` (4), `renderButton` (3), then `renderTable`,
  `renderTabs` and `renderAdminQueueList` (2 each). Everything else has 0 or 1
  consumer call site.
- **`renderPackageCard`'s 8 consumer "usages" are not calls.** All eight are
  hand-written `data-bn="pkg-*"` markup in `DuganLabs/worker/index.js` and
  `DuganLabs/pages/js/ecosystem.js`, in files that never import the renderer. That is
  the exact scenario the usage scanner was built to catch, and it is the only
  hand-rolled duplicate outside tests and demos in the whole corpus (66 markup records
  total; 62 of them are in `components.test.js` or `examples/`).
- Three packages ship **zero CSS**: `@basenative/date`, `@basenative/marketplace`,
  `@basenative/admin`. Of the **180 `data-bn` contracts the library emits, 31 have no
  CSS rule anywhere** — 11 in `date`, 10 in `marketplace`, 2 in `admin`, 7 in
  `components` (`alert-content`, `label`, `datagrid-row-select`, `datagrid-select-all`,
  `pagination-ellipsis`, `pipeline-column-title`, `virtual-spacer`), 1 in `combobox`
  (`cb-live`). If DuganLabs had called `renderPackageCard` instead of copying its
  markup, it would have got an unstyled card either way — which is probably *why* they
  copied it.
- **`data-bn="label"` is a contract with no rule.** `renderInput`/`renderTextarea`/
  `renderSelect` go through `internal/field.js`, which emits a bare `<label for>` styled
  by the descendant rule `[data-bn="field"] label`. `renderCombobox`, `renderMultiselect`
  and all three `@basenative/date` renderers instead emit `<label data-bn="label">`,
  which nothing styles. Same visual element, two different contracts, one of them dead.
- `@basenative/admin` diverges from the convention entirely: BEM `class="bn-admin-*"`
  (18 distinct classes) and only 2 `data-bn` contracts, where the rest of the library
  is `data-bn`-first.

**Escaping is not uniform, and `@basenative/date` is the hole.**
`@basenative/components`, `keyboard` and `marketplace` route every interpolation
through `escapeAttr`/`escapeHtml`. `packages/date/src/{datepicker,timepicker,daterange}.js`
contain **no escape call at all** — `name`, `value`, `min`, `max` and `id` go straight
into attributes, and `label` goes straight into element content:

```js
${label ? `<label for="${id}" data-bn="label">${label}</label>` : ''}
<input type="date" id="${id}" name="${name}" value="${value}"${minAttr}${maxAttr}${req}${dis} data-bn="datepicker-input" ${attrs}>
```

Injectable from any of `label`, `value`, `name`, `min`, `max` or `id`. Strictly out of
scope for a design-system audit, but it is the most serious thing I found while
reading these files, so it is here rather than nowhere. Currently unexploited: the
package has zero production call sites in the six scanned repos.

**Attribution caveat.** Contracts are read from each exported function's own body, so
markup emitted by a module-private helper is attributed to no component — e.g.
`pipeline-card` and its 23 styled `data-status` values are emitted by a helper inside
`calendar.js`, so `renderPipeline`'s row shows no axis even though its cards are
status-styled.

---

## 2. Near-duplicates, ranked by code actually removed

`ds-pairs.json` proposes 357 pairs and tiers 52 of them "top". Its three strongest
evidence strings are `Parameter overlap 100%: options` (true of all 55 render
functions), `Tag overlap 100%: div` (true of most of them), and `Shared variants:
button` — which is not a variant at all, it is `type="button"` on a `<button>`.
**Applying Gate 2 leaves exactly 1 of the 357 pairs standing.** I then re-derived
candidates from two signals the pair scanner did not use: option-key Jaccard, and
tag+attribute-set signatures produced by the real tokenizer. That yields 19 pairs at
≥0.55; the 5 worth writing down are below, with the 2 I recommend *not* doing.

Ranking is `lines removed` × `call sites that must change`. Call-site counts are
production-tier only, with test+demo shown separately because they are the migration
cost, not the benefit.

### D1 — `renderCombobox` exists twice, and both claim `data-bn="combobox"` — DO
**Lines:** `packages/combobox/src/combobox.js` 60 · `packages/components/src/combobox.js` 29
**Call sites:** production 0 / 0 · test+demo 9 / 9
**Also:** `packages/combobox/src/styles.css` (242 lines) and
`packages/components/src/components.css` both write rules for `[data-bn="combobox"]`.

This is the only pair that survives Gate 2 unaided: same exported name, same root
contract, two packages. The two are not variants of one component — they are two
different components wearing one name and one selector:

| | `@basenative/combobox` | `@basenative/components` |
|---|---|---|
| Root | `div[data-bn="combobox"]` with `role`, `aria-expanded`, `aria-owns` | `div[data-bn="combobox"]`, no ARIA |
| Children | `cb-label`, `cb-field`, `cb-input`, `cb-toggle`, `cb-listbox`, `cb-option`, `cb-live` | `label`, `combobox-input`, native `<datalist>` |
| Behaviour | full listbox, filter, create-option, live region | native `<datalist>` autocomplete |
| CSS | 242 lines, 24 local `--cb-*` tokens | 6 lines |

The cost is real: any page that loads both stylesheets gets both rule sets applied to
the same element, and `@basenative/combobox` exposes its CSS as a separate `./css`
export, so nothing forces them to load together or apart. The fix is not a merge —
the behaviours genuinely differ. **Rename one root contract** (the `components` one is
the cheaper rename: 6 lines of CSS and 29 lines of JS versus 242 + 60), and say in the
docs which one is the datalist shim. ~0 lines removed, but the collision is the
finding; it is the only one here that is currently capable of producing a wrong
rendering.

### D2 — `renderDatepicker` / `renderTimepicker` are the same function twice — DO
**Lines:** 23 + 25 = 48, of which ~20 are byte-identical
**Call sites:** production 0 / 0 · test 18 / 14
**Removes:** ~18–22 lines, and ~24 more if `renderDateRange` (24 lines, two copies of
the same `<input type=date>` block) is folded in.

The two bodies differ in exactly four places: `type="date"` vs `type="time"`, the
presence of `step`, the `bn-date-` vs `bn-time-` id prefix, and the `data-bn` value.
The destructure, the four `req`/`dis`/`minAttr`/`maxAttr` lines and the wrapper markup
are identical text. One `renderNativeTemporalField({ type, extraAttrs, ...options })`
with two four-line wrappers collapses all three. The whole package is 3 render
functions / ~125 lines with 0 production call sites, so this is cheap to do and cheap
to get wrong — and it is the natural moment to add the escaping the package is
missing (see §1).

### D3 — `renderTable` / `renderTreeGrid` / `renderDataGrid` — DO, but only the row/cell core
**Lines (function bodies):** `renderTable` 35 · `renderTreeGrid` 34 · `renderDataGrid` 72 = 141
**Call sites:** production 2 / 0 / 0 · test+demo 19 / 9 / 15
**Shared by the tokenizer:** `caption[]`, `thead[]`, `tbody[]`, `tr[]`, `td[]`,
`td[colspan,data-bn]` — 6 shared tag signatures between `renderTable` and
`renderDataGrid`, 4 between `renderTable` and `renderTreeGrid`.

Three independent implementations of "columns × rows → `<table>`", including three
separate empty-state `<td colspan>` paths. The column/row/empty-state core is worth
one shared internal (`packages/components/src/internal/` already holds `field.js`,
`items.js`, `tree.js`, so the pattern exists); ~25–35 lines. The selection, sorting and
expansion layers on top must stay separate — they are what the three components are
for. Do not attempt a single `renderTable` with a `mode` option.

### D4 — `renderCheckbox` / `renderToggle` — **DON'T**
**Lines:** 9 + 8. **Option-key Jaccard 0.86** (differ only by `value`).
**Call sites:** production 0 / 0 · test+demo 12 / 9.

`ds-pairs.json` scores this 0.55 and my own tag-signature pass scores it 0.50, so both
signals point at it — and it is still not worth doing. The maximum saving is about
**6 lines**, both are already at the floor of what a render function can be, and the
two have different CSS contracts (`checkbox-label` vs `toggle-label`) and different
semantics to a screen reader. Consolidating costs a parameter and a branch to save
six lines. Leave them.

### D5 — `renderInput` / `renderTextarea` / `renderSelect` / `renderCombobox` / `renderMultiselect` — **DON'T (already done)**
**Option-key Jaccard 0.83 / 0.69 / 0.67**, which is what makes them look like the
biggest cluster in the data.

They are not duplicated. The shared part — the label/help/error wrapper — is
**already extracted** into `packages/components/src/internal/field.js`
(`renderField`), alongside `describedBy()` and `attrsSuffix()`. What is left in each
function is a six-line prelude (destructure, `id` fallback, three boolean attribute
flags) and one control element that must differ. Factoring the prelude would save
~6 lines per component at the cost of an options object passed through two layers.
This cluster is high-similarity because the library is already well factored here;
that is the correct reading of the signal, not a finding.

**Caveat on all of the above:** option-key overlap is computed from the destructuring
pattern in each function body. Five functions (`renderAdminQueueList`,
`renderAdminUserList`, `renderInspector`, `renderTreeView`, `renderNodeToElement`,
plus `renderPaletteHTML`) take positional parameters instead and are therefore absent
from that comparison entirely.

---

## 3. Hardcoded values, grouped by value

`ds-hardcoded.json` reports 165 values / 206 occurrences. **125 of those 165 are not
values** — the `transition` (79) and `typography-family` (46) buckets are mostly
comment prose and half-parsed CSS rules (`'absolute'`, `'space-between'`,
`'hover { background: var(--bn-color-surface-muted)'`, and one 80-character
contrast-ratio note). The scanner also does not strip comments and undercounts what
remains by roughly 8×.

So this section is a **fresh count**: 11 CSS files under `packages/*/src/*.css`,
comments stripped, values taken only from real declarations, and `--bn-*` token
*definitions* excluded so a token is never reported as a violation of itself.
Result: **67 distinct primitives, 235 occurrences.** A value is matched to a token
only when a `--bn-*` custom property is declared with the byte-identical value.

### 3a. Pure wins — the value already has a token

17 values, **136 occurrences**, every one a mechanical substitution.

| Value | Occurrences | Files | Existing token(s) |
|---|---:|---:|---|
| `1px` | **32** | 5 | `--bn-border-width` |
| `2px` | **22** | 4 | `--bn-border-width-thick` |
| `1rem` | **19** | 2 | `--bn-font-size-base` / `--bn-space-4` |
| `0.5rem` | 9 | 2 | `--bn-space-2` / `--bn-radius-lg` |
| `#a1a1aa` | 8 | 1 | `--bn-color-gray-400` |
| `2rem` | 8 | 1 | `--bn-space-8` / `--bn-control-height-sm` |
| `0.75rem` | 7 | 1 | `--bn-font-size-xs` / `--bn-space-3` / `--bn-radius-xl` |
| `0.375rem` | 7 | 1 | `--bn-radius-md` |
| `2.5rem` | 4 | 1 | `--bn-space-10` / `--bn-control-height` |
| `1.25rem` | 4 | 1 | `--bn-font-size-xl` / `--bn-space-5` |
| `4rem` | 4 | 1 | `--bn-space-16` |
| `0.25rem` | 3 | 1 | `--bn-space-1` / `--bn-radius-sm` |
| `1.125rem` | 3 | 1 | `--bn-font-size-lg` |
| `#f4f4f5` | 2 | 1 | `--bn-color-gray-100` |
| `3rem` | 2 | 1 | `--bn-space-12` / `--bn-control-height-lg` |
| `#18181b` | 1 | 1 | `--bn-color-gray-900` |
| `1.5rem` | 1 | 1 | `--bn-font-size-2xl` / `--bn-space-6` / `--bn-target-size-min` |

Concentration, which is what makes this cheap:

| File | Token-replaceable occurrences |
|---|---:|
| `packages/components/src/components.css` | 68 |
| `packages/builder/src/builder.css` | 54 |
| `packages/combobox/src/styles.css` | 7 |
| `packages/keyboard/src/styles.css` | 5 |
| `packages/components/src/reset.css` | 2 |

`1px` + `2px` alone is **54 substitutions across 5 files**, and the two border-width
tokens already exist. That is the one to do first.

One row is a trap: the 8 `#a1a1aa` and the 2 `#f4f4f5` / 1 `#18181b` in
`builder.css` are all inside `var(--bn-color-*, #hex)` fallbacks. Substituting the
matching grey token there would be treating the symptom; the fix is §3b.

**Honest caveat on the multi-token rows.** Where a row lists more than one token, the
value is ambiguous by construction — `1rem` is both `--bn-font-size-base` and
`--bn-space-4`, and only a human reading the declaration knows which was meant.
`1rem` as a `gap` is `--bn-space-4`; `1rem` as a `font-size` is `--bn-font-size-base`.
Do not sed these — the 9 ambiguous rows are 57 of the 136 occurrences. The **8
single-token rows are unambiguous: `1px` (32), `2px` (22), `#a1a1aa` (8),
`0.375rem` (7), `4rem` (4), `1.125rem` (3), `#f4f4f5` (2), `#18181b` (1) — 79
occurrences**, and those are the ones that can be done mechanically.

### 3b. The finding underneath the counts — `builder.css` is a hardcoded palette in token clothing

`packages/builder/src/builder.css` contains **33 `var(--bn-color-*, #hex)` fallback
sites** across 12 distinct token names. **Nine of those twelve token names are never
declared anywhere in the repo**, so the hex fallback is always the live value:

| Referenced token | Declared in `tokens.css`/`theme.css`? | Fallback actually used | Sites |
|---|---|---|---:|
| `--bn-color-text-muted` | yes | `#a1a1aa` | 8 |
| `--bn-color-border` | yes | `#2a2a2e` | 6 |
| `--bn-color-accent` | **no** | `#6366f1` | 4 |
| `--bn-color-surface-3` | **no** | `#27272d` | 3 |
| `--bn-color-surface-2` | **no** | `#1f1f23` | 3 |
| `--bn-color-border-subtle` | **no** | `#2a2a2e` | 2 |
| `--bn-color-accent-soft` | **no** | `#4338ca` | 2 |
| `--bn-color-text` | yes | `#f4f4f5` | 1 |
| `--bn-color-text-on-accent` | **no** | `#f4f4f5` | 1 |
| `--bn-color-surface-4` | **no** | `#2f2f37` | 1 |
| `--bn-color-surface-1` | **no** | `#18181b` | 1 |
| `--bn-color-surface-0` | **no** | `#0d0d10` | 1 |

Grouped-by-value this reads as "`#2a2a2e` appears 8 times in 1 file", which
understates it. The real shape is: the builder ships a dark palette that the design
system does not know exists, and it will never respond to a theme change, because
`--bn-color-surface-0..4`, `--bn-color-accent`, `--bn-color-accent-soft`,
`--bn-color-border-subtle` and `--bn-color-text-on-accent` do not exist. Either declare
those nine tokens in `packages/components/src/tokens.css` (and the builder inherits
theming for free), or drop the `var()` wrapper and admit the hexes are literals. The
current state is the worst of both.

Two smaller instances of the same shape: `packages/combobox/src/styles.css` declares
**24 local `--cb-*` tokens** and `packages/keyboard/src/styles.css` declares **30
local `--kb-*` tokens**, neither deriving from `--bn-*`.

### 3c. Suppressed here

- **127 rows** dropped by Gate 3 — 125 non-values (comment prose / CSS fragments in
  the `transition` and `typography-family` buckets) plus 2 that were token
  *definitions* misread as violations: `#ffffff`, reported in
  `packages/components/src/theme.css`, is `rgb(255 255 255 / 0.02)` inside
  `--bn-dark-zebra`; `#2563eb`, reported in `theme.css`, is actually only in
  `tokens.css` where it *defines* `--bn-color-primary-600`.
- **50 primitives / 99 occurrences** kept by Gate 3 but with no matching token —
  `4px` (11), `#2a2a2e` (8), `3px` (5), `20rem` (5), `0.4rem` (4), `#6366f1` (4),
  `12px` (4), `28rem` (3)… These need a token invented before they can be replaced,
  which is a design decision, not a cleanup. They are in `.agents/` if you want them.
- **JS-embedded CSS not counted here.** `packages/visual-builder/src/bn-canvas.js`
  builds inline `style="…"` strings containing `hsl()` literals
  (`var(--border,hsl(220 15% 22%))`, `var(--accent,hsl(210 100% 60%))`) — same pattern
  as `builder.css`, different file type. I scoped the recount to `.css` files rather
  than guess at which template-literal fragments are stylesheets.

---

## 4. Variant sprawl

**How this was computed, not eyeballed.** Two independent passes:

1. **Declared** — every `[data-bn="<contract>"][data-<axis>="<value>"]` selector in the
   11 stylesheets, parsed compound-by-compound so that `:is(…)` groups and values
   containing `_` are included (an adjacency-only regex misses
   `[data-status="in_progress"]` and the entire pipeline status block — 23 values),
   then mapped onto the functions that emit those contracts.
2. **Used** — every recorded usage located in its source file, parentheses balanced to
   recover the full argument text, and each `axis:` expression read out. Literal values
   and *non-literal* expressions are reported separately, because a ternary or a lookup
   table is not a usage pattern you can count.

Tiers are kept apart: `examples/express/showcase-data.js` deliberately calls every
variant once, so counting demos as usage patterns would make sprawl invisible by
construction.

### All production axis arguments — the entire population, 13 call sites

| Call site | Expression | Statically determinable? |
|---|---|---|
| `packages/components/src/calendar.js:336` | `variant: card.badgeVariant \|\| 'default'` | partial — `default` + caller-supplied |
| `GreenPut …/tenant-site/src/proposal.ts:55` | `variant: statusVariant` (3-way ternary) | no |
| `GreenPut …/tenant-site/src/scanner.ts:47` | `variant: statusColors[asset.status] ?? 'neutral'` | no |
| `GreenPut …/tenant-site/src/scanner.ts:48` | `variant: 'neutral'` | **yes — `neutral`** |
| `GreenPut …/tenant-site/src/scanner.ts:42` | `renderCard(… variant: … ?? 'neutral')`, `variant: 'neutral'` | **yes — `neutral`** |
| `GreenPut …/platform/src/routes/shared/pipeline.ts:91` | `variant: action.variant ?? 'secondary'`, `size: 'sm'` | partial — `secondary`, `sm` |
| `PendingBusiness …/site/src/lib/dialog.ts:43` | `variant: 'secondary'` | **yes — `secondary`** |
| `PendingBusiness …/site/src/lib/dialog.ts:48` | `variant: opts.destructive ? 'destructive' : 'primary'` | **yes — both** |
| `GreenPut …/platform/src/routes/shared/dialog.ts:42` | `size: options.size ?? 'default'` | partial — `default` |
| `GreenPut …/platform/src/routes/shared/tabs.ts:47` | `variant: options.variant ?? 'pills'` | partial — `pills` |
| `GreenPut …/platform/src/routes/shared/pipeline.ts:133` | `status: card.status` | no |
| `GreenPut …/platform/src/routes/jobs/jobs.ts:440` | `status: 'won'` | **yes — `won`** |
| `GreenPut …/platform/src/routes/jobs/jobs.ts:464` | `renderCalendar({…})` — argument spans an interpolated template; not recovered | no |

**Eight of thirteen production axis arguments are dynamic.** Any "component with N
variants used M ways" count computed from literals alone would be wrong here, and this
is the main reason I am not giving you a sprawl ranking dressed up as a measurement.

### Declared vs reachable, per axis

| Component | Axis | Declared | Reachable in production | Verdict |
|---|---|---:|---|---|
| `renderBadge` | `variant` | 5+d | all 5 via `STATUS_VARIANT` in `badge.ts`, **plus undeclared `neutral`** | not sprawl — a **bug** |
| `renderButton` | `variant` | 4+d | `secondary`, `destructive`, `primary` + unbounded `action.variant` | `ghost` unreached; not sprawl |
| `renderButton` | `size` | 2+d | `sm` | `lg` unreached |
| `renderPipelineBlock` | `status` | **23**+d | `won` + unbounded `card.status` | documented fallback exists; fine |
| `renderCalendar` | `status` | 7+d | none statically | — |
| `renderTabs` | `variant` | 1+d | `pills` + unbounded | — |
| `renderDialog` | `size` | 2+d | `default` + unbounded | — |
| `renderAlert` | `variant` | 4+d | **none** | zero production usage |
| `renderToastContainer` | `position` | 4+d | **none** | zero production usage |
| `renderAvatar` | `size` / `shape` | 3+d / 1+d | **none** | zero production usage |
| `renderTooltip` | `position` | 3+d | **none** | zero production usage |
| `renderTree` | `level` | 3+d | **none** | zero production usage |
| `renderDropdownMenu` | `position` | 2+d | **none** | zero production usage |
| `renderDataGrid` | `sorted` | 2+d | **none** | zero production usage |
| `renderDrawer` | `size` / `position` | 2+d / 1+d | **none** | zero production usage |
| `renderSpinner` | `size` | 2+d | **none** | zero production usage |
| `renderSkeleton` | `variant` | 1+d | **none** | zero production usage |

### The finding that is actually actionable: values passed that have no rule

A `data-variant` with no matching selector does not error. It renders with the base
rule only, silently.

| Call site | Passes | Declared | Effect |
|---|---|---|---|
| `GreenPut/apps/tenant-site/src/scanner.ts:47,48` | `renderBadge(…, { variant: 'neutral' })` | `default`,`primary`,`success`,`warning`,`error` | **Live in production.** No `[data-bn="badge"][data-variant="neutral"]` rule exists in any of the 11 stylesheets, and there is no fallback `[data-variant]` rule. Both badges render with no background and no colour. |
| `GreenPut/apps/tenant-site/src/scanner.ts:42` | `renderCard(…, { variant: … ?? 'neutral' })` | **none — `card` has no `data-variant` rule at all** | `renderCard` accepts a `variant` option, escapes it into `data-variant`, and no stylesheet ever reads it. The whole axis is inert. |
| `components.test.js:1999` | `renderCalendar(… status: 'done')` | 7 values, `done` not among them | Test asserts on an unstyled status. |
| `components.test.js` (renderDropdownMenu) | `position: 'top-end'` | `left`,`right` | Unstyled. |
| `examples/express/component-demos.js:488` | `renderSpinner({ size: 'md' })` | `sm`,`lg`,`+d` | Unstyled; `md` is presumably meant to *be* the default, which has no name. |

The `renderBadge` one is a defect, not a style nit. The same repo's
`GreenPut/apps/platform/src/routes/shared/badge.ts` declares the correct union
(`'default' | 'primary' | 'success' | 'warning' | 'error'`) and maps 44 domain statuses
onto it — so the two GreenPut apps disagree with each other and the tenant-site one is
wrong. Note also that BaseNative's own `pipeline-block` CSS already enumerates 23 of
those same domain statuses; two copies of the same status taxonomy exist, one in
BaseNative's CSS and one in GreenPut's TypeScript, and they are not in sync.

### On the owner's shape — "9 variants used 3 ways"

The closest instance is `renderCard`: **an axis with zero rules, escaped into the DOM
and passed by a consumer.** After that, `renderButton` (4 declared, 3 reached, `ghost`
never) and `renderBadge` (5 declared, 5 reachable + 1 invalid).

The honest reading of this table is that **the library does not have a variant sprawl
problem — it has an adoption problem.** 12 of the 19 axes above have zero production usage
because the components carrying them have zero production usage; deleting variants on
that basis would be deleting an unshipped API. Three things are worth doing now:

1. `renderBadge` — add a `neutral` rule or fix the two callers. One line either way.
2. `renderCard` — either give `data-variant` rules or stop emitting the attribute.
   Right now it is an API promise with nothing behind it.
3. **Name the default value in CSS** for `size` and `position` axes. Callers invent
   names for the unnamed default (`md`, `top`, `right`, `default`) and every invented
   name lands unstyled. One extra selector per axis makes the whole class of bug
   impossible.

Re-run this section once consumer adoption passes ~5 call sites per component; below
that the denominator is too small for "used N ways" to carry meaning.

---

## 5. Dead components

Three components report `total: 0`. **Two of the three are not dead**, and four more
that the inputs make look alive-by-one are alive for a different reason than recorded.
Confidence below is derived from the specific scanner shape involved, not asserted.

| Component | Recorded | Verdict | Confidence | Why |
|---|---:|---|---|---|
| `renderPaletteHTML` | 0 | **NOT dead** | — (disproved) | Called at `packages/builder/src/palette-element.js:47`. The scanner only counts a call when the same file contains an `import { X }` statement (`scripts/component-usage.js` builds `localToComponent` from import statements before matching `\bname\s*\(`). A function defined and used in its own file can therefore never register a usage. It is also re-exported from `index.js` and documented at `docs/api/builder.md:158`. |
| `bn-builder` | 0 | **NOT dead** | — (disproved) | Written as a tag in `examples/express/views/builder.html:14`, `packages/builder/README.md:45` and `docs/api/builder.md:46`. The scanner walks only `.js/.mjs/.cjs/.ts/.jsx/.tsx`; there are **28 `.html` files in this repo carrying 97 `data-bn` attributes and 1 custom-element tag**, none of which it reads. This is the single largest blind spot in the usage data and it is not in the scanner's stated limitation list. |
| `bn-canvas` | 0 | **Possibly dead** | **Medium** | The only genuine candidate. `customElements.define('bn-canvas', BnCanvas)` is a literal at `packages/visual-builder/src/bn-canvas.js:252`, so tag resolution succeeded — a zero here is a real zero for every shape the scanner *can* see. Against that: it is documented as the package's public entry point (`docs/api/visual-builder.md:139`, `llms-full.txt:3098`), it is a custom element, and custom elements are written by consumers in HTML and in `${…}`-interpolated template strings — the two shapes the scanner cannot see. Medium, not high: do not delete on this evidence; grep the consumer repos' `.html` before acting. |

### Four more the inputs get wrong in the other direction

`bn-builder-canvas`, `bn-builder-inspector`, `bn-builder-palette` and
`bn-builder-tree` each show exactly 1 usage. That usage is inside
`examples/express/public/builder.js` — an **esbuild output committed to the repo**
(it opens `// ../../packages/runtime/src/signals.js`), so their only recorded usage is
a machine-generated copy of their own source.

Their real usage was suppressed by a misattribution: each element is registered
**twice** — once in its own file (`palette-element.js:88`, `canvas-element.js:207`,
`tree-element.js:72`, `inspector-element.js:105`) and again, guarded, in
`builder-element.js:114–117`. The scanner attributed all four to `builder-element.js`,
and then correctly refused to count a tag in its own definition file — which is exactly
where all four are genuinely used, in `LAYOUT_HTML` at `builder-element.js:21–28`. So
all four are **alive with high confidence**, and the duplicate `customElements.define`
block in `builder-element.js` is redundant with the four per-file registrations and
could go.

### What is *not* in this section

**40 of 61 components have zero production usage**, but "not adopted yet" is not
"dead" and I am not going to hand you a 40-row deletion list. The distribution:

| Status | Count | Examples |
|---|---:|---|
| Has production usage | 21 | `renderBadge`, `renderDialog`, `renderButton`, `renderTable` |
| Test + demo only | 25 | most of `@basenative/components` — `renderAccordion`, `renderInput`, `renderSelect`, `renderPagination`… |
| Test only, no demo | 8 | `renderDatepicker`, `renderTimepicker`, `renderDateRange`, `renderCombobox`(combobox), `renderTreeGrid`, `renderKeyboard`, `renderEmail`, `renderWithBoundary` |
| Build-artifact only | 4 | the four `bn-builder-*` elements (corrected above) |
| Zero of any kind | 3 | the table above |

The 8 "test only, no demo" components are the ones to watch: they have neither a
consumer nor a showcase page, which means nothing but their own assertions has ever
exercised them. `@basenative/date` is three of those eight, and is also the package
with no escaping (§1) and no CSS (§1) — if anything in this audit is a candidate for
"rewrite or retire", it is that package, not any individual component.

### Scanner limitations that bound every verdict above

Carried forward from the scanner's own list, plus four found while verifying:

*From the scanner's list, materially affecting this audit:*
- `${…}` holes split a template literal into separate static segments; a tag whose
  closing `>` or `data-bn` falls across a hole is invisible. A dynamically-built
  ``data-bn="${kind}-card"`` never resolves and is never counted.
- Test files are tagged but **not excluded** from totals — 68% of all records. Gate 1
  handles this.
- Call detection is identifier-text-based, not scope-aware: a local variable sharing a
  component's export name would be miscounted. Not observed here.
- Consumer scope is fixed to five named sibling directories; any other downstream repo
  is invisible and under-reported.
- `export *` (`packages/station`) and bare `export { a as b }` (`packages/logger`,
  `packages/markdown`) are not traced. Verified by hand: none touch a `render*` name.

*Found while verifying, and not in the scanner's stated list:*
- **An import statement is required before any call is counted** — so same-file and
  same-module usage registers zero. This is what makes `renderPaletteHTML` look dead,
  and it means every component's count is a lower bound on internal use.
- **`.html` and `.md` are never walked** — 28 HTML files, 97 `data-bn` attributes and
  1 custom-element tag in this repo alone are absent from the data. Custom elements are
  the worst affected, because HTML is where they are normally written.
- **Committed build output is scanned as if it were source** —
  `examples/express/public/builder.js` (esbuild bundle) and
  `GreenPut/apps/tenant-site/apps/tenant-site/dist-worker/index.js` contribute 8
  records that are machine-generated copies. Gate 1 tiers these out.
- **`ds-definitions.json` aggregates `dataAttributes` per file, not per function** —
  every co-located export inherits its neighbours' contracts. §1 and §4 re-read each
  function body instead.

---

## Inferred rather than read

Everything in §1–§5 above was verified by reading the source it refers to, with these
exceptions, which are inference and are marked as such:

1. **`bn-canvas` is unused in the five consumer repos.** Inferred from the scanner
   finding no tag, not from grepping those repos' `.html` files myself — which the
   scanner does not walk, so the negative is unproven there. This is why the verdict
   is Medium, not High.
2. **The `neutral` badge renders unstyled.** Inferred from the absence of a
   `[data-bn="badge"][data-variant="neutral"]` selector in all 11 stylesheets plus the
   absence of a fallback `[data-variant]` rule. Not confirmed in a browser.
3. **"Lines removed" figures in §2** are estimates from reading both bodies and
   counting identical lines, not from writing the consolidated version. D2 (~18–22) is
   the most reliable, because the two functions are near-byte-identical. D3 (~25–35) is
   the least, because the shared core still has to be designed.
4. **`--bn-color-surface-0..4`, `--bn-color-accent`, `--bn-color-accent-soft`,
   `--bn-color-border-subtle`, `--bn-color-text-on-accent` are undeclared.** Established
   by grepping `--<name>:` across `packages/*/src/*.css` only. If a consumer declares
   them at app level the builder would theme correctly there; nothing in this repo does.
5. **Consumer-repo call sites were read, but consumer repos were not audited.** The 30
   `prod-consumer` records were each opened and checked; no wider survey of those repos
   was done, so "DuganLabs hand-rolls `pkg-card`" is a statement about two files, not
   about DuganLabs.
6. **`@basenative/date`'s missing escaping is unexploited.** Inferred from that package
   having zero production call sites in the six scanned repos. Any unscanned downstream
   consumer would change that.

## Where to see everything

| | |
|---|---|
| All 728 usage records, with repo/file/line/`isTest` | `.agents/component-usage.json` |
| All 61 component definitions | `.agents/ds-definitions.json` (note the per-file aggregation caveat) |
| All 165 raw hardcoded-value rows | `.agents/ds-hardcoded.json` (note the comment-stripping caveat) |
| All 357 candidate pairs with their scores and evidence | `.agents/ds-pairs.json` |

`.agents/` is in `.gitignore`; all four inputs are committed alongside this file with
an explicit by-name `git add -f`, so every suppressed row above is in the tree and
can be checked. `component-usage.json` regenerates with
`cd packages/validate && node ../../scripts/component-usage.js`.
