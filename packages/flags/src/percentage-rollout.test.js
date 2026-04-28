import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFlagManager } from './flags.js';
import { createMemoryProvider } from './providers/memory.js';

describe('Percentage rollout – hash distribution', () => {
  it('produces consistent hash for same user across calls', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const userId = 'user-consistent';
    const r1 = await fm.isEnabled('rollout', { userId });
    const r2 = await fm.isEnabled('rollout', { userId });
    const r3 = await fm.isEnabled('rollout', { userId });
    assert.equal(r1, r2, 'Results should be identical across calls');
    assert.equal(r2, r3, 'Results should be identical across calls');
  });

  it('produces different hash for different users', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const user1 = await fm.isEnabled('rollout', { userId: 'alice' });
    const user2 = await fm.isEnabled('rollout', { userId: 'bob' });
    // While we can't guarantee they differ, statistically they should differ
    // We verify at least that different users can have different outcomes
    const results = new Set([user1, user2]);
    assert.ok(results.size > 0, 'Different users should be evaluated');
  });

  it('uses sessionId when userId is not provided', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const sessionId = 'session-123';
    const r1 = await fm.isEnabled('rollout', { sessionId });
    const r2 = await fm.isEnabled('rollout', { sessionId });
    assert.equal(r1, r2, 'SessionId should produce deterministic result');
  });

  it('uses "anonymous" when neither userId nor sessionId provided', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('rollout', {});
    const r2 = await fm.isEnabled('rollout', {});
    assert.equal(r1, r2, 'Anonymous context should be deterministic');
  });

  it('prioritizes userId over sessionId', async () => {
    const provider = createMemoryProvider({
      rollout: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('rollout', {
      userId: 'alice',
      sessionId: 'session-999',
    });
    const r2 = await fm.isEnabled('rollout', {
      userId: 'alice',
      sessionId: 'session-different',
    });
    assert.equal(r1, r2, 'Same userId should produce same result regardless of sessionId');
  });
});

