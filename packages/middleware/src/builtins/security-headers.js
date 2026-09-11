/**
 * Response hardening headers for Workers-style handlers.
 *
 * The header set here is the union of what five DuganLabs products had each
 * hand-written and then diverged on. Two of those divergences were defects
 * rather than preferences, and the package now owns the answer:
 *
 * - `bluetooth` is not a registered Permissions-Policy feature. Sending it
 *   logs "Unrecognized feature" in Chromium on every request, for a
 *   permission nobody was requesting. It is absent from the defaults and
 *   `assertPermissionsFeature` refuses to add it back by accident.
 * - `preload` on Strict-Transport-Security is a submission to a browser-vendor
 *   list that is slow and painful to leave. It is opt-in, and it is rejected
 *   unless the directive actually meets the list's stated requirements.
 *
 * Everything product-specific — allow-list hosts, cache stance, whether the
 * site wants to be indexed — stays at the call site. The package supplies a
 * hardened baseline and merges the caller's additions into it, so adopting a
 * new CSP source can never silently drop `frame-ancestors 'none'`.
 */

/** Statuses the Fetch spec forbids a body on; constructing one with a body throws. */
const NULL_BODY_STATUS = new Set([101, 103, 204, 205, 304]);

/**
 * Hardened baseline CSP. Caller directives are merged into these, never over
 * them; see `mergeCsp`. Ordering is fixed so output is stable and diffable.
 */
export const DEFAULT_CSP = Object.freeze({
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'style-src-attr': ["'none'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
});

/** Features denied by default. An empty allow-list serializes as `name=()`. */
export const DEFAULT_PERMISSIONS = Object.freeze({
  camera: [],
  microphone: [],
  geolocation: [],
  payment: [],
  usb: [],
});

/**
 * Permissions-Policy feature names this package is willing to emit. A name
 * outside this set is rejected at construction time rather than shipped to a
 * browser that will log a warning and ignore it.
 *
 * Source: the W3C Permissions Policy registry plus the features shipped in
 * Chromium/WebKit/Gecko. `bluetooth` is deliberately absent — see the module
 * comment.
 */
const KNOWN_PERMISSIONS_FEATURES = new Set([
  'accelerometer', 'ambient-light-sensor', 'attribution-reporting',
  'autoplay', 'browsing-topics', 'camera', 'compute-pressure',
  'cross-origin-isolated', 'display-capture', 'encrypted-media',
  'fullscreen', 'gamepad', 'geolocation', 'gyroscope', 'hid',
  'identity-credentials-get', 'idle-detection', 'local-fonts', 'magnetometer',
  'microphone', 'midi', 'otp-credentials', 'payment', 'picture-in-picture',
  'publickey-credentials-create', 'publickey-credentials-get',
  'screen-wake-lock', 'serial', 'speaker-selection', 'storage-access',
  'usb', 'web-share', 'window-management', 'xr-spatial-tracking',
]);

const HSTS_PRELOAD_MIN_MAX_AGE = 31_536_000;

/**
 * A base64 CSP nonce. Fresh bytes from the platform CSPRNG; 16 bytes is the
 * length CSP Level 3 recommends as the floor.
 *
 * Export it when the response body has to carry the same nonce the header
 * declares — a server-rendered inline `<script>` needs the value before the
 * response exists. Pass the result back in as `context.nonce`.
 *
 * @param {number} [byteLength=16]
 * @returns {string}
 */
export function createNonce(byteLength = 16) {
  if (!Number.isInteger(byteLength) || byteLength < 16) {
    throw new RangeError(
      `createNonce: byteLength must be an integer of at least 16, received ${byteLength}. ` +
        'CSP Level 3 requires at least 128 bits of entropy per nonce.',
    );
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/* ------------------------------------------------------------- serializing */

function serializeCsp(directives) {
  const parts = [];
  for (const [name, sources] of Object.entries(directives)) {
    parts.push(sources.length === 0 ? name : `${name} ${sources.join(' ')}`);
  }
  return parts.join('; ');
}

/**
 * Structured-header serialization for a Permissions-Policy allow-list.
 * `self` and `*` are bare tokens; every other origin is a quoted string.
 * Products that wrote `camera=(https://x.com)` were emitting a policy the
 * parser drops on the floor.
 */
function serializePermissionsAllowlist(origins) {
  return origins
    .map((origin) => (origin === 'self' || origin === '*' ? origin : `"${origin}"`))
    .join(' ');
}

function serializePermissions(features) {
  return Object.entries(features)
    .map(([name, origins]) => `${name}=(${serializePermissionsAllowlist(origins)})`)
    .join(', ');
}

function serializeHsts({ maxAge, includeSubDomains, preload }) {
  let value = `max-age=${maxAge}`;
  if (includeSubDomains) value += '; includeSubDomains';
  if (preload) value += '; preload';
  return value;
}

/* --------------------------------------------------------------- merging */

function assertSourceList(label, value) {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `securityHeaders: ${label} must be an array of source expressions, or null to remove the ` +
        `entry. Received ${value === null ? 'null' : typeof value}. ` +
        `Example: ${label} = ["'self'", 'https://api.example.com']`,
    );
  }
  for (const source of value) {
    if (typeof source !== 'string' || source.length === 0) {
      throw new TypeError(
        `securityHeaders: every source in ${label} must be a non-empty string, received ` +
          `${JSON.stringify(source)}. Quote CSP keywords yourself: "'self'", not "self".`,
      );
    }
    if (source.includes(';')) {
      throw new TypeError(
        `securityHeaders: source ${JSON.stringify(source)} in ${label} contains ";", which would ` +
          'inject a second directive. Pass one source per array entry.',
      );
    }
  }
}

/**
 * Caller directives are unioned into the baseline, preserving baseline order
 * and dropping duplicates. `null` removes a directive outright — the only way
 * to lose a baseline protection is to ask for it by name.
 */
function mergeCsp(overrides) {
  const merged = {};
  for (const [name, sources] of Object.entries(DEFAULT_CSP)) {
    merged[name] = [...sources];
  }
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) {
      delete merged[name];
      continue;
    }
    assertSourceList(`csp['${name}']`, value);
    const combined = merged[name] ? [...merged[name]] : [];
    const seen = new Set(combined);
    for (const source of value) {
      if (seen.has(source)) continue;
      seen.add(source);
      combined.push(source);
    }
    merged[name] = combined;
  }
  return merged;
}

