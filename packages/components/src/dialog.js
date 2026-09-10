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
 * The title gets `id="{id}-title"` and the <dialog> `aria-labelledby` pointing
 * at it; `description` renders an escaped `<p id="{id}-description">` at the
 * top of the body and sets `aria-describedby`.
 *
 * @param {object} [options]
 * @param {string} [options.title]        Escaped text
 * @param {string} [options.description]  Escaped text; short summary announced with the title
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
    description,
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
  const titleId = escapeAttr(`${id}-title`);
  const descriptionId = escapeAttr(`${id}-description`);
  const labelAttrs =
    (title ? ` aria-labelledby="${titleId}"` : '') +
    (description ? ` aria-describedby="${descriptionId}"` : '');
  const closeBtn = closable
    ? `<button data-bn="dialog-close" aria-label="Close" type="button">&times;</button>`
    : '';

  return `<dialog data-bn="dialog" data-size="${escapeAttr(size)}" id="${escapeAttr(id)}"${openAttr}${modalAttrs}${labelAttrs}${attrsSuffix(attrs)}>
  <div data-bn="dialog-header">
    ${title ? `<h2 data-bn="dialog-title" id="${titleId}">${escapeText(title)}</h2>` : ''}
    ${closeBtn}
  </div>
  <div data-bn="dialog-body">${description ? `<p data-bn="dialog-description" id="${descriptionId}">${escapeText(description)}</p>` : ''}${content}</div>
  ${footer ? `<div data-bn="dialog-footer">${footer}</div>` : ''}
</dialog>`;
}
