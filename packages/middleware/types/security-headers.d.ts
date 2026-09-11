import type { MiddlewareContext, MiddlewareFn } from './index.js';

/**
 * A CSP source list. `null` removes the directive from the hardened baseline —
 * the only way to lose a baseline protection is to name it.
 */
export type CspDirectives = Record<string, string[] | null>;

/**
 * A Permissions-Policy allow-list per feature. Unlike CSP, a value here
 * REPLACES the default for that feature; `null` removes the feature entirely.
 * Feature names outside the registry are rejected at construction time.
 */
export type PermissionsPolicy = Record<string, string[] | null>;

export interface HstsOptions {
  /** Seconds. Default 31536000 (one year). */
  maxAge?: number;
  /** Default true. */
  includeSubDomains?: boolean;
  /**
   * Default false. Requires `includeSubDomains` and a `maxAge` of at least one
   * year, matching the browser preload list's own requirements; anything else
   * throws rather than shipping a claim the list would reject.
   */
  preload?: boolean;
}

export interface CacheInfo {
  /** The response's Content-Type, or '' when it has none. */
  contentType: string;
  status: number;
  request?: Request;
  response: Response | { status?: number; headers: Record<string, string> };
}

export interface SecurityHeadersOptions {
  /**
   * Directives merged into the hardened baseline. Sources are unioned with
   * the baseline's, never substituted for them. `false` sends no CSP at all.
   */
  csp?: CspDirectives | false;
  /** Generate a fresh per-response CSP nonce. Default false. */
  nonce?: boolean;
  /** Directives the nonce is added to. Default `['script-src']`. */
  nonceDirectives?: string[];
  /** `false` omits Strict-Transport-Security. */
  hsts?: HstsOptions | false;
  permissions?: PermissionsPolicy;
  /** Default 'DENY'. `false` omits X-Frame-Options. */
  frameOptions?: string | false;
  /** Default 'strict-origin-when-cross-origin'. `false` omits the header. */
  referrerPolicy?: string | false;
  /** Cross-Origin-Opener-Policy. Default 'same-origin'. */
  coop?: string | false;
  /** Cross-Origin-Embedder-Policy. Default false (omitted). */
  coep?: string | false;
  /** Cross-Origin-Resource-Policy. Default false (omitted). */
  corp?: string | false;
  /** `true` sends 'noindex, nofollow, noarchive'; a string sends itself. */
  noindex?: boolean | string;
  /**
   * Per-response cache stance. Return a Cache-Control value to set, or
   * null/undefined to leave whatever the handler already set.
   */
  cache?: (info: CacheInfo) => string | null | undefined;
}

export interface SecurityHeadersContext {
  /** Used by `cache`; never inspected for header construction. */
  request?: Request;
  /**
   * A nonce the response body already embeds. Requires `nonce: true`;
   * supplying one without it throws rather than silently blocking the script.
   */
  nonce?: string;
}

/** The hardened baseline CSP, frozen. Read it; do not mutate it. */
export declare const DEFAULT_CSP: Readonly<Record<string, readonly string[]>>;

/** The features denied by default, frozen. */
export declare const DEFAULT_PERMISSIONS: Readonly<Record<string, readonly string[]>>;

/** A base64 CSP nonce with at least 128 bits of entropy. */
export declare function createNonce(byteLength?: number): string;

/**
 * Build a response finalizer. Options are validated eagerly, so a bad
 * directive fails at boot rather than on the request that needs it.
 */
export declare function securityHeaders(
  options?: SecurityHeadersOptions,
): (response: Response, context?: SecurityHeadersContext) => Response;

/**
 * The header set as a plain record, for handlers that need the headers before
 * the response exists or whose policy varies per request. Never includes
 * Cache-Control.
 */
export declare function buildSecurityHeaders(
  options?: SecurityHeadersOptions,
  context?: { nonce?: string },
): Record<string, string>;

/**
 * The same headers as a `createPipeline()` stage. Runs downstream first so
 * `cache` sees the chosen content type, and publishes the nonce on
 * `ctx.state.cspNonce`.
 */
export declare function securityHeadersMiddleware(
  options?: SecurityHeadersOptions,
): MiddlewareFn;

export type { MiddlewareContext };
