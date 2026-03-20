/**
 * Virtualizer — renders a virtual scroll container placeholder.
 * Actual virtualization happens client-side via hydration.
 * Server renders a window of items + a spacer for total height.
 */
export function renderVirtualList(options = {}) {
  const {
    items = [],
    itemHeight = 40,
    containerHeight = 400,
    renderItem = (item, index) => `<div data-bn="virtual-item" data-index="${index}">${item}</div>`,
    overscan = 5,
    id = `bn-virtual-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const visibleItems = items.slice(0, Math.min(visibleCount, items.length));

  const itemsHtml = visibleItems.map((item, i) => renderItem(item, i)).join('');

  return `<div data-bn="virtualizer" id="${id}" style="height:${containerHeight}px;overflow:auto" ${attrs}>
  <div data-bn="virtual-spacer" style="height:${totalHeight}px;position:relative">
    <div data-bn="virtual-window" style="position:absolute;top:0;left:0;right:0" data-item-height="${itemHeight}" data-total="${items.length}">
      ${itemsHtml}
    </div>
  </div>
</div>`;
}
