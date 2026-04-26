// Built with BaseNative — basenative.dev
/**
 * Browser-side share helpers.
 *
 *   nativeShare       — Web Share API → clipboard fallback → fail.
 *   mintShareCard     — POST to your share-card endpoint, get back {id, url}.
 *   composeShareText  — tiny `${var}` templater for text bodies.
 *
 * No dependencies. Works in iOS Safari, Android Chrome, desktop browsers.
 *
 * @module
 */

/**
 * @typedef {object} ShareResult
 * @property {'shared'|'copied'|'failed'} status
 * @property {Error} [error]
 */

/**
 * Try the Web Share API; fall back to clipboard; otherwise fail.
 *
 * @param {{ text?: string, url?: string, title?: string, files?: File[] }} payload
 * @returns {Promise<ShareResult>}
 */
export async function nativeShare(payload) {
  const { text = '', url, title, files } = payload || {};
  if (typeof navigator === 'undefined') return { status: 'failed' };

  // navigator.canShare is the right gate when files are involved.
  const wantsShare = typeof navigator.share === 'function';
  if (wantsShare) {
    const arg = {};
    if (text) arg.text = text;
    if (url) arg.url = url;
    if (title) arg.title = title;
    if (files && files.length) arg.files = files;
    try {
      if (files && typeof navigator.canShare === 'function' && !navigator.canShare(arg)) {
        // skip — fall through to clipboard
      } else {
        await navigator.share(arg);
        return { status: 'shared' };
      }
    } catch (err) {
      // AbortError = user cancelled → don't fall through, that surprises users.
      if (err && err.name === 'AbortError') return { status: 'failed', error: err };
      // Otherwise fall through to clipboard.
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      const body = url ? (text ? `${text}\n\n${url}` : url) : text;
      await navigator.clipboard.writeText(body);
      return { status: 'copied' };
    } catch (err) {
      return { status: 'failed', error: err };
    }
  }
  return { status: 'failed' };
}

/**
 * POST a share-card payload and return the minted `{ id, url }`.
 *
 * @param {Record<string, any>} payload
 * @param {{
 *   endpoint?: string,
 *   fetch?: typeof fetch,
 *   headers?: Record<string, string>,
 * }} [opts]
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function mintShareCard(payload, opts = {}) {
  const endpoint = opts.endpoint ?? '/api/share-cards';
  const f = opts.fetch ?? globalThis.fetch;
  if (typeof f !== 'function') throw new Error('mintShareCard: fetch unavailable');
  const res = await f(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = new Error(`mintShareCard: ${res.status}`);
    /** @type {any} */ (err).status = res.status;
    throw err;
  }
  return await res.json();
}

/**
 * Tiny `${var}` template helper. Placeholders that don't have a matching
 * key are left untouched (which keeps malformed templates from silently
 * losing data).
 *
 * @param {string} template
 * @param {Record<string, any>} vars
 */
export function composeShareText(template, vars = {}) {
  return String(template).replace(/\$\{(\w+)\}/g, (_m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `\${${k}}`
  );
}
