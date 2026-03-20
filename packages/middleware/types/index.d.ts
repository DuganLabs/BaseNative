export interface MiddlewareRequest {
  method: string;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  ip?: string;
  params?: Record<string, string>;
}

export interface CookieOptions {
  value: string;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  secure?: boolean;
  maxAge?: number;
}

export interface MiddlewareResponse {
  status?: number;
  headers: Record<string, string>;
  cookies?: Record<string, CookieOptions>;
  body?: unknown;
}

export interface MiddlewareContext {
  request: MiddlewareRequest;
  response: MiddlewareResponse;
  state: Record<string, unknown>;
}

export type MiddlewareFn = (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void> | void;

export interface Pipeline {
  use(middleware: MiddlewareFn): Pipeline;
  run(ctx: MiddlewareContext): Promise<MiddlewareContext>;
  toHandler(): (ctx: MiddlewareContext) => Promise<MiddlewareContext>;
  readonly stack: MiddlewareFn[];
}

export function createPipeline(): Pipeline;
export function compose(...middlewares: (MiddlewareFn | MiddlewareFn[])[]): MiddlewareFn;

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (ctx: MiddlewareContext) => string;
  message?: string;
}

export interface CsrfOptions {
  cookieName?: string;
  headerName?: string;
  fieldName?: string;
  tokenLength?: number;
  safeMethods?: string[];
}

export interface LoggerOptions {
  output?: (message: string) => void;
  json?: boolean;
  skip?: (ctx: MiddlewareContext) => boolean;
}

export function cors(options?: CorsOptions): MiddlewareFn;
export function rateLimit(options?: RateLimitOptions): MiddlewareFn;
export function csrf(options?: CsrfOptions): MiddlewareFn;
export function logger(options?: LoggerOptions): MiddlewareFn;

export function toExpressMiddleware(pipeline: Pipeline): (req: unknown, res: unknown, next: (err?: unknown) => void) => Promise<void>;
