---
"@basenative/builder": patch
---

`<bn-builder>` registered two `bn-palette-add` listeners, so every palette click, Enter/Space activation, or drag-drop added the component twice. Only the container-aware listener (`_wirePaletteAdd`) remains. Also fixed the canvas pane rendering a nested `<main>` landmark inside the host page's `<main>`; it is now a `<section aria-label="Canvas">`.
