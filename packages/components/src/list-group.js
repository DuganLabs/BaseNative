/**
 * List group — the inset grouped list: a section of rows on one raised
 * surface, under a small section header, with hairline separators that
 * stop at the rows' leading inset. It is the shape platform settings
 * and index pages are built from (the iOS grouped list is the reference
 * form), and the form factor the catalog was missing between a plain
 * <ul> and a full table: rows that are facts and links, not data.
 *
 * A row with an `href` is a link and grows a chevron; a row without
 * one is a fact and can carry a `value` on its trailing edge. Rows may
 * lead with an `icon` glyph slot. The header is a real heading
 * (h2/h3/h4 by `headingLevel`) so the section stays in the document
 * outline; the footer is explanatory text under the surface.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/** Chevron glyph for link rows, drawn on the icons package's 24-unit grid. */
const CHEVRON_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

/**
 * List group — an inset grouped list with an optional section header
 * and footer.
 *
 * @param {object} [options]
 * @param {string} [options.header]  Section heading; escaped text
 * @param {2|3|4} [options.headingLevel=2]  The heading's level
 * @param {string} [options.footer]  Explanatory text under the surface; escaped text
 * @param {Array<{label: string, href?: string, value?: string, icon?: string, current?: boolean}>} [options.items]
 *   label and value are escaped text; href is an escaped attribute; icon is an
 *   HTML slot (an SVG glyph): not escaped; pass trusted markup only. A row with
 *   `current: true` (only meaningful with an href) gets aria-current="page".
 * @param {string} [options.label]  The section's aria-label, used when no header is given
 * @param {string} [options.attrs]  Raw attribute markup appended to the <section>; not escaped
 * @returns {string}
 */
export function renderListGroup(options = {}) {
  const { header, headingLevel = 2, footer, items = [], label, attrs = '' } = options;

  const level = [2, 3, 4].includes(headingLevel) ? headingLevel : 2;

  const rowHtml = (item) => {
    const icon = item.icon
      ? `<span data-bn="list-group-icon" aria-hidden="true">${item.icon}</span>`
      : '';
    const value = item.value
      ? `<span data-bn="list-group-value">${escapeText(item.value)}</span>`
      : '';
    const inner = `${icon}<span data-bn="list-group-label">${escapeText(item.label)}</span>${value}`;
    if (item.href) {
      const current = item.current ? ' aria-current="page"' : '';
      return `<li><a data-bn="list-group-row" href="${escapeAttr(item.href)}"${current}>${inner}<span data-bn="list-group-chevron" aria-hidden="true">${CHEVRON_ICON}</span></a></li>`;
    }
    return `<li><span data-bn="list-group-row">${inner}</span></li>`;
  };

  const headerHtml = header
    ? `<h${level} data-bn="list-group-header">${escapeText(header)}</h${level}>`
    : '';
  const labelAttr = !header && label ? ` aria-label="${escapeAttr(label)}"` : '';
  const footerHtml = footer ? `<p data-bn="list-group-footer">${escapeText(footer)}</p>` : '';

  return `<section data-bn="list-group"${labelAttr}${attrsSuffix(attrs)}>${headerHtml}<ul data-bn="list-group-rows">${items.map(rowHtml).join('')}</ul>${footerHtml}</section>`;
}
