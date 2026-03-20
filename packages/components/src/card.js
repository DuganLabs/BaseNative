/**
 * Card component — semantic <article> container.
 */

export function renderCard(options = {}) {
  const { header = '', body = '', footer = '', variant = 'default' } = options;

  let html = `<article data-bn="card" data-variant="${variant}">`;
  if (header) {
    html += `<header data-bn="card-header">${header}</header>`;
  }
  html += `<div data-bn="card-body">${body}</div>`;
  if (footer) {
    html += `<footer data-bn="card-footer">${footer}</footer>`;
  }
  html += `</article>`;
  return html;
}
