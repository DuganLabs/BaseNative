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
import { escapeAttr } from '@basenative/runtime/shared/escape';
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
 * @param {string} content  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {string} [options.variant='primary']
 * @param {string} [options.size='default']
 * @param {boolean} [options.disabled]
 * @param {string} [options.type='button']
 * @param {string} [options.attrs]  Raw attribute markup appended to the <button>; not escaped
 * @returns {string}
 */
export function renderButton(content, options = {}) {
  const variant = options.variant || 'primary';
  const size = options.size || 'default';
  const disabled = options.disabled ? ' disabled' : '';
  const type = options.type || 'button';
  const attrs = options.attrs || '';

  return `<button data-bn="button" data-variant="${escapeAttr(variant)}" data-size="${escapeAttr(size)}" type="${escapeAttr(type)}"${disabled}${attrsSuffix(attrs)}>${content}</button>`;
}
