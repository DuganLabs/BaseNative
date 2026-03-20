/**
 * Cloudflare Workers adapter for BaseNative middleware pipeline.
 * Converts the standard Workers Request into the common middleware context.
 */

/**
 * Convert a BaseNative middleware pipeline into a Cloudflare Workers fetch handler.
 *
 * @param {import('../pipeline.js').Pipeline} pipeline - A pipeline created with createPipeline()
 * @returns {Function} Workers fetch handler (request, env, ctx) => Promise<Response>
 */
export function toCloudflareHandler(pipeline) {
  return async (request, env, executionCtx) => {
    const ctx = createCloudflareContext(request, env, executionCtx);

    await pipeline.run(ctx);

    // Build response headers
    const headers = new Headers(ctx.response.headers);

    // Apply cookies set by middleware
    if (ctx.response.cookies) {
      for (const [name, cookie] of Object.entries(ctx.response.cookies)) {
        const parts = [`${name}=${encodeURIComponent(cookie.value)}`];
        if (cookie.path) parts.push(`Path=${cookie.path}`);
        if (cookie.httpOnly) parts.push('HttpOnly');
        if (cookie.secure) parts.push('Secure');
        if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
        if (cookie.maxAge !== undefined) parts.push(`Max-Age=${cookie.maxAge}`);
        headers.append('set-cookie', parts.join('; '));
      }
    }

    const status = ctx.response.status ?? 200;
    const body = ctx.response.body;

    if (body === undefined || body === null) {
      return new Response(null, { status, headers });
    }

    if (typeof body === 'object') {
      headers.set('content-type', 'application/json');
      return new Response(JSON.stringify(body), { status, headers });
    }

    return new Response(String(body), { status, headers });
  };
}

/**
 * Create a BaseNative context from a Cloudflare Workers request.
 *
 * @param {Request} request - Standard Request object
 * @param {object} env - Workers env bindings
 * @param {object} executionCtx - Workers execution context (waitUntil, passThroughOnException)
 * @returns {object} Common middleware context
 */
function createCloudflareContext(request, env, executionCtx) {
  const url = new URL(request.url);

  return {
    request: {
      method: request.method,
      url: request.url,
      path: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: parseCookieHeader(request.headers.get('cookie')),
      query: Object.fromEntries(url.searchParams.entries()),
      body: request.body,
      ip: request.headers.get('cf-connecting-ip') ?? undefined,
      params: {},
    },
    response: {
      status: undefined,
      headers: {},
      cookies: undefined,
      body: undefined,
    },
    state: {},
    env,
    executionCtx,
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

export { createCloudflareContext };
