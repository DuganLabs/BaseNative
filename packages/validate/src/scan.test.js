/**
 * The scanner reads untrusted, model-generated templates, so it must be linear in
 * the input. These tests pin both the contract and the cost.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanTags, scanInterpolations, spanAt } from './scan.js';

const names = (src) => scanTags(src).map((t) => (t.closing ? '/' : '') + t.tagName);
const attrsOf = (src, i = 0) => scanTags(src)[i].attrs.map((a) => [a.name, a.value]);

describe('scanTags', () => {
  it('reports open and close tags in order with absolute offsets', () => {
    const src = '<div>\n  <p class="x">hi</p>\n</div>';
    const tags = scanTags(src);
    assert.deepEqual(names(src), ['div', 'p', '/p', '/div']);
    assert.equal(tags[1].offset, src.indexOf('<p'));
    assert.equal(tags[1].raw, '<p class="x">');
    assert.equal(tags[1].attrs[0].offset, src.indexOf('class='));
  });

  it('parses quoted, single-quoted, unquoted and bare attributes', () => {
    assert.deepEqual(attrsOf(`<input type="text" name='n' value=5 disabled>`), [
      ['type', 'text'], ['name', 'n'], ['value', '5'], ['disabled', null],
    ]);
  });

  it('admits foreign attribute names so they can be rejected downstream', () => {
    const src = `<li *ngFor="let x of xs" [disabled]="d" (click)="go()" v-bind:id="i" on:click="h" @if="a" :cls="c">`;
    assert.deepEqual(attrsOf(src).map(([n]) => n), [
      '*ngFor', '[disabled]', '(click)', 'v-bind:id', 'on:click', '@if', ':cls',
    ]);
  });

  it('keeps a > inside a quoted value from ending the tag', () => {
    const tags = scanTags(`<p title="a > b">x</p>`);
    assert.equal(tags[0].raw, `<p title="a > b">`);
    assert.deepEqual(attrsOf(`<p title="a > b">x</p>`), [['title', 'a > b']]);
  });

  it('lowercases tag names and marks self-closing tags', () => {
    const tags = scanTags('<DIV><Br/><img src=x /></DIV>');
    assert.deepEqual(tags.map((t) => t.tagName), ['div', 'br', 'img', 'div']);
    assert.ok(tags[1].raw.endsWith('/>'));
    assert.deepEqual(attrsOf('<img src=x />'), [['src', 'x']]);
  });

  it('ignores comments, doctype and stray angle brackets', () => {
    assert.deepEqual(names('<!doctype html><!-- <b>no</b> -->a < b <3 <p>x</p>'), ['p', '/p']);
  });

  it('does not let an unbalanced quote swallow the rest of the template', () => {
    const tags = scanTags(`<p title="oops>x</p><b>y</b>`);
    assert.ok(names(`<p title="oops>x</p><b>y</b>`).includes('b'), 'later tags were lost');
    assert.equal(tags[0].tagName, 'p');
  });

  it('stops cleanly on an unterminated tag', () => {
    assert.deepEqual(names('<p>ok</p><div class="x'), ['p', '/p']);
  });

  // The regex this replaces, /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/,
  // was polynomial on unbalanced quotes.
  it('is linear on pathological unbalanced quotes', () => {
    const src = '<div ' + '"'.repeat(20_001) + '>';
    const t0 = performance.now();
    scanTags(src);
    assert.ok(performance.now() - t0 < 200, 'took too long — not linear');
  });

  it('is linear on many attributes and many tags', () => {
    const src = '<div ' + 'a="b" '.repeat(20_000) + '>' + '<i></i>'.repeat(20_000);
    const t0 = performance.now();
    const tags = scanTags(src);
    assert.ok(performance.now() - t0 < 500, 'took too long — not linear');
    assert.equal(tags[0].attrs.length, 20_000);
    assert.equal(tags.length, 1 + 40_000);
  });
});

describe('scanInterpolations', () => {
  it('returns expression and offset', () => {
    const src = 'a {{ x.y }} b {{z}}';
    assert.deepEqual(scanInterpolations(src), [
      { expression: 'x.y', offset: 2 },
      { expression: 'z', offset: 14 },
    ]);
  });

  it('matches across newlines and ignores empty braces', () => {
    assert.deepEqual(scanInterpolations('{{\n a \n}} {{}}').map((m) => m.expression), ['a']);
  });

  // /\{\{\s*(.+?)\s*\}\}/gs was polynomial on whitespace runs.
  it('is linear on pathological whitespace', () => {
    const src = '{{' + ' '.repeat(50_000);
    const t0 = performance.now();
    assert.deepEqual(scanInterpolations(src), []);
    assert.ok(performance.now() - t0 < 200, 'took too long — not linear');
  });
});

describe('spanAt', () => {
  it('converts offsets to 1-based line and column', () => {
    assert.deepEqual(spanAt('ab\ncd', 0), { line: 1, col: 1 });
    assert.deepEqual(spanAt('ab\ncd', 3), { line: 2, col: 1 });
    assert.deepEqual(spanAt('ab\ncd', 4), { line: 2, col: 2 });
  });
});
