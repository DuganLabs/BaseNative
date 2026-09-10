/**
 * Alert component — inline feedback with semantic role="alert".
 * Variants: info, success, warning, error
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';

/**
 * Alert component — inline feedback; error/warning use role="alert", others role="status".
 *
 * @param {string} content  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {'info'|'success'|'warning'|'error'} [options.variant='info']
 * @param {boolean} [options.dismissible]
 * @returns {string}
 */
export function renderAlert(content, options = {}) {
  const variant = options.variant || 'info';
  const dismissible = options.dismissible || false;
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  let html = `<div data-bn="alert" data-variant="${escapeAttr(variant)}" role="${role}">`;
  html += `<span data-bn="alert-content">${content}</span>`;
  if (dismissible) {
    html += `<button data-bn="alert-dismiss" type="button" aria-label="Dismiss">×</button>`;
  }
  html += `</div>`;
  return html;
}
