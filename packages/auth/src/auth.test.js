import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionManager, createMemoryStore } from './session.js';
import { hashPassword, verifyPassword } from './password.js';
import { defineRoles, createGuard } from './rbac.js';
import { sessionMiddleware, requireAuth, login, logout } from './middleware.js';
import { credentialsProvider } from './providers/credentials.js';
import { oauthProvider, providers } from './providers/oauth.js';

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

describe('oauthProvider', () => {
  const baseConfig = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    authorizeUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    userInfoUrl: 'https://auth.example.com/userinfo',
    redirectUri: 'https://myapp.com/callback',
  };

  it('getAuthUrl returns URL with correct query params', () => {
    const provider = oauthProvider(baseConfig);
    const { url, state } = provider.getAuthUrl('my-state');
    assert.ok(url.includes('client_id=client-id'));
    assert.ok(url.includes('response_type=code'));
    assert.ok(url.includes('redirect_uri='));
    assert.equal(state, 'my-state');
  });

  it('getAuthUrl generates state when none provided', () => {
    const provider = oauthProvider(baseConfig);
    const { url, state } = provider.getAuthUrl();
    assert.ok(typeof state === 'string' && state.length > 0);
    assert.ok(url.includes(`state=${state}`));
  });

  it('getAuthUrl includes custom scopes', () => {
    const provider = oauthProvider({ ...baseConfig, scopes: ['read', 'write'] });
    const { url } = provider.getAuthUrl('s');
    assert.ok(url.includes('scope=read+write') || url.includes('scope=read%20write'));
  });

  it('handleCallback returns success with user info', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ access_token: 'tok-123' }) };
      }
      return { ok: true, json: async () => ({ id: 'user-1', email: 'u@example.com' }) };
    };
    try {
      const provider = oauthProvider(baseConfig);
      const result = await provider.handleCallback('auth-code');
      assert.equal(result.success, true);
      assert.equal(result.user.id, 'user-1');
      assert.equal(result.tokens.access_token, 'tok-123');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handleCallback returns error when token exchange fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 400 });
    try {
      const provider = oauthProvider(baseConfig);
      const result = await provider.handleCallback('bad-code');
      assert.equal(result.success, false);
      assert.ok(result.error.includes('Token'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handleCallback returns error when user info fetch fails', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) return { ok: true, json: async () => ({ access_token: 'tok' }) };
      return { ok: false, status: 401 };
    };
    try {
      const provider = oauthProvider(baseConfig);
      const result = await provider.handleCallback('code');
      assert.equal(result.success, false);
      assert.ok(result.error.includes('user info'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('provider.type is "oauth"', () => {
    const provider = oauthProvider(baseConfig);
    assert.equal(provider.type, 'oauth');
  });
});

describe('providers (pre-configured OAuth)', () => {
  it('providers.github creates provider with GitHub URLs', () => {
    const p = providers.github({ clientId: 'cid', clientSecret: 'sec', redirectUri: '/cb' });
    const { url } = p.getAuthUrl('s');
    assert.ok(url.includes('github.com'));
  });

  it('providers.google creates provider with Google URLs', () => {
    const p = providers.google({ clientId: 'cid', clientSecret: 'sec', redirectUri: '/cb' });
    const { url } = p.getAuthUrl('s');
    assert.ok(url.includes('google.com') || url.includes('accounts.google'));
  });

  it('providers.microsoft accepts custom tenant', () => {
    const p = providers.microsoft({ clientId: 'cid', clientSecret: 'sec', redirectUri: '/cb', tenant: 'mytenant' });
    const { url } = p.getAuthUrl('s');
    assert.ok(url.includes('mytenant'));
  });
});

describe('login / logout helpers', () => {
  it('login creates session and sets ctx.state', async () => {
    const mgr = createSessionManager();
    const ctx = { request: { cookies: {}, headers: {} }, response: { headers: {} }, state: {} };
    const user = { id: 42, name: 'Carol' };
    const session = await login(mgr, ctx, user);
    assert.ok(session.id);
    assert.equal(ctx.state.user.name, 'Carol');
    assert.ok(ctx.state.isAuthenticated);
    assert.equal(ctx.state._newSession.id, session.id);
  });

  it('logout destroys session and clears state', async () => {
    const mgr = createSessionManager();
    const session = await mgr.create({ user: { id: 1 } });
    const ctx = {
      request: { cookies: {}, headers: {} },
      response: { headers: {}, cookies: {} },
      state: { session, user: { id: 1 }, isAuthenticated: true },
    };
    await logout(mgr, ctx);
    assert.equal(ctx.state.user, null);
    assert.equal(ctx.state.isAuthenticated, false);
    assert.equal(ctx.state.session, null);
    assert.equal(ctx.response.cookies[mgr.cookieName].maxAge, 0);
  });

  it('logout with no session does not throw', async () => {
    const mgr = createSessionManager();
    const ctx = {
      request: { cookies: {}, headers: {} },
      response: { headers: {} },
      state: { session: null, user: null, isAuthenticated: false },
    };
    await assert.doesNotReject(() => logout(mgr, ctx));
  });
});

describe('sessionMiddleware — additional', () => {
  it('sets user to null when no session cookie', async () => {
    const mgr = createSessionManager();
    const ctx = {
      request: { cookies: {}, headers: {} },
      response: { headers: {} },
      state: {},
    };
    const mw = sessionMiddleware(mgr);
    await mw(ctx, async () => {});
    assert.equal(ctx.state.user, null);
    assert.equal(ctx.state.isAuthenticated, false);
  });

  it('sets response cookie when _newSession is present after next()', async () => {
    const mgr = createSessionManager();
    const ctx = {
      request: { cookies: {}, headers: {} },
      response: { headers: {} },
      state: {},
    };
    const mw = sessionMiddleware(mgr);
    await mw(ctx, async () => {
      const session = await mgr.create({ user: { id: 1 } });
      ctx.state._newSession = session;
    });
    assert.ok(ctx.response.cookies);
    assert.ok(ctx.response.cookies[mgr.cookieName]);
  });
});

describe('requireAuth — additional', () => {
  it('allows authenticated requests through', async () => {
    const mw = requireAuth();
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { isAuthenticated: true },
    };
    let called = false;
    await mw(ctx, async () => { called = true; });
    assert.ok(called);
  });

  it('returns custom message when not authenticated', async () => {
    const mw = requireAuth({ message: 'Please log in first' });
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { isAuthenticated: false },
    };
    await mw(ctx, async () => {});
    assert.equal(ctx.response.status, 401);
    assert.equal(ctx.response.body, 'Please log in first');
  });
});

describe('guard — custom options', () => {
  const rbac = defineRoles({
    admin: { permissions: ['*'] },
    viewer: { permissions: ['read'] },
  });

  it('uses custom getRoleFromContext', async () => {
    const guard = createGuard(rbac, {
      getRoleFromContext: (ctx) => ctx.state.customRole,
    });
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { customRole: 'admin' },
    };
    let called = false;
    await guard.require('delete')(ctx, async () => { called = true; });
    assert.ok(called);
  });

  it('calls custom onDenied handler', async () => {
    let deniedCalled = false;
    const guard = createGuard(rbac, {
      onDenied: (ctx) => {
        deniedCalled = true;
        ctx.response.status = 418;
      },
    });
    const ctx = {
      request: { headers: {} },
      response: { headers: {} },
      state: { user: { role: 'viewer' } },
    };
    await guard.require('delete')(ctx, async () => {});
    assert.ok(deniedCalled);
    assert.equal(ctx.response.status, 418);
  });
});

describe('RBAC — edge cases', () => {
  it('deep inheritance chain resolves all permissions', () => {
    const rbac = defineRoles({
      a: { permissions: ['pa'] },
      b: { permissions: ['pb'], inherits: ['a'] },
      c: { permissions: ['pc'], inherits: ['b'] },
    });
    assert.ok(rbac.can('c', 'pa'));
    assert.ok(rbac.can('c', 'pb'));
    assert.ok(rbac.can('c', 'pc'));
  });

  it('getPermissions for unknown role returns empty array', () => {
    const rbac = defineRoles({ admin: { permissions: ['*'] } });
    assert.deepEqual(rbac.getPermissions('nobody'), []);
  });
});