/**
 * Unlike CSP, a caller allow-list REPLACES the default for that feature.
 * Unioning `()` with `(self)` is meaningless — a deny and an allow are not
 * additive — so `{ camera: ['self'] }` opts that one feature back in and
 * leaves every other default deny standing.
 */
function mergePermissions(overrides) {
  const merged = { ...DEFAULT_PERMISSIONS };
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) {
      delete merged[name];
      continue;
    }
    if (!KNOWN_PERMISSIONS_FEATURES.has(name)) {
      throw new TypeError(
        `securityHeaders: "${name}" is not a registered Permissions-Policy feature. Browsers ` +
          'ignore it and log a console warning on every response. Remove it, or check the name ' +
          'against https://w3c.github.io/webappsec-permissions-policy/features.html',
      );
    }
    assertSourceList(`permissions['${name}']`, value);
    merged[name] = [...value];
  }
  return merged;
}

function normalizeHsts(hsts) {
  if (hsts === false) return null;
  const {
    maxAge = HSTS_PRELOAD_MIN_MAX_AGE,
    includeSubDomains = true,
    preload = false,
  } = hsts === true || hsts === undefined ? {} : hsts;

  if (!Number.isInteger(maxAge) || maxAge < 0) {
    throw new TypeError(
      `securityHeaders: hsts.maxAge must be a non-negative integer number of seconds, received ${maxAge}.`,
    );
  }
  if (preload && !includeSubDomains) {
    throw new TypeError(
      'securityHeaders: hsts.preload requires hsts.includeSubDomains. The browser preload list ' +
        'rejects submissions without it, so the directive would claim eligibility it does not have. ' +
        'Set includeSubDomains: true, or preload: false.',
    );
  }
  if (preload && maxAge < HSTS_PRELOAD_MIN_MAX_AGE) {
    throw new TypeError(
      `securityHeaders: hsts.preload requires maxAge of at least ${HSTS_PRELOAD_MIN_MAX_AGE} ` +
        `(one year), received ${maxAge}. The preload list rejects shorter max-ages.`,
    );
  }
  return { maxAge, includeSubDomains, preload };
}

