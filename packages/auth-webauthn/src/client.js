// Built with BaseNative — basenative.dev
/**
 * Browser-side passkey helpers.
 *
 * Thin wrapper around @simplewebauthn/browser's `startRegistration`/
 * `startAuthentication` plus fetch calls to the canonical /api/auth/*
 * endpoints (paths configurable). No other dependencies — keep this lean.
 */

/* @simplewebauthn/browser is loaded lazily so unit tests / non-browser
   bundlers can import this module without the peer dep being installed. */
let _libPromise = null;
async function loadLib() {
  if (!_libPromise) _libPromise = import('@simplewebauthn/browser');
  return await _libPromise;
}

const DEFAULT_PATHS = {
  registerOptions: '/api/auth/register-options',
  registerVerify: '/api/auth/register-verify',
  loginOptions: '/api/auth/login-options',
  loginVerify: '/api/auth/login-verify',
  me: '/api/auth/me',
  logout: '/api/auth/logout',
};

/** True iff the browser exposes the WebAuthn API. */
export function isPasskeySupported() {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/** Some browsers (Safari, Firefox-no-PRF) report yes for one path but not
 *  platform-bound passkeys. Returns true if a platform authenticator is
 *  available and resident-key creation is plausible.
 */
export async function isPlatformPasskeySupported() {
  if (!isPasskeySupported()) return false;
  try {
    const fn = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof fn !== 'function') return false;
    return await fn.call(window.PublicKeyCredential);
  } catch {
    return false;
  }
}

/**
 * Register a new passkey for `handle`.
 *
 * @param {string} handle
 * @param {object} [opts]
 * @param {object} [opts.paths]    Override endpoint paths.
 * @param {RequestInit} [opts.fetchInit]   Extra fetch options (headers, etc.).
 * @returns {Promise<object>} The /me response payload.
 */
export async function registerPasskey(handle, opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  const init = opts.fetchInit || {};

  const lib = opts.lib || (await loadLib());
  const options = await postJson(paths.registerOptions, { handle }, init);
  const attestation = await lib.startRegistration({ optionsJSON: options });
  await postJson(paths.registerVerify, { attestation }, init);
  return await getJson(paths.me, init);
}

/**
 * Log in via passkey. `handle` may be empty for usernameless flows
 * (the user picks a passkey from the OS prompt).
 */
export async function loginPasskey(handle, opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  const init = opts.fetchInit || {};

  const lib = opts.lib || (await loadLib());
  const options = await postJson(paths.loginOptions, { handle: handle || '' }, init);
  const assertion = await lib.startAuthentication({ optionsJSON: options });
  await postJson(paths.loginVerify, { assertion }, init);
  return await getJson(paths.me, init);
}

/** Get the current user (or `{ user: null }`). */
export async function me(opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  return await getJson(paths.me, opts.fetchInit || {});
}

/** Log out and clear the session cookie. */
export async function logout(opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  return await postJson(paths.logout, {}, opts.fetchInit || {});
}

/* ── tiny fetch helpers (no library — stay minimal) ─────────────────── */

async function postJson(url, body, init = {}) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  return await unwrap(res);
}

async function getJson(url, init = {}) {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    ...init,
  });
  return await unwrap(res);
}

async function unwrap(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response — surface a generic error if status is bad.
  }
  if (!res.ok) {
    const msg = data?.error || `request-failed-${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
