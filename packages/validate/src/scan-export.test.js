/**
 * The `./scan` subpath is the sanctioned way for tooling outside this package
 * (component-usage scanners, editor integrations) to reuse the real template
 * tokenizer instead of approximating it with regex. This test pins that the
 * subpath resolves and hands back the exact shape scan.js documents, so a
 * future refactor of scan.js can't silently break external consumers without
 * a test failing here first.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanTags, scanInterpolations, spanAt } from '@basenative/validate/scan';
import * as direct from './scan.js';

describe('the ./scan subpath export', () => {
  it('resolves to the same functions as the internal module', () => {
    assert.equal(scanTags, direct.scanTags);
    assert.equal(scanInterpolations, direct.scanInterpolations);
    assert.equal(spanAt, direct.spanAt);
  });

  it('scanTags returns the documented shape', () => {
    const [tag] = scanTags('<div data-bn="card" class="x">');
    assert.equal(tag.tagName, 'div');
    assert.equal(tag.closing, false);
    assert.equal(tag.offset, 0);
    assert.equal(tag.raw, '<div data-bn="card" class="x">');
    assert.deepEqual(tag.attrs, [
      { name: 'data-bn', value: 'card', offset: '<div '.length },
      { name: 'class', value: 'x', offset: '<div data-bn="card" '.length },
    ]);
  });

  it('scanInterpolations returns the documented shape', () => {
    const [interp] = scanInterpolations('<p>{{ count() }}</p>');
    assert.deepEqual(interp, { expression: 'count()', offset: 3 });
  });

  it('spanAt converts an offset into 1-based line/col', () => {
    assert.deepEqual(spanAt('ab\ncd', 4), { line: 2, col: 2 });
  });

  it('the "." export is unchanged', async () => {
    const root = await import('@basenative/validate');
    assert.equal(typeof root.validateTemplate, 'function');
    assert.equal(root.scanTags, undefined);
  });
});
