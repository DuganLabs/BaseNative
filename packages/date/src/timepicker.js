/**
 * Time picker using native <input type="time">.
 */
export function renderTimepicker(options = {}) {
  const {
    name,
    label,
    value = '',
    min,
    max,
    step,
    required = false,
    disabled = false,
    id = `bn-time-${name || Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const req = required ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const minAttr = min ? ` min="${min}"` : '';
  const maxAttr = max ? ` max="${max}"` : '';
  const stepAttr = step ? ` step="${step}"` : '';

  return `<div data-bn="timepicker">
  ${label ? `<label for="${id}" data-bn="label">${label}</label>` : ''}
  <input type="time" id="${id}" name="${name}" value="${value}"${minAttr}${maxAttr}${stepAttr}${req}${dis} data-bn="timepicker-input" ${attrs}>
</div>`;
}
