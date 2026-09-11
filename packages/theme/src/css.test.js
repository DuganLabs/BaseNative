import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { minifyCss } from './css.js';
import { toCss } from './theme.js';
import { defineTheme } from './index.js';
import { minimalTheme } from './test-fixtures.js';

describe('minifyCss', () => {
  test('strips the rationale the browser does not need', () => {
    const out = minifyCss(`/* why this exists\n   over two lines */\n:root { --a: 1; }`);
    assert.equal(out, ':root { --a: 1; }');
  });

  test('strips leading indentation and the blank lines that leaves', () => {
    const out = minifyCss(`:root {\n    --a: 1;\n\n    --b: 2;\n}`);
    assert.equal(out, ':root {\n--a: 1;\n--b: 2;\n}');
  });

  test('leaves whitespace inside a selector, a calc() and a quoted string alone', () => {
    const css = `a > b { width: calc(100% - 2px); font-family: 'Segoe UI', sans-serif; }`;
    assert.equal(minifyCss(css), css);
  });

  test('is idempotent', () => {
    const once = minifyCss('/* c */\n  :root { --a: 1; }');
    assert.equal(minifyCss(once), once);
  });

  test('takes a real bite out of an emitted theme without breaking it', () => {
    const css = toCss(defineTheme(minimalTheme()));
    const small = minifyCss(css);
    assert.ok(small.length < css.length, 'expected the comments to cost something');
    assert.equal(small.includes('/*'), false);
    // Every declaration survives — only prose and indentation go.
    const count = (s) => (s.match(/--bn-[a-z0-9-]+:/g) ?? []).length;
    assert.equal(count(small), count(css));
  });
});
