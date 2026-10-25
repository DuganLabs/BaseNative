// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'command-palette';
export const root = 'dialog';

/**
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
 * @property {PaletteGroup[]} [groups] Already filtered by the caller.
 * @property {string} [activeValue]
 * @property {(event: { value: string, label: string }) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {CommandPaletteProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('command-palette: id is required');
  if (!props.searchHtml) throw new TypeError('command-palette: searchHtml is required (render the field + input)');

  const label = signal(props.label ?? '');
  const searchHtml = signal(props.searchHtml);
  const groups = signal(props.groups ?? []);
  const activeValue = signal(props.activeValue ?? '');
  const variant = signal(props.variant ?? 'command-palette');

  const optionId = (/** @type {PaletteOption} */ option) => `${props.id}-option-${option.value}`;
  const isActive = (/** @type {PaletteOption} */ option) => (option.value === activeValue() ? 'true' : 'false');
  const select = (/** @type {PaletteOption} */ option) => {
    props.onSelect?.({ value: option.value, label: option.label });
  };

  return { label, searchHtml, groups, activeValue, variant, optionId, isActive, select, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('command-palette', 'command-palette');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const commandPalette = { name, root, create, registerVariants, template, styles };
export default commandPalette;
