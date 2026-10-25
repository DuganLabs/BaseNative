// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'multiselect';
export const root = 'section';

/**
 * The combobox pattern with a selection set: chosen options render as
 * a chip list above the input, each chip carrying a caller-rendered
 * dismiss button; the listbox is aria-multiselectable and options
 * report aria-selected from the set. toggle() is the one mutation —
 * it adds or removes a value and reports the whole set through
 * onChange, the same telemetry shape as choice-group.
 *
 * @typedef {object} MultiselectOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} MultiselectProps
 * @property {string} id Base id; the listbox and option ids derive from it.
 * @property {string} label Accessible name for the popup.
 * @property {string} inputHtml The rendered input component.
 * @property {MultiselectOption[]} [options]
 * @property {{ value: string, label: string, dismissHtml: string }[]} [selected]
 * @property {boolean} [open]
 * @property {(event: { values: string[] }) => void} [onChange]
 * @property {string} [variant] A registered variant name.
 */

/** @param {MultiselectProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('multiselect: id is required');
  if (!props.inputHtml) throw new TypeError('multiselect: inputHtml is required (render the input component)');

  const label = signal(props.label ?? '');
  const inputHtml = signal(props.inputHtml);
  const options = signal(props.options ?? []);
  const selected = signal(props.selected ?? []);
  const open = signal(props.open ?? false);
  const variant = signal(props.variant ?? 'multiselect');

  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (/** @type {MultiselectOption} */ option) => `${props.id}-option-${option.value}`;
  const hasSelected = computed(() => selected().length > 0);
  const isSelected = (/** @type {MultiselectOption} */ option) => (
    selected().some((item) => item.value === option.value) ? 'true' : 'false'
  );
  const toggle = (/** @type {MultiselectOption & { dismissHtml: string }} */ option) => {
    const current = selected();
    const next = current.some((item) => item.value === option.value)
      ? current.filter((item) => item.value !== option.value)
      : [...current, { value: option.value, label: option.label, dismissHtml: option.dismissHtml }];
    selected.set(next);
    props.onChange?.({ values: next.map((item) => item.value) });
  };

  return { label, inputHtml, options, selected, open, variant, listboxId, optionId, hasSelected, isSelected, toggle, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('multiselect', 'multiselect');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const multiselect = { name, root, create, registerVariants, template, styles };
export default multiselect;
