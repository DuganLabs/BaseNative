import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { tokensCss } from './css.js';
import {
  SYSTEM_COLORS,
  LABEL_COLORS,
  BACKGROUND_COLORS,
  FILL_COLORS,
  SEPARATOR_COLORS,
  LINK_COLOR,
  TYPE_STYLES,
  GLASS_MATERIALS,
  RADII,
  SPACING,
  BREAKPOINTS,
  FOLD,
  MOTION,
} from './tokens.js';

const css = tokensCss();
const occurrences = (needle) => css.split(needle).length - 1;

test('emission is deterministic — the same data emits the same bytes', () => {
  assert.equal(tokensCss(), tokensCss());
});

test('the committed tokens.css is the emitter output, byte for byte', () => {
  const onDisk = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.equal(onDisk, css, 'regenerate with: node packages/ios/generate.js');
});

test('the sheet lives in @layer tokens and carries both dark mechanisms', () => {
  assert.match(css, /^\/\* @basenative\/ios/);
  assert.ok(css.includes('@layer tokens {'));
  assert.ok(css.includes('@media (prefers-color-scheme: dark) {'));
  assert.ok(css.includes(':root:not([data-theme="light"]) {'));
  assert.ok(css.includes('[data-theme="dark"] {'));
});

test('every colour token is emitted, light once and dark twice', () => {
  const groups = [SYSTEM_COLORS, LABEL_COLORS, BACKGROUND_COLORS, FILL_COLORS, SEPARATOR_COLORS];
  let count = 0;
  for (const group of groups) {
    for (const value of Object.values(group)) {
      assert.ok(occurrences(value.light) >= 1, `light value missing: ${value.light}`);
      if (value.dark !== value.light) {
        assert.ok(
          occurrences(value.dark) >= 2,
          `dark value must appear in both dark blocks: ${value.dark}`,
        );
      }
      count++;
    }
  }
  assert.ok(occurrences(LINK_COLOR.light) >= 1);
  // 18 system + 5 label + 6 background + 4 fill + 2 separator.
  assert.equal(count, 35, 'expected the full colour system');
});

test('every type style emits its four longhands and its shorthand', () => {
  for (const key of Object.keys(TYPE_STYLES)) {
    const name = key
      .replace(/([a-zA-Z])(\d)/g, '$1-$2')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();
    for (const part of ['size', 'leading', 'weight', 'tracking']) {
      assert.ok(css.includes(`--bn-ios-font-${name}-${part}:`), `missing font-${name}-${part}`);
    }
    assert.match(
      css,
      new RegExp(`--bn-ios-font-${name}: \\d+ [\\d.]+rem/[\\d.]+ var\\(--bn-ios-font-family`),
      `missing composed shorthand for ${name}`,
    );
  }
});

test('glass, radii, spacing and motion all reach the sheet', () => {
  for (const key of Object.keys(GLASS_MATERIALS)) {
    const name = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    for (const channel of ['blur', 'saturate', 'backdrop', 'tint', 'highlight', 'shadow']) {
      assert.ok(
        css.includes(`--bn-ios-glass-${name}-${channel}:`),
        `missing glass-${name}-${channel}`,
      );
    }
  }
  const radiusNames = {
    none: 'none',
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    xl2: '2xl',
    xl3: '3xl',
    xl4: '4xl',
    pill: 'pill',
  };
  for (const key of Object.keys(RADII)) {
    assert.ok(
      css.includes(`--bn-ios-radius-${radiusNames[key]}:`),
      `missing radius-${radiusNames[key]}`,
    );
  }
  for (const key of Object.keys(SPACING)) assert.ok(css.includes(`--bn-ios-space-${key}:`));
  for (const [key, preset] of Object.entries(MOTION)) {
    const name = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    assert.ok(css.includes(`--bn-ios-motion-${name}: ${preset.duration} ${preset.timing};`));
  }
  assert.ok(css.includes('--bn-ios-safe-bottom: env(safe-area-inset-bottom, 0px);'));
  assert.ok(css.includes('--bn-ios-scroll-edge-fade:'));
});

test('breakpoints and fold geometry reach the sheet', () => {
  for (const [key, value] of Object.entries(BREAKPOINTS)) {
    const name = key
      .replace(/([a-zA-Z])(\d)/g, '$1-$2')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();
    assert.ok(css.includes(`--bn-ios-breakpoint-${name}: ${value}px;`), `missing ${name}`);
  }
  assert.ok(css.includes(`--bn-ios-fold-segments: ${FOLD.segments};`));
  assert.ok(css.includes(`--bn-ios-fold-segment-width: ${FOLD.segmentWidth};`));
  assert.ok(css.includes(`--bn-ios-fold-segment-height: ${FOLD.segmentHeight};`));
  assert.ok(css.includes(`--bn-ios-fold-second-segment-left: ${FOLD.secondSegmentLeft};`));
  assert.ok(css.includes(`--bn-ios-fold-crease-safe-margin: ${FOLD.creaseSafeMargin};`));
});
