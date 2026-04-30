/**
 * Select component — native <select> with optional base-select enhancement.
 * Feature-detected styling via browserFeatures.baseSelect from runtime.
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
  html += `<select data-bn="select" id="${id}" name="${name}"${requiredAttr}${disabledAttr}${ariaInvalid}${extra}>`;
  if (placeholder) {
    html += `<option value="" disabled${!selected ? ' selected' : ''}>${escapeHtml(placeholder)}</option>`;
  }
  for (const item of items) {
    const value = typeof item === 'string' ? item : item.value;
    const itemLabel = typeof item === 'string' ? item : item.label;
    const selectedAttr = value === selected ? ' selected' : '';
    const itemDisabled = item.disabled ? ' disabled' : '';
    html += `<option value="${escapeAttr(value)}"${selectedAttr}${itemDisabled}>${escapeHtml(itemLabel)}</option>`;
  }
  html += `</select>`;
  if (error) {
    html += `<span data-bn="field-error" role="alert">${error}</span>`;
  }
  html += `</div>`;
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
