// Built with BaseNative — basenative.dev
/**
 * Injecting the client tag into a server-rendered HTML string.
 *
 * The tag is an external, same-origin module script. That is the whole CSP
 * story: no inline script means no `'unsafe-inline'`, no nonce to thread
 * through the render, and no change to the `script-src 'self'` policy
 * `docs/guides/security.md` documents for BaseNative apps.
 */

import { CLIENT_MARKER, ROUTES } from './protocol.js';

/**
 * Build the script tag.
 *
 * @param {string} [src] Route the client module is served from.
 * @returns {string}
 */
export function clientTag(src = ROUTES.client) {
  return `<script type="module" src="${src}" ${CLIENT_MARKER}></script>`;
}

/**
 * Does this string look like a document the client can be injected into?
 *
 * Fragments (an `@defer` chunk, an HTMX partial, a JSON error body) are left
 * alone — injecting into one would load a second copy of the client.
 *
 * @param {string} html
 * @returns {boolean}
 */
export function isFullDocument(html) {
  if (typeof html !== 'string') return false;
  return /<\/body\s*>|<\/html\s*>|<html[\s>]/i.test(html);
}

/**
 * Insert the client tag before `</body>`, falling back to `</html>`.
 *
 * Idempotent: a document that already carries the marker comes back untouched,
 * which matters because the proxy and an in-app middleware can both be active
 * during a migration.
 *
 * @param {string} html
 * @param {{ src?: string }} [options]
 * @returns {string}
 */
export function injectClientScript(html, options = {}) {
  if (!isFullDocument(html)) return html;
  if (html.includes(CLIENT_MARKER)) return html;

  const tag = clientTag(options.src);

  const body = html.toLowerCase().lastIndexOf('</body');
  if (body !== -1) return `${html.slice(0, body)}${tag}${html.slice(body)}`;

  const root = html.toLowerCase().lastIndexOf('</html');
  if (root !== -1) return `${html.slice(0, root)}${tag}${html.slice(root)}`;

  return html + tag;
}
