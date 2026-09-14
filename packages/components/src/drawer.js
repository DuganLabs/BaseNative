/**
 * Drawer — side panel that slides in from the edge.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Drawer — side panel that slides in from the edge.
 *
 * A closed drawer is rendered `inert`, so its close button and content are
 * neither tabbable nor exposed to assistive technology while it is off-screen;
 * `initDrawer()` on the client removes `inert` when it adds `data-open` (and
 * shows the overlay, handles the close button, overlay click and Escape, and
 * returns focus on close). The overlay is emitted as a sibling *before* the
 * `<aside>`, which is where `initDrawer()` looks for it.
 *
 * @param {object} [options]
 * @param {string} [options.title]    Escaped text
 * @param {string} [options.content]  HTML slot: not escaped; pass trusted markup only
 * @param {boolean} [options.open]
 * @param {string} [options.position='right']
 * @param {string} [options.size='default']
 * @param {boolean} [options.closable=true]
 * @param {boolean} [options.overlay=true]
 * @param {string} [options.id]       Defaults to nextId('drawer')
 * @param {string} [options.attrs]    Raw attribute markup appended to the <aside>; not escaped
 * @returns {string}
 */
export function renderDrawer(options = {}) {
  const {
    title,
    content = '',
    open = false,
    position = 'right',
    size = 'default',
    closable = true,
    overlay = true,
    id = nextId('drawer'),
    attrs = '',
  } = options;

  const closeBtn = closable
    ? `<button data-bn="drawer-close" aria-label="Close" type="button">&times;</button>`
    : '';
  const overlayHtml = overlay ? `<div data-bn="drawer-overlay"${open ? ' data-open' : ''}></div>` : '';
  const stateAttrs = open ? ' data-open' : ' inert';

  return `${overlayHtml}<aside data-bn="drawer" data-position="${escapeAttr(position)}" data-size="${escapeAttr(size)}" id="${escapeAttr(id)}"${stateAttrs} role="dialog" aria-modal="true"${attrsSuffix(attrs)}>
  <div data-bn="drawer-header">
    ${title ? `<h2 data-bn="drawer-title">${escapeText(title)}</h2>` : ''}
    ${closeBtn}
  </div>
  <div data-bn="drawer-body">${content}</div>
</aside>`;
}

const OVERLAY = '[data-bn="drawer-overlay"]';
const CLOSE = '[data-bn="drawer-close"]';

function overlayFor(drawer) {
  const prev = drawer.previousElementSibling;
  return prev && typeof prev.matches === 'function' && prev.matches(OVERLAY) ? prev : null;
}

function focus(el) {
  if (el && typeof el.focus === 'function') el.focus();
}

/**
 * Wire a rendered `[data-bn="drawer"]` `<aside>` on the client: `open()`
 * removes `inert`, adds `data-open` to the drawer and its overlay and moves
 * focus into the panel; `close()` reverses that and returns focus to the
 * element that had it before `open()`. The close button, a click on the
 * overlay (unless `dismissible: false`) and Escape all close it.
 *
 * The overlay is the drawer's preceding sibling when that element is
 * `[data-bn="drawer-overlay"]` — the shape `renderDrawer()` emits — or the
 * element passed as `options.overlay`. `renderDrawer({ overlay: false })`
 * markup works without one.
 *
 * @param {HTMLElement} drawer
 * @param {object} [options]
 * @param {boolean} [options.dismissible=true]  Whether a click on the overlay closes the drawer
 * @param {Element|null} [options.overlay]      Overlay element, when it is not the preceding sibling
 * @param {(open: boolean) => void} [options.onChange]  Called after every open and close
 * @returns {{ open(): void, close(): void, toggle(): void, isOpen(): boolean, destroy(): void }}
 */
export function initDrawer(drawer, options = {}) {
  const { dismissible = true, onChange } = options;
  const overlay = options.overlay ?? overlayFor(drawer);
  const doc = drawer.ownerDocument ?? (typeof document === 'undefined' ? null : document);
  let returnTarget = null;

  const isOpen = () => drawer.hasAttribute('data-open');

  function open() {
    if (isOpen()) return;
    returnTarget = doc?.activeElement ?? null;
    drawer.removeAttribute('inert');
    drawer.setAttribute('data-open', '');
    if (overlay) overlay.setAttribute('data-open', '');
    const target = drawer.querySelector(CLOSE);
    if (!target && !drawer.hasAttribute('tabindex')) drawer.setAttribute('tabindex', '-1');
    focus(target ?? drawer);
    if (onChange) onChange(true);
  }

  function close() {
    if (!isOpen()) return;
    drawer.removeAttribute('data-open');
    if (overlay) overlay.removeAttribute('data-open');
    // Move focus out before making the panel inert, or the focus call is ignored.
    focus(returnTarget);
    returnTarget = null;
    drawer.setAttribute('inert', '');
    if (onChange) onChange(false);
  }

  function onClick(e) {
    const button = typeof e.target.closest === 'function' ? e.target.closest(CLOSE) : null;
    if (!button) return;
    if (typeof button.closest === 'function' && button.closest('[data-bn="drawer"]') !== drawer) return;
    close();
  }

  function onOverlayClick() {
    if (dismissible) close();
  }

  function onKeydown(e) {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    close();
  }

  drawer.addEventListener('click', onClick);
  if (overlay) overlay.addEventListener('click', onOverlayClick);
  if (doc) doc.addEventListener('keydown', onKeydown);

  return {
    open,
    close,
    toggle() {
      if (isOpen()) close();
      else open();
    },
    isOpen,
    destroy() {
      drawer.removeEventListener('click', onClick);
      if (overlay) overlay.removeEventListener('click', onOverlayClick);
      if (doc) doc.removeEventListener('keydown', onKeydown);
    },
  };
}
