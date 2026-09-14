/**
 * Virtualizer — renders a virtual scroll container placeholder.
 * Actual virtualization happens client-side via hydration.
 * Server renders a window of items + a spacer for total height.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/** The item markup both the server window and `initVirtualList()` emit when no `renderItem` is given: escaped text in `[data-bn="virtual-item"]`. */
export function defaultRenderItem(item, index) {
  return `<div data-bn="virtual-item" data-index="${index}">${escapeText(item)}</div>`;
}

/**
 * Virtualizer — renders a virtual scroll container placeholder: a window of
 * items plus a spacer for total height. Pair with `initVirtualList()` on the
 * client, which re-slices that window on scroll; without it the first
 * window is all that ever renders.
 *
 * The default renderItem escapes each item as text. A custom `renderItem`
 * result is an HTML slot: not escaped; return trusted markup only.
 *
 * @param {object} [options]
 * @param {Array<unknown>} [options.items]
 * @param {number} [options.itemHeight=40]
 * @param {number} [options.containerHeight=400]
 * @param {(item: unknown, index: number) => string} [options.renderItem]
 * @param {number} [options.overscan=5]
 * @param {string} [options.id]     Defaults to nextId('virtual')
 * @param {string} [options.attrs]  Raw attribute markup appended to the container; not escaped
 * @returns {string}
 */
export function renderVirtualList(options = {}) {
  const {
    items = [],
    itemHeight = 40,
    containerHeight = 400,
    renderItem = defaultRenderItem,
    overscan = 5,
    id = nextId('virtual'),
    attrs = '',
  } = options;

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const visibleItems = items.slice(0, Math.min(visibleCount, items.length));

  const itemsHtml = visibleItems.map((item, i) => renderItem(item, i)).join('');

  // The container is the scroll port. A scrollable region has to be reachable by
  // keyboard or its content is unreadable without a mouse (axe:
  // scrollable-region-focusable), and anything in the focus order needs a role
  // (axe: focus-order-semantics) — a focusable bare <div> is neither. role="region"
  // rather than "group": group is not in the roles that rule accepts, so it
  // trades one violation for another.
  // The label names the region; pass your own through `attrs` and it wins, since
  // an HTML parser keeps the first of a repeated attribute.
  const label = /\baria-label(?:ledby)?=/.test(attrs) ? '' : ' aria-label="Scrollable list"';
  return `<div data-bn="virtualizer" id="${escapeAttr(id)}" tabindex="0" role="region"${label} style="height:${Number(containerHeight)}px;overflow:auto"${attrsSuffix(attrs)}>
  <div data-bn="virtual-spacer" style="height:${Number(totalHeight)}px;position:relative">
    <div data-bn="virtual-window" style="position:absolute;top:0;left:0;right:0" data-item-height="${Number(itemHeight)}" data-total="${items.length}">
      ${itemsHtml}
    </div>
  </div>
</div>`;
}

const WINDOW = '[data-bn="virtual-window"]';

/**
 * Client-side: wire a rendered `[data-bn="virtualizer"]` container so the
 * window follows the scroll position.
 *
 * On every `scroll` the visible index range is recomputed from
 * `scrollTop`, the container's height and the `data-item-height` the server
 * emitted on `[data-bn="virtual-window"]` (plus `overscan` items each side);
 * when the range changes, the window is re-rendered from `items.slice(start,
 * end)` with `renderItem(item, index)` and repositioned with `top`. `items`
 * is required — only the first window is in the DOM, so the initialiser
 * cannot recover the rest — and `renderItem` defaults to the same markup
 * `renderVirtualList()` uses. The first `update()` runs on init.
 *
 * `setItems(items)` swaps the data, resizes the spacer and re-renders;
 * `scrollTo(index)` scrolls that item to the top; `range()` reports the
 * rendered `{ start, end }`.
 *
 * @param {HTMLElement} container  The [data-bn="virtualizer"] element
 * @param {object} options
 * @param {Array<unknown>} options.items  The full list the server rendered from
 * @param {(item: unknown, index: number) => string} [options.renderItem]
 * @param {number} [options.itemHeight]  Defaults to the window's data-item-height
 * @param {number} [options.overscan=5]
 * @returns {{ update(): { start: number, end: number }, range(): { start: number, end: number }, scrollTo(index: number): void, setItems(items: Array<unknown>): void, destroy(): void }}
 */
export function initVirtualList(container, options = {}) {
  if (!Array.isArray(options.items)) {
    throw new TypeError('initVirtualList needs options.items — the array renderVirtualList() rendered from. Only the first window is in the DOM, so the initialiser cannot recover the rest.');
  }
  const { renderItem = defaultRenderItem, overscan = 5 } = options;
  let items = options.items;
  const win = container.querySelector(WINDOW);
  const spacer = win ? win.parentElement : null;
  const itemHeight = Number(options.itemHeight ?? (win ? win.getAttribute('data-item-height') : 0)) || 40;
  let range = { start: -1, end: -1 };

  function height() {
    return Number(container.clientHeight) || Number.parseFloat(container.style?.height) || 0;
  }

  function update() {
    if (!win) return range;
    const total = items.length;
    const top = Number(container.scrollTop) || 0;
    const start = Math.max(0, Math.floor(top / itemHeight) - overscan);
    const end = Math.min(total, Math.ceil((top + height()) / itemHeight) + overscan);
    if (start === range.start && end === range.end) return range;
    range = { start, end };
    win.innerHTML = items.slice(start, end).map((item, i) => renderItem(item, start + i)).join('');
    win.style.top = `${start * itemHeight}px`;
    win.setAttribute('data-total', String(total));
    if (spacer && spacer.style) spacer.style.height = `${total * itemHeight}px`;
    return range;
  }

  update();
  container.addEventListener('scroll', update, { passive: true });

  return {
    update,
    range: () => range,
    scrollTo(index) {
      container.scrollTop = Math.max(0, index) * itemHeight;
      update();
    },
    setItems(next) {
      items = Array.isArray(next) ? next : [];
      range = { start: -1, end: -1 };
      update();
    },
    destroy() {
      container.removeEventListener('scroll', update);
    },
  };
}
