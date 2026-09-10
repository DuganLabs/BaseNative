/**
 * Dropdown menu — popover-based menu.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Dropdown menu — popover-based menu with role="menu" / "menuitem".
 *
 * @param {object} [options]
 * @param {string} [options.trigger]  HTML slot: not escaped; pass trusted markup only
 * @param {Array<{label?: string, action?: string, icon?: string, shortcut?: string, disabled?: boolean, separator?: boolean}>} [options.items]
 *   label and shortcut are escaped text; action is an escaped attribute; icon is an HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.position='bottom-start']
 * @param {string} [options.id]       Defaults to nextId('dropdown')
 * @param {string} [options.attrs]    Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderDropdownMenu(options = {}) {
  const {
    trigger = '',
    items = [],
    position = 'bottom-start',
    id = nextId('dropdown'),
    attrs = '',
  } = options;

  const itemsHtml = items
    .map(item => {
      if (item.separator) return `<hr data-bn="dropdown-separator" role="separator">`;
      const dis = item.disabled ? ' aria-disabled="true"' : '';
      const icon = item.icon ? `<span data-bn="dropdown-icon">${item.icon}</span>` : '';
      const shortcut = item.shortcut ? `<span data-bn="dropdown-shortcut">${escapeText(item.shortcut)}</span>` : '';
      return `<button data-bn="dropdown-item" role="menuitem" data-action="${escapeAttr(item.action ?? '')}"${dis} type="button">${icon}${escapeText(item.label ?? '')}${shortcut}</button>`;
    })
    .join('');

  return `<div data-bn="dropdown"${attrsSuffix(attrs)}>
  <button data-bn="dropdown-trigger" popovertarget="${escapeAttr(id)}" type="button">${trigger}</button>
  <div data-bn="dropdown-menu" id="${escapeAttr(id)}" popover data-position="${escapeAttr(position)}" role="menu">${itemsHtml}</div>
</div>`;
}
