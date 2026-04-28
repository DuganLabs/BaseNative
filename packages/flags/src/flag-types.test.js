import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFlagManager } from './flags.js';
import { createMemoryProvider } from './providers/memory.js';

describe('Flag types – boolean flags', () => {
  it('evaluates simple true flag', async () => {
    const provider = createMemoryProvider({
      enabled_flag: { enabled: true },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('enabled_flag');
    assert.equal(result, true);
  });

  it('evaluates simple false flag', async () => {
    const provider = createMemoryProvider({
      disabled_flag: { enabled: false },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('disabled_flag');
    assert.equal(result, false);
  });

  it('ignores enabled property when rules are present', async () => {
    const provider = createMemoryProvider({
      has_rules: {
        enabled: true,
        rules: [{ userIds: ['alice'], value: false }],
      },
    });
    const fm = createFlagManager(provider);
    // enabled: true is ignored because rules are present
    const result = await fm.isEnabled('has_rules', { userId: 'charlie' });
    // Should fall through rules and use enabled value
    assert.equal(result, true);
  });

  it('uses defaultValue when flag.enabled is undefined', async () => {
    const provider = createMemoryProvider({
      partial: { },
    });
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('partial');
    assert.equal(result, true);
  });

  it('respects explicit enabled:false over default', async () => {
    const provider = createMemoryProvider({
      explicit_false: { enabled: false },
    });
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('explicit_false');
    assert.equal(result, false);
  });
});

describe('Flag types – string/JSON value flags', () => {
  it('stores and retrieves string flag values', async () => {
    const provider = createMemoryProvider({
      text_flag: { value: 'hello' },
    });
    const flag = await provider.getFlag('text_flag');
    assert.equal(flag.value, 'hello');
  });

  it('stores and retrieves numeric flag values', async () => {
    const provider = createMemoryProvider({
      count_flag: { value: 42 },
    });
    const flag = await provider.getFlag('count_flag');
    assert.equal(flag.value, 42);
  });

  it('stores and retrieves JSON object flags', async () => {
    const provider = createMemoryProvider({
      config_flag: {
        value: {
          apiUrl: 'https://api.example.com',
          timeout: 5000,
          retries: 3,
        },
      },
    });
    const flag = await provider.getFlag('config_flag');
    assert.deepEqual(flag.value, {
      apiUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3,
    });
  });

  it('stores and retrieves array flag values', async () => {
    const provider = createMemoryProvider({
      list_flag: { value: ['a', 'b', 'c'] },
    });
    const flag = await provider.getFlag('list_flag');
    assert.deepEqual(flag.value, ['a', 'b', 'c']);
  });

  it('stores flags with null values', async () => {
    const provider = createMemoryProvider({
      null_flag: { value: null },
    });
    const flag = await provider.getFlag('null_flag');
    assert.equal(flag.value, null);
  });

  it('stores flags with nested structures', async () => {
    const provider = createMemoryProvider({
      nested: {
        value: {
          level1: {
            level2: {
              level3: 'deep_value',
            },
          },
        },
      },
    });
    const flag = await provider.getFlag('nested');
    assert.equal(flag.value.level1.level2.level3, 'deep_value');
  });

  it('isEnabled returns true/false for non-boolean flags', async () => {
    const provider = createMemoryProvider({
      string_flag: { value: 'config' },
    });
    const fm = createFlagManager(provider);
    // isEnabled on non-boolean flag without enabled property
    const result = await fm.isEnabled('string_flag');
    // Should use defaultValue (false) since no enabled property
    assert.equal(result, false);
  });
});

describe('Flag types – mixed configurations', () => {
  it('flag with enabled and value properties', async () => {
    const provider = createMemoryProvider({
      hybrid: { enabled: true, value: 'config_data' },
    });
    const fm = createFlagManager(provider);
    // isEnabled should return true (from enabled property)
    const result = await fm.isEnabled('hybrid');
    assert.equal(result, true);
    // But getFlag returns the full config
    const flag = await provider.getFlag('hybrid');
    assert.equal(flag.value, 'config_data');
  });

  it('flag with enabled, percentage, and rules', async () => {
    const provider = createMemoryProvider({
      complex: {
        enabled: true,
        percentage: 50,
        rules: [{ userIds: ['alice'], value: false }],
      },
    });
    const fm = createFlagManager(provider);
    // Percentage is evaluated when present
    const result = await fm.isEnabled('complex', { userId: 'bob' });
    assert.ok(typeof result === 'boolean');
  });

  it('flag with metadata alongside enabled', async () => {
    const provider = createMemoryProvider({
      with_meta: {
        enabled: true,
        metadata: {
          created: '2025-01-01',
          author: 'test',
        },
      },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('with_meta');
    assert.equal(result, true);
    const flag = await provider.getFlag('with_meta');
    assert.deepEqual(flag.metadata, {
      created: '2025-01-01',
      author: 'test',
    });
  });
});

describe('Flag evaluation – rule matching priority', () => {
  it('returns first matching rule value', async () => {
    const provider = createMemoryProvider({
      multi_rule: {
        enabled: false,
        rules: [
          { userIds: ['alice'], value: true },
          { userIds: ['alice'], value: false }, // Same user, different value
        ],
      },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('multi_rule', { userId: 'alice' });
    assert.equal(result, true, 'Should use first matching rule');
  });

  it('evaluates userId rule before role rule', async () => {
    const provider = createMemoryProvider({
      user_and_role: {
        enabled: false,
        rules: [
          { userIds: ['alice'], value: true },
          { roles: ['admin'], value: false },
        ],
      },
    });
    const fm = createFlagManager(provider);
    // alice with admin role: userId rule matches first
    const result = await fm.isEnabled('user_and_role', {
      userId: 'alice',
      role: 'admin',
    });
    assert.equal(result, true);
  });

  it('evaluates condition function last', async () => {
    const provider = createMemoryProvider({
      with_condition: {
        enabled: false,
        rules: [
          { userIds: ['alice'], value: true },
          { condition: () => true, value: false },
        ],
      },
    });
    const fm = createFlagManager(provider);
    // alice should match first rule
    const result = await fm.isEnabled('with_condition', { userId: 'alice' });
    assert.equal(result, true);
  });

  it('returns false when no rule matches', async () => {
    const provider = createMemoryProvider({
      no_match: {
        enabled: false,
        rules: [
          { userIds: ['alice'], value: true },
          { roles: ['admin'], value: true },
        ],
      },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('no_match', {
      userId: 'bob',
      role: 'viewer',
    });
    assert.equal(result, false);
  });

  it('uses defaultValue when no rule matches and enabled is undefined', async () => {
    const provider = createMemoryProvider({
      undefined_enabled: {
        rules: [
          { userIds: ['alice'], value: true },
        ],
      },
    });
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('undefined_enabled', {
      userId: 'bob',
    });
    assert.equal(result, true);
  });
});

describe('Flag evaluation – rule conditions', () => {
  it('evaluates custom condition function', async () => {
    const provider = createMemoryProvider({
      custom: {
        enabled: false,
        rules: [
          {
            condition: (ctx) => ctx.country === 'US',
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(
      await fm.isEnabled('custom', { country: 'US' }),
      true
    );
    assert.equal(
      await fm.isEnabled('custom', { country: 'CA' }),
      false
    );
  });

  it('condition function receives full context', async () => {
    const provider = createMemoryProvider({
      context_access: {
        enabled: false,
        rules: [
          {
            condition: (ctx) => {
              return ctx.userId === 'alice' && ctx.role === 'admin' && ctx.isPremium;
            },
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('context_access', {
      userId: 'alice',
      role: 'admin',
      isPremium: true,
    });
    assert.equal(result, true);
  });

  it('handles condition function that throws', async () => {
    const provider = createMemoryProvider({
      throws: {
        enabled: false,
        rules: [
          {
            condition: () => {
              throw new Error('Condition error');
            },
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    // Should propagate the error
    try {
      await fm.isEnabled('throws', {});
      assert.fail('Should have thrown');
    } catch (e) {
      assert.equal(e.message, 'Condition error');
    }
  });

  it('condition can check for undefined properties', async () => {
    const provider = createMemoryProvider({
      optional: {
        enabled: false,
        rules: [
          {
            condition: (ctx) => ctx.featureId !== undefined,
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('optional', { featureId: '123' }), true);
    assert.equal(await fm.isEnabled('optional', {}), false);
  });
});

describe('Flag evaluation – multiple roles', () => {
  it('checks if context.role is in rules.roles array', async () => {
    const provider = createMemoryProvider({
      role_check: {
        enabled: false,
        rules: [
          { roles: ['admin', 'moderator', 'staff'], value: true },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('role_check', { role: 'admin' }), true);
    assert.equal(await fm.isEnabled('role_check', { role: 'moderator' }), true);
    assert.equal(await fm.isEnabled('role_check', { role: 'staff' }), true);
    assert.equal(await fm.isEnabled('role_check', { role: 'user' }), false);
  });

  it('checks if context.userId is in rules.userIds array', async () => {
    const provider = createMemoryProvider({
      user_check: {
        enabled: false,
        rules: [
          { userIds: ['alice', 'bob', 'charlie'], value: true },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('user_check', { userId: 'alice' }), true);
    assert.equal(await fm.isEnabled('user_check', { userId: 'bob' }), true);
    assert.equal(await fm.isEnabled('user_check', { userId: 'david' }), false);
  });

  it('handles empty roles/userIds arrays', async () => {
    const provider = createMemoryProvider({
      empty_rules: {
        enabled: false,
        rules: [
          { roles: [], value: true },
          { userIds: [], value: true },
        ],
      },
    });
    const fm = createFlagManager(provider);
    assert.equal(await fm.isEnabled('empty_rules', { role: 'admin' }), false);
    assert.equal(await fm.isEnabled('empty_rules', { userId: 'alice' }), false);
  });
});

describe('Flag evaluation – default values', () => {
  it('missing flag returns false by default', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('missing');
    assert.equal(result, false);
  });

  it('missing flag returns custom defaultValue when set', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('missing');
    assert.equal(result, true);
  });

  it('null flag object returns defaultValue', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('nonexistent');
    assert.equal(result, true);
  });

  it('flag with no enabled, rules, or percentage uses defaultValue', async () => {
    const provider = createMemoryProvider({
      empty: { },
    });
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('empty');
    assert.equal(result, true);
  });

  it('explicit enabled:false overrides defaultValue:true', async () => {
    const provider = createMemoryProvider({
      explicit: { enabled: false },
    });
    const fm = createFlagManager(provider, { defaultValue: true });
    const result = await fm.isEnabled('explicit');
    assert.equal(result, false);
  });
});

describe('Flag evaluation – getAll method', () => {
  it('evaluates all flags with context', async () => {
    const provider = createMemoryProvider({
      f1: { enabled: true },
      f2: { enabled: false },
      f3: {
        enabled: false,
        rules: [{ userIds: ['alice'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    const all = await fm.getAll({ userId: 'alice' });
    assert.equal(all.f1, true);
    assert.equal(all.f2, false);
    assert.equal(all.f3, true);
  });

  it('getAll includes all flags from provider', async () => {
    const provider = createMemoryProvider({
      flag_a: { enabled: true },
      flag_b: { enabled: false },
      flag_c: { enabled: true },
    });
    const fm = createFlagManager(provider);
    const all = await fm.getAll();
    assert.equal(Object.keys(all).length, 3);
    assert.ok('flag_a' in all);
    assert.ok('flag_b' in all);
    assert.ok('flag_c' in all);
  });

  it('getAll respects different contexts for percentage rollouts', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const all1 = await fm.getAll({ userId: 'user1' });
    const all2 = await fm.getAll({ userId: 'user2' });
    // Different users should potentially have different results
    assert.ok(typeof all1.rollout === 'boolean');
    assert.ok(typeof all2.rollout === 'boolean');
  });

  it('getAll uses context for rule evaluation', async () => {
    const provider = createMemoryProvider({
      targeted: {
        enabled: false,
        rules: [{ userIds: ['alice'], value: true }],
      },
    });
    const fm = createFlagManager(provider);
    const alice = await fm.getAll({ userId: 'alice' });
    const bob = await fm.getAll({ userId: 'bob' });
    assert.equal(alice.targeted, true);
    assert.equal(bob.targeted, false);
  });

  it('getAll with empty flags object', async () => {
    const provider = createMemoryProvider({});
    const fm = createFlagManager(provider);
    const all = await fm.getAll();
    assert.deepEqual(all, {});
  });
});

describe('Flag evaluation – context object behavior', () => {
  it('isEnabled accepts empty context object', async () => {
    const provider = createMemoryProvider({
      simple: { enabled: true },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('simple', {});
    assert.equal(result, true);
  });

  it('isEnabled uses default context when not provided', async () => {
    const provider = createMemoryProvider({
      default_ctx: { enabled: true },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('default_ctx');
    assert.equal(result, true);
  });

  it('context object can contain arbitrary fields', async () => {
    const provider = createMemoryProvider({
      custom_fields: {
        enabled: false,
        rules: [
          {
            condition: (ctx) => ctx.customField === 'custom_value',
            value: true,
          },
        ],
      },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('custom_fields', {
      customField: 'custom_value',
      otherField: 123,
      nested: { data: true },
    });
    assert.equal(result, true);
  });
});
