/**
 * Checkbox component — native <input type="checkbox"> with label association.
 */

export function renderCheckbox(options = {}) {
  const { name, label, checked = false, disabled = false, value = '', attrs = '' } = options;
  const id = options.id || name;
  const checkedAttr = checked ? ' checked' : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const valueAttr = value ? ` value="${escapeAttr(value)}"` : '';
  const extra = attrs ? ' ' + attrs : '';

  return `<label data-bn="checkbox-label"${extra}><input data-bn="checkbox" type="checkbox" id="${id}" name="${name}"${valueAttr}${checkedAttr}${disabledAttr} /><span>${label || ''}</span></label>`;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
