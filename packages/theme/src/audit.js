/**
 * The pairing harness: accessibility as a gate rather than a claim.
 *
 * The idea is lifted from `libs/shared/design/src/tokens.spec.ts` in the
 * Greenput repo, where a hardcoded table of ~45 shipped colour pairings was
 * resolved to literal hexes, measured, and made to fail the build. It worked,
 * and it was unusable by anything else: the table was fused to the `--gp-*`
 * namespace and lived inside one app's spec file.
 *
 * Here the table is an ARGUMENT. A property declares the pairings it actually
 * ships as data, CI measures them, and a WCAG miss is a failed build rather
 * than a Lighthouse run someone gets around to. `defaultPairings(theme)` writes
 * the table for you from the theme's own shape, including a row for every
 * signal family it declares — so adding a family adds its contrast rows, and
 * there is no way to add a family that is never measured.
 */

import {
  AA_LARGE,
  AA_NONTEXT,
  AA_TEXT,
  contrastRatio,
  parseCustomProperties,
  resolveColor,
} from './contrast.js';
import {
  BADGE_SLOTS,
  SIGNAL_CHANNELS,
  emitThemeCss,
  inkVar,
  roleVar,
  signalVar,
  slotVar,
  surfaceVar,
} from './theme.js';

export { AA_TEXT, AA_LARGE, AA_NONTEXT };

/** Thrown by `assertPairings` / `assertThemeContrast`. Carries every failing row. */
export class ContrastError extends Error {
  /**
   * @param {string} summary
   * @param {Array<{label: string, fg: string, bg: string, min: number, ratio: number}>} failures
   */
  constructor(summary, failures) {
    const rows = failures.map(
      (f) =>
        `${f.label}: ${f.fg} on ${f.bg} is ${f.ratio.toFixed(2)}:1, below ${f.min}:1`,
    );
    super(`${summary}\n  - ${rows.join('\n  - ')}`);
    this.name = 'ContrastError';
    this.failures = failures;
  }
}

/** Accepts `{label, fg, bg, min}` or the tuple form `[label, fg, bg, min]`. */
function normalise(pairing) {
  if (Array.isArray(pairing)) {
    const [label, fg, bg, min] = pairing;
    return { label, fg, bg, min };
  }
  return { label: pairing.label, fg: pairing.fg, bg: pairing.bg, min: pairing.min };
}

/**
 * Measures every pairing against a stylesheet.
 *
 * Pass a stylesheet carrying ONE activation context. `parseCustomProperties`
 * reads a sheet as one flat map, so a dual theme emitted in full would blur its
 * light and dark palettes together and measure a pairing that never renders —
 * use `toCss(theme, { only: 'dark' })`, or `assertThemeContrast`, which does it
 * for you.
 *
 * A row whose `var()` chain does not resolve is reported as a failure with
 * `ratio: 0` and the resolver's message, not thrown — so one typo does not hide
 * the other forty rows.
 *
 * @param {string} themeCss
 * @param {Array<object|Array>} pairings
 * @returns {Array<{label: string, fg: string, bg: string, min: number, ratio: number, pass: boolean, error?: string}>}
 */
export function auditPairings(themeCss, pairings) {
  const props = parseCustomProperties(themeCss);
  return pairings.map((raw) => {
    const { label, fg, bg, min } = normalise(raw);
    try {
      const ratio = contrastRatio(resolveColor(fg, props), resolveColor(bg, props));
      return { label, fg, bg, min, ratio, pass: ratio >= min };
    } catch (err) {
      return { label, fg, bg, min, ratio: 0, pass: false, error: /** @type {Error} */ (err).message };
    }
  });
}

/**
 * Measures every pairing and throws listing every failure.
 *
 * @param {string} themeCss
 * @param {Array<object|Array>} pairings
 * @param {string} [summary]
 * @throws {ContrastError}
 */
export function assertPairings(themeCss, pairings, summary = 'Colour pairings below their WCAG threshold:') {
  const failures = auditPairings(themeCss, pairings).filter((r) => !r.pass);
  if (failures.length) throw new ContrastError(summary, failures);
}

