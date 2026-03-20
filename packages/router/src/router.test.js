import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from './router.js';

const routes = [
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user-detail' },
  { path: '/files/*path', name: 'files' },
];

describe('resolveRoute', () => {
  it('resolves the root route', () => {
    const result = resolveRoute(routes, '/');
    assert.equal(result.name, 'home');
    assert.deepEqual(result.params, {});
  });

  it('resolves a static route', () => {
    const result = resolveRoute(routes, '/users');
    assert.equal(result.name, 'users');
  });

  it('resolves a parameterized route', () => {
    const result = resolveRoute(routes, '/users/42');
    assert.equal(result.name, 'user-detail');
    assert.deepEqual(result.params, { id: '42' });
  });

  it('resolves a wildcard route', () => {
    const result = resolveRoute(routes, '/files/docs/guide.md');
    assert.equal(result.name, 'files');
    assert.deepEqual(result.params, { path: 'docs/guide.md' });
  });

  it('resolves query parameters', () => {
    const result = resolveRoute(routes, '/users?page=2&sort=name');
    assert.equal(result.name, 'users');
    assert.deepEqual(result.query, { page: '2', sort: 'name' });
  });

  it('returns null name for unmatched routes', () => {
    const result = resolveRoute(routes, '/unknown');
    assert.equal(result.name, null);
    assert.equal(result.matched, null);
  });

  it('handles base path option', () => {
    const result = resolveRoute(routes, '/app/users/5', { base: '/app' });
    assert.equal(result.name, 'user-detail');
    assert.deepEqual(result.params, { id: '5' });
  });
});
