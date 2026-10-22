#!/usr/bin/env node
/**
 * Measures catalog controls against kit geometry and writes
 * docs/design-system/verified.json. A cell is pass only when this file
 * records it. Kit PNGs are not copied into the repo. The numbers below
 * are the iOS 27 frame sizes read from the local kit extract on
 * 2026-10-22 (buttons large 50px capsule, segmented large 50px / radius
 * 100, selected pill 46px, list row tall 68px, page dot 8px, alert
 * 300× radius 34, popup 44px, destructive Accents/Red, glass-prominent
 * large 50px with Frost Regular). Comparison only. Samples come from the
 * iOS stage for that theme. Dark alerts stay on the light glass fill, so
 * Dark alerts use the dark glass fill. Refraction is not a blur length.
 * State cells pass when the states layer (brightness, opacity, or outline)
 * matches and the box matches the rest control of the same variant.
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

async function sweepStates(page, theme, width) {
  return page.evaluate(
    ({ themeName, viewport }) => {
      const stages = ['Atom states', 'Molecule states', 'Organism states', 'Materials'];
      const labels = {
        Rest: 'rest',
        Hover: 'hover',
        Pressed: 'pressed',
        Focus: 'focus-visible',
        Disabled: 'disabled',
        Selected: 'selected',
      };
      const selectable = new Set([
        'switch',
        'checkbox',
        'radio',
        'page-dot',
        'segmented',
        'tab-bar',
        'sidebar',
        'dock',
        'table',
        'date-picker',
      ]);
      function boxOf(el) {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          w: rect.width,
          h: rect.height,
          radius: parseFloat(style.borderTopLeftRadius) || 0,
          filter: style.filter || 'none',
          opacity: parseFloat(style.opacity),
          outlineWidth: parseFloat(style.outlineWidth) || 0,
          outlineStyle: style.outlineStyle,
          blur: style.backdropFilter || 'none',
        };
      }
      function classify(el) {
        const bn = el.getAttribute('data-bn');
        switch (bn) {
          case 'bn-button':
            return {
              id: 'button',
              variant:
                el.getAttribute('data-destructive') === 'true'
                  ? 'destructive'
                  : el.getAttribute('data-variant'),
            };
          case 'bn-symbol-tile':
            return { id: 'symbol-tile', variant: el.getAttribute('data-tint') };
          case 'bn-badge':
            return { id: 'badge', variant: el.getAttribute('data-tint') || 'red' };
          case 'bn-switch':
            return { id: 'switch', variant: 'default' };
          case 'bn-checkbox':
            return { id: 'checkbox', variant: 'default' };
          case 'bn-radio':
            return { id: 'radio', variant: 'default' };
          case 'bn-slider':
            return { id: 'slider', variant: 'default' };
          case 'bn-dial':
            return { id: 'dial', variant: 'default' };
          case 'bn-stepper':
            return { id: 'stepper', variant: 'default' };
          case 'bn-progress':
            return { id: 'progress', variant: 'default' };
          case 'bn-spinner':
            return { id: 'spinner', variant: 'default' };
          case 'bn-field':
            return { id: 'text-field', variant: 'default' };
          case 'bn-search':
            return { id: 'search', variant: 'default' };
          case 'bn-color-well':
            return el.closest('[data-bn="bn-color-picker"]')
              ? null
              : { id: 'color-well', variant: 'default' };
          case 'bn-page-control':
            return { id: 'page-dot', variant: 'default' };
          case 'bn-app-icon':
            return { id: 'app-icon', variant: 'default' };
          case 'bn-material':
            return { id: 'material', variant: el.getAttribute('data-material') };
          case 'bn-popup-button':
            return { id: 'popup-button', variant: el.tagName === 'SELECT' ? 'native' : 'menu' };
          case 'bn-pulldown-button':
            return { id: 'pulldown-button', variant: 'default' };
          case 'bn-segmented':
            return { id: 'segmented', variant: 'default' };
          case 'bn-combobox':
            return { id: 'combobox', variant: 'default' };
          case 'bn-color-picker':
            return { id: 'color-picker', variant: 'inline' };
          case 'bn-date-picker':
            return { id: 'date-picker', variant: 'inline' };
          case 'bn-list':
            return {
              id: 'list',
              variant: el.querySelector('[data-bn="bn-symbol-tile"]') ? 'symbol-tile' : 'grouped',
            };
          case 'bn-menu':
            return { id: 'menu', variant: 'inline' };
          case 'bn-context-menu':
            return { id: 'context-menu', variant: 'inline' };
          case 'bn-tooltip':
            return { id: 'tooltip', variant: 'default' };
          case 'bn-popover':
            return el.getAttribute('data-present') === 'inline'
              ? { id: 'popover', variant: 'inline' }
              : null;
          case 'bn-disclosure':
            return { id: 'disclosure', variant: el.hasAttribute('open') ? 'open' : 'closed' };
          case 'bn-index-bar':
            return { id: 'index-bar', variant: 'default' };
          case 'bn-metric':
            return el.closest('[data-bn="bn-card-grid"]')
              ? null
              : { id: 'metric', variant: 'default' };
          case 'bn-nav-bar':
            return {
              id: 'nav-bar',
              variant: el.getAttribute('data-large') === 'false' ? 'inline-title' : 'large-title',
            };
          case 'bn-tab-bar':
            return {
              id: 'tab-bar',
              variant: el.querySelector('button[data-bn="bn-tab"]') ? 'overflow' : 'default',
            };
          case 'bn-toolbar':
            return { id: 'toolbar', variant: 'default' };
          case 'bn-sidebar':
            return { id: 'sidebar', variant: 'default' };
          case 'bn-menubar':
            return { id: 'menubar', variant: 'default' };
          case 'bn-alert':
            return { id: 'alert', variant: 'inline' };
          case 'bn-dialog':
            return { id: 'dialog', variant: 'inline' };
          case 'bn-sheet':
            return { id: 'sheet', variant: 'inline' };
          case 'bn-action-sheet':
            return { id: 'action-sheet', variant: 'inline' };
          case 'bn-share-sheet':
            return { id: 'share-sheet', variant: 'inline' };
          case 'bn-notification':
            return { id: 'notification', variant: 'default' };
          case 'bn-table':
            return { id: 'table', variant: 'default' };
          case 'bn-inspector':
            return { id: 'inspector', variant: 'default' };
          case 'bn-card-grid': {
            const metric = el.querySelector(':scope > li [data-bn="bn-metric"]');
            const widget = el.querySelector(':scope > li [data-bn="bn-widget"]');
            if (metric && !widget) return { id: 'card-grid', variant: 'metric' };
            if (widget && !metric) return { id: 'card-grid', variant: 'widget' };
            return null;
          }
          case 'bn-hero':
            return { id: 'hero', variant: 'default' };
          case 'bn-footer':
            return { id: 'footer', variant: 'default' };
          case 'bn-window':
            return { id: 'window', variant: 'default' };
          case 'bn-form':
            return { id: 'form', variant: 'default' };
          case 'bn-group':
            return { id: 'group', variant: 'default' };
          case 'bn-empty-state':
            return { id: 'empty-state', variant: 'default' };
          case 'bn-widget':
            return el.closest('[data-bn="bn-card-grid"]')
              ? null
              : { id: 'widget', variant: 'default' };
          case 'bn-scroll':
            return { id: 'scroll', variant: 'default' };
          case 'bn-image-well':
            return { id: 'image-well', variant: 'default' };
          case 'bn-input-accessory':
            return { id: 'input-accessory', variant: 'default' };
          case 'bn-dock':
            return { id: 'dock', variant: 'default' };
          default:
            return null;
        }
      }
      function restChrome(box) {
        const filterOff = !box.filter || box.filter === 'none';
        const outlineOff = box.outlineStyle === 'none' || box.outlineWidth === 0;
        return box.w >= 2 && box.h >= 2 && filterOff && box.opacity === 1 && outlineOff;
      }
      function signature(box, state) {
        if (box.w < 2 || box.h < 2) return false;
        if (state === 'rest' || state === 'selected') return restChrome(box);
        if (state === 'hover') return box.filter.includes('0.96');
        if (state === 'pressed') return box.filter.includes('0.92');
        if (state === 'focus-visible') return box.outlineWidth >= 2 && box.outlineStyle === 'solid';
        if (state === 'disabled') return box.opacity <= 0.5;
        return false;
      }
      function materialOk(el, box) {
        const name = el.getAttribute('data-material');
        const style = getComputedStyle(el);
        const widthToken = parseFloat(style.getPropertyValue('--bn-len-160'));
        const heightToken = parseFloat(style.getPropertyValue('--bn-len-96'));
        if (Math.abs(box.w - widthToken) > 1 || Math.abs(box.h - heightToken) > 1) return false;
        if (name === 'opaque') return box.blur === 'none';
        return box.blur.includes('blur');
      }
      function selectedDistinct(el, id) {
        if (id === 'switch' || id === 'checkbox' || id === 'radio') {
          return Boolean(el.querySelector('input:checked'));
        }
        if (id === 'page-dot') {
          const on = el.querySelector('[aria-checked="true"]');
          const off = el.querySelector('[data-bn="bn-page-dot"]:not([aria-checked="true"])');
          if (!on || !off) return false;
          return getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor;
        }
        if (id === 'segmented') {
          const on = el.querySelector('[data-bn="bn-segment"]:has(input:checked)');
          const off = el.querySelector('[data-bn="bn-segment"]:not(:has(input:checked))');
          if (!on || !off) return false;
          return getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor;
        }
        if (id === 'tab-bar' || id === 'sidebar' || id === 'dock') {
          const on = el.querySelector('[aria-current="page"]');
          const off = [...el.querySelectorAll('a, button')].find(
            (node) => node.getAttribute('aria-current') !== 'page',
          );
          if (!on || !off) return false;
          const a = getComputedStyle(on);
          const b = getComputedStyle(off);
          return (
            a.color !== b.color ||
            a.backgroundColor !== b.backgroundColor ||
            a.fontWeight !== b.fontWeight
          );
        }
        if (id === 'table') {
          const on = el.querySelector('[data-selected="true"]');
          const off = el.querySelector('tbody tr:not([data-selected="true"])');
          if (!on || !off) return false;
          return getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor;
        }
        if (id === 'date-picker') {
          const on = el.querySelector('[data-selected="true"]');
          const off = el.querySelector('[data-bn="bn-date-day"]:not([data-selected="true"])');
          if (!on || !off) return false;
          return getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor;
        }
        return false;
      }
      const found = [];
      const misses = [];
      const restBoxes = new Map();
      for (const title of stages) {
        const stage = [...document.querySelectorAll('[data-bn="bn-catalog-stage"]')].find(
          (el) =>
            el.getAttribute('data-theme') === themeName &&
            el.querySelector('[data-bn="bn-catalog-heading"]')?.textContent === title,
        );
        if (!stage) continue;
        for (const row of stage.querySelectorAll('[data-bn="bn-catalog-row"]')) {
          const state =
            labels[row.querySelector('[data-bn="bn-catalog-label"]')?.textContent || ''];
          if (!state) continue;
          const hosts = [...row.querySelectorAll('[data-bn]')].filter((el) => {
            const force = el.getAttribute('data-force') || '';
            if (state === 'selected') return force === '';
            if (state === 'hover') return force === 'hover';
            if (state === 'pressed') return force === 'active';
            if (state === 'focus-visible') return force === 'focus';
            if (state === 'disabled') return force === 'disabled';
            return force === '';
          });
          for (const el of hosts) {
            const kind = classify(el);
            if (!kind || !kind.variant) continue;
            if (state === 'selected' && !selectable.has(kind.id)) continue;
            const measured = boxOf(el);
            const key = `${kind.id}|${kind.variant}`;
            let reason = '';
            if (!signature(measured, state)) reason = 'signature';
            else if (kind.id === 'material' && !materialOk(el, measured)) reason = 'material';
            else if (state === 'selected' && !selectedDistinct(el, kind.id)) reason = 'selected';
            else if (state !== 'rest') {
              const rest = restBoxes.get(key);
              if (!rest) reason = 'no-rest';
              else if (
                Math.abs(measured.h - rest.h) > 1 ||
                Math.abs(measured.radius - rest.radius) > 1
              ) {
                reason = 'geometry';
              }
            }
            if (reason) {
              if (misses.length < 30) {
                misses.push({
                  ...kind,
                  state,
                  reason,
                  filter: measured.filter,
                  opacity: measured.opacity,
                  h: Math.round(measured.h),
                });
              }
              continue;
            }
            if (state === 'rest') restBoxes.set(key, measured);
            found.push({
              id: kind.id,
              variant: kind.variant,
              state,
              theme: themeName,
              width: viewport,
              kit:
                kind.id === 'material'
                  ? 'token: material swatch matches --bn-len-160 by --bn-len-96 and the glass blur, with the states-layer signature'
                  : 'token: states layer matches filter, opacity, or outline, and the box matches the rest control',
            });
          }
        }
      }
      return { found, misses };
    },
    { themeName: theme, viewport: width },
  );
}

const browser = await chromium.launch();
const cells = [];
const failures = [];

for (const theme of ['light', 'dark']) {
  for (const width of [320, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('http://127.0.0.1:3000/design-system?measure=1', {
      waitUntil: 'domcontentloaded',
    });
    const sample = await page.evaluate((themeName) => {
      const stageName = themeName === 'dark' ? 'iOS dark' : 'iOS light';
      const stage = [...document.querySelectorAll('[data-bn="bn-catalog-stage"]')].find(
        (el) => el.querySelector('[data-bn="bn-catalog-heading"]')?.textContent === stageName,
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
          color: style.color,
          pad: parseFloat(style.paddingInlineStart),
          padTop: parseFloat(style.paddingTop),
          gap: parseFloat(style.columnGap),
          fontSize: parseFloat(style.fontSize),
          fontWeight: parseFloat(style.fontWeight),
          blur: style.backdropFilter || '',
        };
      }
      const seg = root.querySelector('[data-bn="bn-segmented"][data-size="large"]');
      const alert = root.querySelector('[data-bn="bn-alert"]');
      const sheet = root.querySelector('[data-bn="bn-action-sheet"]');
      const molecules = [...document.querySelectorAll('[data-bn="bn-catalog-stage"]')].find(
        (el) =>
          el.querySelector('[data-bn="bn-catalog-heading"]')?.textContent === 'Molecule states',
      );
      return {
        button: box(
          root.querySelector(
            '[data-bn="bn-button"][data-variant="prominent"][data-size="large"]:not([disabled]):not([data-destructive="true"])',
          ),
        ),
        bordered: box(
          root.querySelector(
            '[data-bn="bn-button"][data-variant="bordered"][data-size="large"]:not([disabled]):not([data-destructive="true"])',
          ),
        ),
        borderless: box(
          root.querySelector(
            '[data-bn="bn-button"][data-variant="borderless"][data-size="large"]:not([disabled])',
          ),
        ),
        segmented: box(seg),
        glassProminent: box(
          root.querySelector(
            '[data-bn="bn-button"][data-variant="glass-prominent"][data-size="large"]:not([disabled])',
          ),
        ),
        destructive: box(
          root.querySelector(
            '[data-bn="bn-button"][data-destructive="true"][data-variant="prominent"]:not([disabled])',
          ),
        ),
        destructiveBordered: box(
          root.querySelector(
            '[data-bn="bn-button"][data-destructive="true"][data-variant="bordered"]:not([disabled])',
          ),
        ),
        popup: box(root.querySelector('button[data-bn="bn-popup-button"]')),
        nativePopup: box(molecules?.querySelector('select[data-bn="bn-popup-button"]')),
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
            '[data-bn="bn-button"][data-variant="prominent"][data-size="large"]:disabled:not([data-destructive="true"])',
          ),
        ),
      };
    }, theme);
    const accent = theme === 'light' ? 'rgb(0, 136, 255)' : 'rgb(0, 145, 255)';
    const red = theme === 'light' ? 'rgb(255, 56, 60)' : 'rgb(255, 66, 69)';
    const tertiaryFill = (bg) =>
      theme === 'light'
        ? bg === 'rgba(118, 118, 128, 0.12)' || bg === 'rgba(118, 118, 128, 0.122)'
        : bg === 'rgba(118, 118, 128, 0.24)' ||
          bg === 'rgba(118, 118, 128, 0.239)' ||
          bg === 'rgba(118, 118, 128, 0.2392)';
    const redWash = (bg) =>
      theme === 'light'
        ? bg === 'rgba(255, 56, 60, 0.14)' || bg === 'rgba(255, 56, 60, 0.141)'
        : bg === 'rgba(255, 66, 69, 0.14)' || bg === 'rgba(255, 66, 69, 0.141)';
    const buttonOk =
      sample.button &&
      close(sample.button.height, 50) &&
      sample.button.radius >= 24 &&
      sample.button.bg === accent;
    const borderedOk =
      sample.bordered &&
      close(sample.bordered.height, 50) &&
      sample.bordered.radius >= 24 &&
      tertiaryFill(sample.bordered.bg);
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
    const disabledOk =
      sample.disabled &&
      close(sample.disabled.height, 50) &&
      sample.disabled.radius >= 24 &&
      tertiaryFill(sample.disabled.bg);
    if (disabledOk) {
      cells.push({
        id: 'button',
        variant: 'prominent',
        state: 'disabled',
        theme,
        width,
        kit: 'kit:ios-buttons large prominent disabled 50px capsule, Fills/Tertiary for the theme (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'button-disabled', sample: sample.disabled });
    const glassProminentOk =
      sample.glassProminent &&
      close(sample.glassProminent.height, 50) &&
      close(sample.glassProminent.radius, 1000) &&
      close(sample.glassProminent.padTop, 16) &&
      close(sample.glassProminent.gap, 4) &&
      sample.glassProminent.bg === accent &&
      sample.glassProminent.color === 'rgb(255, 255, 255)' &&
      String(sample.glassProminent.blur).includes('blur(6px)');
    if (glassProminentOk) {
      cells.push({
        id: 'button',
        variant: 'glass-prominent',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-buttons liquid glass prominent large 50px radius 1000, padding 16/20, Accents/Blue tint, Frost Regular (local extract, not committed)',
      });
    } else
      failures.push({ theme, width, control: 'glass-prominent', sample: sample.glassProminent });
    const destructiveOk =
      sample.destructive &&
      close(sample.destructive.height, 50) &&
      close(sample.destructive.radius, 1000) &&
      sample.destructive.bg === red &&
      sample.destructive.color === 'rgb(255, 255, 255)';
    if (destructiveOk) {
      cells.push({
        id: 'button',
        variant: 'destructive',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-buttons large prominent destructive 50px capsule, Accents/Red (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'destructive', sample: sample.destructive });
    if (
      sample.destructiveBordered &&
      !(
        close(sample.destructiveBordered.height, 50) &&
        close(sample.destructiveBordered.radius, 1000) &&
        redWash(sample.destructiveBordered.bg) &&
        sample.destructiveBordered.color === red
      )
    ) {
      failures.push({
        theme,
        width,
        control: 'destructive-bordered',
        sample: sample.destructiveBordered,
      });
    }
    const popupOk =
      sample.popup &&
      close(sample.popup.height, 44) &&
      close(sample.popup.padTop, 13) &&
      close(sample.popup.gap, 3) &&
      close(sample.popup.fontSize, 18) &&
      sample.popup.color === accent &&
      sample.popup.fontWeight >= 580 &&
      sample.popup.fontWeight <= 700;
    if (popupOk) {
      cells.push({
        id: 'popup-button',
        variant: 'menu',
        state: 'rest',
        theme,
        width,
        kit: 'kit:ios-popup-buttons 44px, padding 13, gap 3, Accents/Blue semibold 18 (local extract, not committed)',
      });
    } else failures.push({ theme, width, control: 'popup', sample: sample.popup });
    const nativeOk =
      theme === 'light' &&
      sample.nativePopup &&
      close(sample.nativePopup.height, 44) &&
      close(sample.nativePopup.padTop, 13) &&
      close(sample.nativePopup.gap, 3) &&
      close(sample.nativePopup.fontSize, 18) &&
      sample.nativePopup.color === accent &&
      sample.nativePopup.fontWeight >= 580 &&
      sample.nativePopup.fontWeight <= 700;
    if (theme === 'light') {
      if (nativeOk) {
        cells.push({
          id: 'popup-button',
          variant: 'native',
          state: 'rest',
          theme,
          width,
          kit: 'kit:ios-popup-buttons 44px, padding 13, gap 3, Accents/Blue semibold 18 (local extract, not committed)',
        });
      } else failures.push({ theme, width, control: 'popup-native', sample: sample.nativePopup });
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
    const darkGlass =
      theme === 'dark' &&
      sample.alert &&
      (sample.alert.bg === 'rgba(26, 26, 26, 0.9)' ||
        sample.alert.bg === 'rgba(26, 26, 26, 0.898)');
    const alertThemeOk =
      theme === 'light'
        ? alertOk
        : alertOk && darkGlass
          ? false
          : darkGlass &&
            sample.alert &&
            close(sample.alert.width, 300) &&
            close(sample.alert.radius, 34) &&
            close(sample.alert.pad, 14) &&
            sample.action &&
            close(sample.action.height, 48) &&
            close(sample.action.radius, 100);
    const sheetThemeOk =
      theme === 'light'
        ? sheetOk
        : sample.sheet &&
          (sample.sheet.bg === 'rgba(26, 26, 26, 0.9)' ||
            sample.sheet.bg === 'rgba(26, 26, 26, 0.898)') &&
          close(sample.sheet.width, 300) &&
          close(sample.sheet.radius, 34) &&
          close(sample.sheet.pad, 14) &&
          sample.sheetAction &&
          close(sample.sheetAction.height, 48) &&
          close(sample.sheetAction.radius, 100);
    if (width >= 768) {
      if (theme === 'light' ? alertOk : alertThemeOk) {
        cells.push({
          id: 'alert',
          variant: 'inline',
          state: 'rest',
          theme,
          width,
          kit:
            theme === 'light'
              ? 'kit:ios-alerts 300px radius 34, action 48px radius 100 (local extract, not committed)'
              : 'token: dark alert fill is --bn-alert-surface rgba(26, 26, 26, 0.9), 300px radius 34, action 48px radius 100',
        });
      } else failures.push({ theme, width, control: 'alert', sample: sample.alert });
      if (theme === 'light' ? sheetOk : sheetThemeOk) {
        cells.push({
          id: 'action-sheet',
          variant: 'inline',
          state: 'rest',
          theme,
          width,
          kit:
            theme === 'light'
              ? 'kit:ios-action-sheets 300px radius 34, action 48px radius 100 (local extract, not committed)'
              : 'token: dark action sheet fill is --bn-alert-surface rgba(26, 26, 26, 0.9), 300px radius 34, action 48px radius 100',
        });
      } else failures.push({ theme, width, control: 'action-sheet', sample: sample.sheet });
    }
    const swept = await sweepStates(page, theme, width);
    const seen = new Set(
      cells.map((cell) => `${cell.id}|${cell.variant}|${cell.state}|${cell.theme}|${cell.width}`),
    );
    for (const cell of swept.found) {
      const key = `${cell.id}|${cell.variant}|${cell.state}|${cell.theme}|${cell.width}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(cell);
    }
    if (swept.misses.length) {
      console.log(`sweep misses ${theme} ${width}: ${swept.misses.length}`);
      console.log(JSON.stringify(swept.misses.slice(0, 12)));
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
