// @ts-check
import { signal } from '@basenative/runtime';

import { computed } from '@basenative/runtime';

export const name = 'pagination';
export const root = 'nav';

/**
 * @typedef {object} PaginationProps
 * @property {number} page Current page, 1-based.
 * @property {number} pages Total page count.
 * @property {(page: number) => string} [hrefFor] Builds a page link's href.
 * @property {string} [label] Accessible name for the nav landmark.
 * @property {string} [prevLabel]
 * @property {string} [nextLabel]
 * @property {string} [variant] A registered variant name.
 */

/** @param {PaginationProps} props */
export function create(props) {
  if (!props.pages || props.pages < 1) throw new TypeError('pagination: pages is required');

  const page = signal(props.page ?? 1);
  const pages = signal(props.pages);
  const label = signal(props.label ?? 'Pagination');
  const variant = signal(props.variant ?? 'pagination');
  const hrefFor = props.hrefFor ?? ((/** @type {number} */ n) => `#page-${n}`);

  // The page window is data: numbers to link, one ellipsis entry where a
  // run is elided, the current page flagged instead of linked. There are
  // two windows. The wide one links the current page's neighbours; the
  // narrow one (a phone) keeps only the first, current and last pages, so
  // a jump to either end is always one tap. Entries in one window only
  // carry `only` (rendered as the item's variant), and the stylesheet's container query picks the window.
  const items = computed(() => {
    const total = pages();
    const current = page();
    // In the wide window an ellipsis stands for two or more pages; a gap
    // of one shows the page. The narrow window keeps the gap: its ellipsis
    // is narrower than a page target, and a 320px phone fits five targets
    // and two gaps on one row, not six targets.
    const wide = new Set([1, total, current - 1, current, current + 1]);
    for (let n = 2; n < total; n += 1) if (wide.has(n - 1) && wide.has(n + 1)) wide.add(n);
    const narrow = new Set([1, total, current]);
    /**
     * @typedef {{ label: string, page: number | null, current: boolean, href: string | null,
     *   only: 'wide' | 'narrow' | null, step: string | null, hidden: string | null }} PageItem
     */
    /** @param {string} label @param {number | null} to @param {string} step @returns {PageItem} */
    const stepItem = (label, to, step) => ({
      label,
      page: to,
      current: false,
      href: to ? hrefFor(to) : null,
      only: null,
      step,
      hidden: to ? null : 'true',
    });
    /** @param {'wide' | 'narrow' | null} only @returns {PageItem} */
    const gap = (only) => ({
      label: '…',
      page: null,
      current: false,
      href: null,
      only,
      step: null,
      hidden: 'true',
    });
    /** @type {PageItem[]} */
    const list = [
      stepItem(props.prevLabel ?? 'Previous', current > 1 ? current - 1 : null, 'previous'),
    ];
    let elidedWide = false;
    let elidedNarrow = false;
    for (let n = 1; n <= total; n += 1) {
      const inWide = wide.has(n);
      const inNarrow = narrow.has(n);
      const gapWide = !inWide && !elidedWide;
      const gapNarrow = !inNarrow && !elidedNarrow;
      if (gapWide || gapNarrow)
        list.push(gap(gapWide && gapNarrow ? null : gapWide ? 'wide' : 'narrow'));
      elidedWide = !inWide;
      elidedNarrow = !inNarrow;
      if (!inWide) continue;
      list.push({
        label: String(n),
        page: n === current ? null : n,
        current: n === current,
        href: n === current ? null : hrefFor(n),
        only: inNarrow ? null : 'wide',
        step: null,
        hidden: null,
      });
    }
    list.push(stepItem(props.nextLabel ?? 'Next', current < total ? current + 1 : null, 'next'));
    return list;
  });

  return { items, label, variant };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('pagination', 'pagination');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const pagination = { name, root, create, registerVariants, template, styles };
export default pagination;
