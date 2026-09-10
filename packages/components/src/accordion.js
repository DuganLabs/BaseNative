/**
 * Accordion — collapsible sections using native <details>/<summary>.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Accordion — collapsible sections using native <details>/<summary>.
 *
 * @param {object} [options]
 * @param {Array<{title: string, content?: string, open?: boolean}>} [options.items]
 *   title is escaped text; content is an HTML slot: not escaped; pass trusted markup only
 * @param {boolean} [options.multiple]  Allow several sections open at once
 * @param {string} [options.id]     Defaults to nextId('accordion')
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderAccordion(options = {}) {
  const {
    items = [],
    multiple = false,
    id = nextId('accordion'),
    attrs = '',
  } = options;

  const exclusiveName = multiple ? '' : ` name="${escapeAttr(id)}"`;

  const sectionsHtml = items
    .map(item => {
      const open = item.open ? ' open' : '';
      return `<details data-bn="accordion-item"${exclusiveName}${open}>
  <summary data-bn="accordion-header">${escapeText(item.title ?? '')}</summary>
  <div data-bn="accordion-content">${item.content ?? ''}</div>
</details>`;
    })
    .join('');

  return `<div data-bn="accordion" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>${sectionsHtml}</div>`;
}
