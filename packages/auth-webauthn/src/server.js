// Built with BaseNative — basenative.dev
/**
 * WebAuthn (passkey) server adapter for @basenative/auth.
 *
 * Compatible with the @basenative/auth provider shape (`type`, plus
 * methods this adapter exposes). The adapter is fully storage-agnostic:
 * pass in `stores` that satisfy the four-store interface (see README).
 *
 * Runs on any V8/Workers-class runtime — uses WebCrypto + atob/btoa, not
 * Node's `crypto` — so it works on Cloudflare Workers, Pages Functions,
 * and Node 18+ alike.
 */

/* The @simplewebauthn/server library is a peer dep — we resolve it lazily
   so this module loads cleanly when peers aren't installed (e.g. when a
   monorepo runs unit tests that inject a stub via opts.lib). */
let _libPromise = null;
async function loadLib() {
  if (!_libPromise) _libPromise = import('@simplewebauthn/server');
  return await _libPromise;
}

const HANDLE_RX = /^[a-z0-9_-]{2,24}$/;
const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEFAULT_CHALLENGE_TTL_SECONDS = 5 * 60; // 5 min — never longer
const DEFAULT_COOKIE_NAME = 'bn_auth';

export function normHandle(h) {
  return String(h ?? '').trim().toLowerCase();
}

export function validHandle(h) {
  return HANDLE_RX.test(h);
}

/* ── base64url helpers (V8/WebCrypto-safe — no Buffer) ─────────────── */
export function b64uToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Pack a UUID (with dashes) into 16 raw bytes for WebAuthn userID. */
export function userIdBytes(uuid) {
  const hex = String(uuid).replace(/-/g, '');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/* ── cookie helpers ────────────────────────────────────────────────── */
export function getCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setCookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (opts.secure !== false) parts.push('Secure');
  if (opts.maxAgeSeconds != null) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  return parts.join('; ');
}

export function clearCookieHeader(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;
}

/* ── adapter factory ───────────────────────────────────────────────── */

/**
 * Build a WebAuthn provider/adapter usable with @basenative/auth.
 *
 * @param {object}   opts
 * @param {object}   opts.rp                Relying-party config
 * @param {string}   opts.rp.rpName         Display name (e.g. "Acme")
 * @param {string}   opts.rp.rpID           Domain (e.g. "acme.com" or "localhost")
 * @param {string}   opts.rp.origin         Full origin (e.g. "https://acme.com")
 * @param {object}   opts.stores            Pluggable storage — see README
 * @param {object}   [opts.ttl]
 * @param {number}   [opts.ttl.sessionSeconds=2592000]   Session cookie TTL
 * @param {number}   [opts.ttl.challengeSeconds=300]     Challenge TTL (≤ 300)
 * @param {string}   [opts.cookieName='bn_auth']
 * @param {boolean}  [opts.secureCookie=true]
 */
