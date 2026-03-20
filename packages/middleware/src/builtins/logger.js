/**
 * Request logging middleware with structured output.
 *
 * @param {object} [options]
 * @param {Function} [options.output] - Log function (defaults to console.log)
 * @param {boolean} [options.json=false] - Output JSON format
 * @param {Function} [options.skip] - Function (ctx) => boolean to skip logging
 */
export function logger(options = {}) {
  const {
    output = console.log,
    json = false,
    skip,
  } = options;

  return async (ctx, next) => {
    if (skip?.(ctx)) {
      await next();
      return;
    }

    const start = Date.now();

    await next();

    const duration = Date.now() - start;
    const { method, url, path } = ctx.request;
    const status = ctx.response.status ?? 200;

    if (json) {
      output(JSON.stringify({
        method,
        url: url ?? path,
        status,
        duration,
        timestamp: new Date().toISOString(),
      }));
    } else {
      const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
      output(`${method} ${url ?? path} ${statusColor}${status}\x1b[0m ${duration}ms`);
    }
  };
}
