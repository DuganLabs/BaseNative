/**
 * Fastify adapter for BaseNative middleware pipeline.
 * Converts Fastify request/reply into the common middleware context.
 */

/**
 * Convert a BaseNative middleware pipeline into a Fastify plugin.
 * Registers a preHandler hook that runs the pipeline on every request.
 *
 * @param {import('../pipeline.js').Pipeline} pipeline - A pipeline created with createPipeline()
 * @returns {Function} Fastify plugin (fastify, opts, done) => void
 */
export function toFastifyPlugin(pipeline) {
  return function baseNativePlugin(fastify, opts, done) {
    fastify.addHook('preHandler', async (request, reply) => {
      const ctx = createFastifyContext(request, reply);

      await pipeline.run(ctx);

      // Apply response headers set by middleware
      for (const [key, value] of Object.entries(ctx.response.headers)) {
        reply.header(key, value);
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
          reply.header('set-cookie', parts.join('; '));
        }
      }

      // If middleware set a response body, send it and stop
      if (ctx.response.body !== undefined) {
        reply.code(ctx.response.status ?? 200).send(ctx.response.body);
        return;
      }
    });

    done();
  };
}

/**
 * Create a BaseNative context from Fastify request/reply.
 *
 * @param {object} request - Fastify Request
 * @param {object} reply - Fastify Reply
 * @returns {object} Common middleware context
 */
function createFastifyContext(request, _reply) {
  return {
    request: {
      method: request.method,
      url: request.url,
      path: request.routeOptions?.url ?? request.url.split('?')[0],
      headers: request.headers,
      cookies: parseCookieHeader(request.headers?.cookie),
      query: request.query ?? {},
      body: request.body,
      ip: request.ip ?? request.raw?.socket?.remoteAddress,
      params: request.params ?? {},
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

export { createFastifyContext };
