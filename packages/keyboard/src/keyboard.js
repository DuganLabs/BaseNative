// Built with BaseNative — basenative.dev
/**
 * Keyboard primitive — renders an on-screen keyboard from a layout
 * and (optionally) hydrates signal-driven per-key state coloring.
 *
 * Two surfaces, one behavior:
 *
 *   1. `renderKeyboard(options)` — returns an SSR-safe HTML string
 *      consisting of semantic <button> elements. Works without JS.
 *
 *   2. `Keyboard(options)` — convenience wrapper that returns
 *      `{ html, hydrate(rootEl) }`. Calling `hydrate` wires up
 *      tap dispatch, hardware-key mirroring, signal-driven
 *      per-key classes, and the mobile-Safari focus fix.
 *
 * Both share the same DOM, so the difference is purely about
 * when/where you wire up reactivity.
 */

import { LAYOUTS, validateLayout, normalizeKey } from './layouts.js';
import { applyAriaAttributes, preventFocusSteal, bindHardwareKeys, haptic } from './a11y.js';

const KEY_STATE_CLASS = {
  green: 'bn-kb-key--green',
  yellow: 'bn-kb-key--yellow',
  present: 'bn-kb-key--yellow', // alias — matches t4bs naming
  absent: 'bn-kb-key--absent',
  staked: 'bn-kb-key--staked',
};

/**
 * Resolve a layout option into a normalized layout.
 * Accepts: a layout object, a built-in name ('qwerty'), or an array of rows.
 */
function resolveLayout(input) {
  if (!input) return LAYOUTS.qwerty;
  if (typeof input === 'string') {
    const named = LAYOUTS[input];
    if (!named) throw new Error(`Unknown layout: ${input}`);
    return named;
  }
  if (Array.isArray(input)) {
    return { rows: input.map(row => row.map(normalizeKey)), name: 'custom' };
  }
  validateLayout(input);
  return input;
}

/**
 * Build the className list for a key in its initial (static) state.
 * Reactive states are layered on later by `hydrate()`.
 */
