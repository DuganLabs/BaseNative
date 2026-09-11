/**
 * Button component templates and behaviors.
 *
 * Variants: primary, secondary, destructive, ghost
 * States: loading, disabled
 *
 * Usage (SSR template):
 *   <button data-bn="button" data-variant="primary" :disabled="isLoading()">
 *     <template @if="isLoading()"><span data-bn="spinner" aria-hidden="true"></span></template>
 *     Submit
 *   </button>
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Returns the CSS class string for a button variant.
 */
export function buttonVariants(variant = 'primary', size = 'default') {
  return `bn-button bn-button--${variant} bn-button--${size}`;
}

/**
 * Server-side render helper for a button element.
 *
 * A button label is usually plain text, and often data (a status name, a
 * record title), so `text` is the escaping-safe way to fill it: pass the raw
 * string and it is escaped for you. `content` stays for labels that really do
 * hold markup (an icon plus a span); when both are given, `text` wins.
 *
 * @param {string} [content]  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {string} [options.text]  Escaped text label; replaces `content` when present
 * @param {string} [options.variant='primary']
 * @param {string} [options.size='default']
 * @param {boolean} [options.disabled]
 * @param {string} [options.type='button']
 * @param {string} [options.attrs]  Raw attribute markup appended to the <button>; not escaped
 * @returns {string}
 */
export function renderButton(content = '', options = {}) {
  const variant = options.variant || 'primary';
  const size = options.size || 'default';
  const disabled = options.disabled ? ' disabled' : '';
  const type = options.type || 'button';
  const attrs = options.attrs || '';
  const slot = options.text != null ? escapeText(options.text) : content;

  return `<button data-bn="button" data-variant="${escapeAttr(variant)}" data-size="${escapeAttr(size)}" type="${escapeAttr(type)}"${disabled}${attrsSuffix(attrs)}>${slot}</button>`;
}
