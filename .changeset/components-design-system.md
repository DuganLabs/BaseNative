---
"@basenative/components": minor
---

Design-system pass over the shared CSS so the 33 components read as one system:

- **Contrast**: input, checkbox, radio, select, combobox, multiselect, datagrid checkbox, spinner track, skeleton and toggle track borders meet WCAG 1.4.11 (3:1) through a new `--bn-color-border-control` token; `--bn-color-text-subtle` and error text meet 4.5:1 in both themes (new `--bn-color-error-fg`).
- **One control-height ladder** (40px default, `data-size="sm"`/`"lg"` = 32/48) shared by button, input, select, combobox, dropdown trigger, pagination and tabs instead of five different heights.
- **Overlays**: dialog and command palette centre again; dropdown menu and tooltip anchor to their trigger (absolute fallback, `anchor-name` progressive enhancement).
- **Theme-safe state**: tree selection, table zebra, toggle track, calendar events and pipeline drop targets route through tokens defined in both light and dark palettes; nine previously undefined custom properties are now defined.
- **Hit areas**: every interactive control gets a 24×24 minimum target without changing its visible size; one shared `:focus-visible` rule (the command input previously had no focus indicator).
- **Tokens**: `--bn-radius-control/-container/-modal`, `--bn-shadow-modal`, `--bn-motion-fast/-base/-slow`, `--bn-scrim`; toast variants get a left accent bar.
- **Packaging**: the main export now carries a `types` condition so TypeScript consumers resolve `types/index.d.ts` without a local shim; `./layers.css` is exported (it was missing from the 0.5.0 tarball).