/* --------------------------------------------------------------- options */

const VALID_OPTIONS = new Set([
  'csp', 'nonce', 'nonceDirectives', 'hsts', 'permissions', 'frameOptions',
  'referrerPolicy', 'coop', 'coep', 'corp', 'noindex', 'cache',
]);

function normalizeOptions(options) {
  for (const key of Object.keys(options)) {
    if (!VALID_OPTIONS.has(key)) {
      throw new TypeError(
        `securityHeaders: unknown option "${key}". A typo here silently drops a header, so it is ` +
          `rejected. Valid options: ${[...VALID_OPTIONS].join(', ')}.`,
      );
    }
  }

  const {
    csp = {},
    nonce = false,
    nonceDirectives = ['script-src'],
    hsts,
    permissions = {},
    frameOptions = 'DENY',
    referrerPolicy = 'strict-origin-when-cross-origin',
    coop = 'same-origin',
    coep = false,
    corp = false,
    noindex = false,
    cache,
  } = options;

  if (csp !== false && (typeof csp !== 'object' || csp === null || Array.isArray(csp))) {
    throw new TypeError(
      'securityHeaders: csp must be an object of directive -> source array, or false to send no ' +
        "CSP at all. Received " + (Array.isArray(csp) ? 'an array' : typeof csp) + '.',
    );
  }
  if (cache !== undefined && typeof cache !== 'function') {
    throw new TypeError(
      'securityHeaders: cache must be a function ({ contentType, status, request, response }) => ' +
        `string | null, received ${typeof cache}.`,
    );
  }

  const directives = csp === false ? null : mergeCsp(csp);

  if (nonce) {
    if (directives === null) {
      throw new TypeError(
        'securityHeaders: nonce is enabled but csp is false. A nonce only has meaning inside a ' +
          'Content-Security-Policy. Set csp to an object, or nonce: false.',
      );
    }
    for (const name of nonceDirectives) {
      if (!(name in directives)) {
        throw new TypeError(
          `securityHeaders: nonce is enabled but CSP directive "${name}" is not present — it was ` +
            `removed with csp: { '${name}': null }, or nonceDirectives names a directive this ` +
            'policy does not set. The nonce would be unreachable.',
        );
      }
    }
  }

  return {
    directives,
    nonce: Boolean(nonce),
    nonceDirectives: [...nonceDirectives],
    hsts: normalizeHsts(hsts),
    permissions: mergePermissions(permissions),
    frameOptions,
    referrerPolicy,
    coop,
    coep,
    corp,
    noindex,
    cache,
  };
}

/* ----------------------------------------------------------------- build */

function buildFromConfig(config, nonce) {
  const headers = {};

  if (config.directives) {
    let directives = config.directives;
    if (nonce) {
      directives = { ...directives };
      for (const name of config.nonceDirectives) {
        directives[name] = [...directives[name], `'nonce-${nonce}'`];
      }
    }
    headers['Content-Security-Policy'] = serializeCsp(directives);
  }

  if (config.hsts) {
    headers['Strict-Transport-Security'] = serializeHsts(config.hsts);
  }
  if (config.frameOptions) {
    headers['X-Frame-Options'] = config.frameOptions;
  }
  headers['X-Content-Type-Options'] = 'nosniff';
  if (config.referrerPolicy) {
    headers['Referrer-Policy'] = config.referrerPolicy;
  }
  if (Object.keys(config.permissions).length > 0) {
    headers['Permissions-Policy'] = serializePermissions(config.permissions);
  }
  if (config.coop) {
    headers['Cross-Origin-Opener-Policy'] = config.coop;
  }
  if (config.coep) {
    headers['Cross-Origin-Embedder-Policy'] = config.coep;
  }
  if (config.corp) {
    headers['Cross-Origin-Resource-Policy'] = config.corp;
  }
  if (config.noindex) {
    headers['X-Robots-Tag'] =
      config.noindex === true ? 'noindex, nofollow, noarchive' : config.noindex;
  }

  return headers;
}

