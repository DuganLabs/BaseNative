/**
 * Renders a marketplace package card as an HTML string.
 * Works on both server (SSR) and client via @basenative/components convention.
 *
 * @param {object} pkg - Package data
 * @param {string} pkg.name - Package name (e.g., "@basenative/runtime")
 * @param {string} [pkg.description] - Short description
 * @param {string} [pkg.version] - Latest version
 * @param {string} [pkg.author] - Author name
 * @param {string} [pkg.category] - Package category
 * @param {string[]} [pkg.tags] - Tags
 * @param {number} [pkg.downloads] - Download count
 * @param {string} [pkg.updatedAt] - ISO timestamp
 * @param {string} [pkg.repo] - Repository URL
 * @returns {string} HTML string
 */
export function renderPackageCard(pkg) {
  const {
    name,
    description = '',
    version = '',
    author = '',
    category = '',
    tags = [],
    downloads = 0,
    updatedAt = '',
    repo = '',
  } = pkg;

  const tagsHtml = tags.length > 0
    ? `<div data-bn="pkg-tags">${tags.map(t => `<span data-bn="pkg-tag">${esc(t)}</span>`).join('')}</div>`
    : '';

  const statsHtml = `<div data-bn="pkg-stats">
    ${downloads > 0 ? `<span data-bn="pkg-stat">${formatDownloads(downloads)} downloads</span>` : ''}
    ${version ? `<span data-bn="pkg-stat">v${esc(version)}</span>` : ''}
    ${updatedAt ? `<span data-bn="pkg-stat">${relativeTime(updatedAt)}</span>` : ''}
  </div>`;

  const linkAttr = repo ? ` href="${esc(repo)}" target="_blank" rel="noopener"` : '';

  return `<article data-bn="pkg-card">
  <div data-bn="pkg-header">
    <h4 data-bn="pkg-name">${repo ? `<a${linkAttr}>${esc(name)}</a>` : esc(name)}</h4>
    ${category ? `<span data-bn="pkg-category">${esc(category)}</span>` : ''}
  </div>
  ${description ? `<p data-bn="pkg-desc">${esc(description)}</p>` : ''}
  ${tagsHtml}
  ${statsHtml}
  ${author ? `<div data-bn="pkg-author">${esc(author)}</div>` : ''}
</article>`;
}

/**
 * CSS for package cards. Include once on the page.
 * @returns {string}
 */
export function packageCardStyles() {
  return `
[data-bn="pkg-card"] {
  background: var(--surface-2, hsl(220 20% 14%));
  border: 1px solid var(--border, hsl(220 15% 22%));
  border-radius: var(--radius-lg, 0.75rem);
  padding: 1.25rem;
  transition: border-color 150ms ease, transform 150ms ease;
}
[data-bn="pkg-card"]:hover {
  border-color: var(--accent, hsl(210 100% 60%));
  transform: translateY(-2px);
}
[data-bn="pkg-header"] {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-block-end: 0.5rem;
}
[data-bn="pkg-name"] {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}
[data-bn="pkg-name"] a {
  color: var(--accent, hsl(210 100% 60%));
  text-decoration: none;
}
[data-bn="pkg-name"] a:hover { text-decoration: underline; }
[data-bn="pkg-category"] {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, hsl(220 10% 55%));
  background: var(--surface-3, hsl(220 18% 18%));
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}
[data-bn="pkg-desc"] {
  font-size: 0.875rem;
  color: var(--text-secondary, hsl(220 10% 55%));
  margin-block-end: 0.75rem;
  line-height: 1.5;
}
[data-bn="pkg-tags"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-block-end: 0.75rem;
}
[data-bn="pkg-tag"] {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: var(--surface-3, hsl(220 18% 18%));
  color: var(--text-secondary, hsl(220 10% 55%));
}
[data-bn="pkg-stats"] {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted, hsl(220 10% 45%));
  margin-block-end: 0.5rem;
}
[data-bn="pkg-author"] {
  font-size: 0.75rem;
  color: var(--text-muted, hsl(220 10% 45%));
}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDownloads(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function relativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