export function webauthnAdapter(opts) {
  if (!opts?.rp?.rpID || !opts?.rp?.origin) {
    throw new Error('webauthnAdapter: rp.rpID and rp.origin are required');
  }
  if (!opts?.stores) {
    throw new Error('webauthnAdapter: stores are required');
  }

  const { rp, stores } = opts;
  const sessionTtl = opts.ttl?.sessionSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const challengeTtl = Math.min(
    opts.ttl?.challengeSeconds ?? DEFAULT_CHALLENGE_TTL_SECONDS,
    DEFAULT_CHALLENGE_TTL_SECONDS,
  );
  const cookieName = opts.cookieName ?? DEFAULT_COOKIE_NAME;
  const secureCookie = opts.secureCookie !== false;

  validateStores(stores);

  // Allow tests / unusual setups to inject the WebAuthn primitives directly
  // (must export `generateRegistrationOptions`, `verifyRegistrationResponse`,
  // `generateAuthenticationOptions`, `verifyAuthenticationResponse`). Default
  // to the peer-dep dynamic import.
  const getLib = opts.lib ? async () => opts.lib : loadLib;

  return {
    type: 'webauthn',
    cookieName,

    /** Get registration options for a handle (creates the user if new). */
    async getRegistrationOptions(rawHandle) {
      const handle = normHandle(rawHandle);
      if (!validHandle(handle)) {
        return { error: 'bad-handle', status: 400 };
      }

      let user = await stores.users.getByHandle(handle);
      if (!user) {
        user = await stores.users.create({ id: cryptoUUID(), handle });
      }

      const existing = await stores.credentials.listByUser(user.id);
      const excludeCredentials = existing.map((c) => ({
        id: c.id,
        transports: c.transports,
      }));

      const lib = await getLib();
      const options = await lib.generateRegistrationOptions({
        rpName: rp.rpName ?? rp.rpID,
        rpID: rp.rpID,
        userID: userIdBytes(user.id),
        userName: handle,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await stores.challenges.create({
        challenge: options.challenge,
        userId: user.id,
        purpose: 'register',
        ttlSeconds: challengeTtl,
      });

      return { options };
    },

    /** Verify a registration attestation; on success, returns sessionToken. */
    async verifyRegistration(attestation) {
      if (!attestation?.response?.clientDataJSON) {
        return { error: 'missing-attestation', status: 400 };
      }

      const challenge = parseChallenge(attestation.response.clientDataJSON);
      if (!challenge) return { error: 'bad-challenge', status: 400 };

      const ch = await stores.challenges.consume(challenge, 'register');
      if (!ch) return { error: 'challenge-not-found', status: 400 };

      const lib = await getLib();
      let verification;
      try {
        verification = await lib.verifyRegistrationResponse({
          response: attestation,
          expectedChallenge: challenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.rpID,
          requireUserVerification: false,
        });
      } catch (e) {
        return { error: `verification-failed: ${e.message}`, status: 400 };
      }

      if (!verification.verified || !verification.registrationInfo) {
        return { error: 'not-verified', status: 400 };
      }

      const ri = verification.registrationInfo;
      const credId = ri.credential?.id || ri.credentialID;
      const pubKey = ri.credential?.publicKey || ri.credentialPublicKey;

      await stores.credentials.create({
        id: typeof credId === 'string' ? credId : bytesToB64u(credId),
        userId: ch.userId,
        publicKey: bytesToB64u(pubKey),
        counter: ri.credential?.counter ?? ri.counter ?? 0,
        transports: attestation.response?.transports ?? undefined,
      });

      const token = await this.createSession(ch.userId);
      return { ok: true, userId: ch.userId, token };
    },

    /** Get authentication options. If handle given, restrict allowCredentials. */
    async getAuthenticationOptions(rawHandle) {
      const handle = normHandle(rawHandle);
      let allowCredentials;
      let userId = null;

      if (handle) {
        if (!validHandle(handle)) return { error: 'bad-handle', status: 400 };
        const u = await stores.users.getByHandle(handle);
        if (!u) return { error: 'user-not-found', status: 404 };
        userId = u.id;
        const creds = await stores.credentials.listByUser(u.id);
        allowCredentials = creds.map((c) => ({ id: c.id, transports: c.transports }));
      }

      const lib = await getLib();
      const options = await lib.generateAuthenticationOptions({
        rpID: rp.rpID,
        userVerification: 'preferred',
        allowCredentials,
      });

      await stores.challenges.create({
        challenge: options.challenge,
        userId,
        purpose: 'authenticate',
        ttlSeconds: challengeTtl,
      });

      return { options };
    },

    /** Verify an assertion; on success, returns sessionToken + user. */
    async verifyAuthentication(assertion) {
      if (!assertion?.id) return { error: 'missing-assertion', status: 400 };
      if (!assertion?.response?.clientDataJSON) {
        return { error: 'missing-assertion', status: 400 };
      }

      const challenge = parseChallenge(assertion.response.clientDataJSON);
      if (!challenge) return { error: 'bad-challenge', status: 400 };

      const ch = await stores.challenges.consume(challenge, 'authenticate');
      if (!ch) return { error: 'challenge-not-found', status: 400 };

      const cred = await stores.credentials.getById(assertion.id);
      if (!cred) return { error: 'credential-not-found', status: 404 };

      const lib = await getLib();
      let verification;
      try {
        verification = await lib.verifyAuthenticationResponse({
          response: assertion,
          expectedChallenge: challenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.rpID,
          credential: {
            id: cred.id,
            publicKey: b64uToBytes(cred.publicKey),
            counter: cred.counter,
            transports: cred.transports,
          },
          requireUserVerification: false,
        });
      } catch (e) {
        return { error: `verification-failed: ${e.message}`, status: 400 };
      }

      if (!verification.verified) return { error: 'not-verified', status: 400 };

      const newCounter = verification.authenticationInfo?.newCounter ?? cred.counter;
      await stores.credentials.updateCounter(cred.id, newCounter);

      const token = await this.createSession(cred.userId);
      const user = await stores.users.getById(cred.userId);
      return { ok: true, userId: cred.userId, user, token };
    },

    async createSession(userId) {
      const id = cryptoUUID();
      await stores.userSessions.create({ id, userId, ttlSeconds: sessionTtl });
      return id;
    },

    async destroySession(token) {
      if (!token) return;
      await stores.userSessions.destroy(token);
    },

    async currentUser(request) {
      const tok = getCookie(request, cookieName);
      if (!tok) return null;
      return await stores.userSessions.getUser(tok);
    },

    /* Helpers exposed for handlers / consumers — same convention as
       t4bs's _shared/util.js setCookie/clearCookie. */
    cookie: {
      name: cookieName,
      set(value) {
        return setCookieHeader(cookieName, value, {
          secure: secureCookie,
          maxAgeSeconds: sessionTtl,
        });
      },
      clear() {
        return clearCookieHeader(cookieName);
      },
    },

    /* Expose for tests / debugging only. */
    _config: { rp, sessionTtl, challengeTtl, cookieName, secureCookie },
  };
}

/* ── helpers ───────────────────────────────────────────────────────── */

function parseChallenge(clientDataJSON) {
  try {
    const json = atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).challenge ?? null;
  } catch {
    return null;
  }
}

function cryptoUUID() {
  // crypto.randomUUID exists on V8 Workers, Node 19+, modern browsers.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Last-resort fallback (shouldn't be hit in supported runtimes).
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function validateStores(stores) {
  const required = {
    users: ['getByHandle', 'getById', 'create'],
    credentials: ['listByUser', 'getById', 'create', 'updateCounter'],
    challenges: ['create', 'consume'],
    userSessions: ['create', 'getUser', 'destroy'],
  };
  for (const [name, methods] of Object.entries(required)) {
    const s = stores[name];
    if (!s) throw new Error(`webauthnAdapter: missing store "${name}"`);
    for (const m of methods) {
      if (typeof s[m] !== 'function') {
        throw new Error(`webauthnAdapter: stores.${name}.${m}() is required`);
      }
    }
  }
}

// Re-exports so consumers don't have to import multiple sub-paths.
export { d1WebAuthnStores } from './d1-stores.js';
export { seedRoles } from './seed-role.js';
