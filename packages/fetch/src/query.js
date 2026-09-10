function append(parts, key, value) {
  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
}

/**
 * Serializes a params object to a `?key=value&…` string, or `''` when nothing
 * survives. Keys are sorted so equal objects always serialize identically
 * (stable cache keys); `null` / `undefined` values are skipped; arrays repeat
 * the key once per element in order.
 *
 * @param {Record<string, unknown> | null | undefined} params
 * @returns {string}
 */
export function serializeQuery(params) {
  if (!params) return '';
  const parts = [];
  for (const key of Object.keys(params).sort()) {
    const raw = params[key];
    if (raw === undefined || raw === null) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) if (value !== undefined && value !== null) append(parts, key, value);
    } else {
      append(parts, key, raw);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Joins a base URL and a path with exactly one `/` between them. An empty
 * base returns the path unchanged; an absolute `http(s)://` path is returned
 * as is.
 *
 * @param {string} base
 * @param {string} path
 * @returns {string}
 */
export function joinUrl(base, path) {
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
