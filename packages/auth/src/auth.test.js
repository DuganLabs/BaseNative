import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionManager, createMemoryStore } from './session.js';
import { hashPassword, verifyPassword } from './password.js';
import { defineRoles, createGuard } from './rbac.js';
import { sessionMiddleware, requireAuth, login, logout } from './middleware.js';
import { credentialsProvider } from './providers/credentials.js';

describe('session manager', () => {
  it('creates and retrieves sessions', async () => {
    const mgr = createSessionManager();
    const session = await mgr.create({ user: { id: 1, name: 'Alice' } });
    assert.ok(session.id);
    assert.equal(session.data.user.name, 'Alice');

    const retrieved = await mgr.get(session.id);
    assert.deepEqual(retrieved.data, session.data);
  });

  it('returns null for expired sessions', async () => {
    const mgr = createSessionManager({ maxAge: 1 }); // 1ms
    const session = await mgr.create({ user: { id: 1 } });
    await new Promise(r => setTimeout(r, 10));
    const retrieved = await mgr.get(session.id);
    assert.equal(retrieved, null);
  });

  it('updates session data', async () => {
    const mgr = createSessionManager();
    const session = await mgr.create({ user: { id: 1 } });
    await mgr.update(session.id, { lastPage: '/dashboard' });
    const retrieved = await mgr.get(session.id);
    assert.equal(retrieved.data.lastPage, '/dashboard');
    assert.equal(retrieved.data.user.id, 1);
  });

  it('destroys sessions', async () => {
    const mgr = createSessionManager();
    const session = await mgr.create({ user: { id: 1 } });
    await mgr.destroy(session.id);
    assert.equal(await mgr.get(session.id), null);
  });

  it('returns null for missing id', async () => {
    const mgr = createSessionManager();
    assert.equal(await mgr.get(null), null);
    assert.equal(await mgr.get(undefined), null);
    assert.equal(await mgr.get('nonexistent'), null);
  });
});

describe('password hashing', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('mySecret123');
    assert.ok(hash.startsWith('scrypt:'));
    assert.ok(await verifyPassword('mySecret123', hash));
  });

  it('rejects wrong passwords', async () => {
    const hash = await hashPassword('correct');
    assert.equal(await verifyPassword('wrong', hash), false);
  });

  it('produces unique hashes for same password', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    assert.notEqual(h1, h2);
  });
});

describe('RBAC', () => {
  const rbac = defineRoles({
    admin: { permissions: ['*'] },
    editor: { permissions: ['write', 'publish'], inherits: ['viewer'] },
    viewer: { permissions: ['read'] },
    guest: { permissions: [] },
  });

  it('admin can do anything', () => {
    assert.ok(rbac.can('admin', 'read'));
    assert.ok(rbac.can('admin', 'write'));
    assert.ok(rbac.can('admin', 'delete'));
  });

  it('viewer can only read', () => {
    assert.ok(rbac.can('viewer', 'read'));
    assert.ok(!rbac.can('viewer', 'write'));
  });

  it('editor inherits viewer permissions', () => {
    assert.ok(rbac.can('editor', 'read'));
    assert.ok(rbac.can('editor', 'write'));
    assert.ok(rbac.can('editor', 'publish'));
    assert.ok(!rbac.can('editor', 'delete'));
  });

  it('guest has no permissions', () => {
    assert.ok(!rbac.can('guest', 'read'));
  });

  it('canAll checks multiple permissions', () => {
    assert.ok(rbac.canAll('editor', ['read', 'write']));
    assert.ok(!rbac.canAll('editor', ['read', 'delete']));
  });

  it('canAny checks any permission', () => {
    assert.ok(rbac.canAny('viewer', ['read', 'write']));
    assert.ok(!rbac.canAny('guest', ['read', 'write']));
  });

  it('getPermissions returns all effective permissions', () => {
    const perms = rbac.getPermissions('editor');
    assert.ok(perms.includes('write'));
    assert.ok(perms.includes('publish'));
    assert.ok(perms.includes('read'));
  });

  it('getRoles lists all roles', () => {
    assert.deepEqual(rbac.getRoles(), ['admin', 'editor', 'viewer', 'guest']);
  });

  it('unknown role has no permissions', () => {
    assert.ok(!rbac.can('unknown', 'read'));
  });
});

describe('guard', () => {
  const rbac = defineRoles({
    admin: { permissions: ['*'] },
    viewer: { permissions: ['read'] },
  });
  const guard = createGuard(rbac);

  function createCtx(role) {
    return {
      request: { method: 'GET', url: '/', headers: {} },
      response: { headers: {} },
      state: { user: role ? { role } : null },
    };
  }

  it('allows authorized access', async () => {
    const ctx = createCtx('admin');
    let nextCalled = false;
    const mw = guard.require('delete');
    await mw(ctx, async () => { nextCalled = true; });
    assert.ok(nextCalled);
  });

  it('denies unauthorized access', async () => {
    const ctx = createCtx('viewer');
    let nextCalled = false;
    const mw = guard.require('delete');
    await mw(ctx, async () => { nextCalled = true; });
    assert.ok(!nextCalled);
    assert.equal(ctx.response.status, 403);
  });

  it('denies when no user', async () => {
    const ctx = createCtx(null);
    let nextCalled = false;
    const mw = guard.require('read');
    await mw(ctx, async () => { nextCalled = true; });
    assert.ok(!nextCalled);
  });
});

