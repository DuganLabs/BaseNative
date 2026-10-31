// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';
import { nextId } from '../ids.js';

export const name = 'toast';
export const root = 'ol';

/**
 * @typedef {object} ToastItem
 * @property {string} message
 * @property {string} [tone] info | success | warning | danger — an
 *   element-level registration on the item, styled exactly in this
 *   component's sheet.
 * @property {string} [dismissHtml] A rendered dismiss button.
 *
 * @typedef {object} ToastProps
 * @property {ToastItem[]} [items]
 * @property {string} [live] The aria-live politeness of the region.
 * @property {string} [variant] A registered variant name.
 */

const ICON_PATHS = {
  success: '<circle cx="8" cy="8" r="6"/><path d="M5.5 8.2l1.8 1.8 3.4-3.8"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.4v3.4"/><path d="M8 5v.1"/>',
  warning: '<path d="M8 2.9l5.3 9.1H2.7z"/><path d="M8 6.5v2.7"/><path d="M8 11v.1"/>',
  danger: '<circle cx="8" cy="8" r="6"/><path d="M5.8 5.8l4.4 4.4"/><path d="M10.2 5.8l-4.4 4.4"/>',
};

/** @param {ToastProps} props */
export function create(props) {
  const items = signal(props.items ?? []);
  const live = signal(props.live ?? 'polite');
  const variant = signal(props.variant ?? 'default');

  // Tone is carried by shape as well as color: each tone gets its
  // own glyph, drawn in the same stroke language as the catalog's
  // chevrons, and the sheet colors it with the tone's accent.
  const iconFor = (/** @type {ToastItem} */ item) => {
    const inner = ICON_PATHS[item.tone ?? 'info'] ?? ICON_PATHS.info;
    return '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  };

  /* Dismissal removes the item from the stack — the same removal
     the toaster's dismiss(id) performs, by identity for a stack
     whose items carry no ids. */
  const dismissItem = (/** @type {ToastItem} */ item) => {
    items.set(items().filter((entry) => entry !== item));
  };

  /* The item's dismiss control is caller-rendered HTML inside the
     item, so its click is delegated at the item: a click on the
     button dismisses, a click anywhere else does nothing. */
  /**
   * @param {MouseEvent} event
   * @param {ToastItem} item
   */
  function onItemClick(event, item) {
    if ((event.target)?.closest?.('button')) dismissItem(item);
  }

  return { items, live, variant, iconFor, dismissItem, onItemClick, raw };
}

/**
 * The toaster: the app's toast queue as a view model, ported from the
 * legacy toast module. push() appends an item, gives it a
 * deterministic id (`bn-toast-<n>`, or the caller's own `id`) and
 * returns the id; the item auto-dismisses after its duration (the
 * item's own, else the toaster's default of 5000ms; 0 keeps it until
 * dismissed). dismiss(id) removes by id.
 *
 * @param {object} [options]
 * @param {number} [options.duration] Default auto-dismiss ms.
 */
export function createToaster(options = {}) {
  const defaultDuration = options.duration ?? 5000;
  const items = signal(/** @type {ToastItem[]} */ ([]));
  const dismiss = (/** @type {string} */ id) => {
    items.set(items().filter((item) => (/** @type {ToastItem & { id?: string }} */ (item).id) !== id));
  };
  const push = (/** @type {ToastItem & { id?: string, duration?: number }} */ item) => {
    const id = item.id ?? nextId('toast');
    items.set([...items(), { ...item, id, dismissHtml: item.dismissHtml ?? '' }]);
    const duration = item.duration ?? defaultDuration;
    if (duration > 0 && typeof setTimeout === 'function') {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  };
  return { items, push, dismiss };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('toast', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const toast = { name, root, create, registerVariants, template, styles };
export default toast;
