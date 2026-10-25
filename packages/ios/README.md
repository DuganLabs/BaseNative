# @basenative/ios

> **Deprecated at repo level.** The BaseNative design system lives in
> `@basenative/components`. This package is retired; its token values live
> on in `@basenative/components`' tokens.css.

The iOS platform layer for BaseNative — the foundation tokens an app needs
to look and move like it belongs on an iPhone: Liquid Glass materials, the
system colours, the Dynamic Type scale, the layout constants and the
spring motion presets, all as `--bn-ios-*` CSS custom properties in light
and dark.

**Phase 1 is the foundation only.** This package ships tokens, not
components. The Tier 1 components that consume them — navigation bar, tab
bar, grouped list, sheet, segmented control — are the next phase of the
fork and will read these names rather than inventing their own values.
Phase 1.5 adds the fold standard for the iPhone Duo: the breakpoint and
segment tokens, and the posture helpers that keep content off the
crease.

Zero production dependencies. Hand-written JS, hand-written types,
`node --test`.

The iOS 27 and macOS 27 kit colour table, control metrics, and semantic
controls live in `@basenative/platform`. This package’s system colours
stay the classic UIColor values (`#007aff` and the rest) that the
express site already consumes.

```
@basenative/ios            every token group + tokensCss, POSTURE_MEDIA,
                           postureCss
@basenative/ios/tokens     PROVENANCE, SYSTEM_COLORS, LABEL_COLORS,
                           BACKGROUND_COLORS, FILL_COLORS, SEPARATOR_COLORS,
                           LINK_COLOR, FONT_FAMILIES, TYPE_STYLES,
                           GLASS_MATERIALS, RADII, SPACING, SAFE_AREA,
                           LAYOUT, BREAKPOINTS, FOLD, MOTION
@basenative/ios/css        tokensCss — the stylesheet, emitted from the data
@basenative/ios/posture    POSTURE_MEDIA, postureCss — the fold standard:
                           the posture media queries and utility sheet
@basenative/ios/tokens.css the stylesheet as a file, generated
```

---

## Using the tokens

### As CSS

```css
@import '@basenative/ios/tokens.css';
```

or link `tokens.css` directly. The sheet lives in `@layer tokens` and
follows the same appearance rules as `@basenative/components`: light by
default, dark under `prefers-color-scheme` unless the page says
`data-theme="light"`, and dark whenever the page says `data-theme="dark"`.

```css
.card {
  background: var(--bn-ios-glass-regular-tint);
  backdrop-filter: var(--bn-ios-glass-regular-backdrop);
  box-shadow: var(--bn-ios-glass-regular-shadow);
  border-radius: var(--bn-ios-radius-xl);
  font: var(--bn-ios-font-body);
}
```

### As data

```js
import { SYSTEM_COLORS, TYPE_STYLES, tokensCss } from '@basenative/ios';

SYSTEM_COLORS.blue; // { light: '#007aff', dark: '#0a84ff' }
TYPE_STYLES.largeTitle; // { size: 34, leading: 41, weight: 400, ... }
tokensCss(); // the stylesheet, for serving or adopting at runtime
```

`src/tokens.js` is the single source. `src/tokens.css` is generated from
it — regenerate with `node packages/ios/generate.js`, never edit the
sheet. A test fails when the two drift.

## What is in the foundation

