---
"@basenative/components": patch
---

Fix two keyboard-accessibility defects found during the CSS design-system pass:

- **Tooltip**: `renderTooltip()`'s trigger was a `<span popovertarget>`. Per the HTML spec, only button-like elements (`<button>`, and `<input type="button|submit|reset|image">`) can be popover invokers, so the tooltip could never open by click or keyboard in any browser. The trigger now renders as a `<button type="button">` (`<span>` → `<button type="button">`) carrying the same `data-bn="tooltip-trigger"` attribute, `popovertarget`/`popovertargetaction="toggle"`, and a new `aria-describedby` pointing at the tooltip id. A `trigger` HTML slot that already starts with `<button` or `<input` is used in place instead of being double-wrapped, with those same attributes spliced onto it.
- **Tree / TreeGrid / DataGrid**: `[data-bn="tree-item-content"]`, `[data-bn="treegrid-row"]` and sortable `[data-bn="datagrid-th"]` headers carry `:focus-visible` styling but were never focusable — no `tabindex` was ever emitted, so keyboard users could not reach them. Tree items and TreeGrid rows now carry a static roving `tabindex` (the first item in document order gets `tabindex="0"`, every other item gets `tabindex="-1"`); this package ships no client-side `initTree()`/`initTreeGrid()`, so moving that `tabindex` on arrow-key presses is left to the caller — documented accordingly. Sortable DataGrid column headers now render as a real `<button type="button" data-bn="datagrid-th-button">` inside the `<th>` (plus `aria-sort`), the WAI-ARIA APG sortable-column-header pattern, so they are reachable and activatable with no client JS at all.

No CSS changes. Markup and docs (`docs/api/components.md`, `README.md`, `types/index.d.ts`) only.
