export interface QueryResult {
  rows: Record<string, unknown>[];
  changes?: number;
  lastInsertId?: number;
}

export interface ExecuteResult {
  changes: number;
  lastInsertId?: number;
}

export interface DatabaseAdapter {
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  queryOne(sql: string, params?: unknown[]): Promise<Record<string, unknown> | null>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  readonly raw: unknown;
}

export interface SelectQuery {
  sql: string;
  params: unknown[];
}

export interface SelectBuilder {
  columns(...cols: string[]): SelectBuilder;
  where(condition: string, ...params: unknown[]): SelectBuilder;
  join(table: string, on: string): SelectBuilder;
  leftJoin(table: string, on: string): SelectBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): SelectBuilder;
  limit(n: number): SelectBuilder;
  offset(n: number): SelectBuilder;
  build(): SelectQuery;
}

export interface InsertBuilder {
  values(data: Record<string, unknown>): InsertBuilder;
  returning(...cols: string[]): InsertBuilder;
  build(): SelectQuery;
}

export interface UpdateBuilder {
  set(data: Record<string, unknown>): UpdateBuilder;
  where(condition: string, ...params: unknown[]): UpdateBuilder;
  build(): SelectQuery;
}

export interface DeleteBuilder {
  where(condition: string, ...params: unknown[]): DeleteBuilder;
  build(): SelectQuery;
}

export function select(table: string): SelectBuilder;
export function insert(table: string): InsertBuilder;
export function update(table: string): UpdateBuilder;
export function deleteFrom(table: string): DeleteBuilder;
export function raw(sql: string, params?: unknown[]): SelectQuery;
export function validateAdapter(adapter: unknown): DatabaseAdapter;

export interface MigrateOptions {
  tableName?: string;
  onApply?: (filename: string) => void;
}

export interface MigrateResult {
  applied: number;
  total: number;
}

export function migrate(adapter: DatabaseAdapter, migrationsDir: string, options?: MigrateOptions): Promise<MigrateResult>;
export function rollback(adapter: DatabaseAdapter, migrationsDir: string, options?: MigrateOptions): Promise<{ rolled_back: string | null }>;

export function createSqliteAdapter(options?: { filename?: string; readonly?: boolean }): Promise<DatabaseAdapter>;
export function createPostgresAdapter(options?: { connectionString?: string; pool?: Record<string, unknown> }): Promise<DatabaseAdapter>;
export function createD1Adapter(d1: unknown): DatabaseAdapter;
