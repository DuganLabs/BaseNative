/**
 * Drawer — side panel that slides in from the edge.
 */
export function renderDrawer(options = {}) {
  const {
    title,
    content = '',
    open = false,
    position = 'right',
    size = 'default',
    closable = true,
    overlay = true,
    id = `bn-drawer-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const closeBtn = closable
    ? `<button data-bn="drawer-close" aria-label="Close" type="button">&times;</button>`
    : '';
  const overlayHtml = overlay ? `<div data-bn="drawer-overlay"${open ? '' : ' hidden'}></div>` : '';

  return `${overlayHtml}<aside data-bn="drawer" data-position="${position}" data-size="${size}" id="${id}"${open ? ' data-open' : ''} role="dialog" aria-modal="true" ${attrs}>
  <div data-bn="drawer-header">
    ${title ? `<h2 data-bn="drawer-title">${title}</h2>` : ''}
    ${closeBtn}
  </div>
  <div data-bn="drawer-body">${content}</div>
</aside>`;
}
