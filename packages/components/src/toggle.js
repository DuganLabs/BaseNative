/**
 * Toggle/Switch component — <input type="checkbox" role="switch">.
 * Uses native semantic switch pattern.
 */

export function renderToggle(options = {}) {
  const { name, label, checked = false, disabled = false } = options;
  const id = options.id || name;
  const checkedAttr = checked ? ' checked' : '';
  const disabledAttr = disabled ? ' disabled' : '';

  return `<label data-bn="toggle-label"><input data-bn="toggle" type="checkbox" role="switch" id="${id}" name="${name}"${checkedAttr}${disabledAttr} /><span>${label || ''}</span></label>`;
}
