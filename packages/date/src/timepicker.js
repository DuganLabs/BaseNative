import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';

/**
 * Time picker using native <input type="time">.
 *
 * Caller-supplied values are escaped; `attrs` is a raw markup composition
 * point, inserted verbatim. See renderDatepicker for the full contract.
 *
 * @param {object} [options]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <input>; not escaped
 * @returns {string}
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
  const minAttr = min ? ` min="${escapeAttr(min)}"` : '';
  const maxAttr = max ? ` max="${escapeAttr(max)}"` : '';
  const stepAttr = step ? ` step="${escapeAttr(step)}"` : '';
  const safeId = escapeAttr(id);

  return `<div data-bn="timepicker">
  ${label ? `<label for="${safeId}" data-bn="label">${escapeText(label)}</label>` : ''}
  <input type="time" id="${safeId}" name="${escapeAttr(name ?? '')}" value="${escapeAttr(value)}"${minAttr}${maxAttr}${stepAttr}${req}${dis} data-bn="timepicker-input"${attrs ? ' ' + attrs : ''}>
</div>`;
}
