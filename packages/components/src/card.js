/**
 * Card component — semantic <article> container.
 */
import { escapeAttr } from '@basenative/runtime/shared/escape';

/**
 * Card component — semantic <article> container.
 *
 * @param {object} [options]
 * @param {string} [options.header]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.body]    HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.footer]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.variant='default']
 * @returns {string}
 */
export function renderCard(options = {}) {
  const { header = '', body = '', footer = '', variant = 'default' } = options;

  let html = `<article data-bn="card" data-variant="${escapeAttr(variant)}">`;
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
