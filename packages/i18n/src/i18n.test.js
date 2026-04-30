import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createI18n } from './i18n.js';
import { i18nMiddleware } from './middleware.js';
import { createLoader, loadMessages } from './loader.js';

describe('createI18n', () => {
  it('returns key when no messages are loaded', () => {
    const i18n = createI18n();
    assert.equal(i18n.t('hello'), 'hello');
  });

  it('translates a simple key', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { greeting: 'Hello' } },
    });
    assert.equal(i18n.t('greeting'), 'Hello');
  });

  it('interpolates parameters', () => {
    const i18n = createI18n({
      messages: { en: { greeting: 'Hello {name}' } },
    });
    assert.equal(i18n.t('greeting', { name: 'World' }), 'Hello World');
  });

  it('handles multiple interpolation parameters', () => {
    const i18n = createI18n({
      messages: { en: { intro: '{name} is {age} years old' } },
    });
    assert.equal(i18n.t('intro', { name: 'Alice', age: 30 }), 'Alice is 30 years old');
  });

  it('handles plural with one and other', () => {
    const i18n = createI18n({
      messages: {
        en: {
          items: '{count, plural, one {# item} other {# items}}',
        },
      },
    });
    assert.equal(i18n.t('items', { count: 1 }), '1 item');
    assert.equal(i18n.t('items', { count: 5 }), '5 items');
    assert.equal(i18n.t('items', { count: 0 }), '0 items');
  });

  it('handles plural with zero category', () => {
    const i18n = createI18n({
      messages: {
        en: {
          items: '{count, plural, zero {no items} one {# item} other {# items}}',
        },
      },
    });
    assert.equal(i18n.t('items', { count: 0 }), 'no items');
    assert.equal(i18n.t('items', { count: 1 }), '1 item');
  });

  it('falls back to default locale', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: {},
      },
    });
    i18n.setLocale('fr');
    assert.equal(i18n.t('greeting'), 'Hello');
  });

  it('switches locale', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
      },
    });
    assert.equal(i18n.t('greeting'), 'Hello');
    i18n.setLocale('fr');
    assert.equal(i18n.t('greeting'), 'Bonjour');
    assert.equal(i18n.locale, 'fr');
  });

  it('adds messages dynamically', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    i18n.addMessages('de', { greeting: 'Hallo' });
    i18n.setLocale('de');
    assert.equal(i18n.t('greeting'), 'Hallo');
  });

  it('notifies on locale change', () => {
    const i18n = createI18n();
    const changes = [];
    i18n.onLocaleChange((locale) => changes.push(locale));
    i18n.setLocale('fr');
    i18n.setLocale('de');
    assert.deepEqual(changes, ['fr', 'de']);
  });
});

describe('number formatting', () => {
  it('formats numbers using current locale', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const result = i18n.n(1234.5);
    // en locale uses comma as thousands separator
    assert.ok(result.includes('1'));
    assert.ok(result.includes('234'));
  });

  it('formats currency', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const result = i18n.n(9.99, { style: 'currency', currency: 'USD' });
    assert.ok(result.includes('9.99'));
  });
});

describe('date formatting', () => {
  it('formats a Date object', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const date = new Date(2024, 0, 15);
    const result = i18n.d(date);
    assert.ok(result.includes('2024') || result.includes('24'));
    assert.ok(result.includes('1') || result.includes('Jan'));
  });

  it('accepts formatting options', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const date = new Date(2024, 5, 15);
    const result = i18n.d(date, { month: 'long', year: 'numeric' });
    assert.ok(result.includes('June'));
    assert.ok(result.includes('2024'));
  });
});

describe('i18nMiddleware', () => {
  it('detects locale from query parameter', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {}, fr: {} },
    });
    const ctx = { url: 'http://localhost/?locale=fr', headers: {} };
    i18nMiddleware(i18n)(ctx, () => {});
    assert.equal(i18n.locale, 'fr');
    assert.equal(ctx.i18n, i18n);
  });

  it('detects locale from cookie', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const ctx = {
      url: 'http://localhost/',
      headers: { cookie: 'locale=de; other=val' },
    };
    i18nMiddleware(i18n)(ctx, () => {});
    assert.equal(i18n.locale, 'de');
  });

  it('detects locale from Accept-Language header', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const ctx = {
      url: 'http://localhost/',
      headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    };
    i18nMiddleware(i18n, { supportedLocales: ['en', 'fr'] })(ctx, () => {});
    assert.equal(i18n.locale, 'fr');
  });

  it('respects supportedLocales filter', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const ctx = {
      url: 'http://localhost/?locale=ja',
      headers: {},
    };
    i18nMiddleware(i18n, { supportedLocales: ['en', 'fr'] })(ctx, () => {});
    // ja is not supported, should remain en
    assert.equal(i18n.locale, 'en');
  });

  it('attaches t function to context', () => {
    const i18n = createI18n({
      messages: { en: { hi: 'Hi' } },
    });
    const ctx = { url: 'http://localhost/', headers: {} };
    i18nMiddleware(i18n)(ctx, () => {});
    assert.equal(typeof ctx.t, 'function');
    assert.equal(ctx.t('hi'), 'Hi');
  });
});

