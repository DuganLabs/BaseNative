// Built with BaseNative — basenative.dev
/**
 * The DOM patcher.
 *
 * BaseNative renders HTML strings on the server and binds signals on the
 * client, so "hot module replacement" here means: re-fetch the current URL,
 * parse the HTML the server just produced, and reconcile it into the live
 * document *in place*. Node identity is the currency — every node that survives
 * keeps its listeners, its signal bindings, its scroll offset, and its focus.
 *
 * Two rules drive every decision below:
 *
 *   1. **Never touch what did not change.** An attribute whose value is equal
 *      is not re-set; a text node whose value is equal is not re-assigned; a
 *      subtree that matches is patched, never replaced. Writing an identical
 *      value is not free — it is exactly how a form loses focus on every
 *      keystroke.
 *   2. **Never replace a subtree that owns the caret when it can be patched.**
 *      Matching happens before removal, so the node holding `activeElement`
 *      is reused whenever the incoming markup still has a compatible node in
 *      that position.
 *
 * Isomorphic: imported by `client.js` in the browser and by the tests under
 * happy-dom. No `node:` imports, no globals beyond the documents passed in.
 */

import { CLIENT_MARKER, SKIP_ATTR } from './protocol.js';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

/** How far ahead an unkeyed child may look for a compatible sibling. */
const MATCH_WINDOW = 16;

/** `<input type>` values that expose `selectionStart`/`selectionEnd`. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'password', '']);

/**
 * Attributes that describe live user state rather than markup, keyed by the
 * tags they apply to. A patch never deletes these: the server render of a
 * `<dialog>` has no `open`, and removing it would close the dialog the
 * developer is standing in while they edit it.
 */
const STATEFUL_ATTRS = new Map([['open', new Set(['DIALOG', 'DETAILS'])]]);

/* --------------------------------------------------------------- parsing */

/**
 * Parse an HTTP response body into a document, or return `null` when it is not
 * usable HTML.
 *
 * `DOMParser` with `text/html` never throws — it recovers from anything, which
 * is why this has to decide for itself what "unparseable" means:
 * empty bodies, bodies with no markup at all (a JSON error page from a crashed
 * route is the common one), and documents the parser could not give a `<body>`.
 *
 * @param {string} html
 * @param {{ parseFromString(s: string, t: string): Document }} [parser]
 * @returns {Document | null}
 */
export function parseDocument(html, parser) {
  if (typeof html !== 'string') return null;
  const trimmed = html.trim();
  if (trimmed === '') return null;
  if (!trimmed.includes('<')) return null;

  const impl = parser ?? (typeof DOMParser === 'function' ? new DOMParser() : null);
  if (!impl) return null;

  let doc;
  try {
    doc = impl.parseFromString(html, 'text/html');
  } catch {
    return null;
  }

  if (!doc || !doc.documentElement) return null;
  if (doc.querySelector?.('parsererror')) return null;
  if (!doc.body) return null;
  if (doc.body.childNodes.length === 0 && (doc.head?.childNodes.length ?? 0) === 0) return null;
  return doc;
}

/* ----------------------------------------------------------------- keys */

/**
 * Identity of a node across renders, or `null` when it has none.
 *
 * Keys let a moved or reordered element be matched by identity instead of by
 * position, which is what keeps a focused `<input id="title">` alive when the
 * server inserts a sibling above it.
 *
 * @param {Node} node
 * @returns {string | null}
 */
