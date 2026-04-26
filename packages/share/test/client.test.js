// Built with BaseNative — basenative.dev
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { nativeShare, mintShareCard, composeShareText } from '../src/client.js';

let originalNavigator;
const setNav = (v) => Object.defineProperty(globalThis, 'navigator', {
  value: v, configurable: true, writable: true,
});

beforeEach(() => {
  originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
});
afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
});

describe('composeShareText', () => {
  it('substitutes named vars', () => {
    assert.equal(composeShareText('hello ${name}', { name: 'world' }), 'hello world');
  });
  it('leaves unknown vars intact', () => {
    assert.equal(composeShareText('${a} ${b}', { a: 1 }), '1 ${b}');
  });
  it('handles non-string inputs safely', () => {
    assert.equal(composeShareText('n=${n}', { n: 42 }), 'n=42');
  });
});

describe('nativeShare', () => {
  it('returns failed when no navigator', async () => {
    setNav(undefined);
    const r = await nativeShare({ text: 'hi' });
    assert.equal(r.status, 'failed');
  });

  it('uses navigator.share when available', async () => {
    let captured = null;
    setNav({ share: async (a) => { captured = a; } });
    const r = await nativeShare({ text: 'hi', url: 'https://x', title: 't' });
    assert.equal(r.status, 'shared');
    assert.deepEqual(captured, { text: 'hi', url: 'https://x', title: 't' });
  });

  it('falls back to clipboard on share rejection (non-abort)', async () => {
    let copied = null;
    setNav({
      share: async () => { const e = new Error('boom'); e.name = 'NotAllowedError'; throw e; },
      clipboard: { writeText: async (t) => { copied = t; } },
    });
    const r = await nativeShare({ text: 'hi', url: 'https://x' });
    assert.equal(r.status, 'copied');
    assert.equal(copied, 'hi\n\nhttps://x');
  });

  it('respects user cancel (AbortError) without falling through', async () => {
    let copied = false;
    setNav({
      share: async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; },
      clipboard: { writeText: async () => { copied = true; } },
    });
    const r = await nativeShare({ text: 'hi' });
    assert.equal(r.status, 'failed');
    assert.equal(copied, false);
  });

  it('clipboard-only path', async () => {
    let copied = null;
    setNav({ clipboard: { writeText: async (t) => { copied = t; } } });
    const r = await nativeShare({ text: 'just text' });
    assert.equal(r.status, 'copied');
    assert.equal(copied, 'just text');
  });
});

describe('mintShareCard', () => {
  it('POSTs to default endpoint and returns parsed body', async () => {
    let captured = null;
    const fakeFetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ id: 'abc12345', url: 'https://x/s/abc12345' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
    const r = await mintShareCard({ score: 7 }, { fetch: fakeFetch });
    assert.equal(r.id, 'abc12345');
    assert.equal(captured.url, '/api/share-cards');
    assert.equal(captured.init.method, 'POST');
    assert.deepEqual(JSON.parse(captured.init.body), { score: 7 });
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = async () => new Response('nope', { status: 500 });
    await assert.rejects(() => mintShareCard({}, { fetch: fakeFetch }));
  });

  it('uses custom endpoint and headers', async () => {
    let captured = null;
    const fakeFetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ id: 'x', url: 'y' }), { status: 200 });
    };
    await mintShareCard({}, { fetch: fakeFetch, endpoint: '/custom', headers: { 'X-Foo': 'bar' } });
    assert.equal(captured.url, '/custom');
    assert.equal(captured.init.headers['X-Foo'], 'bar');
  });
});
