/**
 * Lightweight query builder. Produces SQL + params arrays.
 * No ORM — just a fluent interface for building safe parameterized queries.
 */

export function select(table) {
  return new SelectBuilder(table);
}

export function insert(table) {
  return new InsertBuilder(table);
}

export function update(table) {
  return new UpdateBuilder(table);
}

export function deleteFrom(table) {
  return new DeleteBuilder(table);
}

export function raw(sql, params = []) {
  return { sql, params };
}

class SelectBuilder {
  constructor(table) {
    this._table = table;
    this._columns = ['*'];
    this._wheres = [];
    this._params = [];
    this._orderBy = [];
    this._limit = null;
    this._offset = null;
    this._joins = [];
  }

  columns(...cols) {
    this._columns = cols.flat();
    return this;
  }

  where(condition, ...params) {
    this._wheres.push(condition);
    this._params.push(...params);
    return this;
  }

  join(table, on) {
    this._joins.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table, on) {
    this._joins.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this._orderBy.push(`${column} ${direction}`);
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  offset(n) {
    this._offset = n;
    return this;
  }

  build() {
    let sql = `SELECT ${this._columns.join(', ')} FROM ${this._table}`;
    if (this._joins.length) sql += ' ' + this._joins.join(' ');
    if (this._wheres.length) sql += ' WHERE ' + this._wheres.join(' AND ');
    if (this._orderBy.length) sql += ' ORDER BY ' + this._orderBy.join(', ');
    if (this._limit !== null) sql += ` LIMIT ${this._limit}`;
    if (this._offset !== null) sql += ` OFFSET ${this._offset}`;
    return { sql, params: this._params };
  }
}

class InsertBuilder {
  constructor(table) {
    this._table = table;
    this._data = {};
    this._returning = null;
  }

  values(data) {
    this._data = data;
    return this;
  }

  returning(...cols) {
    this._returning = cols.flat();
    return this;
  }

  build() {
    const keys = Object.keys(this._data);
    const placeholders = keys.map(() => '?').join(', ');
    const params = keys.map(k => this._data[k]);
    let sql = `INSERT INTO ${this._table} (${keys.join(', ')}) VALUES (${placeholders})`;
    if (this._returning) sql += ` RETURNING ${this._returning.join(', ')}`;
    return { sql, params };
  }
}

class UpdateBuilder {
  constructor(table) {
    this._table = table;
    this._sets = {};
    this._wheres = [];
    this._params = [];
  }

  set(data) {
    Object.assign(this._sets, data);
    return this;
  }

  where(condition, ...params) {
    this._wheres.push(condition);
    this._params.push(...params);
    return this;
  }

  build() {
    const keys = Object.keys(this._sets);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const setParams = keys.map(k => this._sets[k]);
    let sql = `UPDATE ${this._table} SET ${setClause}`;
    if (this._wheres.length) sql += ' WHERE ' + this._wheres.join(' AND ');
    return { sql, params: [...setParams, ...this._params] };
  }
}

class DeleteBuilder {
  constructor(table) {
    this._table = table;
    this._wheres = [];
    this._params = [];
  }

  where(condition, ...params) {
    this._wheres.push(condition);
    this._params.push(...params);
    return this;
  }

  build() {
    let sql = `DELETE FROM ${this._table}`;
    if (this._wheres.length) sql += ' WHERE ' + this._wheres.join(' AND ');
    return { sql, params: this._params };
  }
}
