---
'@basenative/builder': minor
---

Exported and canvas markup now carries the `@basenative/components` attribute
contract, so what the Builder produces is styled by the library.

A palette entry can declare `bn` — the `data-bn` token the matching render
function emits — and `dataProps`, the props that component serialises as
`data-<name>`. Both `generateBaseNative()` and the canvas renderer add
`data-bn="<bn>"` and write those props as `data-*`. Before this, a Button set
to Primary exported `<button variant="primary">`, which no rule in
`components.css` matches, so it rendered as the browser's default button in
the user's app and on the canvas alike; it now exports
`<button data-bn="button" data-variant="primary" data-size="default"
type="button">`, the same attribute set as `renderButton()`. The default
palette declares the token for `button`, `input`, `textarea` and `checkbox`,
and the button gains a `size` prop (`sm` / `default` / `lg`).
