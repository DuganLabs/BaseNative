---
'@basenative/components': minor
---

**Table: columns of figures, labelled cells, and a footer.**

`renderTable` could not express three things a data table needs the moment its
values are money, counts or rates. Each had to be worked around in the
consumer, which meant hand-editing the markup the renderer had just produced.

- **`align` and `numeric` on a column.** `numeric: true` emits `data-numeric`
  and implies `align: 'end'`; an explicit `align` (`'start' | 'center' | 'end'`)
  wins. The CSS gives numeric cells `font-variant-numeric: tabular-nums
  lining-nums` and `white-space: nowrap`. Crucially the `<th>` carries the same
  attributes as its cells, so a heading can never drift out of alignment with
  the column under it — a left-aligned `Amount` over right-aligned figures
  breaks the vertical edge the eye tracks, and it was previously impossible to
  fix through the API.
- **`data-label` on every `<td>`.** A responsive stacked layout hides `<thead>`
  and recovers the column heading with `content: attr(data-label)`. Without it
  a narrow-viewport row reads as an unlabelled zig-zag of values, and the only
  fix was to walk the DOM after render. `<thead>` stays in the DOM, so the
  accessibility tree is unchanged at every width.
- **`footer` rows.** A `<tfoot>` read with the same column keys and `render`
  hooks as the body, the first cell of each row a `<th scope="row">`, styled
  above the accounting double rule. A totals row was previously unreachable.
- **`emptyContent`** as an HTML slot beside the text-only `emptyMessage`, so an
  empty state can carry its own call to action (`No accounts yet. Connect a
  bank →`).

Note the markup change: every `<td>` now carries `data-label`. Nothing is
removed and the accessibility tree is unaffected, but assertions that pinned
the exact `<td>` tag need updating.

Decimal alignment remains the caller's half of the contract: right alignment
plus tabular figures aligns decimal points only when every cell in a column
renders the same number of fraction digits. Documented in
`docs/api/components.md`.
