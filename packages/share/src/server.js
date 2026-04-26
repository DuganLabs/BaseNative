// Built with BaseNative — basenative.dev
/**
 * Worker / Pages Function-side share helpers.
 *
 *   defineShareCards   — store with create/get over a D1-shaped DB.
 *   mintHandler        — POST /api/share-cards
 *   landingHandler     — GET  /s/{id}
 *
 * The minted record holds whatever JSON payload you pass in; the landing
 * handler turns each record into a crawler-friendly HTML page composable
 * with `@basenative/og-image`.
 *
 * @module
 */

import { buildLandingHtml } from './og-redirect.js';

/** Default short-id alphabet — Crockford-flavoured, no 0/1/i/l/o. */
export const DEFAULT_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
export const DEFAULT_ID_LENGTH = 8;

/**
 * Generate a cryptographically-random short id.
 *
 * @param {number} [len]
 * @param {string} [alphabet]
 */
export function shortId(len = DEFAULT_ID_LENGTH, alphabet = DEFAULT_ALPHABET) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const isPlainIdent = (s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);

/**
 * @typedef {object} ShareCardStore
 * @property {(input: Record<string, any>) => Promise<{ id: string }>} create
 * @property {(id: string) => Promise<any|null>} get
 */

/**
 * Define a share-card store bound to a DB and a table.
 *
 * @param {{
 *   db: any,
 *   table?: string,
 *   idLength?: number,
 *   alphabet?: string,
 *   columns?: string[],
 *   payloadColumn?: string,
 * }} cfg
 * @returns {ShareCardStore}
 */
export function defineShareCards(cfg = {}) {
  const db = cfg.db;
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('defineShareCards: db must expose prepare()');
  }
  const table = cfg.table ?? 'share_cards';
  if (!isPlainIdent(table)) throw new TypeError(`unsafe table: ${table}`);
  const idLength = cfg.idLength ?? DEFAULT_ID_LENGTH;
  const alphabet = cfg.alphabet ?? DEFAULT_ALPHABET;
  const columns = (cfg.columns ?? ['user_id', 'session_id', 'category', 'score', 'won', 'grid'])
    .filter((c) => isPlainIdent(c));
  const payloadColumn = cfg.payloadColumn ?? 'payload_json';
  if (!isPlainIdent(payloadColumn)) throw new TypeError(`unsafe payload column: ${payloadColumn}`);

  return {
    async create(input) {
      const id = shortId(idLength, alphabet);
      const now = Date.now();
      const knownVals = columns.map((c) => input?.[camel(c)] ?? input?.[c] ?? null);
      const known = new Set(columns);
      const extras = {};
      for (const [k, v] of Object.entries(input || {})) {
        const snake = snakeCase(k);
        if (!known.has(snake)) extras[k] = v;
      }
      const payload = Object.keys(extras).length ? JSON.stringify(extras) : null;

      const colNames = ['id', ...columns, payloadColumn, 'created_at'];
      const placeholders = colNames.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`;
      await db.prepare(sql).bind(id, ...knownVals, payload, now).run();
      return { id };
    },

    async get(id) {
      const sql = `SELECT * FROM ${table} WHERE id = ?`;
      const row = await db.prepare(sql).bind(id).first();
      if (!row) return null;
      const out = { ...row };
      if (row[payloadColumn]) {
        try { out.payload = JSON.parse(row[payloadColumn]); } catch { out.payload = null; }
      }
      return out;
    },
  };
}

/**
 * POST handler for `/api/share-cards`.
 *
 * @param {{
 *   store: ShareCardStore,
 *   origin?: ((env: any) => string) | string,
 *   path?: string,
 *   validate?: (body: any) => true | string,
 *   onCreated?: (id: string, body: any, ctx: any) => void | Promise<void>,
 * }} opts
 */
export function mintHandler(opts) {
  if (!opts?.store) throw new TypeError('mintHandler: store required');
  return async ({ request, env }) => {
    if (request.method !== 'POST') return jsonRes({ error: 'method-not-allowed' }, 405);
    let body;
    try { body = await request.json(); }
    catch { return jsonRes({ error: 'bad-json' }, 400); }

    if (opts.validate) {
      const v = opts.validate(body);
      if (v !== true) return jsonRes({ error: typeof v === 'string' ? v : 'invalid' }, 400);
    }
    const { id } = await opts.store.create(body);
    if (opts.onCreated) {
      try { await opts.onCreated(id, body, { request, env }); } catch {}
    }
    const origin = resolveOrigin(opts.origin, env, request);
    const path = opts.path ?? '/s/';
    return jsonRes({ id, url: `${origin}${path}${id}` });
  };
}

/**
 * GET handler for `/s/{id}` — emits the OG-bearing landing HTML.
 *
 * @param {{
 *   store: ShareCardStore,
 *   origin?: ((env: any) => string) | string,
 *   ogImage: ((card: any, ctx: { origin: string, id: string }) => string) | string,
 *   buildMeta: (card: any, ctx: { origin: string, id: string, ogImage: string }) =>
 *     import('./og-redirect.js').LandingMeta,
 *   redirectTo?: string,
 *   cacheControl?: string,
 *   idPattern?: RegExp,
 * }} opts
 */
export function landingHandler(opts) {
  if (!opts?.store) throw new TypeError('landingHandler: store required');
  if (!opts?.buildMeta) throw new TypeError('landingHandler: buildMeta required');
  const idPattern = opts.idPattern ?? /^[a-z0-9]{4,16}$/i;

  return async ({ request, env, params }) => {
    const id = String(params?.id || '');
    if (!idPattern.test(id)) return new Response('bad id', { status: 400 });

    const card = await opts.store.get(id);
    if (!card) return new Response('not found', { status: 404 });

    const origin = resolveOrigin(opts.origin, env, request);
    const ogImage = typeof opts.ogImage === 'function'
      ? opts.ogImage(card, { origin, id })
      : opts.ogImage;
    const meta = opts.buildMeta(card, { origin, id, ogImage });
    if (!meta.canonicalUrl) meta.canonicalUrl = `${origin}/s/${id}`;
    if (!meta.redirectTo) meta.redirectTo = opts.redirectTo ?? '/';

    return new Response(buildLandingHtml(meta), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': opts.cacheControl ?? 'public, max-age=300, s-maxage=300',
      },
    });
  };
}

// ─── helpers ───────────────────────────────────────────────────────

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function resolveOrigin(o, env, request) {
  if (typeof o === 'function') return String(o(env));
  if (typeof o === 'string') return o;
  if (env?.PUBLIC_ORIGIN) return env.PUBLIC_ORIGIN;
  if (env?.RP_ORIGIN) return env.RP_ORIGIN;
  if (request?.url) {
    try { const u = new URL(request.url); return `${u.protocol}//${u.host}`; }
    catch {}
  }
  return '';
}

const snakeCase = (s) => String(s).replace(/[A-Z]/g, (c, i) => (i ? '_' : '') + c.toLowerCase());
const camel = (s) => String(s).replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
