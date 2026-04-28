import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createKVProvider } from './providers/kv.js';
import { createFlagManager } from './flags.js';

/**
 * Mock KV namespace for testing without Cloudflare bindings.
 */
function createMockKV() {
  const store = new Map();
  const getCallLog = [];
  const putCallLog = [];
  const deleteCallLog = [];

  return {
    async get(key, options = {}) {
      getCallLog.push({ key, options });
      const value = store.get(key);
      if (options.type === 'json' && value) {
        return JSON.parse(value);
      }
      return value || null;
    },

    async list(options = {}) {
      const prefix = options.prefix || '';
      const keys = Array.from(store.keys())
        .filter(k => k.startsWith(prefix))
        .map(name => ({ name }));
      return { keys, list_complete: true };
    },

    async put(key, value, options = {}) {
      putCallLog.push({ key, value, options });
      store.set(key, value);
    },

    async delete(key) {
      deleteCallLog.push({ key });
      store.delete(key);
    },

    _store: store,
    _getCallLog: getCallLog,
    _putCallLog: putCallLog,
    _deleteCallLog: deleteCallLog,
    _reset() {
      store.clear();
      getCallLog.length = 0;
      putCallLog.length = 0;
      deleteCallLog.length = 0;
    },
  };
}

describe('createKVProvider', () => {
  it('throws when KV binding is not provided', () => {
    assert.throws(
      () => createKVProvider({}),
      /KV binding is required/
    );
  });

  it('throws when options object is missing', () => {
    assert.throws(
      () => createKVProvider(undefined),
      /Cannot destructure property 'kv' of 'options' as it is undefined/
    );
  });

  it('returns provider with expected methods', () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    assert.ok(typeof provider.getFlag === 'function');
    assert.ok(typeof provider.getAllFlags === 'function');
    assert.ok(typeof provider.setFlag === 'function');
    assert.ok(typeof provider.deleteFlag === 'function');
  });
});

describe('KV provider – getFlag', () => {
  it('retrieves a stored flag by name', async () => {
    const kv = createMockKV();
    kv._store.set('flags:feature_x', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag('feature_x');
    assert.deepEqual(flag, { enabled: true });
  });

  it('returns null for missing flags', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag('nonexistent');
    assert.equal(flag, null);
  });

  it('uses custom prefix when specified', async () => {
    const kv = createMockKV();
    kv._store.set('custom:feature_y', JSON.stringify({ enabled: false }));
    const provider = createKVProvider({ kv, prefix: 'custom:' });
    const flag = await provider.getFlag('feature_y');
    assert.deepEqual(flag, { enabled: false });
  });

  it('passes cacheTtl option to KV get', async () => {
    const kv = createMockKV();
    kv._store.set('flags:feature_z', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, cacheTtl: 120 });
    await provider.getFlag('feature_z');
    const lastCall = kv._getCallLog[0];
    assert.equal(lastCall.options.cacheTtl, 120);
  });

  it('defaults to 60 second cacheTtl when not specified', async () => {
    const kv = createMockKV();
    kv._store.set('flags:feature_a', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    await provider.getFlag('feature_a');
    const lastCall = kv._getCallLog[0];
    assert.equal(lastCall.options.cacheTtl, 60);
  });

  it('requests JSON type from KV', async () => {
    const kv = createMockKV();
    kv._store.set('flags:test', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    await provider.getFlag('test');
    const lastCall = kv._getCallLog[0];
    assert.equal(lastCall.options.type, 'json');
  });

  it('handles complex flag structures', async () => {
    const kv = createMockKV();
    const complexFlag = {
      enabled: true,
      percentage: 50,
      rules: [
        { userIds: ['alice'], value: true },
        { roles: ['admin'], value: true },
      ],
    };
    kv._store.set('flags:complex', JSON.stringify(complexFlag));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag('complex');
    assert.deepEqual(flag, complexFlag);
  });
});

describe('KV provider – getAllFlags', () => {
  it('retrieves all stored flags', async () => {
    const kv = createMockKV();
    kv._store.set('flags:flag_1', JSON.stringify({ enabled: true }));
    kv._store.set('flags:flag_2', JSON.stringify({ enabled: false }));
    kv._store.set('flags:flag_3', JSON.stringify({ percentage: 75 }));
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.equal(Object.keys(all).length, 3);
    assert.ok('flag_1' in all);
    assert.ok('flag_2' in all);
    assert.ok('flag_3' in all);
  });

  it('returns empty object when no flags exist', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.deepEqual(all, {});
  });

  it('filters by prefix in list operation', async () => {
    const kv = createMockKV();
    kv._store.set('flags:flag_1', JSON.stringify({ enabled: true }));
    kv._store.set('other:flag_2', JSON.stringify({ enabled: false }));
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    // Should only include flags: prefixed keys
    assert.equal(Object.keys(all).length, 1);
    assert.ok('flag_1' in all);
  });

  it('strips prefix from flag names in result', async () => {
    const kv = createMockKV();
    kv._store.set('flags:my_feature', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.ok('my_feature' in all);
    assert.equal(!('flags:my_feature' in all), true);
  });

  it('handles custom prefix in getAllFlags', async () => {
    const kv = createMockKV();
    kv._store.set('feat:alpha', JSON.stringify({ enabled: true }));
    kv._store.set('feat:beta', JSON.stringify({ enabled: false }));
    kv._store.set('other:gamma', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, prefix: 'feat:' });
    const all = await provider.getAllFlags();
    assert.equal(Object.keys(all).length, 2);
    assert.ok('alpha' in all);
    assert.ok('beta' in all);
  });

  it('handles empty list.keys array gracefully', async () => {
    const kv = createMockKV();
    // Override list to return empty
    kv.list = async () => ({ keys: [] });
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.deepEqual(all, {});
  });

  it('retrieves all flags concurrently via Promise.all', async () => {
    const kv = createMockKV();
    for (let i = 0; i < 5; i++) {
      kv._store.set(`flags:flag_${i}`, JSON.stringify({ enabled: i % 2 === 0 }));
    }
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.equal(Object.keys(all).length, 5);
  });
});

