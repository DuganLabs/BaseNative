// Built with BaseNative — basenative.dev
/**
 * The dev-only middleware.
 *
 * Two shapes, because BaseNative apps come in two shapes:
 *
 *   - `hmrMiddleware()` → `(req, res, next)`, the Node/Connect/Express form.
 *     It answers the `/__bn_hmr/*` routes and injects the client tag into any
 *     HTML response that passes through.
 *   - `toPipelineMiddleware()` → `(ctx, next)`, matching
 *     `@basenative/middleware`'s pipeline contract, for apps that render into
 *     `ctx.response.body`.
 *
 * Both are inert when `NODE_ENV=production`, and the check happens per request,
 * not at construction. A middleware that was built before the environment was
 * read must not stay hot for the life of the process.
 */

import { isDevEnvironment } from './guard.js';
import { injectClientScript, isFullDocument } from './inject.js';
import { createHmrServer } from './server.js';

/** Responses larger than this are streamed through untouched. */
const MAX_BUFFER = 4 * 1024 * 1024;

/**
 * Buffer an HTML response so it can be rewritten, and pass everything else
 * straight through.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {(html: string) => string} transform
 * @param {{ maxBytes?: number }} [options]
 */
export function interceptHtml(res, transform, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_BUFFER;

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const originalWriteHead = res.writeHead.bind(res);

  let mode = null;
  let headSent = false;
  let chunks = [];
  let size = 0;

  function flushHead() {
    if (headSent) return;
    headSent = true;
    originalWriteHead(res.statusCode);
  }

  function decide() {
    if (mode) return mode;
    const type = String(res.getHeader('content-type') ?? '');
    const encoding = res.getHeader('content-encoding');
    const status = res.statusCode ?? 200;
    const rewritable =
      type.includes('html') && !encoding && status >= 200 && status < 300;
    mode = rewritable ? 'buffer' : 'passthrough';
    return mode;
  }

  function drainToPassthrough() {
    mode = 'passthrough';
    flushHead();
    for (const chunk of chunks) originalWrite(chunk);
    chunks = [];
  }

  res.writeHead = function writeHead(status, arg1, arg2) {
    const headers = arg1 && typeof arg1 === 'object' ? arg1 : arg2;
    if (typeof arg1 === 'string') res.statusMessage = arg1;
    if (Array.isArray(headers)) {
      for (let i = 0; i < headers.length - 1; i += 2) res.setHeader(headers[i], headers[i + 1]);
    } else if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        if (value !== undefined) res.setHeader(name, value);
      }
    }
    if (typeof status === 'number') res.statusCode = status;
    if (decide() === 'passthrough') flushHead();
    return res;
  };

  res.write = function write(chunk, encoding, callback) {
    if (decide() === 'passthrough') {
      flushHead();
      return originalWrite(chunk, encoding, callback);
    }
    if (chunk) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      chunks.push(buffer);
      size += buffer.length;
      if (size > maxBytes) drainToPassthrough();
    }
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  };

  res.end = function end(chunk, encoding, callback) {
    if (typeof chunk === 'function') return originalEnd(chunk);
    if (decide() === 'passthrough') {
      flushHead();
      return originalEnd(chunk, encoding, callback);
    }

    if (chunk) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      chunks.push(buffer);
    }

    let body = Buffer.concat(chunks).toString('utf8');
    try {
      body = transform(body);
    } catch {
      /* a transform that throws must not take the response with it */
    }

    res.setHeader('content-length', Buffer.byteLength(body));
    // The body no longer matches whatever ETag the app computed for it.
    res.removeHeader('etag');
    flushHead();
    return originalEnd(body, 'utf8', typeof encoding === 'function' ? encoding : callback);
  };

  return res;
}

/**
 * Node/Connect/Express middleware that serves HMR and injects the client.
 *
 * ```js
 * import { hmrMiddleware } from '@basenative/hmr';
 * if (process.env.NODE_ENV !== 'production') app.use(hmrMiddleware({ roots: [import.meta.dirname] }));
 * ```
 *
 * @param {object} [options] Passed to {@link createHmrServer}, plus `src`.
 * @returns {((req: any, res: any, next?: Function) => void) & { hmr: object }}
 */
export function hmrMiddleware(options = {}) {
  const hmr = options.hmr ?? createHmrServer(options);

  const middleware = function hmrRequestHandler(req, res, next) {
    if (!isDevEnvironment(options.env)) return next?.();
    if (hmr.handle(req, res)) return undefined;
    interceptHtml(res, (html) => injectClientScript(html, { src: options.src }));
    return next?.();
  };

  middleware.hmr = hmr;
  middleware.close = () => hmr.close();
  return middleware;
}

/**
 * `@basenative/middleware` pipeline form: `(ctx, next)`.
 *
 * Injection only — an SSE stream needs the raw response object, so pair this
 * with {@link hmrMiddleware} (or the proxy) for the event stream itself.
 *
 * @param {object} [options]
 * @returns {(ctx: any, next: Function) => Promise<void>}
 */
export function toPipelineMiddleware(options = {}) {
  return async function hmrPipelineMiddleware(ctx, next) {
    await next?.();
    if (!isDevEnvironment(options.env)) return;
    const body = ctx?.response?.body;
    if (typeof body !== 'string' || !isFullDocument(body)) return;
    ctx.response.body = injectClientScript(body, { src: options.src });
    if (ctx.response.headers && 'content-length' in ctx.response.headers) {
      ctx.response.headers['content-length'] = String(Buffer.byteLength(ctx.response.body));
    }
  };
}
