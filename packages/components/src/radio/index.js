// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'radio';
export const root = 'fieldset';

/**
 * @typedef {object} RadioOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} RadioProps
 * @property {string} legend
 * @property {string} name The shared input name that makes the group exclusive.
 * @property {RadioOption[]} options
 * @property {string} [value] The initially selected option value.
 * @property {string} [variant] A registered variant name.
 * @property {(value: string) => void} [onChoose]
 */

/** @param {RadioProps} props */
export function create(props) {
  if (!props.legend) throw new TypeError('radio: legend is required');
  if (!props.name) throw new TypeError('radio: name is required');
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError('radio: options must be a non-empty array');
  }

  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const options = signal(props.options);
  const variant = signal(props.variant ?? 'default');
  const value = signal(props.value ?? props.options[0].value);

  /** @param {RadioOption} option */
  function isChecked(option) {
    return option.value === value();
  }

  /** @param {RadioOption} option */
  function choose(option) {
    value.set(option.value);
    props.onChoose?.(option.value);
  }

  return { legend, groupName, options, variant, value, isChecked, choose };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('radio', 'default', {});
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const radio = { name, root, create, registerVariants, template, styles };
export default radio;
