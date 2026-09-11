// Built with BaseNative — basenative.dev
/**
 * Capture and restore the state a patch cannot carry in the markup: which
 * element has the caret, where the caret sits inside it, how far every scroller
 * is scrolled, and which `<dialog>`/`<details>` are open.
 *
 * The patcher already preserves node identity for everything it can match, so
 * in the common case `restore()` finds the focused element still focused and
 * does nothing at all — the cheapest restore is the one that is a no-op. This
 * module is the safety net for the nodes the patcher genuinely had to replace.
 *
 * Isomorphic: no `node:` imports, no module-scope globals.
 */

const ELEMENT_NODE = 1;

/** Upper bound on scroll containers recorded, so a huge page cannot stall the patch. */
const MAX_SCROLLERS = 250;

/* ------------------------------------------------------------------ paths */

/**
 * A path that survives a patch: an id when the element has one, otherwise the
 * chain of element indices from `<html>` down.
 *
 * @param {Element | null} el
 * @returns {string | null}
 */
export function pathTo(el) {
  if (!el || el.nodeType !== ELEMENT_NODE) return null;
  if (el.id) return `#${el.id}`;

  const root = el.ownerDocument?.documentElement;
  const parts = [];
  let node = el;
  while (node && node !== root) {
    const parent = node.parentElement;
    if (!parent) return null;
    let index = 0;
    for (const child of parent.children) {
      if (child === node) break;
      index++;
    }
    parts.unshift(index);
    node = parent;
  }
  return `/${parts.join('/')}`;
}

/**
 * Resolve a path produced by {@link pathTo} back to an element.
 *
 * @param {Document} doc
 * @param {string | null} path
 * @returns {Element | null}
 */
export function resolvePath(doc, path) {
  if (!doc || typeof path !== 'string' || path === '') return null;
  if (path.startsWith('#')) return doc.getElementById(path.slice(1));

  let node = doc.documentElement;
  if (!node) return null;
  const parts = path.slice(1).split('/').filter((part) => part !== '');
  for (const part of parts) {
    const index = Number(part);
    if (!Number.isInteger(index)) return null;
    node = node.children[index];
    if (!node) return null;
  }
  return node;
}

/**
 * Resolve an element reference recorded by {@link capture}, trying the path
 * first and falling back to the form-field name. A form field that was rebuilt
 * by the server keeps its `name`, so that is the most durable handle a
 * re-rendered input has.
 *
 * @param {Document} doc
 * @param {{ path: string | null, tag?: string, name?: string | null }} ref
 * @returns {Element | null}
 */
