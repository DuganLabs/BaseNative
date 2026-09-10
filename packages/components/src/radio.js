/**
 * Radio component — native <input type="radio"> with group support.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';
import { normalizeItem } from './internal/items.js';

/**
 * Radio component — native <input type="radio"> group inside a <fieldset>.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.label]   Group legend; escaped text
 * @param {Array<string | {value: string, label: string, disabled?: boolean}>} [options.items]
 * @param {string} [options.selected]
 * @param {boolean} [options.disabled]
 * @param {string} [options.attrs]   Raw attribute markup appended to the <fieldset>; not escaped
 * @returns {string}
 */
export function renderRadioGroup(options = {}) {
  const { name, label, items = [], selected = '', disabled = false, attrs = '' } = options;

  let html = `<fieldset data-bn="radio-group"${attrsSuffix(attrs)}>`;
  if (label) {
    html += `<legend>${escapeText(label)}</legend>`;
  }
  for (const raw of items) {
    const item = normalizeItem(raw);
    const checkedAttr = item.value === selected ? ' checked' : '';
    const disabledAttr = disabled || item.disabled ? ' disabled' : '';
    const id = `${name}-${item.value}`;
    html += `<label data-bn="radio-label"><input data-bn="radio" type="radio" id="${escapeAttr(id)}" name="${escapeAttr(name)}" value="${escapeAttr(item.value)}"${checkedAttr}${disabledAttr} /><span>${escapeText(item.label)}</span></label>`;
  }
  html += `</fieldset>`;
  return html;
}
