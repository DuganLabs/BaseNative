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
 * active option, Escape closes. Typing in the field filters the
 * options — a pure function of the field text, the model's `query` —
 * and the first visible option becomes active; focusing the field
 * opens the popup. The section's delegated handlers receive these
 * events as they bubble from the composed input, so the composition
 * only renders the input; the one thing it still binds is the
 * input's aria-activedescendant and aria-expanded, which follow this
 * model's `activeDescendant` and `open`, so the descendant never
 * sits null while the popup is open.
 *
 * @typedef {object} ComboboxOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} ComboboxProps
 * @property {string} id Base id; the listbox and option ids derive from it.
 * @property {string} label Accessible name for the popup.
 * @property {string} inputHtml The rendered input component.
 * @property {ComboboxOption[]} [options] The full option set; the model filters it by the field text.
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
  const query = signal('');
  const open = signal(props.open ?? false);
  const activeValue = signal(props.activeValue ?? '');
  const value = signal('');
  const variant = signal(props.variant ?? 'default');

  const listboxId = computed(() => `${props.id}-listbox`);
  const optionId = (/** @type {ComboboxOption} */ option) => `${props.id}-option-${option.value}`;
  /* Filtering is a pure function of the field text: an option is
     visible iff the query appears in its label (case-insensitive). */
  const visibleOptions = computed(() => {
    const q = query().trim().toLowerCase();
    if (q === '') return options();
    return options().filter((option) => option.label.toLowerCase().includes(q));
  });
  /* The popup is shown only while it has options to show: a filter
     that matches nothing collapses it (aria-expanded false) rather than
     leaving an empty, bordered listbox under the field. `open` keeps
     the intent, so the list returns as soon as the text matches again. */
  const expanded = computed(() => open() && visibleOptions().length > 0);
  const activeOption = computed(() => visibleOptions().find((option) => option.value === activeValue()) ?? null);
  const activeDescendant = computed(() => {
    const active = activeOption();
    return expanded() && active ? optionId(active) : '';
  });
  const isActive = (/** @type {ComboboxOption} */ option) => (option.value === activeValue() ? 'true' : 'false');
  const select = (/** @type {ComboboxOption} */ option) => {
    value.set(option.value);
    activeValue.set(option.value);
    open.set(false);
    props.onSelect?.({ value: option.value, label: option.label });
  };

  /**
   * Choosing from the popup also lands the option's label in the
   * composed input — the field shows what was chosen. The input is
   * resolved from the event, the dialog behavior's pattern; where
   * there is no composed input (a unit test, the server) this no-ops.
   * @param {Event} event
   * @param {ComboboxOption} option
   */
  function choose(event, option) {
    select(option);
    const root = (event.currentTarget ?? event.target)?.closest?.('section');
    const input = root?.querySelector?.('input');
    if (input) input.value = option.label;
  }

  /**
   * The field's text drives the filter: typing sets the query, opens
   * the popup, and makes the first visible option active.
   * @param {{ target: { value?: string } }} event
   */
  function onInput(event) {
    query.set(event.target?.value ?? '');
    if (!open()) open.set(true);
    const first = visibleOptions()[0];
    activeValue.set(first ? first.value : '');
  }

  /* Focusing the field opens the popup on its full, unfiltered set. */
  function onFocus() {
    query.set('');
    if (!open()) open.set(true);
  }

  /** @param {number} delta */
  function moveActive(delta) {
    const list = visibleOptions();
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
          if (!activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[0].value);
        } else moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open()) {
          open.set(true);
          if (!activeOption() && visibleOptions().length > 0) activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        } else moveActive(-1);
        return;
      case 'Home':
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[0].value);
        return;
      case 'End':
        if (!open() || visibleOptions().length === 0) return;
        event.preventDefault();
        activeValue.set(visibleOptions()[visibleOptions().length - 1].value);
        return;
      case 'Enter': {
        const active = activeOption();
        if (open() && active) {
          event.preventDefault();
          select(active);
          /* The keyboard path chooses from the field itself, so the
             label lands in it directly — the same end state choose()
             produces for a pointer selection. */
          const target = (event.target);
          if (target && 'value' in target) target.value = active.label;
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
    label, inputHtml, options, query, visibleOptions, open, expanded, activeValue, activeOption, activeDescendant,
    value, variant, listboxId, optionId, isActive, select, choose, moveActive, onKeydown, onInput, onFocus, raw,
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
