/**
 * Textarea component — wraps native <textarea> with field system integration.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';
import { describedBy, renderField } from './internal/field.js';

/**
 * Server-side render helper for a textarea field group.
 *
 * Attributes and text fields are escaped. Help text gets id `<id>-help`, the
 * error gets `<id>-error`, and aria-describedby lists whichever are present —
 * the same policy as renderInput.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.label]
 * @param {string} [options.placeholder]
 * @param {string} [options.value]
 * @param {number} [options.rows=3]
 * @param {boolean} [options.required]
 * @param {boolean} [options.disabled]
 * @param {string} [options.helpText]
 * @param {string} [options.error]
 * @param {string} [options.id]     Defaults to name
 * @param {string} [options.attrs]  Raw attribute markup appended to the <textarea>; not escaped
 * @returns {string}
 */
export function renderTextarea(options = {}) {
  const {
    name,
    label,
    placeholder = '',
    value = '',
    rows = 3,
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

  const control = `<textarea data-bn="textarea" id="${escapeAttr(id)}" name="${escapeAttr(name)}" rows="${escapeAttr(rows)}" placeholder="${escapeAttr(placeholder)}"${requiredAttr}${disabledAttr}${describedBy(id, helpText, error)}${ariaInvalid}${attrsSuffix(attrs)}>${escapeText(value)}</textarea>`;

  return renderField({ id, label, control, helpText, error });
}