function keyClasses(key, primary) {
  const cls = ['bn-kb-key'];
  if (key.type === 'action') cls.push('bn-kb-key--action');
  if (key.span && key.span !== 1) cls.push('bn-kb-key--wide');
  if (key.variant) cls.push(`bn-kb-key--${key.variant}`);
  if (primary && key.type === 'action' && key.key === primary) {
    cls.push('bn-kb-key--primary');
  }
  return cls.join(' ');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render the keyboard as an HTML string. Pre-paint friendly —
 * works in SSR, hydrates cleanly client-side.
 *
 * Options:
 *   layout       — layout object or built-in name ('qwerty', 'numpad', ...)
 *   label        — aria-label (default: "On-screen keyboard")
 *   primary      — action key name to highlight (e.g. 'ENTER')
 *   disabled     — render the entire keyboard disabled
 *   id           — root element id (auto-generated otherwise)
 *   theme        — optional theme name applied as data-theme
 */
export function renderKeyboard(options = {}) {
  const layout = resolveLayout(options.layout);
  const id = options.id || `bn-kb-${Math.random().toString(36).slice(2)}`;
  const label = options.label || 'On-screen keyboard';
  const primary = options.primary || null;
  const themeAttr = options.theme ? ` data-theme="${escapeHtml(options.theme)}"` : '';
  const disabledAll = options.disabled === true;

  const rowsHtml = layout.rows
    .map((row, ri) => {
      const keys = row
        .map((rawKey) => {
          const key = normalizeKey(rawKey);
          const cls = keyClasses(key, primary);
          const ariaLabel =
            key.type === 'action'
              ? `${key.key} key`
              : `${key.label} key`;
          const disabledAttr = disabledAll ? ' disabled' : '';
          const styleAttr = key.span && key.span !== 1
            ? ` style="flex:${key.span};"`
            : '';
          return (
            `<button type="button" data-bn="kb-key" data-bn-kb-key data-kb-type="${key.type}" data-kb-key="${escapeHtml(key.key)}"`
            + (key.variant ? ` data-kb-variant="${escapeHtml(key.variant)}"` : '')
            + ` class="${cls}" aria-label="${escapeHtml(ariaLabel)}"${disabledAttr}${styleAttr}>`
            + `<span aria-hidden="true">${escapeHtml(key.label)}</span>`
            + `</button>`
          );
        })
        .join('');
      return `<div data-bn="kb-row" class="bn-kb-row" data-row="${ri}">${keys}</div>`;
    })
    .join('');

  return (
    `<div data-bn="keyboard" id="${id}" class="bn-kb" role="region" aria-label="${escapeHtml(label)}" aria-roledescription="virtual keyboard"${themeAttr}>`
    + `<div data-bn="kb-rows" class="bn-kb-rows">${rowsHtml}</div>`
    + `</div>`
  );
}

/**
 * Hydrate a rendered keyboard. `rootEl` is the element produced by
 * `renderKeyboard` (or any equivalent DOM that follows the
 * `data-bn="kb-key"` contract).
 *
 *   onKey(char, event)        — fired for char keys
 *   onAction(actionKey, evt)  — fired for action keys ('ENTER', 'BACKSPACE', ...)
 *   state                     — function returning a map of key -> 'green'|'yellow'|'absent'
 *                               (called on hydrate AND wrapped in `effect` if a runtime is provided)
 *   runtime                   — optional `{ effect }` from @basenative/runtime
 *   bindHardware              — bind `keydown` on document for hardware-key mirroring (default: true)
 *   haptic                    — fire navigator.vibrate on tap (default: true)
 *
 * Returns `{ destroy() }`.
 */
export function hydrateKeyboard(rootEl, options = {}) {
  if (!rootEl || rootEl.nodeType !== 1) {
    throw new TypeError('hydrateKeyboard: rootEl must be a DOM element');
  }
  applyAriaAttributes(rootEl, { label: rootEl.getAttribute('aria-label') });

  const cleanups = [];
  const onKey = options.onKey || null;
  const onAction = options.onAction || null;
  const useHaptic = options.haptic !== false;

  // ── Tap dispatch ─────────────────────────────────────────────
  const clickHandler = (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-bn-kb-key]');
    if (!btn || btn.disabled) return;
    const type = btn.dataset.kbType;
    const key = btn.dataset.kbKey;
    if (useHaptic) haptic(8);
    if (type === 'action') {
      if (onAction) onAction(key, e);
    } else {
      if (onKey) onKey(key, e);
    }
  };
  rootEl.addEventListener('click', clickHandler);
  cleanups.push(() => rootEl.removeEventListener('click', clickHandler));

  // ── Mobile-Safari focus fix ──────────────────────────────────
  cleanups.push(preventFocusSteal(rootEl));

  // ── Hardware-key mirroring ───────────────────────────────────
  if (options.bindHardware !== false && typeof document !== 'undefined') {
    cleanups.push(bindHardwareKeys(document, {
      onKey: (k, e) => { if (onKey) onKey(k, e); },
      onAction: (a, e) => { if (onAction) onAction(a, e); },
    }));
  }

  // ── Signal-driven per-key state classes ──────────────────────
  const stateFn = typeof options.state === 'function' ? options.state : null;
  const runtime = options.runtime || null;

  function applyState() {
    const map = stateFn ? (stateFn() || {}) : {};
    const buttons = rootEl.querySelectorAll('[data-bn-kb-key][data-kb-type="char"]');
    for (const btn of buttons) {
      const k = btn.dataset.kbKey;
      const status = map[k];
      // Clear all known state classes first
      for (const c of Object.values(KEY_STATE_CLASS)) {
        if (c) btn.classList.remove(c);
      }
      if (status && KEY_STATE_CLASS[status]) {
        btn.classList.add(KEY_STATE_CLASS[status]);
      }
    }
  }

  if (stateFn) {
    if (runtime && typeof runtime.effect === 'function') {
      const stop = runtime.effect(applyState);
      cleanups.push(typeof stop === 'function' ? stop : () => {});
    } else {
      applyState();
    }
  }

  return {
    destroy() {
      for (const fn of cleanups) {
        try { fn(); } catch { /* ignore */ }
      }
    },
    refresh: applyState,
  };
}

/**
 * One-shot convenience. Returns `{ html, hydrate }` so callers can
 * embed the markup in SSR output and wire up reactivity later.
 *
 *   const kb = Keyboard({ layout: 'qwerty', onKey, onAction, state, runtime });
 *   container.innerHTML = kb.html;
 *   const handle = kb.hydrate(container.querySelector('[data-bn="keyboard"]'));
 *   // ...
 *   handle.destroy();
 */
export function Keyboard(options = {}) {
  const html = renderKeyboard(options);
  return {
    html,
    hydrate(rootEl) {
      return hydrateKeyboard(rootEl, options);
    },
  };
}

/**
 * Lift a single letter's status out of a state-map signal/getter.
 * Useful when you want to drive a *different* UI element off the
 * same key-status source (e.g. a tile in a Wordle-style grid).
 *
 *   const greenA = keyState(stateGetter, 'A');
 *   if (greenA() === 'green') { ... }
 */
export function keyState(stateOrGetter, letter) {
  if (typeof stateOrGetter === 'function') {
    return () => {
      const m = stateOrGetter();
      return m ? m[letter] : undefined;
    };
  }
  return () => (stateOrGetter ? stateOrGetter[letter] : undefined);
}
