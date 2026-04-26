// Built with BaseNative — basenative.dev
/**
 * Audit-log middleware.
 *
 * Records every protected action against an `audit_log` table so admin
 * decisions, role changes, and queue moves are reconstructible after the
 * fact. Designed to wrap a handler or be invoked imperatively.
 *
 * @module
 */

/**
 * SQL migration text for the audit_log table. Re-exported from
 * `migrations/0001_audit_and_roles.sql` for convenience when you want to
 * apply it programmatically (e.g. in a worker startup hook).
 */
export const AUDIT_MIGRATION = `
CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT,
  actor_handle TEXT,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  meta_json    TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target  ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
`.trim();

/**
 * Record an audit entry. All fields except `action` are optional.
 *
 * @param {{ DB?: any } | any} env Worker env (or any object with a `.DB`
 *   binding). You may also pass the DB binding directly.
 * @param {{
 *   user?: { id?: string, handle?: string } | null,
 *   action: string,
 *   target?: { type?: string, id?: string|number } | null,
 *   meta?: Record<string, any>,
 *   table?: string,
 *   now?: () => number,
 * }} entry
 */
export async function auditAction(env, entry) {
  const db = env?.DB ?? env;
  if (!db || typeof db.prepare !== 'function') return;
  if (!entry?.action) throw new TypeError('auditAction: action required');

  const table = entry.table ?? 'audit_log';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new TypeError(`auditAction: unsafe table name ${table}`);
  }
  const now = (entry.now ?? Date.now)();

  const sql = `INSERT INTO ${table}
    (actor_id, actor_handle, action, target_type, target_id, meta_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const meta = entry.meta ? safeStringify(entry.meta) : null;
  try {
    await db.prepare(sql).bind(
      entry.user?.id ?? null,
      entry.user?.handle ?? null,
      String(entry.action),
      entry.target?.type ?? null,
      entry.target?.id != null ? String(entry.target.id) : null,
      meta,
      now,
    ).run();
  } catch (e) {
    // Audit must never break the main flow. Surface to console for ops.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[basenative/admin] audit write failed:', e?.message || e);
    }
  }
}

/**
 * Wrap a request handler so every successful invocation records an audit.
 * The wrapper resolves `user`, `action`, `target`, and `meta` from the
 * supplied callbacks at call-time so they can read from the request.
 *
 * @param {{
 *   action: string | ((ctx: any) => string),
 *   user: (ctx: any) => any,
 *   target?: (ctx: any) => { type?: string, id?: string|number } | null,
 *   meta?: (ctx: any, result: any) => Record<string, any>,
 *   shouldRecord?: (ctx: any, result: any) => boolean,
 *   table?: string,
 * }} cfg
 */
export function withAudit(cfg) {
  return (handler) => async (ctx) => {
    const result = await handler(ctx);
    try {
      const ok = cfg.shouldRecord ? cfg.shouldRecord(ctx, result) : true;
      if (ok) {
        const action = typeof cfg.action === 'function' ? cfg.action(ctx) : cfg.action;
        await auditAction(ctx.env, {
          user: cfg.user(ctx),
          action,
          target: cfg.target ? cfg.target(ctx) : null,
          meta: cfg.meta ? cfg.meta(ctx, result) : undefined,
          table: cfg.table,
        });
      }
    } catch { /* never leak audit errors */ }
    return result;
  };
}

function safeStringify(v) {
  try { return JSON.stringify(v); } catch { return null; }
}
