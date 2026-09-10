/**
 * Express adapter for BaseNative middleware pipeline.
 * Converts Express req/res into the common middleware context.
 */

/**
 * Convert a BaseNative middleware pipeline into Express middleware.
 *
 * @param {import('../pipeline.js').Pipeline} pipeline - A pipeline created with createPipeline()
 * @returns {Function} Express middleware (req, res, next)
 */
export function toExpressMiddleware(pipeline) {
  return async (req, res, next) => {
    const ctx = createExpressContext(req, res);

    try {
      await pipeline.run(ctx);

      // Apply response headers set by middleware
      for (const [key, value] of Object.entries(ctx.response.headers)) {
        res.setHeader(key, value);
      }

      // Apply cookies set by middleware
      if (ctx.response.cookies) {
        for (const [name, cookie] of Object.entries(ctx.response.cookies)) {
          const opts = {};
          if (cookie.httpOnly !== undefined) opts.httpOnly = cookie.httpOnly;
          if (cookie.sameSite) opts.sameSite = cookie.sameSite;
          if (cookie.path) opts.path = cookie.path;
          if (cookie.secure !== undefined) opts.secure = cookie.secure;
          if (cookie.maxAge !== undefined) opts.maxAge = cookie.maxAge;
          res.cookie(name, cookie.value, opts);
        }
      }

      // If middleware set a response status + body, send it
      if (ctx.response.body !== undefined) {
        res.status(ctx.response.status ?? 200).send(ctx.response.body);
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Create a BaseNative context from Express req/res.
 */
function createExpressContext(req, _res) {
  return {
    request: {
      method: req.method,
      url: req.originalUrl ?? req.url,
      path: req.path,
      headers: req.headers,
      cookies: req.cookies ?? parseCookieHeader(req.headers?.cookie),
      query: req.query,
      body: req.body,
      ip: req.ip ?? req.socket?.remoteAddress,
      params: req.params,
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

// RFC 6265 cookie-name = token (RFC 7230 tchar): no CTLs, separators or spaces.
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function parseCookieHeader(header) {
  if (!header) return {};
  // Cookie names come straight from the request header. A null-prototype
  // object means a crafted name like `__proto__` becomes an inert own
  // property instead of reaching Object.prototype.
  const result = Object.create(null);
  for (const pair of header.split(';')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    // Only RFC 6265 cookie-name tokens are accepted as property names; anything
    // else (separators, control characters, `__proto__`-style names) is dropped
    // rather than written. This is the allow-list check the property write
    // depends on, in addition to the null-prototype object above.
    if (!COOKIE_NAME.test(key) || key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    result[key] = decodeURIComponent(value);
  }
  return result;
}

export { createExpressContext };
