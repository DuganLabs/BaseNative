// Built with BaseNative — basenative.dev
/**
 * Accessibility helpers for @basenative/keyboard.
 *
 * - ARIA wiring on the root region.
 * - Physical-key event delegation so a hardware keyboard mirrors
 *   the on-screen keyboard exactly (one source of truth).
 * - Focus management that does not steal focus from text inputs
 *   (which is what causes mobile Safari to also raise the native
 *   keyboard alongside ours).
 */

/**
 * Apply accessible attributes to the root keyboard element.
 * Idempotent — safe to call after re-render or on hydrate.
 */
export function applyAriaAttributes(rootEl, options = {}) {
  if (!rootEl || rootEl.nodeType !== 1) return;
  const label = options.label || 'On-screen keyboard';
  rootEl.setAttribute('role', 'region');
  rootEl.setAttribute('aria-label', label);
  // Hint to assistive tech that this is a keyboard surface, not a toolbar.
  rootEl.setAttribute('aria-roledescription', 'virtual keyboard');
}

/**
 * Mobile-Safari focus fix. Without this, tapping a key briefly
 * blurs the active text input, which makes iOS think the user
 * dismissed the field — and on the next focus it re-raises the
 * native keyboard. We swallow the mousedown so focus never moves.
 */
export function preventFocusSteal(rootEl) {
  if (!rootEl || typeof rootEl.addEventListener !== 'function') return () => {};
  const handler = (e) => {
    // Allow native focus for action keys that *should* take focus
    // (e.g. an explicit "submit" that needs to enter a form context).
    const btn = e.target && e.target.closest && e.target.closest('[data-bn-kb-key]');
    if (!btn) return;
    if (btn.dataset.bnKbFocusable === 'true') return;
    e.preventDefault();
  };
  rootEl.addEventListener('mousedown', handler);
  rootEl.addEventListener('touchstart', handler, { passive: false });
  return () => {
    rootEl.removeEventListener('mousedown', handler);
    rootEl.removeEventListener('touchstart', handler);
  };
}

/**
 * Optional haptic feedback. No-ops where unsupported.
 */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch { /* ignore */ }
}

/**
 * Bind a hardware keyboard listener that mirrors physical keys
 * onto the same dispatch pipeline as the on-screen keyboard.
 *
 * Returns an unbind function.
 */
export function bindHardwareKeys(target, handlers, options = {}) {
  if (!target || typeof target.addEventListener !== 'function') return () => {};
  const { onKey, onAction } = handlers || {};
  const charSet = options.charSet || null; // optional Set of allowed chars (uppercased)
  const handler = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') {
      if (onAction) { onAction('ENTER', e); }
      return;
    }
    if (e.key === 'Backspace') {
      if (onAction) { onAction('BACKSPACE', e); }
      return;
    }
    if (e.key && e.key.length === 1) {
      const k = e.key.toUpperCase();
      if (charSet && !charSet.has(k)) return;
      if (onKey) { onKey(k, e); }
    }
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
