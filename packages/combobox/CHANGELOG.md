# Changelog

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
