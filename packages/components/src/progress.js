/**
 * Progress and Spinner components.
 */

/**
 * Renders a determinate progress bar using native <progress>.
 */
export function renderProgress(options = {}) {
  const { value = 0, max = 100, label = '' } = options;
  const ariaLabel = label ? ` aria-label="${escapeAttr(label)}"` : '';
  return `<progress data-bn="progress" value="${value}" max="${max}"${ariaLabel}>${Math.round((value / max) * 100)}%</progress>`;
}

/**
 * Renders an indeterminate spinner.
 */
export function renderSpinner(options = {}) {
  const size = options.size || 'default';
  const label = options.label || 'Loading';
  return `<span data-bn="spinner" data-size="${size}" role="status" aria-label="${escapeAttr(label)}"><span aria-hidden="true"></span></span>`;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
