import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  AA_LARGE,
  AA_NONTEXT,
  AA_TEXT,
  contrastRatio,
  parseCustomProperties,
  relativeLuminance,
  resolveColor,
} from './contrast.js';

describe('WCAG thresholds', () => {
  test('are the numbers the spec names', () => {
    assert.equal(AA_TEXT, 4.5);
    assert.equal(AA_LARGE, 3);
    assert.equal(AA_NONTEXT, 3);
  });
});

describe('relativeLuminance', () => {
  test('anchors at the two ends of the range', () => {
    assert.equal(relativeLuminance('#000000'), 0);
    assert.equal(relativeLuminance('#ffffff'), 1);
  });

  test('weights green above red above blue', () => {
    const g = relativeLuminance('#00ff00');
    const r = relativeLuminance('#ff0000');
    const b = relativeLuminance('#0000ff');
    assert.ok(g > r && r > b, `expected green > red > blue, got ${g} ${r} ${b}`);
    assert.ok(Math.abs(g - 0.7152) < 1e-9);
  });

  test('refuses anything that is not #rrggbb', () => {
    assert.throws(() => relativeLuminance('red'), /expects #rrggbb/);
    assert.throws(() => relativeLuminance('#fff'), /expects #rrggbb/);
  });
});

describe('contrastRatio', () => {
  test('is 21:1 for black on white, and order-independent', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
    assert.equal(contrastRatio('#ffffff', '#000000'), 21);
  });

  test('is 1:1 for a colour on itself', () => {
    assert.equal(contrastRatio('#2563eb', '#2563eb'), 1);
  });

  test('reproduces values the components token layer documents', () => {
    // packages/components/src/tokens.css: "--bn-color-error-fg … 4.83:1 on white"
    assert.equal(contrastRatio('#dc2626', '#ffffff').toFixed(2), '4.83');
    // "gray-500 clears both: 4.83:1 on white … 3.67:1 on gray-900"
    assert.equal(contrastRatio('#71717a', '#ffffff').toFixed(2), '4.83');
    assert.equal(contrastRatio('#71717a', '#18181b').toFixed(2), '3.67');
    // theme.css: "gray-400 clears 4.5:1 on both gray-950 (7.76:1) and gray-900 (6.91:1)"
    assert.equal(contrastRatio('#a1a1aa', '#09090b').toFixed(2), '7.76');
    assert.equal(contrastRatio('#a1a1aa', '#18181b').toFixed(2), '6.91');
  });
});

describe('parseCustomProperties', () => {
  test('reads declarations out of a real rule', () => {
    const props = parseCustomProperties(':root { --a: #ffffff; --b: var(--a); color: red; }');
    assert.equal(props.get('--a'), '#ffffff');
    assert.equal(props.get('--b'), 'var(--a)');
    assert.equal(props.size, 2);
  });

  test('reads a final declaration with no trailing semicolon', () => {
    const props = parseCustomProperties(':root { --a: #123456 }');
    assert.equal(props.get('--a'), '#123456');
  });

  test('lets a later declaration win, as the cascade would', () => {
    const props = parseCustomProperties(':root { --a: #111111; } [data-x] { --a: #222222; }');
    assert.equal(props.get('--a'), '#222222');
  });
});

describe('resolveColor', () => {
  const props = parseCustomProperties(`:root {
    --ramp-900: #0f172a;
    --ink: var(--ramp-900);
    --text: var(--ink);
    --loop-a: var(--loop-b);
    --loop-b: var(--loop-a);
    --words: sans-serif;
    --fallback: var(--nope, #abcdef);
    --bad-fallback: var(--nope, sans-serif);
  }`);

  test('follows a chain to its literal and normalises case', () => {
    assert.equal(resolveColor('--text', props), '#0F172A');
    assert.equal(resolveColor('--ramp-900', props), '#0F172A');
  });

  test('throws on a dangling reference', () => {
    assert.throws(() => resolveColor('--missing', props), /Unknown custom property --missing/);
  });

  test('throws on a cycle rather than recursing forever', () => {
    assert.throws(() => resolveColor('--loop-a', props), /Cyclic custom property reference/);
  });

  test('throws when the terminal is not a colour', () => {
    assert.throws(() => resolveColor('--words', props), /not a plain hex colour/);
  });

  test('takes a var() fallback only when the name is undeclared', () => {
    assert.equal(resolveColor('--fallback', props), '#ABCDEF');
    assert.throws(() => resolveColor('--bad-fallback', props), /Unknown custom property --nope/);
  });
});
