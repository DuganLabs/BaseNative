// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'dropdown-menu';
export const root = 'menu';

/**
 * A menu of actions or links, carrying the WAI-ARIA APG menu keyboard
 * pattern in its view model: ArrowDown / ArrowUp move between items,
 * wrapping at the ends; Home / End jump to the first / last item.
 * Disabled items stay in the arrow order but never activate.
 * Activating an item reports through `onSelect` with the item's
 * action. Open / close and focus-on-open belong to the composition
 * that hosts the menu (a trigger button and the Popover API, as in
 * the app bar): when the menu opens, the host focuses the first item
 * and this model handles everything from there.
 *
 * @typedef {object} DropdownMenuItem
 * @property {string} [label]
 * @property {string} [href] Renders a link; without it the item is a button.
 * @property {string} [action] Carried on the select event.
 * @property {boolean} [disabled] In the arrow order, never activates.
 * @property {boolean} [separator] Renders a rule instead of an action.
 *
 * @typedef {object} DropdownMenuProps
 * @property {DropdownMenuItem[]} items
 * @property {string} [label] Accessible name.
 * @property {(action: string, item: DropdownMenuItem) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {DropdownMenuProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('dropdown-menu: items is required');

  const items = signal(props.items);
  const label = signal(props.label ?? '');
  const variant = signal(props.variant ?? 'default');

  /** @param {DropdownMenuItem} item */
  function isDisabled(item) {
    return item.disabled ? 'true' : 'false';
  }

  /** @param {DropdownMenuItem} item */
  function activate(item) {
    if (item.disabled || item.separator) return;
    props.onSelect?.(item.action ?? '', item);
  }

  /**
   * APG menu keys: arrows move focus between the menu's items in the
   * DOM (wrapping), Home / End jump to the ends. Items are re-queried
   * on every keypress, so items rendered after creation are included.
   * @param {KeyboardEvent} event
   */
  function onKeydown(event) {
    const target = (event.currentTarget ?? event.target);
    const menu = target?.closest?.('menu');
    if (!menu) return;
    const list = [...menu.querySelectorAll('[role="menuitem"]')];
    const index = list.indexOf(target);
    if (index < 0) return;
    let next;
    switch (event.key) {
      case 'ArrowDown': next = list[(index + 1) % list.length]; break;
      case 'ArrowUp': next = list[(index - 1 + list.length) % list.length]; break;
      case 'Home': next = list[0]; break;
      case 'End': next = list[list.length - 1]; break;
      default: return;
    }
    event.preventDefault();
    next?.focus();
  }

  return { items, label, variant, isDisabled, activate, onKeydown };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('dropdown-menu', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const dropdownMenu = { name, root, create, registerVariants, template, styles };
export default dropdownMenu;
