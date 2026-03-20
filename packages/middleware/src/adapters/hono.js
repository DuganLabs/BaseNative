/**
 * Hono adapter for BaseNative middleware pipeline.
 * Converts Hono context into the common middleware context.
 * Compatible with edge runtimes (Cloudflare Workers, Deno, Bun).
 */

/**
 * Convert a BaseNative middleware pipeline into Hono middleware.
 *
 * @param {import('../pipeline.js').Pipeline} pipeline - A pipeline created with createPipeline()
 * @returns {Function} Hono middleware (c, next) => Promise<void | Response>
 */
export function toHonoMiddleware(pipeline) {
  return async (c, next) => {
    const ctx = createHonoContext(c);

    await pipeline.run(ctx);

    // Apply response headers set by middleware
    for (const [key, value] of Object.entries(ctx.response.headers)) {
      c.header(key, value);
    }

    // Apply cookies set by middleware
    if (ctx.response.cookies) {
      for (const [name, cookie] of Object.entries(ctx.response.cookies)) {
        const parts = [`${name}=${encodeURIComponent(cookie.value)}`];
        if (cookie.path) parts.push(`Path=${cookie.path}`);
        if (cookie.httpOnly) parts.push('HttpOnly');
        if (cookie.secure) parts.push('Secure');
        if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
        if (cookie.maxAge !== undefined) parts.push(`Max-Age=${cookie.maxAge}`);
        c.header('set-cookie', parts.join('; '));
      }
    }

    // If middleware set a response body, return it
    if (ctx.response.body !== undefined) {
      c.status(ctx.response.status ?? 200);
      const body = ctx.response.body;
      if (typeof body === 'object' && body !== null) {
        return c.json(body);
      }
      return c.text(String(body));
    }

    await next();
  };
}

/**
 * Create a BaseNative context from a Hono context object.
 *
 * @param {object} c - Hono Context
 * @returns {object} Common middleware context
 */
function createHonoContext(c) {
  const req = c.req;
  const url = new URL(req.url);

  return {
    request: {
      method: req.method,
      url: req.url,
      path: url.pathname,
      headers: Object.fromEntries(req.raw.headers.entries()),
      cookies: parseCookieHeader(req.raw.headers.get('cookie')),
      query: Object.fromEntries(url.searchParams.entries()),
      body: req.raw.body,
      ip: c.env?.remoteAddr ?? req.raw.headers.get('cf-connecting-ip') ?? undefined,
      params: req.param(),
    },
    response: {
      status: undefined,
      headers: {},
      cookies: undefined,
      body: undefined,
    },
    state: {},
  };
}

function parseCookieHeader(header) {
  if (!header) return {};
  const result = {};
  for (const pair of header.split(';')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    result[key] = decodeURIComponent(value);
  }
  return result;
}

export { createHonoContext };
