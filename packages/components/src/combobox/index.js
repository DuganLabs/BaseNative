// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'combobox';
export const root = 'section';

/**
 * The combobox pattern: a text input (the input component, rendered by
 * the caller with role="combobox", aria-expanded and aria-controls
 * wired to this component's listbox id) plus its listbox popup. The
 * plan map rooted this in a <p> like field, but a listbox is flow
 * content and cannot live inside a <p> — the root is a <section>, and
 * field remains the <p> pattern for phrasing-only groups.
 *
 * @typedef {object} ComboboxOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} ComboboxProps
 * @property {string} id Base id; the listbox and option ids derive from it.
 * @property {string} label Accessible name for the popup.
 * @property {string} inputHtml The rendered input component.
 * @property {ComboboxOption[]} [options] Already filtered by the caller.
 * @property {boolean} [open]
 * @property {string} [activeValue] The aria-activedescendant value.
 * @property {(event: { value: string, label: string }) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {ComboboxProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('combobox: id is required');
  if (!props.inputHtml) throw new TypeError('combobox: inputHtml is required (render the input component)');

  const label = signal(props.label ?? '');
  const inputHtml = signal(props.inputHtml);
  const options = signal(props.options ?? []);
  const open = signal(props.open ?? false);
  const activeValue = signal(props.activeValue ?? '');
  const value = signal('');
  const variant = signal(props.variant ?? 'default');

  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (/** @type {ComboboxOption} */ option) => `${props.id}-option-${option.value}`;
  const isActive = (/** @type {ComboboxOption} */ option) => (option.value === activeValue() ? 'true' : 'false');
  const select = (/** @type {ComboboxOption} */ option) => {
    value.set(option.value);
    open.set(false);
    props.onSelect?.({ value: option.value, label: option.label });
  };

  return { label, inputHtml, options, open, activeValue, value, variant, listboxId, optionId, isActive, select, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('combobox', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const combobox = { name, root, create, registerVariants, template, styles };
export default combobox;
