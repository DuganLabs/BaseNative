// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'toggle';
export const root = 'input';

/**
 * A switch is a checkbox with role="switch"; its registered tag is
 * input[variant="switch"], distinct from the checkbox's own tag on the
 * same element — the registry refuses (element, variant) collisions.
 *
 * @typedef {object} ToggleProps
 * @property {string} label
 * @property {boolean} [checked]
 * @property {boolean} [disabled]
 * @property {(checked: boolean) => void} [onToggle]
 */

/** @param {ToggleProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('toggle: label is required');

  const label = signal(props.label);
  const variant = signal('switch');
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
  registry.registerVariant('toggle', 'switch');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const toggle = { name, root, create, registerVariants, template, styles };
export default toggle;
