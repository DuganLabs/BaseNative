/**
 * Toggle/Switch component — <input type="checkbox" role="switch">.
 * Uses native semantic switch pattern.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Toggle/Switch component — <input type="checkbox" role="switch">.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.label]   Escaped text
 * @param {boolean} [options.checked]
 * @param {boolean} [options.disabled]
 * @param {string} [options.id]      Defaults to name
 * @param {string} [options.attrs]   Raw attribute markup appended to the <label>; not escaped
 * @returns {string}
 */
export function renderToggle(options = {}) {
  const { name, label, checked = false, disabled = false, attrs = '' } = options;
  const id = options.id || name;
  const checkedAttr = checked ? ' checked' : '';
  const disabledAttr = disabled ? ' disabled' : '';

  return `<label data-bn="toggle-label"${attrsSuffix(attrs)}><input data-bn="toggle" type="checkbox" role="switch" id="${escapeAttr(id)}" name="${escapeAttr(name)}"${checkedAttr}${disabledAttr} /><span>${escapeText(label || '')}</span></label>`;
}
