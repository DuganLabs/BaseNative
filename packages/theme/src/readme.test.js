import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertThemeContrast, defaultPairings } from './audit.js';
import { toCss, validateTheme } from './theme.js';
import { parseCustomProperties } from './contrast.js';

/**
 * This package ships no reference theme, on purpose — a palette in the exports
 * becomes the de-facto org look, which is the opposite of the point. What a new
 * property forks is the starter in README.md, which is a document rather than
 * an import.
 *
 * A document drifts. So this test parses it, runs it, and holds it to the same
 * gates a real theme is held to. The README cannot go stale, and the starter
 * cannot quietly become a brand: its two mandatory ramps are asserted
 * byte-identical to @basenative/components' own default palette, so it stays a
 * translation of what a consumer already has.
 */

const README = fileURLToPath(new URL('../README.md', import.meta.url));
const INDEX = fileURLToPath(new URL('./index.js', import.meta.url));
const COMPONENTS_TOKENS = fileURLToPath(
  new URL('../../components/src/tokens.css', import.meta.url),
);

/** The fenced ```js block that defines the starter. */
function starterSource() {
  const md = readFileSync(README, 'utf8');
  const blocks = [...md.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
  const hit = blocks.filter((b) => b.includes('export const theme = defineTheme('));
  assert.equal(
    hit.length,
    1,
    `expected exactly one starter block in README.md, found ${hit.length}`,
  );
  return hit[0];
}

let theme;

before(async () => {
  const source = starterSource().replace(
    "from '@basenative/theme'",
    `from ${JSON.stringify(new URL(`file://${INDEX}`).href)}`,
  );
  const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  theme = mod.theme;
});

describe('the README starter', () => {
  test('is a valid theme, not prose that looks like one', () => {
    assert.deepEqual(validateTheme(theme), { ok: true, errors: [] });
    assert.equal(theme.name, 'starter');
    assert.equal(theme.scheme, 'light');
  });

  test('clears every WCAG threshold the audit harness sets', () => {
    assert.doesNotThrow(() => assertThemeContrast(theme));
  });

  test('measures the number of rows the README claims', () => {
    // README: "55 rows for the starter". A claim about a number is a claim.
    assert.equal(defaultPairings(theme).length, 55);
  });

  test('names its families for its domain and fills all five slots', () => {
    assert.deepEqual(Object.keys(theme.signals.slots).sort(), [
      'default',
      'error',
      'primary',
      'success',
      'warning',
    ]);
    for (const family of Object.values(theme.signals.slots)) {
      assert.ok(theme.signals.families[family], `slot points at an undeclared family ${family}`);
    }
  });
});

describe('the starter is a translation of the components default, not a new look', () => {
  const upstream = parseCustomProperties(readFileSync(COMPONENTS_TOKENS, 'utf8'));

  for (const [ramp, prefix, steps] of [
    ['neutral', '--bn-color-gray-', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]],
    ['primary', '--bn-color-primary-', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]],
  ]) {
    test(`its ${ramp} ramp matches ${prefix}*`, () => {
      for (const step of steps) {
        assert.equal(
          theme.ramps[ramp][step],
          upstream.get(`${prefix}${step}`),
          `${ramp}.${step} is not ${prefix}${step} — the starter has started becoming a brand`,
        );
      }
    });
  }
});

describe('the README teaches an API that exists', () => {
  const md = readFileSync(README, 'utf8');

  test('every export it lists in the subpath table is really exported', async () => {
    const surface = {
      '.': await import('./index.js'),
      contrast: await import('./contrast.js'),
      audit: await import('./audit.js'),
      css: await import('./css.js'),
      icons: await import('./icons.js'),
    };
    const listed = {
      '.': ['defineTheme', 'validateTheme', 'ThemeError', 'toCss', 'bridgeToBn'],
      contrast: [
        'relativeLuminance',
        'contrastRatio',
        'parseCustomProperties',
        'resolveColor',
        'AA_TEXT',
        'AA_LARGE',
        'AA_NONTEXT',
      ],
      audit: [
        'auditPairings',
        'assertPairings',
        'defaultPairings',
        'assertThemeContrast',
        'ContrastError',
      ],
      css: ['minifyCss'],
      icons: ['defineIconSet', 'renderIcon', 'validateIconSet', 'IconSetError'],
    };
    for (const [subpath, names] of Object.entries(listed)) {
      for (const name of names) {
        assert.ok(md.includes(name), `README no longer lists ${name}`);
        assert.ok(name in surface[subpath], `${subpath} does not export ${name}`);
      }
    }
  });

  test('the load-order snippet emits what the bridge really needs', () => {
    assert.ok(md.includes('@basenative/theme/bridge.css'));
    assert.match(toCss(theme), /html:root\[data-theme\]/);
  });
});
