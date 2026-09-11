/**
 * Badge component — status indicator.
 * Variants: default, primary, success, warning, error
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Badge component — status indicator.
 *
 * A badge nearly always labels a piece of data (a role, a status, an account
 * type), so `text` is the escaping-safe way to fill it: pass the raw value and
 * it is escaped for you. `content` stays for the cases where the badge really
 * does hold markup (an icon, a `<time>`); when both are given, `text` wins.
 *
 * @param {string} [content]  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {'default'|'primary'|'success'|'warning'|'error'} [options.variant='default']
 * @param {string} [options.text]   Escaped text; replaces `content` when present
 * @param {string} [options.attrs]  Raw attribute markup appended to the <span>; not escaped
 * @returns {string}
 */
export function renderBadge(content = '', options = {}) {
  const variant = options.variant || 'default';
  const attrs = options.attrs || '';
  const slot = options.text != null ? escapeText(options.text) : content;
  return `<span data-bn="badge" data-variant="${escapeAttr(variant)}"${attrsSuffix(attrs)}>${slot}</span>`;
}
