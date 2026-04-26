// Built with BaseNative — basenative.dev
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  webauthnAdapter,
  normHandle,
  validHandle,
  bytesToB64u,
  b64uToBytes,
  userIdBytes,
} from '../src/server.js';
import { seedRoles, parseHandleList } from '../src/seed-role.js';

/* Stub WebAuthn primitives, injected via the adapter's `lib` option. This
   keeps tests free of the @simplewebauthn/server peer dep (a real consumer
   would never pass `lib` — it loads dynamically from the peer). */
const FAKE_LIB = {
  generateRegistrationOptions: async (input) => ({
    challenge: 'CHAL_REG_' + (input.userName || 'x'),
    rp: { id: input.rpID, name: input.rpName },
    user: { id: 'uid', name: input.userName },
    excludeCredentials: input.excludeCredentials,
  }),
  generateAuthenticationOptions: async (input) => ({
    challenge: 'CHAL_AUTH',
    rpId: input.rpID,
    allowCredentials: input.allowCredentials,
  }),
  verifyRegistrationResponse: async () => ({
    verified: true,
    registrationInfo: {
      credential: {
        id: 'CRED_ID_1',
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 0,
      },
    },
  }),
  verifyAuthenticationResponse: async () => ({
    verified: true,
    authenticationInfo: { newCounter: 7 },
  }),
};

/* ── in-memory fake stores ──────────────────────────────────────────── */
function makeStores() {
  const users = new Map();
  const credentials = new Map();
  const challenges = new Map();
  const sessions = new Map();

  return {
    users: {
      async getByHandle(h) { return [...users.values()].find((u) => u.handle === h) || null; },
      async getById(id) { return users.get(id) || null; },
      async create({ id, handle }) { const u = { id, handle, role: 'user' }; users.set(id, u); return u; },
      async setRole(id, role, by) {
        const u = users.get(id); if (!u) return;
        u.role = role; u.role_changed_by = by;
      },
    },
    credentials: {
      async listByUser(uid) { return [...credentials.values()].filter((c) => c.userId === uid); },
      async getById(id) { return credentials.get(id) || null; },
      async create(c) { credentials.set(c.id, { ...c }); },
      async updateCounter(id, n) { credentials.get(id).counter = n; },
    },
    challenges: {
      async create({ challenge, userId, purpose, ttlSeconds }) {
        challenges.set(challenge, {
          challenge, userId: userId ?? null, purpose,
          expiresAt: Math.floor(Date.now() / 1000) + (ttlSeconds ?? 300),
        });
      },
      async consume(challenge, purpose) {
        const r = challenges.get(challenge);
        if (!r || r.purpose !== purpose) return null;
        challenges.delete(challenge);
        if (r.expiresAt < Math.floor(Date.now() / 1000)) return null;
        return r;
      },
    },
    userSessions: {
      async create({ id, userId, ttlSeconds }) {
        sessions.set(id, {
          id, userId, expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
        });
      },
      async getUser(token) {
        const s = sessions.get(token); if (!s) return null;
        if (s.expiresAt < Math.floor(Date.now() / 1000)) return null;
        return users.get(s.userId);
      },
      async destroy(token) { sessions.delete(token); },
    },
    _raw: { users, credentials, challenges, sessions },
  };
}

const RP = { rpName: 'Test', rpID: 'localhost', origin: 'http://localhost:8788' };

/* Build a fake challenge-bearing clientDataJSON for verify endpoints. */
function makeClientDataJSON(challenge) {
  const json = JSON.stringify({ type: 'webauthn.create', challenge, origin: RP.origin });
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ─────────────────────────────────────────────────────────────────── */

describe('helpers', () => {
  it('normHandle lowercases and trims', () => {
    assert.equal(normHandle('  Alice  '), 'alice');
    assert.equal(normHandle(null), '');
  });

  it('validHandle rules', () => {
    assert.ok(validHandle('alice'));
    assert.ok(validHandle('a_b-1'));
    assert.equal(validHandle('a'), false);          // too short
    assert.equal(validHandle('Alice'), false);      // uppercase
    assert.equal(validHandle('a'.repeat(25)), false); // too long
    assert.equal(validHandle('al ice'), false);     // space
  });

  it('b64u round-trips', () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 0, 99]);
    assert.deepEqual(b64uToBytes(bytesToB64u(bytes)), bytes);
  });

  it('userIdBytes packs uuid to 16 bytes', () => {
    const b = userIdBytes('00112233-4455-6677-8899-aabbccddeeff');
    assert.equal(b.length, 16);
    assert.equal(b[0], 0x00);
    assert.equal(b[15], 0xff);
  });
});

