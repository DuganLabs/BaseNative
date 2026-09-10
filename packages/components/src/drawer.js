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
 * the client removes `inert` when it adds `data-open`.
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
