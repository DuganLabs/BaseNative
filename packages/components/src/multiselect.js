/**
 * Multiselect — multiple value selection with tags/chips.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { normalizeItem } from './internal/items.js';

/**
 * Multiselect — multiple value selection with tags/chips over a hidden native
 * <select multiple>. Attributes, label, tag text and option labels are escaped.
 *
 * @param {object} options
 * @param {string} [options.name]
 * @param {string} [options.label]   Escaped text
 * @param {Array<string | {value: string, label: string}>} [options.items]
 * @param {string[]} [options.selected]
 * @param {string} [options.placeholder]
 * @param {boolean} [options.disabled]
 * @param {string} [options.id]      Defaults to `bn-multiselect-<name>`, or nextId() without a name
 * @param {string} [options.attrs]   Raw attribute markup appended to the search <input>; not escaped
 * @returns {string}
 */
export function renderMultiselect(options = {}) {
  const {
    name,
    label,
    items = [],
    selected = [],
    placeholder = 'Select items...',
    disabled = false,
    id = name ? `bn-multiselect-${name}` : nextId('multiselect'),
    attrs = '',
  } = options;

  const dis = disabled ? ' disabled' : '';
  const selectedSet = new Set(selected);
  const normalized = items.map(normalizeItem);

  const tagsHtml = selected
    .map(val => {
      const item = normalized.find(i => i.value === val);
      const text = item ? item.label : val;
      return `<span data-bn="tag" data-value="${escapeAttr(val)}">${escapeText(text)}<button type="button" data-bn="tag-remove" aria-label="Remove ${escapeAttr(text)}">&times;</button></span>`;
    })
    .join('');

  const optionsHtml = normalized
    .map(item => {
      const sel = selectedSet.has(item.value) ? ' selected' : '';
      return `<option value="${escapeAttr(item.value)}"${sel}>${escapeText(item.label)}</option>`;
    })
    .join('');

  return `<div data-bn="multiselect"${dis ? ' data-disabled' : ''}>
  ${label ? `<label for="${escapeAttr(id)}" data-bn="label">${escapeText(label)}</label>` : ''}
  <div data-bn="multiselect-container">
    <div data-bn="multiselect-tags">${tagsHtml}</div>
    <input type="text" data-bn="multiselect-search" placeholder="${escapeAttr(placeholder)}" autocomplete="off" aria-label="${escapeAttr(label || 'Search')}"${attrsSuffix(attrs)}>
  </div>
  <select id="${escapeAttr(id)}" name="${escapeAttr(name)}" multiple hidden${dis}>${optionsHtml}</select>
</div>`;
}