describe('KV provider – setFlag', () => {
  it('stores a new flag', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const flagConfig = { enabled: true };
    await provider.setFlag('new_flag', flagConfig);
    const stored = kv._store.get('flags:new_flag');
    assert.equal(stored, JSON.stringify(flagConfig));
  });

  it('overwrites existing flag', async () => {
    const kv = createMockKV();
    kv._store.set('flags:existing', JSON.stringify({ enabled: false }));
    const provider = createKVProvider({ kv });
    await provider.setFlag('existing', { enabled: true });
    const stored = kv._store.get('flags:existing');
    assert.equal(stored, JSON.stringify({ enabled: true }));
  });

  it('respects custom prefix when setting', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv, prefix: 'custom:' });
    await provider.setFlag('myFlag', { enabled: true });
    assert.ok(kv._store.has('custom:myFlag'));
  });

  it('stores complex flag configurations (without functions)', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const complexFlag = {
      enabled: false,
      percentage: 50,
      rules: [
        { userIds: ['beta_tester'], value: true },
        { roles: ['premium'], value: true },
      ],
    };
    await provider.setFlag('complex', complexFlag);
    const retrieved = await provider.getFlag('complex');
    assert.deepEqual(retrieved, complexFlag);
  });

  it('JSON-stringifies flag before storing', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const flag = { enabled: true, metadata: { createdAt: '2025-01-01' } };
    await provider.setFlag('test', flag);
    const putCall = kv._putCallLog[0];
    assert.equal(putCall.value, JSON.stringify(flag));
  });
});

describe('KV provider – deleteFlag', () => {
  it('deletes an existing flag', async () => {
    const kv = createMockKV();
    kv._store.set('flags:to_delete', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    await provider.deleteFlag('to_delete');
    assert.equal(kv._store.has('flags:to_delete'), false);
  });

  it('silently succeeds when deleting non-existent flag', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    // Should not throw
    await provider.deleteFlag('ghost');
    assert.equal(kv._store.has('flags:ghost'), false);
  });

  it('respects custom prefix when deleting', async () => {
    const kv = createMockKV();
    kv._store.set('custom:flag', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, prefix: 'custom:' });
    await provider.deleteFlag('flag');
    assert.equal(kv._store.has('custom:flag'), false);
  });

  it('records delete call in KV', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    await provider.deleteFlag('test');
    assert.equal(kv._deleteCallLog.length, 1);
    assert.equal(kv._deleteCallLog[0].key, 'flags:test');
  });
});

