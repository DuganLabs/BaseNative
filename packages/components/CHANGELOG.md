# @basenative/components

## 0.6.2

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2
  - @basenative/forms@1.0.3

## 0.6.1

### Patch Changes

- 463fa97: Fix two keyboard-accessibility defects found during the CSS design-system pass:

  - **Tooltip**: `renderTooltip()`'s trigger was a `<span popovertarget>`. Per the HTML spec, only button-like elements (`<button>`, and `<input type="button|submit|reset|image">`) can be popover invokers, so the tooltip could never open by click or keyboard in any browser. The trigger now renders as a `<button type="button">` (`<span>` → `<button type="button">`) carrying the same `data-bn="tooltip-trigger"` attribute, `popovertarget`/`popovertargetaction="toggle"`, and a new `aria-describedby` pointing at the tooltip id. A `trigger` HTML slot that already starts with `<button` or `<input` is used in place instead of being double-wrapped, with those same attributes spliced onto it.
  - **Tree / TreeGrid / DataGrid**: `[data-bn="tree-item-content"]`, `[data-bn="treegrid-row"]` and sortable `[data-bn="datagrid-th"]` headers carry `:focus-visible` styling but were never focusable — no `tabindex` was ever emitted, so keyboard users could not reach them. Tree items and TreeGrid rows now carry a static roving `tabindex` (the first item in document order gets `tabindex="0"`, every other item gets `tabindex="-1"`); this package ships no client-side `initTree()`/`initTreeGrid()`, so moving that `tabindex` on arrow-key presses is left to the caller — documented accordingly. Sortable DataGrid column headers now render as a real `<button type="button" data-bn="datagrid-th-button">` inside the `<th>` (plus `aria-sort`), the WAI-ARIA APG sortable-column-header pattern, so they are reachable and activatable with no client JS at all.

  No CSS changes. Markup and docs (`docs/api/components.md`, `README.md`, `types/index.d.ts`) only.

- 50740f9: Fix three visual defects surfaced by a screenshot QA pass of the showcase site:

  - Calendar: the hour-gutter labels used `grid-row: h - hourStart + 1` while the time slots and events used `+ 2`, so a label sat one row above the slot/event it described (an 11:00–12:00 event could visually appear to span the 12pm–2pm rows). Labels now use the same `+ 2` convention. Calendar events also get `overflow: hidden`, `min-height: 0`, and `align-self: stretch` so a card's content can never grow its grid row, and `calendar-event-title` is clamped to 2 lines with an ellipsis.
  - Accordion: `[data-bn="accordion-header"]` centred its `::before` disclosure triangle against the full header block, so a two-line summary put the marker between the lines instead of next to the first one. `align-items` is now `flex-start` with a small `margin-top` offset on the marker that keeps single-line headers pixel-identical.
  - Mobile nav: the horizontally-scrolling header `menu` had no scroll affordance and could clip an item mid-glyph at the viewport edge. Added a sticky right-edge fade (progressively faded out near the end of scroll via `animation-timeline: scroll()` behind `@supports`, a constant fade otherwise) plus `padding-inline-end`/`scroll-padding-inline-end` so the last item clears the fade.

- Updated dependencies [df5e5d7]
- Updated dependencies [40a3472]
  - @basenative/forms@1.0.2
  - @basenative/runtime@0.6.1

## 0.6.0

### Minor Changes

- 7c7e4e1: Design-system pass over the shared CSS so the 33 components read as one system:

  - **Contrast**: input, checkbox, radio, select, combobox, multiselect, datagrid checkbox, spinner track, skeleton and toggle track borders meet WCAG 1.4.11 (3:1) through a new `--bn-color-border-control` token; `--bn-color-text-subtle` and error text meet 4.5:1 in both themes (new `--bn-color-error-fg`).
  - **One control-height ladder** (40px default, `data-size="sm"`/`"lg"` = 32/48) shared by button, input, select, combobox, dropdown trigger, pagination and tabs instead of five different heights.
  - **Overlays**: dialog and command palette centre again; dropdown menu and tooltip anchor to their trigger (absolute fallback, `anchor-name` progressive enhancement).
  - **Theme-safe state**: tree selection, table zebra, toggle track, calendar events and pipeline drop targets route through tokens defined in both light and dark palettes; nine previously undefined custom properties are now defined.
  - **Hit areas**: every interactive control gets a 24×24 minimum target without changing its visible size; one shared `:focus-visible` rule (the command input previously had no focus indicator).
  - **Tokens**: `--bn-radius-control/-container/-modal`, `--bn-shadow-modal`, `--bn-motion-fast/-base/-slow`, `--bn-scrim`; toast variants get a left accent bar.
  - **Packaging**: the main export now carries a `types` condition so TypeScript consumers resolve `types/index.d.ts` without a local shim; `./layers.css` is exported (it was missing from the 0.5.0 tarball).

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0
  - @basenative/forms@1.0.1

## 0.5.0

### Minor Changes

- 7523b61: Harden every renderer: one escaping policy, deterministic ids, accessibility fixes.

  **Escaping (behaviour change).** Every attribute interpolation (id, name, value, placeholder, alt, src, href, aria-\*, data-\*, variant/size/position) and every text-semantic field (label, helpText, error, caption, emptyMessage, item and option labels, tooltip content, breadcrumb labels, avatar name, table and grid cell values, calendar and pipeline titles) is now HTML-escaped through `@basenative/runtime/shared/escape` — the same escaper the SSR renderer uses — replacing nine private, divergent copies (one of which did not escape `<`). Designated **content slots** are not escaped and are documented as `HTML slot: not escaped; pass trusted markup only`: button/badge/alert content, card header/body/footer, dialog and drawer body and footer, accordion and tab panel content, dropdown and tooltip triggers, icons, DataGrid `render()`, custom `renderItem`, and `attrs`. `renderBadge` content was previously escaped and is now a slot.

  **Deterministic ids (behaviour change).** Generated ids are `bn-<prefix>-<n>` from a counter instead of `Math.random()`, so SSR output is stable and `aria-controls` / `aria-labelledby` pairs survive hydration. New exports `nextId(prefix)` and `resetIds()` — call `resetIds()` once per SSR request. Every renderer honours an explicit `id` first. `showToast` ids are now strings and accept `options.id`.

  **Fixes.** Tree/TreeGrid leaves no longer emit `aria-expanded="undefined"`; Input help and error get distinct `<id>-help` / `<id>-error` ids and `aria-describedby` lists both; Textarea and Select emit `aria-describedby` and an error id (Select gains `helpText`); Dialog honours `modal`; tab buttons are `type="button"`; a closed Drawer is `inert`; Progress guards `max=0`; Calendar uses local time consistently (day headers no longer shift in non-UTC zones); Avatar with an `<img>` no longer double-announces; a missing `attrs` no longer leaves a stray space.

  Tests: 136 → 301.

## 0.4.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [f7e26f4]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0
  - @basenative/forms@1.0.0

## 0.4.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
  - @basenative/forms@0.4.0
