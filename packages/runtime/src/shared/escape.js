/**
 * Output escaping, shared by the client runtime and the SSR renderer.
 *
 * This module is shared deliberately. The original XSS was not simply "the server
 * forgot to escape" — it was that the server and the client disagreed: the client
 * bound through `node.textContent`, which never parses HTML, while the server
 * concatenated raw strings. The SSR payload was injectable and hydration then
 * quietly rewrote it as text, after the script had already run. Any future change
 * must keep both sides reading from here.
 */

/** Values marked with this are inserted without HTML escaping. */
const RAW = Symbol.for('basenative.raw');

/**
 * Mark a string as trusted markup, exempt from HTML escaping.
 *
 *   render('<div>{{ body }}</div>', { body: raw('<em>hi</em>') })
 *
 * This is an explicit trust assertion about a specific value. It is deliberately a
 * function call rather than a directive or a config flag so that every exemption is
 * greppable: `grep -rn "raw(" src/`.
 *
 * It does NOT exempt the value from the URL-scheme guard — a `javascript:` URL is
 * never emitted, marked raw or not, because escaping cannot express that risk and an
 * author asking for raw markup is not asking for script execution.
 */
export function raw(value) {
  return { [RAW]: true, value: String(value ?? '') };
}

export function isRaw(value) {
  return Boolean(value && typeof value === 'object' && value[RAW]);
}

/** The underlying string of a raw value, or the value unchanged. */
export function unwrapRaw(value) {
  return isRaw(value) ? value.value : value;
}

/** Escape for a text node: `&` first, or the later replacements double-encode. */
export function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape for a double-quoted attribute value. */
export function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Attributes whose value is fetched or navigated to, and therefore can execute a
 * `javascript:` URL. Escaping does nothing here: `javascript:alert(1)` contains no
 * character that HTML escaping touches.
 */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'data',
  'poster',
  'xlink:href',
  'ping',
  'background',
  'srcdoc',
  'codebase',
]);

/** Schemes that execute rather than locate. Compared after stripping whitespace. */
const DANGEROUS_SCHEME = /^(?:javascript|vbscript|data|blob|file):/i;

export function isUrlAttribute(name) {
  return URL_ATTRIBUTES.has(String(name).toLowerCase());
}

/**
 * Neutralise a URL-bearing attribute value, or return it unchanged.
 *
 * Control characters and whitespace are stripped before the scheme test because
 * browsers ignore them when resolving a URL: `java\tscript:alert(1)` and
 * `javascript:alert(1)` both execute, so a naive `startsWith` check is bypassable.
 * Returns null when the value must not be emitted at all.
 */
export function sanitizeUrl(value) {
  // eslint-disable-next-line no-control-regex -- the control range is the point
  const stripped = String(value).replace(/[\u0000-\u0020\u007F-\u00A0]/g, '');
  return DANGEROUS_SCHEME.test(stripped) ? null : String(value);
}

/**
 * Locate every `{{ expression }}` in `text`, linearly.
 *
 * Replaces /\{\{\s*(.+?)\s*\}\}/g, which is polynomial: `\s*(.+?)\s*` backtracks
 * across whitespace runs, so `{{` followed by a long run of spaces and no closing
 * `}}` is quadratic. This scans with indexOf and never revisits input. The
 * interpolation reader is on the untrusted-input path (model-generated templates),
 * so it must be linear by construction, not by luck.
 *
 * Matches the old regex's contract: the expression runs to the FIRST `}}`, is
 * trimmed, and `{{}}` / `{{   }}` is not an interpolation. Unlike the regex it also
 * matches across newlines, which the expression tokenizer already tolerates.
 */
export function findInterpolations(text) {
  const out = [];
  let from = 0;
  for (;;) {
    const start = text.indexOf('{{', from);
    if (start === -1) break;
    const end = text.indexOf('}}', start + 2);
    if (end === -1) break;
    const expression = text.slice(start + 2, end).trim();
    if (expression.length > 0) {
      out.push({ start, end: end + 2, expression });
    }
    from = end + 2;
  }
  return out;
}
