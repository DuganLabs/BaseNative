/**
 * Multiselect — multiple value selection with tags/chips.
 */
export function renderMultiselect(options = {}) {
  const {
    name,
    label,
    items = [],
    selected = [],
    placeholder = 'Select items...',
    disabled = false,
    id = `bn-multiselect-${name || Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const dis = disabled ? ' disabled' : '';
  const selectedSet = new Set(selected);

  const tagsHtml = selected
    .map(val => {
      const item = items.find(i => (typeof i === 'string' ? i : i.value) === val);
      const text = item ? (typeof item === 'string' ? item : item.label) : val;
      return `<span data-bn="tag" data-value="${val}">${text}<button type="button" data-bn="tag-remove" aria-label="Remove ${text}">&times;</button></span>`;
    })
    .join('');

  const optionsHtml = items
    .map(item => {
      const val = typeof item === 'string' ? item : item.value;
      const text = typeof item === 'string' ? item : item.label;
      const sel = selectedSet.has(val) ? ' selected' : '';
      return `<option value="${val}"${sel}>${text}</option>`;
    })
    .join('');

  return `<div data-bn="multiselect"${dis ? ' data-disabled' : ''}>
  ${label ? `<label for="${id}" data-bn="label">${label}</label>` : ''}
  <div data-bn="multiselect-container">
    <div data-bn="multiselect-tags">${tagsHtml}</div>
    <input type="text" data-bn="multiselect-search" placeholder="${placeholder}" autocomplete="off" aria-label="${label || 'Search'}" ${attrs}>
  </div>
  <select id="${id}" name="${name}" multiple hidden${dis}>${optionsHtml}</select>
</div>`;
}
