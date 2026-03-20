/**
 * In-memory rate limiting middleware.
 *
 * @param {object} [options]
 * @param {number} [options.windowMs=60000] - Time window in milliseconds
 * @param {number} [options.max=100] - Max requests per window per key
 * @param {Function} [options.keyGenerator] - Function (ctx) => string to generate rate limit key
 * @param {string} [options.message] - Response body when rate limited
 */
export function rateLimit(options = {}) {
  const {
    windowMs = 60_000,
    max = 100,
    keyGenerator = (ctx) => ctx.request.ip ?? ctx.request.headers?.['x-forwarded-for'] ?? 'unknown',
    message = 'Too many requests, please try again later.',
  } = options;

  const hits = new Map();

  // Periodic cleanup
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.resetTime >= windowMs) hits.delete(key);
    }
  }, windowMs);

  if (cleanup.unref) cleanup.unref();

  return async (ctx, next) => {
    const key = keyGenerator(ctx);
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      hits.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    ctx.response.headers['x-ratelimit-limit'] = String(max);
    ctx.response.headers['x-ratelimit-remaining'] = String(Math.max(0, max - entry.count));
    ctx.response.headers['x-ratelimit-reset'] = String(Math.ceil(entry.resetTime / 1000));

    if (entry.count > max) {
      ctx.response.status = 429;
      ctx.response.headers['retry-after'] = String(Math.ceil((entry.resetTime - now) / 1000));
      ctx.response.body = message;
      return;
    }

    await next();
  };
}
