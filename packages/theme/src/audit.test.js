import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  AA_NONTEXT,
  AA_TEXT,
  ContrastError,
  assertPairings,
  assertThemeContrast,
  auditPairings,
  defaultPairings,
} from './audit.js';
import { defineTheme, emitThemeCss } from './theme.js';
import { dualTheme, minimalTheme } from './test-fixtures.js';

const CSS = `:root {
  --paper: #ffffff;
  --ink: #18181b;
  --faint: #d4d4d8;
  --tint: var(--paper);
  --words: sans-serif;
}`;

describe('auditPairings', () => {
  test('measures a table given as tuples or as objects, identically', () => {
    const tuple = auditPairings(CSS, [['body', '--ink', '--paper', AA_TEXT]]);
    const object = auditPairings(CSS, [
      { label: 'body', fg: '--ink', bg: '--paper', min: AA_TEXT },
    ]);
    assert.deepEqual(tuple, object);
    assert.equal(tuple[0].pass, true);
    assert.equal(tuple[0].ratio.toFixed(2), '17.72');
  });

  test('marks a row that misses its threshold without throwing', () => {
    const [row] = auditPairings(CSS, [['hairline', '--faint', '--paper', AA_NONTEXT]]);
    assert.equal(row.pass, false);
    assert.ok(row.ratio < AA_NONTEXT);
  });

  test('reports an unresolvable row as a failure rather than hiding the rest', () => {
    const rows = auditPairings(CSS, [
      ['typo', '--nope', '--paper', AA_TEXT],
      ['fine', '--ink', '--paper', AA_TEXT],
    ]);
    assert.equal(rows[0].pass, false);
    assert.match(rows[0].error, /Unknown custom property --nope/);
    assert.equal(rows[1].pass, true);
  });

  test('reports a non-colour terminal as a failure too', () => {
    const [row] = auditPairings(CSS, [['prose', '--words', '--paper', AA_TEXT]]);
    assert.match(row.error, /not a plain hex colour/);
  });
});

describe('assertPairings', () => {
  test('is silent when every row passes', () => {
    assert.doesNotThrow(() => assertPairings(CSS, [['body', '--ink', '--paper', AA_TEXT]]));
  });

  test('throws a ContrastError naming every failing row and its real ratio', () => {
    try {
      assertPairings(CSS, [
        ['body', '--ink', '--paper', AA_TEXT],
        ['hairline', '--faint', '--paper', AA_NONTEXT],
        ['same on same', '--tint', '--paper', AA_TEXT],
      ]);
      assert.fail('expected a ContrastError');
    } catch (err) {
      assert.ok(err instanceof ContrastError);
      assert.equal(err.failures.length, 2);
      assert.match(err.message, /hairline: --faint on --paper is 1\.48:1, below 3:1/);
      assert.match(err.message, /same on same/);
      assert.equal(err.message.includes('body:'), false);
    }
  });
});

describe('defaultPairings', () => {
  const theme = defineTheme(minimalTheme());
  const rows = defaultPairings(theme);

  test('writes the table from the theme, not from a hardcoded namespace', () => {
    assert.ok(rows.length > 20, `expected a real table, got ${rows.length} rows`);
    for (const row of rows) {
      assert.match(row.fg, /^--bn-theme-/);
      assert.match(row.bg, /^--bn-theme-/);
      assert.ok(row.min === AA_TEXT || row.min === AA_NONTEXT);
    }
  });

  test('gates control boundaries and focus rings at 3:1, not 4.5:1', () => {
    const border = rows.find((r) => r.label === 'control border on page');
    const focus = rows.find((r) => r.label === 'focus ring on page');
    assert.equal(border.min, AA_NONTEXT);
    assert.equal(focus.min, AA_NONTEXT);
  });

  test('measures a family ink on the page, not only on its own tint', () => {
    assert.ok(rows.some((r) => r.label === 'plain badge'));
    assert.ok(rows.some((r) => r.label === 'plain text on the page'));
    assert.ok(rows.some((r) => r.label === 'plain rule on the page' && r.min === AA_NONTEXT));
    assert.ok(rows.some((r) => r.label === 'plain label on its solid fill'));
  });

  test('gives a new family its rows automatically — there is no unmeasured status colour', () => {
    const spec = minimalTheme();
    spec.signals.families.stalled = { ...spec.signals.families.plain };
    const grown = defaultPairings(defineTheme(spec));
    assert.equal(grown.length, rows.length + 5);
    assert.ok(grown.some((r) => r.label === 'stalled rule on the page'));
  });
});

describe('assertThemeContrast', () => {
  test('passes a theme whose pairings all clear', () => {
    assert.doesNotThrow(() => assertThemeContrast(defineTheme(minimalTheme())));
  });

  test('names the theme and the scheme in the failure', () => {
    const spec = minimalTheme();
    spec.roles.borderControl = 'neutral.200'; // far too pale for a control boundary
    try {
      assertThemeContrast(defineTheme(spec));
      assert.fail('expected a ContrastError');
    } catch (err) {
      assert.ok(err instanceof ContrastError);
      assert.match(err.message, /^fixture \(light\) — colour pairings below/);
      assert.ok(err.failures.every((f) => f.fg === '--bn-theme-border-control'));
    }
  });

  test('measures both schemes of a dual theme, and catches a miss in the dark one', () => {
    // neutral.600 is a perfectly good muted ink on LIGHT. On a near-black page
    // it is 2.3:1, and only the dark pass sees that.
    const spec = dualTheme({
      ink: {
        base: 'neutral.50',
        muted: 'neutral.600',
        subtle: 'neutral.400',
        inverse: 'neutral.900',
        link: 'primary.300',
      },
    });
    try {
      assertThemeContrast(defineTheme(spec));
      assert.fail('expected a ContrastError from the dark scheme');
    } catch (err) {
      assert.match(err.message, /^fixture \(dark\) — colour pairings below/);
      assert.ok(err.failures.some((f) => f.label === 'muted text on page'));
    }
  });

  test('appends extra rows a property declares for itself', () => {
    const theme = defineTheme(minimalTheme());
    assert.throws(
      () => assertThemeContrast(theme, [['brand on the band', '--bn-theme-ink', '--bn-theme-surface-inverse', AA_TEXT]]),
      ContrastError,
    );
  });

  test('reads one scheme at a time, so a dual theme is never measured as a blur', () => {
    // A dual theme emitted in full declares --bn-theme-surface once per
    // activation context; a flat parse keeps only the last, which is a palette
    // that never renders. `only` is what makes the audit honest.
    const theme = defineTheme(dualTheme());
    assert.equal(emitThemeCss(theme, { bridge: false }).match(/--bn-theme-surface:/g).length, 4);
    for (const only of ['light', 'dark']) {
      const css = emitThemeCss(theme, { only, bridge: false });
      assert.equal(css.match(/--bn-theme-surface:/g).length, 1);
    }
  });
});
