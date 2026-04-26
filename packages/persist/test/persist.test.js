// Built with BaseNative — basenative.dev
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadPersisted, savePersisted, clearPersisted, persisted,
  hydrateFromServer, setStorageAdapter, persistedSavedAt,
} from '../src/index.js';
import { memoryAdapter } from '../src/storage.js';
import { wrap, unwrap, fromLegacy } from '../src/ttl.js';

beforeEach(() => { setStorageAdapter(memoryAdapter()); });

describe('save/load/clear', () => {
  it('round-trips a value', async () => {
    await savePersisted('k', { a: 1 });
    assert.deepEqual(await loadPersisted('k'), { a: 1 });
  });
  it('clear removes the key', async () => {
    await savePersisted('k', 'x');
    await clearPersisted('k');
    assert.equal(await loadPersisted('k'), null);
  });
  it('returns null for missing key', async () => {
    assert.equal(await loadPersisted('missing'), null);
  });
});

describe('TTL', () => {
  it('honors ttlSeconds — fresh', async () => {
    await savePersisted('k', { a: 1 }, 60);
    assert.deepEqual(await loadPersisted('k'), { a: 1 });
  });
  it('expired entries return null and are evicted', async () => {
    const adapter = memoryAdapter();
    setStorageAdapter(adapter);
    const expired = JSON.stringify({ v: 1, t: Date.now() - 10000, e: Date.now() - 1000 });
    await adapter.setItem('k', expired);
    assert.equal(await loadPersisted('k'), null);
    assert.equal(await adapter.getItem('k'), null);
  });
});

describe('legacy shape', () => {
  it('reads t4bs-style {...state, savedAt} with 12h default', async () => {
    const adapter = memoryAdapter();
    setStorageAdapter(adapter);
    await adapter.setItem('k', JSON.stringify({ score: 5, savedAt: Date.now() }));
    assert.deepEqual(await loadPersisted('k'), { score: 5 });
  });
  it('legacy expires after 12h', async () => {
    const adapter = memoryAdapter();
    setStorageAdapter(adapter);
    const old = Date.now() - 13 * 3600 * 1000;
    await adapter.setItem('k', JSON.stringify({ score: 5, savedAt: old }));
    assert.equal(await loadPersisted('k'), null);
  });
});

describe('TTL helpers', () => {
  it('wrap/unwrap', () => {
    const e = wrap('hi', 1);
    assert.equal(unwrap(e), 'hi');
  });
  it('unwrap rejects expired', () => {
    const e = { v: 'hi', t: 0, e: 1 };
    assert.equal(unwrap(e, () => 100), null);
  });
  it('fromLegacy', () => {
    const e = fromLegacy({ a: 1, savedAt: 1000 });
    assert.equal(e.t, 1000);
    assert.deepEqual(e.v, { a: 1 });
  });
});

describe('persisted() signal binding', () => {
  it('hydrates a signal from storage', async () => {
    await savePersisted('count', 7);
    const subs = new Set();
    const sig = {
      value: 0,
      set(v) { this.value = v; subs.forEach((cb) => cb(v)); },
      get() { return this.value; },
      peek() { return this.value; },
      subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    };
    persisted('count', sig);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(sig.value, 7);
  });

  it('writes through on change', async () => {
    const subs = new Set();
    const sig = {
      value: 0,
      set(v) { this.value = v; subs.forEach((cb) => cb(v)); },
      peek() { return this.value; },
      subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    };
    persisted('count', sig);
    await new Promise((r) => setTimeout(r, 5));
    sig.set(42);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(await loadPersisted('count'), 42);
  });
});

describe('hydrateFromServer', () => {
  it('emits local first, then server', async () => {
    await savePersisted('s', { local: true });
    const events = [];
    await hydrateFromServer({
      key: 's',
      fetch: async () => ({ server: true }),
      onResolve: (v, ctx) => events.push({ v, source: ctx.source }),
    });
    assert.equal(events.length, 2);
    assert.equal(events[0].source, 'local');
    assert.equal(events[1].source, 'server');
    assert.deepEqual(events[1].v, { server: true });
  });

  it('preserves local when fetch fails', async () => {
    await savePersisted('s', { local: true });
    const events = [];
    const errs = [];
    await hydrateFromServer({
      key: 's',
      fetch: async () => { throw new Error('network'); },
      onResolve: (v, ctx) => events.push({ v, source: ctx.source }),
      onError: (e) => errs.push(e.message),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].source, 'local');
    assert.equal(errs[0], 'network');
    assert.deepEqual(await loadPersisted('s'), { local: true });
  });

  it('reconcile hook', async () => {
    await savePersisted('s', { score: 5 });
    let final = null;
    await hydrateFromServer({
      key: 's',
      fetch: async () => ({ score: 3 }),
      reconcile: (l, srv) => ({ score: Math.max(l?.score ?? 0, srv?.score ?? 0) }),
      onResolve: (v, ctx) => { if (ctx.source === 'server') final = v; },
    });
    assert.deepEqual(final, { score: 5 });
  });
});

describe('persistedSavedAt', () => {
  it('returns the timestamp', async () => {
    const before = Date.now();
    await savePersisted('k', 1);
    const t = await persistedSavedAt('k');
    assert.ok(t >= before);
  });
});
