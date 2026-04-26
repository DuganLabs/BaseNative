// Built with BaseNative — basenative.dev
/**
 * Submission queue primitive — generic implementation of t4bs's submit /
 * pending / decide / promote-to-target flow.
 *
 * The queue lives in a `submissions` table (or whatever you point it at).
 * On approval we copy the row into a `target` table; on rejection we leave
 * an audit trail in place. Decision metadata (`status`, `decidedBy`,
 * `decidedAt`) is written automatically.
 *
 * The `db` argument is a thin port — anything that exposes
 * `prepare(sql).bind(...).all() | first() | run()` (matching `@basenative/db`
 * and Cloudflare D1) will work.
 *
 * @module
 */

const STATUSES = new Set(['pending', 'approved', 'rejected']);

/**
 * @typedef {object} QueueTablesConfig
 * @property {string} submissions Submission table name.
 * @property {string} target Approved-row destination table name.
 * @property {string[]} [columns] Columns to copy submissions → target.
 *   Defaults to ["category", "phrase"].
 */

/**
 * @typedef {object} QueueDecideResult
 * @property {number|string} id
 * @property {'approved'|'rejected'} status
 * @property {string} decidedBy
 * @property {number} decidedAt
 */

/**
 * Build a queue store bound to a DB and a pair of tables.
 *
 * @param {{
 *   db: any,
 *   tables: QueueTablesConfig,
 *   now?: () => number,
 *   onApprove?: (row: any, ctx: { db: any }) => Promise<void>,
 * }} opts
 */
export function defineQueue({ db, tables, now = () => Date.now(), onApprove } = {}) {
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('defineQueue: db must expose prepare()');
  }
  if (!tables?.submissions || !tables?.target) {
    throw new TypeError('defineQueue: tables.submissions and tables.target are required');
  }

  const cols = tables.columns ?? ['category', 'phrase'];
  const subT = ident(tables.submissions);
  const tgtT = ident(tables.target);

  return {
    /**
     * List rows still awaiting a decision.
     */
    async listPending(limit = 50) {
      const sql = `SELECT * FROM ${subT} WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`;
      const r = await db.prepare(sql).bind(Math.min(Math.max(limit | 0, 1), 500)).all();
      return r?.results ?? r ?? [];
    },

    /**
     * Insert a new pending submission.
     *
     * @param {Record<string, any>} payload Must contain every column in
     *   `tables.columns` plus `submittedBy`.
     */
    async submit(payload) {
      if (!payload || typeof payload !== 'object') throw new TypeError('submit: payload required');
      const submittedBy = String(payload.submittedBy || '').trim();
      if (!submittedBy) throw new TypeError('submit: submittedBy required');

      const colNames = ['submitted_by', 'status', 'created_at', ...cols];
      const placeholders = colNames.map(() => '?').join(', ');
      const t = now();
      const values = [submittedBy, 'pending', t, ...cols.map((c) => payload[c])];
      const sql = `INSERT INTO ${subT} (${colNames.map(ident).join(', ')}) VALUES (${placeholders})`;
      const r = await db.prepare(sql).bind(...values).run();
      const id = r?.meta?.last_row_id ?? r?.lastInsertRowid ?? null;
      return { id, status: 'pending', submittedBy, createdAt: t };
    },

    /**
     * Decide a pending submission. Approval copies the row into the target
     * table inside a transaction-ish pair of statements.
     *
     * @param {number|string} id
     * @param {'approved'|'rejected'} status
     * @param {string} decidedBy
     * @returns {Promise<QueueDecideResult|null>}
     */
    async decide(id, status, decidedBy) {
      if (!STATUSES.has(status) || status === 'pending') {
        throw new TypeError(`decide: status must be approved|rejected, got ${status}`);
      }
      const decidedAt = now();
      const update = `UPDATE ${subT} SET status = ?, decided_by = ?, decided_at = ?
                       WHERE id = ? AND status = 'pending'`;
      const u = await db.prepare(update).bind(status, decidedBy, decidedAt, id).run();
      const changes = u?.meta?.changes ?? u?.changes ?? 0;
      if (!changes) return null;

      if (status === 'approved') {
        const row = await db.prepare(`SELECT * FROM ${subT} WHERE id = ?`).bind(id).first();
        if (row) {
          if (typeof onApprove === 'function') {
            await onApprove(row, { db });
          } else {
            const placeholders = cols.map(() => '?').join(', ');
            const insert = `INSERT INTO ${tgtT} (${cols.map(ident).join(', ')}, created_at, created_by)
                            VALUES (${placeholders}, ?, ?)`;
            await db.prepare(insert)
              .bind(...cols.map((c) => row[c]), decidedAt, decidedBy)
              .run();
          }
        }
      }
      return { id, status, decidedBy, decidedAt };
    },

    /**
     * Read a single submission by id.
     */
    async get(id) {
      return await db.prepare(`SELECT * FROM ${subT} WHERE id = ?`).bind(id).first();
    },
  };
}

/**
 * Defensive identifier escaping. We don't accept anything that isn't a
 * plain SQL identifier — no spaces, no quotes, no semicolons.
 *
 * @param {string} name
 */
function ident(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new TypeError(`unsafe identifier: ${name}`);
  }
  return name;
}
