// ────────────────────────────────────────────────────────────────────────────
//   @basenative/wrangler-preset  ·  pin once, every project moves together.
//   "If your wrangler.toml looks like everyone else's, you're doing it right."
// ────────────────────────────────────────────────────────────────────────────

/**
 * Recommended baseline for any DuganLabs Worker / Pages project.
 *
 * The compatibility_date is bumped per release of this package; consumers get
 * fresh runtime semantics by upgrading @basenative/wrangler-preset alone.
 */
export const defaults = Object.freeze({
  compatibility_date: '2025-09-23',
  compatibility_flags: Object.freeze([
    'nodejs_compat',
    'global_fetch_strictly_public',
  ]),
  pages_build_output_dir: 'dist',
  // Sensible defaults for observability + dev experience.
  workers_dev: true,
  send_metrics: false,
});

/**
 * Fragment builders. Each returns a plain object that can be merged into a
 * wrangler config via `mergeWrangler`.
 */
export const bindings = Object.freeze({
  /**
   * D1 database binding fragment.
   * @param {string} name        binding name (env var on the Worker)
   * @param {string} dbName      D1 database name
   * @param {string} dbId        D1 database UUID
   */
  d1(name, dbName, dbId) {
    assertNonEmpty(name, 'd1.name');
    assertNonEmpty(dbName, 'd1.dbName');
    assertNonEmpty(dbId, 'd1.dbId');
    return {
      d1_databases: [{ binding: name, database_name: dbName, database_id: dbId }],
    };
  },

  /**
   * KV namespace binding fragment.
   * @param {string} name  binding name
   * @param {string} id    KV namespace id
   */
  kv(name, id) {
    assertNonEmpty(name, 'kv.name');
    assertNonEmpty(id, 'kv.id');
    return { kv_namespaces: [{ binding: name, id }] };
  },

  /**
   * R2 bucket binding fragment.
   * @param {string} name    binding name
   * @param {string} bucket  R2 bucket name
   */
  r2(name, bucket) {
    assertNonEmpty(name, 'r2.name');
    assertNonEmpty(bucket, 'r2.bucket');
    return { r2_buckets: [{ binding: name, bucket_name: bucket }] };
  },

  /**
   * Durable Object binding fragment.
   * @param {string} name        binding name
   * @param {string} className   DO class name
   * @param {string} [scriptName] foreign script name; omit for in-script DO
   */
  do(name, className, scriptName) {
    assertNonEmpty(name, 'do.name');
    assertNonEmpty(className, 'do.className');
    const entry = { name, class_name: className };
    if (scriptName) entry.script_name = scriptName;
    return { durable_objects: { bindings: [entry] } };
  },
});

/**
 * Merge a base config and any number of fragments into a single wrangler
 * config object. Array-valued bindings (d1_databases, kv_namespaces, etc.) are
 * concatenated; object-valued bindings (durable_objects.bindings) are merged
 * deeply by the same rule. Scalar fields from later fragments win.
 */
export function mergeWrangler(base, ...frags) {
  const out = clone(base ?? {});
  for (const frag of frags) {
    if (!frag) continue;
    for (const [key, value] of Object.entries(frag)) {
      out[key] = mergeValue(out[key], value);
    }
  }
  return out;
}

function mergeValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (isPlainObject(a) && isPlainObject(b)) {
    const merged = { ...a };
    for (const [k, v] of Object.entries(b)) merged[k] = mergeValue(merged[k], v);
    return merged;
  }
  return b === undefined ? a : b;
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clone(v) {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(clone);
  if (isPlainObject(v)) {
    const out = {};
    for (const [k, vv] of Object.entries(v)) out[k] = clone(vv);
    return out;
  }
  return v;
}

function assertNonEmpty(v, label) {
  if (typeof v !== 'string' || v.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

/**
 * Serialize a wrangler config object to TOML.
 *
 * Tiny inline implementation — supports the subset wrangler actually uses:
 *   - top-level scalars (string, number, boolean, array of scalars)
 *   - tables (plain objects)
 *   - arrays of tables (e.g. [[d1_databases]])
 *
 * Round-trips well enough for `mergeWrangler -> toToml -> wrangler` flow.
 */
export function toToml(config) {
  if (!isPlainObject(config)) {
    throw new TypeError('toToml expects a plain object');
  }
  const lines = [];
  emit(lines, config, []);
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}

function emit(lines, obj, path) {
  // Scalars first so they belong to the current table header.
  const scalarKeys = [];
  const tableKeys = [];
  const arrayOfTableKeys = [];

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length > 0 && v.every(isPlainObject)) {
      arrayOfTableKeys.push(k);
    } else if (isPlainObject(v)) {
      tableKeys.push(k);
    } else {
      scalarKeys.push(k);
    }
  }

  if (path.length > 0 && scalarKeys.length > 0) {
    lines.push(`[${path.join('.')}]`);
  }
  for (const k of scalarKeys) {
    lines.push(`${k} = ${tomlValue(obj[k])}`);
  }
  if (scalarKeys.length > 0) lines.push('');

  for (const k of tableKeys) {
    const sub = obj[k];
    const subPath = [...path, k];
    // A nested table with only nested-table children: we still want a header
    // so it's clear which path we're at, but only if there are scalars deeper.
    const hasScalar = Object.values(sub).some(
      (v) => !isPlainObject(v) && !(Array.isArray(v) && v.every(isPlainObject)),
    );
    if (hasScalar) {
      lines.push(`[${subPath.join('.')}]`);
      const sk = [];
      const tk = [];
      const ak = [];
      for (const [kk, vv] of Object.entries(sub)) {
        if (vv === undefined) continue;
        if (Array.isArray(vv) && vv.length > 0 && vv.every(isPlainObject)) ak.push(kk);
        else if (isPlainObject(vv)) tk.push(kk);
        else sk.push(kk);
      }
      for (const kk of sk) lines.push(`${kk} = ${tomlValue(sub[kk])}`);
      lines.push('');
      for (const kk of tk) emit(lines, { [kk]: sub[kk] }, subPath);
      for (const kk of ak) emitArrayOfTables(lines, sub[kk], [...subPath, kk]);
    } else {
      emit(lines, sub, subPath);
    }
  }

  for (const k of arrayOfTableKeys) {
    emitArrayOfTables(lines, obj[k], [...path, k]);
  }
}

function emitArrayOfTables(lines, arr, path) {
  for (const entry of arr) {
    lines.push(`[[${path.join('.')}]]`);
    const sk = [];
    const tk = [];
    const ak = [];
    for (const [kk, vv] of Object.entries(entry)) {
      if (vv === undefined) continue;
      if (Array.isArray(vv) && vv.length > 0 && vv.every(isPlainObject)) ak.push(kk);
      else if (isPlainObject(vv)) tk.push(kk);
      else sk.push(kk);
    }
    for (const kk of sk) lines.push(`${kk} = ${tomlValue(entry[kk])}`);
    lines.push('');
    for (const kk of tk) emit(lines, { [kk]: entry[kk] }, path);
    for (const kk of ak) emitArrayOfTables(lines, entry[kk], [...path, kk]);
  }
}

function tomlValue(v) {
  if (v === null) return '""';
  if (typeof v === 'string') return tomlString(v);
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `[${v.map(tomlValue).join(', ')}]`;
  // Inline tables — avoid; we hoist them in `emit`.
  throw new TypeError(`Cannot serialize value to TOML: ${JSON.stringify(v)}`);
}

function tomlString(s) {
  // Use double-quoted string with the small set of escapes wrangler tolerates.
  return (
    '"' +
    s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t') +
    '"'
  );
}
