import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Simple SQL migration runner.
 * Reads .sql files from a directory, tracks applied migrations in a table.
 */
export async function migrate(adapter, migrationsDir, options = {}) {
  const { tableName = '_migrations', onApply } = options;

  // Create migrations tracking table
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get applied migrations
  const { rows: applied } = await adapter.query(
    `SELECT name FROM ${tableName} ORDER BY id`
  );
  const appliedSet = new Set(applied.map(r => r.name));

  // Read migration files
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');

    await adapter.transaction(async (tx) => {
      // Split on semicolons for multi-statement migrations
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        await tx.execute(stmt);
      }

      await tx.execute(
        `INSERT INTO ${tableName} (name) VALUES (?)`,
        [file]
      );
    });

    count++;
    onApply?.(file);
  }

  return { applied: count, total: files.length };
}

/**
 * Rollback the last applied migration.
 */
export async function rollback(adapter, migrationsDir, options = {}) {
  const { tableName = '_migrations' } = options;

  const last = await adapter.queryOne(
    `SELECT name FROM ${tableName} ORDER BY id DESC LIMIT 1`
  );

  if (!last) return { rolled_back: null };

  // Look for a corresponding .down.sql file
  const downFile = last.name.replace('.sql', '.down.sql');
  const downPath = join(migrationsDir, downFile);

  try {
    const sql = readFileSync(downPath, 'utf-8');
    await adapter.transaction(async (tx) => {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await tx.execute(stmt);
      }
      await tx.execute(`DELETE FROM ${tableName} WHERE name = ?`, [last.name]);
    });
  } catch {
    // No down file — just remove the record
    await adapter.execute(`DELETE FROM ${tableName} WHERE name = ?`, [last.name]);
  }

  return { rolled_back: last.name };
}
