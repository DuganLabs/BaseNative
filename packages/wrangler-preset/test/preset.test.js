import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  defaults,
  bindings,
  mergeWrangler,
  toToml,
} from '../src/index.js';

describe('defaults', () => {
  it('exposes a frozen baseline', () => {
    assert.ok(Object.isFrozen(defaults));
    assert.equal(typeof defaults.compatibility_date, 'string');
    assert.match(defaults.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(defaults.compatibility_flags));
    assert.ok(defaults.compatibility_flags.includes('nodejs_compat'));
    assert.equal(defaults.pages_build_output_dir, 'dist');
  });
});

describe('bindings', () => {
  it('builds a d1 fragment', () => {
    const frag = bindings.d1('DB', 'my-db', 'abc-123');
    assert.deepEqual(frag, {
      d1_databases: [
        { binding: 'DB', database_name: 'my-db', database_id: 'abc-123' },
      ],
    });
  });

  it('builds a kv fragment', () => {
    const frag = bindings.kv('CACHE', 'kv-id-1');
    assert.deepEqual(frag, {
      kv_namespaces: [{ binding: 'CACHE', id: 'kv-id-1' }],
    });
  });

  it('builds an r2 fragment', () => {
    const frag = bindings.r2('ASSETS', 'my-bucket');
    assert.deepEqual(frag, {
      r2_buckets: [{ binding: 'ASSETS', bucket_name: 'my-bucket' }],
    });
  });

  it('builds a do fragment without script_name', () => {
    const frag = bindings.do('ROOM', 'Room');
    assert.deepEqual(frag, {
      durable_objects: { bindings: [{ name: 'ROOM', class_name: 'Room' }] },
    });
  });

  it('builds a do fragment with script_name', () => {
    const frag = bindings.do('ROOM', 'Room', 'rooms-worker');
    assert.equal(frag.durable_objects.bindings[0].script_name, 'rooms-worker');
  });

  it('rejects empty inputs', () => {
    assert.throws(() => bindings.d1('', 'a', 'b'), TypeError);
    assert.throws(() => bindings.kv('K', ''), TypeError);
    assert.throws(() => bindings.r2('', 'b'), TypeError);
    assert.throws(() => bindings.do('R', ''), TypeError);
  });
});

describe('mergeWrangler', () => {
  it('merges scalars with later wins', () => {
    const out = mergeWrangler(
      { name: 'a', compatibility_date: '2024-01-01' },
      { compatibility_date: '2025-09-23' },
    );
    assert.equal(out.name, 'a');
    assert.equal(out.compatibility_date, '2025-09-23');
  });

  it('concatenates array-of-tables', () => {
    const out = mergeWrangler(
      { name: 'app' },
      bindings.d1('DB1', 'one', 'id1'),
      bindings.d1('DB2', 'two', 'id2'),
    );
    assert.equal(out.d1_databases.length, 2);
    assert.equal(out.d1_databases[1].binding, 'DB2');
  });

  it('merges nested durable_objects.bindings arrays', () => {
    const out = mergeWrangler(
      {},
      bindings.do('A', 'A'),
      bindings.do('B', 'B'),
    );
    assert.equal(out.durable_objects.bindings.length, 2);
  });

  it('does not mutate inputs', () => {
    const base = { name: 'x' };
    const frag = bindings.kv('K', 'id');
    mergeWrangler(base, frag);
    assert.deepEqual(base, { name: 'x' });
    assert.equal(frag.kv_namespaces.length, 1);
  });
});

describe('toToml', () => {
  it('serializes scalars at the top level', () => {
    const out = toToml({
      name: 'demo',
      compatibility_date: '2025-09-23',
      compatibility_flags: ['nodejs_compat'],
      workers_dev: true,
      send_metrics: false,
    });
    assert.match(out, /^name = "demo"/m);
    assert.match(out, /compatibility_date = "2025-09-23"/);
    assert.match(out, /compatibility_flags = \["nodejs_compat"\]/);
    assert.match(out, /workers_dev = true/);
    assert.match(out, /send_metrics = false/);
  });

  it('serializes [[d1_databases]] tables', () => {
    const out = toToml(
      mergeWrangler({ name: 'x' }, bindings.d1('DB', 'mydb', 'uuid-1')),
    );
    assert.match(out, /\[\[d1_databases\]\]/);
    assert.match(out, /binding = "DB"/);
    assert.match(out, /database_name = "mydb"/);
    assert.match(out, /database_id = "uuid-1"/);
  });

  it('serializes nested durable_objects.bindings', () => {
    const out = toToml(mergeWrangler({}, bindings.do('ROOM', 'Room')));
    assert.match(out, /\[\[durable_objects\.bindings\]\]/);
    assert.match(out, /name = "ROOM"/);
    assert.match(out, /class_name = "Room"/);
  });

  it('escapes strings safely', () => {
    const out = toToml({ name: 'a"b\\c' });
    assert.match(out, /name = "a\\"b\\\\c"/);
  });

  it('rejects non-objects', () => {
    assert.throws(() => toToml('nope'), TypeError);
  });
});

describe('end-to-end', () => {
  it('builds a full config from defaults + fragments', () => {
    const cfg = mergeWrangler(
      { name: 'my-app', main: 'src/index.js', ...defaults },
      bindings.d1('DB', 'my-app-db', 'd1-uuid'),
      bindings.kv('CACHE', 'kv-uuid'),
      bindings.r2('ASSETS', 'my-app-assets'),
      bindings.do('ROOM', 'Room'),
    );
    const toml = toToml(cfg);
    assert.match(toml, /name = "my-app"/);
    assert.match(toml, /\[\[d1_databases\]\]/);
    assert.match(toml, /\[\[kv_namespaces\]\]/);
    assert.match(toml, /\[\[r2_buckets\]\]/);
    assert.match(toml, /\[\[durable_objects\.bindings\]\]/);
  });
});
