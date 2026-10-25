// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'breadcrumb';
export const root = 'nav';

/**
 * @typedef {object} BreadcrumbItem
 * @property {string} label
 * @property {string} [href] Absent on the current page's item.
 *
 * @typedef {object} BreadcrumbProps
 * @property {BreadcrumbItem[]} items Trail, root first; the last item is current.
 * @property {string} [label] Accessible name for the nav landmark.
 * @property {string} [variant] A registered variant name.
 */

/** @param {BreadcrumbProps} props */
export function create(props) {
  if (!Array.isArray(props.items) || props.items.length === 0) {
    throw new TypeError('breadcrumb: items is required');
  }

  const items = signal(props.items);
  const label = signal(props.label ?? 'Breadcrumb');
  const variant = signal(props.variant ?? 'breadcrumb');

  return { items, label, variant };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('breadcrumb', 'breadcrumb');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const breadcrumb = { name, root, create, registerVariants, template, styles };
export default breadcrumb;
