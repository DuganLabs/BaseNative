#!/usr/bin/env node
/**
 * Writes docs/design-system/coverage.json: every platform component crossed
 * with variant, state, theme, and width. status is "pending" when the
 * /design-system route renders that cell and no screenshot gate has passed,
 * "gap" when the cell is not rendered, and "pass" only after a recorded gate.
 *
 *   node scripts/design-system-coverage.js           write the matrix
 *   node scripts/design-system-coverage.js --check   fail if the file drifted
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/design-system/coverage.json');
const VERIFIED = join(ROOT, 'docs/design-system/verified.json');
const THEMES = ['light', 'dark'];
const WIDTHS = [320, 768, 1280];
const STATES = ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'];

const depth = [
  'Liquid Glass: backdrop-filter blur plus a specular edge (inset highlight and chromatic fringe).',
  'Layered shadow, not a flat fill.',
  'Accent colour stays the system blue where the control is prominent.',
  'Label does not overflow (scrollWidth within 1px of clientWidth) and does not wrap when the acceptance says one line.',
];

/** @type {{ id: string, tier: string, renderer: string, variants: string[], rendered: string[], acceptance: string[], note?: string }[]} */
const COMPONENTS = [
  {
    id: 'button',
    tier: 'atom',
    renderer: 'renderBnButton',
    variants: ['prominent', 'bordered', 'borderless', 'glass', 'glass-prominent', 'destructive'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Capsule on the large size.', 'One line.', ...depth],
  },
  {
    id: 'symbol-tile',
    tier: 'atom',
    renderer: 'renderBnSymbol',
    variants: [
      'blue',
      'green',
      'orange',
      'purple',
      'red',
      'teal',
      'indigo',
      'pink',
      'yellow',
      'mint',
      'cyan',
      'brown',
    ],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['30px tile, original mark, tint fill.', 'One line.'],
  },
  {
    id: 'badge',
    tier: 'atom',
    renderer: 'renderBnBadge',
    variants: ['red', 'blue', 'green', 'orange'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Count stays one line.'],
  },
  {
    id: 'switch',
    tier: 'atom',
    renderer: 'renderBnSwitch',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Checked state is the green accent, not a flat grey.'],
  },
  {
    id: 'checkbox',
    tier: 'atom',
    renderer: 'renderBnCheckbox',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Native checkbox, associated label.'],
  },
  {
    id: 'radio',
    tier: 'atom',
    renderer: 'renderBnRadio',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Native radio, associated label.'],
  },
  {
    id: 'slider',
    tier: 'atom',
    renderer: 'renderBnSlider',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Track and thumb stay inside the row.'],
  },
  {
    id: 'dial',
    tier: 'atom',
    renderer: 'renderBnDial',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Value label stays one line.'],
  },
  {
    id: 'stepper',
    tier: 'atom',
    renderer: 'renderBnStepper',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Decrement and increment are separate buttons.'],
  },
  {
    id: 'progress',
    tier: 'atom',
    renderer: 'renderBnProgress',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Determinate bar uses the accent.'],
  },
  {
    id: 'spinner',
    tier: 'atom',
    renderer: 'renderBnSpinner',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Busy indicator has an accessible name.'],
  },
  {
    id: 'text-field',
    tier: 'atom',
    renderer: 'renderBnField',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Label and field stay inside the row.'],
  },
  {
    id: 'search',
    tier: 'atom',
    renderer: 'renderBnSearch',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Search field does not overflow the row.'],
  },
  {
    id: 'color-well',
    tier: 'atom',
    renderer: 'renderBnColorWell',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Swatch shows the chosen colour.'],
  },
  {
    id: 'page-dot',
    tier: 'atom',
    renderer: 'renderBnPageControl',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Current dot is distinct. Dots stay one row.'],
  },
  {
    id: 'app-icon',
    tier: 'atom',
    renderer: 'renderBnAppIcon',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Monogram stays inside the tile.'],
  },
  {
    id: 'material',
    tier: 'token',
    renderer: 'renderBnMaterial',
    variants: ['ultrathin', 'thin', 'sm', 'medium', 'lg', 'thick', 'ultrathick', 'opaque'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth, 'Opaque drops the blur. Refraction shader is a gap, not this swatch.'],
  },
  {
    id: 'popup-button',
    tier: 'molecule',
    renderer: 'renderBnPopupButton',
    variants: ['menu', 'native'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Menu or native select. Label stays one line.'],
  },
  {
    id: 'pulldown-button',
    tier: 'molecule',
    renderer: 'renderBnPulldownButton',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Opens a menu. Label stays one line.'],
  },
  {
    id: 'segmented',
    tier: 'molecule',
    renderer: 'renderBnSegmented',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Segments share one height. Selected segment is distinct.'],
  },
  {
    id: 'combobox',
    tier: 'molecule',
    renderer: 'renderBnCombobox',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Field plus suggestions. No overflow.'],
  },
  {
    id: 'color-picker',
    tier: 'molecule',
    renderer: 'renderBnColorPicker',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Inline swatches render.', 'Full native picker chrome is a gap.'],
  },
  {
    id: 'date-picker',
    tier: 'molecule',
    renderer: 'renderBnDatePicker',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Inline month renders.', 'A wheel picker is a gap.'],
  },
  {
    id: 'list',
    tier: 'molecule',
    renderer: 'renderBnList',
    variants: ['grouped', 'symbol-tile'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Inset grouped surface, separator, title ellipsis. Detail may wrap.'],
  },
  {
    id: 'menu',
    tier: 'molecule',
    renderer: 'renderBnMenu',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth, 'Items stay one line.'],
  },
  {
    id: 'context-menu',
    tier: 'molecule',
    renderer: 'renderBnContextMenu',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Same glass surface as a menu.'],
  },
  {
    id: 'tooltip',
    tier: 'molecule',
    renderer: 'renderBnTooltip',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Tip stays on one line.'],
  },
  {
    id: 'popover',
    tier: 'molecule',
    renderer: 'renderBnPopover',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth],
  },
  {
    id: 'disclosure',
    tier: 'molecule',
    renderer: 'renderBnDisclosure',
    variants: ['open', 'closed'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Uses details/summary.'],
  },
  {
    id: 'index-bar',
    tier: 'molecule',
    renderer: 'renderBnIndexBar',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Letters stay one column, one line each.'],
  },
  {
    id: 'metric',
    tier: 'molecule',
    renderer: 'renderBnMetric',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Value and label each stay one line. Equal height inside a card grid.'],
  },
  {
    id: 'nav-bar',
    tier: 'organism',
    renderer: 'renderBnNavBar',
    variants: ['large-title', 'inline-title'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Large Title does not wrap. Back label stays one line.'],
  },
  {
    id: 'tab-bar',
    tier: 'organism',
    renderer: 'renderBnTabBar',
    variants: ['default', 'overflow'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Tab labels stay one line. Overflow is a tab, not a disclosure.'],
  },
  {
    id: 'toolbar',
    tier: 'organism',
    renderer: 'renderBnToolbar',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Commands stay one line.'],
  },
  {
    id: 'sidebar',
    tier: 'organism',
    renderer: 'renderBnSidebar',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Item labels stay one line. Selected row is distinct.'],
  },
  {
    id: 'menubar',
    tier: 'organism',
    renderer: 'renderBnMenubar',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Items stay one line.'],
  },
  {
    id: 'dock',
    tier: 'organism',
    renderer: 'renderBnDock',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: [...depth, 'Item labels stay one line.'],
  },
  {
    id: 'alert',
    tier: 'organism',
    renderer: 'renderBnAlert',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth, 'Actions stay one line.'],
  },
  {
    id: 'dialog',
    tier: 'organism',
    renderer: 'renderBnDialog',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth],
  },
  {
    id: 'sheet',
    tier: 'organism',
    renderer: 'renderBnSheet',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth],
  },
  {
    id: 'action-sheet',
    tier: 'organism',
    renderer: 'renderBnActionSheet',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth, 'Actions stay one line.'],
  },
  {
    id: 'share-sheet',
    tier: 'organism',
    renderer: 'renderBnShareSheet',
    variants: ['inline'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Actions stay one line.'],
  },
  {
    id: 'notification',
    tier: 'organism',
    renderer: 'renderBnNotification',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth],
  },
  {
    id: 'table',
    tier: 'organism',
    renderer: 'renderBnTable',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'selected'],
    acceptance: ['Selected row is distinct. Cells do not overflow the table.'],
  },
  {
    id: 'inspector',
    tier: 'organism',
    renderer: 'renderBnInspector',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Section labels stay one line. Fields use the text-field atom.'],
  },
  {
    id: 'card-grid',
    tier: 'organism',
    renderer: 'renderBnCardGrid',
    variants: ['metric', 'widget'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Tiles in a row share one height.'],
  },
  {
    id: 'hero',
    tier: 'organism',
    renderer: 'renderBnHero',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth, 'Title stays one line. Actions use the button atom.'],
  },
  {
    id: 'footer',
    tier: 'organism',
    renderer: 'renderBnFooter',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Links stay one line.'],
  },
  {
    id: 'window',
    tier: 'organism',
    renderer: 'renderBnWindow',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: [...depth],
  },
  {
    id: 'form',
    tier: 'organism',
    renderer: 'renderBnForm',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Fields use the text-field atom. Submit uses the button atom.'],
  },
  {
    id: 'group',
    tier: 'organism',
    renderer: 'renderBnGroup',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Grouped surface, not a flat page band.'],
  },
  {
    id: 'empty-state',
    tier: 'organism',
    renderer: 'renderBnEmptyState',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Title stays one line. Description may wrap.'],
  },
  {
    id: 'widget',
    tier: 'organism',
    renderer: 'renderBnWidget',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Title stays one line.'],
  },
  {
    id: 'scroll',
    tier: 'organism',
    renderer: 'renderBnScroll',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Region scrolls on purpose. A custom scrollbar is a gap.'],
  },
  {
    id: 'image-well',
    tier: 'organism',
    renderer: 'renderBnImageWell',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Well keeps its label inside.'],
  },
  {
    id: 'input-accessory',
    tier: 'organism',
    renderer: 'renderBnInputAccessory',
    variants: ['default'],
    rendered: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
    acceptance: ['Keys stay one line.'],
  },
  {
    id: 'template-list',
    tier: 'template',
    renderer: 'templateList',
    variants: ['ios'],
    rendered: ['rest'],
    acceptance: ['Nav bar, search, grouped list, and tab bar are the existing organisms.'],
    note: 'No kit frame for the whole screen. The cell stays pending until one is measured.',
  },
  {
    id: 'template-window',
    tier: 'template',
    renderer: 'templateWindow',
    variants: ['macos'],
    rendered: ['rest'],
    acceptance: ['Window, toolbar, sidebar, and list are the existing organisms.'],
    note: 'No kit frame for the whole window. The cell stays pending until one is measured.',
  },
  {
    id: 'template-sheet',
    tier: 'template',
    renderer: 'templateSheet',
    variants: ['ios'],
    rendered: ['rest'],
    acceptance: ['Sheet, field, and prominent button are the existing organisms.'],
    note: 'No kit frame for the composed sheet. The cell stays pending until one is measured.',
  },
  {
    id: 'scrollbar',
    tier: 'gap',
    renderer: null,
    variants: ['native'],
    rendered: [],
    acceptance: ['Native scrollbar only. A designed scrollbar is not built.'],
    note: 'Puppertino lists scrollbars. The platform leaves them to the browser.',
  },
  {
    id: 'refraction',
    tier: 'gap',
    renderer: null,
    variants: ['shader'],
    rendered: [],
    acceptance: [
      'WebGL or SVG displacement refraction is not ported. Blur, saturation, and the specular edge are the translation.',
    ],
    note: 'Extra DOM for a filter would break the semantic-HTML axiom.',
  },
];

