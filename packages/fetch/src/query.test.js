import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { joinUrl, serializeQuery } from './query.js';

describe('serializeQuery', () => {
  it('returns empty string for undefined', () => {
    assert.equal(serializeQuery(undefined), '');
  });

  it('returns empty string for empty params', () => {
    assert.equal(serializeQuery({}), '');
  });

  it('serialises a single param', () => {
    assert.equal(serializeQuery({ q: 'hello' }), '?q=hello');
  });

  it('joins multiple params with &', () => {
    assert.equal(serializeQuery({ page: 1, perPage: 25 }), '?page=1&perPage=25');
  });

  it('skips null and undefined values', () => {
    assert.equal(serializeQuery({ q: 'a', empty: null, missing: undefined }), '?q=a');
  });

  it('encodes special characters in keys and values', () => {
    assert.equal(serializeQuery({ 'a b': 'c d' }), '?a%20b=c%20d');
  });

  it('serialises array values as repeated keys', () => {
    assert.equal(serializeQuery({ tag: ['a', 'b'] }), '?tag=a&tag=b');
  });

  it('skips null values inside an array', () => {
    assert.equal(serializeQuery({ tag: ['a', null, 'b'] }), '?tag=a&tag=b');
  });

  it('coerces numbers and booleans to strings', () => {
    assert.equal(serializeQuery({ active: true, count: 0 }), '?active=true&count=0');
  });

  it('returns empty string when all values are null/undefined', () => {
    assert.equal(serializeQuery({ a: null, b: undefined }), '');
  });

  it('sorts keys so equivalent objects serialize identically', () => {
    assert.equal(serializeQuery({ b: 1, a: 2 }), '?a=2&b=1');
    assert.equal(serializeQuery({ b: 1, a: 2 }), serializeQuery({ a: 2, b: 1 }));
  });

  it('preserves element order inside arrays', () => {
    assert.equal(serializeQuery({ tag: ['z', 'a'] }), '?tag=z&tag=a');
  });
});

describe('joinUrl', () => {
  it('joins base and path with single slash', () => {
    assert.equal(joinUrl('https://api.example.com', '/users'), 'https://api.example.com/users');
  });

  it('handles trailing slash on base', () => {
    assert.equal(joinUrl('https://api.example.com/', '/users'), 'https://api.example.com/users');
  });

  it('adds missing leading slash on path', () => {
    assert.equal(joinUrl('https://api.example.com', 'users'), 'https://api.example.com/users');
  });

  it('returns path unchanged when base is empty', () => {
    assert.equal(joinUrl('', '/users'), '/users');
  });

  it('returns absolute URL untouched', () => {
    assert.equal(joinUrl('https://api.example.com', 'https://elsewhere.com/x'), 'https://elsewhere.com/x');
  });

  it('keeps a base path prefix and a query string already on the path', () => {
    assert.equal(joinUrl('https://api.example.com/v1/', 'users?x=1'), 'https://api.example.com/v1/users?x=1');
  });
});
