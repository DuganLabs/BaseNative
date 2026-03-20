/**
 * Compiles a route pattern into a regex and param name list.
 *
 * Supported patterns:
 *   /users/:id        — named param
 *   /files/*path      — wildcard (catches remaining segments)
 *   /static           — exact match
 */
export function compilePattern(pattern) {
  const params = [];
  const parts = pattern.split('/').filter(Boolean);
  let regex = '^';

  for (const part of parts) {
    if (part.startsWith(':')) {
      params.push(part.slice(1));
      regex += '/([^/]+)';
    } else if (part.startsWith('*')) {
      params.push(part.slice(1) || 'wild');
      regex += '/(.+)';
    } else {
      regex += `/${escapeRegex(part)}`;
    }
  }

  // Allow optional trailing slash
  regex += '/?$';

  return { regex: new RegExp(regex), params };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Attempts to match a URL pathname against a compiled route pattern.
 * Returns extracted params on match, or null on miss.
 */
export function matchRoute(pattern, pathname) {
  const compiled = typeof pattern === 'string' ? compilePattern(pattern) : pattern;
  const match = pathname.match(compiled.regex);
  if (!match) return null;

  const params = {};
  for (let i = 0; i < compiled.params.length; i++) {
    params[compiled.params[i]] = decodeURIComponent(match[i + 1]);
  }
  return params;
}

/**
 * Parses a query string into a plain object.
 */
export function parseQuery(search) {
  const params = {};
  const searchStr = search.startsWith('?') ? search.slice(1) : search;
  if (!searchStr) return params;

  for (const pair of searchStr.split('&')) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    params[key] = value ?? '';
  }
  return params;
}

/**
 * Serializes a params object into a query string.
 */
export function buildQuery(params) {
  const entries = Object.entries(params).filter(([_, v]) => v != null);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
