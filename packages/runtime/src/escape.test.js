/**
 * Tests for the shared escaping module.
 *
 * The original XSS was a server/client disagreement, not merely a missing escape:
 * the client bound through textContent (safe) while the server concatenated raw
 * strings (injectable), so hydration erased the evidence after the script ran.
 * Both sides now read from this module — these tests pin its contract.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeText, escapeAttr, raw, isRaw, unwrapRaw, isUrlAttribute, sanitizeUrl, findInterpolations,
} from './shared/escape.js';
import { interpolate } from './evaluate.js';

const TAB = String.fromCharCode(9);
const NUL = String.fromCharCode(0);

describe('escapeText', () => {
  it('escapes the three text-context characters', () => {
    assert.equal(escapeText('<a>&</a>'), '&lt;a&gt;&amp;&lt;/a&gt;');
  });

  // & must be replaced first or the later substitutions get double-encoded.
  it('does not double-encode', () => {
    assert.equal(escapeText('&lt;'), '&amp;lt;');
  });

  it('leaves quotes alone — they are only dangerous in an attribute', () => {
    assert.equal(escapeText('say "hi"'), 'say "hi"');
  });
});

describe('escapeAttr', () => {
  it('additionally escapes both quote characters', () => {
    assert.equal(escapeAttr('" onx="'), '&quot; onx=&quot;');
    assert.equal(escapeAttr("it's"), 'it&#39;s');
  });
});

describe('raw', () => {
  it('round-trips through isRaw and unwrapRaw', () => {
    const r = raw('<em>x</em>');
    assert.equal(isRaw(r), true);
    assert.equal(unwrapRaw(r), '<em>x</em>');
  });

  it('treats ordinary values as not raw', () => {
    for (const v of ['x', 1, null, undefined, {}, []]) assert.equal(isRaw(v), false);
    assert.equal(unwrapRaw('x'), 'x');
  });
});

describe('sanitizeUrl', () => {
  for (const [label, value] of [
    ['javascript:', 'javascript:alert(1)'],
    ['mixed case', 'JaVaScRiPt:alert(1)'],
    ['leading space', ' javascript:alert(1)'],
    ['embedded tab', `java${TAB}script:alert(1)`],
    ['leading NUL', `${NUL}javascript:alert(1)`],
    ['vbscript:', 'vbscript:x'],
    ['data:', 'data:text/html,x'],
  ]) {
    it(`rejects ${label}`, () => assert.equal(sanitizeUrl(value), null));
  }

  for (const value of ['https://ok.com', '/relative', './rel', '?q=1', '#frag', 'mailto:a@b.c', 'tel:+123']) {
    it(`allows ${value}`, () => assert.equal(sanitizeUrl(value), value));
  }
});

describe('isUrlAttribute', () => {
  it('covers the navigable/fetchable attributes', () => {
    for (const a of ['href', 'src', 'action', 'formaction', 'poster', 'HREF']) {
      assert.equal(isUrlAttribute(a), true, a);
    }
  });

  it('does not treat ordinary attributes as URLs', () => {
    for (const a of ['title', 'class', 'id', 'value']) assert.equal(isUrlAttribute(a), false, a);
  });
});

describe('interpolate', () => {
  it('returns a plain string when nothing is raw', () => {
    const out = interpolate('Hi {{ name }}', { name: 'Ada' });
    assert.equal(isRaw(out), false);
    assert.equal(out, 'Hi Ada');
  });

  // Plain results go to textContent, which never parses HTML, so the client does
  // not need to escape them — it must NOT escape them, or users see entities.
  it('does not escape a plain result', () => {
    assert.equal(interpolate('{{ v }}', { v: '<b>' }), '<b>');
  });

  it('returns a raw result when a substitution is raw', () => {
    const out = interpolate('{{ v }}', { v: raw('<em>x</em>') });
    assert.equal(isRaw(out), true);
    assert.equal(unwrapRaw(out), '<em>x</em>');
  });

  it('escapes literals and non-raw neighbours once any value is raw', () => {
    const out = interpolate('<{{ a }}{{ b }}', { a: raw('<em>ok</em>'), b: '<script>' });
    assert.equal(isRaw(out), true);
    assert.equal(unwrapRaw(out), '&lt;<em>ok</em>&lt;script&gt;');
  });

  it('renders null and undefined as empty', () => {
    assert.equal(interpolate('[{{ v }}]', { v: null }), '[]');
    assert.equal(interpolate('[{{ v }}]', {}), '[]');
  });
});

describe('findInterpolations', () => {
  it('finds each expression with its span', () => {
    const [a, b] = findInterpolations('x {{ one }} y {{two}} z');
    assert.deepEqual(a, { start: 2, end: 11, expression: 'one' });
    assert.deepEqual(b, { start: 14, end: 21, expression: 'two' });
  });

  it('runs to the first closing braces, like the regex it replaces', () => {
    assert.deepEqual(findInterpolations('{{ a }} }}').map((m) => m.expression), ['a']);
  });

  it('ignores empty and whitespace-only interpolations', () => {
    assert.deepEqual(findInterpolations('{{}} {{   }} {{ok}}').map((m) => m.expression), ['ok']);
  });

  it('ignores an unclosed interpolation', () => {
    assert.deepEqual(findInterpolations('{{ never closed'), []);
  });

  // The regex /\{\{\s*(.+?)\s*\}\}/ was polynomial on whitespace runs. This is on
  // the untrusted-input path (model-generated templates), so it must be linear.
  it('is linear on pathological whitespace', () => {
    const input = '{{' + ' '.repeat(50_000);
    const t0 = performance.now();
    assert.deepEqual(findInterpolations(input), []);
    assert.ok(performance.now() - t0 < 200, 'took too long — not linear');
  });

  it('is linear on many unclosed openers', () => {
    const input = '{{ '.repeat(20_000);
    const t0 = performance.now();
    findInterpolations(input);
    assert.ok(performance.now() - t0 < 200, 'took too long — not linear');
  });
});
