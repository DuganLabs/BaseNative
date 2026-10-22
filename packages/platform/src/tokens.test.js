import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { kit, PROVENANCE } from './tokens.js';
import { tokensCss } from './emit.js';
import {
  colorSlug,
  contrastRatio,
  derivePalette,
  parseColor,
  rgbToHsl,
  composite,
} from './contrast.js';

const root = dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(join(root, 'tokens.css'), 'utf8');
const vendored = JSON.parse(readFileSync(join(root, '../data/tokens.json'), 'utf8'));

test('committed sheet matches the emitter', () => {
  assert.equal(sheet, tokensCss(kit));
});

test('kit.js matches the vendored extract', () => {
  assert.deepEqual(kit, vendored);
});

test('style count is the 116 kit styles', () => {
  const styles =
    kit.ios.typography.textStyles.length +
    kit.macos.typography.textStyles.length +
    Object.keys(kit.ios.colorStyles).length +
    Object.keys(kit.macos.materials).length;
  assert.equal(styles, 116);
});

test('iOS blue and body, macOS body, glass, and sheet radius are kit values', () => {
  assert.match(sheet, /--bn-plat-color-accents-blue: rgb\(0, 136, 255\);/);
  assert.match(sheet, /--bn-plat-font-body-size: 17px;/);
  assert.match(sheet, /--bn-plat-font-body-size: 13px;/);
  assert.match(sheet, /--bn-plat-font-body-tracking: -0\.43px;/);
  assert.match(sheet, /--bn-plat-glass-refraction: 70;/);
  assert.match(sheet, /--bn-plat-glass-frost-regular: 6px;/);
  assert.match(sheet, /--bn-plat-glass-opacity-unit: 0\.25;/);
  assert.match(sheet, /--bn-plat-sheet-top-radius: 38px;/);
  assert.match(sheet, /--bn-plat-control-global-height: 24px;/);
  assert.match(sheet, /--bn-plat-control-button-radius: 1000px;/);
});

test('increased contrast is labeled derived and keeps hue', () => {
  const light = derivePalette(kit.ios.color, 'light', 'Backgrounds/Primary');
  assert.ok(light.every((entry) => entry.provenance === 'derived'));
  const blue = light.find((entry) => entry.name === 'Accents/Blue');
  const bg = parseColor('rgb(255, 255, 255)');
  const derived = parseColor(blue.derivedCss);
  const original = parseColor(blue.kitCss);
  assert.ok(contrastRatio(derived, bg) >= 4.5);
  assert.ok(contrastRatio(derived, bg) > contrastRatio(original, bg));
  const hue = (color) => rgbToHsl(color.r, color.g, color.b).h;
  assert.ok(Math.abs(hue(derived) - hue(original)) < 0.02);
  const yellow = light.find((entry) => entry.name === 'Accents/Yellow');
  const y0 = parseColor(yellow.kitCss);
  const y1 = parseColor(yellow.derivedCss);
  assert.ok(Math.abs(hue(y0) - hue(y1)) < 0.02);
  assert.ok(contrastRatio(y1, bg) >= 4.5);
});

test('secondary label alpha rises and does not become solid', () => {
  const light = derivePalette(kit.ios.color, 'light', 'Backgrounds/Primary');
  const secondary = light.find((entry) => entry.name === 'Labels/Secondary');
  const bg = parseColor(kit.ios.color['Backgrounds/Primary'].light_css);
  const color = parseColor(secondary.derivedCss);
  const kitColor = parseColor(secondary.kitCss);
  assert.ok(color.a > kitColor.a);
  assert.ok(color.a < 1);
  assert.ok(contrastRatio(composite(color, bg), bg) >= 7);
});

test('backgrounds and the gray ramp stay on the kit colour', () => {
  const light = derivePalette(kit.ios.color, 'light', 'Backgrounds/Primary');
  for (const name of ['Backgrounds/Primary', 'Grays/White', 'Grays/Black', 'Grays/Gray 2']) {
    const entry = light.find((item) => item.name === name);
    assert.equal(entry.method, 'unchanged');
    assert.equal(entry.derivedCss, entry.kitCss);
  }
});

test('dark blue walks lighter and macOS primary label gets more opaque', () => {
  const dark = derivePalette(kit.ios.color, 'dark', 'Backgrounds/Primary');
  const blue = dark.find((entry) => entry.name === 'Accents/Blue');
  const black = parseColor('rgb(0, 0, 0)');
  assert.ok(contrastRatio(parseColor(blue.derivedCss), black) >= 4.5);
  assert.ok(parseColor(blue.derivedCss).r > parseColor(blue.kitCss).r);
  const mac = derivePalette(kit.macos.color, 'light', 'Window Background');
  const primary = mac.find((entry) => entry.name === 'Labels/Primary');
  assert.ok(parseColor(primary.derivedCss).a > parseColor(primary.kitCss).a);
});

test('provenance names the derived and mapped groups', () => {
  assert.equal(PROVENANCE.color, 'kit');
  assert.equal(PROVENANCE.increasedContrast, 'derived');
  assert.equal(PROVENANCE.liquidGlassBlur, 'mapped');
  assert.equal(PROVENANCE.motion, 'absent');
});

test('colour slugs do not collide', () => {
  const slugs = new Set();
  for (const name of Object.keys(kit.ios.color)) {
    const slug = colorSlug(name);
    assert.equal(slugs.has(slug), false, slug);
    slugs.add(slug);
  }
});
