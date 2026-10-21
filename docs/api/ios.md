# @basenative/ios

> The iOS platform layer for BaseNative — foundation tokens first

## Overview

`@basenative/ios` carries the design foundation an app needs to look and
move like it belongs on an iPhone: Liquid Glass materials, the system
colours, the Dynamic Type scale, layout constants and spring motion
presets, as `--bn-ios-*` CSS custom properties in light and dark. Phase 1
ships tokens only; the Tier 1 components that consume them come later
and read these names.

## Installation

```bash
npm install @basenative/ios
```

## Usage

```css
@import '@basenative/ios/tokens.css';

.card {
  background: var(--bn-ios-glass-regular-tint);
  backdrop-filter: var(--bn-ios-glass-regular-backdrop);
  border-radius: var(--bn-ios-radius-xl);
  font: var(--bn-ios-font-body);
}
```

```js
import { SYSTEM_COLORS, tokensCss } from '@basenative/ios';
```

## API

### Token data — `@basenative/ios/tokens`

- `SYSTEM_COLORS` — the system colour palette (blue, green, indigo,
  orange, pink, purple, red, teal, yellow, mint, cyan, brown, and the
  six-step gray ramp), each a `{ light, dark }` pair of published sRGB
  values.
- `LABEL_COLORS` — text colours by prominence: `label`, `secondary`,
  `tertiary`, `quaternary`, `placeholder`.
- `BACKGROUND_COLORS` — `base`, `secondary`, `tertiary`, and the grouped
  page steps `grouped`, `groupedSecondary`, `groupedTertiary`.
- `FILL_COLORS` — translucent control fills: `base`, `secondary`,
  `tertiary`, `quaternary`.
- `SEPARATOR_COLORS` — `separator` (compositing) and `opaque` (its solid
  twin).
- `LINK_COLOR` — the link colour; the system blue by role.
- `FONT_FAMILIES` — the `text` and `display` font stacks.
- `TYPE_STYLES` — the eleven Dynamic Type styles (`largeTitle`,
  `title1`, `title2`, `title3`, `headline`, `body`, `callout`,
  `subheadline`, `footnote`, `caption1`, `caption2`), each with `size`
  and `leading` in points, `weight`, `tracking` in em, and its `family`.
- `GLASS_MATERIALS` — the material ladder (`ultraThin`, `thin`,
  `regular`, `thick`); each step has `blur`, `saturate`, and per
  appearance `tint`, `highlight`, `shadow`.
- `RADII` — the corner-radius scale, `none` through `pill`.
- `SPACING` — the 8pt spacing grid, steps 1–8.
- `SAFE_AREA` — the four device insets as `env()` values.
- `LAYOUT` — `margin`, `marginWide`, `hairline`, `scrollEdge`.
- `BREAKPOINTS` — the named size-class stops as min-widths in CSS px,
  ascending: `watch` (100), `phone` (390), `duoCover` (446, the Duo's
  5.4-inch cover display class), `tablet` (768), `duoInner` (939, the
  7.6-inch inner display's short edge), `desktop` (1024), `wide`
  (1600).
- `FOLD` — the fold geometry the device reports at runtime: `segments`
  (2), `segmentWidth` / `segmentHeight` / `secondSegmentLeft` as
  `env(viewport-segment-*)` expressions with single-pane fallbacks, and
  `creaseSafeMargin`, the clearance kept between content and the fold.
- `MOTION` — the presets `spring`, `springBouncy`, `springStiff`,
  `fade`, each a `{ duration, timing }` pair.
- `PROVENANCE` — per group, whether its values are `documented`
  (published by Apple) or `estimate` (fitted here); see the package
  README's "Tokens provenance".

### Stylesheet — `@basenative/ios/css`

- `tokensCss()` — the complete foundation stylesheet, emitted from the
  token data: `@layer tokens`, light on `:root`, dark under
  `prefers-color-scheme` (yielding to `data-theme="light"`) and under
  `data-theme="dark"`.

### Stylesheet file — `@basenative/ios/tokens.css`

The same stylesheet as a static file, generated from the data by
`generate.js`; importing it is the zero-JS route.

### Fold posture — `@basenative/ios/posture`

- `POSTURE_MEDIA` — the posture media queries as strings:
  `singlePane` (`(spanning: none)`), `spanningVertical`
  (`(spanning: single-fold-vertical)`), and the Duo width classes
  `duoCover` / `duoInner`, derived from the `duoInner` breakpoint so
  the two meet exactly at its edge.
- `postureCss()` — the posture utility sheet, in `@layer layout`:
  `.bn-ios-panes` (one column folded; when spanning, a two-column grid
  whose columns are the device segments and whose gap is the hinge),
  `.bn-ios-pane` (keeps the crease safe margin on the fold-facing
  sides), and `.bn-ios-crease-avoid` (never wider than one segment).
