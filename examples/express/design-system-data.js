/**
 * The Design tokens section of /docs (formerly the /design-system page):
 * the data is parsed from the catalog's one token sheet
 * (packages/components/src/tokens.css) — the section documents the
 * tokens by reading them, so it cannot drift from the sheet it shows.
 * The sheet's structure: a bare :root block carries the light values;
 * :root[data-theme="dark"] carries the dark ones; every token is a
 * custom property whose name states its family.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { raw } from '@basenative/runtime/shared/escape';
import { renderTrinity } from './trinity.js';

const tokensCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../packages/components/src/tokens.css'),
  'utf8',
);

/**
 * Leaf declaration blocks with their selector: walk the sheet tracking
 * braces, and record each innermost rule's declarations. At-rules that
 * wrap rules (the dark media query) are contexts, not leaves.
 */
function leafBlocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const stack = [];
  let prelude = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      stack.push(prelude.trim());
      prelude = '';
      i += 1;
    } else if (ch === '}') {
      const selector = stack.pop();
      const body = prelude;
      prelude = '';
      i += 1;
      if (selector && !selector.startsWith('@') && body.includes('--')) {
        const props = {};
        for (const decl of body.split(';')) {
          const colon = decl.indexOf(':');
          if (colon < 0) continue;
          const name = decl.slice(0, colon).trim();
          if (name.startsWith('--')) props[name] = decl.slice(colon + 1).trim();
        }
        if (Object.keys(props).length) blocks.push({ selector, props });
      }
    } else {
      prelude += ch;
      i += 1;
    }
  }
  return blocks;
}

const blocks = leafBlocks(tokensCss);
const light = blocks.find((b) => b.selector === ':root')?.props ?? {};
const dark = blocks.find((b) => b.selector === ':root[data-theme="dark"]')?.props ?? {};

const entries = (props) => Object.entries(props).map(([name, value]) => ({ name, value }));
const family = (props, prefix, pred) =>
  entries(props).filter((e) => e.name.startsWith(prefix) && (!pred || pred(e.name)));

const ROLE_HEADS = [
  '--label',
  '--background',
  '--fill',
  '--separator',
  '--tint',
  '--danger',
  '--success',
  '--warning',
  '--on-',
  '--scrim',
  '--shadow',
  '--focus-ring',
];
const isRole = (name) =>
  ROLE_HEADS.some(
    (head) => name === head || name.startsWith(`${head}-`) || name.startsWith(head),
  ) && !name.startsWith('--system');

function tokenTable(caption, rows) {
  return raw(
    renderTrinity('table', {
      caption,
      columns: ['Token', 'Light', 'Dark'],
      rows: rows.map((row) => [row.name, row.light, row.dark ?? row.light]),
    }),
  );
}

export function getDesignSystemContext() {
  const roleRows = entries(light)
    .filter((e) => isRole(e.name))
    .map((e) => ({ ...e, light: e.value, dark: dark[e.name] }));

  const systemColors = family(light, '--system-').map((e) => ({
    ...e,
    dark: dark[e.name] ?? e.value,
  }));

  const materialNames = ['ultra-thin', 'thin', 'regular', 'thick'];
  const materialFacets = ['blur', 'saturate', 'tint', 'highlight', 'shadow'];
  const materialsTable = raw(
    renderTrinity('table', {
      caption: 'Materials — each glass grade is five facets over the same recipe',
      columns: ['Material', ...materialFacets],
      rows: materialNames.map((name) => [
        { text: name, header: true },
        ...materialFacets.map((facet) => light[`--material-${name}-${facet}`] ?? ''),
      ]),
    }),
  );

  // Type recipes: --text-<recipe>-<facet>, five facets per recipe. The
  // family facet is a full font stack; the fonts list below carries it.
  const recipeNames = [];
  for (const e of family(light, '--text-')) {
    const match = e.name.match(/^--text-(.+)-(size|leading|weight|tracking|family)$/);
    if (match && !recipeNames.includes(match[1])) recipeNames.push(match[1]);
  }
  const typeTable = raw(
    renderTrinity('table', {
      caption: 'Type recipes — size, leading, weight, and tracking per recipe',
      columns: ['Recipe', 'Size', 'Leading', 'Weight', 'Tracking'],
      rows: recipeNames.map((name) => [
        { text: name, header: true },
        ...['size', 'leading', 'weight', 'tracking'].map(
          (facet) => light[`--text-${name}-${facet}`] ?? '',
        ),
      ]),
    }),
  );
  const fonts = family(light, '--font-');

  const scaleGroups = [
    { title: 'Space', prefix: '--spacing-', pred: (name) => /^--spacing-\d+$/.test(name) },
    { title: 'Radius', prefix: '--size-radius-' },
    { title: 'Size', prefix: '--size-', pred: (name) => !name.startsWith('--size-radius') },
    { title: 'Motion', prefix: '--motion-' },
    { title: 'Layer', prefix: '--layer-' },
  ];
  const scaleTables = scaleGroups.map((group) => ({
    title: group.title,
    table: raw(
      renderTrinity('table', {
        caption: `${group.title} tokens`,
        columns: ['Token', 'Value'],
        rows: family(light, group.prefix, group.pred).map((e) => [e.name, e.value]),
      }),
    ),
  }));

  const radiusSteps = family(light, '--size-radius-');
  const ladderCss = raw(
    [
      ...systemColors.map((c) => `[data-bn-swatch="${c.name}"]{background:var(${c.name})}`),
      ...radiusSteps.map(
        (step) =>
          `[data-bn-radius="${step.name}"]{border-radius:var(${step.name});background:var(--color-tint)}`,
      ),
    ].join(''),
  );

  return {
    radiusSteps,
    ladderCss,
    rolesTable: tokenTable('Color and surface roles — the names components consume', roleRows),
    roleCount: roleRows.length,
    systemColors,
    materialsTable,
    typeTable,
    fonts,
    scaleTables,
    tokenCount: Object.keys(light).length,
  };
}
