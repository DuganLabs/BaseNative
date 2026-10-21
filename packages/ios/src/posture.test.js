import { test } from 'node:test';
import assert from 'node:assert/strict';

import { POSTURE_MEDIA, postureCss } from './posture.js';
import { BREAKPOINTS, FOLD } from './tokens.js';

test('the media map names both postures and both Duo width classes', () => {
  assert.deepEqual(Object.keys(POSTURE_MEDIA), [
    'singlePane',
    'spanningVertical',
    'duoCover',
    'duoInner',
  ]);
  // The posture features are the platform signal, verbatim.
  assert.equal(POSTURE_MEDIA.singlePane, '(spanning: none)');
  assert.equal(POSTURE_MEDIA.spanningVertical, '(spanning: single-fold-vertical)');
});

test('the width classes derive from the duoInner token, and meet at its edge', () => {
  assert.equal(POSTURE_MEDIA.duoInner, `(min-width: ${BREAKPOINTS.duoInner}px)`);
  assert.equal(POSTURE_MEDIA.duoCover, `(max-width: ${BREAKPOINTS.duoInner - 1}px)`);
  // No gap, no overlap: every width is exactly one of the two classes.
  const inner = Number(POSTURE_MEDIA.duoInner.match(/\d+/)[0]);
  const cover = Number(POSTURE_MEDIA.duoCover.match(/\d+/)[0]);
  assert.equal(cover + 1, inner);
});

test('emission is deterministic — the same tokens emit the same bytes', () => {
  assert.equal(postureCss(), postureCss());
});

test('the sheet is the layout layer, and folds to one pane by default', () => {
  const css = postureCss();
  assert.ok(css.includes('@layer layout {'));
  assert.ok(css.includes('.bn-ios-panes {'), 'the pane container exists');
  // Single pane first: one column, no segment sizing outside the query.
  const beforeMedia = css.slice(0, css.indexOf('@media'));
  assert.ok(beforeMedia.includes('grid-template-columns: minmax(0, 1fr);'));
  assert.ok(!beforeMedia.includes('viewport-segment'), 'no segment envs outside the query');
});

test('under spanning, the panes are the segments and the gap is the hinge', () => {
  const css = postureCss();
  assert.ok(css.includes(`@media ${POSTURE_MEDIA.spanningVertical} {`));
  // Column one is the first segment token itself — the same value the
  // --bn-ios-fold-segment-width property carries.
  assert.ok(
    css.includes(`grid-template-columns: ${FOLD.segmentWidth} env(viewport-segment-width 1 0`),
  );
  // The gap is what the second segment's start leaves after the first
  // segment's width: the hinge, measured by the device, not hardcoded.
  assert.ok(css.includes(`column-gap: calc(${FOLD.secondSegmentLeft} - ${FOLD.segmentWidth});`));
});

test('content keeps the crease clearance, and nothing outgrows a segment', () => {
  const css = postureCss();
  assert.ok(
    css.includes('padding-inline-end: var(--bn-ios-fold-crease-safe-margin);'),
    'the first pane clears the crease on its end side',
  );
  assert.ok(
    css.includes('padding-inline-start: var(--bn-ios-fold-crease-safe-margin);'),
    'the last pane clears the crease on its start side',
  );
  assert.ok(
    css.includes('.bn-ios-crease-avoid { max-inline-size: var(--bn-ios-fold-segment-width); }'),
    'the avoid cap is the segment width token',
  );
});
