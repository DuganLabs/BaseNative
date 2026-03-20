/**
 * Database adapter interface.
 * All adapters must implement these methods.
 *
 * @typedef {object} DatabaseAdapter
 * @property {(sql: string, params?: unknown[]) => Promise<{ rows: object[], changes?: number, lastInsertId?: number }>} query
 * @property {(sql: string, params?: unknown[]) => Promise<object|null>} queryOne
 * @property {(sql: string, params?: unknown[]) => Promise<{ changes: number, lastInsertId?: number }>} execute
 * @property {(fn: (adapter: DatabaseAdapter) => Promise<unknown>) => Promise<unknown>} transaction
 * @property {() => Promise<void>} close
 */

/**
 * Validate that an object implements the DatabaseAdapter interface.
 */
export function validateAdapter(adapter) {
  const required = ['query', 'queryOne', 'execute', 'transaction', 'close'];
  for (const method of required) {
    if (typeof adapter[method] !== 'function') {
      throw new Error(`Database adapter missing required method: ${method}`);
    }
  }
  return adapter;
}
