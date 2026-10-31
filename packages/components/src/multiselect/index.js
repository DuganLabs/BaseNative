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
  const activeValue = signal('');
  const variant = signal(props.variant ?? 'multiselect');

  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (/** @type {MultiselectOption} */ option) => `${props.id}-option-${option.value}`;
  const hasSelected = computed(() => selected().length > 0);
  const activeOption = computed(() => options().find((option) => option.value === activeValue()) ?? null);
  const activeDescendant = computed(() => {
    const active = activeOption();
    return open() && active ? optionId(active) : '';
  });
  const isSelected = (/** @type {MultiselectOption} */ option) => (
    selected().some((item) => item.value === option.value) ? 'true' : 'false'
  );
  const isActive = (/** @type {MultiselectOption} */ option) => (option.value === activeValue() ? 'true' : 'false');
  const toggle = (/** @type {MultiselectOption & { dismissHtml: string }} */ option) => {
    const current = selected();
    const next = current.some((item) => item.value === option.value)
      ? current.filter((item) => item.value !== option.value)
      : [...current, { value: option.value, label: option.label, dismissHtml: option.dismissHtml ?? '' }];
    selected.set(next);
    props.onChange?.({ values: next.map((item) => item.value) });
  };

  /* Silent reflectors (the legacy initMultiselect add/remove API):
     they move the set without reporting, so a host can mirror state
     it owns. removeLast backs the input's Backspace-on-empty gesture. */
  const addValue = (/** @type {string} */ value) => {
    const option = options().find((item) => item.value === value);
    if (!option || selected().some((item) => item.value === value)) return false;
    selected.set([...selected(), { value: option.value, label: option.label, dismissHtml: '' }]);
    return true;
  };
  const removeValue = (/** @type {string} */ value) => {
    if (!selected().some((item) => item.value === value)) return false;
    selected.set(selected().filter((item) => item.value !== value));
    props.onChange?.({ values: selected().map((item) => item.value) });
    return true;
  };
  const removeLast = () => {
    const last = selected().at(-1);
    return last ? removeValue(last.value) : false;
  };

  /** @param {number} delta */
  function moveActive(delta) {
    const list = options();
    if (list.length === 0) return;
    const index = list.findIndex((option) => option.value === activeValue());
    activeValue.set(list[(index + delta + list.length) % list.length].value);
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open()) open.set(true);
        else moveActive(1);
        if (open() && !activeOption() && options().length > 0) activeValue.set(options()[0].value);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open()) open.set(true);
        else moveActive(-1);
        if (open() && !activeOption() && options().length > 0) activeValue.set(options()[options().length - 1].value);
        return;
      case 'Home':
        if (!open() || options().length === 0) return;
        event.preventDefault();
        activeValue.set(options()[0].value);
        return;
      case 'End':
        if (!open() || options().length === 0) return;
        event.preventDefault();
        activeValue.set(options()[options().length - 1].value);
        return;
      case 'Enter': {
        const active = activeOption();
        if (open() && active) {
          event.preventDefault();
          toggle(active);
        }
        return;
      }
      case 'Escape':
        if (open()) {
          event.preventDefault();
          open.set(false);
        }
        return;
      default:
    }
  }

  return {
    label, inputHtml, options, selected, open, activeValue, activeOption, activeDescendant,
    variant, listboxId, optionId, hasSelected, isSelected, isActive, toggle,
    addValue, removeValue, removeLast, moveActive, onKeydown, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('multiselect', 'multiselect');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const multiselect = { name, root, create, registerVariants, template, styles };
export default multiselect;
