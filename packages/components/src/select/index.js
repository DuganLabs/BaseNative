// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'select';
export const root = 'section';

/**
 * @typedef {object} SelectOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} SelectProps
 * @property {SelectOption[]} options
 * @property {string} [value] The initially selected option value.
 * @property {string} [id] The control id a field's label points at.
 * @property {string} [name] The field name reported with each choice.
 * @property {string} [label] Names the popover's listbox.
 * @property {string} [variant] A registered variant name. "select" (the
 *   default) is a positioned popover: a trigger button and its listbox.
 *   "native" renders the platform select element and its own menu.
 * @property {boolean} [open] Whether the popover starts open.
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
  const open = signal(props.open ?? false);
  const controlId = signal(props.id ?? '');
  const fieldName = signal(props.name ?? '');
  const label = signal(props.label ?? '');
  const variant = signal(props.variant ?? 'select');
  const disabled = signal(props.disabled ?? false);

  function isNative() {
    return variant() === 'native';
  }

  function isPopover() {
    return variant() !== 'native';
  }

  /** @param {SelectOption} option */
  function isSelected(option) {
    return option.value === value();
  }

  /** @param {SelectOption} option */
  function selectedAttr(option) {
    return isSelected(option) ? 'true' : 'false';
  }

  function selectedLabel() {
    return options().find((option) => option.value === value())?.label ?? '';
  }

  function listboxId() {
    return controlId() === '' ? '' : `${controlId()}-listbox`;
  }

  /** @param {SelectOption} option */
  function optionId(option) {
    return controlId() === '' ? '' : `${controlId()}-option-${option.value}`;
  }

  function expandedAttr() {
    return open() ? 'true' : 'false';
  }

  function toggle() {
    open.set(!open());
  }

  function close() {
    open.set(false);
  }

  /** @param {SelectOption} option */
  function choose(option) {
    value.set(option.value);
    open.set(false);
    props.onChoose?.(option.value);
  }

  /** @param {{ target: { value: string } }} event */
  function chooseNative(event) {
    const option = options().find((entry) => entry.value === event.target.value);
    if (option) choose(option);
  }

  /** @param {{ key: string, preventDefault?: () => void }} event */
  function keydown(event) {
    if (event.key === 'Escape') {
      open.set(false);
      return;
    }
    /* The APG listbox button: an arrow key on the closed trigger
       opens the popup (Enter and Space already reach toggle()
       through the button's native click). */
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open()) {
      event.preventDefault?.();
      open.set(true);
    }
  }

  return {
    options, value, open, controlId, fieldName, label, variant, disabled,
    isNative, isPopover, isSelected, selectedAttr, selectedLabel,
    listboxId, optionId, expandedAttr, toggle, close, choose, chooseNative, keydown,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('select', 'select');
  registry.registerVariant('select', 'native');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const select = { name, root, create, registerVariants, template, styles };
export default select;
