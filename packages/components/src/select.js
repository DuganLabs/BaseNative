/**
 * Select component — native <select> with optional base-select enhancement.
 * Feature-detected styling via browserFeatures.baseSelect from runtime.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';
import { describedBy, renderField } from './internal/field.js';
import { normalizeItem } from './internal/items.js';

/**
 * Server-side render helper for a select field group.
 *
 * Attributes, option values, option labels, placeholder, label, helpText and
 * error are escaped. Help/error ids and aria-describedby follow renderInput.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.label]
 * @param {Array<string | {value: string, label: string, disabled?: boolean}>} [options.items]
 * @param {string} [options.selected]
 * @param {string} [options.placeholder]  Rendered as a disabled first option
 * @param {boolean} [options.required]
 * @param {boolean} [options.disabled]
 * @param {string} [options.helpText]
 * @param {string} [options.error]
 * @param {string} [options.id]     Defaults to name
 * @param {string} [options.attrs]  Raw attribute markup appended to the <select>; not escaped
 * @returns {string}
 */
export function renderSelect(options = {}) {
  const {
    name,
    label,
    items = [],
    selected = '',
    placeholder = '',
    required = false,
    disabled = false,
    helpText = '',
    error = '',
    attrs = '',
  } = options;

  const id = options.id || name;
  const requiredAttr = required ? ' required' : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const ariaInvalid = error ? ' aria-invalid="true"' : '';

  let control = `<select data-bn="select" id="${escapeAttr(id)}" name="${escapeAttr(name)}"${requiredAttr}${disabledAttr}${describedBy(id, helpText, error)}${ariaInvalid}${attrsSuffix(attrs)}>`;
  if (placeholder) {
    control += `<option value="" disabled${!selected ? ' selected' : ''}>${escapeText(placeholder)}</option>`;
  }
  for (const raw of items) {
    const item = normalizeItem(raw);
    const selectedAttr = item.value === selected ? ' selected' : '';
    const itemDisabled = item.disabled ? ' disabled' : '';
    control += `<option value="${escapeAttr(item.value)}"${selectedAttr}${itemDisabled}>${escapeText(item.label)}</option>`;
  }
  control += `</select>`;

  return renderField({ id, label, control, helpText, error });
}
