#!/usr/bin/env node
/**
 * Measures catalog controls against kit geometry and writes
 * docs/design-system/verified.json. A cell is pass only when this file
 * records it. Kit PNGs are not copied into the repo. The numbers below
 * are the iOS 27 frame sizes read from the local kit extract on
 * 2026-10-22 (buttons large 50px capsule, segmented large 50px / radius
 * 100). Comparison only.
 *
 *   node scripts/design-system-verify.js
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const KIT = {
  button:
    'kit:ios-buttons large prominent 50px capsule, accent blue (local extract, not committed)',
  segmented:
    'kit:ios-segmented large 50px radius 100 tertiary track (local extract, not committed)',
};

function close(a, b, tol = 1) {
  return Math.abs(a - b) <= tol;
}

const browser = await chromium.launch();
const cells = [];
const failures = [];

for (const theme of ['light', 'dark']) {
  for (const width of [320, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('http://127.0.0.1:3000/design-system', { waitUntil: 'domcontentloaded' });
    const sample = await page.evaluate(() => {
      const button = document.querySelector(
        '[data-bn-platform="ios"] [data-bn="bn-button"][data-variant="prominent"][data-size="large"]:not([disabled])',
      );
      const bordered = document.querySelector(
        '[data-bn-platform="ios"] [data-bn="bn-button"][data-variant="bordered"][data-size="large"]:not([disabled])',
      );
      const borderless = document.querySelector(
        '[data-bn-platform="ios"] [data-bn="bn-button"][data-variant="borderless"][data-size="large"]:not([disabled])',
      );
      const segmented = document.querySelector(
        '[data-bn-platform="ios"] [data-bn="bn-segmented"][data-size="large"]',
      );
      function box(el) {
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          radius: parseFloat(style.borderTopLeftRadius),
          bg: style.backgroundColor,
        };
      }
      return {
        button: box(button),
        bordered: box(bordered),
        borderless: box(borderless),
        segmented: box(segmented),
      };
    });
    const accent = sample.button && sample.button.bg === 'rgb(0, 136, 255)';
    const buttonOk =
      sample.button && close(sample.button.height, 50) && sample.button.radius >= 24 && accent;
    const tertiary =
      sample.bordered &&
      (sample.bordered.bg === 'rgba(118, 118, 128, 0.12)' ||
        sample.bordered.bg === 'rgba(118, 118, 128, 0.122)');
    const borderedOk =
      sample.bordered &&
      close(sample.bordered.height, 50) &&
      sample.bordered.radius >= 24 &&
      tertiary;
    const borderlessOk =
      sample.borderless &&
      close(sample.borderless.height, 50) &&
      close(sample.borderless.radius, 12, 1) &&
      (sample.borderless.bg === 'rgba(0, 0, 0, 0)' || sample.borderless.bg === 'transparent');
    const segmentedOk =
      sample.segmented && close(sample.segmented.height, 50) && close(sample.segmented.radius, 100);
    if (buttonOk) {
      cells.push({
        id: 'button',
        variant: 'prominent',
        state: 'rest',
        theme,
        width,
        kit: KIT.button,
      });
    } else failures.push({ theme, width, control: 'button', sample: sample.button });
    if (borderedOk) {
      cells.push({
        id: 'button',
        variant: 'bordered',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-buttons large bordered 50px capsule, tertiary fill (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'bordered', sample: sample.bordered });
    if (borderlessOk) {
      cells.push({
        id: 'button',
        variant: 'borderless',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-buttons large borderless 50px radius 12 (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'borderless', sample: sample.borderless });
    if (segmentedOk) {
      cells.push({
        id: 'segmented',
        variant: 'default',
        state: 'rest',
        theme,
        width,
        kit: KIT.segmented,
      });
    } else failures.push({ theme, width, control: 'segmented', sample: sample.segmented });
    await page.close();
  }
}
await browser.close();

const doc = {
  measured: '2026-10-22',
  note: 'Pass means the live control matched the kit frame size at that theme and width. Other states stay pending.',
  cells,
};
writeFileSync('docs/design-system/verified.json', `${JSON.stringify(doc, null, 2)}\n`);
console.log(`verified cells: ${cells.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}
