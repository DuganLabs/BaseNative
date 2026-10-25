// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'checkbox';
export const root = 'input';

/**
 * The registered element is the input itself (variant "checkbox"), so a
 * label wrapping it stays a plain semantic label; the fieldset of a radio
 * group and the switch input register different tags on shared elements.
 *
 * @typedef {object} CheckboxProps
 * @property {string} label
 * @property {boolean} [checked]
 * @property {boolean} [disabled]
 * @property {(checked: boolean) => void} [onToggle]
 */

/** @param {CheckboxProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('checkbox: label is required');

  const label = signal(props.label);
  const variant = signal('checkbox');
  const checked = signal(props.checked ?? false);
  const disabled = signal(props.disabled ?? false);

  /** @param {{ target: { checked: boolean } }} event */
  function toggle(event) {
    checked.set(event.target.checked);
    props.onToggle?.(event.target.checked);
  }

  return { label, variant, checked, disabled, toggle };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('checkbox', 'checkbox', {});
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const checkbox = { name, root, create, registerVariants, template, styles };
export default checkbox;
