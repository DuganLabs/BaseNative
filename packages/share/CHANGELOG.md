# Changelog — @basenative/share

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: Native Web Share + clipboard fallback client, share-card mint endpoint, OG-redirect landing page generator, D1-shaped store, and a ready-to-apply migration — pairs with `@basenative/og-image` for per-card preview rendering.

### Patch Changes

- Updated dependencies [3ce5feb]
  - @basenative/og-image@0.2.0

## 0.1.0 — initial release

- `nativeShare` — Web Share API → clipboard fallback, AbortError-aware
- `mintShareCard` — POST helper for the share-card endpoint
- `composeShareText` — `${var}` templater
- `defineShareCards` — D1-shaped store with create/get
- `mintHandler` — drop-in POST `/api/share-cards`
- `landingHandler` — drop-in GET `/s/{id}` with per-card OG meta
- `buildLandingHtml` / `escHtml` — composable HTML builders
- Migration `0001_share_cards.sql`
