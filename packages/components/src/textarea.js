/**
 * Textarea component — wraps native <textarea> with field system integration.
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
  const extra = attrs ? ' ' + attrs : '';

  let html = `<div data-bn="field">`;
  if (label) {
    html += `<label for="${id}">${label}</label>`;
  }
  html += `<textarea data-bn="textarea" id="${id}" name="${name}" rows="${rows}" placeholder="${escapeAttr(placeholder)}"${requiredAttr}${disabledAttr}${ariaInvalid}${extra}>${escapeHtml(value)}</textarea>`;
  if (helpText) {
    html += `<span data-bn="field-help" id="${id}-help">${helpText}</span>`;
  }
  if (error) {
    html += `<span data-bn="field-error" role="alert">${error}</span>`;
  }
  html += `</div>`;
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
