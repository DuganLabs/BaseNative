/**
 * Date picker using native <input type="date"> with progressive enhancement.
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
  const minAttr = min ? ` min="${min}"` : '';
  const maxAttr = max ? ` max="${max}"` : '';

  return `<div data-bn="datepicker">
  ${label ? `<label for="${id}" data-bn="label">${label}</label>` : ''}
  <input type="date" id="${id}" name="${name}" value="${value}"${minAttr}${maxAttr}${req}${dis} data-bn="datepicker-input" ${attrs}>
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
