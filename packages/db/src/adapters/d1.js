/**
 * Cloudflare D1 adapter.
 * Wraps the D1 binding available in Workers/Pages environments.
 *
 * @param {object} d1 - The D1 database binding from env
 */
export function createD1Adapter(d1) {
  if (!d1 || typeof d1.prepare !== 'function') {
    throw new Error('Invalid D1 binding. Pass the D1 database from your Worker env.');
  }

  const adapter = {
    async query(sql, params = []) {
      const stmt = d1.prepare(sql).bind(...params);
      const result = await stmt.all();
      return { rows: result.results ?? [] };
    },

    async queryOne(sql, params = []) {
      const stmt = d1.prepare(sql).bind(...params);
      return await stmt.first() ?? null;
    },

    async execute(sql, params = []) {
      const stmt = d1.prepare(sql).bind(...params);
      const result = await stmt.run();
      return {
        changes: result.meta?.changes ?? 0,
        lastInsertId: result.meta?.last_row_id,
      };
    },

    async transaction(fn) {
      // D1 supports batch transactions
      return await fn(adapter);
    },

    async close() {
      // D1 bindings don't need explicit closing
    },

    get raw() {
      return d1;
    },
  };

  return adapter;
}
