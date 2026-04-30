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

/**
 * Server-side render helper for an input field group.
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
  const ariaDescribed = helpText || error ? ` aria-describedby="${id}-help"` : '';
  const ariaInvalid = error ? ' aria-invalid="true"' : '';
  const extra = attrs ? ' ' + attrs : '';

  let html = `<div data-bn="field">`;
  if (label) {
    html += `<label for="${id}">${label}</label>`;
  }
  html += `<input data-bn="input" type="${type}" id="${id}" name="${name}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"${requiredAttr}${disabledAttr}${ariaDescribed}${ariaInvalid}${extra} />`;
  if (helpText) {
    html += `<span data-bn="field-help" id="${id}-help">${helpText}</span>`;
  }
  if (error) {
    html += `<span data-bn="field-error" id="${id}-help" role="alert">${error}</span>`;
  }
  html += `</div>`;
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
