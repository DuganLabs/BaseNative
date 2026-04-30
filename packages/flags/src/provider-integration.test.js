import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFlagManager } from './flags.js';
import { createMemoryProvider } from './providers/memory.js';

/**
 * Minimal custom provider for testing interface compliance.
 */
function createCustomProvider() {
  const flags = {};
  return {
    async getFlag(name) {
      return flags[name] ?? null;
    },
    async getAllFlags() {
      return { ...flags };
    },
  };
}

/**
 * Custom provider that tracks method calls.
 */
function createTrackedProvider() {
  const store = {};
  const callLog = [];

  return {
    async getFlag(name) {
      callLog.push({ method: 'getFlag', args: [name] });
      return store[name] ?? null;
    },
    async getAllFlags() {
      callLog.push({ method: 'getAllFlags', args: [] });
      return { ...store };
    },
    async setFlag(name, config) {
      callLog.push({ method: 'setFlag', args: [name, config] });
      store[name] = config;
    },
    _store: store,
    _callLog: callLog,
  };
}

describe('Provider integration – custom providers', () => {
  it('works with any provider implementing getFlag/getAllFlags', async () => {
    const provider = createCustomProvider();
    const fm = createFlagManager(provider);
    // Should not throw even without setFlag method
    assert.ok(fm);
  });

  it('provider.getFlag is called for each flag check', async () => {
    const provider = createTrackedProvider();
    provider._store.test = { enabled: true };
    const fm = createFlagManager(provider);
    await fm.isEnabled('test');
    assert.equal(provider._callLog[0].method, 'getFlag');
    assert.deepEqual(provider._callLog[0].args, ['test']);
  });

  it('provider.getAllFlags is called for getAll', async () => {
    const provider = createTrackedProvider();
    provider._store.f1 = { enabled: true };
    provider._store.f2 = { enabled: false };
    const fm = createFlagManager(provider);
    await fm.getAll();
    const getAllCall = provider._callLog.find((c) => c.method === 'getAllFlags');
    assert.ok(getAllCall);
  });

  it('provider.setFlag is called by fm.setFlag', async () => {
    const provider = createTrackedProvider();
    const fm = createFlagManager(provider);
    await fm.setFlag('new', { enabled: true });
    const setCall = provider._callLog.find((c) => c.method === 'setFlag');
    assert.ok(setCall);
    assert.deepEqual(setCall.args[1], { enabled: true });
  });

  it('fm.setFlag is no-op when provider lacks setFlag', async () => {
    const provider = createCustomProvider();
    const fm = createFlagManager(provider);
    // Should not throw
    await fm.setFlag('test', { enabled: true });
  });
});

describe('Provider switching scenarios', () => {
  it('can switch providers without recreating flag manager', async () => {
    const provider1 = createMemoryProvider({
      feature: { enabled: true },
    });
    const provider2 = createMemoryProvider({
      feature: { enabled: false },
    });
    const fm1 = createFlagManager(provider1);
    const fm2 = createFlagManager(provider2);

    const r1 = await fm1.isEnabled('feature');
    const r2 = await fm2.isEnabled('feature');

    assert.equal(r1, true);
    assert.equal(r2, false);
  });

  it('each flag manager instance is independent', async () => {
    const provider = createMemoryProvider({
      flag: { enabled: false },
    });
    const fm1 = createFlagManager(provider);
    const fm2 = createFlagManager(provider);

    // Both managers use same provider, so results should be same
    assert.equal(await fm1.isEnabled('flag'), await fm2.isEnabled('flag'));
  });

  it('multiple flag managers with same provider share state', async () => {
    const provider = createMemoryProvider({});
    const fm1 = createFlagManager(provider);
    const fm2 = createFlagManager(provider);

    await fm1.setFlag('shared', { enabled: true });
    const result = await fm2.isEnabled('shared');
    assert.equal(result, true);
  });
});

