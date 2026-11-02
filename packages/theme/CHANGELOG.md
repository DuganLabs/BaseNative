# @basenative/theme

## 3.2.0

### Patch Changes

- 7e18c9a: The docs-site tokens now live in the one token sheet (`tokens.css`, from `tokens/site.json`), and DESIGN.md is the design contract. No computed value changed.
- 898544e: Subnav: a sticky one-row page nav that scrolls sideways (the current link stays in view), with an optional header slot for a search field; one row at ≥64rem. `search-field` takes a `placeholder`. Table: a `numeric` prop marks columns whose heading and cells align to the trailing edge in tabular figures. Toast: the stack takes one width and the message fills the item, so the dismiss action sits at its trailing edge; a fixed stack clears the phone app bar. The playground surface token is the card surface. theme: `--spacing-safe-top` is listed as upstream-owned. site: one page nav, search/filter and card recipe on Home, Compare, Components, Docs, AI, Playground and Builder; a centre-line scrollspy; the playground counter logs; a table scrolls inside its card instead of widening the page; compare verdict marks hang beside their first word (tokens `--size-compare-marker-hang`, `--spacing-compare-marker-top`).
- c33c958: Vertical rhythm is now part of the app shell. New tokens `--spacing-app-shell-section-gap` (48px on a phone, `--spacing-app-shell-section-gap-rail` 80px beside the rail) and `--spacing-app-shell-stack-gap` (16px) space the page's sections and the cards stacked inside them, so no page spaces its sections by hand. Adds `--spacing-20`, `--white-space-pre` and `--white-space-pre-wrap`. Code blocks, and bare reading `<pre>`s, wrap long lines on a phone (`--white-space-code-block-pre-phone`, `--overflow-wrap-code-block-pre-phone`) instead of clipping them at the card edge. The theme bridge lists `--spacing-20` as upstream-owned.
- 0cb0ab4: The bridge leaves `--layer-chrome` upstream, with the rest of the stacking order.

## 3.1.0

No changes in this release.

## 3.0.0

No changes in this release.

## 2.4.0

No changes in this release.

## 2.3.2

No changes in this release.

## 2.3.1

No changes in this release.

## 2.3.0

No changes in this release.

## 2.2.0

No changes in this release.

## 2.1.0

No changes in this release.

## 2.0.1

No changes in this release.

## 2.0.0

No changes in this release.

## 0.3.1

### Patch Changes

- ae4701e: First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

  Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

  The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.

## 0.3.0

### Minor Changes

- d0dff55: Bring checkbox, radio and toggle back into the control family, and give the
  selection controls their own tokens.

  The three selection controls had drifted out of the design system the text
  controls belong to. The toggle carried no border at all next to four outlined
  controls; the three of them were three hardcoded sizes; none had a hover,
  disabled or invalid treatment, so a disabled checkbox was pixel-identical to a
  live one while the input beside it correctly dimmed; and an `:indeterminate`
  checkbox — which the datagrid's select-all reaches on partial selection —
  rendered as an empty box, indistinguishable from "nothing selected".

  - New tokens: `--bn-color-control-selected` / `--bn-color-on-control-selected`
    (one selection colour for all three, where checkbox and radio previously
    painted `--bn-color-accent-600` and the toggle `--bn-color-primary-600`),
    `--bn-color-border-control-hover`, `--bn-control-indicator-size`,
    `--bn-radius-indicator`, and the `--bn-toggle-*` geometry derived from the
    indicator size.
  - `--bn-color-toggle-track-off` and `--bn-color-toggle-knob` now describe an
    outlined off state rather than a filled one, matching the unchecked checkbox.
  - `@basenative/theme` gains `control.indicator`, bridged as
    `--bn-theme-control-indicator`, so a theme that scales its control height
    scales the selection controls with it.
  - The datagrid's select-all and row-select checkboxes join the family. They
    carry their own `data-bn` names for the grid script, so they had never matched
    `[data-bn="checkbox"]` and rendered as raw user-agent checkboxes inside an
    otherwise fully themed table.
  - `input`, `textarea` and `select` now honour `--bn-radius-control`. They
    re-declared `--bn-radius-md` after the control primitive had applied it, so a
    consumer setting the token got a rounded button and a square input.

  Accessibility, in the same pass: the tree's roving `tabindex` moves onto the
  element carrying `role="treeitem"` rather than a presentational `<div>` inside
  it, and the virtual list's scroll port is keyboard-reachable and named.

