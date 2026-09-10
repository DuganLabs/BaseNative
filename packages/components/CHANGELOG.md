# @basenative/components

## 0.5.0

### Minor Changes

- 7523b61: Harden every renderer: one escaping policy, deterministic ids, accessibility fixes.

  **Escaping (behaviour change).** Every attribute interpolation (id, name, value, placeholder, alt, src, href, aria-\*, data-\*, variant/size/position) and every text-semantic field (label, helpText, error, caption, emptyMessage, item and option labels, tooltip content, breadcrumb labels, avatar name, table and grid cell values, calendar and pipeline titles) is now HTML-escaped through `@basenative/runtime/shared/escape` — the same escaper the SSR renderer uses — replacing nine private, divergent copies (one of which did not escape `<`). Designated **content slots** are not escaped and are documented as `HTML slot: not escaped; pass trusted markup only`: button/badge/alert content, card header/body/footer, dialog and drawer body and footer, accordion and tab panel content, dropdown and tooltip triggers, icons, DataGrid `render()`, custom `renderItem`, and `attrs`. `renderBadge` content was previously escaped and is now a slot.

  **Deterministic ids (behaviour change).** Generated ids are `bn-<prefix>-<n>` from a counter instead of `Math.random()`, so SSR output is stable and `aria-controls` / `aria-labelledby` pairs survive hydration. New exports `nextId(prefix)` and `resetIds()` — call `resetIds()` once per SSR request. Every renderer honours an explicit `id` first. `showToast` ids are now strings and accept `options.id`.

  **Fixes.** Tree/TreeGrid leaves no longer emit `aria-expanded="undefined"`; Input help and error get distinct `<id>-help` / `<id>-error` ids and `aria-describedby` lists both; Textarea and Select emit `aria-describedby` and an error id (Select gains `helpText`); Dialog honours `modal`; tab buttons are `type="button"`; a closed Drawer is `inert`; Progress guards `max=0`; Calendar uses local time consistently (day headers no longer shift in non-UTC zones); Avatar with an `<img>` no longer double-announces; a missing `attrs` no longer leaves a stray space.

  Tests: 136 → 301.

## 0.4.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [f7e26f4]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0
  - @basenative/forms@1.0.0

## 0.4.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
  - @basenative/forms@0.4.0
