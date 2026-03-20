/**
 * Date range picker — two date inputs for start/end.
 */
export function renderDateRange(options = {}) {
  const {
    nameStart = 'start_date',
    nameEnd = 'end_date',
    label,
    valueStart = '',
    valueEnd = '',
    min,
    max,
    required = false,
    disabled = false,
    id = `bn-daterange-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const req = required ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const minAttr = min ? ` min="${min}"` : '';
  const maxAttr = max ? ` max="${max}"` : '';

  return `<fieldset data-bn="daterange" ${attrs}>
  ${label ? `<legend data-bn="label">${label}</legend>` : ''}
  <div data-bn="daterange-inputs">
    <div data-bn="daterange-start">
      <label for="${id}-start">Start</label>
      <input type="date" id="${id}-start" name="${nameStart}" value="${valueStart}"${minAttr}${maxAttr}${req}${dis} data-bn="daterange-input">
    </div>
    <span data-bn="daterange-separator" aria-hidden="true">–</span>
    <div data-bn="daterange-end">
      <label for="${id}-end">End</label>
      <input type="date" id="${id}-end" name="${nameEnd}" value="${valueEnd}"${minAttr}${maxAttr}${req}${dis} data-bn="daterange-input">
    </div>
  </div>
</fieldset>`;
}