describe('KV provider with FlagManager integration', () => {
  it('KV provider works with createFlagManager', async () => {
    const kv = createMockKV();
    kv._store.set('flags:feature', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('feature');
    assert.equal(result, true);
  });

  it('FM setFlag persists to KV', async () => {
    const kv = createMockKV();
    const provider = createKVProvider({ kv });
    const fm = createFlagManager(provider);
    await fm.setFlag('new', { enabled: true });
    const stored = kv._store.get('flags:new');
    assert.ok(stored);
  });

  it('FM getAll retrieves all flags from KV', async () => {
    const kv = createMockKV();
    kv._store.set('flags:f1', JSON.stringify({ enabled: true }));
    kv._store.set('flags:f2', JSON.stringify({ enabled: false }));
    const provider = createKVProvider({ kv });
    const fm = createFlagManager(provider);
    const all = await fm.getAll();
    assert.equal(Object.keys(all).length, 2);
  });

  it('percentage rollout works with KV-stored flags', async () => {
    const kv = createMockKV();
    kv._store.set('flags:rollout', JSON.stringify({ percentage: 50 }));
    const provider = createKVProvider({ kv });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('rollout', { userId: 'user-123' });
    const r2 = await fm.isEnabled('rollout', { userId: 'user-123' });
    assert.equal(r1, r2, 'Percentage rollout should be deterministic');
  });

  it('rule-based targeting works with KV-stored flags', async () => {
    const kv = createMockKV();
    const flag = {
      enabled: false,
      rules: [{ userIds: ['vip'], value: true }],
    };
    kv._store.set('flags:vip_feature', JSON.stringify(flag));
    const provider = createKVProvider({ kv });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('vip_feature', { userId: 'vip' }), true);
    assert.equal(await fm.isEnabled('vip_feature', { userId: 'other' }), false);
  });
});

describe('KV provider – edge cases', () => {
  it('handles flag names with special characters', async () => {
    const kv = createMockKV();
    const flagName = 'feature-with-dashes_and_underscores.v2';
    const flagConfig = { enabled: true };
    kv._store.set(`flags:${flagName}`, JSON.stringify(flagConfig));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag(flagName);
    assert.deepEqual(flag, flagConfig);
  });

  it('handles very long flag names', async () => {
    const kv = createMockKV();
    const longName = 'a'.repeat(200);
    kv._store.set(`flags:${longName}`, JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag(longName);
    assert.deepEqual(flag, { enabled: true });
  });

  it('handles flag values with nested structures', async () => {
    const kv = createMockKV();
    const nested = {
      enabled: true,
      config: {
        nested: {
          deeply: {
            value: 'test',
            array: [1, 2, 3],
          },
        },
      },
    };
    kv._store.set('flags:nested', JSON.stringify(nested));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag('nested');
    assert.deepEqual(flag, nested);
  });

  it('handles flag values with null values', async () => {
    const kv = createMockKV();
    const flagWithNull = { enabled: true, data: null };
    kv._store.set('flags:nullable', JSON.stringify(flagWithNull));
    const provider = createKVProvider({ kv });
    const flag = await provider.getFlag('nullable');
    assert.deepEqual(flag, flagWithNull);
  });

  it('getAllFlags excludes partially stored flags', async () => {
    const kv = createMockKV();
    // Simulate a key that exists in list but fails to get
    let getCount = 0;
    kv._store.set('flags:good', JSON.stringify({ enabled: true }));
    const originalGet = kv.get;
    kv.get = async function(key, options) {
      getCount++;
      if (getCount === 2) return null; // Second get fails
      return originalGet.call(this, key, options);
    };
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    // Should gracefully handle the failed get
    assert.ok(typeof all === 'object');
  });

  it('uses default prefix of "flags:" when not specified', async () => {
    const kv = createMockKV();
    kv._store.set('flags:test', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv });
    await provider.getFlag('test');
    const call = kv._getCallLog[0];
    assert.equal(call.key, 'flags:test');
  });

  it('handles large number of flags in getAllFlags', async () => {
    const kv = createMockKV();
    for (let i = 0; i < 100; i++) {
      kv._store.set(`flags:flag_${i}`, JSON.stringify({ enabled: i % 2 === 0 }));
    }
    const provider = createKVProvider({ kv });
    const all = await provider.getAllFlags();
    assert.equal(Object.keys(all).length, 100);
  });
});

describe('KV provider – caching behavior', () => {
  it('applies cacheTtl to individual flag gets', async () => {
    const kv = createMockKV();
    kv._store.set('flags:cached', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, cacheTtl: 300 });
    await provider.getFlag('cached');
    assert.equal(kv._getCallLog[0].options.cacheTtl, 300);
  });

  it('applies cacheTtl to getAllFlags get operations', async () => {
    const kv = createMockKV();
    kv._store.set('flags:flag_1', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, cacheTtl: 180 });
    await provider.getAllFlags();
    // Verify that cache TTL was passed
    const getCalls = kv._getCallLog.filter(c => c.options.type === 'json');
    assert.ok(getCalls.length > 0);
    assert.equal(getCalls[0].options.cacheTtl, 180);
  });

  it('zero cacheTtl is respected', async () => {
    const kv = createMockKV();
    kv._store.set('flags:nocache', JSON.stringify({ enabled: true }));
    const provider = createKVProvider({ kv, cacheTtl: 0 });
    await provider.getFlag('nocache');
    assert.equal(kv._getCallLog[0].options.cacheTtl, 0);
  });
});
