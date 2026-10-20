import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROVENANCE,
  SYSTEM_COLORS,
  LABEL_COLORS,
  BACKGROUND_COLORS,
  FILL_COLORS,
  SEPARATOR_COLORS,
  LINK_COLOR,
  FONT_FAMILIES,
  TYPE_STYLES,
  GLASS_MATERIALS,
  RADII,
  SPACING,
  SAFE_AREA,
  LAYOUT,
  MOTION,
} from './tokens.js';

const COLOR_VALUE = /^(#[0-9a-f]{6}|rgb\(\d+ \d+ \d+ \/ [\d.]+\))$/;
const SCHEMES = ['light', 'dark'];

const COLOR_GROUPS = {
  SYSTEM_COLORS,
  LABEL_COLORS,
  BACKGROUND_COLORS,
  FILL_COLORS,
  SEPARATOR_COLORS,
};

test('every colour token resolves in both appearances, as a colour', () => {
  for (const [groupName, group] of Object.entries(COLOR_GROUPS)) {
    for (const [key, value] of Object.entries(group)) {
      assert.deepEqual(
        Object.keys(value).sort(),
        [...SCHEMES].sort(),
        `${groupName}.${key} must carry exactly light and dark`,
      );
      for (const scheme of SCHEMES) {
        assert.match(value[scheme], COLOR_VALUE, `${groupName}.${key}.${scheme}`);
      }
    }
  }
  for (const scheme of SCHEMES)
    assert.match(LINK_COLOR[scheme], COLOR_VALUE, `LINK_COLOR.${scheme}`);
});

test('the link colour is the system blue in both appearances', () => {
  assert.deepEqual(LINK_COLOR, SYSTEM_COLORS.blue);
});

test('the type scale is the eleven Dynamic Type styles, largest first', () => {
  assert.deepEqual(Object.keys(TYPE_STYLES), [
    'largeTitle',
    'title1',
    'title2',
    'title3',
    'headline',
    'body',
    'callout',
    'subheadline',
    'footnote',
    'caption1',
    'caption2',
  ]);
  const sizes = Object.values(TYPE_STYLES).map((s) => s.size);
  for (let i = 1; i < sizes.length; i++) {
    // Non-increasing, not strictly: headline and body are both 17pt.
    assert.ok(sizes[i] <= sizes[i - 1], `sizes must not ascend (${sizes})`);
  }
  for (const [key, style] of Object.entries(TYPE_STYLES)) {
    assert.ok(style.leading > style.size, `${key}: leading must exceed size`);
    assert.ok([400, 600, 700].includes(style.weight), `${key}: unexpected weight ${style.weight}`);
    assert.ok(
      Math.abs(style.tracking) < 0.05,
      `${key}: tracking ${style.tracking}em is not a whisper`,
    );
    assert.ok(['text', 'display'].includes(style.family), `${key}: family must be text or display`);
    // The display face is for 20pt and up; below that the platform uses text.
    assert.equal(
      style.family,
      style.size >= 20 ? 'display' : 'text',
      `${key}: wrong face for its size`,
    );
  }
});

test('headline is the only semibold text style', () => {
  const semibold = Object.entries(TYPE_STYLES)
    .filter(([, s]) => s.weight === 600)
    .map(([k]) => k);
  assert.deepEqual(semibold, ['headline']);
});

test('each glass material carries every channel in both appearances', () => {
  assert.deepEqual(Object.keys(GLASS_MATERIALS), ['ultraThin', 'thin', 'regular', 'thick']);
  for (const [key, material] of Object.entries(GLASS_MATERIALS)) {
    assert.ok(Number.isInteger(material.blur) && material.blur > 0, `${key}: blur`);
    assert.ok(material.saturate > 100, `${key}: saturate must enrich, got ${material.saturate}`);
    for (const scheme of SCHEMES) {
      assert.match(material[scheme].tint, COLOR_VALUE, `${key}.${scheme}.tint`);
      assert.match(material[scheme].highlight, /^inset 0 1px 0 /, `${key}.${scheme}.highlight`);
      assert.match(material[scheme].shadow, /^0 \d+px \d+px /, `${key}.${scheme}.shadow`);
    }
  }
  // The ladder actually ladders: each step blurs and saturates more than the last.
  const steps = Object.values(GLASS_MATERIALS);
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i].blur > steps[i - 1].blur, 'blur must increase down the ladder');
    assert.ok(steps[i].saturate > steps[i - 1].saturate, 'saturate must increase down the ladder');
  }
});

test('layout groups are complete', () => {
  assert.deepEqual(Object.keys(SAFE_AREA), ['top', 'right', 'bottom', 'left']);
  for (const [key, value] of Object.entries(SAFE_AREA)) {
    assert.match(value, /^env\(safe-area-inset-/, `SAFE_AREA.${key} must read the device inset`);
  }
  assert.deepEqual(Object.keys(RADII), [
    'none',
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    'xl2',
    'xl3',
    'xl4',
    'pill',
  ]);
  assert.deepEqual(Object.keys(SPACING), ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.equal(SPACING[4], '1rem', 'the 16pt step anchors the spacing scale');
  assert.deepEqual(Object.keys(LAYOUT), ['margin', 'marginWide', 'hairline', 'scrollEdge']);
  assert.deepEqual(Object.keys(FONT_FAMILIES), ['text', 'display']);
});

test('motion presets are well-formed duration + curve pairs', () => {
  assert.deepEqual(Object.keys(MOTION), ['spring', 'springBouncy', 'springStiff', 'fade']);
  for (const [key, preset] of Object.entries(MOTION)) {
    assert.match(preset.duration, /^\d+ms$/, `${key}.duration`);
    assert.match(
      preset.timing,
      /^cubic-bezier\(-?[\d.]+, -?[\d.]+, -?[\d.]+, -?[\d.]+\)$/,
      `${key}.timing`,
    );
  }
});

test('provenance covers every group, and is only ever documented or estimate', () => {
  assert.deepEqual(Object.keys(PROVENANCE).sort(), [
    'backgroundColors',
    'fillColors',
    'fontFamilies',
    'glass',
    'labelColors',
    'layout',
    'linkColor',
    'motion',
    'radii',
    'separatorColors',
    'spacing',
    'systemColors',
    'typeMetrics',
    'typeTracking',
  ]);
  for (const [group, source] of Object.entries(PROVENANCE)) {
    assert.ok(['documented', 'estimate'].includes(source), `${group}: ${source}`);
  }
  // The colours Apple publishes must never be quietly reclassified as guesses.
  for (const group of ['systemColors', 'labelColors', 'backgroundColors', 'fillColors']) {
    assert.equal(PROVENANCE[group], 'documented', `${group} is published by Apple`);
  }
});