describe('auth middleware', () => {
  it('loads session from cookie', async () => {
    const mgr = createSessionManager();
    const session = await mgr.create({ user: { id: 1, name: 'Alice' } });

    const ctx = {
      request: { cookies: { bn_session: session.id }, headers: {} },
      response: { headers: {} },
      state: {},
    };

    const mw = sessionMiddleware(mgr);
    await mw(ctx, async () => {});
    assert.equal(ctx.state.user.name, 'Alice');
    assert.ok(ctx.state.isAuthenticated);
  });

  it('requireAuth blocks unauthenticated', async () => {
    const mw = requireAuth();
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { isAuthenticated: false },
    };
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 401);
  });

  it('requireAuth redirects when configured', async () => {
    const mw = requireAuth({ redirectTo: '/login' });
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { isAuthenticated: false },
    };
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 302);
    assert.equal(ctx.response.headers['location'], '/login');
  });
});

describe('credentials provider', () => {
  it('authenticates valid credentials', async () => {
    const hash = await hashPassword('secret');
    const provider = credentialsProvider({
      findUser: (email) => email === 'alice@test.com'
        ? { id: 1, name: 'Alice', email: 'alice@test.com', passwordHash: hash }
        : null,
    });

    const result = await provider.authenticate('alice@test.com', 'secret');
    assert.ok(result.success);
    assert.equal(result.user.name, 'Alice');
    assert.equal(result.user.passwordHash, undefined);
  });

  it('rejects invalid credentials', async () => {
    const hash = await hashPassword('secret');
    const provider = credentialsProvider({
      findUser: () => ({ id: 1, passwordHash: hash }),
    });

    const result = await provider.authenticate('anyone', 'wrong');
    assert.ok(!result.success);
  });

  it('rejects unknown user', async () => {
    const provider = credentialsProvider({ findUser: () => null });
    const result = await provider.authenticate('nobody', 'pass');
    assert.ok(!result.success);
  });

  it('registers user with hashed password', async () => {
    const provider = credentialsProvider({ findUser: () => null });
    const user = await provider.register({ name: 'Bob', email: 'bob@test.com' }, 'myPassword');
    assert.ok(user.passwordHash.startsWith('scrypt:'));
    assert.equal(user.name, 'Bob');
  });
});

describe('session manager — additional', () => {
  it('touch extends session expiry', async () => {
    const mgr = createSessionManager({ maxAge: 60000 });
    const session = await mgr.create({ user: { id: 1 } });
    const oldExpiry = session.expiresAt;
    await new Promise(r => setTimeout(r, 5));
    const touched = await mgr.touch(session.id);
    assert.ok(touched.expiresAt >= oldExpiry);
  });

  it('touch returns null for missing session', async () => {
    const mgr = createSessionManager();
    const result = await mgr.touch('nonexistent');
    assert.equal(result, null);
  });

  it('cookieOptions returns expected shape', () => {
    const mgr = createSessionManager({ maxAge: 3600000 });
    const opts = mgr.cookieOptions();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.maxAge, 3600);
    assert.equal(opts.path, '/');
    assert.equal(opts.sameSite, 'lax');
  });

  it('update returns null for missing session', async () => {
    const mgr = createSessionManager();
    const result = await mgr.update('missing-id', { foo: 'bar' });
    assert.equal(result, null);
  });
});

describe('createMemoryStore', () => {
  it('size reflects stored entries', async () => {
    const store = createMemoryStore();
    assert.equal(store.size, 0);
    await store.set('a', { data: 1 });
    await store.set('b', { data: 2 });
    assert.equal(store.size, 2);
  });

  it('clear empties the store', async () => {
    const store = createMemoryStore();
    await store.set('x', { data: 1 });
    await store.clear();
    assert.equal(store.size, 0);
    assert.equal(await store.get('x'), null);
  });
});

describe('RBAC — additional', () => {
  const rbac = defineRoles({
    admin: { permissions: ['*'] },
    editor: { permissions: ['write', 'publish'], inherits: ['viewer'] },
    viewer: { permissions: ['read'] },
  });

  it('hasRole returns true for defined roles', () => {
    assert.ok(rbac.hasRole('admin'));
    assert.ok(rbac.hasRole('viewer'));
  });

  it('hasRole returns false for unknown roles', () => {
    assert.ok(!rbac.hasRole('superuser'));
  });

  it('canAll with wildcard always returns true', () => {
    assert.ok(rbac.canAll('admin', ['read', 'write', 'delete', 'publish']));
  });

  it('canAny with wildcard always returns true', () => {
    assert.ok(rbac.canAny('admin', ['any-permission']));
  });
});

describe('guard — additional', () => {
  const rbac = defineRoles({
    admin: { permissions: ['*'] },
    editor: { permissions: ['write'] },
    viewer: { permissions: ['read'] },
  });
  const guard = createGuard(rbac);

  function makeCtx(role) {
    return {
      request: { headers: {} },
      response: { headers: {} },
      state: { user: role ? { role } : null },
    };
  }

  it('requireAny allows when user has one matching permission', async () => {
    const ctx = makeCtx('editor');
    let called = false;
    await guard.requireAny('write', 'publish')(ctx, async () => { called = true; });
    assert.ok(called);
  });

  it('requireAny denies when user has none of the permissions', async () => {
    const ctx = makeCtx('viewer');
    let called = false;
    await guard.requireAny('write', 'delete')(ctx, async () => { called = true; });
    assert.ok(!called);
    assert.equal(ctx.response.status, 403);
  });

  it('requireRole allows matching role', async () => {
    const ctx = makeCtx('admin');
    let called = false;
    await guard.requireRole('admin', 'editor')(ctx, async () => { called = true; });
    assert.ok(called);
  });

  it('requireRole denies non-matching role', async () => {
    const ctx = makeCtx('viewer');
    let called = false;
    await guard.requireRole('admin')(ctx, async () => { called = true; });
    assert.ok(!called);
    assert.equal(ctx.response.status, 403);
  });
});
