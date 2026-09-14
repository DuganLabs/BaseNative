/**
 * Dropdown menu — popover-based menu.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Dropdown menu — popover-based menu with role="menu" / "menuitem".
 *
 * Open, Escape and light dismiss come from the Popover API with no script.
 * Pair with `initDropdownMenu()` on the client for the APG menu keys —
 * arrows, Home and End between items — and to close the menu when an item
 * is activated.
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

const TRIGGER = '[data-bn="dropdown-trigger"]';
const MENU = '[data-bn="dropdown-menu"]';
const ITEM = '[data-bn="dropdown-item"]';

function closestFrom(target, selector) {
  return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

/**
 * Client-side: wire a rendered `[data-bn="dropdown"]` element to the WAI-ARIA
 * APG menu-button keys. The Popover API already opens the menu from the
 * trigger, closes it on Escape and light dismiss, and returns focus to the
 * trigger — this adds what it does not.
 *
 * When the popover opens (its `toggle` event) focus moves to the first item —
 * or the last, when it was opened with ArrowUp on the trigger. ArrowDown /
 * ArrowUp move between items, wrapping at the ends; Home / End go to the
 * first / last. ArrowDown / ArrowUp on the trigger open the menu. Disabled
 * items (`aria-disabled="true"`) stay in the arrow order but do not
 * activate. Activating an item (its click, so Enter / Space too) hides the
 * popover and calls `onSelect(action, item)` with its `data-action`. Items
 * are re-queried on every interaction.
 *
 * @param {HTMLElement} root  The [data-bn="dropdown"] element
 * @param {object} [options]
 * @param {(action: string, item: HTMLElement) => void} [options.onSelect]
 * @returns {{ open(): void, close(): void, isOpen(): boolean, destroy(): void }}
 */
export function initDropdownMenu(root, options = {}) {
  const { onSelect } = options;
  const menu = root.querySelector(MENU);
  const items = () => Array.from(menu ? menu.querySelectorAll(ITEM) : []);
  let open = false;
  let focusOnOpen = 'first';

  function focusItem(item) {
    if (item && typeof item.focus === 'function') item.focus();
  }

  function show() {
    if (open || !menu || typeof menu.showPopover !== 'function') return;
    menu.showPopover();
  }

  function hide() {
    if (!open || !menu || typeof menu.hidePopover !== 'function') return;
    menu.hidePopover();
  }

  function onToggle(e) {
    open = e.newState === 'open';
    if (!open) return;
    const list = items();
    focusItem(focusOnOpen === 'last' ? list[list.length - 1] : list[0]);
    focusOnOpen = 'first';
  }

  function onClick(e) {
    const item = closestFrom(e.target, ITEM);
    if (!item) return;
    if (item.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      return;
    }
    hide();
    if (onSelect) onSelect(item.getAttribute('data-action') ?? '', item);
  }

  function onKeydown(e) {
    const list = items();
    if (!list.length) return;
    const item = closestFrom(e.target, ITEM);
    const onTrigger = !item && Boolean(closestFrom(e.target, TRIGGER));
    if (!item && !onTrigger) return;
    const index = list.indexOf(item);
    let next;
    switch (e.key) {
      case 'ArrowDown': next = item ? list[(index + 1) % list.length] : list[0]; break;
      case 'ArrowUp': next = item ? list[(index - 1 + list.length) % list.length] : list[list.length - 1]; break;
      case 'Home': next = list[0]; break;
      case 'End': next = list[list.length - 1]; break;
      default: return;
    }
    e.preventDefault();
    if (onTrigger && !open) {
      focusOnOpen = e.key === 'ArrowUp' || e.key === 'End' ? 'last' : 'first';
      show();
      return;
    }
    focusItem(next);
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  if (menu) menu.addEventListener('toggle', onToggle);

  return {
    open: show,
    close: hide,
    isOpen: () => open,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      if (menu) menu.removeEventListener('toggle', onToggle);
    },
  };
}