## 0.2.0

### Minor Changes

- 84900fd: Bring checkbox, radio and toggle back into the control family, and give the
  selection controls their own tokens.

  The three selection controls had drifted out of the design system the text
  controls belong to. The toggle carried no border at all next to four outlined
  controls; the three of them were three hardcoded sizes; none had a hover,
  disabled or invalid treatment, so a disabled checkbox was pixel-identical to a
  live one while the input beside it correctly dimmed; and an `:indeterminate`
  checkbox — which the datagrid's select-all reaches on partial selection —
  rendered as an empty box, indistinguishable from "nothing selected".

  - New tokens: `--bn-color-control-selected` / `--bn-color-on-control-selected`
    (one selection colour for all three, where checkbox and radio previously
    painted `--bn-color-accent-600` and the toggle `--bn-color-primary-600`),
    `--bn-color-border-control-hover`, `--bn-control-indicator-size`,
    `--bn-radius-indicator`, and the `--bn-toggle-*` geometry derived from the
    indicator size.
  - `--bn-color-toggle-track-off` and `--bn-color-toggle-knob` now describe an
    outlined off state rather than a filled one, matching the unchecked checkbox.
  - `@basenative/theme` gains `control.indicator`, bridged as
    `--bn-theme-control-indicator`, so a theme that scales its control height
    scales the selection controls with it.
  - The datagrid's select-all and row-select checkboxes join the family. They
    carry their own `data-bn` names for the grid script, so they had never matched
    `[data-bn="checkbox"]` and rendered as raw user-agent checkboxes inside an
    otherwise fully themed table.
  - `input`, `textarea` and `select` now honour `--bn-radius-control`. They
    re-declared `--bn-radius-md` after the control primitive had applied it, so a
    consumer setting the token got a rounded button and a square input.

  Accessibility, in the same pass: the tree's roving `tabindex` moves onto the
  element carrying `role="treeitem"` rather than a presentational `<div>` inside
  it, and the virtual list's scroll port is keyboard-reachable and named.

- 294e449: Add `@basenative/theme` — the theme layer that drives `@basenative/components`.

  One library, many themes. A property declares a four-tier token shape (ramps →
  surfaces/ink → roles → signal families), and gets back a CSS emitter, a WCAG
  contrast harness that fails the build on a real miss, an icon discipline, and
  the `--bn-*` bridge. No palette ships in the package, on purpose.

  - `@basenative/theme` — `defineTheme`, `validateTheme`, `toCss`, `bridgeToBn`
  - `@basenative/theme/contrast` — relative-luminance maths and the `var()` resolver
  - `@basenative/theme/audit` — `auditPairings` / `assertPairings` /
    `assertThemeContrast`, which writes the pairing table from a theme's own shape
    so a signal family cannot be added without being measured
  - `@basenative/theme/css` — `minifyCss`
  - `@basenative/theme/icons` — `defineIconSet` / `renderIcon` / `validateIconSet`
  - `@basenative/theme/bridge.css` — the bridge as a stylesheet, in `@layer tokens`

  `scheme` is required and has no default (`'light' | 'dark' | 'dual'`), and a
  single-scheme theme emits one unconditioned block. That closes the failure mode
  pendingbusiness.com shipped: a dark-only site that never declared `data-theme`
  fell through `@media (prefers-color-scheme: dark)` on a light-mode OS and
  rendered a near-white alert on a near-black page.

  Zero production dependencies.
