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
  // run is elided, the current page flagged instead of linked.
  const items = computed(() => {
    const total = pages();
    const current = page();
    const numbers = new Set([1, total, current - 1, current, current + 1]);
    /** @type {{ label: string, page: number | null, current: boolean, href: string }[]} */
    const list = [{
      label: props.prevLabel ?? 'Previous',
      page: current > 1 ? current - 1 : null,
      current: false,
      href: current > 1 ? hrefFor(current - 1) : '',
    }];
    let elided = false;
    for (let n = 1; n <= total; n += 1) {
      if (!numbers.has(n)) {
        if (!elided) {
          list.push({ label: '…', page: null, current: false, href: '' });
          elided = true;
        }
        continue;
      }
      elided = false;
      list.push({
        label: String(n),
        page: n === current ? null : n,
        current: n === current,
        href: n === current ? '' : hrefFor(n),
      });
    }
    list.push({
      label: props.nextLabel ?? 'Next',
      page: current < total ? current + 1 : null,
      current: false,
      href: current < total ? hrefFor(current + 1) : '',
    });
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
