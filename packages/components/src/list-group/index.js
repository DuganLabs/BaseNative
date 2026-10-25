// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'list-group';
export const root = 'ul';

/**
 * @typedef {object} ListGroupItem
 * @property {string} [label] Plain text content.
 * @property {string} [contentHtml] Rendered HTML (a nested component) — takes precedence over label.
 * @property {string} [trailingHtml] Rendered HTML pinned to the row's end (a badge, a nested button).
 *
 * @typedef {object} ListGroupProps
 * @property {ListGroupItem[]} items
 * @property {string} [variant] A registered variant name.
 */

/** @param {ListGroupProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('list-group: items is required');

  const items = signal(props.items);
  const variant = signal(props.variant ?? 'default');

  return { items, variant, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('list-group', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const listGroup = { name, root, create, registerVariants, template, styles };
export default listGroup;
