/**
 * Alert component — inline feedback with semantic role="alert".
 * Variants: info, success, warning, error
 */

export function renderAlert(content, options = {}) {
  const variant = options.variant || 'info';
  const dismissible = options.dismissible || false;
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  let html = `<div data-bn="alert" data-variant="${variant}" role="${role}">`;
  html += `<span data-bn="alert-content">${content}</span>`;
  if (dismissible) {
    html += `<button data-bn="alert-dismiss" type="button" aria-label="Dismiss">×</button>`;
  }
  html += `</div>`;
  return html;
}
