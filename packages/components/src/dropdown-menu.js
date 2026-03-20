/**
 * Dropdown menu — popover-based menu.
 */
export function renderDropdownMenu(options = {}) {
  const {
    trigger,
    items = [],
    position = 'bottom-start',
    id = `bn-dropdown-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const itemsHtml = items
    .map(item => {
      if (item.separator) return `<hr data-bn="dropdown-separator" role="separator">`;
      const dis = item.disabled ? ' aria-disabled="true"' : '';
      const icon = item.icon ? `<span data-bn="dropdown-icon">${item.icon}</span>` : '';
      const shortcut = item.shortcut ? `<span data-bn="dropdown-shortcut">${item.shortcut}</span>` : '';
      return `<button data-bn="dropdown-item" role="menuitem" data-action="${item.action ?? ''}"${dis} type="button">${icon}${item.label}${shortcut}</button>`;
    })
    .join('');

  return `<div data-bn="dropdown" ${attrs}>
  <button data-bn="dropdown-trigger" popovertarget="${id}" type="button">${trigger}</button>
  <div data-bn="dropdown-menu" id="${id}" popover data-position="${position}" role="menu">${itemsHtml}</div>
</div>`;
}
