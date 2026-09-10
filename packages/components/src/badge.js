/**
 * Badge component — status indicator.
 * Variants: default, primary, success, warning, error
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';

/**
 * Badge component — status indicator.
 *
 * @param {string} content  HTML slot: not escaped; pass trusted markup only
 * @param {object} [options]
 * @param {'default'|'primary'|'success'|'warning'|'error'} [options.variant='default']
 * @returns {string}
 */
export function renderBadge(content, options = {}) {
  const variant = options.variant || 'default';
  return `<span data-bn="badge" data-variant="${escapeAttr(variant)}">${content}</span>`;
}