describe('loader', () => {
  function uniqueTmp(prefix) {
    return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  it('loadMessages reads a JSON translation file', async () => {
    const tmpDir = uniqueTmp('i18n-test');
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'en.json'), JSON.stringify({ hello: 'Hello' }));
    const msgs = await loadMessages('en', tmpDir);
    assert.deepEqual(msgs, { hello: 'Hello' });
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('createLoader loads and registers messages', async () => {
    const dir = uniqueTmp('i18n-loader');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'en.json'), JSON.stringify({ greet: 'Hi' }));
    await writeFile(join(dir, 'fr.json'), JSON.stringify({ greet: 'Salut' }));

    const i18n = createI18n({ defaultLocale: 'en' });
    const loader = createLoader({ directory: dir, i18n });
    await loader.loadAll();

    assert.equal(i18n.t('greet'), 'Hi');
    i18n.setLocale('fr');
    assert.equal(i18n.t('greet'), 'Salut');
    await rm(dir, { recursive: true, force: true });
  });
});

describe('createI18n — additional edge cases', () => {
  it('returns key unchanged for completely missing key', () => {
    const i18n = createI18n({ messages: { en: { known: 'yes' } } });
    assert.equal(i18n.t('unknown.key'), 'unknown.key');
  });

  it('does not call listeners when setting same locale', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const changes = [];
    i18n.onLocaleChange((l) => changes.push(l));
    i18n.setLocale('en');
    assert.equal(changes.length, 0);
  });

  it('unsubscribes locale change listener', () => {
    const i18n = createI18n();
    const calls = [];
    const unsubscribe = i18n.onLocaleChange((l) => calls.push(l));
    i18n.setLocale('fr');
    unsubscribe();
    i18n.setLocale('de');
    assert.deepEqual(calls, ['fr']);
  });

  it('addMessages merges with existing messages', () => {
    const i18n = createI18n({ messages: { en: { a: 'Alpha' } } });
    i18n.addMessages('en', { b: 'Beta' });
    assert.equal(i18n.t('a'), 'Alpha');
    assert.equal(i18n.t('b'), 'Beta');
  });

  it('addMessages overwrites existing key', () => {
    const i18n = createI18n({ messages: { en: { greeting: 'Hello' } } });
    i18n.addMessages('en', { greeting: 'Hi there' });
    assert.equal(i18n.t('greeting'), 'Hi there');
  });

  it('interpolates number values', () => {
    const i18n = createI18n({ messages: { en: { score: 'Score: {value}' } } });
    assert.equal(i18n.t('score', { value: 100 }), 'Score: 100');
  });

  it('leaves unmatched placeholders intact', () => {
    const i18n = createI18n({ messages: { en: { msg: 'Hello {name}' } } });
    assert.equal(i18n.t('msg', { other: 'Bob' }), 'Hello {name}');
  });

  it('t with no params on parameterized message returns template', () => {
    const i18n = createI18n({ messages: { en: { msg: 'Hi {name}' } } });
    assert.equal(i18n.t('msg'), 'Hi {name}');
  });

  it('handles plural two category', () => {
    const i18n = createI18n({
      messages: {
        en: {
          items: '{count, plural, one {# item} two {# items (pair)} other {# items}}',
        },
      },
    });
    assert.equal(i18n.t('items', { count: 2 }), '2 items (pair)');
    assert.equal(i18n.t('items', { count: 3 }), '3 items');
  });

  it('plural replaces # with the count value', () => {
    const i18n = createI18n({
      messages: { en: { n: '{x, plural, other {# things}}' } },
    });
    assert.equal(i18n.t('n', { x: 7 }), '7 things');
  });

  it('sets locale via property assignment (locale setter)', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hi: 'Hi' }, es: { hi: 'Hola' } },
    });
    i18n.locale = 'es';
    assert.equal(i18n.t('hi'), 'Hola');
  });
});

