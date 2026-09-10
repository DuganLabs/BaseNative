/**
 * Progress and Spinner components.
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Renders a determinate progress bar using native <progress>. The fallback
 * percentage text is 0% when max is 0, rather than NaN%.
 *
 * @param {object} [options]
 * @param {number} [options.value=0]
 * @param {number} [options.max=100]
 * @param {string} [options.label]  aria-label; escaped
 * @param {string} [options.attrs]  Raw attribute markup appended to the <progress>; not escaped
 * @returns {string}
 */
export function renderProgress(options = {}) {
  const { value = 0, max = 100, label = '', attrs = '' } = options;
  const ariaLabel = label ? ` aria-label="${escapeAttr(label)}"` : '';
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return `<progress data-bn="progress" value="${escapeAttr(value)}" max="${escapeAttr(max)}"${ariaLabel}${attrsSuffix(attrs)}>${percent}%</progress>`;
}

/**
 * Renders an indeterminate spinner.
 *
 * @param {object} [options]
 * @param {string} [options.size='default']
 * @param {string} [options.label='Loading']  aria-label; escaped
 * @returns {string}
 */
export function renderSpinner(options = {}) {
  const size = options.size || 'default';
  const label = options.label || 'Loading';
  return `<span data-bn="spinner" data-size="${escapeAttr(size)}" role="status" aria-label="${escapeAttr(label)}"><span aria-hidden="true"></span></span>`;
}
