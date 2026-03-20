/**
 * Radio component — native <input type="radio"> with group support.
 */

export function renderRadioGroup(options = {}) {
  const { name, label, items = [], selected = '', disabled = false } = options;

  let html = `<fieldset data-bn="radio-group">`;
  if (label) {
    html += `<legend>${label}</legend>`;
  }
  for (const item of items) {
    const value = typeof item === 'string' ? item : item.value;
    const itemLabel = typeof item === 'string' ? item : item.label;
    const checkedAttr = value === selected ? ' checked' : '';
    const disabledAttr = disabled || item.disabled ? ' disabled' : '';
    const id = `${name}-${value}`;
    html += `<label data-bn="radio-label"><input data-bn="radio" type="radio" id="${id}" name="${name}" value="${escapeAttr(value)}"${checkedAttr}${disabledAttr} /><span>${itemLabel}</span></label>`;
  }
  html += `</fieldset>`;
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
