/**
 * Resolves tenant from a subdomain.
 * e.g. acme.example.com -> "acme"
 *
 * @param {object} [options]
 * @param {string} [options.baseDomain] - The base domain to strip (e.g. "example.com")
 * @param {string[]} [options.exclude] - Subdomains to ignore (default: ["www"])
 */
export function createSubdomainResolver(options = {}) {
  const { baseDomain, exclude = ['www'] } = options;

  return function subdomainResolver(ctx) {
    const host = ctx.request.headers?.host || ctx.request.headers?.Host || '';
    // Strip port if present
    const hostname = host.split(':')[0];

    let subdomain;
    if (baseDomain) {
      if (!hostname.endsWith(baseDomain)) return null;
      const prefix = hostname.slice(0, -(baseDomain.length + 1)); // +1 for the dot
      subdomain = prefix || null;
    } else {
      // Assume the last two segments are the base domain
      const parts = hostname.split('.');
      if (parts.length < 3) return null;
      subdomain = parts[0];
    }

    if (!subdomain) return null;
    if (exclude.includes(subdomain)) return null;

    return subdomain;
  };
}

/**
 * Resolves tenant from a URL path prefix.
 * e.g. /t/acme/users -> "acme"
 *
 * @param {object} [options]
 * @param {string} [options.prefix] - The path prefix (default: "/t")
 */
export function createPathResolver(options = {}) {
  const { prefix = '/t' } = options;
  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;

  return function pathResolver(ctx) {
    const path = ctx.request.path || ctx.request.url;
    if (!path.startsWith(normalizedPrefix + '/')) return null;

    const rest = path.slice(normalizedPrefix.length + 1);
    const tenant = rest.split('/')[0];
    return tenant || null;
  };
}

/**
 * Resolves tenant from a request header.
 *
 * @param {object} [options]
 * @param {string} [options.header] - Header name (default: "x-tenant-id")
 */
export function createHeaderResolver(options = {}) {
  const { header = 'x-tenant-id' } = options;
  const lowerHeader = header.toLowerCase();

  return function headerResolver(ctx) {
    const headers = ctx.request.headers || {};
    // Try exact match first, then case-insensitive
    const value = headers[lowerHeader] ?? headers[header];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };
}

/**
 * Tries multiple resolvers in order, returning the first non-null result.
 *
 * @param {Function[]} resolvers
 */
export function createCompositeResolver(resolvers) {
  if (!Array.isArray(resolvers) || resolvers.length === 0) {
    throw new Error('Composite resolver requires at least one resolver');
  }

  return function compositeResolver(ctx) {
    for (const resolver of resolvers) {
      const result = resolver(ctx);
      if (result != null) return result;
    }
    return null;
  };
}
