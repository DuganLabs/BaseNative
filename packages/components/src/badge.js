/**
 * Badge component — status indicator.
 * Variants: default, primary, success, warning, error
 */

export function renderBadge(content, options = {}) {
  const variant = options.variant || 'default';
  return `<span data-bn="badge" data-variant="${variant}">${escapeHtml(content)}</span>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
