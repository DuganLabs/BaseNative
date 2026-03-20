import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResource, createMutation, createCache } from './index.js';

describe('createResource', () => {
  it('fetches data immediately by default', async () => {
    const resource = createResource(async () => ({ items: [1, 2, 3] }));
    // Wait for async fetch to complete
    await new Promise(r => setTimeout(r, 10));
    assert.deepEqual(resource.data(), { items: [1, 2, 3] });
    assert.equal(resource.loading(), false);
    assert.equal(resource.error(), null);
    assert.equal(resource.status(), 'success');
  });

  it('respects immediate: false', () => {
    const resource = createResource(async () => 'data', { immediate: false });
    assert.equal(resource.data(), null);
    assert.equal(resource.status(), 'idle');
  });

  it('handles fetch errors', async () => {
    const resource = createResource(async () => { throw new Error('fail'); });
    await new Promise(r => setTimeout(r, 10));
    assert.equal(resource.error().message, 'fail');
    assert.equal(resource.status(), 'error');
  });

  it('supports manual refetch', async () => {
    let count = 0;
    const resource = createResource(async () => ++count, { immediate: false });
    await resource.fetch();
    assert.equal(resource.data(), 1);
    await resource.refetch();
    assert.equal(resource.data(), 2);
  });

  it('supports optimistic mutation', async () => {
    const resource = createResource(async () => [1, 2, 3]);
    await new Promise(r => setTimeout(r, 10));
    resource.mutate(prev => [...prev, 4]);
    assert.deepEqual(resource.data(), [1, 2, 3, 4]);
  });

  it('uses initialData', () => {
    const resource = createResource(async () => 'fetched', { immediate: false, initialData: 'initial' });
    assert.equal(resource.data(), 'initial');
  });
});

describe('createMutation', () => {
  it('performs mutation and returns result', async () => {
    const mutation = createMutation(async (data) => ({ ...data, id: 1 }));
    const result = await mutation.mutate({ name: 'Alice' });
    assert.deepEqual(result, { name: 'Alice', id: 1 });
    assert.equal(mutation.status(), 'success');
  });

  it('handles mutation errors', async () => {
    const mutation = createMutation(async () => { throw new Error('fail'); });
    await mutation.mutate();
    assert.equal(mutation.status(), 'error');
    assert.equal(mutation.error().message, 'fail');
  });

  it('calls onSuccess callback', async () => {
    let called = false;
    const mutation = createMutation(async () => 'ok', {
      onSuccess: () => { called = true; },
    });
    await mutation.mutate();
    assert.ok(called);
  });

  it('resets state', async () => {
    const mutation = createMutation(async () => 'data');
    await mutation.mutate();
    assert.equal(mutation.status(), 'success');
    mutation.reset();
    assert.equal(mutation.status(), 'idle');
  });
});

describe('createCache', () => {
  it('stores and retrieves data', () => {
    const cache = createCache();
    cache.set('key1', { value: 42 });
    assert.deepEqual(cache.get('key1'), { value: 42 });
  });

  it('returns undefined for missing keys', () => {
    const cache = createCache();
    assert.equal(cache.get('missing'), undefined);
  });

  it('expires entries', async () => {
    const cache = createCache({ maxAge: 10 });
    cache.set('key1', 'data');
    assert.ok(cache.has('key1'));
    await new Promise(r => setTimeout(r, 20));
    assert.ok(!cache.has('key1'));
  });

  it('invalidates specific key', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.invalidate('a');
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
  });

  it('invalidates all keys', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.invalidate();
    assert.equal(cache.size, 0);
  });

  it('evicts oldest when maxSize exceeded', () => {
    const cache = createCache({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
  });
});
