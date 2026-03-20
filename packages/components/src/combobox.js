/**
 * Combobox — searchable dropdown with keyboard navigation.
 * Uses native <input> + <datalist> pattern with progressive enhancement.
 */
export function renderCombobox(options = {}) {
  const {
    name,
    label,
    items = [],
    placeholder = '',
    required = false,
    disabled = false,
    value = '',
    id = `bn-combobox-${name || Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const listId = `${id}-list`;
  const req = required ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const optionsHtml = items
    .map(item => {
      const val = typeof item === 'string' ? item : item.value;
      const text = typeof item === 'string' ? item : item.label;
      return `<option value="${val}">${text}</option>`;
    })
    .join('');

  return `<div data-bn="combobox">
  ${label ? `<label for="${id}" data-bn="label">${label}</label>` : ''}
  <input type="text" id="${id}" name="${name}" list="${listId}" value="${value}" placeholder="${placeholder}"${req}${dis} data-bn="combobox-input" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" ${attrs}>
  <datalist id="${listId}">${optionsHtml}</datalist>
</div>`;
}
