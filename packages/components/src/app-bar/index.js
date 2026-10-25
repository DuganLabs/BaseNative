// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'app-bar';
export const root = 'nav';

/**
 * The app bar: the phone-form navigation — a glass bar of destinations
 * fixed to the bottom edge. The first `barLimit` destinations ride the
 * bar; the rest sit behind a More button in a popover menu, so every
 * destination stays reachable and the current one still reports
 * aria-current="page" (the More button itself carries it when the
 * current destination is in the overflow). Item icons are
 * caller-rendered markup (an inline SVG). The desktop form of the same
 * destinations is the sidebar; the app-shell composite switches
 * between them.
 *
 * @typedef {object} AppBarItem
 * @property {string} label Destination name. Escaped.
 * @property {string} href Destination URL.
 * @property {boolean} [current] True for the page being viewed.
 * @property {string} [iconHtml] Rendered icon markup, placed above the label.
 *
 * @typedef {object} AppBarProps
 * @property {AppBarItem[]} items All destinations, in order.
 * @property {number} [barLimit] Destinations on the bar before overflow. Default 4.
 * @property {string} [moreLabel] Label for the overflow button and menu. Default "More".
 * @property {string} [label] Accessible name for the nav landmark. Default "Primary".
 * @property {string} [id] Instance id; the menu and its button derive theirs from it. Default "app-bar".
 * @property {string} [variant] A registered variant name.
 */

const MORE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';

/** @param {AppBarProps} props */
export function create(props) {
  if (!Array.isArray(props.items) || props.items.length === 0) {
    throw new TypeError('app-bar: items is required');
  }

  const limit = props.barLimit ?? 4;
  const enrich = (/** @type {AppBarItem} */ item) => ({
    ...item,
    iconHtml: item.iconHtml ?? '',
    ariaCurrent: item.current ? 'page' : false,
  });
  const primaryItems = signal(props.items.slice(0, limit).map(enrich));
  const overflowItems = signal(props.items.slice(limit).map(enrich));
  const label = signal(props.label ?? 'Primary');
  const moreLabel = signal(props.moreLabel ?? 'More');
  const variant = signal(props.variant ?? 'app-bar');
  const id = signal(props.id ?? 'app-bar');

  const hasOverflow = computed(() => overflowItems().length > 0);
  const moreAriaCurrent = computed(() =>
    overflowItems().some((item) => item.ariaCurrent === 'page') ? 'page' : false);
  const moreId = computed(() => `${id()}-more`);
  const moreButtonId = computed(() => `${id()}-more-btn`);
  const moreIconHtml = signal(MORE_ICON);

  return {
    primaryItems, overflowItems, label, moreLabel, variant,
    hasOverflow, moreAriaCurrent, moreId, moreButtonId, moreIconHtml, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('app-bar', 'app-bar');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const appBar = { name, root, create, registerVariants, template, styles };
export default appBar;
