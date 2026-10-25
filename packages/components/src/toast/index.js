// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'toast';
export const root = 'ol';

/**
 * @typedef {object} ToastItem
 * @property {string} message
 * @property {string} [tone] info | success | warning | danger — an
 *   element-level registration on the item, styled exactly in this
 *   component's sheet.
 * @property {string} [dismissHtml] A rendered dismiss button.
 *
 * @typedef {object} ToastProps
 * @property {ToastItem[]} [items]
 * @property {string} [live] The aria-live politeness of the region.
 * @property {string} [variant] A registered variant name.
 */

/** @param {ToastProps} props */
export function create(props) {
  const items = signal(props.items ?? []);
  const live = signal(props.live ?? 'polite');
  const variant = signal(props.variant ?? 'default');

  return { items, live, variant, raw };
}

/**
 * The toaster: the app's toast queue as a view model. push() appends
 * and returns the item's id; dismiss(id) removes it. Timing (auto-
 * dismiss) is the app's policy, not the component's.
 */
export function createToaster() {
  const items = signal(/** @type {ToastItem[]} */ ([]));
  let nextId = 0;
  const push = (/** @type {ToastItem} */ item) => {
    nextId += 1;
    const id = `toast-${nextId}`;
    items.set([...items(), { ...item, dismissHtml: item.dismissHtml ?? '' }]);
    return id;
  };
  const dismiss = (/** @type {number} */ index) => {
    items.set(items().filter((_, i) => i !== index));
  };
  return { items, push, dismiss };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('toast', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const toast = { name, root, create, registerVariants, template, styles };
export default toast;
