import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, 'fonts.css');
const srcDir = join(__dirname, 'src');

const css = readFileSync(cssPath, 'utf8');

describe('fonts.css', () => {
  test('file exists and is non-empty', () => {
    assert.ok(existsSync(cssPath));
    assert.ok(css.length > 0);
  });

  test('contains @font-face declarations', () => {
    const matches = css.match(/@font-face/g);
    assert.ok(matches, 'should have @font-face rules');
    assert.ok(matches.length >= 3, `expected at least 3 @font-face rules, got ${matches.length}`);
  });

  test('declares BaseNative font family', () => {
    assert.ok(css.includes("font-family: 'BaseNative'"));
  });

  test('uses woff2 format', () => {
    assert.ok(css.includes("format('woff2')"));
  });

  test('uses font-display: swap for performance', () => {
    const swaps = css.match(/font-display: swap/g);
    assert.ok(swaps, 'should have font-display: swap');
    assert.ok(swaps.length >= 3, 'every @font-face should use font-display: swap');
  });

  test('references BaseNative-Sans font file', () => {
    assert.ok(css.includes('BaseNative-Sans.woff2'));
  });

  test('references BaseNative-Serif font file', () => {
    assert.ok(css.includes('BaseNative-Serif.woff2'));
  });

  test('references BaseNative-Mono font file', () => {
    assert.ok(css.includes('BaseNative-Mono.woff2'));
  });

  test('has normal font-style declarations', () => {
    assert.ok(css.includes('font-style: normal'));
  });

  test('has unicode-range declarations', () => {
    const ranges = css.match(/unicode-range:/g);
    assert.ok(ranges, 'should have unicode-range');
    assert.ok(ranges.length >= 3, 'every @font-face should define unicode-range');
  });

  test('covers Latin unicode range', () => {
    assert.ok(css.includes('U+0000-00FF'), 'should include basic Latin range');
  });

  test('differentiates variants by font-stretch', () => {
    assert.ok(css.includes('font-stretch: normal'), 'sans should be normal stretch');
    assert.ok(css.includes('font-stretch: expanded'), 'serif should be expanded');
    assert.ok(css.includes('font-stretch: ultra-condensed'), 'mono should be ultra-condensed');
  });
});

describe('font files', () => {
  const fonts = [
    'BaseNative-Sans.woff2',
    'BaseNative-Serif.woff2',
    'BaseNative-Mono.woff2',
    'inter-latin.woff2',
    'dm-serif-display-latin.woff2',
    'jetbrains-mono-latin-variable.woff2',
    'source-serif-4-latin-variable.woff2',
  ];

  for (const font of fonts) {
    test(`${font} exists`, () => {
      assert.ok(existsSync(join(srcDir, font)), `${font} should exist in src/`);
    });

    test(`${font} is a non-empty binary`, () => {
      const stat = readFileSync(join(srcDir, font));
      assert.ok(stat.length > 100, `${font} should be a real font file (>100 bytes)`);
    });
  }
});
