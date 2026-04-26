// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineRoles, hasRole, requireRole, roleSeed } from '../src/roles.js';

describe('defineRoles', () => {
  const roles = defineRoles({ hierarchy: ['user', 'moderator', 'admin'] });

  it('defaults role to lowest tier', () => {
    assert.equal(roles.getRole({}), 'user');
    assert.equal(roles.getRole(null), 'user');
  });

  it('hasRole respects hierarchy — admin satisfies moderator', () => {
    const admin = { role: 'admin' };
    const mod = { role: 'moderator' };
    const user = { role: 'user' };
    assert.equal(roles.hasRole(admin, 'moderator'), true);
    assert.equal(roles.hasRole(admin, 'admin'), true);
    assert.equal(roles.hasRole(mod, 'moderator'), true);
    assert.equal(roles.hasRole(mod, 'admin'), false);
    assert.equal(roles.hasRole(user, 'moderator'), false);
  });

  it('isAdmin / isModerator helpers', () => {
    assert.equal(roles.isAdmin({ role: 'admin' }), true);
    assert.equal(roles.isAdmin({ role: 'moderator' }), false);
    assert.equal(roles.isModerator({ role: 'admin' }), true);
    assert.equal(roles.isModerator({ role: 'moderator' }), true);
    assert.equal(roles.isModerator({ role: 'user' }), false);
  });

  it('rank returns -1 for unknown', () => {
    assert.equal(roles.rank('admin'), 2);
    assert.equal(roles.rank('nope'), -1);
  });

  it('throws on empty hierarchy', () => {
    assert.throws(() => defineRoles({ hierarchy: [] }));
  });
});

describe('hasRole shorthand', () => {
  it('matches defineRoles for default hierarchy', () => {
    assert.equal(hasRole({ role: 'admin' }, 'moderator'), true);
    assert.equal(hasRole({ role: 'user' }, 'moderator'), false);
  });
});

describe('requireRole', () => {
  it('returns { user } when satisfied', () => {
    const guard = requireRole('moderator');
    const r = guard({ role: 'admin' });
    assert.ok(r.user);
    assert.equal(r.error, undefined);
  });

  it('returns { error } 403 when denied', async () => {
    const guard = requireRole('moderator');
    const r = guard({ role: 'user' });
    assert.ok(r.error);
    assert.equal(r.error.status, 403);
    const body = await r.error.json();
    assert.equal(body.error, 'moderator-only');
  });
});

describe('roleSeed', () => {
  it('promotes when handle is in env list', async () => {
    const writes = [];
    const out = await roleSeed({
      env: { ADMIN_HANDLES: 'alice, bob ' },
      user: { id: 'u1', handle: 'Alice', role: 'user' },
      setRole: async (id, role, by) => { writes.push({ id, role, by }); },
    });
    assert.equal(out.role, 'admin');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].by, 'seed:ADMIN_HANDLES');
  });

  it('no-op when already at target role', async () => {
    let called = false;
    const out = await roleSeed({
      env: { ADMIN_HANDLES: 'alice' },
      user: { id: 'u1', handle: 'alice', role: 'admin' },
      setRole: async () => { called = true; },
    });
    assert.equal(out.role, 'admin');
    assert.equal(called, false);
  });

  it('does nothing when not allowlisted', async () => {
    let called = false;
    const out = await roleSeed({
      env: { ADMIN_HANDLES: 'alice' },
      user: { id: 'u2', handle: 'mallory', role: 'user' },
      setRole: async () => { called = true; },
    });
    assert.equal(out.role, 'user');
    assert.equal(called, false);
  });

  it('seedMap wins over env', async () => {
    let called = false;
    const out = await roleSeed({
      env: { ADMIN_HANDLES: 'alice' },
      seedMap: { alice: 'user' }, // explicit map → not allowed
      user: { id: 'u1', handle: 'alice', role: 'user' },
      setRole: async () => { called = true; },
    });
    assert.equal(out.role, 'user');
    assert.equal(called, false);
  });
});
