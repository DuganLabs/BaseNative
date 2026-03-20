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
