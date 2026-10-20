# @basenative/ios

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
