import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, isValidIdentifier } from './escape.js';

describe('escapeHtml', () => {
  test('escapes <, >, &, ", \'', () => {
    assert.equal(escapeHtml('<a href="x">y\'s</a>'), '&lt;a href=&quot;x&quot;&gt;y&#39;s&lt;/a&gt;');
  });

  test('handles null and undefined as empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  test('coerces numbers and booleans', () => {
    assert.equal(escapeHtml(42), '42');
    assert.equal(escapeHtml(true), 'true');
  });
});

describe('isValidIdentifier', () => {
  test('accepts valid JS identifiers', () => {
    assert.equal(isValidIdentifier('foo'), true);
    assert.equal(isValidIdentifier('_foo'), true);
    assert.equal(isValidIdentifier('$foo'), true);
    assert.equal(isValidIdentifier('foo123'), true);
  });

  test('rejects invalid identifiers', () => {
    assert.equal(isValidIdentifier(''), false);
    assert.equal(isValidIdentifier('1foo'), false);
    assert.equal(isValidIdentifier('foo bar'), false);
    assert.equal(isValidIdentifier('foo-bar'), false);
    assert.equal(isValidIdentifier(null), false);
    assert.equal(isValidIdentifier(undefined), false);
  });
});
