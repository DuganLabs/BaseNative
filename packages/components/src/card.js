/**
 * Card component — semantic <article> container.
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Card component — semantic <article> container.
 *
 * `id` and `attrs` exist so a card can be addressed: labelled
 * (`aria-labelledby`), bound to by a client runtime (`data-bn-bind`), or
 * targeted by a test hook. Without them a card was render-and-forget markup,
 * unusable in any app that wires signals to the DOM.
 *
 * @param {object} [options]
 * @param {string} [options.header]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.body]    HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.footer]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.variant='default']
 * @param {string} [options.id]      Emitted as the <article>'s id when present
 * @param {string} [options.attrs]   Raw attribute markup appended to the <article>; not escaped
 * @returns {string}
 */
export function renderCard(options = {}) {
  const { header = '', body = '', footer = '', variant = 'default', id, attrs = '' } = options;

  const idAttr = id ? ` id="${escapeAttr(id)}"` : '';
  let html = `<article data-bn="card" data-variant="${escapeAttr(variant)}"${idAttr}${attrsSuffix(attrs)}>`;
  if (header) {
    html += `<header data-bn="card-header">${header}</header>`;
  }
  html += `<div data-bn="card-body">${body}</div>`;
  if (footer) {
    html += `<footer data-bn="card-footer">${footer}</footer>`;
  }
  html += `</article>`;
  return html;
}
