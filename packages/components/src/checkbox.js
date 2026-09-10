/**
 * Checkbox component — native <input type="checkbox"> with label association.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Checkbox component — native <input type="checkbox"> with label association.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.label]   Escaped text
 * @param {boolean} [options.checked]
 * @param {boolean} [options.disabled]
 * @param {string} [options.value]
 * @param {string} [options.id]      Defaults to name
 * @param {string} [options.attrs]   Raw attribute markup appended to the <label>; not escaped
 * @returns {string}
 */
export function renderCheckbox(options = {}) {
  const { name, label, checked = false, disabled = false, value = '', attrs = '' } = options;
  const id = options.id || name;
  const checkedAttr = checked ? ' checked' : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const valueAttr = value ? ` value="${escapeAttr(value)}"` : '';

  return `<label data-bn="checkbox-label"${attrsSuffix(attrs)}><input data-bn="checkbox" type="checkbox" id="${escapeAttr(id)}" name="${escapeAttr(name)}"${valueAttr}${checkedAttr}${disabledAttr} /><span>${escapeText(label || '')}</span></label>`;
}
