import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  GEOMETRY_DEFAULTS,
  RAW_DEFAULTS,
  ThemeError,
  defineTheme,
  emitThemeCss,
  toCss,
  validateTheme,
} from './theme.js';
import { parseCustomProperties, resolveColor } from './contrast.js';
import { darkOnlyTheme, dualTheme, minimalTheme } from './test-fixtures.js';

const COMPONENTS_TOKENS = fileURLToPath(
  new URL('../../components/src/tokens.css', import.meta.url),
);

/** The first error mentioning `needle`, for readable assertions. */
function errorMatching(spec, needle) {
  const { errors } = validateTheme(spec);
  const hit = errors.find((e) => e.includes(needle));
  assert.ok(hit, `expected an error mentioning "${needle}", got:\n  ${errors.join('\n  ')}`);
  return hit;
}

describe('validateTheme — a valid theme', () => {
  test('accepts the fixture', () => {
    assert.deepEqual(validateTheme(minimalTheme()), { ok: true, errors: [] });
  });

  test('accepts a dual theme', () => {
    assert.deepEqual(validateTheme(dualTheme()), { ok: true, errors: [] });
  });
});

describe('validateTheme — the scheme commitment', () => {
  test('refuses a theme that does not commit', () => {
    const spec = minimalTheme();
    delete spec.scheme;
    errorMatching(spec, "every theme commits to 'light', 'dark' or 'dual'");
  });

  test("refuses 'dual' with no dark block", () => {
    errorMatching(minimalTheme({ scheme: 'dual' }), 'there is no dark block');
  });

  test('refuses a dark block on a single-scheme theme', () => {
    const spec = dualTheme();
    spec.scheme = 'dark';
    errorMatching(spec, 'would never be reached');
  });

  test('refuses a half-themed dark block', () => {
    const spec = dualTheme();
    spec.signals.families.extra = { ...spec.signals.families.plain };
    errorMatching(spec, 'a half-themed dark scheme');
  });
});

describe('validateTheme — the four tiers', () => {
  for (const tier of ['ramps', 'surfaces', 'ink', 'roles', 'signals']) {
    test(`refuses a theme with no ${tier}`, () => {
      const spec = minimalTheme();
      delete spec[tier];
      errorMatching(spec, tier);
    });
  }

  test('refuses a missing key inside a tier', () => {
    const spec = minimalTheme();
    delete spec.roles.focus;
    errorMatching(spec, 'theme.roles.focus is missing');
  });

  test('refuses a key that is not part of a tier', () => {
    const spec = minimalTheme();
    spec.ink.chartreuse = 'primary.500';
    errorMatching(spec, 'is not a theme.ink key');
  });

  test('refuses both required ramps being absent', () => {
    const spec = minimalTheme();
    delete spec.ramps.primary;
    errorMatching(spec, 'ramps.primary is missing');
  });

  test('refuses an incomplete required ramp', () => {
    const spec = minimalTheme();
    delete spec.ramps.neutral[950];
    errorMatching(spec, 'ramps.neutral is missing step(s) 950');
  });
});

