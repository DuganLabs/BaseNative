// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'input';
export const root = 'input';

/**
 * @typedef {object} InputProps
 * @property {string} [value]
 * @property {string} [id] The control id a field's label points at.
 * @property {string} [variant] A registered variant name.
 * @property {string} [type]
 * @property {boolean} [disabled]
 * @property {boolean} [invalid]
 */

/** @param {InputProps} props */
export function create(props = {}) {
  const value = signal(props.value ?? '');
  const controlId = signal(props.id ?? '');
  const variant = signal(props.variant ?? 'default');
  const type = signal(props.type ?? 'text');
  const disabled = signal(props.disabled ?? false);
  const isInvalid = signal(props.invalid ?? false);

  /** @param {{ target: { value: string } }} event */
  function update(event) {
    value.set(event.target.value);
  }

  return { value, controlId, variant, type, disabled, isInvalid, update };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('input', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const input = { name, root, create, registerVariants, template, styles };
export default input;