/**
 * The pairings every theme ships by construction, written from the theme's own
 * shape.
 *
 * The thresholds are WCAG 2.2: 4.5:1 for text (SC 1.4.3), 3:1 for the visible
 * boundary of a control and for a focus indicator (SC 1.4.11 Non-text
 * Contrast). Note the two rows per signal family that are easy to forget and
 * that components renders anyway — the family's ink on the PAGE, not only on
 * its own tint (`--bn-color-error-text` is painted on the surface), and the
 * family's rule at 3:1, which is what caught `--gp-ink-400` at 4.07:1 being
 * used as 11px type on Greenput.
 *
 * Extend it, do not replace it: `[...defaultPairings(theme), ...yourRows]`.
 *
 * @param {object} theme
 * @returns {Array<{label: string, fg: string, bg: string, min: number}>}
 */
export function defaultPairings(theme) {
  const rows = [];
  const row = (label, fg, bg, min) => rows.push({ label, fg, bg, min });

  const paper = surfaceVar('base');
  const subtle = surfaceVar('subtle');
  const sunk = surfaceVar('sunk');
  const raised = surfaceVar('raised');
  const inverse = surfaceVar('inverse');

  for (const [name, bg] of [
    ['page', paper],
    ['subtle surface', subtle],
    ['sunk surface', sunk],
    ['raised surface', raised],
  ]) {
    row(`body text on ${name}`, inkVar('base'), bg, AA_TEXT);
    row(`muted text on ${name}`, inkVar('muted'), bg, AA_TEXT);
    row(`subtle text on ${name}`, inkVar('subtle'), bg, AA_TEXT);
    row(`link on ${name}`, inkVar('link'), bg, AA_TEXT);
    row(`control border on ${name}`, roleVar('borderControl'), bg, AA_NONTEXT);
    row(`focus ring on ${name}`, roleVar('focus'), bg, AA_NONTEXT);
  }

  row('inverse text on the inverse surface', inkVar('inverse'), inverse, AA_TEXT);
  row('focus ring on the inverse surface', roleVar('focusOnInverse'), inverse, AA_NONTEXT);

  row('primary button label', roleVar('onPrimary'), roleVar('primary'), AA_TEXT);
  row('primary button label, hover', roleVar('onPrimary'), roleVar('primaryHover'), AA_TEXT);
  row('body text on the primary tint', inkVar('base'), roleVar('primaryTint'), AA_TEXT);
  row('selected-row text', roleVar('selectedInk'), roleVar('selectedBg'), AA_TEXT);

  for (const family of Object.keys(theme.signals.families)) {
    row(`${family} badge`, signalVar(family, 'ink'), signalVar(family, 'bg'), AA_TEXT);
    row(`${family} text on the page`, signalVar(family, 'ink'), paper, AA_TEXT);
    row(`${family} text on a card`, signalVar(family, 'ink'), raised, AA_TEXT);
    row(`${family} rule on the page`, signalVar(family, 'line'), paper, AA_NONTEXT);
    row(`${family} label on its solid fill`, signalVar(family, 'onSolid'), signalVar(family, 'solid'), AA_TEXT);
  }

  return rows;
}

/**
 * Runs `defaultPairings` (plus anything else you pass) against every scheme the
 * theme actually renders in, and throws on the first scheme with a failure.
 *
 * This is the one line a property puts in its test file:
 *
 *     assertThemeContrast(theme);
 *
 * @param {object} theme
 * @param {Array<object|Array>} [extra]
 * @throws {ContrastError}
 */
export function assertThemeContrast(theme, extra = []) {
  const pairings = [...defaultPairings(theme), ...extra];
  const schemes = theme.scheme === 'dual' ? ['light', 'dark'] : [theme.scheme];
  for (const only of schemes) {
    const css = emitThemeCss(theme, { only, layer: false, bridge: false });
    assertPairings(
      css,
      pairings,
      `${theme.name} (${only}) — colour pairings below their WCAG threshold:`,
    );
  }
}

/** Re-exported so a consumer can name a slot or a family in its own pairing rows. */
export { BADGE_SLOTS, SIGNAL_CHANNELS, signalVar, slotVar, surfaceVar, inkVar, roleVar };