| Group   | Tokens                                                                                                                       | Contents                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colours | `--bn-ios-color-*`                                                                                                           | the system palette, label steps, backgrounds (plain and grouped), fills, separators, link — each in light and dark                                |
| Type    | `--bn-ios-font-*`                                                                                                            | the eleven Dynamic Type styles: size, leading, weight, tracking, and a composed `font` shorthand per style, on the text and display faces         |
| Glass   | `--bn-ios-glass-*`                                                                                                           | four materials (`ultra-thin`, `thin`, `regular`, `thick`): blur, saturate, composed backdrop, plus per-appearance tint, edge highlight and shadow |
| Layout  | `--bn-ios-radius-*`, `--bn-ios-space-*`, `--bn-ios-safe-*`, `--bn-ios-margin*`, `--bn-ios-hairline`, `--bn-ios-scroll-edge*` | the radius scale, the 8pt spacing grid, the device safe-area insets as `env()`, the standard margins, and the scroll-edge fade                    |
| Fold    | `--bn-ios-breakpoint-*`, `--bn-ios-fold-*`                                                                                   | the named size-class stops (`watch` to `wide`, with the Duo's `duo-cover` and `duo-inner`), and the fold geometry the device reports at runtime   |
| Motion  | `--bn-ios-motion-*`                                                                                                          | four presets (`spring`, `spring-bouncy`, `spring-stiff`, `fade`) as duration, curve, and composed shorthand                                       |

## Foldables — the Duo standard

The iPhone Duo is a single vertical fold with two postures, and the
foundation names both. Folded, it is a single pane — the 5.4-inch cover
display, a wide phone class. Unfolded, the viewport spans two segments
of the 7.6-inch inner display across a hinge, and content belongs in
one segment or the other, never straddling the crease.

Two signals, kept separate. The `spanning` media feature is the
posture itself — true exactly when the viewport crosses the fold. The
breakpoint tokens are the size neighbourhood: `duoInner` (939px, the
inner display's short edge) says a viewport has unfolded room, which an
unfolded Duo always has and an iPad also has. Ask `spanning` about the
fold; ask width about room.

```js
import { POSTURE_MEDIA, postureCss } from '@basenative/ios/posture';
```

`POSTURE_MEDIA` carries the queries as strings — `singlePane`,
`spanningVertical`, and the `duoCover` / `duoInner` width classes
derived from the token. `postureCss()` emits the utility sheet:
`.bn-ios-panes` is a one-column container that becomes, when spanning,
a two-column grid whose columns are the segments themselves and whose
gap is the hinge the device measures; `.bn-ios-pane` keeps the crease
clearance (`--bn-ios-fold-crease-safe-margin`) on the fold-facing
sides; `.bn-ios-crease-avoid` caps an element at one segment's width in
any posture. The segment values are the `env(viewport-segment-*)`
expressions in the `FOLD` tokens, each with a single-pane fallback, so
every helper is safe on screens that do not fold.

## Tokens provenance

This package is an **original implementation informed by Apple's
published design specifications** — the same relationship a UI library
has to a platform HIG. It contains no Apple artwork, no SF Symbols
files, and no assets from Apple's Figma kits; the kit's role is a
measurement reference for a later refinement pass.

Not every value has the same standing, and the package says which is
which — in `PROVENANCE` in `src/tokens.js`, where a test keeps the map
complete, and here:

| Group                                                       | Standing       | Why                                                                                                                                                                                                   |
| ----------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System, label, background, fill and separator colours; link | **Documented** | Apple publishes these values (developer documentation, _System Colors_)                                                                                                                               |
| Type sizes, leading, weights                                | **Documented** | The HIG typography table for the eleven Dynamic Type styles at the default size                                                                                                                       |
| Font families                                               | **Documented** | The platform's own stacks                                                                                                                                                                             |
| Spacing                                                     | **Documented** | The 8pt layout grid is HIG layout guidance                                                                                                                                                            |
| Type tracking                                               | **Estimate**   | Approximated from the platform's per-size tracking behaviour                                                                                                                                          |
| Glass (all channels)                                        | **Estimate**   | Liquid Glass is a rendered material; Apple publishes no blur/tint/shadow values. These are fitted approximations                                                                                      |
| Radii                                                       | **Estimate**   | iOS 27 radii are described as a concentric system, not one published ladder                                                                                                                           |
| Layout constants                                            | **Estimate**   | Margins are HIG-standard; hairline and scroll-edge height are fitted                                                                                                                                  |
| Fold geometry                                               | **Documented** | The viewport-segment `env()` API is the web standard, and the Duo's segment count and panel geometry are announced specs; the one fitted value is the crease clearance, set to the 16pt spacing step  |
| Breakpoints                                                 | **Estimate**   | The stops are CSS-pixel classes derived from the announced physical geometry (the cover at its @3 logical width, the inner display at @2); the names are the contract, the numbers refine on hardware |
| Motion                                                      | **Estimate**   | UIKit springs are response/damping pairs; the cubic-bezier curves are fitted to them                                                                                                                  |

The kit measurement pass landed in `@basenative/platform`. The estimate
groups in this package were left as they are, so existing consumers of
`--bn-ios-*` do not change.

## License

Apache-2.0.
