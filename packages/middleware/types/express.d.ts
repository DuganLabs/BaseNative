import type { MiddlewareContext } from './index.js';

export { toExpressMiddleware } from './index.js';

/** The subset of an Express `req` that `createExpressContext` reads. */
export interface ExpressRequestLike {
  method: string;
  originalUrl?: string;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  ip?: string;
  socket?: { remoteAddress?: string };
  params?: Record<string, string>;
}

/**
 * Build a middleware context from an Express request. When `req.cookies` is
 * absent, cookies are parsed from the `cookie` header.
 */
export function createExpressContext(req: ExpressRequestLike, res?: unknown): MiddlewareContext;
