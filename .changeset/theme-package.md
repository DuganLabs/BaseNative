---
"@basenative/theme": minor
---

Add `@basenative/theme` — the theme layer that drives `@basenative/components`.

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
