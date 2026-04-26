// Built with BaseNative — basenative.dev
/**
 * Accessibility helpers for @basenative/combobox.
 *
 * Implements pieces of the WAI-ARIA APG combobox listbox pattern:
 *   - Root: role="combobox", aria-haspopup="listbox", aria-expanded
 *   - Input: aria-controls -> listbox id, aria-activedescendant -> option id
 *   - Listbox: role="listbox" (and is the popup, not the input)
 *   - Options: role="option", aria-selected
 *
 * Why virtual focus (aria-activedescendant) instead of real focus?
 * Moving DOM focus into the listbox closes the mobile-Safari soft keyboard
 * and breaks the typeahead loop. The APG explicitly endorses the
 * virtual-focus pattern for this reason.
 */

/**
 * Idempotently apply ARIA wiring to a combobox root + input + listbox.
 * Safe to call after re-render or on hydrate.
 */
export function applyAriaAttributes(rootEl, options = {}) {
  if (!rootEl || rootEl.nodeType !== 1) return;
  const input = rootEl.querySelector('[data-bn="cb-input"]');
  const listbox = rootEl.querySelector('[data-bn="cb-listbox"]');
  if (!input || !listbox) return;

  // Root: container for the combo widget
  rootEl.setAttribute('role', 'combobox');
  rootEl.setAttribute('aria-haspopup', 'listbox');
  rootEl.setAttribute('aria-expanded', options.expanded ? 'true' : 'false');

  // Input: editable single-line, autocomplete=list per APG
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', options.expanded ? 'true' : 'false');
  input.setAttribute('aria-controls', listbox.id);
  if (options.label && !input.getAttribute('aria-label')) {
    input.setAttribute('aria-label', options.label);
  }

  // Listbox: popup
  listbox.setAttribute('role', 'listbox');
  if (options.label) listbox.setAttribute('aria-label', options.label);
}

/**
 * Bind Escape to a handler at the document level scoped to this root —
 * closes the popup from anywhere inside the widget. Returns an unbind fn.
 */
export function escapeOnKeydown(rootEl, onEscape) {
  if (!rootEl || typeof rootEl.addEventListener !== 'function') return () => {};
  const handler = (e) => {
    if (e.key === 'Escape') {
      if (typeof onEscape === 'function') onEscape(e);
    }
  };
  rootEl.addEventListener('keydown', handler);
  return () => rootEl.removeEventListener('keydown', handler);
}

/**
 * Announce a transient message to screen readers via the widget's
 * aria-live region. Used for "N options available" / "Press Enter to
 * create '...'" style hints. Idempotent — safe to call repeatedly.
 */
export function announce(rootEl, message) {
  if (!rootEl || rootEl.nodeType !== 1) return;
  const live = rootEl.querySelector('[data-bn="cb-live"]');
  if (!live) return;
  // Clear-then-set so SRs re-announce the same string when it repeats.
  live.textContent = '';
  // Defer so the DOM clear is observed before the new content lands.
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => { live.textContent = String(message || ''); });
  } else {
    live.textContent = String(message || '');
  }
}
