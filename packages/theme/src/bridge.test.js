import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { BN_BRIDGED, BRIDGE_CSS, UPSTREAM_OWNED, bridgeToBn, validateBridge } from './bridge.js';
import { defineTheme, emitThemeCss, toCss } from './theme.js';
import { parseCustomProperties, resolveColor } from './contrast.js';
import { darkOnlyTheme, minimalTheme } from './test-fixtures.js';

const BRIDGE_FILE = fileURLToPath(new URL('./bridge.css', import.meta.url));
const COMPONENTS_SRC = fileURLToPath(new URL('../../components/src/', import.meta.url));

const componentsCss = readdirSync(COMPONENTS_SRC)
  .filter((f) => f.endsWith('.css'))
  .sort()
  .map((f) => readFileSync(join(COMPONENTS_SRC, f), 'utf8'))
  .join('\n');

describe('bridge.css and BRIDGE_CSS are one artifact', () => {
  test('the shipped stylesheet is byte-identical to the exported string', () => {
    assert.equal(
      readFileSync(BRIDGE_FILE, 'utf8'),
      BRIDGE_CSS,
      'src/bridge.css has drifted from BRIDGE_CSS in src/bridge.js — regenerate it from bridge.js',
    );
  });

  test('bridgeToBn() returns it unchanged', () => {
    assert.equal(bridgeToBn(), BRIDGE_CSS);
  });
});

describe('the bridge covers what @basenative/components actually reads', () => {
  // This is the price of keeping the bridge here rather than in `components`,
  // paid as a build failure instead of as six silently-unthemed properties.
  test('every var(--bn-*) is either bridged or explicitly left upstream', () => {
    const { ok, unbridged } = validateBridge(componentsCss);
    assert.equal(
      ok,
      true,
      `@basenative/components reads --bn-* names this package neither bridges nor lists as ` +
        `upstream-owned:\n  ${unbridged.join('\n  ')}\n` +
        'Add each to the bridge in src/bridge.js, or to UPSTREAM_OWNED with the reason.',
    );
  });

  test('nothing is claimed by both lists', () => {
    const both = BN_BRIDGED.filter((n) =>
      Object.prototype.hasOwnProperty.call(UPSTREAM_OWNED, n),
    );
    assert.deepEqual(both, []);
  });

  test('UPSTREAM_OWNED carries a reason for every name, not just a name', () => {
    for (const [name, why] of Object.entries(UPSTREAM_OWNED)) {
      assert.ok(why && why.length > 8, `${name} is listed as upstream-owned with no real reason`);
    }
  });

  test('every name it claims to bridge is a name components declares', () => {
    const declared = new Set(
      [...componentsCss.matchAll(/^\s*(--bn-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
    );
    const phantom = BN_BRIDGED.filter((n) => !declared.has(n));
    assert.deepEqual(phantom, [], 'the bridge re-points names components does not declare');
  });
});

describe('the bridge reads only --bn-theme-* names a theme actually emits', () => {
  const consumed = [...new Set([...BRIDGE_CSS.matchAll(/var\(\s*(--bn-theme-[a-z0-9-]+)/g)].map((m) => m[1]))];

  test('there is at least one, and every one resolves against a real theme', () => {
    assert.ok(consumed.length > 50, `expected a real bridge, found ${consumed.length} references`);
    const css = emitThemeCss(defineTheme(minimalTheme()), { layer: false, bridge: false });
    const props = parseCustomProperties(css);
    const missing = consumed.filter((n) => !props.has(n));
    assert.deepEqual(
      missing,
      [],
      'the bridge reads theme properties that toCss() never emits — a theme would render them invalid',
    );
  });

  test('every colour it reads resolves to a literal, so nothing renders transparent', () => {
    const props = parseCustomProperties(
      emitThemeCss(defineTheme(minimalTheme()), { layer: false, bridge: false }),
    );
    for (const name of consumed) {
      const raw = props.get(name);
      if (!/^(var\(|#)/.test(raw)) continue; // font stacks, durations, lengths
      assert.doesNotThrow(() => resolveColor(name, props), `${name} does not resolve`);
    }
  });
});

describe('the bridge wins over the components dark layer', () => {
  // components/theme.css activates dark at :root:not([data-theme="light"])
  // inside a media query — specificity (0,2,0). A bridge at plain :root loses
  // to it, which is exactly how upstream dark values leak past a theme.
  test('both selectors carry html + :root + one attribute', () => {
    assert.match(BRIDGE_CSS, /html:root\[data-theme\],\n\s*html:root:not\(\[data-theme="light"\]\) \{/);
  });

  test('between them they match every value of data-theme, including its absence', () => {
    assert.ok(BRIDGE_CSS.includes('html:root[data-theme]'), 'no branch matches data-theme="light"');
    assert.ok(
      BRIDGE_CSS.includes('html:root:not([data-theme="light"])'),
      'no branch matches an absent data-theme',
    );
  });

  test('is emitted into @layer tokens, not unlayered above everything', () => {
    assert.match(BRIDGE_CSS, /^@layer tokens \{/);
  });

  test('declares nothing but custom properties', () => {
    const body = BRIDGE_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const decl of body.matchAll(/^\s*([a-z0-9-]+)\s*:\s*[^;{]*;/gm)) {
      assert.ok(decl[1].startsWith('--'), `the bridge sets a real property: ${decl[1]}`);
    }
  });
});

describe('a dark-only theme through the bridge', () => {
  // The pendingbusiness.com failure, end to end: a dark site with no
  // data-theme. --bn-color-error-bg must be the theme's dark tint no matter
  // what the reader's OS says, and there must be no second value anywhere for
  // a media query to reach.
  const css = toCss(defineTheme(darkOnlyTheme()));

  test('--bn-color-error-bg has exactly one source and it is the dark one', () => {
    assert.equal(css.match(/--bn-color-error-bg:/g).length, 1);
    const props = parseCustomProperties(css);
    assert.equal(resolveColor('--bn-color-error-bg', props), '#27272A');
  });

  test('the emitted theme contributes no prefers-color-scheme rule of its own', () => {
    const themeOnly = toCss(defineTheme(darkOnlyTheme()), { bridge: false });
    assert.equal(themeOnly.includes('prefers-color-scheme'), false);
  });
});
