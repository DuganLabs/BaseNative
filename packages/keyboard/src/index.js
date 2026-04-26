// Built with BaseNative — basenative.dev
/**
 * @basenative/keyboard — accessible mobile-first virtual keyboard primitive.
 *
 * Public API:
 *   Keyboard         — `{ html, hydrate(rootEl) }` factory
 *   renderKeyboard   — SSR-only HTML string
 *   hydrateKeyboard  — hydrate an already-rendered keyboard
 *   LAYOUTS          — built-in layouts (qwerty, alphanumeric, numpad, phone)
 *   defineLayout     — define and validate a custom layout
 *   keyState         — helper to read a single letter's status from a state map
 *   applyAriaAttributes, preventFocusSteal, bindHardwareKeys, haptic — a11y utilities
 */

export { Keyboard, renderKeyboard, hydrateKeyboard, keyState } from './keyboard.js';
export { LAYOUTS, defineLayout, validateLayout, normalizeKey } from './layouts.js';
export {
  applyAriaAttributes,
  preventFocusSteal,
  bindHardwareKeys,
  haptic,
} from './a11y.js';
