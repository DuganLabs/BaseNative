import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  securityHeaders,
  securityHeadersMiddleware,
  buildSecurityHeaders,
  createNonce,
  DEFAULT_CSP,
  DEFAULT_PERMISSIONS,
} from './security-headers.js';

/* ------------------------------------------------------------- helpers */

function ok(body = null, init = {}) {
  return new Response(body, init);
}

/**
 * Exact membership in a parsed directive's source list.
 *
 * Not `sources.includes(...)`. parseCsp returns an ARRAY, so Array#includes is
 * already an exact comparison — but CodeQL reads `.includes` next to an https://
 * literal as substring URL matching and files "Incomplete URL substring
 * sanitization" against it. There is no sanitization here at all; it is a test
 * assertion. Spelling the comparison out silences a false positive and says
 * plainly that a CSP source must match whole, which is the property that
 * matters: 'https://evil.com/https://api.example.com' must never satisfy it.
 */
function hasSource(csp, directive, source) {
  return (csp[directive] ?? []).some((s) => s === source);
}

/** Parse a CSP header back into { directive: [sources] } so tests can assert
 *  on structure instead of on a serialized string. */
function parseCsp(header) {
  const directives = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    directives[name] = sources;
  }
  return directives;
}

/** Parse Permissions-Policy back into { feature: [origins] }. */
function parsePermissions(header) {
  const features = {};
  for (const part of header.split(',')) {
    const match = /^\s*([a-z-]+)=\((.*)\)\s*$/.exec(part);
    assert.ok(match, `unparseable Permissions-Policy entry: ${JSON.stringify(part)}`);
    features[match[1]] = match[2].length === 0 ? [] : match[2].split(/\s+/);
  }
  return features;
}

function nonceOf(cspHeader) {
  const match = /'nonce-([^']+)'/.exec(cspHeader);
  return match?.[1] ?? null;
}

/** A Response whose headers refuse mutation, like the one `env.ASSETS.fetch()`
 *  hands back. Any implementation that writes through to the input throws. */
