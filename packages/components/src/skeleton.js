/**
 * Skeleton loading placeholder component.
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';

/**
 * Renders `count` skeleton placeholders.
 *
 * @param {object} [options]
 * @param {string} [options.width='100%']
 * @param {string} [options.height='1rem']
 * @param {string} [options.variant='text']
 * @param {number} [options.count=1]
 * @returns {string}
 */
export function renderSkeleton(options = {}) {
  const { width = '100%', height = '1rem', variant = 'text', count = 1 } = options;

  const one = `<div data-bn="skeleton" data-variant="${escapeAttr(variant)}" style="width:${escapeAttr(width)};height:${escapeAttr(height)}" aria-hidden="true"></div>`;

  let html = '';
  for (let i = 0; i < count; i++) {
    html += one;
  }
  return html;
}
