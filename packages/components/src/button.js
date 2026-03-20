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

/**
 * Returns the CSS class string for a button variant.
 */
export function buttonVariants(variant = 'primary', size = 'default') {
  return `bn-button bn-button--${variant} bn-button--${size}`;
}

/**
 * Server-side render helper for a button element.
 */
export function renderButton(content, options = {}) {
  const variant = options.variant || 'primary';
  const size = options.size || 'default';
  const disabled = options.disabled ? ' disabled' : '';
  const type = options.type || 'button';
  const attrs = options.attrs || '';

  return `<button data-bn="button" data-variant="${variant}" data-size="${size}" type="${type}"${disabled} ${attrs}>${content}</button>`;
}
