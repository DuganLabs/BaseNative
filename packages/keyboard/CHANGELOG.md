# Changelog

All notable changes to `@basenative/keyboard` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-04-26

### Added
- Initial release. Extracted from the `t4bs` production game keyboard.
- `Keyboard` factory returning `{ html, hydrate(rootEl) }`.
- `renderKeyboard` — SSR-safe HTML string output (semantic `<button>` per key,
  works with JS disabled).
- `hydrateKeyboard` — wires tap dispatch, hardware-key mirroring, signal-driven
  per-key state classes, and the mobile-Safari focus-steal fix.
- Built-in layouts: `qwerty`, `alphanumeric`, `numpad`, `phone`.
- `defineLayout(rows)` for custom layouts; `validateLayout` shape checker.
- `keyState(stateOrGetter, letter)` helper for cross-component status reads.
- A11y utilities: `applyAriaAttributes`, `preventFocusSteal`, `bindHardwareKeys`,
  `haptic`.
- CSS-token theming via `--kb-*` custom properties. Default palette is
  WCAG AA on the default dark surface.
- Honors `prefers-reduced-motion` (drops scale-press animation).
- Default 44pt min hit target (WCAG 2.5.5 AA).
- Optional `navigator.vibrate(8)` haptic on tap; opt-out via `haptic: false`.
- TypeScript declarations.
- Node `--test` suite covering layout shape, render output, hydration dispatch,
  reactive state class application, and runtime-effect re-runs.
