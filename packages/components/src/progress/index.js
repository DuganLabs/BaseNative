// @ts-check
import { signal, computed } from '@basenative/runtime';

export const name = 'progress';
export const root = 'progress';

/**
 * @typedef {object} ProgressProps
 * @property {number | null} [value] Omit or null for an indeterminate bar.
 * @property {number} [max]
 * @property {string} [variant] A registered variant name.
 */

/** @param {ProgressProps} props */
export function create(props = {}) {
  const value = signal(props.value ?? null);
  const max = signal(props.max ?? 100);
  const variant = signal(props.variant ?? 'default');
  const isIndeterminate = computed(() => value() === null);

  return { value, max, variant, isIndeterminate };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('progress', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const progress = { name, root, create, registerVariants, template, styles };
export default progress;
