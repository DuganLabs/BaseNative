#!/usr/bin/env node
/**
 * Measures catalog controls against kit geometry and writes
 * docs/design-system/verified.json. A cell is pass only when this file
 * records it. Kit PNGs are not copied into the repo. The numbers below
 * are the iOS 27 frame sizes read from the local kit extract on
 * 2026-10-22 (buttons large 50px capsule, segmented large 50px / radius
 * 100, selected pill 46px, list row tall 68px, page dot 8px, alert
 * 300× radius 34). Comparison only. Dark alerts stay on the light glass
 * fill, so those cells are not recorded.
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
    const sample = await page.evaluate((themeName) => {
      const stageName = themeName === 'dark' ? 'iOS dark' : 'iOS light';
      const stage = [...document.querySelectorAll('[data-bn="bn-catalog-stage"]')].find(
        (el) => el.querySelector('[data-bn="bn-catalog-heading"]')?.textContent === stageName,
      );
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
      const root = stage || document;
      function box(el) {
        if (!el) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          radius: parseFloat(style.borderTopLeftRadius),
          bg: style.backgroundColor,
          pad: parseFloat(style.paddingInlineStart),
        };
      }
      const seg = root.querySelector('[data-bn="bn-segmented"][data-size="large"]');
      const alert = root.querySelector('[data-bn="bn-alert"]');
      const sheet = root.querySelector('[data-bn="bn-action-sheet"]');
      return {
        button: box(button),
        bordered: box(bordered),
        borderless: box(borderless),
        segmented: box(segmented),
        pill: box(seg?.querySelector('[data-bn="bn-segment"]:has(input:checked)')),
        row: box(
          root.querySelector('[data-bn="bn-list"][data-grouped="true"] [data-bn="bn-list-row"]'),
        ),
        dot: box(root.querySelector('[data-bn="bn-page-dot"]:not([aria-checked="true"])')),
        dotOn: box(root.querySelector('[data-bn="bn-page-dot"][aria-checked="true"]')),
        alert: box(alert),
        action: box(alert?.querySelector('[data-bn="bn-action"]')),
        sheet: box(sheet),
        sheetAction: box(sheet?.querySelector('[data-bn="bn-action"]')),
        disabled: box(
          root.querySelector(
            '[data-bn="bn-button"][data-variant="prominent"][data-size="large"]:disabled',
          ),
        ),
      };
    }, theme);
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
    const pillFill =
      theme === 'light'
        ? sample.pill && sample.pill.bg === 'rgb(255, 255, 255)'
        : sample.pill &&
          (sample.pill.bg === 'rgba(255, 255, 255, 0.27)' ||
            sample.pill.bg === 'rgba(255, 255, 255, 0.271)');
    const selectedOk =
      sample.pill && close(sample.pill.height, 46) && sample.pill.radius >= 24 && pillFill;
    if (selectedOk) {
      cells.push({
        id: 'segmented',
        variant: 'default',
        state: 'selected',
        theme,
        width,
        kit: 'kit:ios-segmented selected pill 46px radius 1000, selected-fill (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'segment-selected', sample: sample.pill });
    const dotRest = theme === 'light' ? 'rgba(60, 60, 67, 0.3)' : 'rgba(235, 235, 245, 0.3)';
    const dotOn = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const dotOk =
      sample.dot &&
      close(sample.dot.width, 8) &&
      close(sample.dot.height, 8) &&
      sample.dot.bg === dotRest;
    const dotOnOk =
      sample.dotOn &&
      close(sample.dotOn.width, 8) &&
      close(sample.dotOn.height, 8) &&
      sample.dotOn.bg === dotOn;
    if (dotOk) {
      cells.push({
        id: 'page-dot',
        variant: 'default',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-page-controls inactive dot 8px, Labels/Tertiary (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'page-dot', sample: sample.dot });
    if (dotOnOk) {
      cells.push({
        id: 'page-dot',
        variant: 'default',
        state: 'selected',
        theme,
        width,
        kit: 'kit:ios-page-controls active dot 8px, Labels/Primary (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'page-dot-selected', sample: sample.dotOn });
    const listOk = sample.row && close(sample.row.height, 68) && close(sample.row.pad, 16);
    if (listOk) {
      cells.push({
        id: 'list',
        variant: 'grouped',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-lists row Height=Tall 68px, padding inline 16 (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'list', sample: sample.row });
    const tertiaryOff =
      sample.disabled &&
      (sample.disabled.bg === 'rgba(118, 118, 128, 0.12)' ||
        sample.disabled.bg === 'rgba(118, 118, 128, 0.122)');
    const disabledOk =
      theme === 'light' &&
      sample.disabled &&
      close(sample.disabled.height, 50) &&
      sample.disabled.radius >= 24 &&
      tertiaryOff;
    if (theme === 'light') {
      if (disabledOk) {
        cells.push({
          id: 'button',
          variant: 'prominent',
          state: 'disabled',
          theme,
          width,
          kit: 'kit:ios-buttons large prominent disabled 50px capsule, tertiary fill (local extract, not committed)',
        });
      } else failures.push({ theme, width, control: 'button-disabled', sample: sample.disabled });
    }
    const glass = 'rgba(255, 255, 255, 0.7)';
    const alertOk =
      sample.alert &&
      close(sample.alert.width, 300) &&
      close(sample.alert.radius, 34) &&
      close(sample.alert.pad, 14) &&
      sample.alert.bg === glass &&
      sample.action &&
      close(sample.action.height, 48) &&
      close(sample.action.radius, 100);
    const sheetOk =
      sample.sheet &&
      close(sample.sheet.width, 300) &&
      close(sample.sheet.radius, 34) &&
      close(sample.sheet.pad, 14) &&
      sample.sheet.bg === glass &&
      sample.sheetAction &&
      close(sample.sheetAction.height, 48) &&
      close(sample.sheetAction.radius, 100);
    if (theme === 'light' && width >= 768) {
      if (alertOk) {
        cells.push({
          id: 'alert',
          variant: 'inline',
          state: 'rest',
          theme,
          width,
          kit: 'kit:ios-alerts 300px radius 34, action 48px radius 100 (local extract, not committed)',
        });
      } else failures.push({ theme, width, control: 'alert', sample: sample.alert });
      if (sheetOk) {
        cells.push({
          id: 'action-sheet',
          variant: 'inline',
          state: 'rest',
          theme,
          width,
          kit: 'kit:ios-action-sheets 300px radius 34, action 48px radius 100 (local extract, not committed)',
        });
      } else failures.push({ theme, width, control: 'action-sheet', sample: sample.sheet });
    }
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
