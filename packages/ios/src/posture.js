/**
 * The fold posture helpers: the media queries a layout asks, and the
 * utility sheet that answers them.
 *
 * A foldable has two postures, and the standard names both. Folded, the
 * device is a single pane — the cover display, a phone-class viewport.
 * Unfolded, the viewport spans two segments across a vertical hinge,
 * and the layout's job changes: content belongs in one segment or the
 * other, never straddling the crease.
 *
 * Two signals, kept separate on purpose. The `spanning` media feature
 * is the posture itself — it is true exactly when the viewport crosses
 * the fold, whatever device that is. The Duo width classes in
 * `BREAKPOINTS` are the size neighbourhood: `duoInner` says a viewport
 * is at least the inner display's short edge, which an unfolded Duo
 * always is and an iPad also is. A layout that must know it is on the
 * Duo asks `spanning`; a layout that must know it has room asks the
 * width. Confusing the two is how a tablet ends up with a hinge gap in
 * the middle of nothing.
 */

import { BREAKPOINTS, FOLD } from './tokens.js';

/**
 * The posture media queries, as strings for stylesheets the package
 * does not own and for `matchMedia` in JS. The width queries are
 * derived from the `duoInner` breakpoint token — change the token and
 * these follow.
 *
 *   singlePane       the posture feature reporting no fold crossing
 *   spanningVertical the posture feature reporting the Duo's posture:
 *                    two segments across a vertical hinge
 *   duoCover         the folded width class — below the inner display
 *   duoInner         the unfolded width class — at or above it
 */
export const POSTURE_MEDIA = Object.freeze({
  singlePane: '(spanning: none)',
  spanningVertical: '(spanning: single-fold-vertical)',
  duoCover: `(max-width: ${BREAKPOINTS.duoInner - 1}px)`,
  duoInner: `(min-width: ${BREAKPOINTS.duoInner}px)`,
});

/**
 * The posture utility sheet: three classes in `@layer layout`, the
 * layer the design system already reserves for page structure.
 *
 *   .bn-ios-panes        a container that is one column on a single
 *                        pane and, when spanning, a two-column grid
 *                        whose columns are the segments themselves —
 *                        sized by the segment envs, gapped by the hinge
 *                        between them, so the fold is honoured on
 *                        hardware that reports it differently.
 *   .bn-ios-pane         one pane of that grid. Under spanning, the
 *                        first pane keeps the crease clearance on its
 *                        end side and the last pane on its start side,
 *                        so content rests against the fold at the
 *                        standard margin, never on it.
 *   .bn-ios-crease-avoid for an element that must live inside one
 *                        segment: never wider than a segment, in any
 *                        posture. On a flat display the segment is the
 *                        viewport, so the cap is a no-op there.
 *
 * @returns {string}
 */
export function postureCss() {
  const lines = [
    '/* @basenative/ios — the fold posture utilities.',
    '   Emitted from src/posture.js; the media queries and segment values',
    '   derive from the BREAKPOINTS and FOLD tokens in src/tokens.js.',
    '   One pane folded, two segments unfolded, nothing on the crease. */',
    '',
    '@layer layout {',
    '  .bn-ios-panes {',
    '    display: grid;',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  .bn-ios-pane { min-inline-size: 0; }',
    '  .bn-ios-crease-avoid { max-inline-size: var(--bn-ios-fold-segment-width); }',
    '',
    `  @media ${POSTURE_MEDIA.spanningVertical} {`,
    '    .bn-ios-panes {',
    `      grid-template-columns: ${FOLD.segmentWidth} env(viewport-segment-width 1 0, 100vw);`,
    `      column-gap: calc(${FOLD.secondSegmentLeft} - ${FOLD.segmentWidth});`,
    '    }',
    '    .bn-ios-panes > .bn-ios-pane:first-child {',
    '      padding-inline-end: var(--bn-ios-fold-crease-safe-margin);',
    '    }',
    '    .bn-ios-panes > .bn-ios-pane:last-child {',
    '      padding-inline-start: var(--bn-ios-fold-crease-safe-margin);',
    '    }',
    '  }',
    '}',
    '',
  ];
  return lines.join('\n');
}
