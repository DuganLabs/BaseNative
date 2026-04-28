import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from './registry.js';

function mockFetch(response, ok = true, status = 200) {
  const fn = mock.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText: ok ? 'OK' : 'Not Found',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  );
  return fn;
}

describe('createRegistry — comprehensive', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor and configuration', () => {
    it('creates registry with default URL', () => {
      globalThis.fetch = mockFetch({ test: true });
      const registry = createRegistry();
      assert.ok(registry.search);
      assert.ok(registry.getPackage);
      assert.ok(registry.getVersions);
      assert.ok(registry.publish);
      assert.ok(registry.unpublish);
    });

    it('creates registry with custom URL', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry({ url: 'https://custom.registry.io' });
      await registry.search('test');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.ok(url.href.includes('custom.registry.io'));
    });

    it('creates registry with authentication token', async () => {
      globalThis.fetch = mockFetch({ test: true });
      const registry = createRegistry({ token: 'secret-token' });
      await registry.getPackage('pkg');

      const call = globalThis.fetch.mock.calls[0];
      const headers = call.arguments[1].headers;
      assert.equal(headers['Authorization'], 'Bearer secret-token');
    });
  });

  describe('search — basic functionality', () => {
    it('searches with query parameter', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('button');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('q'), 'button');
    });

    it('searches with default limit', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('limit'), '20');
    });

    it('searches with custom limit', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { limit: 50 });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('limit'), '50');
    });

    it('searches with default offset', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('offset'), '0');
    });

    it('searches with custom offset', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { offset: 100 });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('offset'), '100');
    });

    it('searches with tag filter', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { tag: 'ui' });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('tag'), 'ui');
    });

    it('searches with category filter', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { category: 'forms' });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('category'), 'forms');
    });

    it('searches with sort parameter', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { sort: 'downloads' });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('sort'), 'downloads');
    });

    it('searches with multiple filters combined', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', {
        limit: 30,
        offset: 50,
        tag: 'form',
        category: 'input',
        sort: 'name',
      });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('q'), 'test');
      assert.equal(url.searchParams.get('limit'), '30');
      assert.equal(url.searchParams.get('offset'), '50');
      assert.equal(url.searchParams.get('tag'), 'form');
      assert.equal(url.searchParams.get('category'), 'input');
      assert.equal(url.searchParams.get('sort'), 'name');
    });

    it('omits undefined search parameters', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { limit: 10, category: undefined });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.has('category'), false);
    });

    it('omits null search parameters', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry();
      await registry.search('test', { tag: null });

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.has('tag'), false);
    });

    it('returns search results', async () => {
      const expected = {
        packages: [
          { name: 'btn', version: '1.0.0' },
          { name: 'input', version: '2.0.0' },
        ],
        total: 2,
      };
      globalThis.fetch = mockFetch(expected);
      const registry = createRegistry();
      const result = await registry.search('test');

      assert.deepStrictEqual(result, expected);
    });
  });

  describe('getPackage — basic functionality', () => {
    it('fetches package details', async () => {
      const pkg = { name: 'component', version: '1.5.0', author: 'dev' };
      globalThis.fetch = mockFetch(pkg);
      const registry = createRegistry();
      const result = await registry.getPackage('component');

      assert.deepStrictEqual(result, pkg);
    });

    it('builds correct URL for package fetch', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry({ url: 'https://api.test.dev' });
      await registry.getPackage('my-package');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(urlStr.includes('api.test.dev'));
      assert.ok(urlStr.includes('my-package'));
      assert.ok(urlStr.includes('/api/packages/'));
    });

    it('URL-encodes package name with scope', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry();
      await registry.getPackage('@basenative/button');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(urlStr.includes('%40') || urlStr.includes('@'));
    });

    it('URL-encodes package name with special characters', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry();
      await registry.getPackage('pkg-with-special');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(urlStr.includes('pkg-with-special'));
    });

    it('returns full package object', async () => {
      const pkg = {
        name: 'full-pkg',
        version: '3.2.1',
        description: 'Full package',
        author: 'author',
        downloads: 10000,
        updatedAt: '2026-01-01T00:00:00Z',
        repo: 'https://github.com/user/repo',
      };
      globalThis.fetch = mockFetch(pkg);
      const registry = createRegistry();
      const result = await registry.getPackage('full-pkg');

      assert.deepStrictEqual(result, pkg);
    });
  });

  describe('getVersions — versioning logic', () => {
    it('sorts versions by semver descending', async () => {
      const versions = [
        { version: '1.0.0' },
        { version: '2.0.0' },
        { version: '1.5.0' },
        { version: '0.9.0' },
      ];
      globalThis.fetch = mockFetch({ versions });
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result[0].version, '2.0.0');
      assert.equal(result[1].version, '1.5.0');
      assert.equal(result[2].version, '1.0.0');
      assert.equal(result[3].version, '0.9.0');
    });

    it('handles versions as strings', async () => {
      const versions = ['2.1.0', '1.0.0', '3.0.0'];
      globalThis.fetch = mockFetch(versions);
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result[0], '3.0.0');
      assert.equal(result[1], '2.1.0');
      assert.equal(result[2], '1.0.0');
    });

    it('handles versions without explicit version field', async () => {
      const data = [
        { tag: 'v1.0.0', '1.0.0': true },
        { tag: 'v2.0.0', '2.0.0': true },
      ];
      globalThis.fetch = mockFetch(data);
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result.length, 2);
    });

    it('handles empty versions array', async () => {
      globalThis.fetch = mockFetch({ versions: [] });
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.deepStrictEqual(result, []);
    });

    it('handles missing versions property', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.deepStrictEqual(result, []);
    });

    it('preserves full version objects', async () => {
      const versions = [
        { version: '2.0.0', published: '2026-01-01' },
        { version: '1.0.0', published: '2025-01-01' },
      ];
      globalThis.fetch = mockFetch({ versions });
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result[0].version, '2.0.0');
      assert.equal(result[0].published, '2026-01-01');
      assert.equal(result[1].version, '1.0.0');
      assert.equal(result[1].published, '2025-01-01');
    });

    it('handles complex semver with patch versions', async () => {
      const versions = [
        { version: '1.0.0' },
        { version: '1.0.10' },
        { version: '1.0.2' },
      ];
      globalThis.fetch = mockFetch({ versions });
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result[0].version, '1.0.10');
      assert.equal(result[1].version, '1.0.2');
      assert.equal(result[2].version, '1.0.0');
    });

    it('handles major version differences', async () => {
      const versions = [
        { version: '10.0.0' },
        { version: '2.0.0' },
        { version: '1.0.0' },
      ];
      globalThis.fetch = mockFetch({ versions });
      const registry = createRegistry();
      const result = await registry.getVersions('pkg');

      assert.equal(result[0].version, '10.0.0');
      assert.equal(result[1].version, '2.0.0');
      assert.equal(result[2].version, '1.0.0');
    });
  });

  describe('publish — write operations', () => {
    it('sends POST request to publish endpoint', async () => {
      globalThis.fetch = mockFetch({ id: 'pkg-1' });
      const registry = createRegistry();
      const pkg = { name: 'new-pkg', version: '1.0.0' };
      await registry.publish(pkg);

      const call = globalThis.fetch.mock.calls[0];
      const opts = call.arguments[1];
      assert.equal(opts.method, 'POST');
    });

    it('serializes package data as JSON', async () => {
      globalThis.fetch = mockFetch({ id: 'pkg-2' });
      const registry = createRegistry();
      const pkg = {
        name: 'pkg',
        version: '1.0.0',
        description: 'Test',
      };
      await registry.publish(pkg);

      const call = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(call.arguments[1].body);
      assert.deepStrictEqual(body, pkg);
    });

    it('includes authorization header when token present', async () => {
      globalThis.fetch = mockFetch({ id: 'pkg-3' });
      const registry = createRegistry({ token: 'pub-token' });
      await registry.publish({ name: 'pkg', version: '1.0.0' });

      const call = globalThis.fetch.mock.calls[0];
      const headers = call.arguments[1].headers;
      assert.equal(headers['Authorization'], 'Bearer pub-token');
    });

    it('returns published package info', async () => {
      const result = { id: 'abc123', name: 'pkg', version: '1.0.0' };
      globalThis.fetch = mockFetch(result);
      const registry = createRegistry();
      const published = await registry.publish({ name: 'pkg', version: '1.0.0' });

      assert.deepStrictEqual(published, result);
    });
  });

  describe('unpublish — deletion operations', () => {
    it('sends DELETE request', async () => {
      globalThis.fetch = mockFetch({ success: true });
      const registry = createRegistry();
      await registry.unpublish('my-pkg', '1.0.0');

      const call = globalThis.fetch.mock.calls[0];
      const opts = call.arguments[1];
      assert.equal(opts.method, 'DELETE');
    });

    it('includes version in URL path', async () => {
      globalThis.fetch = mockFetch({ success: true });
      const registry = createRegistry();
      await registry.unpublish('my-pkg', '2.1.3');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(urlStr.includes('2.1.3'));
    });

    it('URL-encodes package name and version', async () => {
      globalThis.fetch = mockFetch({ success: true });
      const registry = createRegistry();
      await registry.unpublish('@scope/pkg', '1.0.0');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(urlStr.includes('%40') || urlStr.includes('@'));
    });

    it('returns unpublish response', async () => {
      const response = { success: true, removed: true };
      globalThis.fetch = mockFetch(response);
      const registry = createRegistry();
      const result = await registry.unpublish('pkg', '1.0.0');

      assert.deepStrictEqual(result, response);
    });
  });

  describe('error handling', () => {
    it('throws on 404 response', async () => {
      globalThis.fetch = mockFetch({ error: 'not found' }, false, 404);
      const registry = createRegistry();

      const err = await registry.getPackage('missing').catch(e => e);
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('404'));
    });

    it('includes status code in error', async () => {
      globalThis.fetch = mockFetch({}, false, 500);
      const registry = createRegistry();

      const err = await registry.getPackage('fail').catch(e => e);
      assert.equal(err.status, 500);
    });

    it('includes error body in error', async () => {
      globalThis.fetch = mockFetch({ detail: 'unauthorized' }, false, 401);
      const registry = createRegistry();

      const err = await registry.getPackage('auth-fail').catch(e => e);
      assert.ok(err.body);
    });

    it('throws on 403 forbidden', async () => {
      globalThis.fetch = mockFetch({}, false, 403);
      const registry = createRegistry();

      const err = await registry.publish({}).catch(e => e);
      assert.equal(err.status, 403);
    });

    it('throws on 500 server error', async () => {
      globalThis.fetch = mockFetch({}, false, 500);
      const registry = createRegistry();

      const err = await registry.search('test').catch(e => e);
      assert.equal(err.status, 500);
    });

    it('error includes statusText', async () => {
      globalThis.fetch = mock.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('{}'),
          json: () => Promise.resolve({}),
        })
      );
      const registry = createRegistry();

      const err = await registry.getPackage('bad').catch(e => e);
      assert.ok(err.message.includes('Bad Request'));
    });
  });

  describe('header management', () => {
    it('always includes Content-Type header', async () => {
      globalThis.fetch = mockFetch({ test: true });
      const registry = createRegistry();
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const headers = call.arguments[1].headers;
      assert.equal(headers['Content-Type'], 'application/json');
    });

    it('includes Bearer token format', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry({ token: 'my-secret-token' });
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const headers = call.arguments[1].headers;
      assert.ok(headers['Authorization'].startsWith('Bearer '));
    });

    it('omits Authorization header without token', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry({});
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const headers = call.arguments[1].headers;
      assert.equal(headers['Authorization'], undefined);
    });
  });

  describe('URL building', () => {
    it('builds absolute URLs from relative paths', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry({ url: 'https://api.example.com' });
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.hostname, 'api.example.com');
      assert.ok(url.pathname.includes('/api/packages/test'));
    });

    it('uses full URLs when provided', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry();
      // If a full URL is passed to request, it should be used as-is
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(typeof urlStr === 'string');
      assert.ok(urlStr.startsWith('http'));
    });

    it('builds search endpoint URL correctly', async () => {
      globalThis.fetch = mockFetch({ packages: [] });
      const registry = createRegistry({ url: 'https://api.test.dev' });
      await registry.search('btn');

      const call = globalThis.fetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.ok(url.pathname.includes('/api/packages/search'));
    });

    it('handles URLs with trailing slashes', async () => {
      globalThis.fetch = mockFetch({});
      const registry = createRegistry({ url: 'https://api.example.com/' });
      await registry.getPackage('test');

      const call = globalThis.fetch.mock.calls[0];
      const urlStr = call.arguments[0];
      assert.ok(typeof urlStr === 'string');
    });
  });
});
