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
 * The keyboard pattern lives in the view model: ArrowDown / ArrowUp
 * open the popup and move the active option (wrapping at the ends),
 * Home / End jump to the first / last option, Enter selects the
 * active option, Escape closes. The input's aria-activedescendant is
 * this model's `activeDescendant`, which follows the active option —
 * the composition that renders the input binds it, so it never sits
 * null while the popup is open.
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
 * @property {string} [activeValue] The initially active option's value.
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
  const activeOption = computed(() => options().find((option) => option.value === activeValue()) ?? null);
  const activeDescendant = computed(() => {
    const active = activeOption();
    return open() && active ? optionId(active) : '';
  });
  const isActive = (/** @type {ComboboxOption} */ option) => (option.value === activeValue() ? 'true' : 'false');
  const select = (/** @type {ComboboxOption} */ option) => {
    value.set(option.value);
    activeValue.set(option.value);
    open.set(false);
    props.onSelect?.({ value: option.value, label: option.label });
  };

  /** @param {number} delta */
  function moveActive(delta) {
    const list = options();
    if (list.length === 0) return;
    const index = list.findIndex((option) => option.value === activeValue());
    const next = list[(index + delta + list.length) % list.length];
    activeValue.set(next.value);
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open()) {
          open.set(true);
          if (!activeOption() && options().length > 0) activeValue.set(options()[0].value);
        } else moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open()) {
          open.set(true);
          if (!activeOption() && options().length > 0) activeValue.set(options()[options().length - 1].value);
        } else moveActive(-1);
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
          select(active);
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
    label, inputHtml, options, open, activeValue, activeOption, activeDescendant,
    value, variant, listboxId, optionId, isActive, select, moveActive, onKeydown, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('combobox', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const combobox = { name, root, create, registerVariants, template, styles };
export default combobox;
