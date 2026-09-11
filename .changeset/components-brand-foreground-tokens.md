---
"@basenative/components": minor
---

Make filled brand surfaces themable, and let badge/card/alert carry attributes.

**Brand foregrounds.** Every foreground painted on a filled brand box was hardcoded
to `--bn-color-white`: the primary and destructive button labels, the current page in
pagination, the checkbox tick, the radio dot and the toggle knob. Re-pointing
`--bn-color-primary-*` at a light brand hue therefore produced unreadable controls
with no token to fix it — overriding `--bn-color-white` would repaint every white
*surface* in the sheet instead. Four new tokens name those foregrounds:

| Token | Default |
|-------|---------|
| `--bn-color-on-primary` | `--bn-color-white` |
| `--bn-color-on-accent` | `--bn-color-on-primary` |
| `--bn-color-on-error` | `--bn-color-white` |
| `--bn-color-toggle-knob` | `--bn-color-white` |

Defaults are the previous values, so no existing theme changes. This was not
hypothetical: T4BS's amber brand (`#e8920a`) would render a primary button at 2.46:1
against white — it hand-rolled its own `[data-bn-button]` vocabulary instead of using
`renderButton`, and Greenput invented a `--gp-color-primary-fg` token it had nowhere
to connect. PendingBusiness, which *did* adopt `renderDialog`/`renderButton`, was
shipping a Confirm button at 3.66:1 and a destructive Revoke at 3.68:1 (2.72:1 on
hover) — all below the 4.5:1 WCAG 1.4.3 floor, all fixed by setting one token.

**`attrs` on `renderBadge`, `renderCard` and `renderAlert`,** plus `id` on
`renderCard`. Without them a badge, card or alert was render-and-forget markup: it
could not carry an `id`, an `aria-labelledby`, a `data-bn-bind` hydration hook or a
test selector, which ruled it out of any app that wires signals to the DOM.

**`--bn-radius-control` now reaches the button.** The shared control-geometry
group applies `border-radius: var(--bn-radius-control)` to button/input/select/tab,
and the `[data-bn="button"]` block a few rules later re-declared
`border-radius: var(--bn-radius-md)` — same specificity, later in the sheet, so it
won. A consumer that set `--bn-radius-control` got every control rounded except the
button. The defaults are identical (`--bn-radius-control` aliases `--bn-radius-md`),
so nothing moves unless the token is set.

**Surfaces split from the page.** `--bn-color-surface` was doing two jobs: the page,
and anything filled sitting on the page. Those are the same colour only on a light
theme, so every dark-themed consumer that re-pointed it watched its inputs, selects,
secondary buttons and cards dissolve into the page with a 1px border left. Two new
tokens, both defaulting to `--bn-color-surface`:

| Token | Applies to |
|-------|------------|
| `--bn-color-surface-control` | input, textarea, select, combobox input, checkbox, radio, secondary button |
| `--bn-color-surface-card` | card |

**`renderTable` can describe its cells.** Three additions, each one a thing a
consumer had already built by hand:

- `labelCells` stamps `data-label="<column label>"` on every body cell — the
  responsive stacked-table pattern (hide the `<thead>`, render each cell's heading
  from `content: attr(data-label)`). PendingBusiness hand-rolls its rows for exactly
  this.
- `column.cellAttrs` (string, or `(value, row) => string`) appends attribute markup
  to a column's cells — `data-bn="num"` for numeric alignment, a test hook, an
  `aria-*`.
- `column.srLabel` gives an accessible name to a column with no visible label.
  Without it the header was a bare `<th scope="col"></th>`, which axe flags;
  Greenput patches that in after mount, in a 100-line wrapper whose reason for
  existing is that the renderer had no per-cell hook at all.

`[data-bn="sr-only"]` joins `components.css` to support `srLabel`: `reset.css` has
the same recipe as a `.visually-hidden` class, but consumers whose house style
forbids CSS classes never import that file.

**`text` on `renderBadge`, `renderAlert` and `renderButton`** — an escaped label that
replaces the unescaped `content` slot when present. These three almost always render
data (a status, a server message, a record name), and the previous API made escaping
a thing you had to remember at every call site.