export function keyOf(node) {
  if (!node || node.nodeType !== ELEMENT_NODE) return null;

  const explicit = node.getAttribute('data-bn-key');
  if (explicit) return `k:${explicit}`;

  const id = node.getAttribute('id');
  if (id) return `#${id}`;

  const tag = node.tagName;
  if (tag === 'LINK') return `link:${node.getAttribute('rel') ?? ''}:${node.getAttribute('href') ?? ''}`;
  if (tag === 'SCRIPT') {
    const src = node.getAttribute('src');
    return src ? `script:${src}` : null;
  }
  if (tag === 'META') {
    const name =
      node.getAttribute('name') ?? node.getAttribute('property') ?? node.getAttribute('charset');
    return name ? `meta:${name}` : null;
  }
  if (tag === 'TITLE') return 'title';

  const name = node.getAttribute('name');
  if (name && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')) return `${tag}[${name}]`;

  return null;
}

/**
 * Can `live` be reconciled into `next` without replacing the node?
 *
 * @param {Node} live
 * @param {Node} next
 * @returns {boolean}
 */
export function isCompatible(live, next) {
  if (!live || !next) return false;
  if (live.nodeType !== next.nodeType) return false;
  if (live.nodeType !== ELEMENT_NODE) return true;
  if (live.tagName !== next.tagName) return false;

  const liveKey = keyOf(live);
  const nextKey = keyOf(next);
  if (liveKey && nextKey && liveKey !== nextKey) return false;
  return true;
}

/* ------------------------------------------------------------ form state */

function isTextEntry(el) {
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return TEXT_INPUT_TYPES.has(String(el.getAttribute('type') ?? '').toLowerCase());
}

function isToggle(el) {
  if (el.tagName !== 'INPUT') return false;
  const type = String(el.getAttribute('type') ?? '').toLowerCase();
  return type === 'checkbox' || type === 'radio';
}

/**
 * Snapshot the parts of a form control that live in DOM *properties* rather
 * than attributes — everything the user typed or clicked.
 */
function captureFormState(el) {
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return null;
  try {
    return {
      value: el.value,
      checked: el.checked,
      attrValue: el.getAttribute('value'),
      attrChecked: el.hasAttribute('checked'),
      text: el.tagName === 'TEXTAREA' ? el.textContent : null,
    };
  } catch {
    return null;
  }
}

/**
 * Decide whether the user's live input survives the patch.
 *
 * The rule: keep what the user typed unless the *source* changed its default.
 * A server render carries the original default in the `value` attribute, so if
 * that attribute is identical across renders the developer did not touch the
 * field and the user's text wins. If it changed, the new default wins.
 */
function restoreFormState(live, next, snapshot, stats) {
  if (!snapshot) return;
  try {
    if (isToggle(live)) {
      const defaultChanged = snapshot.attrChecked !== next.hasAttribute('checked');
      const desired = defaultChanged ? next.hasAttribute('checked') : snapshot.checked;
      if (live.checked !== desired) {
        live.checked = desired;
        stats.formChanged++;
      }
      return;
    }

    if (live.tagName === 'TEXTAREA') {
      const defaultChanged = snapshot.text !== next.textContent;
      const desired = defaultChanged ? next.textContent : snapshot.value;
      if (live.value !== desired) {
        live.value = desired;
        stats.formChanged++;
      }
      return;
    }

    if (!isTextEntry(live) && live.tagName !== 'SELECT') return;

    const nextAttr = next.getAttribute('value');
    const defaultChanged = snapshot.attrValue !== nextAttr;
    const desired = defaultChanged ? (nextAttr ?? '') : snapshot.value;
    if (live.value !== desired) {
      live.value = desired;
      stats.formChanged++;
    }
  } catch {
    /* a control that rejects the assignment keeps whatever it had */
  }
}

/* ------------------------------------------------------------ attributes */

function patchAttributes(live, next, stats) {
  for (const attr of next.attributes) {
    if (live.getAttribute(attr.name) !== attr.value) {
      live.setAttribute(attr.name, attr.value);
      stats.attrsChanged++;
    }
  }

  for (const attr of [...live.attributes]) {
    if (next.hasAttribute(attr.name)) continue;
    if (STATEFUL_ATTRS.get(attr.name)?.has(live.tagName)) continue;
    if (attr.name === CLIENT_MARKER) continue;
    live.removeAttribute(attr.name);
    stats.attrsChanged++;
  }
}

/* -------------------------------------------------------------- children */

function containsActiveElement(node, active) {
  if (!active) return false;
  if (node === active) return true;
  return typeof node.contains === 'function' ? node.contains(active) : false;
}

/**
 * Find the live node that should become `nextChild`.
 *
 * Keyed children are matched by identity anywhere in the remaining list.
 * Unkeyed children are matched positionally, with a bounded look-ahead so a
 * deletion in the middle of a list does not cascade into "everything after it
 * is different" — the cascade is what destroys focus.
 */
function findMatch(cursor, nextChild, keyed, consumed) {
  const key = keyOf(nextChild);
  if (key) {
    const candidate = keyed.get(key);
    if (candidate && !consumed.has(candidate)) {
      keyed.delete(key);
      return candidate;
    }
    // A keyed incoming node with no counterpart must not steal an unkeyed one:
    // it is genuinely new.
    return null;
  }

  let probe = cursor;
  let steps = 0;
  while (probe && steps < MATCH_WINDOW) {
    if (!consumed.has(probe) && keyOf(probe) === null && isCompatible(probe, nextChild)) return probe;
    probe = probe.nextSibling;
    steps++;
  }
  return null;
}

function patchChildren(liveParent, nextParent, ctx) {
  const { stats } = ctx;
  const nextChildren = [...nextParent.childNodes];

  const keyed = new Map();
  for (let node = liveParent.firstChild; node; node = node.nextSibling) {
    const key = keyOf(node);
    if (key && !keyed.has(key)) keyed.set(key, node);
  }

  const consumed = new Set();
  let cursor = liveParent.firstChild;

  for (const nextChild of nextChildren) {
    const match = findMatch(cursor, nextChild, keyed, consumed);

    if (match) {
      if (match !== cursor) liveParent.insertBefore(match, cursor);
      consumed.add(match);
      patchNode(match, nextChild, ctx);
      stats.matched++;
      cursor = match.nextSibling;
      continue;
    }

    const imported = liveParent.ownerDocument.importNode(nextChild, true);
    liveParent.insertBefore(imported, cursor);
    consumed.add(imported);
    stats.inserted++;
  }

  for (let node = liveParent.firstChild; node; ) {
    const current = node;
    node = node.nextSibling;
    if (consumed.has(current)) continue;
    // Never remove the HMR client itself; a page whose server output lacks the
    // tag would otherwise disconnect on its own first patch.
    if (current.nodeType === ELEMENT_NODE && current.hasAttribute(CLIENT_MARKER)) continue;
    if (containsActiveElement(current, ctx.active)) ctx.focusDisturbed = true;
    liveParent.removeChild(current);
    stats.removed++;
  }
}

/* ------------------------------------------------------------------ node */

function patchNode(live, next, ctx) {
  const { stats } = ctx;

  if (live.nodeType === TEXT_NODE || live.nodeType === COMMENT_NODE) {
    if (live.nodeValue !== next.nodeValue) {
      live.nodeValue = next.nodeValue;
      stats.textChanged++;
    }
    return;
  }

  if (live.nodeType !== ELEMENT_NODE) return;

  const snapshot = captureFormState(live);
  patchAttributes(live, next, stats);
  restoreFormState(live, next, snapshot, stats);

  if (live.hasAttribute(SKIP_ATTR)) {
    stats.skipped++;
    return;
  }
  // A <textarea>'s text *is* its value; it was just reconciled above.
  if (live.tagName === 'TEXTAREA') return;

  patchChildren(live, next, ctx);
}

/* ------------------------------------------------------------- structure */

function topLevelTags(body) {
  const tags = new Set();
  for (const child of body.children) tags.add(child.tagName);
  return tags;
}

/**
 * Cheap pre-flight: is the incoming document close enough to the live one that
 * patching will reuse anything at all?
 *
 * Answering "no" is how the caller knows to fall back to a full reload instead
 * of shredding the page and rebuilding it node by node — which would lose focus
 * anyway and be slower than a reload.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canPatch(liveDoc, nextDoc) {
  if (!nextDoc?.documentElement) return { ok: false, reason: 'the response had no document element' };
  if (!nextDoc.body) return { ok: false, reason: 'the response had no <body>' };
  if (!liveDoc?.body) return { ok: false, reason: 'the live page has no <body>' };

  const liveTags = topLevelTags(liveDoc.body);
  const nextTags = topLevelTags(nextDoc.body);
  if (liveTags.size === 0 || nextTags.size === 0) return { ok: true };

  for (const tag of nextTags) {
    if (liveTags.has(tag)) return { ok: true };
  }
  return {
    ok: false,
    reason: `the page structure diverged (live body has <${[...liveTags].join('>, <')}>, ` +
      `the new render has <${[...nextTags].join('>, <')}>)`,
  };
}

/* ------------------------------------------------------------ public API */

function emptyStats() {
  return {
    matched: 0,
    inserted: 0,
    removed: 0,
    attrsChanged: 0,
    textChanged: 0,
    formChanged: 0,
    skipped: 0,
  };
}

/**
 * Reconcile `nextDoc` into `liveDoc` in place.
 *
 * @param {Document} liveDoc The live page.
 * @param {Document} nextDoc A freshly parsed render of the same URL.
 * @returns {{ ok: true, stats: object, focusDisturbed: boolean } | { ok: false, reason: string }}
 */
export function patchDocument(liveDoc, nextDoc) {
  const pre = canPatch(liveDoc, nextDoc);
  if (!pre.ok) return pre;

  const ctx = {
    stats: emptyStats(),
    active: liveDoc.activeElement ?? null,
    focusDisturbed: false,
  };

  try {
    patchAttributes(liveDoc.documentElement, nextDoc.documentElement, ctx.stats);
    if (liveDoc.head && nextDoc.head) patchNode(liveDoc.head, nextDoc.head, ctx);
    patchNode(liveDoc.body, nextDoc.body, ctx);
  } catch (error) {
    return { ok: false, reason: `the patch threw (${error?.message ?? error})` };
  }

  return { ok: true, stats: ctx.stats, focusDisturbed: ctx.focusDisturbed };
}

/**
 * Reconcile a fragment of markup into a single live element. Exposed for apps
 * that stream a region rather than a whole page.
 *
 * @param {Element} liveRoot
 * @param {Element} nextRoot
 */
export function patchElement(liveRoot, nextRoot) {
  const ctx = {
    stats: emptyStats(),
    active: liveRoot.ownerDocument?.activeElement ?? null,
    focusDisturbed: false,
  };
  try {
    patchNode(liveRoot, nextRoot, ctx);
  } catch (error) {
    return { ok: false, reason: `the patch threw (${error?.message ?? error})` };
  }
  return { ok: true, stats: ctx.stats, focusDisturbed: ctx.focusDisturbed };
}
