/**
 * Pagination component — server-friendly page navigation.
 * Renders as a <nav> with page links for progressive enhancement.
 */

/**
 * Renders a pagination control.
 *
 * @param {object} options
 * @param {number} options.currentPage - Current page (1-indexed)
 * @param {number} options.totalPages - Total number of pages
 * @param {string} [options.baseUrl] - Base URL for page links (appends ?page=N)
 * @param {number} [options.window] - Number of page links to show around current
 */
export function renderPagination(options = {}) {
  const { currentPage = 1, totalPages = 1, baseUrl = '', window: pageWindow = 2 } = options;

  if (totalPages <= 1) return '';

  const pages = computePages(currentPage, totalPages, pageWindow);

  let html = `<nav data-bn="pagination" aria-label="Pagination"><ul>`;

  // Previous
  if (currentPage > 1) {
    html += `<li><a href="${pageUrl(baseUrl, currentPage - 1)}" rel="prev" aria-label="Previous page">&laquo;</a></li>`;
  } else {
    html += `<li><span aria-disabled="true">&laquo;</span></li>`;
  }

  for (const page of pages) {
    if (page === '...') {
      html += `<li><span data-bn="pagination-ellipsis">&hellip;</span></li>`;
    } else if (page === currentPage) {
      html += `<li><a href="${pageUrl(baseUrl, page)}" aria-current="page" data-active>${page}</a></li>`;
    } else {
      html += `<li><a href="${pageUrl(baseUrl, page)}">${page}</a></li>`;
    }
  }

  // Next
  if (currentPage < totalPages) {
    html += `<li><a href="${pageUrl(baseUrl, currentPage + 1)}" rel="next" aria-label="Next page">&raquo;</a></li>`;
  } else {
    html += `<li><span aria-disabled="true">&raquo;</span></li>`;
  }

  html += `</ul></nav>`;
  return html;
}

function pageUrl(base, page) {
  if (!base) return `?page=${page}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}page=${page}`;
}

function computePages(current, total, windowSize) {
  const pages = [];
  const start = Math.max(1, current - windowSize);
  const end = Math.min(total, current + windowSize);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }

  return pages;
}
