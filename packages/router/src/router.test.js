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

  it('resolves trailing slash in URL', () => {
    const result = resolveRoute(routes, '/users/');
    assert.equal(result.name, 'users');
  });

  it('extracts wildcard params across multiple segments', () => {
    const result = resolveRoute(routes, '/files/docs/api/router.md');
    assert.equal(result.name, 'files');
    assert.equal(result.params.path, 'docs/api/router.md');
  });

  it('returns empty params for matched static route', () => {
    const result = resolveRoute(routes, '/');
    assert.deepEqual(result.params, {});
  });

  it('includes empty query object when no query string', () => {
    const result = resolveRoute(routes, '/users/1');
    assert.deepEqual(result.query, {});
  });

  it('first matching route wins (route priority)', () => {
    const priorityRoutes = [
      { path: '/users/new', name: 'user-new' },
      { path: '/users/:id', name: 'user-detail' },
    ];
    const result = resolveRoute(priorityRoutes, '/users/new');
    assert.equal(result.name, 'user-new');
  });

  it('returns correct matched route object reference', () => {
    const result = resolveRoute(routes, '/users/42');
    assert.ok(result.matched);
    assert.equal(result.matched.name, 'user-detail');
  });

  it('returns path from route definition', () => {
    const result = resolveRoute(routes, '/users');
    assert.equal(result.path, '/users');
  });

  it('handles routes with no name — falls back to path', () => {
    const noNameRoutes = [{ path: '/no-name' }];
    const result = resolveRoute(noNameRoutes, '/no-name');
    assert.equal(result.name, '/no-name');
  });

  it('handles multiple query params', () => {
    const result = resolveRoute(routes, '/users?page=3&sort=email&dir=asc');
    assert.deepEqual(result.query, { page: '3', sort: 'email', dir: 'asc' });
  });

  it('returns path from matched url for unmatched routes', () => {
    const result = resolveRoute(routes, '/404page');
    assert.equal(result.path, '/404page');
  });

  it('resolves root with trailing slash and base path', () => {
    const result = resolveRoute(routes, '/app/', { base: '/app' });
    assert.equal(result.name, 'home');
  });

  it('extracts param from URL with query string', () => {
    const result = resolveRoute(routes, '/users/99?foo=bar');
    assert.equal(result.params.id, '99');
    assert.deepEqual(result.query, { foo: 'bar' });
  });

  it('handles empty routes array', () => {
    const result = resolveRoute([], '/users');
    assert.equal(result.name, null);
    assert.equal(result.matched, null);
  });

  it('params are always strings', () => {
    const result = resolveRoute(routes, '/users/123');
    assert.equal(typeof result.params.id, 'string');
    assert.equal(result.params.id, '123');
  });

  it('includes matched route reference', () => {
    const result = resolveRoute(routes, '/users');
    assert.equal(result.matched, routes[1]);
  });
});
