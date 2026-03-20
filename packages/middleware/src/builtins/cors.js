/**
 * CORS middleware.
 *
 * @param {object} [options]
 * @param {string|string[]|Function} [options.origin='*'] - Allowed origin(s) or function (origin) => boolean
 * @param {string[]} [options.methods] - Allowed HTTP methods
 * @param {string[]} [options.allowedHeaders] - Allowed request headers
 * @param {string[]} [options.exposedHeaders] - Headers to expose to browser
 * @param {boolean} [options.credentials=false] - Allow credentials
 * @param {number} [options.maxAge] - Preflight cache duration in seconds
 */
export function cors(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = [],
    exposedHeaders = [],
    credentials = false,
    maxAge,
  } = options;

  function resolveOrigin(requestOrigin) {
    if (typeof origin === 'function') return origin(requestOrigin) ? requestOrigin : null;
    if (Array.isArray(origin)) return origin.includes(requestOrigin) ? requestOrigin : null;
    return origin;
  }

  return async (ctx, next) => {
    const requestOrigin = ctx.request.headers?.origin;
    const resolved = resolveOrigin(requestOrigin);

    if (resolved) {
      ctx.response.headers['access-control-allow-origin'] = resolved;
    }

    if (credentials) {
      ctx.response.headers['access-control-allow-credentials'] = 'true';
    }

    if (exposedHeaders.length > 0) {
      ctx.response.headers['access-control-expose-headers'] = exposedHeaders.join(', ');
    }

    // Handle preflight
    if (ctx.request.method === 'OPTIONS') {
      ctx.response.headers['access-control-allow-methods'] = methods.join(', ');

      const reqHeaders = allowedHeaders.length > 0
        ? allowedHeaders.join(', ')
        : ctx.request.headers?.['access-control-request-headers'] ?? '';

      if (reqHeaders) {
        ctx.response.headers['access-control-allow-headers'] = reqHeaders;
      }

      if (maxAge !== undefined) {
        ctx.response.headers['access-control-max-age'] = String(maxAge);
      }

      ctx.response.status = 204;
      ctx.response.body = '';
      return;
    }

    await next();
  };
}
