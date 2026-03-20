/**
 * Skeleton loading placeholder component.
 */

/**
 * Renders a skeleton placeholder.
 */
export function renderSkeleton(options = {}) {
  const { width = '100%', height = '1rem', variant = 'text', count = 1 } = options;

  if (count === 1) {
    return `<div data-bn="skeleton" data-variant="${variant}" style="width:${width};height:${height}" aria-hidden="true"></div>`;
  }

  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div data-bn="skeleton" data-variant="${variant}" style="width:${width};height:${height}" aria-hidden="true"></div>`;
  }
  return html;
}
