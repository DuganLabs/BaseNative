// Built with BaseNative — basenative.dev
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPasskeySupported,
  isPlatformPasskeySupported,
  registerPasskey,
  loginPasskey,
  me,
  logout,
} from '../src/client.js';

/* Inject these via opts.lib instead of mocking the peer dep (which isn't
   installed in the basenative monorepo and isn't needed in node anyway). */
const FAKE_LIB = {
  startRegistration: async ({ optionsJSON }) => ({
    id: 'CRED_ID_1',
    response: { clientDataJSON: 'fake-client-data', _from: optionsJSON },
  }),
  startAuthentication: async ({ optionsJSON }) => ({
    id: 'CRED_ID_1',
    response: { clientDataJSON: 'fake-client-data', _from: optionsJSON },
  }),
};

/* ── fake fetch ─────────────────────────────────────────────────────── */
let originalFetch;
let calls;
let fetchMap;

function setRoutes(routes) {
  fetchMap = routes;
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: typeof url === 'string' ? url : url.url, init });
    const handler = fetchMap[url] || fetchMap['*'];
    if (!handler) {
      return new Response(JSON.stringify({ error: 'no-route' }), { status: 404 });
    }
    return handler(url, init);
  };
}

beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

/* ─────────────────────────────────────────────────────────────────── */

describe('isPasskeySupported', () => {
  it('false in node', () => {
    assert.equal(isPasskeySupported(), false);
  });

  it('true when window.PublicKeyCredential exists', () => {
    const oldWindow = globalThis.window;
    globalThis.window = { PublicKeyCredential: function () {} };
    try {
      assert.equal(isPasskeySupported(), true);
    } finally {
      globalThis.window = oldWindow;
    }
  });

  it('isPlatformPasskeySupported returns false when no window', async () => {
    assert.equal(await isPlatformPasskeySupported(), false);
  });
});

describe('registerPasskey', () => {
  it('calls options → verify → me, in that order', async () => {
    setRoutes({
      '/api/auth/register-options': () =>
        new Response(JSON.stringify({ challenge: 'X', rp: { id: 'localhost' } })),
      '/api/auth/register-verify': () =>
        new Response(JSON.stringify({ ok: true })),
      '/api/auth/me': () =>
        new Response(JSON.stringify({ user: { handle: 'alice' } })),
    });

    const result = await registerPasskey('alice', { lib: FAKE_LIB });
    assert.equal(result.user.handle, 'alice');
    assert.deepEqual(
      calls.map((c) => c.url),
      ['/api/auth/register-options', '/api/auth/register-verify', '/api/auth/me'],
    );
  });

  it('throws with server error message on 4xx', async () => {
    setRoutes({
      '/api/auth/register-options': () =>
        new Response(JSON.stringify({ error: 'bad-handle' }), { status: 400 }),
    });
    await assert.rejects(
      () => registerPasskey('A', { lib: FAKE_LIB }),
      (err) => err.message === 'bad-handle' && err.status === 400,
    );
  });

  it('honors custom paths', async () => {
    setRoutes({
      '/auth/reg-opts': () => new Response(JSON.stringify({ challenge: 'X' })),
      '/auth/reg-ver': () => new Response(JSON.stringify({ ok: true })),
      '/auth/who': () => new Response(JSON.stringify({ user: { handle: 'a' } })),
    });
    await registerPasskey('alice', {
      lib: FAKE_LIB,
      paths: {
        registerOptions: '/auth/reg-opts',
        registerVerify: '/auth/reg-ver',
        me: '/auth/who',
      },
    });
    assert.deepEqual(
      calls.map((c) => c.url),
      ['/auth/reg-opts', '/auth/reg-ver', '/auth/who'],
    );
  });

  it('sends credentials: same-origin by default', async () => {
    setRoutes({
      '*': () => new Response(JSON.stringify({})),
    });
    await registerPasskey('alice', { lib: FAKE_LIB }).catch(() => {});
    assert.equal(calls[0].init.credentials, 'same-origin');
  });
});

describe('loginPasskey', () => {
  it('calls options → verify → me', async () => {
    setRoutes({
      '/api/auth/login-options': () =>
        new Response(JSON.stringify({ challenge: 'X' })),
      '/api/auth/login-verify': () =>
        new Response(JSON.stringify({ ok: true })),
      '/api/auth/me': () =>
        new Response(JSON.stringify({ user: { handle: 'alice' } })),
    });
    const r = await loginPasskey('alice', { lib: FAKE_LIB });
    assert.equal(r.user.handle, 'alice');
    assert.equal(calls.length, 3);
  });

  it('passes empty handle for usernameless', async () => {
    setRoutes({
      '*': () => new Response(JSON.stringify({})),
    });
    await loginPasskey('', { lib: FAKE_LIB }).catch(() => {});
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.handle, '');
  });
});

describe('me / logout', () => {
  it('me returns server payload', async () => {
    setRoutes({
      '/api/auth/me': () => new Response(JSON.stringify({ user: null })),
    });
    const r = await me();
    assert.deepEqual(r, { user: null });
  });

  it('logout POSTs', async () => {
    setRoutes({
      '/api/auth/logout': () => new Response(JSON.stringify({ ok: true })),
    });
    await logout();
    assert.equal(calls[0].init.method, 'POST');
  });
});