describe('webauthnAdapter — construction', () => {
  it('rejects missing rp config', () => {
    assert.throws(() => webauthnAdapter({ stores: makeStores() }));
    assert.throws(() => webauthnAdapter({ rp: { rpID: 'x' }, stores: makeStores() }));
  });

  it('rejects missing stores', () => {
    assert.throws(() => webauthnAdapter({ rp: RP }));
  });

  it('rejects stores that miss methods', () => {
    const s = makeStores();
    delete s.users.getByHandle;
    assert.throws(() => webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: s }));
  });

  it('clamps challenge TTL to ≤ 300s', () => {
    const a = webauthnAdapter({
      rp: RP,
      stores: makeStores(),
      ttl: { challengeSeconds: 9999 },
    });
    assert.ok(a._config.challengeTtl <= 300);
  });

  it('reports type "webauthn"', () => {
    const a = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    assert.equal(a.type, 'webauthn');
  });
});

describe('webauthnAdapter — registration flow', () => {
  it('rejects bad handles', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const r = await adapter.getRegistrationOptions('A');
    assert.equal(r.error, 'bad-handle');
    assert.equal(r.status, 400);
  });

  it('creates user + challenge on first request', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const r = await adapter.getRegistrationOptions('alice');
    assert.ok(r.options.challenge);
    assert.equal(stores._raw.users.size, 1);
    assert.equal(stores._raw.challenges.size, 1);
  });

  it('reuses existing user on second request', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    await adapter.getRegistrationOptions('alice');
    await adapter.getRegistrationOptions('alice');
    assert.equal(stores._raw.users.size, 1);
  });

  it('verifyRegistration creates credential + session on success', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const opts = await adapter.getRegistrationOptions('alice');
    const challenge = opts.options.challenge;

    const result = await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON(challenge), transports: ['internal'] },
    });

    assert.ok(result.ok);
    assert.ok(result.token);
    assert.equal(stores._raw.credentials.size, 1);
    assert.equal(stores._raw.sessions.size, 1);
  });

  it('verifyRegistration rejects unknown challenge', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const r = await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON('NOT_REAL') },
    });
    assert.equal(r.error, 'challenge-not-found');
    assert.equal(r.status, 400);
  });

  it('verifyRegistration rejects missing attestation', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const r = await adapter.verifyRegistration(null);
    assert.equal(r.error, 'missing-attestation');
  });
});

describe('webauthnAdapter — authentication flow', () => {
  async function setup() {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const opts = await adapter.getRegistrationOptions('alice');
    await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });
    return { stores, adapter };
  }

  it('login options include allowCredentials when handle given', async () => {
    const { adapter } = await setup();
    const r = await adapter.getAuthenticationOptions('alice');
    assert.ok(Array.isArray(r.options.allowCredentials));
    assert.equal(r.options.allowCredentials.length, 1);
  });

  it('login options work usernameless (no handle)', async () => {
    const { adapter } = await setup();
    const r = await adapter.getAuthenticationOptions('');
    assert.ok(r.options);
    assert.equal(r.options.allowCredentials, undefined);
  });

  it('rejects unknown handle on login', async () => {
    const { adapter } = await setup();
    const r = await adapter.getAuthenticationOptions('bob');
    assert.equal(r.error, 'user-not-found');
    assert.equal(r.status, 404);
  });

  it('verifyAuthentication updates counter and creates session', async () => {
    const { adapter, stores } = await setup();
    const opts = await adapter.getAuthenticationOptions('alice');
    const r = await adapter.verifyAuthentication({
      id: 'CRED_ID_1',
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });
    assert.ok(r.ok);
    assert.equal(stores._raw.credentials.get('CRED_ID_1').counter, 7);
    assert.equal(stores._raw.sessions.size, 2); // register + login
  });

  it('rejects unknown credential', async () => {
    const { adapter } = await setup();
    const opts = await adapter.getAuthenticationOptions('alice');
    const r = await adapter.verifyAuthentication({
      id: 'BOGUS',
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });
    assert.equal(r.error, 'credential-not-found');
  });
});

describe('webauthnAdapter — sessions / cookies', () => {
  it('createSession + currentUser round-trip', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const opts = await adapter.getRegistrationOptions('alice');
    await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });

    const userId = [...stores._raw.users.values()][0].id;
    const token = await adapter.createSession(userId);

    const req = new Request('https://x/', { headers: { cookie: `bn_auth=${token}` } });
    const u = await adapter.currentUser(req);
    assert.equal(u.handle, 'alice');
  });

  it('destroySession invalidates lookup', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const opts = await adapter.getRegistrationOptions('alice');
    const result = await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });
    await adapter.destroySession(result.token);
    const req = new Request('https://x/', { headers: { cookie: `bn_auth=${result.token}` } });
    assert.equal(await adapter.currentUser(req), null);
  });

  it('cookie.set is HttpOnly + Secure + SameSite=Lax', () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const c = adapter.cookie.set('TOK');
    assert.match(c, /HttpOnly/);
    assert.match(c, /Secure/);
    assert.match(c, /SameSite=Lax/);
    assert.match(c, /Path=\//);
  });

  it('cookie.clear sets Max-Age=0', () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    assert.match(adapter.cookie.clear(), /Max-Age=0/);
  });

  it('secureCookie:false omits Secure', () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores(), secureCookie: false });
    assert.doesNotMatch(adapter.cookie.set('T'), /Secure/);
  });

  it('respects custom cookieName', () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores(), cookieName: 'my_sess' });
    assert.equal(adapter.cookieName, 'my_sess');
    assert.match(adapter.cookie.set('T'), /^my_sess=T/);
  });
});

