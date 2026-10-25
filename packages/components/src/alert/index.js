// @ts-check
import { signal, computed } from '@basenative/runtime';

export const name = 'alert';
export const root = 'aside';

/**
 * @typedef {object} AlertProps
 * @property {string} title
 * @property {string} body
 * @property {string} [variant] info (default), success, warning, or danger.
 *   The variant also picks the ARIA role: danger announces as "alert",
 *   the rest as "status" — semantics follow the registered variant.
 */

/** @param {AlertProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('alert: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const variant = signal(props.variant ?? 'info');
  const role = computed(() => (variant() === 'danger' ? 'alert' : 'status'));

  return { title, body, variant, role };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('alert', 'info');
  registry.registerVariant('alert', 'success');
  registry.registerVariant('alert', 'warning');
  registry.registerVariant('alert', 'danger');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const alert = { name, root, create, registerVariants, template, styles };
export default alert;
