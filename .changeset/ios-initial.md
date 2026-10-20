---
'@basenative/ios': minor
---

Initial release of `@basenative/ios` — Phase 1 of the iOS platform layer for BaseNative: the foundation token layer, no components yet. Ships the token data (`SYSTEM_COLORS`, `LABEL_COLORS`, `BACKGROUND_COLORS`, `FILL_COLORS`, `SEPARATOR_COLORS`, `LINK_COLOR`, `TYPE_STYLES`, `GLASS_MATERIALS`, `RADII`, `SPACING`, `SAFE_AREA`, `LAYOUT`, `MOTION`, plus a `PROVENANCE` map separating Apple's published values from estimates), the `tokensCss()` emitter, and the generated `tokens.css` stylesheet carrying the `--bn-ios-*` custom properties in light and dark. An original implementation informed by published iOS design values — no Apple artwork.
