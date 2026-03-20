/**
 * Breadcrumb — navigation trail.
 */
export function renderBreadcrumb(options = {}) {
  const {
    items = [],
    separator = '/',
    attrs = '',
  } = options;

  const itemsHtml = items
    .map((item, i) => {
      const isLast = i === items.length - 1;
      if (isLast) {
        return `<li data-bn="breadcrumb-item" aria-current="page">${item.label}</li>`;
      }
      return `<li data-bn="breadcrumb-item"><a href="${item.href}">${item.label}</a><span data-bn="breadcrumb-separator" aria-hidden="true">${separator}</span></li>`;
    })
    .join('');

  return `<nav data-bn="breadcrumb" aria-label="Breadcrumb" ${attrs}>
  <ol data-bn="breadcrumb-list">${itemsHtml}</ol>
</nav>`;
}
