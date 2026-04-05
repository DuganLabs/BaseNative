import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compilePattern, matchRoute, parseQuery, buildQuery } from './match.js';

describe('compilePattern', () => {
  it('compiles a static path', () => {
    const { regex, params } = compilePattern('/about');
    assert.equal(params.length, 0);
    assert.ok(regex.test('/about'));
    assert.ok(regex.test('/about/'));
    assert.ok(!regex.test('/about/more'));
  });

  it('compiles a path with named params', () => {
    const { regex, params } = compilePattern('/users/:id');
    assert.deepEqual(params, ['id']);
    assert.ok(regex.test('/users/123'));
    assert.ok(!regex.test('/users'));
  });

  it('compiles a path with multiple params', () => {
    const { regex, params } = compilePattern('/users/:userId/posts/:postId');
    assert.deepEqual(params, ['userId', 'postId']);
    assert.ok(regex.test('/users/1/posts/42'));
  });

  it('compiles a wildcard path', () => {
    const { regex, params } = compilePattern('/files/*path');
    assert.deepEqual(params, ['path']);
    assert.ok(regex.test('/files/a/b/c'));
  });
});

describe('matchRoute', () => {
  it('matches a static route', () => {
    const result = matchRoute('/about', '/about');
    assert.deepEqual(result, {});
  });

  it('returns null on mismatch', () => {
    const result = matchRoute('/about', '/contact');
    assert.equal(result, null);
  });

  it('extracts named params', () => {
    const result = matchRoute('/users/:id', '/users/42');
    assert.deepEqual(result, { id: '42' });
  });

  it('extracts multiple params', () => {
    const result = matchRoute('/users/:userId/posts/:postId', '/users/1/posts/99');
    assert.deepEqual(result, { userId: '1', postId: '99' });
  });

  it('extracts wildcard params', () => {
    const result = matchRoute('/files/*path', '/files/docs/readme.md');
    assert.deepEqual(result, { path: 'docs/readme.md' });
  });

  it('decodes URI components', () => {
    const result = matchRoute('/search/:query', '/search/hello%20world');
    assert.deepEqual(result, { query: 'hello world' });
  });

  it('accepts compiled patterns', () => {
    const compiled = compilePattern('/items/:id');
    const result = matchRoute(compiled, '/items/5');
    assert.deepEqual(result, { id: '5' });
  });
});

describe('parseQuery', () => {
  it('parses a query string', () => {
    assert.deepEqual(parseQuery('?page=1&sort=name'), { page: '1', sort: 'name' });
  });

  it('handles missing ?', () => {
    assert.deepEqual(parseQuery('page=1'), { page: '1' });
  });

  it('returns empty for empty string', () => {
    assert.deepEqual(parseQuery(''), {});
  });

  it('decodes URI components', () => {
    assert.deepEqual(parseQuery('?q=hello%20world'), { q: 'hello world' });
  });
});

describe('buildQuery', () => {
  it('builds a query string', () => {
    assert.equal(buildQuery({ page: '1', sort: 'name' }), '?page=1&sort=name');
  });

  it('returns empty for no params', () => {
    assert.equal(buildQuery({}), '');
  });

  it('skips null and undefined values', () => {
    assert.equal(buildQuery({ a: '1', b: null, c: undefined }), '?a=1');
  });
});

describe('compilePattern — additional', () => {
  it('root path compiles to match /', () => {
    const { regex } = compilePattern('/');
    assert.ok(regex.test('/'));
  });

  it('escapes special chars in static segments', () => {
    const { regex } = compilePattern('/v1.0/docs');
    assert.ok(regex.test('/v1.0/docs'));
    assert.ok(!regex.test('/v100/docs'));
  });

  it('unnamed wildcard defaults param name to "wild"', () => {
    const { params } = compilePattern('/catch/*');
    assert.deepEqual(params, ['wild']);
  });

  it('does not match subpaths for static route', () => {
    const { regex } = compilePattern('/exact');
    assert.ok(!regex.test('/exact/more'));
  });
});

describe('matchRoute — additional', () => {
  it('returns empty object for root path match', () => {
    const result = matchRoute('/', '/');
    assert.deepEqual(result, {});
  });

  it('returns null for partial path match', () => {
    const result = matchRoute('/users', '/userss');
    assert.equal(result, null);
  });

  it('handles trailing slash on pattern', () => {
    const result = matchRoute('/about/', '/about');
    assert.deepEqual(result, {});
  });

  it('wildcard without name captures as "wild"', () => {
    const result = matchRoute('/catch/*', '/catch/a/b/c');
    assert.deepEqual(result, { wild: 'a/b/c' });
  });
});

describe('parseQuery — additional', () => {
  it('handles param with no value', () => {
    const result = parseQuery('?flag');
    assert.equal(result.flag, '');
  });

  it('handles encoded key', () => {
    const result = parseQuery('?hello%20world=1');
    assert.equal(result['hello world'], '1');
  });
});

describe('buildQuery — additional', () => {
  it('encodes special characters in keys and values', () => {
    const result = buildQuery({ 'hello world': 'a&b' });
    assert.equal(result, '?hello%20world=a%26b');
  });

  it('single param has no trailing ampersand', () => {
    const result = buildQuery({ only: 'one' });
    assert.equal(result, '?only=one');
  });
});
