import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFlagManager, flagMiddleware } from './flags.js';
import { createMemoryProvider } from './providers/memory.js';

describe('createFlagManager', () => {
  it('returns default for unknown flags', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('unknown'), false);
  });

  it('returns boolean flag value', async () => {
    const provider = createMemoryProvider({
      dark_mode: { enabled: true },
      legacy_ui: { enabled: false },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('dark_mode'), true);
    assert.equal(await fm.isEnabled('legacy_ui'), false);
  });

  it('supports percentage rollout', async () => {
    const provider = createMemoryProvider({
      new_checkout: { enabled: true, percentage: 50 },
    });
    const fm = createFlagManager(provider);
    // With a known userId, result should be deterministic
    const r1 = await fm.isEnabled('new_checkout', { userId: 'user-1' });
    const r2 = await fm.isEnabled('new_checkout', { userId: 'user-1' });
    assert.equal(r1, r2); // Deterministic for same user
  });

  it('supports rule-based targeting by userId', async () => {
    const provider = createMemoryProvider({
      beta_feature: {
        enabled: false,
        rules: [{ userIds: ['alice', 'bob'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('beta_feature', { userId: 'alice' }), true);
    assert.equal(await fm.isEnabled('beta_feature', { userId: 'charlie' }), false);
  });

  it('supports rule-based targeting by role', async () => {
    const provider = createMemoryProvider({
      admin_tools: {
        enabled: false,
        rules: [{ roles: ['admin'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('admin_tools', { role: 'admin' }), true);
    assert.equal(await fm.isEnabled('admin_tools', { role: 'viewer' }), false);
  });

  it('gets all flags for a context', async () => {
    const provider = createMemoryProvider({
      feature_a: { enabled: true },
      feature_b: { enabled: false },
    });
    const fm = createFlagManager(provider);
    const all = await fm.getAll();
    assert.equal(all.feature_a, true);
    assert.equal(all.feature_b, false);
  });

  it('sets flags dynamically', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('new_flag'), false);
    await fm.setFlag('new_flag', { enabled: true });
    assert.equal(await fm.isEnabled('new_flag'), true);
  });
});

describe('memoryProvider', () => {
  it('stores and retrieves flags', async () => {
    const provider = createMemoryProvider({ test: { enabled: true } });
    const flag = await provider.getFlag('test');
    assert.deepEqual(flag, { enabled: true });
  });

  it('returns null for missing flags', async () => {
    const provider = createMemoryProvider({});
    assert.equal(await provider.getFlag('missing'), null);
  });

  it('deletes flags', async () => {
    const provider = createMemoryProvider({ test: { enabled: true } });
    await provider.deleteFlag('test');
    assert.equal(await provider.getFlag('test'), null);
  });
});

describe('flagMiddleware', () => {
  it('attaches flag manager to context', async () => {
    const provider = createMemoryProvider({ feature: { enabled: true } });
    const fm = createFlagManager(provider);
    const mw = flagMiddleware(fm);
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: {},
    };
    await mw(ctx, async () => {
      assert.ok(ctx.state.flags);
      assert.ok(ctx.state.isEnabled);
      assert.equal(await ctx.state.isEnabled('feature'), true);
    });
  });
});

// --- Additional tests ---

describe('createFlagManager – extended', () => {
  it('uses custom defaultValue when flag is absent', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider, { defaultValue: true });
    assert.equal(await fm.isEnabled('missing'), true);
  });

  it('percentage rollout is deterministic across calls for same user', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('rollout', { userId: 'stable-user' });
    const r2 = await fm.isEnabled('rollout', { userId: 'stable-user' });
    assert.equal(r1, r2);
  });

  it('percentage rollout uses sessionId when userId is absent', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    // 100% rollout — every session should be enabled
    assert.equal(await fm.isEnabled('rollout', { sessionId: 'sess-xyz' }), true);
  });

  it('percentage 0 always returns false', async () => {
    const provider = createMemoryProvider({
      never: { percentage: 0 },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('never', { userId: 'anyone' }), false);
  });

  it('percentage 100 always returns true', async () => {
    const provider = createMemoryProvider({
      always: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('always', { userId: 'anyone' }), true);
  });

  it('rule with custom condition function is evaluated', async () => {
    const provider = createMemoryProvider({
      custom_flag: {
        enabled: false,
        rules: [
          {
            condition: (ctx) => ctx.country === 'CA',
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('custom_flag', { country: 'CA' }), true);
    assert.equal(await fm.isEnabled('custom_flag', { country: 'US' }), false);
  });

  it('rule without explicit value defaults to true', async () => {
    const provider = createMemoryProvider({
      implicit_true: {
        enabled: false,
        rules: [{ userIds: ['tester'] }],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('implicit_true', { userId: 'tester' }), true);
  });

  it('getAll reflects updated flags after setFlag', async () => {
    const provider = createMemoryProvider({
      a: { enabled: true },
      b: { enabled: false },
    });
    const fm = createFlagManager(provider);
    await fm.setFlag('b', { enabled: true });
    const all = await fm.getAll();
    assert.equal(all.a, true);
    assert.equal(all.b, true);
  });

  it('setFlag is a no-op when provider does not support it', async () => {
    // Provider without setFlag
    const provider = {
      async getFlag() { return null; },
      async getAllFlags() { return {}; },
    };
    const fm = createFlagManager(provider);
    // Should not throw
    await fm.setFlag('x', { enabled: true });
  });
});

describe('memoryProvider – extended', () => {
  it('getAllFlags returns all stored flags', async () => {
    const provider = createMemoryProvider({
      f1: { enabled: true },
      f2: { enabled: false },
    });
    const all = await provider.getAllFlags();
    assert.deepEqual(Object.keys(all).sort(), ['f1', 'f2']);
  });

  it('overwrites existing flag on setFlag', async () => {
    const provider = createMemoryProvider({ f: { enabled: false } });
    await provider.setFlag('f', { enabled: true });
    const flag = await provider.getFlag('f');
    assert.equal(flag.enabled, true);
  });

  it('deleteFlag on non-existent key is a no-op', async () => {
    const provider = createMemoryProvider({});
    await provider.deleteFlag('ghost'); // should not throw
    assert.equal(await provider.getFlag('ghost'), null);
  });
});

describe('flagMiddleware – extended', () => {
  it('isEnabled uses userId from ctx.state.user', async () => {
    const provider = createMemoryProvider({
      vip: {
        enabled: false,
        rules: [{ userIds: ['vip-user'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    const mw = flagMiddleware(fm);
    const ctx = {
      state: {
        user: { id: 'vip-user', role: 'user' },
        session: {},
      },
    };
    await mw(ctx, async () => {
      assert.equal(await ctx.state.isEnabled('vip'), true);
    });
  });

  it('isEnabled uses role from ctx.state.user', async () => {
    const provider = createMemoryProvider({
      admin_panel: {
        enabled: false,
        rules: [{ roles: ['admin'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    const mw = flagMiddleware(fm);
    const ctx = {
      state: {
        user: { id: 'u1', role: 'admin' },
        session: {},
      },
    };
    await mw(ctx, async () => {
      assert.equal(await ctx.state.isEnabled('admin_panel'), true);
    });
  });
});
