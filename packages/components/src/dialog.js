/**
 * Dialog — modal/non-modal dialog using native <dialog> element.
 */
export function renderDialog(options = {}) {
  const {
    title,
    content = '',
    open = false,
    modal = true,
    closable = true,
    size = 'default',
    footer = '',
    id = `bn-dialog-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const openAttr = open ? ' open' : '';
  const closeBtn = closable
    ? `<button data-bn="dialog-close" data-bn-action="close-dialog" aria-label="Close" type="button">&times;</button>`
    : '';

  return `<dialog data-bn="dialog" data-size="${size}" id="${id}"${openAttr} ${attrs}>
  <div data-bn="dialog-header">
    ${title ? `<h2 data-bn="dialog-title">${title}</h2>` : ''}
    ${closeBtn}
  </div>
  <div data-bn="dialog-body">${content}</div>
  ${footer ? `<div data-bn="dialog-footer">${footer}</div>` : ''}
</dialog>`;
}
