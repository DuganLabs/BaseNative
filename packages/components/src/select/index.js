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
  /* The option the keyboard or pointer is on while the list is open,
     distinct from the chosen value. */
  const activeValue = signal(open() ? value() : '');

  /** The field name, or no attribute when unnamed (an unnamed select is
      not a form field). */
  function nameAttr() {
    return fieldName() === '' ? null : fieldName();
  }

  /** The popover variant submits through a hidden input; the native
      variant's platform <select> carries the name itself. */
  function hasHiddenField() {
    return isPopover() && fieldName() !== '';
  }

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

  /** Opening lands the active option on the chosen one.
      @param {boolean} next */
  function setOpen(next) {
    if (next) activeValue.set(value());
    open.set(next);
  }

  function toggle() {
    setOpen(!open());
  }

  function close() {
    setOpen(false);
  }

  /** @param {SelectOption} option */
  function isActive(option) {
    return open() && option.value === activeValue();
  }

  /** @param {SelectOption} option */
  function activeVariant(option) {
    return isActive(option) ? 'active' : null;
  }

  function activeDescendant() {
    if (!open()) return null;
    const active = options().find((option) => option.value === activeValue());
    return active && optionId(active) !== '' ? optionId(active) : null;
  }

  /** @param {SelectOption} option */
  function activate(option) {
    activeValue.set(option.value);
  }

  /** @param {number} index */
  function activateIndex(index) {
    const list = options();
    activeValue.set(list[Math.max(0, Math.min(list.length - 1, index))].value);
  }

  function activeIndex() {
    return options().findIndex((option) => option.value === activeValue());
  }

  /** Type-ahead: the next option (after the active one, wrapping)
      whose label starts with the typed character.
      @param {string} char */
  function typeAhead(char) {
    const list = options();
    const start = activeIndex();
    for (let step = 1; step <= list.length; step += 1) {
      const option = list[(start + step) % list.length];
      if (option.label.toLowerCase().startsWith(char.toLowerCase())) {
        activeValue.set(option.value);
        return true;
      }
    }
    return false;
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
       opens the popup on the chosen option (Enter and Space reach
       toggle() through the button's native click). */
    if (!open()) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault?.();
        setOpen(true);
      }
      return;
    }
    /* Open: the arrows, Home and End move the active option, a
       printable character jumps to the next label it starts, and
       Enter or Space chooses — default prevented, so the trigger's
       own click does not reopen the popover. Tab closes and moves on. */
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault?.();
        activateIndex(activeIndex() + 1);
        return;
      case 'ArrowUp':
        event.preventDefault?.();
        activateIndex(activeIndex() - 1);
        return;
      case 'Home':
        event.preventDefault?.();
        activateIndex(0);
        return;
      case 'End':
        event.preventDefault?.();
        activateIndex(options().length - 1);
        return;
      case 'Enter':
      case ' ': {
        event.preventDefault?.();
        const active = options().find((option) => option.value === activeValue());
        if (active) choose(active);
        else close();
        return;
      }
      case 'Tab':
        close();
        return;
      default:
        if (event.key.length === 1 && typeAhead(event.key)) event.preventDefault?.();
    }
  }

  return {
    options, value, open, controlId, fieldName, label, variant, disabled, nameAttr, hasHiddenField,
    activeValue, isNative, isPopover, isSelected, selectedAttr, selectedLabel,
    isActive, activeVariant, activeDescendant, activate,
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
