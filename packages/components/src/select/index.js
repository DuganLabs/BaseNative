// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'select';
export const root = 'select';

/**
 * @typedef {object} SelectOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} SelectProps
 * @property {SelectOption[]} options
 * @property {string} [value] The initially selected option value.
 * @property {string} [id] The control id a field's label points at.
 * @property {string} [variant] A registered variant name.
 * @property {boolean} [disabled]
 * @property {(value: string) => void} [onChoose]
 */

/** @param {SelectProps} props */
export function create(props) {
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError('select: options must be a non-empty array');
  }

  const options = signal(props.options);
  const value = signal(props.value ?? props.options[0].value);
  const controlId = signal(props.id ?? '');
  const variant = signal(props.variant ?? 'default');
  const disabled = signal(props.disabled ?? false);

  /** @param {SelectOption} option */
  function isSelected(option) {
    return option.value === value();
  }

  /** @param {{ target: { value: string } }} event */
  function choose(event) {
    value.set(event.target.value);
    props.onChoose?.(event.target.value);
  }

  return { options, value, controlId, variant, disabled, isSelected, choose };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('select', 'default', {});
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const select = { name, root, create, registerVariants, template, styles };
export default select;
