// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { OpenAICompatClient, Client, StationUnavailable, StationTimeout } from '../src/client.js';

function mockFetch(handler) {
  return async (url, init) => handler(url, init);
}

function jsonRes(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('OpenAICompatClient construction', () => {
  it('exports Client as an alias', () => {
    assert.equal(Client, OpenAICompatClient);
  });

  it('requires baseUrl', () => {
    assert.throws(() => new OpenAICompatClient({ model: 'm' }));
  });

  it('requires model', () => {
    assert.throws(() => new OpenAICompatClient({ baseUrl: 'http://x' }));
  });

  it('strips trailing slash on baseUrl', () => {
    const c = new OpenAICompatClient({ baseUrl: 'http://x/', model: 'm', fetch: mockFetch(() => jsonRes({})) });
    assert.equal(c.baseUrl, 'http://x');
  });
});

describe('chat() — primary path', () => {
  it('hits /v1/chat/completions and returns text+latency+source', async () => {
    let calledUrl;
    const fetch = mockFetch(async (url) => {
      calledUrl = url;
      return jsonRes({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      });
    });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', fetch });
    const r = await c.chat({ messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(calledUrl, 'http://x/v1/chat/completions');
    assert.equal(r.text, 'hello');
    assert.equal(r.source, 'primary');
    assert.equal(typeof r.latencyMs, 'number');
    assert.deepEqual(r.usage, { prompt_tokens: 1, completion_tokens: 2 });
  });

  it('passes Authorization header when apiKey set', async () => {
    let seenAuth;
    const fetch = mockFetch(async (_url, init) => {
      seenAuth = init.headers.authorization;
      return jsonRes({ choices: [{ message: { content: 'ok' } }] });
    });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', apiKey: 'sk', fetch });
    await c.chat({ messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(seenAuth, 'Bearer sk');
  });

  it('throws StationUnavailable on HTTP error with no fallback', async () => {
    const fetch = mockFetch(async () => new Response('no', { status: 502 }));
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', fetch });
    await assert.rejects(
      () => c.chat({ messages: [{ role: 'user', content: 'hi' }] }),
      (e) => e instanceof StationUnavailable
    );
  });
});

describe('chat() — fallback path', () => {
  it('falls back to fallbackUrl when primary fails', async () => {
    const calls = [];
    const fetch = mockFetch(async (url) => {
      calls.push(url);
      if (url.startsWith('http://primary')) return new Response('down', { status: 503 });
      return jsonRes({ choices: [{ message: { content: 'fb' } }] });
    });
    const c = new OpenAICompatClient({
      baseUrl: 'http://primary',
      model: 'm',
      fallbackUrl: 'http://fallback',
      fallbackModel: 'fbm',
      fetch,
    });
    const r = await c.chat({ messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(r.text, 'fb');
    assert.equal(r.source, 'fallback');
    assert.equal(calls.length, 2);
  });

  it('throws StationUnavailable when both primary and fallback fail', async () => {
    const fetch = mockFetch(async () => new Response('down', { status: 500 }));
    const c = new OpenAICompatClient({
      baseUrl: 'http://primary',
      model: 'm',
      fallbackUrl: 'http://fallback',
      fetch,
    });
    await assert.rejects(
      () => c.chat({ messages: [{ role: 'user', content: 'hi' }] }),
      (e) => e instanceof StationUnavailable && /Both primary and fallback/.test(e.message)
    );
  });
});

describe('chat() — timeout', () => {
  it('aborts after timeoutMs and throws StationTimeout (wrapped in StationUnavailable when no fallback)', async () => {
    const fetch = (url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
      });
    });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', timeoutMs: 10, fetch });
    await assert.rejects(
      () => c.chat({ messages: [{ role: 'user', content: 'hi' }] }),
      (e) => e instanceof StationUnavailable
    );
  });

  it('exposes StationTimeout as a constructable error', () => {
    const e = new StationTimeout('x');
    assert.equal(e.name, 'StationTimeout');
    assert.equal(e.message, 'x');
  });
});

describe('ping() and health()', () => {
  it('ping reports hasExpectedModel', async () => {
    const fetch = mockFetch(async (url) => {
      if (url.endsWith('/v1/models')) return jsonRes({ data: [{ id: 'qwen' }, { id: 'other' }] });
      return new Response('nope', { status: 404 });
    });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'qwen', fetch });
    const r = await c.ping();
    assert.equal(r.ok, true);
    assert.equal(r.hasExpectedModel, true);
  });

  it('ping returns ok:false on transport error', async () => {
    const fetch = mockFetch(async () => { throw new Error('net'); });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', fetch });
    const r = await c.ping();
    assert.equal(r.ok, false);
  });

  it('health hits /health', async () => {
    let saw;
    const fetch = mockFetch(async (url) => { saw = url; return jsonRes({ ok: true }); });
    const c = new OpenAICompatClient({ baseUrl: 'http://x', model: 'm', fetch });
    const r = await c.health();
    assert.equal(saw, 'http://x/health');
    assert.equal(r.ok, true);
  });
});
