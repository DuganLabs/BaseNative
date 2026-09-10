/**
 * Input component — wraps native <input> with field system integration.
 *
 * Usage (SSR template):
 *   <div data-bn="field">
 *     <label for="email">Email</label>
 *     <input data-bn="input" type="email" id="email" name="email" />
 *     <span data-bn="field-error"></span>
 *   </div>
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';
import { describedBy, renderField } from './internal/field.js';

/**
 * Server-side render helper for an input field group.
 *
 * Every attribute (id, name, type, value, placeholder) and every text field
 * (label, helpText, error) is escaped. Help text gets id `<id>-help`, the error
 * gets `<id>-error`, and aria-describedby lists whichever are present.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.type='text']
 * @param {string} [options.label]
 * @param {string} [options.placeholder]
 * @param {string} [options.value]
 * @param {boolean} [options.required]
 * @param {boolean} [options.disabled]
 * @param {string} [options.helpText]
 * @param {string} [options.error]
 * @param {string} [options.id]     Defaults to name
 * @param {string} [options.attrs]  Raw attribute markup appended to the <input>; not escaped
 * @returns {string}
 */
export function renderInput(options = {}) {
  const {
    name,
    type = 'text',
    label,
    placeholder = '',
    value = '',
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

  const control = `<input data-bn="input" type="${escapeAttr(type)}" id="${escapeAttr(id)}" name="${escapeAttr(name)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"${requiredAttr}${disabledAttr}${describedBy(id, helpText, error)}${ariaInvalid}${attrsSuffix(attrs)} />`;

  return renderField({ id, label, control, helpText, error });
}