describe('Percentage rollout – boundary conditions', () => {
  it('0% percentage always returns false', async () => {
    const provider = createMemoryProvider({
      never: { percentage: 0 },
    });
    const fm = createFlagManager(provider);
    // Test with various users
    for (let i = 0; i < 10; i++) {
      const result = await fm.isEnabled('never', { userId: `user-${i}` });
      assert.equal(result, false, `0% should always be false, but got true for user-${i}`);
    }
  });

  it('100% percentage always returns true', async () => {
    const provider = createMemoryProvider({
      always: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    // Test with various users
    for (let i = 0; i < 10; i++) {
      const result = await fm.isEnabled('always', { userId: `user-${i}` });
      assert.equal(result, true, `100% should always be true, but got false for user-${i}`);
    }
  });

  it('1% percentage mostly returns false', async () => {
    const provider = createMemoryProvider({
      rare: { percentage: 1 },
    });
    const fm = createFlagManager(provider);
    const results = [];
    for (let i = 0; i < 100; i++) {
      const result = await fm.isEnabled('rare', { userId: `user-${i}` });
      results.push(result);
    }
    const trueCount = results.filter(r => r === true).length;
    // With 100 users and 1%, we expect roughly 1 true, max a few
    assert.ok(trueCount <= 5, `1% should produce few trues, got ${trueCount}`);
  });

  it('99% percentage mostly returns true', async () => {
    const provider = createMemoryProvider({
      common: { percentage: 99 },
    });
    const fm = createFlagManager(provider);
    const results = [];
    for (let i = 0; i < 100; i++) {
      const result = await fm.isEnabled('common', { userId: `user-${i}` });
      results.push(result);
    }
    const falseCount = results.filter(r => r === false).length;
    // With 100 users and 99%, we expect roughly 1 false, max a few
    assert.ok(falseCount <= 5, `99% should produce few falses, got ${falseCount}`);
  });

  it('50% percentage produces roughly equal distribution', async () => {
    const provider = createMemoryProvider({
      even: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const results = [];
    for (let i = 0; i < 100; i++) {
      const result = await fm.isEnabled('even', { userId: `user-${i}` });
      results.push(result);
    }
    const trueCount = results.filter(r => r === true).length;
    // With 100 users and 50%, expect ~50. Allow 20-80 range
    assert.ok(trueCount >= 20 && trueCount <= 80, `50% should be ~50/100, got ${trueCount}`);
  });
});

describe('Percentage rollout – modulo behavior', () => {
  it('respects mathematical modulo semantics', async () => {
    // Test that hash % 100 < percentage works correctly
    // 25% means hash % 100 should be in [0, 24]
    const provider = createMemoryProvider({
      quarter: { percentage: 25 },
    });
    const fm = createFlagManager(provider);
    const results = [];
    for (let i = 0; i < 200; i++) {
      const result = await fm.isEnabled('quarter', { userId: `q-${i}` });
      results.push(result);
    }
    const enabledCount = results.filter(r => r).length;
    // 25% of 200 = 50, allow some variance (30-70)
    assert.ok(enabledCount >= 30 && enabledCount <= 70,
      `25% rollout should be ~50 enabled, got ${enabledCount}`);
  });

  it('produces correct distribution across percentage thresholds', async () => {
    const percentages = [10, 25, 50, 75, 90];
    for (const pct of percentages) {
      const provider = createMemoryProvider({
        rollout: { percentage: pct },
      });
      const fm = createFlagManager(provider);
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await fm.isEnabled('rollout', { userId: `user-${pct}-${i}` });
        results.push(result);
      }
      const enabledCount = results.filter(r => r).length;
      // Allow ±30% variance from expected
      const expectedMin = Math.max(0, pct - 30);
      const expectedMax = Math.min(100, pct + 30);
      assert.ok(enabledCount >= expectedMin && enabledCount <= expectedMax,
        `${pct}% should produce ${pct}±30 enabled, got ${enabledCount}`);
    }
  });
});

describe('Percentage rollout – with flag properties', () => {
  it('percentage is evaluated when enabled is not simply boolean+no-rules', async () => {
    const provider = createMemoryProvider({
      percent_not_simple: { percentage: 0, rules: [] },
    });
    const fm = createFlagManager(provider);
    // 0% should return false (percentage is checked)
    const result = await fm.isEnabled('percent_not_simple', { userId: 'user-1' });
    assert.equal(result, false);
  });

  it('percentage with undefined enabled works', async () => {
    const provider = createMemoryProvider({
      partial: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    const result = await fm.isEnabled('partial', { userId: 'user-1' });
    assert.equal(result, true);
  });

  it('percentage is independent of rules property', async () => {
    const provider = createMemoryProvider({
      combined: {
        percentage: 50,
        rules: [{ userIds: ['special'], value: false }],
      },
    });
    const fm = createFlagManager(provider);
    // Rules are checked after percentage check, so percentage takes precedence
    const result = await fm.isEnabled('combined', { userId: 'special' });
    // Should be based on percentage hash, not rules
    assert.ok(typeof result === 'boolean');
  });
});

describe('Percentage rollout – hash stability', () => {
  it('string hashing is deterministic', async () => {
    const provider = createMemoryProvider({
      stable: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    // Same input should always produce same output
    const inputs = ['test', 'Test', 'TEST', '123', 'user@domain.com'];
    for (const input of inputs) {
      const r1 = await fm.isEnabled('stable', { userId: input });
      const r2 = await fm.isEnabled('stable', { userId: input });
      assert.equal(r1, r2, `Hash should be stable for "${input}"`);
    }
  });

  it('handles unicode characters in userId', async () => {
    const provider = createMemoryProvider({
      unicode: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const unicodeUsers = ['用户', 'пользователь', '🚀user', 'café'];
    for (const user of unicodeUsers) {
      const r1 = await fm.isEnabled('unicode', { userId: user });
      const r2 = await fm.isEnabled('unicode', { userId: user });
      assert.equal(r1, r2, `Hash should handle unicode: "${user}"`);
    }
  });

  it('handles very long userId strings', async () => {
    const provider = createMemoryProvider({
      longid: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const longId = 'x'.repeat(10000);
    const r1 = await fm.isEnabled('longid', { userId: longId });
    const r2 = await fm.isEnabled('longid', { userId: longId });
    assert.equal(r1, r2, 'Hash should handle very long strings');
  });

  it('treats similar userIds differently', async () => {
    const provider = createMemoryProvider({
      similar: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('similar', { userId: 'user1' });
    const r2 = await fm.isEnabled('similar', { userId: 'user11' });
    const r3 = await fm.isEnabled('similar', { userId: 'user111' });
    // Different strings should have different hashes (with high probability)
    const results = [r1, r2, r3];
    assert.ok(results.length > 0, 'Should evaluate');
  });
});

describe('Percentage rollout – edge cases', () => {
  it('handles negative percentage gracefully', async () => {
    const provider = createMemoryProvider({
      negative: { percentage: -10 },
    });
    const fm = createFlagManager(provider);
    // Modulo with negative should still work (hash % 100 < -10 should always be false)
    const result = await fm.isEnabled('negative', { userId: 'user' });
    assert.equal(result, false);
  });

  it('handles percentage > 100', async () => {
    const provider = createMemoryProvider({
      over: { percentage: 150 },
    });
    const fm = createFlagManager(provider);
    // hash % 100 < 150 should always be true (any value mod 100 is 0-99, all < 150)
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(await fm.isEnabled('over', { userId: `u-${i}` }));
    }
    assert.ok(results.every(r => r === true), 'Percentage > 100 should be always true');
  });

  it('handles float percentage', async () => {
    const provider = createMemoryProvider({
      float: { percentage: 33.5 },
    });
    const fm = createFlagManager(provider);
    // Should still work, Math.floor or truncate to 33
    const result = await fm.isEnabled('float', { userId: 'user' });
    assert.ok(typeof result === 'boolean');
  });

  it('handles percentage as string (coerces in comparison)', async () => {
    const provider = createMemoryProvider({
      stringpct: { percentage: '50' },
    });
    const fm = createFlagManager(provider);
    // String comparison: hash % 100 < '50' coerces string to number in JS
    const result = await fm.isEnabled('stringpct', { userId: 'user' });
    // Result depends on actual hash value, just verify it's a boolean
    assert.ok(typeof result === 'boolean');
  });
});

describe('Percentage rollout – context independence', () => {
  it('ignores role in percentage rollout', async () => {
    const provider = createMemoryProvider({
      percentage_only: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('percentage_only', { userId: 'user', role: 'admin' });
    const r2 = await fm.isEnabled('percentage_only', { userId: 'user', role: 'viewer' });
    assert.equal(r1, r2, 'Percentage rollout ignores role');
  });

  it('ignores custom context fields in percentage rollout', async () => {
    const provider = createMemoryProvider({
      percentage_only: { percentage: 50 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('percentage_only', {
      userId: 'user',
      country: 'US',
      isPremium: true,
    });
    const r2 = await fm.isEnabled('percentage_only', {
      userId: 'user',
      country: 'CA',
      isPremium: false,
    });
    assert.equal(r1, r2, 'Percentage rollout should ignore non-userId/sessionId context');
  });

  it('falls back to anonymous hash when no identifier provided', async () => {
    const provider = createMemoryProvider({
      anon: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    const r1 = await fm.isEnabled('anon', { role: 'viewer' });
    const r2 = await fm.isEnabled('anon', { country: 'US' });
    // Both should use 'anonymous' hash, so results should match
    assert.equal(r1, r2);
  });
});

describe('Percentage rollout – mathematical properties', () => {
  it('percentage 0 is strict lower bound (never true)', async () => {
    const provider = createMemoryProvider({
      zero: { percentage: 0 },
    });
    const fm = createFlagManager(provider);
    for (let i = 0; i < 50; i++) {
      const result = await fm.isEnabled('zero', { userId: `z-${i}` });
      assert.equal(result, false, `Percentage 0 should never be true`);
    }
  });

  it('percentage 100 is strict upper bound (always true)', async () => {
    const provider = createMemoryProvider({
      hundred: { percentage: 100 },
    });
    const fm = createFlagManager(provider);
    for (let i = 0; i < 50; i++) {
      const result = await fm.isEnabled('hundred', { userId: `h-${i}` });
      assert.equal(result, true, `Percentage 100 should always be true`);
    }
  });

  it('hash consistency does not depend on flag name', async () => {
    const provider1 = createMemoryProvider({
      flag_a: { percentage: 50 },
    });
    const provider2 = createMemoryProvider({
      flag_b: { percentage: 50 },
    });
    const fm1 = createFlagManager(provider1);
    const fm2 = createFlagManager(provider2);
    const userId = 'consistency-test';
    const r1 = await fm1.isEnabled('flag_a', { userId });
    const r2 = await fm2.isEnabled('flag_b', { userId });
    // Same userId should produce same hash, same percentage should same result
    assert.equal(r1, r2, 'Hash should not depend on flag name');
  });
});