export function resolveRef(doc, ref) {
  if (!ref) return null;
  const byPath = resolvePath(doc, ref.path);
  if (byPath && (!ref.tag || byPath.tagName === ref.tag)) return byPath;

  if (ref.name) {
    try {
      const selector = `${ref.tag ? ref.tag.toLowerCase() : ''}[name="${cssEscape(ref.name)}"]`;
      const found = doc.querySelector(selector);
      if (found) return found;
    } catch {
      /* an exotic name that will not round-trip through a selector */
    }
  }
  return byPath ?? null;
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

/* ----------------------------------------------------------------- focus */

/** `<input type>` values whose selection API is safe to read. */
const SELECTABLE_TYPES = new Set(['text', 'search', 'url', 'tel', 'password', '']);

function supportsSelection(el) {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return SELECTABLE_TYPES.has(String(el.getAttribute('type') ?? '').toLowerCase());
}

function captureFocus(doc) {
  const active = doc.activeElement;
  if (!active || active === doc.body || active === doc.documentElement) return null;

  const ref = {
    path: pathTo(active),
    tag: active.tagName,
    name: active.getAttribute?.('name') ?? null,
    selection: null,
  };

  // `selectionStart` throws on input types that have no text selection
  // (number, email, date, colour…), which is why every read is guarded.
  if (supportsSelection(active)) {
    try {
      ref.selection = {
        start: active.selectionStart,
        end: active.selectionEnd,
        direction: active.selectionDirection ?? 'none',
      };
    } catch {
      ref.selection = null;
    }
  }
  return ref;
}

function restoreFocus(doc, focus) {
  if (!focus) return { restored: false, sameNode: false };

  const target = resolveRef(doc, focus);
  if (!target) return { restored: false, sameNode: false };

  const sameNode = doc.activeElement === target;
  if (!sameNode) {
    try {
      target.focus({ preventScroll: true });
    } catch {
      try {
        target.focus();
      } catch {
        return { restored: false, sameNode: false };
      }
    }
  }

  if (focus.selection && supportsSelection(target)) {
    const { start, end, direction } = focus.selection;
    try {
      if (target.selectionStart !== start || target.selectionEnd !== end) {
        target.setSelectionRange(start, end, direction === 'none' ? undefined : direction);
      }
    } catch {
      /* control refused the range — leave the caret where the browser put it */
    }
  }

  return { restored: doc.activeElement === target, sameNode };
}

/* ---------------------------------------------------------------- scroll */

function captureScroll(doc) {
  const view = doc.defaultView;
  const containers = [];

  let all;
  try {
    all = doc.querySelectorAll('*');
  } catch {
    all = [];
  }

  for (const el of all) {
    const top = el.scrollTop ?? 0;
    const left = el.scrollLeft ?? 0;
    if (top === 0 && left === 0) continue;
    containers.push({ path: pathTo(el), tag: el.tagName, top, left });
    if (containers.length >= MAX_SCROLLERS) break;
  }

  return {
    window: { x: view?.scrollX ?? 0, y: view?.scrollY ?? 0 },
    containers,
  };
}

function restoreScroll(doc, scroll) {
  if (!scroll) return 0;
  let restored = 0;

  for (const entry of scroll.containers) {
    const el = resolveRef(doc, entry);
    if (!el) continue;
    try {
      if (el.scrollTop !== entry.top) el.scrollTop = entry.top;
      if (el.scrollLeft !== entry.left) el.scrollLeft = entry.left;
      restored++;
    } catch {
      /* not scrollable any more */
    }
  }

  const view = doc.defaultView;
  if (view && typeof view.scrollTo === 'function') {
    if (view.scrollX !== scroll.window.x || view.scrollY !== scroll.window.y) {
      try {
        view.scrollTo(scroll.window.x, scroll.window.y);
      } catch {
        /* jsdom-likes without a layout engine */
      }
    }
  }
  return restored;
}

/* ------------------------------------------------------------ open state */

/** `:modal` is unsupported in some DOM implementations, so the read is guarded. */
function isModal(el) {
  try {
    return el.tagName === 'DIALOG' && typeof el.matches === 'function' && el.matches(':modal');
  } catch {
    return false;
  }
}

function captureOpen(doc) {
  const entries = [];
  let nodes;
  try {
    nodes = doc.querySelectorAll('dialog[open], details[open]');
  } catch {
    return entries;
  }
  for (const el of nodes) {
    entries.push({ path: pathTo(el), tag: el.tagName, modal: isModal(el) });
  }
  return entries;
}

function restoreOpen(doc, entries) {
  let restored = 0;
  for (const entry of entries ?? []) {
    const el = resolveRef(doc, entry);
    if (!el || el.hasAttribute('open')) continue;
    try {
      if (entry.modal && typeof el.showModal === 'function') el.showModal();
      else if (el.tagName === 'DIALOG' && typeof el.show === 'function') el.show();
      else el.setAttribute('open', '');
      restored++;
    } catch {
      el.setAttribute('open', '');
      restored++;
    }
  }
  return restored;
}

/* ------------------------------------------------------------ public API */

/**
 * Snapshot everything a DOM patch cannot carry across.
 *
 * @param {Document} doc
 * @returns {object}
 */
export function capture(doc) {
  return {
    focus: captureFocus(doc),
    scroll: captureScroll(doc),
    open: captureOpen(doc),
  };
}

/**
 * Re-apply a snapshot taken by {@link capture}.
 *
 * Order matters: open first (a closed dialog has no scroll box), scroll next,
 * focus last and with `preventScroll` so re-focusing cannot undo the offsets
 * that were just put back.
 *
 * @param {Document} doc
 * @param {object} state
 * @returns {{ focusRestored: boolean, focusUntouched: boolean, scrollers: number, opened: number }}
 */
export function restore(doc, state) {
  if (!state) return { focusRestored: false, focusUntouched: true, scrollers: 0, opened: 0 };

  const opened = restoreOpen(doc, state.open);
  const scrollers = restoreScroll(doc, state.scroll);
  const { restored, sameNode } = restoreFocus(doc, state.focus);

  return { focusRestored: restored, focusUntouched: sameNode, scrollers, opened };
}
