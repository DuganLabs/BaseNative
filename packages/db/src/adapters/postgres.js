/**
 * PostgreSQL adapter using the 'pg' package.
 * Supports connection pooling via pg.Pool.
 */

export async function createPostgresAdapter(options = {}) {
  const { connectionString, pool: poolOptions = {}, ...pgOptions } = options;

  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('PostgreSQL adapter requires the "pg" package. Install with: npm install pg');
  }

  const pool = new pg.default.Pool({
    connectionString,
    ...poolOptions,
    ...pgOptions,
  });

  const adapter = {
    async query(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return { rows: result.rows };
    },

    async queryOne(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return result.rows[0] ?? null;
    },

    async execute(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return { changes: result.rowCount ?? 0 };
    },

    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txAdapter = createClientAdapter(client);
        const result = await fn(txAdapter);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },

    get raw() {
      return pool;
    },
  };

  return adapter;
}

function createClientAdapter(client) {
  return {
    async query(sql, params = []) {
      const result = await client.query(convertPlaceholders(sql), params);
      return { rows: result.rows };
    },
    async queryOne(sql, params = []) {
      const result = await client.query(convertPlaceholders(sql), params);
      return result.rows[0] ?? null;
    },
    async execute(sql, params = []) {
      const result = await client.query(convertPlaceholders(sql), params);
      return { changes: result.rowCount ?? 0 };
    },
    async transaction(fn) {
      return fn(createClientAdapter(client));
    },
    async close() {},
  };
}

/**
 * Convert ? placeholders to $1, $2, etc. for PostgreSQL.
 */
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
