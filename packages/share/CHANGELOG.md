# Changelog — @basenative/share

## 0.1.0 — initial release

- `nativeShare` — Web Share API → clipboard fallback, AbortError-aware
- `mintShareCard` — POST helper for the share-card endpoint
- `composeShareText` — `${var}` templater
- `defineShareCards` — D1-shaped store with create/get
- `mintHandler` — drop-in POST `/api/share-cards`
- `landingHandler` — drop-in GET `/s/{id}` with per-card OG meta
- `buildLandingHtml` / `escHtml` — composable HTML builders
- Migration `0001_share_cards.sql`
