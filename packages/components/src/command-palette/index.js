// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'command-palette';
export const root = 'dialog';

/**
 * The command palette: a modal dialog with a search field over grouped
 * options, carrying the keyboard pattern in its view model, ported
 * from the legacy initCommandPalette. Typing filters the options by
 * case-insensitive substring of their label — non-matching options
 * and then-empty groups leave the render — and the first visible
 * option becomes active. ArrowDown / ArrowUp move the active option
 * through the visible ones, wrapping at the ends; Enter or a click
 * activates it, which reports through `onSelect` and closes the
 * dialog; Escape closes without selecting (the dialog's native
 * cancel). The input's aria-activedescendant is this model's
 * `activeDescendant` — the composition that renders the search field
 * binds it.
 *
 * @typedef {object} PaletteOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} PaletteGroup
 * @property {string} heading
 * @property {PaletteOption[]} options
 *
 * @typedef {object} CommandPaletteProps
 * @property {string} id Base id; option ids derive from it.
 * @property {string} label Accessible name.
 * @property {string} searchHtml The rendered search field (field + input).
 * @property {PaletteGroup[]} [groups]
 * @property {string} [activeValue]
 * @property {(event: { value: string, label: string }) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {CommandPaletteProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('command-palette: id is required');
  if (!props.searchHtml)
    throw new TypeError('command-palette: searchHtml is required (render the field + input)');

  const label = signal(props.label ?? '');
  const searchHtml = signal(props.searchHtml);
  const groups = signal(props.groups ?? []);
  const query = signal('');
  const variant = signal(props.variant ?? 'command-palette');
  const dialogId = signal(`${props.id}-dialog`);

  const visibleGroups = computed(() => {
    const q = query().trim().toLowerCase();
    if (q === '') return groups();
    return groups()
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.options.length > 0);
  });
  const flatOptions = computed(() => visibleGroups().flatMap((group) => group.options));

  const activeValue = signal(props.activeValue ?? '');
  /* The active option must always be one of the visible ones: when the
     filter changes it falls back to the first visible option. */
  const activeOption = computed(() => {
    const list = flatOptions();
    return list.find((option) => option.value === activeValue()) ?? list[0] ?? null;
  });
  const activeDescendant = computed(() => {
    const active = activeOption();
    return active ? `${props.id}-option-${active.value}` : '';
  });

  const optionId = (/** @type {PaletteOption} */ option) => `${props.id}-option-${option.value}`;
  const isActive = (/** @type {PaletteOption} */ option) =>
    option.value === activeOption()?.value ? 'true' : 'false';
  const select = (/** @type {PaletteOption} */ option) => {
    props.onSelect?.({ value: option.value, label: option.label });
  };

  /** @param {string} value */
  function setQuery(value) {
    query.set(value ?? '');
    const first = flatOptions()[0];
    activeValue.set(first ? first.value : '');
  }

  /** @param {number} delta */
  function moveActive(delta) {
    const list = flatOptions();
    if (list.length === 0) return;
    const current = activeOption();
    const index = current ? list.indexOf(current) : -1;
    const next = list[(index + delta + list.length) % list.length];
    activeValue.set(next.value);
    return next;
  }

  /**
   * @param {KeyboardEvent} event
   * @param {PaletteOption} option
   */
  function choose(event, option) {
    select(option);
    const dialog = (event.currentTarget ?? event.target)?.closest?.('dialog');
    if (dialog?.open) dialog.close();
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        return;
      case 'Enter': {
        const active = activeOption();
        if (!active) return;
        event.preventDefault();
        choose(event, active);
        return;
      }
      default:
    }
  }

  return {
    label,
    searchHtml,
    groups,
    query,
    visibleGroups,
    flatOptions,
    activeValue,
    activeOption,
    activeDescendant,
    dialogId,
    variant,
    optionId,
    isActive,
    select,
    setQuery,
    moveActive,
    choose,
    onKeydown,
    raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('command-palette', 'command-palette');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const commandPalette = { name, root, create, registerVariants, template, styles };
export default commandPalette;
