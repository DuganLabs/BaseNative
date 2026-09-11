# Changelog

## 1.0.5

### Patch Changes

- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

- Updated dependencies [9741b75]
  - @basenative/runtime@0.6.3

## 1.0.4

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 1.0.3

### Patch Changes

- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 1.0.2

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 1.0.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: accessible combobox primitive implementing the WAI-ARIA APG combobox+listbox pattern — SSR-safe (with `<datalist>` fallback), keyboard nav, virtual focus via `aria-activedescendant`, opt-in "create new entry" affordance, pluggable filter strategies, and WCAG 2.5.5 hit-target defaults.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0

All notable changes to `@basenative/combobox` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-04-26

### Added

- Initial release. Accessible combobox primitive implementing the
  [WAI-ARIA APG combobox + listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- `Combobox` factory returning `{ html, hydrate(rootEl) }`.
- `renderCombobox` — SSR-safe HTML string output. Without JS the rendered
  markup is a plain `<input>` plus a fallback `<datalist>` so typeahead
  still works.
- `hydrateCombobox` — wires filtering, keyboard nav (Up/Down/Home/End/Enter/
  Esc/Tab), virtual focus via `aria-activedescendant`, click-outside close,
  optional signal interop via `runtime.effect`.
- "Create new entry" affordance — opt in via `allowCreate: true`. Suppressed
  automatically when the query exactly matches an existing option's label.
- Filter strategies: `defaultFilter` (substring), `prefixFilter`, `fuzzyFilter`.
  Consumers can pass any custom `(option, query) => boolean`.
- CSS-token theming via `--cb-*` custom properties. Default palette is
  WCAG AA on the default light surface.
- Layout-shift-free: listbox is `position: absolute`, never reflows the page.
- Honors `prefers-reduced-motion` and `forced-colors`.
- Default 44pt min hit target on every option (WCAG 2.5.5 AA).
- Live-region SR announcements for option count and the create-option hint.
- TypeScript declarations.
- Node `--test` suite covering SSR shape, ARIA wiring, filter logic,
  create-option suppression on exact match, keyboard dispatch, and
  click-to-commit.
