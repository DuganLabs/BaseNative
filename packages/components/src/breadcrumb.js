/**
 * Breadcrumb — navigation trail.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Breadcrumb — navigation trail; the last item is aria-current="page".
 *
 * @param {object} [options]
 * @param {Array<{label: string, href?: string}>} [options.items]  label is escaped text; href is an escaped attribute
 * @param {string} [options.separator='/']  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.attrs]  Raw attribute markup appended to the <nav>; not escaped
 * @returns {string}
 */
export function renderBreadcrumb(options = {}) {
  const {
    items = [],
    separator = '/',
    attrs = '',
  } = options;

  const itemsHtml = items
    .map((item, i) => {
      const isLast = i === items.length - 1;
      if (isLast) {
        return `<li data-bn="breadcrumb-item" aria-current="page">${escapeText(item.label)}</li>`;
      }
      return `<li data-bn="breadcrumb-item"><a href="${escapeAttr(item.href)}">${escapeText(item.label)}</a><span data-bn="breadcrumb-separator" aria-hidden="true">${separator}</span></li>`;
    })
    .join('');

  return `<nav data-bn="breadcrumb" aria-label="Breadcrumb"${attrsSuffix(attrs)}>
  <ol data-bn="breadcrumb-list">${itemsHtml}</ol>
</nav>`;
}