function immutable(body = null, init = {}) {
  const response = new Response(body, init);
  const real = response.headers;
  const guarded = new Proxy(real, {
    get(target, prop) {
      if (prop === 'set' || prop === 'append' || prop === 'delete') {
        return () => {
          throw new TypeError('immutable headers');
        };
      }
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return new Proxy(response, {
    get(target, prop) {
      if (prop === 'headers') return guarded;
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/* --------------------------------------------------------------- baseline */

describe('securityHeaders — baseline', () => {
  it('sets a hardening header set on a response that had none', () => {
    const res = securityHeaders()(ok());
    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]) {
      assert.ok(res.headers.get(name), `${name} missing`);
    }
  });

  it('denies framing and restricts base-uri and form-action by default', () => {
    const csp = parseCsp(securityHeaders()(ok()).headers.get('Content-Security-Policy'));
    assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
    assert.deepEqual(csp['base-uri'], ["'self'"]);
    assert.deepEqual(csp['form-action'], ["'self'"]);
  });

  it('never emits unsafe-inline or unsafe-eval unless the caller asks for it', () => {
    const header = securityHeaders()(ok()).headers.get('Content-Security-Policy');
    assert.doesNotMatch(header, /unsafe-inline|unsafe-eval/);
  });

  it('always sends nosniff — there is no option to turn it off', () => {
    assert.equal(securityHeaders()(ok()).headers.get('X-Content-Type-Options'), 'nosniff');
  });

  it('does not index by default, and opts in on request', () => {
    assert.equal(securityHeaders()(ok()).headers.get('X-Robots-Tag'), null);
    assert.match(
      securityHeaders({ noindex: true })(ok()).headers.get('X-Robots-Tag'),
      /noindex/,
    );
  });
});

/* --------------------------------------------------------------- CSP merge */

describe('securityHeaders — CSP merging', () => {
  it('adds a caller source without dropping the baseline sources for that directive', () => {
    const res = securityHeaders({
      csp: { 'connect-src': ['https://api.example.com'] },
    })(ok());
    const csp = parseCsp(res.headers.get('Content-Security-Policy'));
    assert.ok(hasSource(csp, 'connect-src', 'https://api.example.com'));
    for (const baseline of DEFAULT_CSP['connect-src']) {
      assert.ok(
        hasSource(csp, 'connect-src', baseline),
        `lost baseline source ${baseline}`,
      );
    }
  });

  it('leaves every directive the caller did not mention exactly as the baseline has it', () => {
    const res = securityHeaders({ csp: { 'script-src': ['https://cdn.example.com'] } })(ok());
    const csp = parseCsp(res.headers.get('Content-Security-Policy'));
    for (const [name, sources] of Object.entries(DEFAULT_CSP)) {
      if (name === 'script-src') continue;
      assert.deepEqual(csp[name] ?? [], [...sources], `directive ${name} changed`);
    }
  });

  it('does not duplicate a source the baseline already carries', () => {
    const csp = parseCsp(
      securityHeaders({ csp: { 'img-src': ['data:', "'self'", 'https://cdn.example.com'] } })(
        ok(),
      ).headers.get('Content-Security-Policy'),
    );
    assert.equal(new Set(csp['img-src']).size, csp['img-src'].length);
  });

  it('adds a directive the baseline does not have', () => {
    const csp = parseCsp(
      securityHeaders({ csp: { 'frame-src': ['https://cdn.plaid.com'] } })(ok()).headers.get(
        'Content-Security-Policy',
      ),
    );
    assert.deepEqual(csp['frame-src'], ['https://cdn.plaid.com']);
  });

  it('removes a directive only when the caller names it with null', () => {
    const csp = parseCsp(
      securityHeaders({ csp: { 'upgrade-insecure-requests': null } })(ok()).headers.get(
        'Content-Security-Policy',
      ),
    );
    assert.ok(!('upgrade-insecure-requests' in csp));
    assert.ok('frame-ancestors' in csp);
  });

  it('serializes a valueless directive bare and a sourced directive with its sources', () => {
    const header = securityHeaders()(ok()).headers.get('Content-Security-Policy');
    const csp = parseCsp(header);
    assert.deepEqual(csp['upgrade-insecure-requests'], []);
    for (const [name, sources] of Object.entries(csp)) {
      if (DEFAULT_CSP[name] && DEFAULT_CSP[name].length > 0) {
        assert.ok(sources.length > 0, `${name} serialized without its sources`);
      }
    }
  });

  it('round-trips: every directive parses back to the sources it was built from', () => {
    const options = {
      csp: { 'connect-src': ['https://a.example', 'https://b.example'], 'frame-src': ["'none'"] },
    };
    const csp = parseCsp(
      securityHeaders(options)(ok()).headers.get('Content-Security-Policy'),
    );
    assert.deepEqual(csp['connect-src'], ["'self'", 'https://a.example', 'https://b.example']);
    assert.deepEqual(csp['frame-src'], ["'none'"]);
  });

  it('omits the CSP entirely when csp is false, and keeps the other headers', () => {
    const res = securityHeaders({ csp: false })(ok());
    assert.equal(res.headers.get('Content-Security-Policy'), null);
    assert.ok(res.headers.get('X-Frame-Options'));
    assert.ok(res.headers.get('Strict-Transport-Security'));
  });

  it('rejects a source list that is not an array', () => {
    assert.throws(
      () => securityHeaders({ csp: { 'connect-src': 'https://api.example.com' } }),
      /must be an array/,
    );
  });

  it('rejects a source containing ";", which would inject a second directive', () => {
    assert.throws(
      () => securityHeaders({ csp: { 'img-src': ["https://x.example; script-src 'unsafe-inline'"] } }),
      /contains ";"/,
    );
  });
});

/* ------------------------------------------------------------------ nonce */

describe('securityHeaders — nonce', () => {
  it('generates a different nonce for every response', () => {
    const harden = securityHeaders({ nonce: true });
    const a = nonceOf(harden(ok()).headers.get('Content-Security-Policy'));
    const b = nonceOf(harden(ok()).headers.get('Content-Security-Policy'));
    assert.ok(a);
    assert.ok(b);
    assert.notEqual(a, b);
  });

  it('generates a nonce with at least 128 bits of entropy', () => {
    const nonce = nonceOf(securityHeaders({ nonce: true })(ok()).headers.get('Content-Security-Policy'));
    assert.ok(Buffer.from(nonce, 'base64').length >= 16, `nonce decoded to ${nonce.length} chars`);
  });

  it('places the nonce on script-src, and only once', () => {
    const header = securityHeaders({ nonce: true })(ok()).headers.get('Content-Security-Policy');
    const csp = parseCsp(header);
    assert.equal(csp['script-src'].filter((s) => s.startsWith("'nonce-")).length, 1);
    assert.equal(header.match(/'nonce-/g).length, 1);
  });

  it('honours nonceDirectives so a nonce can also cover inline styles', () => {
    const csp = parseCsp(
      securityHeaders({ nonce: true, nonceDirectives: ['script-src', 'style-src'] })(
        ok(),
      ).headers.get('Content-Security-Policy'),
    );
    assert.ok(csp['script-src'].some((s) => s.startsWith("'nonce-")));
    assert.ok(csp['style-src'].some((s) => s.startsWith("'nonce-")));
  });

  it('uses the caller-supplied nonce verbatim, so header and body can agree', () => {
    const nonce = createNonce();
    const header = securityHeaders({ nonce: true })(ok(), { nonce }).headers.get(
      'Content-Security-Policy',
    );
    assert.equal(nonceOf(header), nonce);
  });

  it('refuses a supplied nonce when nonce is off, rather than dropping it silently', () => {
    assert.throws(() => securityHeaders()(ok(), { nonce: createNonce() }), /nonce: true/);
  });

  it('refuses a nonce with no CSP to carry it', () => {
    assert.throws(() => securityHeaders({ csp: false, nonce: true }), /csp is false/);
  });

  it('refuses a nonce whose target directive was removed', () => {
    assert.throws(
      () => securityHeaders({ nonce: true, csp: { 'script-src': null } }),
      /not present/,
    );
  });

  it('createNonce refuses fewer than 128 bits', () => {
    assert.throws(() => createNonce(8), /at least 16/);
  });
});

/* ----------------------------------------------------- Permissions-Policy */

describe('securityHeaders — Permissions-Policy', () => {
  it('denies every default feature with an empty allow-list', () => {
    const features = parsePermissions(securityHeaders()(ok()).headers.get('Permissions-Policy'));
    for (const name of Object.keys(DEFAULT_PERMISSIONS)) {
      assert.deepEqual(features[name], [], `${name} is not denied`);
    }
  });

  it('ships no feature name browsers do not recognize', () => {
    // The defaults previously carried `bluetooth`, which is not a registered
    // feature: browsers ignored it and logged a warning on every response.
    // Whatever the default set becomes, every name in it must be one the
    // package is willing to accept from a caller.
    const features = parsePermissions(securityHeaders()(ok()).headers.get('Permissions-Policy'));
    for (const name of Object.keys(features)) {
      assert.doesNotThrow(
        () => securityHeaders({ permissions: { [name]: [] } }),
        `default feature "${name}" would be rejected if a caller passed it`,
      );
    }
  });

  it('replaces one feature allow-list and leaves the other denials standing', () => {
    const features = parsePermissions(
      securityHeaders({ permissions: { camera: ['self'] } })(ok()).headers.get(
        'Permissions-Policy',
      ),
    );
    assert.deepEqual(features.camera, ['self']);
    assert.deepEqual(features.microphone, []);
    assert.deepEqual(features.geolocation, []);
  });

  it('adds a feature the defaults do not mention', () => {
    const features = parsePermissions(
      securityHeaders({
        permissions: { 'publickey-credentials-get': ['self'], 'publickey-credentials-create': ['self'] },
      })(ok()).headers.get('Permissions-Policy'),
    );
    assert.deepEqual(features['publickey-credentials-get'], ['self']);
    assert.deepEqual(features['publickey-credentials-create'], ['self']);
  });

  it('quotes origins and leaves self and * bare, per the structured-header grammar', () => {
    const header = securityHeaders({
      permissions: { camera: ['self', 'https://embed.example.com'] },
    })(ok()).headers.get('Permissions-Policy');
    assert.match(header, /camera=\(self "https:\/\/embed\.example\.com"\)/);
  });

  it('drops a feature when the caller passes null', () => {
    const features = parsePermissions(
      securityHeaders({ permissions: { usb: null } })(ok()).headers.get('Permissions-Policy'),
    );
    assert.ok(!('usb' in features));
  });

  it('rejects an unregistered feature name at construction time', () => {
    assert.throws(
      () => securityHeaders({ permissions: { bluetooth: [] } }),
      /not a registered Permissions-Policy feature/,
    );
  });
});

/* ------------------------------------------------------------------- HSTS */

describe('securityHeaders — HSTS', () => {
  it('defaults to a year with includeSubDomains and no preload claim', () => {
    const hsts = securityHeaders()(ok()).headers.get('Strict-Transport-Security');
    assert.ok(Number(/max-age=(\d+)/.exec(hsts)[1]) >= 31_536_000);
    assert.match(hsts, /includeSubDomains/);
    assert.doesNotMatch(hsts, /preload/);
  });

  it('omits the header when hsts is false', () => {
    assert.equal(
      securityHeaders({ hsts: false })(ok()).headers.get('Strict-Transport-Security'),
      null,
    );
  });

  it('emits preload when asked and the directive qualifies', () => {
    const hsts = securityHeaders({ hsts: { preload: true } })(ok()).headers.get(
      'Strict-Transport-Security',
    );
    assert.match(hsts, /preload/);
    assert.match(hsts, /includeSubDomains/);
  });

  it('refuses preload without includeSubDomains — the list rejects it', () => {
    assert.throws(
      () => securityHeaders({ hsts: { preload: true, includeSubDomains: false } }),
      /requires hsts\.includeSubDomains/,
    );
  });

  it('refuses preload with a max-age the list rejects', () => {
    assert.throws(
      () => securityHeaders({ hsts: { preload: true, maxAge: 600 } }),
      /at least 31536000/,
    );
  });

  it('accepts a short max-age when preload is not claimed', () => {
    assert.match(
      securityHeaders({ hsts: { maxAge: 600 } })(ok()).headers.get('Strict-Transport-Security'),
      /max-age=600/,
    );
  });
});

/* ------------------------------------------------------- response handling */

describe('securityHeaders — response handling', () => {
  it('preserves status, statusText and body', async () => {
    const res = securityHeaders()(
      ok('{"x":1}', {
        status: 418,
        statusText: 'I am a teapot',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    assert.equal(res.status, 418);
    assert.equal(res.statusText, 'I am a teapot');
    assert.equal(await res.text(), '{"x":1}');
  });

  it('preserves headers it does not own', () => {
    const res = securityHeaders()(
      ok('body', { headers: { 'X-Request-Id': 'abc123', 'Content-Type': 'text/plain' } }),
    );
    assert.equal(res.headers.get('X-Request-Id'), 'abc123');
    assert.equal(res.headers.get('Content-Type'), 'text/plain');
  });

  it('does not mutate the incoming response — ASSETS.fetch() headers are immutable', () => {
    const source = immutable('<!doctype html>', { headers: { 'Content-Type': 'text/html' } });
    const res = securityHeaders()(source);
    assert.ok(res.headers.get('Content-Security-Policy'));
    assert.equal(source.headers.get('Content-Security-Policy'), null);
  });

  it('handles statuses the Fetch spec forbids a body on', () => {
    for (const status of [204, 304]) {
      const res = securityHeaders()(ok(null, { status }));
      assert.equal(res.status, status);
      assert.ok(res.headers.get('Content-Security-Policy'));
    }
  });

  it('is idempotent apart from the nonce', () => {
    const harden = securityHeaders();
    const once = harden(ok('x', { headers: { 'Content-Type': 'text/plain' } }));
    const twice = harden(once);
    assert.deepEqual([...twice.headers].sort(), [...once.headers].sort());
  });
});

/* ------------------------------------------------------------ cache stance */

describe('securityHeaders — cache', () => {
  it('applies the directive the callback returns', () => {
    const harden = securityHeaders({
      cache: ({ contentType }) =>
        contentType.startsWith('application/json') ? 'private, no-store' : null,
    });
    const res = harden(ok('{}', { headers: { 'Content-Type': 'application/json' } }));
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  });

  it('leaves an existing Cache-Control alone when the callback returns null', () => {
    const harden = securityHeaders({ cache: () => null });
    const res = harden(
      ok('<html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' } }),
    );
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=3600');
  });

  it('overrides an existing Cache-Control when the callback returns a string', () => {
    const harden = securityHeaders({ cache: () => 'private, max-age=0, must-revalidate' });
    const res = harden(ok('<html>', { headers: { 'Cache-Control': 'public, max-age=3600' } }));
    assert.equal(res.headers.get('Cache-Control'), 'private, max-age=0, must-revalidate');
  });

  it('gives the callback the content type, status and request', () => {
    let seen;
    const request = new Request('https://example.com/api/thing');
    securityHeaders({
      cache: (info) => {
        seen = info;
        return null;
      },
    })(ok('{}', { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }), {
      request,
    });
    assert.match(seen.contentType, /^application\/json/);
    assert.equal(seen.status, 201);
    assert.equal(seen.request, request);
  });

  it('rejects a non-function cache option', () => {
    assert.throws(() => securityHeaders({ cache: 'no-store' }), /must be a function/);
  });
});

/* ----------------------------------------------------------------- options */

describe('securityHeaders — option validation', () => {
  it('rejects an unknown option rather than silently dropping a header', () => {
    assert.throws(() => securityHeaders({ contentSecurityPolicy: {} }), /unknown option/);
  });

  it('rejects an array where a csp object is expected', () => {
    assert.throws(() => securityHeaders({ csp: ["default-src 'self'"] }), /must be an object/);
  });

  it('validates eagerly, at construction, not on the first request', () => {
    assert.throws(() => securityHeaders({ hsts: { maxAge: -1 } }), /non-negative integer/);
  });
});

/* --------------------------------------------------- buildSecurityHeaders */

describe('buildSecurityHeaders', () => {
  it('returns a plain record that can be spread into a ResponseInit', () => {
    const record = buildSecurityHeaders();
    assert.equal(Object.getPrototypeOf(record), Object.prototype);
    const res = new Response('hi', { headers: { ...record, 'Content-Type': 'text/html' } });
    assert.ok(res.headers.get('Content-Security-Policy'));
    assert.equal(res.headers.get('Content-Type'), 'text/html');
  });

  it('never includes Cache-Control — that is derived from a response', () => {
    assert.ok(!('Cache-Control' in buildSecurityHeaders({ cache: () => 'no-store' })));
  });

  it('produces the same header values as the finalizer for the same options', () => {
    const options = { csp: { 'connect-src': ['https://api.example.com'] }, noindex: true };
    const record = buildSecurityHeaders(options);
    const applied = securityHeaders(options)(ok());
    for (const [name, value] of Object.entries(record)) {
      assert.equal(applied.headers.get(name), value, name);
    }
  });

  it('takes a per-request policy, which is why it exists separately', () => {
    const allowed = buildSecurityHeaders({ permissions: { camera: ['self'] } });
    const denied = buildSecurityHeaders({ permissions: { camera: [] } });
    assert.notEqual(allowed['Permissions-Policy'], denied['Permissions-Policy']);
  });
});

/* ------------------------------------------------------- pipeline middleware */

describe('securityHeadersMiddleware', () => {
  function createCtx() {
    return {
      request: { method: 'GET', url: '/x', path: '/x', headers: {} },
      response: { status: undefined, headers: {}, body: undefined },
      state: {},
    };
  }

  it('writes the header set onto ctx.response.headers', async () => {
    const ctx = createCtx();
    await securityHeadersMiddleware()(ctx, async () => {});
    assert.ok(ctx.response.headers['Content-Security-Policy']);
    assert.equal(ctx.response.headers['X-Content-Type-Options'], 'nosniff');
  });

  it('runs downstream first so cache can see the content type the handler chose', async () => {
    const ctx = createCtx();
    await securityHeadersMiddleware({
      cache: ({ contentType }) => (contentType.includes('json') ? 'no-store' : null),
    })(ctx, async () => {
      ctx.response.headers['content-type'] = 'application/json';
    });
    assert.equal(ctx.response.headers['Cache-Control'], 'no-store');
  });

  it('publishes the nonce on ctx.state so a template can tag its inline script', async () => {
    const ctx = createCtx();
    await securityHeadersMiddleware({ nonce: true })(ctx, async () => {});
    assert.ok(ctx.state.cspNonce);
    assert.equal(nonceOf(ctx.response.headers['Content-Security-Policy']), ctx.state.cspNonce);
  });
});
