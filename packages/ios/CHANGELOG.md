# @basenative/ios

## 2.3.2

No changes in this release.

## 2.3.1

No changes in this release.

## 2.3.0

No changes in this release.

## 0.2.0

### Minor Changes

- 66f1fd4: Phase 1.5 of `@basenative/ios` — the fold standard for the iPhone Duo. The token layer gains the `BREAKPOINTS` group (the named size-class stops from `watch` to `wide`, with the Duo's two classes: `duoCover`, the 5.4-inch cover display, and `duoInner`, the 7.6-inch inner display's short edge) and the `FOLD` group (the segment count and the `env(viewport-segment-*)` geometry the device reports at runtime, each with a single-pane fallback, plus the crease safe margin). A new `@basenative/ios/posture` subpath ships `POSTURE_MEDIA` — the spanning posture queries and the Duo width classes, derived from the breakpoint token — and `postureCss()`, the utility sheet whose spanning pane grid is sized by the segments themselves, gapped by the hinge, and keeps content off the crease. An original implementation informed by Apple's announced Duo specifications — no Apple artwork.
- 4f5276e: Initial release of `@basenative/ios` — Phase 1 of the iOS platform layer for BaseNative: the foundation token layer, no components yet. Ships the token data (`SYSTEM_COLORS`, `LABEL_COLORS`, `BACKGROUND_COLORS`, `FILL_COLORS`, `SEPARATOR_COLORS`, `LINK_COLOR`, `TYPE_STYLES`, `GLASS_MATERIALS`, `RADII`, `SPACING`, `SAFE_AREA`, `LAYOUT`, `MOTION`, plus a `PROVENANCE` map separating Apple's published values from estimates), the `tokensCss()` emitter, and the generated `tokens.css` stylesheet carrying the `--bn-ios-*` custom properties in light and dark. An original implementation informed by published iOS design values — no Apple artwork.

All notable changes to `@basenative/ios` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-10-20

### Added

- Initial release — Phase 1 of the iOS platform layer: the foundation
  token layer only, no components.
- Token data in `src/tokens.js`: the system colour palette, label,
  background, fill and separator colours (light and dark), the eleven
  Dynamic Type text styles, four Liquid Glass materials, the radius and
  spacing scales, safe-area insets, layout constants and four spring
  motion presets — with a `PROVENANCE` map recording which groups are
  Apple's published values and which are estimates.
- `tokensCss()` in `src/css.js` emitting the `--bn-ios-*` stylesheet in
  `@layer tokens`, with the components layer's appearance rules
  (OS-driven dark unless overridden, explicit `data-theme="dark"` wins),
  and the generated `tokens.css` subpath for a plain CSS import.
- Full TypeScript declarations, guarded against runtime drift by
  `types/exports.test.js`.
