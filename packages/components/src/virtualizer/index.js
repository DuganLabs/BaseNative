// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'virtualizer';
export const root = 'ol';

/**
 * The windowed list. Rows are uniform height (the one assumption
 * every virtualizer makes), so the window is pure arithmetic:
 * scrollTop and the row/viewport sizes in, the visible index range
 * and the two spacer counts out. Rendering only the window keeps the
 * DOM bounded; the first and last <li> are spacers whose block sizes
 * come from the --number-virtualizer-spacer-*-count tokens — the HOST
 * re-points those two tokens in its own scope from the view model's
 * spacer counts (the token channel, as everywhere: JS never writes
 * style attributes). Items render as caller HTML (itemHtmlFor) or as
 * text labels (labelFor).
 *
 * @typedef {object} VirtualizerProps
 * @property {string} id The list's id, the host's token scope.
 * @property {number} total Total row count.
 * @property {number} [scrollTop] Scroll offset, same unit as rowHeight.
 * @property {number} [rowHeight] Row height in px (window math only).
 * @property {number} [viewportRows] Rows visible at once.
 * @property {number} [overscan] Extra rows rendered on each side.
 * @property {(index: number) => string} [itemHtmlFor]
 * @property {(index: number) => string} [labelFor]
 * @property {string} [variant] A registered variant name.
 */

/** @param {VirtualizerProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('virtualizer: id is required');
  if (typeof props.total !== 'number') throw new TypeError('virtualizer: total is required');

  const id = signal(props.id);
  const total = signal(props.total);
  const scrollTop = signal(props.scrollTop ?? 0);
  const rowHeight = props.rowHeight ?? 44;
  const viewportRows = props.viewportRows ?? 8;
  const overscan = props.overscan ?? 2;
  const variant = signal(props.variant ?? 'virtualizer');

  const startIndex = computed(() => Math.max(0, Math.floor(scrollTop() / rowHeight) - overscan));
  const endIndex = computed(() => Math.min(total(), startIndex() + viewportRows + overscan * 2));
  const windowIndices = computed(() => {
    /** @type {number[]} */
    const indices = [];
    for (let i = startIndex(); i < endIndex(); i += 1) indices.push(i);
    return indices;
  });
  const spacerStartCount = computed(() => startIndex());
  const spacerEndCount = computed(() => total() - endIndex());
  const itemHtml = (/** @type {number} */ index) => props.itemHtmlFor?.(index) ?? '';
  const labelFor = (/** @type {number} */ index) => props.labelFor?.(index) ?? '';
  const hasItemHtml = computed(() => typeof props.itemHtmlFor === 'function');

  /* Scroll re-slices the window: the template binds the list's own
     scroll event here, and the window computeds redo the arithmetic.
     setScrollTop reflects silently. The host's one remaining job is
     the spacer channel: re-pointing the two spacer-count tokens in
     its scope from spacerStartCount / spacerEndCount as they move. */
  const setScrollTop = (/** @type {number} */ value) => scrollTop.set(Math.max(0, value || 0));
  /** @param {Event} event */
  function onScroll(event) {
    const scroller = (event.currentTarget ?? event.target);
    if (scroller && typeof scroller.scrollTop === 'number') setScrollTop(scroller.scrollTop);
  }

  return {
    id, total, scrollTop, variant, startIndex, endIndex, windowIndices,
    spacerStartCount, spacerEndCount, itemHtml, labelFor, hasItemHtml, setScrollTop, onScroll, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('virtualizer', 'virtualizer');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const virtualizer = { name, root, create, registerVariants, template, styles };
export default virtualizer;
