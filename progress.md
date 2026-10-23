# Design system progress

Session date: 2026-10-22

## Tier

One system branch, `cursor/apple27-system-98aa`, on main (`fe51b10`, #294). Molecules, organisms, and templates are in this tree. Brand amber, shared elevation, and Liquid Glass are in the same change as the routes.

The Builder is a macOS window: organism palette, canvas, layers, inspector. Site routes use the organism contract (`bn-hero`, `bn-list`, `bn-card-grid`, `bn-metric`, `bn-sidebar`, `bn-empty-state`, `bn-search`). Scrollbar and refraction render on `/design-system`.

This note is not a ready-to-merge claim. Production still serves #294 until this pull request merges and its deploy is green.

## Coverage

Source: `docs/design-system/coverage.json`, checked by `node scripts/design-system-coverage.js --check`. Pass still comes only from `verified.json`. Scrollbar and refraction rest states are rendered and stay pending until a gate records them.

## Deploy

Not live. #294 (`fe51b10`) is what basenative.com serves.
