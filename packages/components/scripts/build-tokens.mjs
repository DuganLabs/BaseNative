/**
 * build-tokens.mjs — generate src/tokens.css from the DTCG token source.
 *
 * The token system lives in tokens/ as DTCG-format JSON ($value/$type, with
 * the CTI+ taxonomy in $extensions). Style Dictionary renders it into the
 * single CSS custom-properties sheet the components consume. The generated
 * file is committed; tokens-drift.test.js proves regeneration is
 * byte-identical.
 *
 * Layout of the generated sheet (mirrors the hand-written sheets it
 * replaces): unlayered trinity tokens first (:root, dark modes, forced
 * light, reduced motion), then the legacy token set inside @layer tokens
 * (base, density blocks, dark modes).
 *
 * Run: node scripts/build-tokens.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(ROOT, 'tokens');
export const TOKENS_CSS_PATH = join(ROOT, 'src', 'tokens.css');

const BASE_FILES = [
  'palette.json', 'color.json', 'font.json', 'size.json', 'spacing.json',
  'shadow.json', 'motion.json', 'material.json', 'layer.json',
  'number.json', 'keyword.json',
];
const DENSITIES = ['compact', 'default', 'spacious'];

const isLeaf = (n) => n !== null && typeof n === 'object' && '$value' in n;

function mergeInto(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (isLeaf(v) || v === null || typeof v !== 'object' || Array.isArray(v)) target[k] = v;
    else target[k] = mergeInto(target[k] ?? {}, v);
  }
  return target;
}

function leafPaths(tree, prefix = [], out = new Map()) {
  for (const [k, v] of Object.entries(tree)) {
    if (isLeaf(v)) out.set([...prefix, k].join('.'), v);
    else leafPaths(v, [...prefix, k], out);
  }
  return out;
}

const systemOf = (leaf) => leaf?.$extensions?.['com.basenative']?.system;
const pathsWhere = (leafMap, pred) =>
  new Set([...leafMap.entries()].filter(([, leaf]) => pred(leaf)).map(([p]) => p));

async function loadJson(rel) {
  return JSON.parse(await readFile(join(TOKENS_DIR, rel), 'utf8'));
}

/** Render one section's declaration lines (no selector wrapper). */
async function renderSection(tokens, pathSet) {
  const sd = new StyleDictionary({
    tokens,
    platforms: {
      css: {
        transforms: ['name/kebab'],
        files: [{
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
          filter: (token) => pathSet.has(token.path.join('.')),
        }],
      },
    },
    log: { verbosity: 'silent' },
  });
  const [result] = await sd.formatPlatform('css');
  const body = result.output.replace(/^\/\*\*[\s\S]*?\*\//, '').trim();
  const inner = body.replace(/^:root\s*\{\n?/, '').replace(/\}\s*$/, '').trim();
  return inner.split('\n').map((line) => line.replace(/^ {2}/, ''));
}

const block = (selector, lines, depth) => {
  if (!lines.length) return '';
  const pad = '  '.repeat(depth);
  const innerPad = '  '.repeat(depth + 1);
  return `${pad}${selector} {\n${lines.map((l) => innerPad + l).join('\n')}\n${pad}}`;
};

export async function buildTokensCss() {
  const base = {};
  for (const f of BASE_FILES) mergeInto(base, await loadJson(f));
  const compFiles = (await readdir(join(TOKENS_DIR, 'components')))
    .filter((f) => f.endsWith('.json')).sort();
  for (const f of compFiles) mergeInto(base, await loadJson(join('components', f)));

  const dark = await loadJson('modes/dark.json');
  const reduced = await loadJson('modes/reduced-motion.json');
  const densities = {};
  for (const d of DENSITIES) densities[d] = await loadJson(`density/${d}.json`);

  const baseLeaves = leafPaths(base);
  const darkLeaves = leafPaths(dark);
  const withOverrides = (over) => mergeInto(structuredClone(base), over);

  // Density tokens live only in their density blocks (as in the old sheet);
  // the default-density block also targets :root, carrying the base value.
  const densityPaths = new Set();
  for (const tree of Object.values(densities)) {
    for (const p of leafPaths(tree).keys()) densityPaths.add(p);
  }
  const legacyBasePaths = pathsWhere(baseLeaves, (l) => systemOf(l) === 'legacy');
  for (const p of densityPaths) legacyBasePaths.delete(p);

  const trinityBase = await renderSection(base, pathsWhere(baseLeaves, (l) => systemOf(l) === 'trinity'));
  const legacyBase = await renderSection(base, legacyBasePaths);
  const trinityDark = await renderSection(withOverrides(dark), pathsWhere(darkLeaves, (l) => systemOf(l) === 'trinity'));
  const legacyDark = await renderSection(withOverrides(dark), pathsWhere(darkLeaves, (l) => systemOf(l) === 'legacy'));
  const forcedLight = await renderSection(base, pathsWhere(darkLeaves, (l) => systemOf(l) === 'trinity'));
  const reducedLines = await renderSection(withOverrides(reduced), new Set(leafPaths(reduced).keys()));
  const densityLines = {};
  for (const d of DENSITIES) {
    densityLines[d] = await renderSection(withOverrides(densities[d]), new Set(leafPaths(densities[d]).keys()));
  }

  const parts = [
    `/**
 * GENERATED by scripts/build-tokens.mjs from the DTCG token source in
 * tokens/ — do not edit directly. Edit the token JSON, then run:
 *   node scripts/build-tokens.mjs
 * Names follow the CTI+ taxonomy (Category–Type–Item–Variant–Subitem–State):
 * category first, no prefixes, parts addressed as multi-word items.
 */`,
    block(':root', trinityBase, 0),
    '',
    '@media (prefers-color-scheme: dark) {',
    block(':root:not([data-theme="light"])', ['color-scheme: dark;', ...trinityDark], 1),
    '}',
    '',
    block(':root[data-theme="dark"]', ['color-scheme: dark;', ...trinityDark], 0),
    '',
    '@media (prefers-color-scheme: dark) {',
    block(':root[data-theme="light"]', ['color-scheme: light;', ...forcedLight], 1),
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    block(':root', reducedLines, 1),
    '}',
    '',
    '@layer tokens {',
    block(':root', legacyBase, 1),
    '',
    block('[data-density="compact"]', densityLines.compact, 1),
    '',
    block(':root, [data-density="default"]', densityLines.default, 1),
    '',
    block('[data-density="spacious"]', densityLines.spacious, 1),
    '',
    '  @media (prefers-color-scheme: dark) {',
    block(':root:not([data-theme="light"])', legacyDark, 2),
    '  }',
    '',
    block('[data-theme="dark"]', legacyDark, 1),
    '}',
  ];
  return parts.filter((p) => p !== null).join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = await buildTokensCss();
  await writeFile(TOKENS_CSS_PATH, css);
  console.log(`wrote ${TOKENS_CSS_PATH} (${css.length} bytes)`);
}
