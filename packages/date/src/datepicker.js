import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';

/**
 * Date picker using native <input type="date"> with progressive enhancement.
 *
 * Every caller-supplied value is escaped: attribute values with `escapeAttr`,
 * the label's text content with `escapeText`. `attrs` is the one exception —
 * it is a markup composition point, inserted verbatim, matching
 * @basenative/components' documented convention. Pass trusted markup only.
 *
 * @param {object} [options]
 * @param {string} [options.name]
 * @param {string} [options.label]
 * @param {string} [options.value]
 * @param {string} [options.min]
 * @param {string} [options.max]
 * @param {boolean} [options.required]
 * @param {boolean} [options.disabled]
 * @param {string} [options.id]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <input>; not escaped
 * @returns {string}
 */
export function renderDatepicker(options = {}) {
  const {
    name,
    label,
    value = '',
    min,
    max,
    required = false,
    disabled = false,
    id = `bn-date-${name || Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const req = required ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const minAttr = min ? ` min="${escapeAttr(min)}"` : '';
  const maxAttr = max ? ` max="${escapeAttr(max)}"` : '';
  const safeId = escapeAttr(id);

  return `<div data-bn="datepicker">
  ${label ? `<label for="${safeId}" data-bn="label">${escapeText(label)}</label>` : ''}
  <input type="date" id="${safeId}" name="${escapeAttr(name ?? '')}" value="${escapeAttr(value)}"${minAttr}${maxAttr}${req}${dis} data-bn="datepicker-input"${attrs ? ' ' + attrs : ''}>
</div>`;
}

/**
 * Generate a calendar grid for a given month.
 */
export function generateCalendarMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const weeks = [];
  let week = new Array(startDow).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push({ day, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return {
    year,
    month,
    monthName: firstDay.toLocaleString('default', { month: 'long' }),
    weeks,
    daysInMonth,
  };
}
