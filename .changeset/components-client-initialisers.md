---
'@basenative/components': minor
---

Ship the client initialisers the catalogue has been describing (BN-018, package half).

`initCommandPalette`, `initDataGrid`, `initTree`, `initMultiselect`,
`initVirtualList` and `initDropdownMenu` join `initTabs` and `initDrawer`:
each takes the rendered root element, works off the existing `data-bn` hooks
and native ARIA attributes, re-queries them on every interaction, and returns
a handle with imperative methods and `destroy()`.

- **Command palette** — typing filters by label substring (hiding empty
  groups), ArrowDown / ArrowUp rove `aria-activedescendant`, Enter or a click
  activates and closes, Escape closes, optional `hotkey: 'Mod+K'` toggles it.
  `renderCommandPalette` now gives every item an `id` and points the input's
  `aria-controls` at the list, so the footer's "↑↓ Navigate / ↵ Select / Esc
  Close" is finally true.
- **Data grid** — a header button click emits `{ key, dir }` and moves
  `data-sorted` / `aria-sort` / the ↑↓ (without `onSort`, the rows are
  reordered in place, numeric-aware); select-all and the row checkboxes keep
  each other `checked` / `indeterminate` and emit the selection; arrow keys,
  Home and End rove focus between cells.
- **Tree** — the toggle flips `aria-expanded` and shows / hides the child
  group, a click on the row selects, and the APG keys (arrows, Home, End,
  Enter, Space) move the roving `tabindex`. `renderTree` now renders a
  collapsed node's `[data-bn="tree-children"]` group `hidden` instead of
  omitting it, so expanding is an attribute flip rather than a round trip.
- **Multiselect** — a tag's × deselects in the hidden `<select multiple>`,
  which stays the source of truth; Backspace on an empty input removes the
  last tag; Enter or a `<datalist>` pick adds one. `renderMultiselect` now
  backs the search input with a `<datalist>` of the item labels.
- **Virtual list** — re-slices the window on `scroll` from the
  `data-item-height` already emitted and repositions it via `top`;
  `scrollTo`, `setItems`, `range`. `defaultRenderItem` is exported.
- **Dropdown menu** — Arrow / Home / End between items, ArrowDown / ArrowUp
  on the trigger open it, activation calls `hidePopover()`.

Types, `docs/api/components.md` and the source doc comments now agree on all
of this; the data grid and tree comments no longer say the wiring is the
caller's job.
