// Built with BaseNative — basenative.dev
/**
 * Drop-in Cloudflare Pages Functions / Workers handlers for the six
 * canonical passkey endpoints. Consumers re-export from
 * `functions/api/auth/<name>.js` (Pages) or wire into a router (Workers).
 *
 * Each handler factory takes a `getAdapter(env)` function so consumers
 * can build the adapter once per request from their bindings:
 *
 *     // functions/api/auth/register-options.js
 *     import { registerOptionsHandler } from '@basenative/auth-webauthn/handlers';
 *     import { webauthnAdapter, d1WebAuthnStores } from '@basenative/auth-webauthn';
 *
 *     export const onRequestPost = registerOptionsHandler((env) =>
 *       webauthnAdapter({
 *         rp: { rpName: env.RP_NAME, rpID: env.RP_ID, origin: env.RP_ORIGIN },
 *         stores: d1WebAuthnStores(env.DB),
 *       })
 *     );
 *
 * Error shape is consistent: `{ error: 'reason' }` with the proper status.
 */

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });

const errResponse = (message, status = 400) => json({ error: message }, status);

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function unwrap(result) {
  // Adapter methods return either { ...ok } or { error, status }.
  if (result?.error) return errResponse(result.error, result.status ?? 400);
  return null;
}

/* ── handler factories ──────────────────────────────────────────────── */

export function registerOptionsHandler(getAdapter) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const body = await readJson(request);
    const result = await adapter.getRegistrationOptions(body.handle);
    const errResp = unwrap(result);
    if (errResp) return errResp;
    return json(result.options);
  };
}

export function registerVerifyHandler(getAdapter, hooks = {}) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const body = await readJson(request);
    const result = await adapter.verifyRegistration(body.attestation);
    const errResp = unwrap(result);
    if (errResp) return errResp;

    if (typeof hooks.onLogin === 'function') {
      await safe(() => hooks.onLogin({ env, userId: result.userId, adapter }));
    }
    return json({ ok: true }, 200, { 'Set-Cookie': adapter.cookie.set(result.token) });
  };
}

export function loginOptionsHandler(getAdapter) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const body = await readJson(request);
    const result = await adapter.getAuthenticationOptions(body.handle);
    const errResp = unwrap(result);
    if (errResp) return errResp;
    return json(result.options);
  };
}

export function loginVerifyHandler(getAdapter, hooks = {}) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const body = await readJson(request);
    const result = await adapter.verifyAuthentication(body.assertion);
    const errResp = unwrap(result);
    if (errResp) return errResp;

    if (typeof hooks.onLogin === 'function') {
      await safe(() =>
        hooks.onLogin({ env, userId: result.userId, user: result.user, adapter }),
      );
    }
    return json({ ok: true }, 200, { 'Set-Cookie': adapter.cookie.set(result.token) });
  };
}

export function meHandler(getAdapter, options = {}) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const u = await adapter.currentUser(request);
    if (!u) return json({ user: null });

    const shape = options.shape ?? defaultMeShape;
    return json({ user: shape(u) });
  };
}

export function logoutHandler(getAdapter) {
  return async ({ request, env }) => {
    const adapter = getAdapter(env);
    const cookieValue = readCookie(request, adapter.cookieName);
    if (cookieValue) await adapter.destroySession(cookieValue);
    return json({ ok: true }, 200, { 'Set-Cookie': adapter.cookie.clear() });
  };
}

/* ── helpers ────────────────────────────────────────────────────────── */

function defaultMeShape(u) {
  const role = u.role || 'user';
  return {
    id: u.id,
    handle: u.handle,
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'admin' || role === 'moderator',
  };
}

function readCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function safe(fn) {
  try {
    return await fn();
  } catch {
    // Swallow hook errors — never break auth on a hook failure.
    // Consumers can do their own logging inside the hook if they care.
    return null;
  }
}