/**
 * The header set, as a plain object, without touching a Response.
 *
 * Use this when the headers have to exist before the response does — an SSR
 * handler that spreads them into a `ResponseInit`, or one whose policy varies
 * per request (a per-tenant `camera` allow-list, a preview-only CORP).
 *
 * Does not include `Cache-Control`; that is derived from a response, so it is
 * applied by `securityHeaders()`.
 *
 * @param {SecurityHeadersOptions} [options]
 * @param {{ nonce?: string }} [context]
 * @returns {Record<string, string>}
 */
export function buildSecurityHeaders(options = {}, context = {}) {
  const config = normalizeOptions(options);
  return buildFromConfig(config, resolveNonce(config, context));
}

function resolveNonce(config, context) {
  if (context.nonce !== undefined) {
    if (!config.nonce) {
      throw new TypeError(
        'securityHeaders: a nonce was supplied but nonce: true was not set, so it would be ' +
          'silently dropped and the inline script it tags would be blocked in production. ' +
          'Set nonce: true.',
      );
    }
    if (typeof context.nonce !== 'string' || context.nonce.length === 0) {
      throw new TypeError(
        `securityHeaders: context.nonce must be a non-empty string, received ${typeof context.nonce}. ` +
          'Generate one with createNonce().',
      );
    }
    return context.nonce;
  }
  return config.nonce ? createNonce() : null;
}

/* ------------------------------------------------------------- finalizer */

/**
 * Build a response finalizer that stamps hardening headers onto every
 * outgoing response.
 *
 * Configure once at module scope — options are validated eagerly, so a bad
 * directive fails at boot rather than on the first request that needs it.
 *
 * ```js
 * const harden = securityHeaders({
 *   csp: { 'connect-src': ['https://api.example.com'] },
 *   nonce: true,
 *   hsts: { preload: true },
 *   cache: ({ contentType }) =>
 *     contentType.startsWith('application/json') ? 'private, no-store' : null,
 * });
 *
 * export default { fetch: async (req, env) => harden(await handle(req, env), { request: req }) };
 * ```
 *
 * @param {SecurityHeadersOptions} [options]
 * @returns {(response: Response, context?: { request?: Request, nonce?: string }) => Response}
 */
export function securityHeaders(options = {}) {
  const config = normalizeOptions(options);

  return function applySecurityHeaders(response, context = {}) {
    const headers = new Headers(response.headers);
    const record = buildFromConfig(config, resolveNonce(config, context));
    for (const [name, value] of Object.entries(record)) {
      headers.set(name, value);
    }

    if (config.cache) {
      const directive = config.cache({
        contentType: headers.get('content-type') ?? '',
        status: response.status,
        request: context.request,
        response,
      });
      if (typeof directive === 'string') headers.set('Cache-Control', directive);
    }

    return new Response(NULL_BODY_STATUS.has(response.status) ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * The same headers as a `@basenative/middleware` pipeline stage, for handlers
 * built on `createPipeline()` rather than on raw `Response` objects.
 *
 * Runs downstream middleware first so `cache` can see the content type the
 * handler chose, and publishes the nonce on `ctx.state.cspNonce` for a
 * template to read.
 *
 * @param {SecurityHeadersOptions} [options]
 * @returns {(ctx: object, next: () => Promise<void>) => Promise<void>}
 */
export function securityHeadersMiddleware(options = {}) {
  const config = normalizeOptions(options);

  return async (ctx, next) => {
    const nonce = config.nonce ? createNonce() : null;
    if (nonce) ctx.state.cspNonce = nonce;

    await next();

    const record = buildFromConfig(config, nonce);
    for (const [name, value] of Object.entries(record)) {
      ctx.response.headers[name] = value;
    }

    if (config.cache) {
      const contentType =
        ctx.response.headers['content-type'] ?? ctx.response.headers['Content-Type'] ?? '';
      const directive = config.cache({
        contentType,
        status: ctx.response.status ?? 200,
        request: ctx.request,
        response: ctx.response,
      });
      if (typeof directive === 'string') ctx.response.headers['Cache-Control'] = directive;
    }
  };
}
