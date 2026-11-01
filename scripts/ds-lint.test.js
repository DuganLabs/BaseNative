import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { rawLiterals, RULES } from './ds-lint.js';

test('DS009 finds raw colours, lengths and durations', () => {
  assert.deepEqual(rawLiterals('0 0 0 1px #fff'), ['#fff', '1px']);
  assert.deepEqual(rawLiterals('rgb(0 0 0 / 0.4)'), ['rgb(0 0 0 / 0.4)']);
  assert.deepEqual(rawLiterals('opacity 250ms ease'), ['250ms']);
  assert.deepEqual(rawLiterals('min(90vw, 22rem)'), ['90vw', '22rem']);
  assert.deepEqual(rawLiterals('-0.01em'), ['-0.01em']);
});

test('DS009 leaves token reads, zero, percentages and fallbacks alone', () => {
  assert.deepEqual(rawLiterals('var(--spacing-4)'), []);
  assert.deepEqual(rawLiterals('0 0 0 var(--size-1px) var(--color-border-separator)'), []);
  assert.deepEqual(rawLiterals('0'), []);
  assert.deepEqual(rawLiterals('100%'), []);
  assert.deepEqual(rawLiterals('repeat(6, minmax(0, 1fr))'), []);
  assert.deepEqual(rawLiterals('var(--x, 2px)'), []);
});

test('the token sheet is the one file DS009 exempts, and it is never baselined', () => {
  assert.equal(RULES.DS009.tokenFile, 'packages/components/src/tokens.css');
  const { entries } = JSON.parse(
    readFileSync(new URL('../design-system.baseline.json', import.meta.url), 'utf8'),
  );
  assert.ok(!Object.keys(entries).some((k) => k.startsWith(`DS009|${RULES.DS009.tokenFile}|`)));
});

test('the docs-site stylesheets are in the lint scope', () => {
  const out = execFileSync(process.execPath, [new URL('./ds-lint.js', import.meta.url).pathname], {
    encoding: 'utf8',
  });
  assert.match(out, /design-system lint passed/);
  const { entries } = JSON.parse(
    readFileSync(new URL('../design-system.baseline.json', import.meta.url), 'utf8'),
  );
  assert.ok(
    Object.keys(entries).some((k) => k.startsWith('DS009|examples/express/public/styles.css|')),
  );
});
