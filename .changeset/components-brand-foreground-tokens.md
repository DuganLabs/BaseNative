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

**`text` on `renderBadge`, `renderAlert` and `renderButton`** — an escaped label that
replaces the unescaped `content` slot when present. These three almost always render
data (a status, a server message, a record name), and the previous API made escaping
a thing you had to remember at every call site.
