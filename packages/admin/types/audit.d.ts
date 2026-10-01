// Built with BaseNative — basenative.dev

export const AUDIT_MIGRATION: string;
export function auditAction(env: any, entry: {
  user?: { id?: string; handle?: string } | null;
  action: string;
  target?: { type?: string; id?: string | number } | null;
  meta?: Record<string, any>;
  table?: string;
  now?: () => number;
}): Promise<void>;

/**
 * Wraps a request handler so every successful invocation records an audit
 * entry. `user`, `action`, `target` and `meta` are resolved at call time.
 * Audit failures never reach the caller.
 */
export function withAudit(cfg: {
  action: string | ((ctx: any) => string);
  user: (ctx: any) => any;
  target?: (ctx: any) => { type?: string; id?: string | number } | null;
  meta?: (ctx: any, result: any) => Record<string, any>;
  shouldRecord?: (ctx: any, result: any) => boolean;
  table?: string;
}): <TCtx, TResult>(handler: (ctx: TCtx) => TResult | Promise<TResult>) => (ctx: TCtx) => Promise<TResult>;
