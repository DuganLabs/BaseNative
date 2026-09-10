/**
 * Combobox — searchable dropdown with keyboard navigation.
 * Uses native <input> + <datalist> pattern with progressive enhancement.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { normalizeItem } from './internal/items.js';

/**
 * Combobox — searchable dropdown with keyboard navigation, rendered as a native
 * <input> + <datalist>. Attributes, label and option labels are escaped.
 *
 * @param {object} options
 * @param {string} [options.name]
 * @param {string} [options.label]   Escaped text
 * @param {Array<string | {value: string, label: string}>} [options.items]
 * @param {string} [options.placeholder]
 * @param {boolean} [options.required]
 * @param {boolean} [options.disabled]
 * @param {string} [options.value]
 * @param {string} [options.id]      Defaults to `bn-combobox-<name>`, or nextId() without a name
 * @param {string} [options.attrs]   Raw attribute markup appended to the <input>; not escaped
 * @returns {string}
 */
export function renderCombobox(options = {}) {
  const {
    name,
    label,
    items = [],
    placeholder = '',
    required = false,
    disabled = false,
    value = '',
    id = name ? `bn-combobox-${name}` : nextId('combobox'),
    attrs = '',
  } = options;

  const listId = `${id}-list`;
  const req = required ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const optionsHtml = items
    .map(raw => {
      const item = normalizeItem(raw);
      return `<option value="${escapeAttr(item.value)}">${escapeText(item.label)}</option>`;
    })
    .join('');

  return `<div data-bn="combobox">
  ${label ? `<label for="${escapeAttr(id)}" data-bn="label">${escapeText(label)}</label>` : ''}
  <input type="text" id="${escapeAttr(id)}" name="${escapeAttr(name)}" list="${escapeAttr(listId)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"${req}${dis} data-bn="combobox-input" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"${attrsSuffix(attrs)}>
  <datalist id="${escapeAttr(listId)}">${optionsHtml}</datalist>
</div>`;
}
