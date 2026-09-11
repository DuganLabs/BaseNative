---
'@basenative/components': minor
---

**Table: columns of figures, a footer, and labels that reach it.**

`renderTable` could not express three things a data table needs the moment its
values are money, counts or rates. Each had to be worked around in the
consumer, which meant hand-editing the markup the renderer had just produced.

- **`align` and `numeric` on a column.** `numeric: true` emits `data-numeric`
  and implies `align: 'end'`; an explicit `align` (`'start' | 'center' | 'end'`)
  wins, and an unknown value is dropped rather than emitted as an attribute no
  rule would match. The CSS gives numeric cells `font-variant-numeric:
  tabular-nums lining-nums` and `white-space: nowrap`. Crucially the `<th>`
  carries the same attributes as its cells, so a heading can never drift out of
  alignment with the column under it — a left-aligned `Amount` over
  right-aligned figures breaks the vertical edge the eye tracks, and it was
  previously impossible to fix through the API. This is the supported form of
  the `cellAttrs: 'data-bn="num"'` workaround the previous release suggested,
  which styled nothing and never reached the header.
- **`footer` rows.** A `<tfoot>` read with the same column keys and the same
  `render` / `cellAttrs` hooks as the body, the first cell of each row a
  `<th scope="row">`, styled above the accounting double rule. A totals row was
  previously unreachable.
- **`emptyContent`** as an HTML slot beside the text-only `emptyMessage`, so an
  empty state can carry its own call to action (`No accounts yet. Connect a
  bank →`).
- **`labelCells` now labels footer cells too.** A stacked narrow-viewport
  layout hides `<thead>` and recovers each heading with
  `content: attr(data-label)`; a totals row that dropped out of that treatment
  was the one row on the page with no heading at all.

Purely additive: no existing markup changes. A table that sets none of the new
options renders byte-identically to the previous release.

Decimal alignment remains the caller's half of the contract: right alignment
plus tabular figures aligns decimal points only when every cell in a column
renders the same number of fraction digits. Documented in
`docs/api/components.md`.
