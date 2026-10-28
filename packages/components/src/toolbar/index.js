// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'toolbar';
export const root = 'section';

/**
 * The toolbar: a labelled bar of rendered actions. The bar is a
 * named section (a region landmark): role "toolbar" is not a valid
 * pairing for a sectioning element, and the bar does not implement
 * the toolbar pattern's roving-focus keyboard contract, so it does
 * not claim the role.
 * plus the overflow pattern — when actions outgrow the bar, the extra
 * set rides in a caller-rendered menu (a dropdown-menu) behind a
 * More button whose expanded state the view model owns. The toolbar
 * places the menu at its own end edge; the menu's own sheet dresses
 * it. The datagrid's header is this composite's natural home.
 *
 * @typedef {object} ToolbarProps
 * @property {string} label Accessible name for the bar.
 * @property {string} actionsHtml Rendered primary actions.
 * @property {string} [overflowHtml] A rendered menu of overflow actions.
 * @property {string} [overflowLabel] Default "More".
 * @property {boolean} [overflowOpen] The menu's initial state.
 * @property {(event: { open: boolean }) => void} [onOverflow]
 * @property {string} [variant] A registered variant name.
 */

/** @param {ToolbarProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('toolbar: label is required');
  if (!props.actionsHtml) throw new TypeError('toolbar: actionsHtml is required — render the primary actions into it');

  const label = signal(props.label);
  const actionsHtml = signal(props.actionsHtml);
  const overflowHtml = signal(props.overflowHtml ?? '');
  const overflowLabel = signal(props.overflowLabel ?? 'More');
  const variant = signal(props.variant ?? 'toolbar');
  const overflowOpen = signal(props.overflowOpen ?? false);
  const hasOverflow = computed(() => overflowHtml() !== '');

  function expandedAttr() {
    return overflowOpen() ? 'true' : 'false';
  }

  function toggleOverflow() {
    overflowOpen.set(!overflowOpen());
    props.onOverflow?.({ open: overflowOpen() });
  }

  return { label, actionsHtml, overflowHtml, overflowLabel, variant, overflowOpen, hasOverflow, expandedAttr, toggleOverflow, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('toolbar', 'toolbar');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const toolbar = { name, root, create, registerVariants, template, styles };
export default toolbar;