describe('validateTheme — the value grammar', () => {
  test('refuses a ramp step that is not a literal hex', () => {
    const spec = minimalTheme();
    spec.ramps.primary[600] = 'var(--elsewhere)';
    errorMatching(spec, 'a ramp step must be a literal #rrggbb');
  });

  test('refuses a value that is neither a hex nor a reference', () => {
    const spec = minimalTheme();
    spec.roles.focus = 'rebeccapurple';
    errorMatching(spec, 'a literal #rrggbb or a "<ramp>.<step>" reference');
  });

  test('refuses a reference to a ramp that does not exist', () => {
    const spec = minimalTheme();
    spec.ink.link = 'brand.600';
    errorMatching(spec, 'references ramp "brand", which the theme does not declare');
  });

  test('refuses a reference to a step that does not exist', () => {
    const spec = minimalTheme();
    spec.ink.link = 'primary.650';
    errorMatching(spec, 'that ramp has no step "650"');
  });

  test('accepts a literal hex in a tier above the ramps', () => {
    const spec = minimalTheme();
    spec.roles.focus = '#FF00FF';
    assert.equal(validateTheme(spec).ok, true);
    assert.match(emitThemeCss(spec, { layer: false, bridge: false }), /--bn-theme-focus: #ff00ff;/);
  });
});

describe('validateTheme — signal families and the five slots', () => {
  test('refuses an unassigned slot', () => {
    const spec = minimalTheme();
    delete spec.signals.slots.warning;
    errorMatching(spec, 'theme.signals.slots.warning is unassigned');
  });

  test('refuses a slot naming a family that does not exist', () => {
    const spec = minimalTheme();
    spec.signals.slots.error = 'catastrophe';
    errorMatching(spec, 'names family "catastrophe"');
  });

  test('refuses a slot that is not one of the five components declare', () => {
    const spec = minimalTheme();
    spec.signals.slots.critical = 'plain';
    errorMatching(spec, 'Extra families are fine, extra slots are not');
  });

  test('refuses a family missing a channel', () => {
    const spec = minimalTheme();
    delete spec.signals.families.plain.onSolid;
    errorMatching(spec, 'theme.signals.families.plain.onSolid is missing');
  });

  test('lets a theme name its families anything and share one across slots', () => {
    const spec = minimalTheme();
    spec.signals.families = {
      idle: spec.signals.families.plain,
      dead: { ...spec.signals.families.plain, ink: 'neutral.900' },
    };
    spec.signals.slots = {
      default: 'idle',
      primary: 'idle',
      success: 'idle',
      warning: 'idle',
      error: 'dead',
    };
    assert.equal(validateTheme(spec).ok, true);
    const css = emitThemeCss(spec, { layer: false, bridge: false });
    assert.match(css, /--bn-theme-signal-idle-bg:/);
    assert.match(css, /--bn-theme-slot-error-ink: var\(--bn-theme-signal-dead-ink\);/);
  });
});

describe('defineTheme', () => {
  test('throws a ThemeError carrying every error', () => {
    const spec = minimalTheme();
    delete spec.roles.focus;
    delete spec.ink.link;
    try {
      defineTheme(spec);
      assert.fail('expected a ThemeError');
    } catch (err) {
      assert.ok(err instanceof ThemeError);
      assert.equal(err.errors.length, 2);
      assert.match(err.message, /Invalid theme:/);
    }
  });

  test('fills the geometry defaults and freezes the result', () => {
    const theme = defineTheme(minimalTheme());
    assert.equal(theme.radius.md, GEOMETRY_DEFAULTS.radius.md);
    assert.equal(theme.control.tapMin, GEOMETRY_DEFAULTS.control.tapMin);
    assert.equal(theme.raw.zebra, RAW_DEFAULTS.zebra);
    assert.throws(() => {
      theme.radius.md = '0';
    }, TypeError);
  });

  test('lets a theme override one geometry knob without restating the rest', () => {
    const theme = defineTheme(minimalTheme({ control: { tapMin: '2.75rem' } }));
    assert.equal(theme.control.tapMin, '2.75rem');
    assert.equal(theme.control.height, GEOMETRY_DEFAULTS.control.height);
    assert.match(emitThemeCss(theme, { bridge: false }), /--bn-theme-tap-min: 2\.75rem;/);
  });
});

describe('the geometry defaults track @basenative/components', () => {
  const upstream = parseCustomProperties(readFileSync(COMPONENTS_TOKENS, 'utf8'));

  // A default that silently drifts from the package it is bridging to would
  // re-style every property on a components release. These pin it.
  const pinned = [
    ['--bn-font-family', GEOMETRY_DEFAULTS.font.sans],
    ['--bn-font-mono', GEOMETRY_DEFAULTS.font.mono],
    ['--bn-radius-sm', GEOMETRY_DEFAULTS.radius.sm],
    ['--bn-radius-md', GEOMETRY_DEFAULTS.radius.md],
    ['--bn-radius-lg', GEOMETRY_DEFAULTS.radius.lg],
    ['--bn-radius-xl', GEOMETRY_DEFAULTS.radius.xl],
    ['--bn-radius-full', GEOMETRY_DEFAULTS.radius.full],
    ['--bn-control-height', GEOMETRY_DEFAULTS.control.height],
    ['--bn-control-height-sm', GEOMETRY_DEFAULTS.control.heightSm],
    ['--bn-control-height-lg', GEOMETRY_DEFAULTS.control.heightLg],
    ['--bn-target-size-min', GEOMETRY_DEFAULTS.control.tapMin],
    ['--bn-transition-fast', GEOMETRY_DEFAULTS.motion.fast],
    ['--bn-transition-normal', GEOMETRY_DEFAULTS.motion.base],
    ['--bn-transition-slow', GEOMETRY_DEFAULTS.motion.slow],
    ['--bn-scrim', RAW_DEFAULTS.scrim],
  ];

  for (const [name, ours] of pinned) {
    test(`${name} matches`, () => {
      assert.equal(
        upstream.get(name),
        ours,
        `${name} drifted — components says "${upstream.get(name)}", this package defaults to "${ours}"`,
      );
    });
  }
});

describe('emitThemeCss — a single-scheme theme cannot be flipped by the OS', () => {
  // The failure this package exists after: pendingbusiness.com shipped a dark
  // site with no data-theme, so an OS-light reader fell through the dark media
  // query and got a near-white alert background on a near-black page.
  const dark = defineTheme(darkOnlyTheme());
  const css = emitThemeCss(dark, { bridge: false });

  test('emits exactly one activation block', () => {
    assert.equal(css.match(/:root/g).length, 1);
  });

  test('emits no media query for the reader s OS to answer', () => {
    assert.equal(css.includes('prefers-color-scheme'), false);
  });

  test('emits no data-theme variant, so the attribute is not load-bearing', () => {
    assert.equal(css.includes('data-theme'), false);
  });

  test('pins color-scheme so form controls and scrollbars follow', () => {
    assert.match(css, /color-scheme: dark;/);
  });

  // The exact token pendingbusiness.com got wrong: an OS-light reader saw
  // --bn-color-error-bg resolve to the near-white #fef2f2 on a near-black page.
  // Here the only value it can resolve to is the dark one, in every context.
  test('resolves the error slot background to the dark value, with no other value declared', () => {
    const props = parseCustomProperties(css);
    assert.equal(resolveColor('--bn-theme-slot-error-bg', props), '#27272A');
    assert.equal(css.match(/--bn-theme-slot-error-bg:/g).length, 1);
  });
});

describe('emitThemeCss — a dual theme', () => {
  const theme = defineTheme(dualTheme());
  const css = emitThemeCss(theme, { bridge: false });

  test('mirrors the upstream activation model at matching specificity', () => {
    assert.match(css, /@media \(prefers-color-scheme: dark\) \{/);
    assert.match(css, /:root:not\(\[data-theme="light"\]\) \{/);
    assert.match(css, /:root\[data-theme="dark"\] \{/);
    assert.match(css, /:root\[data-theme="light"\] \{/);
  });

  test('flattens to one scheme on request, which is what the audit reads', () => {
    const light = parseCustomProperties(emitThemeCss(theme, { only: 'light', bridge: false }));
    const dark = parseCustomProperties(emitThemeCss(theme, { only: 'dark', bridge: false }));
    assert.equal(resolveColor('--bn-theme-surface', light), '#FFFFFF');
    assert.equal(resolveColor('--bn-theme-surface', dark), '#09090B');
    assert.equal(emitThemeCss(theme, { only: 'dark', bridge: false }).includes('@media'), false);
  });
});

describe('emitThemeCss — output shape', () => {
  const theme = defineTheme(minimalTheme());

  test('wraps in @layer tokens by default, in the declared layer order', () => {
    assert.match(emitThemeCss(theme), /^@layer tokens \{/);
    assert.equal(emitThemeCss(theme, { layer: false }).startsWith('@layer'), false);
  });

  test('appends the bridge by default and can be asked not to', () => {
    assert.match(toCss(theme), /--bn-color-surface: var\(--bn-theme-surface\)/);
    assert.equal(toCss(theme, { bridge: false }).includes('--bn-color-surface:'), false);
  });

  test('names the theme and its scheme in the emitted header', () => {
    assert.match(emitThemeCss(theme), /fixture — generated by @basenative\/theme\. scheme: light\./);
  });

  test('emits ramps as literals and every tier above them as a var() chain', () => {
    const css = emitThemeCss(theme, { layer: false, bridge: false });
    assert.match(css, /--bn-theme-ramp-primary-600: #2563eb;/);
    assert.match(css, /--bn-theme-primary: var\(--bn-theme-ramp-primary-600\);/);
    assert.match(css, /--bn-theme-slot-success-bg: var\(--bn-theme-signal-plain-bg\);/);
  });

  test('is stable — the same theme emits the same bytes', () => {
    assert.equal(emitThemeCss(theme), emitThemeCss(defineTheme(minimalTheme())));
  });
});
