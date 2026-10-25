// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'badge';
export const root = 'small';

/**
 * @typedef {object} BadgeProps
 * @property {string} label
 * @property {string} [variant] A registered variant name.
 */

/** @param {BadgeProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('badge: label is required');

  const label = signal(props.label);
  const variant = signal(props.variant ?? 'default');

  return { label, variant };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('badge', 'default', {});
  registry.registerVariant('badge', 'info', {
    '--badge-background-color': 'var(--tint-fill)',
    '--badge-color': 'var(--tint)',
  });
  registry.registerVariant('badge', 'success', {
    '--badge-background-color': 'var(--success-fill)',
    '--badge-color': 'var(--success-strong)',
  });
  registry.registerVariant('badge', 'warning', {
    '--badge-background-color': 'var(--warning-fill)',
    '--badge-color': 'var(--warning-strong)',
  });
  registry.registerVariant('badge', 'danger', {
    '--badge-background-color': 'var(--danger-fill)',
    '--badge-color': 'var(--danger-strong)',
  });
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const badge = { name, root, create, registerVariants, template, styles };
export default badge;
