#!/usr/bin/env node
/**
 * Fails when packages/platform/src/components.css declares a raw colour
 * or a raw length. Those values belong in @layer tokens (materials.css
 * or the generated tokens.css). Custom-property definitions are the
 * tokens, so they are not violations.
 *
 * Media-query bounds stay literal: var() is not valid in a classic
 * @media condition. The walker only sees declarations.
 *
 *   node scripts/platform-token-lint.js           fail on any raw value
 *   node scripts/platform-token-lint.js --apply   move raw values into materials.css
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments, parseDeclarations } from './lib/css-model.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = join(ROOT, 'packages/platform/src/components.css');
const SHELL = join(ROOT, 'examples/express/public/platform-shell.css');
const MATERIALS = join(ROOT, 'packages/platform/src/materials.css');
const BEGIN = '/* BEGIN METRICS */';
const END = '/* END METRICS */';

const COLOR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const LENGTH = /(?<![\w.-])(-?(?:\d+\.\d+|\d+|\.\d+))(px|rem|em)\b/g;

function prefixFor(prop, kind) {
  if (kind === 'color') return 'bn-plat-swatch';
  if (prop.includes('radius')) return 'bn-plat-radius';
  if (prop === 'font-size' || prop === 'line-height' || prop === 'letter-spacing') return 'bn-type';
  if (prop === 'filter' || prop === 'backdrop-filter' || prop.includes('blur')) return 'bn-blur';
  return 'bn-len';
}

function tokenName(prefix, raw) {
  if (prefix === 'bn-color') {
    const slug = raw
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/\./g, '_');
    return `--${prefix}-${slug}`;
  }
  const match = /^(-?)(\d+(?:\.\d+)?)(px|rem|em)$/.exec(raw);
  const sign = match[1] === '-' ? 'neg-' : '';
  const num = match[2].replace('.', '_');
  const unit = match[3] === 'px' ? '' : match[3];
  return `--${prefix}-${sign}${num}${unit}`;
}

function isZeroLength(raw) {
  return /^-?0+(?:\.0+)?(?:px|rem|em)$/.test(raw);
}

/**
 * @param {string} css
 * @returns {{ prop: string, raw: string, name: string, index: number, line: number }[]}
 */
export function findViolations(css) {
  const stripped = stripComments(css).code;
  const decls = parseDeclarations(stripped);
  const found = [];
  for (const decl of decls) {
    if (decl.prop.startsWith('--')) continue;
    const kinds = [
      ['color', COLOR],
      ['length', LENGTH],
    ];
    for (const [kind, re] of kinds) {
      re.lastIndex = 0;
      let match = re.exec(decl.value);
      while (match) {
        const raw = match[0];
        if (!(kind === 'length' && isZeroLength(raw))) {
          const line = css.slice(0, decl.valueOffset + match.index).split('\n').length;
          found.push({
            prop: decl.prop,
            raw,
            name: tokenName(prefixFor(decl.prop, kind), raw),
            index: decl.valueOffset + match.index,
            line,
          });
        }
        match = re.exec(decl.value);
      }
    }
  }
  found.sort((a, b) => a.index - b.index);
  return found;
}

function apply(css, violations) {
  const tokens = new Map();
  for (const hit of violations) tokens.set(hit.name, hit.raw);
  let next = css;
  for (const hit of [...violations].sort((a, b) => b.index - a.index)) {
    next = next.slice(0, hit.index) + `var(${hit.name})` + next.slice(hit.index + hit.raw.length);
  }
  return { css: next, tokens };
}

function metricsMap(materials) {
  const start = materials.indexOf(BEGIN);
  const end = materials.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('materials.css is missing the BEGIN/END METRICS markers');
  }
  const map = new Map();
  for (const line of materials.slice(start + BEGIN.length, end).split('\n')) {
    const declared = /^\s*(--bn-[A-Za-z0-9_-]+):\s*(.+);$/.exec(line);
    if (declared) map.set(declared[1], declared[2]);
  }
  return { start, end, map };
}

function writeMetrics(tokens) {
  const materials = readFileSync(MATERIALS, 'utf8');
  const { start, end, map } = metricsMap(materials);
  for (const [name, raw] of tokens) map.set(name, raw);
  const body = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, raw]) => `    ${name}: ${raw};`)
    .join('\n');
  const block = body ? `${BEGIN}\n${body}\n    ${END}` : `${BEGIN}\n    ${END}`;
  writeFileSync(MATERIALS, materials.slice(0, start) + block + materials.slice(end + END.length));
}

function stripVars(value) {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    if (value.startsWith('var(', i)) {
      let depth = 0;
      for (; i < value.length; i += 1) {
        if (value[i] === '(') depth += 1;
        else if (value[i] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      continue;
    }
    out += value[i];
  }
  return out;
}

/**
 * Organisms use the elevation scale in materials.css. A raw box-shadow,
 * border-radius, or z-index outside that token file is a violation.
 * `none` and `0` are resets. Fallbacks inside var() stay, because the
 * inlined shell has to lay out when the token sheet is stale.
 */
export function findElevationViolations(css) {
  const stripped = stripComments(css).code;
  const found = [];
  for (const decl of parseDeclarations(stripped)) {
    if (decl.prop.startsWith('--')) continue;
    if (!['box-shadow', 'border-radius', 'z-index'].includes(decl.prop)) continue;
    const bare = stripVars(decl.value)
      .replace(/\b0(?:\.0+)?(?:px)?\b/g, '')
      .replace(/\b(?:inset|none)\b/g, '');
    if (!/[\d%#]|rgba?\(|hsla?\(/.test(bare)) continue;
    {
      const line = css.slice(0, decl.valueOffset).split('\n').length;
      found.push({ prop: decl.prop, raw: decl.value.trim(), line });
    }
  }
  return found;
}

function main() {
  const css = readFileSync(COMPONENTS, 'utf8');
  const violations = findViolations(css);
  if (process.argv.includes('--apply')) {
    if (violations.length === 0) {
      console.log('platform-token-lint: nothing to move');
      return;
    }
    const { css: next, tokens } = apply(css, violations);
    writeFileSync(COMPONENTS, next);
    writeMetrics(tokens);
    const left = findViolations(readFileSync(COMPONENTS, 'utf8'));
    if (left.length) {
      console.error(`platform-token-lint: ${left.length} raw values remain after --apply`);
      process.exit(1);
    }
    console.log(`platform-token-lint: moved ${tokens.size} tokens`);
    return;
  }
  const elevation = [COMPONENTS, SHELL].flatMap((file) =>
    findElevationViolations(readFileSync(file, 'utf8')).map((hit) => ({ file, ...hit })),
  );
  if (violations.length === 0 && elevation.length === 0) {
    console.log('platform-token-lint: components.css has no raw colour or length');
    return;
  }
  if (elevation.length) {
    console.error(`platform-token-lint: ${elevation.length} raw elevation values`);
    for (const hit of elevation.slice(0, 40)) {
      console.error(`  ${hit.file}:${hit.line}: ${hit.prop}: ${hit.raw}`);
    }
  }
  if (violations.length) {
    console.error(`platform-token-lint: ${violations.length} raw values in components.css`);
    for (const hit of violations.slice(0, 40)) {
      console.error(`  ${hit.line}: ${hit.prop}: ${hit.raw} → ${hit.name}`);
    }
    if (violations.length > 40) console.error(`  … ${violations.length - 40} more`);
  }
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
