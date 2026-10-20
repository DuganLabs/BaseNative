# @basenative/ios

The iOS platform layer for BaseNative — the foundation tokens an app needs
to look and move like it belongs on an iPhone: Liquid Glass materials, the
system colours, the Dynamic Type scale, the layout constants and the
spring motion presets, all as `--bn-ios-*` CSS custom properties in light
and dark.

**Phase 1 is the foundation only.** This package ships tokens, not
components. The Tier 1 components that consume them — navigation bar, tab
bar, grouped list, sheet, segmented control — are the next phase of the
fork and will read these names rather than inventing their own values.

Zero production dependencies. Hand-written JS, hand-written types,
`node --test`.

```
@basenative/ios            every token group + tokensCss
@basenative/ios/tokens     PROVENANCE, SYSTEM_COLORS, LABEL_COLORS,
                           BACKGROUND_COLORS, FILL_COLORS, SEPARATOR_COLORS,
                           LINK_COLOR, FONT_FAMILIES, TYPE_STYLES,
                           GLASS_MATERIALS, RADII, SPACING, SAFE_AREA,
                           LAYOUT, MOTION
@basenative/ios/css        tokensCss — the stylesheet, emitted from the data
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
| Motion  | `--bn-ios-motion-*`                                                                                                          | four presets (`spring`, `spring-bouncy`, `spring-stiff`, `fade`) as duration, curve, and composed shorthand                                       |

## Tokens provenance

This package is an **original implementation informed by Apple's
published design specifications** — the same relationship a UI library
has to a platform HIG. It contains no Apple artwork, no SF Symbols
files, and no assets from Apple's Figma kits; the kit's role is a
measurement reference for a later refinement pass.

Not every value has the same standing, and the package says which is
which — in `PROVENANCE` in `src/tokens.js`, where a test keeps the map
complete, and here:

| Group                                                       | Standing       | Why                                                                                                              |
| ----------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| System, label, background, fill and separator colours; link | **Documented** | Apple publishes these values (developer documentation, _System Colors_)                                          |
| Type sizes, leading, weights                                | **Documented** | The HIG typography table for the eleven Dynamic Type styles at the default size                                  |
| Font families                                               | **Documented** | The platform's own stacks                                                                                        |
| Spacing                                                     | **Documented** | The 8pt layout grid is HIG layout guidance                                                                       |
| Type tracking                                               | **Estimate**   | Approximated from the platform's per-size tracking behaviour                                                     |
| Glass (all channels)                                        | **Estimate**   | Liquid Glass is a rendered material; Apple publishes no blur/tint/shadow values. These are fitted approximations |
| Radii                                                       | **Estimate**   | iOS 27 radii are described as a concentric system, not one published ladder                                      |
| Layout constants                                            | **Estimate**   | Margins are HIG-standard; hairline and scroll-edge height are fitted                                             |
| Motion                                                      | **Estimate**   | UIKit springs are response/damping pairs; the cubic-bezier curves are fitted to them                             |

When the iOS 27 Figma kit is duplicated into the owner's workspace (Step
0 of the fork scope), the estimate groups get refined against the kit's
styles. The documented groups should already agree with it.

## License

Apache-2.0.