describe('number / date formatting — additional', () => {
  it('n formats integer with options', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const result = i18n.n(1000000, { style: 'decimal', maximumFractionDigits: 0 });
    assert.ok(result.includes('1'));
    assert.ok(result.includes('000'));
  });

  it('n formats percent', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const result = i18n.n(0.42, { style: 'percent' });
    assert.ok(result.includes('42'));
  });

  it('d formats a timestamp number', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const ts = new Date(2025, 0, 1).getTime();
    const result = i18n.d(ts);
    assert.ok(result.includes('2025') || result.includes('1/1') || result.includes('01'));
  });

  it('d accepts weekday format option', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const date = new Date(2025, 11, 25); // Christmas 2025 is a Thursday
    const result = i18n.d(date, { weekday: 'long' });
    assert.ok(typeof result === 'string' && result.length > 0);
  });
});

describe('i18nMiddleware — additional', () => {
  it('detects locale from request.url (nested under request)', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hi: 'Hi' }, fr: { hi: 'Bonjour' } },
    });
    const mw = i18nMiddleware(i18n);
    const ctx = { request: { url: '/page?locale=fr', headers: {} }, state: {} };
    mw(ctx, () => {});
    assert.equal(i18n.t('hi'), 'Bonjour');
  });

  it('falls back to Accept-Language base language (en-US → en)', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hi: 'Hello' } },
    });
    const mw = i18nMiddleware(i18n, { supportedLocales: ['en'] });
    const ctx = {
      request: { headers: { 'accept-language': 'en-US,en;q=0.9' } },
      state: {},
    };
    mw(ctx, () => {});
    // Should have resolved to 'en' (base of 'en-US')
    assert.equal(i18n.t('hi'), 'Hello');
  });

  it('works without a next function', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const mw = i18nMiddleware(i18n);
    const ctx = { request: { headers: {} }, state: {} };
    // Should not throw
    assert.doesNotThrow(() => mw(ctx));
  });

  it('ignores unsupported locale from query param and falls back', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hi: 'Hi' }, es: { hi: 'Hola' } },
    });
    const mw = i18nMiddleware(i18n, { supportedLocales: ['en', 'es'] });
    // 'de' is not in supportedLocales
    const ctx = { url: '/page?locale=de', request: { headers: {} }, state: {} };
    mw(ctx, () => {});
    assert.equal(i18n.locale, 'en'); // stays at default
  });

  it('uses custom queryParam name', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: { hi: 'Hi' }, ja: { hi: 'こんにちは' } },
    });
    const mw = i18nMiddleware(i18n, { queryParam: 'lang' });
    const ctx = { url: '/page?lang=ja', request: { headers: {} }, state: {} };
    mw(ctx, () => {});
    assert.equal(i18n.t('hi'), 'こんにちは');
  });
});

describe('createLoader — additional', () => {
  it('throws when directory is not provided', () => {
    assert.throws(() => createLoader({}), /requires a "directory"/);
  });
});

describe('createI18n — locale fallback', () => {
  it('falls back to default locale when key missing in active locale', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: {},
      },
    });
    i18n.setLocale('fr');
    assert.equal(i18n.t('hello'), 'Hello');
  });

  it('returns key when missing in both active and default locale', () => {
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: {} } });
    assert.equal(i18n.t('nonexistent.key'), 'nonexistent.key');
  });

  it('setLocale fires listener and updates locale', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: { en: {}, de: {} },
    });
    let fired = null;
    i18n.onLocaleChange((l) => {
      fired = l;
    });
    i18n.setLocale('de');
    assert.equal(fired, 'de');
    assert.equal(i18n.locale, 'de');
  });
});

describe('createI18n — plural zero and one', () => {
  it('plural zero category fires when value is 0', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { items: '{count, plural, zero {No items} one {One item} other {# items}}' },
      },
    });
    assert.equal(i18n.t('items', { count: 0 }), 'No items');
  });

  it('plural one category fires when value is 1', () => {
    const i18n = createI18n({
      defaultLocale: 'en',
      messages: {
        en: { items: '{count, plural, zero {No items} one {One item} other {# items}}' },
      },
    });
    assert.equal(i18n.t('items', { count: 1 }), 'One item');
  });
});

describe('createI18n — n and d formatting', () => {
  it('n uses current locale for formatting', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const result = i18n.n(1234.5);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  it('d formats a Date object', () => {
    const i18n = createI18n({ defaultLocale: 'en' });
    const date = new Date(2024, 5, 15); // June 15, 2024
    const result = i18n.d(date);
    assert.ok(typeof result === 'string' && result.length > 0);
    assert.ok(result.includes('2024') || result.includes('24'));
  });
});
