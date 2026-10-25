// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'dropdown-menu';
export const root = 'menu';

/**
 * @typedef {object} DropdownMenuItem
 * @property {string} [label]
 * @property {string} [href] Renders a link; without it the item is a button.
 * @property {boolean} [separator] Renders a rule instead of an action.
 *
 * @typedef {object} DropdownMenuProps
 * @property {DropdownMenuItem[]} items
 * @property {string} [label] Accessible name.
 * @property {string} [variant] A registered variant name.
 */

/** @param {DropdownMenuProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('dropdown-menu: items is required');

  const items = signal(props.items);
  const label = signal(props.label ?? '');
  const variant = signal(props.variant ?? 'default');

  return { items, label, variant };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('dropdown-menu', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const dropdownMenu = { name, root, create, registerVariants, template, styles };
export default dropdownMenu;