describe('seedRoles', () => {
  let stores, user;
  beforeEach(() => {
    stores = makeStores();
    user = { id: 'u1', handle: 'alice', role: 'user' };
    stores._raw.users.set('u1', user);
  });

  it('upgrades a matched handle', async () => {
    const r = await seedRoles({
      stores,
      user,
      seedMap: { alice: 'admin' },
      changedBy: 'seed:env',
    });
    assert.equal(r.role, 'admin');
    assert.equal(stores._raw.users.get('u1').role, 'admin');
    assert.equal(stores._raw.users.get('u1').role_changed_by, 'seed:env');
  });

  it('no-op when handle missing', async () => {
    const r = await seedRoles({ stores, user, seedMap: { bob: 'admin' } });
    assert.equal(r.role, 'user');
  });

  it('no-op when already at target role', async () => {
    user.role = 'admin';
    let called = false;
    stores.users.setRole = async () => { called = true; };
    await seedRoles({ stores, user, seedMap: { alice: 'admin' } });
    assert.equal(called, false);
  });

  it('does not downgrade admin', async () => {
    user.role = 'admin';
    const r = await seedRoles({ stores, user, seedMap: { alice: 'moderator' } });
    assert.equal(r.role, 'admin');
  });

  it('parseHandleList parses csv', () => {
    assert.deepEqual(
      parseHandleList(' Alice, bob , ', 'admin'),
      { alice: 'admin', bob: 'admin' },
    );
    assert.deepEqual(parseHandleList(undefined, 'admin'), {});
  });
});

describe('handlers — error/success shapes', async () => {
  const { registerOptionsHandler, registerVerifyHandler, loginOptionsHandler,
    loginVerifyHandler, meHandler, logoutHandler } = await import('../src/handlers.js');

  function makeRequest(body, opts = {}) {
    return new Request('https://x/', {
      method: opts.method ?? 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: body == null ? undefined : JSON.stringify(body),
    });
  }

  it('registerOptions returns options on success', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const handler = registerOptionsHandler(() => adapter);
    const res = await handler({ request: makeRequest({ handle: 'alice' }), env: {} });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.challenge);
  });

  it('registerOptions returns { error } on bad handle', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const handler = registerOptionsHandler(() => adapter);
    const res = await handler({ request: makeRequest({ handle: 'A' }), env: {} });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'bad-handle');
  });

  it('registerVerify sets cookie + invokes onLogin hook', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const opts = await adapter.getRegistrationOptions('alice');
    let hookSeen = null;
    const handler = registerVerifyHandler(() => adapter, {
      onLogin: ({ userId }) => { hookSeen = userId; },
    });
    const res = await handler({
      request: makeRequest({
        attestation: { response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) } },
      }),
      env: {},
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie'), /bn_auth=/);
    assert.ok(hookSeen);
  });

  it('me returns null user when no cookie', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const handler = meHandler(() => adapter);
    const res = await handler({ request: makeRequest(null, { method: 'GET' }), env: {} });
    const body = await res.json();
    assert.equal(body.user, null);
  });

  it('me returns shaped user with isAdmin/isModerator', async () => {
    const stores = makeStores();
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores });
    const opts = await adapter.getRegistrationOptions('alice');
    const verify = await adapter.verifyRegistration({
      response: { clientDataJSON: makeClientDataJSON(opts.options.challenge) },
    });
    // promote to admin
    const userId = [...stores._raw.users.values()][0].id;
    await stores.users.setRole(userId, 'admin');

    const handler = meHandler(() => adapter);
    const res = await handler({
      request: makeRequest(null, {
        method: 'GET',
        headers: { cookie: `bn_auth=${verify.token}` },
      }),
      env: {},
    });
    const body = await res.json();
    assert.equal(body.user.handle, 'alice');
    assert.equal(body.user.role, 'admin');
    assert.equal(body.user.isAdmin, true);
    assert.equal(body.user.isModerator, true);
  });

  it('logout clears cookie even without session', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const handler = logoutHandler(() => adapter);
    const res = await handler({ request: makeRequest({}), env: {} });
    assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
  });

  it('loginOptions usernameless ok', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const handler = loginOptionsHandler(() => adapter);
    const res = await handler({ request: makeRequest({}), env: {} });
    assert.equal(res.status, 200);
  });

  it('loginVerify rejects missing assertion', async () => {
    const adapter = webauthnAdapter({ lib: FAKE_LIB, rp: RP, stores: makeStores() });
    const handler = loginVerifyHandler(() => adapter);
    const res = await handler({ request: makeRequest({}), env: {} });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'missing-assertion');
  });
});