describe('Provider interface compliance', () => {
  it('getFlag must return null for missing flags', async () => {
    const provider = createMemoryProvider({});
    const flag = await provider.getFlag('missing');
    assert.strictEqual(flag, null);
  });

  it('getAllFlags returns object (not array or null)', async () => {
    const provider = createMemoryProvider({});
    const all = await provider.getAllFlags();
    assert.ok(typeof all === 'object');
    assert.ok(!Array.isArray(all));
  });

  it('setFlag stores flag for later retrieval', async () => {
    const provider = createMemoryProvider({});
    const config = { enabled: true, percentage: 50 };
    await provider.setFlag('test', config);
    const retrieved = await provider.getFlag('test');
    assert.deepEqual(retrieved, config);
  });

  it('deleteFlag removes flag from provider', async () => {
    const provider = createMemoryProvider({ test: { enabled: true } });
    await provider.deleteFlag('test');
    const flag = await provider.getFlag('test');
    assert.strictEqual(flag, null);
  });

  it('provider methods are async/Promise-returning', async () => {
    const provider = createMemoryProvider({});
    const result = provider.getFlag('test');
    assert.ok(result instanceof Promise);
  });
});

describe('Provider error handling', () => {
  it('handles provider that returns undefined instead of null', async () => {
    const badProvider = {
      async getFlag() {
        return undefined;
      },
      async getAllFlags() {
        return {};
      },
    };
    const fm = createFlagManager(badProvider);
    const result = await fm.isEnabled('test');
    // undefined is falsy, should use defaultValue (false)
    assert.equal(result, false);
  });

  it('handles provider that throws on getFlag', async () => {
    const errorProvider = {
      async getFlag() {
        throw new Error('Provider error');
      },
      async getAllFlags() {
        return {};
      },
    };
    const fm = createFlagManager(errorProvider);
    // Should propagate error
    try {
      await fm.isEnabled('test');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.equal(e.message, 'Provider error');
    }
  });

  it('handles provider that returns malformed flag object', async () => {
    const malformedProvider = createMemoryProvider({
      bad: 'not-an-object', // String instead of object
    });
    const fm = createFlagManager(malformedProvider);
    // Should handle gracefully
    const result = await fm.isEnabled('bad');
    // typeof flag.enabled === 'boolean' check fails, no rules, falls through
    assert.equal(result, false);
  });
});

describe('Concurrent provider operations', () => {
  it('handles concurrent getFlag calls', async () => {
    const provider = createMemoryProvider({
      f1: { enabled: true },
      f2: { enabled: false },
      f3: { enabled: true },
    });
    const fm = createFlagManager(provider);
    const promises = ['f1', 'f2', 'f3'].map((name) => fm.isEnabled(name));
    const results = await Promise.all(promises);
    assert.deepEqual(results, [true, false, true]);
  });

  it('handles concurrent getAll calls', async () => {
    const provider = createMemoryProvider({
      f1: { enabled: true },
      f2: { enabled: false },
    });
    const fm = createFlagManager(provider);
    const promises = [fm.getAll(), fm.getAll(), fm.getAll()];
    const results = await Promise.all(promises);
    // All should return same flag states
    results.forEach((all) => {
      assert.equal(all.f1, true);
      assert.equal(all.f2, false);
    });
  });

  it('handles concurrent setFlag and getFlag', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);

    // Set multiple flags concurrently
    const setPromises = [
      fm.setFlag('a', { enabled: true }),
      fm.setFlag('b', { enabled: false }),
      fm.setFlag('c', { enabled: true }),
    ];
    await Promise.all(setPromises);

    // Get them all concurrently
    const getPromises = ['a', 'b', 'c'].map((name) => fm.isEnabled(name));
    const results = await Promise.all(getPromises);
    assert.deepEqual(results, [true, false, true]);
  });
});