function referenceImage(theme, width, rendered) {
  if (!rendered) return null;
  return `tests/e2e/design-system.spec.js-snapshots/design-system-${theme}-${width}-linux.png`;
}

function verifiedKey(id, cell) {
  return [id, cell.variant, cell.state, cell.theme, cell.width].join('|');
}

function loadVerified() {
  try {
    const doc = JSON.parse(readFileSync(VERIFIED, 'utf8'));
    const keys = new Map();
    for (const cell of doc.cells || []) {
      keys.set(verifiedKey(cell.id, cell), cell.kit || null);
    }
    return keys;
  } catch {
    return new Map();
  }
}

export function buildCoverage() {
  const verified = loadVerified();
  const components = COMPONENTS.map((component) => {
    const cells = [];
    for (const variant of component.variants) {
      for (const state of STATES) {
        for (const theme of THEMES) {
          for (const width of WIDTHS) {
            const rendered = component.rendered.includes(state);
            const kit = verified.get(verifiedKey(component.id, { variant, state, theme, width }));
            const passed = rendered && kit;
            cells.push({
              variant,
              state,
              theme,
              width,
              status: passed ? 'pass' : rendered ? 'pending' : 'gap',
              referenceImage: passed ? kit : referenceImage(theme, width, rendered),
              acceptance: component.acceptance,
            });
          }
        }
      }
    }
    return {
      id: component.id,
      tier: component.tier,
      renderer: component.renderer,
      note: component.note ?? null,
      variants: component.variants,
      states: STATES,
      renderedStates: component.rendered,
      cells,
    };
  });
  const all = components.flatMap((component) => component.cells);
  const pending = all.filter((cell) => cell.status === 'pending').length;
  const gap = all.filter((cell) => cell.status === 'gap').length;
  const pass = all.filter((cell) => cell.status === 'pass').length;
  return {
    version: 1,
    themes: THEMES,
    widths: WIDTHS,
    states: STATES,
    summary: {
      components: components.length,
      cells: all.length,
      pass,
      pending,
      gap,
      verifiedPercent: all.length ? Math.round((pass / all.length) * 1000) / 10 : 0,
      renderedPercent: all.length ? Math.round(((pending + pass) / all.length) * 1000) / 10 : 0,
    },
    components,
  };
}

function main() {
  const json = `${JSON.stringify(buildCoverage(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const disk = readFileSync(OUT, 'utf8');
    if (disk !== json) {
      console.error(
        'design-system coverage.json is stale. Run node scripts/design-system-coverage.js',
      );
      process.exit(1);
    }
    const summary = JSON.parse(json).summary;
    console.log(
      `design-system coverage: ${summary.verifiedPercent}% verified, ${summary.renderedPercent}% rendered, ${summary.cells} cells`,
    );
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  const summary = JSON.parse(json).summary;
  console.log(`wrote ${OUT} (${summary.cells} cells, ${summary.renderedPercent}% rendered)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
