# Changelog

## 1.0.2

### Patch Changes

- 66775c8: Fix iPhone keyboard taps not registering.

  `preventFocusSteal` calls `e.preventDefault()` on `touchstart` to keep
  text inputs focused when the user taps an on-screen keyboard key. On
  iOS Safari, that also suppresses the synthetic `click` event that
  would otherwise reach the dispatch handler — so taps never fired the
  `onKey`/`onAction` callbacks on iPhone. Desktop was unaffected because
  `mousedown.preventDefault` doesn't suppress click.

  `hydrateKeyboard` now also listens on `touchend` and dispatches keys
  from there, calling `preventDefault` to swallow the (already-suppressed)
  synthetic click. The desktop click path is unchanged.

- Updated dependencies [ce9ff49]
  - @basenative/runtime@0.4.2

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: accessible mobile-first on-screen virtual keyboard primitive — SSR-safe render, signal-driven per-key state coloring, built-in qwerty/alphanumeric/numpad/phone layouts, WCAG AA defaults, and the mobile-Safari focus-steal fix baked in.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0

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
