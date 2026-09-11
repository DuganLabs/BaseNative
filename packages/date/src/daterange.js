import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';

/**
 * Date range picker — two date inputs for start/end.
 *
 * Caller-supplied values are escaped; `attrs` is a raw markup composition
 * point, inserted verbatim. See renderDatepicker for the full contract.
 *
 * @param {object} [options]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <fieldset>; not escaped
 * @returns {string}
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
  const minAttr = min ? ` min="${escapeAttr(min)}"` : '';
  const maxAttr = max ? ` max="${escapeAttr(max)}"` : '';
  const safeId = escapeAttr(id);

  return `<fieldset data-bn="daterange"${attrs ? ' ' + attrs : ''}>
  ${label ? `<legend data-bn="label">${escapeText(label)}</legend>` : ''}
  <div data-bn="daterange-inputs">
    <div data-bn="daterange-start">
      <label for="${safeId}-start">Start</label>
      <input type="date" id="${safeId}-start" name="${escapeAttr(nameStart)}" value="${escapeAttr(valueStart)}"${minAttr}${maxAttr}${req}${dis} data-bn="daterange-input">
    </div>
    <span data-bn="daterange-separator" aria-hidden="true">–</span>
    <div data-bn="daterange-end">
      <label for="${safeId}-end">End</label>
      <input type="date" id="${safeId}-end" name="${escapeAttr(nameEnd)}" value="${escapeAttr(valueEnd)}"${minAttr}${maxAttr}${req}${dis} data-bn="daterange-input">
    </div>
  </div>
</fieldset>`;
}
