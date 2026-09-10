/**
 * Virtualizer — renders a virtual scroll container placeholder.
 * Actual virtualization happens client-side via hydration.
 * Server renders a window of items + a spacer for total height.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Virtualizer — renders a virtual scroll container placeholder: a window of
 * items plus a spacer for total height; actual virtualization happens
 * client-side via hydration.
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
    renderItem = (item, index) => `<div data-bn="virtual-item" data-index="${index}">${escapeText(item)}</div>`,
    overscan = 5,
    id = nextId('virtual'),
    attrs = '',
  } = options;

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const visibleItems = items.slice(0, Math.min(visibleCount, items.length));

  const itemsHtml = visibleItems.map((item, i) => renderItem(item, i)).join('');

  return `<div data-bn="virtualizer" id="${escapeAttr(id)}" style="height:${Number(containerHeight)}px;overflow:auto"${attrsSuffix(attrs)}>
  <div data-bn="virtual-spacer" style="height:${Number(totalHeight)}px;position:relative">
    <div data-bn="virtual-window" style="position:absolute;top:0;left:0;right:0" data-item-height="${Number(itemHeight)}" data-total="${items.length}">
      ${itemsHtml}
    </div>
  </div>
</div>`;
}
