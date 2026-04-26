// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defineShareCards, mintHandler, landingHandler, shortId, DEFAULT_ALPHABET,
} from '../src/server.js';
import { buildLandingHtml, escHtml } from '../src/og-redirect.js';

function memDb() {
  const rows = [];
  return {
    _rows: rows,
    prepare(sql) {
      return {
        bind: (...args) => ({
          run: async () => {
            if (sql.startsWith('INSERT')) {
              const cols = sql.match(/\(([^)]+)\)/)[1].split(',').map((s) => s.trim());
              const row = {};
              cols.forEach((c, i) => { row[c] = args[i]; });
              rows.push(row);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          },
          first: async () => {
            if (sql.startsWith('SELECT')) {
              return rows.find((r) => r.id === args[0]) || null;
            }
            return null;
          },
        }),
      };
    },
  };
}

describe('shortId', () => {
  it('emits the requested length, alphabet-restricted', () => {
    const id = shortId(8);
    assert.equal(id.length, 8);
    assert.ok([...id].every((c) => DEFAULT_ALPHABET.includes(c)));
  });
});

describe('defineShareCards', () => {
  it('rejects unsafe table names', () => {
    assert.throws(() => defineShareCards({ db: { prepare: () => ({}) }, table: 'a; DROP' }));
  });

  it('create + get round-trips and stores extras as JSON', async () => {
    const db = memDb();
    const store = defineShareCards({ db });
    const { id } = await store.create({ category: 'Foods', score: 10, won: 1, weather: 'sunny' });
    assert.ok(id);
    const got = await store.get(id);
    assert.equal(got.category, 'Foods');
    assert.equal(got.score, 10);
    assert.deepEqual(got.payload, { weather: 'sunny' });
  });
});

describe('mintHandler', () => {
  const makeStore = () => {
    const db = memDb();
    return { store: defineShareCards({ db }), db };
  };

  it('POSTs return id + url; non-POST is 405', async () => {
    const { store } = makeStore();
    const handler = mintHandler({ store, origin: 'https://example.com' });
    const get = await handler({
      request: new Request('https://example.com/api/share-cards'),
      env: {},
    });
    assert.equal(get.status, 405);

    const post = await handler({
      request: new Request('https://example.com/api/share-cards', {
        method: 'POST', body: JSON.stringify({ score: 5 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      env: {},
    });
    assert.equal(post.status, 200);
    const body = await post.json();
    assert.ok(body.id);
    assert.match(body.url, /https:\/\/example\.com\/s\//);
  });

  it('validate hook rejects', async () => {
    const { store } = makeStore();
    const handler = mintHandler({
      store,
      validate: (b) => (b.score > 0 ? true : 'bad-score'),
    });
    const r = await handler({
      request: new Request('https://x.test/api/share-cards', {
        method: 'POST', body: JSON.stringify({ score: 0 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      env: {},
    });
    assert.equal(r.status, 400);
    const body = await r.json();
    assert.equal(body.error, 'bad-score');
  });

  it('bad JSON returns 400', async () => {
    const { store } = makeStore();
    const handler = mintHandler({ store });
    const r = await handler({
      request: new Request('https://x.test/api/share-cards', {
        method: 'POST', body: '{not json',
        headers: { 'Content-Type': 'application/json' },
      }),
      env: {},
    });
    assert.equal(r.status, 400);
  });
});

describe('landingHandler', () => {
  it('returns 400 for bad id, 404 for unknown', async () => {
    const { store } = (() => {
      const db = memDb();
      return { store: defineShareCards({ db }), db };
    })();
    const handler = landingHandler({
      store,
      ogImage: () => 'https://x/og.png',
      buildMeta: (card) => ({ title: 't', description: 'd', imageUrl: 'i', canonicalUrl: 'c' }),
    });
    const bad = await handler({ request: new Request('https://x/s/!!'), env: {}, params: { id: '!!' } });
    assert.equal(bad.status, 400);
    const miss = await handler({ request: new Request('https://x/s/abcd1234'), env: {}, params: { id: 'abcd1234' } });
    assert.equal(miss.status, 404);
  });

  it('renders OG-bearing HTML for an existing card', async () => {
    const db = memDb();
    const store = defineShareCards({ db });
    const { id } = await store.create({ category: 'Foods', score: 7, won: 1 });
    const handler = landingHandler({
      store,
      origin: 'https://example.com',
      ogImage: (_c, { origin, id }) => `${origin}/og/${id}.png`,
      buildMeta: (card, { origin, id, ogImage }) => ({
        title: `Score ${card.score}`,
        description: 'A score card',
        imageUrl: ogImage,
        canonicalUrl: `${origin}/s/${id}`,
      }),
    });
    const res = await handler({
      request: new Request(`https://example.com/s/${id}`),
      env: {},
      params: { id },
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /og:image/);
    assert.match(html, new RegExp(`/og/${id}\\.png`));
    assert.match(html, /window\.location\.replace/);
  });
});

describe('buildLandingHtml', () => {
  it('escapes user content', () => {
    const html = buildLandingHtml({
      title: '<script>alert(1)</script>',
      description: '"\'',
      imageUrl: 'https://x/img.png',
      canonicalUrl: 'https://x/s/abc',
    });
    // The injected title must be escaped; a raw <script>alert must not appear.
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /&quot;/);
  });
});

describe('escHtml', () => {
  it('escapes the five core entities', () => {
    assert.equal(escHtml('<a href="x">\'&</a>'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&lt;/a&gt;');
  });
});