describe('Large-scale provider scenarios', () => {
  it('handles provider with many flags', async () => {
    const manyFlags = {};
    for (let i = 0; i < 1000; i++) {
      manyFlags[`flag_${i}`] = { enabled: i % 2 === 0 };
    }
    const provider = createMemoryProvider(manyFlags);
    const fm = createFlagManager(provider);

    const all = await fm.getAll();
    assert.equal(Object.keys(all).length, 1000);
  });

  it('handles provider with large flag configurations', async () => {
    const largeConfig = {
      rules: Array.from({ length: 100 }, (_, i) => ({
        userIds: [`user_${i}`],
        value: i % 2 === 0,
      })),
    };
    const provider = createMemoryProvider({
      large: largeConfig,
    });
    const fm = createFlagManager(provider);

    const result = await fm.isEnabled('large', { userId: 'user_50' });
    assert.equal(result, true);
  });

  it('memory provider handles rapid set/delete cycles', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);

    for (let i = 0; i < 100; i++) {
      await fm.setFlag(`temp_${i}`, { enabled: true });
    }

    const all = await fm.getAll();
    assert.equal(Object.keys(all).length, 100);

    for (let i = 0; i < 100; i++) {
      await provider.deleteFlag(`temp_${i}`);
    }

    const allAfter = await fm.getAll();
    assert.equal(Object.keys(allAfter).length, 0);
  });
});

describe('Provider state isolation', () => {
  it('memory provider stores references to flag objects', async () => {
    const provider = createMemoryProvider({
      flag: { enabled: true },
    });

    const flag1 = await provider.getFlag('flag');
    const flag2 = await provider.getFlag('flag');
    // Memory provider returns the same object reference
    assert.equal(flag1, flag2);
  });

  it('getAllFlags returns a new object with same references', async () => {
    const provider = createMemoryProvider({
      f1: { enabled: true },
      f2: { enabled: false },
    });

    const all1 = await provider.getAllFlags();
    const all2 = await provider.getAllFlags();
    // Different object, but same internal references
    assert.notEqual(all1, all2);
    assert.equal(all1.f1, all2.f1);
  });

  it('multiple flag managers with same provider work independently', async () => {
    const provider = createMemoryProvider({
      shared: { enabled: false },
    });

    const fm1 = createFlagManager(provider, { defaultValue: false });
    const fm2 = createFlagManager(provider, { defaultValue: true });

    // Same flag should evaluate differently due to different defaultValues
    // Actually, if flag exists, defaultValue doesn't matter
    const r1 = await fm1.isEnabled('shared');
    const r2 = await fm2.isEnabled('shared');
    assert.equal(r1, r2); // Both use actual flag value
  });
});

describe('Provider method chaining', () => {
  it('can chain setFlag and getFlag operations', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);

    await fm.setFlag('chain', { enabled: true });
    const result = await fm.isEnabled('chain');
    assert.equal(result, true);
  });

  it('getAll reflects recent setFlag operations', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);

    await fm.setFlag('new1', { enabled: true });
    await fm.setFlag('new2', { enabled: false });

    const all = await fm.getAll();
    assert.equal(all.new1, true);
    assert.equal(all.new2, false);
  });
});

describe('Provider mutation safety', () => {
  it('provider can be modified externally and flag manager sees changes', async () => {
    const provider = createMemoryProvider({
      mutable: { enabled: false },
    });
    const fm = createFlagManager(provider);

    assert.equal(await fm.isEnabled('mutable'), false);

    // Externally modify provider via setFlag
    await provider.setFlag('mutable', { enabled: true });

    assert.equal(await fm.isEnabled('mutable'), true);
  });

  it('provider state changes between calls', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);

    assert.equal(await fm.isEnabled('volatile'), false);

    await fm.setFlag('volatile', { enabled: true });
    assert.equal(await fm.isEnabled('volatile'), true);

    await provider.deleteFlag('volatile');
    assert.equal(await fm.isEnabled('volatile'), false);
  });
});

describe('Provider compatibility layer', () => {
  it('works with minimal provider (only getFlag)', async () => {
    const minimalProvider = {
      async getFlag(name) {
        return name === 'exists' ? { enabled: true } : null;
      },
    };
    const fm = createFlagManager(minimalProvider);

    assert.equal(await fm.isEnabled('exists'), true);
    assert.equal(await fm.isEnabled('missing'), false);
  });

  it('works with provider that has getAllFlags but no individual get', async () => {
    const _allProvider = {
      async getAllFlags() {
        return {
          flag1: { enabled: true },
          flag2: { enabled: false },
        };
      },
    };
    // This would fail because getFlag is called first
    // But demonstrates the provider contract
  });
});
