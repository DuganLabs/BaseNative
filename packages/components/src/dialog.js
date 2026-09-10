/**
 * Dialog — modal/non-modal dialog using native <dialog> element.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Dialog — modal/non-modal dialog using native <dialog> element.
 *
 * `modal` selects the semantics the client should apply: a modal dialog is
 * rendered with aria-modal="true" and data-modal="true" (open it with
 * showModal()); a non-modal one gets data-modal="false" (open it with show()).
 *
 * @param {object} [options]
 * @param {string} [options.title]    Escaped text
 * @param {string} [options.content]  HTML slot: not escaped; pass trusted markup only
 * @param {boolean} [options.open]
 * @param {boolean} [options.modal=true]
 * @param {boolean} [options.closable=true]
 * @param {string} [options.size='default']
 * @param {string} [options.footer]   HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.id]       Defaults to nextId('dialog')
 * @param {string} [options.attrs]    Raw attribute markup appended to the <dialog>; not escaped
 * @returns {string}
 */
export function renderDialog(options = {}) {
  const {
    title,
    content = '',
    open = false,
    modal = true,
    closable = true,
    size = 'default',
    footer = '',
    id = nextId('dialog'),
    attrs = '',
  } = options;

  const openAttr = open ? ' open' : '';
  const modalAttrs = modal ? ' aria-modal="true" data-modal="true"' : ' data-modal="false"';
  const closeBtn = closable
    ? `<button data-bn="dialog-close" aria-label="Close" type="button">&times;</button>`
    : '';

  return `<dialog data-bn="dialog" data-size="${escapeAttr(size)}" id="${escapeAttr(id)}"${openAttr}${modalAttrs}${attrsSuffix(attrs)}>
  <div data-bn="dialog-header">
    ${title ? `<h2 data-bn="dialog-title">${escapeText(title)}</h2>` : ''}
    ${closeBtn}
  </div>
  <div data-bn="dialog-body">${content}</div>
  ${footer ? `<div data-bn="dialog-footer">${footer}</div>` : ''}
</dialog>`;
}
