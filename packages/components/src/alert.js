/**
 * Alert component — inline feedback with semantic role="alert".
 * Variants: info, success, warning, error
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Alert component — inline feedback; error/warning use role="alert", others role="status".
 *
 * An alert usually carries a message that came back from a server, so `text` is
 * the escaping-safe way to fill it: pass the raw string and it is escaped for
 * you. `content` stays for alerts that really do hold markup (a link back to
 * safety); when both are given, `text` wins.
 *
 * @param {string} [content]  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {'info'|'success'|'warning'|'error'} [options.variant='info']
 * @param {boolean} [options.dismissible]
 * @param {string} [options.text]   Escaped text; replaces `content` when present
 * @param {string} [options.attrs]  Raw attribute markup appended to the container; not escaped
 * @returns {string}
 */
export function renderAlert(content = '', options = {}) {
  const variant = options.variant || 'info';
  const dismissible = options.dismissible || false;
  const attrs = options.attrs || '';
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  const slot = options.text != null ? escapeText(options.text) : content;

  let html = `<div data-bn="alert" data-variant="${escapeAttr(variant)}" role="${role}"${attrsSuffix(attrs)}>`;
  html += `<span data-bn="alert-content">${slot}</span>`;
  if (dismissible) {
    html += `<button data-bn="alert-dismiss" type="button" aria-label="Dismiss">×</button>`;
  }
  html += `</div>`;
  return html;
}
