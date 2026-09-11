#!/usr/bin/env node
/**
 * Design-system linter. Fails the build.
 *
 *   node scripts/ds-lint.js                  lint; exit 1 on any new violation
 *   node scripts/ds-lint.js --report         lint and print every suppressed row too
 *   node scripts/ds-lint.js --update-baseline   re-record existing debt (reviewed in the diff)
 *
 * Wired into CI through scripts/project.json, which declares the Nx project
 * `basenative-design-system` with a `lint` target. `.github/workflows/ci.yml`
 * already runs `nx run-many --target=lint` across every project, so this fails
 * the build with no workflow, package.json or nx.json change.
 *
 * WHAT IT REFUSES TO REPEAT. .agents/ds-hardcoded.json reported 165 "hardcoded
 * design values"; 127 of them were not values at all — comment prose and
 * half-parsed CSS rules, because it matched regexes over raw text without ever
 * stripping comments, and two more were the `--bn-*` custom-property
 * declarations that *define* the token the value would be replaced by. So:
 *
 *   - comments are stripped before anything is matched (scripts/lib/css-model.js,
 *     which preserves offsets so spans still point at real source);
 *   - a value is only looked at inside a real declaration of a real rule;
 *   - custom-property declarations are never flagged — a token is not a
 *     violation of itself;
 *   - a value is only an error when a token with a byte-identical value exists
 *     AND that token belongs to the axis the property is on. That last clause is
 *     what makes the fix mechanical: `1rem` is both --bn-font-size-base and
 *     --bn-space-4, which the audit had to hand-wave as "do not sed these", but
 *     `gap: 1rem` can only mean --bn-space-4 and `font-size: 1rem` can only mean
 *     --bn-font-size-base. Values with no matching token are NOT errors — they
 *     need a token invented first, which is a design decision, not a cleanup.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanTags } from '../packages/validate/src/scan.js';
import { lineIndex, extractDefinitionSegments, isPlaceholder, resolveBridgedOffset } from './lib/template-markup.js';
import { stripComments, parseDeclarations, declaredAxes, varReferences } from './lib/css-model.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = join(ROOT, 'design-system.config.json');
const BASELINE_FILE = join(ROOT, 'design-system.baseline.json');

/* ------------------------------------------------------------------ rules */

export const RULES = {
  DS001: {
    id: 'DS001',
    name: 'no-hardcoded-color',
    what: 'a literal colour where a colour token declares the same value',
    tokenPrefixes: ['--bn-color-', '--bn-dark-', '--bn-shadow-', '--bn-focus-'],
    properties: [
      'color', 'background', 'background-color', 'border-color', 'outline-color',
      'fill', 'stroke', 'caret-color', 'accent-color', 'text-decoration-color',
      'column-rule-color', 'box-shadow', 'text-shadow',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      'border-block-color', 'border-inline-color',
      'border-inline-start-color', 'border-inline-end-color',
      'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
      'border-block', 'border-inline', 'border-inline-start', 'border-inline-end', 'outline',
    ],
    kinds: ['color'],
  },
  DS002: {
    id: 'DS002',
    name: 'no-hardcoded-spacing',
    what: 'a literal length on a spacing/sizing property where a spacing token declares the same value',
    tokenPrefixes: ['--bn-space-', '--bn-control-height', '--bn-target-size'],
    properties: [
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'margin-block', 'margin-inline', 'margin-block-start', 'margin-block-end',
      'margin-inline-start', 'margin-inline-end',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'padding-block', 'padding-inline', 'padding-block-start', 'padding-block-end',
      'padding-inline-start', 'padding-inline-end',
      'gap', 'row-gap', 'column-gap',
      'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'block-size', 'inline-size', 'min-block-size', 'min-inline-size',
    ],
    kinds: ['length'],
  },
  DS003: {
    id: 'DS003',
    name: 'no-hardcoded-radius',
    what: 'a literal length on a corner-radius property where a radius token declares the same value',
    tokenPrefixes: ['--bn-radius'],
    properties: [
      'border-radius', 'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-left-radius', 'border-bottom-right-radius',
      'border-start-start-radius', 'border-start-end-radius',
      'border-end-start-radius', 'border-end-end-radius',
    ],
    kinds: ['length'],
  },
  DS004: {
    id: 'DS004',
    name: 'no-hardcoded-type',
    what: 'a literal value on a typographic property where a type token declares the same value',
    tokenPrefixes: ['--bn-font-', '--bn-line-height', '--bn-letter-spacing'],
    properties: ['font-size', 'line-height', 'font-weight', 'letter-spacing', 'font-family', 'font'],
    kinds: ['length', 'number', 'fontstack'],
  },
  DS005: {
    id: 'DS005',
    name: 'no-hardcoded-border-width',
    what: 'a literal border/outline width where a border-width token declares the same value',
    tokenPrefixes: ['--bn-border-width'],
    properties: [
      'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width',
      'border-left-width', 'border-block-width', 'border-inline-width',
      'border-inline-start-width', 'border-inline-end-width', 'outline-width',
      'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
      'border-block', 'border-inline', 'border-inline-start', 'border-inline-end', 'outline',
    ],
    kinds: ['length'],
  },
  DS006: {
    id: 'DS006',
    name: 'no-undeclared-token-fallback',
    what: 'var(--bn-…, literal) naming a --bn-* custom property that nothing in this repo declares',
  },
  DS007: {
    id: 'DS007',
    name: 'no-inline-style-literal',
    what: 'a colour or length literal inside a style="…" attribute in a template',
  },
  DS000: {
    id: 'DS000',
    name: 'unused-allowance',
    what: 'a bn-allow annotation that suppresses nothing — a stale mute',
  },
};

// Properties whose lengths are layout arithmetic rather than design spacing.
const IGNORED_PROPERTIES = new Set([
  'transform', 'translate', 'content', 'grid-template-columns', 'grid-template-rows',
  'grid-template-areas', 'background-position', 'background-size', 'transition',
  'animation', 'stroke-dasharray', 'stroke-width', 'flex', 'flex-basis', 'zoom',
]);

/* --------------------------------------------------------------- discovery */

function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'templates') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.has(extname(e.name))) out.push(full);
  }
  return out;
}

const rel = (abs) => relative(ROOT, abs).split('\\').join('/');

/* ------------------------------------------------------------ value model */

/** Every design primitive in a value, with its offset inside that value. */
function primitives(value) {
  const out = [];
  // `var(--x, <fallback>)` is DS006's business, not DS001-005's: the literal
  // there is a fallback for a token, not a value written instead of one.
  const masked = maskVarCalls(value);

  for (const m of masked.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    out.push({ kind: 'color', text: m[0], offset: m.index });
  }
  for (const m of masked.matchAll(/\b(?:rgba?|hsla?|oklch|oklab|color-mix)\([^()]*\)/gi)) {
    out.push({ kind: 'color', text: m[0].replace(/\s+/g, ' '), offset: m.index });
  }
  for (const m of masked.matchAll(/(?<![\w.#-])(\d*\.?\d+)(px|rem|em)\b/g)) {
    if (Number(m[1]) === 0) continue; // `0` carries no design intent and has no token
    out.push({ kind: 'length', text: m[0], offset: m.index });
  }
  return out;
}

/** Blank out `var(...)` calls (keeping length) so their fallbacks are not double-reported. */
function maskVarCalls(value) {
  let out = value;
  let guard = 0;
  while (guard++ < 20) {
    const i = out.search(/\bvar\(/);
    if (i === -1) break;
    let depth = 0;
    let j = i + 3;
    for (; j < out.length; j++) {
      if (out[j] === '(') depth++;
      else if (out[j] === ')') { depth--; if (depth === 0) break; }
    }
    const end = Math.min(j + 1, out.length);
    out = out.slice(0, i) + ' '.repeat(end - i) + out.slice(end);
  }
  return out;
}

/* ------------------------------------------------------------ annotations */

const ALLOW_RE = /bn-allow:\s*([A-Z]{2}\d{3}(?:\s*,\s*[A-Z]{2}\d{3})*)\s*(?:[—–-]\s*(.*))?$/;

/**
 * The escape hatch. One annotation, one line, naming the rule and a reason:
 *
 *   \/* bn-allow: DS005 — 1px hairline predates the token; see ADR-0004 *\/
 *   border: 1px solid var(--bn-color-border);
 *
 * Deliberately awkward to use at scale: it must name the rule id (a blanket
 * `bn-allow` is rejected), it must carry a reason of at least 12 characters, it
 * covers exactly one line, and an annotation that suppresses nothing is itself a
 * DS000 failure so stale mutes cannot accumulate quietly. Every one that fires is
 * printed in the run summary, which is what makes "used rarely and reviewed"
 * checkable rather than aspirational.
 */
function collectAllowances(source, comments, toLineCol) {
  const byLine = new Map();
  const malformed = [];
  for (const c of comments) {
    const body = c.raw.replace(/^\/\*+/, '').replace(/\*+\/$/, '').replace(/^\/\//, '').trim();
    if (!/bn-allow/.test(body)) continue;
    const { line } = toLineCol(c.start);
    const m = body.match(ALLOW_RE);
    if (!m) {
      malformed.push({ line, text: body, why: 'expected `bn-allow: DS00X — reason`' });
      continue;
    }
    const reason = (m[2] ?? '').trim();
    if (reason.length < 12) {
      malformed.push({ line, text: body, why: 'reason must be at least 12 characters' });
      continue;
    }
    const ids = m[1].split(',').map((s) => s.trim());
    // One record, registered under both the annotation's own line and the line
    // below it, so it can sit either above a declaration or at the end of one —
    // and so a single use marks the single record used (two records would leave
    // one of them looking stale and fire DS000 against itself).
    const record = { ids, reason, line, used: false };
    for (const target of [line, line + 1]) {
      if (!byLine.has(target)) byLine.set(target, []);
      byLine.get(target).push(record);
    }
  }
  return { byLine, malformed };
}

function allowanceFor(allowances, line, ruleId) {
  for (const a of allowances.byLine.get(line) ?? []) {
    if (a.ids.includes(ruleId)) return a;
  }
  return null;
}

/* ----------------------------------------------------------------- tokens */

/** value -> [{ name, file, line }] for every `--*: value` declaration in the repo's CSS. */
function buildTokenTable(cssFiles) {
  const byValue = new Map();
  const declared = new Set();
  for (const { path, code, toLineCol } of cssFiles) {
    for (const d of parseDeclarations(code)) {
      if (!d.prop.startsWith('--')) continue;
      declared.add(d.prop);
      const value = d.value.replace(/\s+/g, ' ').trim();
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push({ name: d.prop, file: path, line: toLineCol(d.propOffset).line });
    }
  }
  return { byValue, declared };
}

function tokensFor(tokenTable, value, prefixes) {
  const all = tokenTable.byValue.get(value.replace(/\s+/g, ' ').trim()) ?? [];
  const matching = all.filter((t) => prefixes.some((p) => t.name.startsWith(p)));
  // Several aliases can carry the same value (--bn-color-accent-600 is
  // var(--bn-color-primary-600)); dedupe by name and keep source order.
  const seen = new Set();
  return matching.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
}

/* ------------------------------------------------------------------ rules */

function lintStylesheet(file, tokenTable, violations, stats) {
  const { path, source, code, comments, toLineCol } = file;
  const allowances = collectAllowances(source, comments, toLineCol);

  for (const bad of allowances.malformed) {
    violations.push({
      rule: 'DS000', file: path, line: bad.line, col: 1,
      message: `Malformed bn-allow annotation: ${bad.why}.`,
      fix: 'Write it as `/* bn-allow: DS005 — why this value cannot use the token */`, naming the rule and a reason of at least 12 characters.',
    });
  }

  for (const d of parseDeclarations(code)) {
    // Gate 3, first clause: a custom-property declaration DEFINES the token that
    // a violation elsewhere would be replaced by. It is never itself a violation.
    if (d.prop.startsWith('--')) continue;
    const prop = d.prop.toLowerCase();
    if (IGNORED_PROPERTIES.has(prop)) { stats.skippedProps++; continue; }

    const { line, col } = toLineCol(d.valueOffset);

    // DS006 — a var() whose token nothing declares. The fallback is then the
    // live value forever and the "token" is decoration.
    for (const ref of varReferences(d.value)) {
      if (!ref.name.startsWith('--bn-')) continue;
      if (tokenTable.declared.has(ref.name)) continue;
      const allow = allowanceFor(allowances, line, 'DS006');
      if (allow) { allow.used = true; stats.allowed.push({ rule: 'DS006', file: path, line, reason: allow.reason }); continue; }
      violations.push({
        rule: 'DS006', file: path, line, col,
        message: `\`${d.prop}\` reads var(${ref.name}${ref.fallback ? `, ${ref.fallback}` : ''}), but \`${ref.name}\` is never declared in any stylesheet in this repo, so the fallback is the only value this will ever have and the element cannot be themed.`,
        fix: ref.fallback
          ? `Either declare \`${ref.name}: ${ref.fallback};\` in packages/components/src/tokens.css so the var() resolves and the builder themes with everything else, or drop the wrapper — \`${d.prop}: ${d.value.replace(ref.raw, ref.fallback)};\` — to admit it is a literal.`
          : `Declare \`${ref.name}\` in packages/components/src/tokens.css, or replace this reference with a token that exists.`,
        key: `DS006|${path}|${ref.name}`,
      });
    }

    for (const ruleId of ['DS001', 'DS002', 'DS003', 'DS004', 'DS005']) {
      const rule = RULES[ruleId];
      if (!rule.properties.includes(prop)) continue;
      for (const prim of primitives(d.value)) {
        if (!rule.kinds.includes(prim.kind)) continue;
        const tokens = tokensFor(tokenTable, prim.text, rule.tokenPrefixes);
        if (!tokens.length) { stats.noTokenYet.push({ rule: ruleId, file: path, line, prop, value: prim.text }); continue; }
        const allow = allowanceFor(allowances, line, ruleId);
        if (allow) { allow.used = true; stats.allowed.push({ rule: ruleId, file: path, line, reason: allow.reason }); continue; }
        const names = tokens.map((t) => t.name);
        violations.push({
          rule: ruleId, file: path, line, col,
          message: `\`${d.prop}: ${d.value}\` hardcodes ${prim.text}; ${names.length === 1 ? `\`${names[0]}\` is declared as exactly that value` : `these tokens are declared as exactly that value: ${names.join(', ')}`}.`,
          fix: names.length === 1
            ? `Write \`${d.prop}: ${d.value.replace(prim.text, `var(${names[0]})`)};\``
            : `Pick the token that matches the intent and write \`${d.prop}: ${d.value.replace(prim.text, `var(${names[0]})`)};\` (candidates: ${names.join(', ')}).`,
          key: `${ruleId}|${path}|${prop}|${prim.text}`,
        });
      }
    }
  }

  // Report each distinct annotation once, not once per covered line.
  const seenAnnotations = new Set();
  for (const [, list] of allowances.byLine) {
    for (const a of list) {
      if (seenAnnotations.has(a)) continue;
      seenAnnotations.add(a);
      if (a.used) continue;
      violations.push({
        rule: 'DS000', file: path, line: a.line, col: 1,
        message: `bn-allow annotation for ${a.ids.join(', ')} suppresses nothing on this line or the next.`,
        fix: 'Delete the annotation — the value it covered is gone, or the rule no longer fires here.',
      });
    }
  }
}

/**
 * DS007 — inline style literals in templates.
 *
 * Axiom 2 of the project constitution is "zero inline styles"; a `style="…"`
 * carrying a colour or a length is the CSS-in-JS shape the audit found in
 * packages/visual-builder/src/bn-canvas.js and deliberately left uncounted
 * because it scoped its recount to .css files.
 */
function lintTemplateFile(abs, violations, stats) {
  const path = rel(abs);
  const source = readFileSync(abs, 'utf8');
  if (!source.includes('style=')) return;
  const toLineCol = lineIndex(source);
  const { comments } = stripJsComments(source);
  const allowances = collectAllowances(source, comments, toLineCol);

  for (const seg of extractDefinitionSegments(source)) {
    for (const tag of scanTags(seg.text)) {
      if (tag.closing) continue;
      const styleAttr = tag.attrs.find((a) => a.name === 'style' && a.value);
      if (!styleAttr) continue;
      const { line, col } = toLineCol(resolveBridgedOffset(seg, tag.offset));
      const found = primitives(styleAttr.value).filter((p) => !isPlaceholder(p.text));
      if (!found.length) continue;
      const allow = allowanceFor(allowances, line, 'DS007');
      if (allow) { allow.used = true; stats.allowed.push({ rule: 'DS007', file: path, line, reason: allow.reason }); continue; }
      violations.push({
        rule: 'DS007', file: path, line, col,
        message: `\`<${tag.tagName} style="${styleAttr.value.slice(0, 90)}">\` hardcodes ${found.map((p) => p.text).join(', ')} in an inline style.`,
        fix: `Move the declaration into a cascade layer keyed on a data-bn contract (packages/components/src/components.css) and give the element \`data-bn="…"\`, or bind the value through a --bn-* custom property instead of a literal.`,
        key: `DS007|${path}|${found.map((p) => p.text).sort().join(',')}`,
      });
    }
  }
}

/** Comment spans in a JS file, for annotation reading only. */
function stripJsComments(source) {
  const comments = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      const k = source.indexOf('\n', i);
      comments.push({ start: i, end: k === -1 ? n : k, raw: source.slice(i, k === -1 ? n : k) });
      i = k === -1 ? n : k;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const k = source.indexOf('*/', i + 2);
      const end = k === -1 ? n : k + 2;
      comments.push({ start: i, end, raw: source.slice(i, end) });
      i = end;
      continue;
    }
    i++;
  }
  return { comments };
}

/* ------------------------------------------------------- variant ceiling */

/**
 * Variant-ceiling enforcement.
 *
 * The MECHANISM is here; the NUMBER is not, deliberately — `variantCeiling` in
 * design-system.config.json ships as null and is the owner's single call. While
 * it is null this reports the current distribution and passes, so nothing is
 * blocked before the decision is made.
 *
 * Once it is a number, an axis declaring more values than the ceiling fails the
 * build, and there are exactly two ways to clear it:
 *
 *   1. remove values until the axis is at or under the ceiling, or
 *   2. write an ADR under docs/adr/ containing the grant line
 *      `bn-variant-exception: <contract>.<axis> = <count>`.
 *
 * The grant names a count, not a blank cheque: an axis that later grows past the
 * granted number fails again and needs the ADR revisited. That is what makes
 * "remove a variant or write an ADR" a real fork rather than a slogan.
 */
function checkVariantCeiling(cssFiles, config, violations) {
  const perAxis = new Map(); // `contract.axis` -> Set(values)
  const where = new Map();
  for (const { path, code } of cssFiles) {
    for (const a of declaredAxes(code)) {
      if (a.value === null || a.operator !== '=') continue;
      const key = `${a.contract}.${a.axis}`;
      if (!perAxis.has(key)) perAxis.set(key, new Set());
      perAxis.get(key).add(a.value);
      if (!where.has(key)) where.set(key, new Set());
      where.get(key).add(path);
    }
  }

  const ranked = [...perAxis]
    .map(([key, values]) => ({ key, count: values.size, values: [...values].sort(), files: [...where.get(key)].sort() }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const ceiling = config.variantCeiling;
  if (ceiling === null || ceiling === undefined) {
    return { ranked, ceiling: null, exceeded: [] };
  }

  const grants = readAdrGrants(join(ROOT, config.variantCeilingAdrDir ?? 'docs/adr'));
  const exceeded = [];
  for (const axis of ranked) {
    if (axis.count <= ceiling) continue;
    const granted = grants.get(axis.key);
    if (granted !== undefined && axis.count <= granted) continue;
    exceeded.push(axis);
    violations.push({
      rule: 'DS008',
      file: axis.files[0],
      line: 1,
      col: 1,
      message:
        `\`[data-bn="${axis.key.split('.')[0]}"][data-${axis.key.split('.').slice(1).join('.')}]\` declares ${axis.count} values, over the configured ceiling of ${ceiling}` +
        (granted === undefined ? '.' : `, and over the ${granted} granted by an ADR.`) +
        ` Values: ${axis.values.join(', ')}.`,
      fix:
        `Either remove ${axis.count - ceiling} value(s) from ${axis.files.join(', ')}, or record the exception: create ` +
        `${config.variantCeilingAdrDir ?? 'docs/adr'}/NNNN-${axis.key.replace(/\./g, '-')}-variant-ceiling.md containing the line ` +
        `\`bn-variant-exception: ${axis.key} = ${axis.count}\` and the reason the axis genuinely needs ${axis.count} values. ` +
        `The grant is for exactly ${axis.count}; growing the axis again fails until the ADR is revisited.`,
      key: `DS008|${axis.key}`,
    });
  }
  return { ranked, ceiling, exceeded };
}

function readAdrGrants(adrDir) {
  const grants = new Map();
  if (!existsSync(adrDir)) return grants;
  for (const abs of walk(adrDir, new Set(['.md']))) {
    const text = readFileSync(abs, 'utf8');
    for (const m of text.matchAll(/^\s*bn-variant-exception:\s*([\w-]+\.[\w-]+)\s*=\s*(\d+)\s*$/gm)) {
      grants.set(m[1], Number(m[2]));
    }
  }
  return grants;
}

/* ------------------------------------------------------------------- main */

/** Drop later entries whose key repeats, in place. */
function dedupe(list, keyOf) {
  const seen = new Set();
  let write = 0;
  for (let read = 0; read < list.length; read++) {
    const k = keyOf(list[read]);
    if (seen.has(k)) continue;
    seen.add(k);
    list[write++] = list[read];
  }
  list.length = write;
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return { variantCeiling: null };
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return { entries: [] };
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

function main() {
  const argv = process.argv.slice(2);
  const updateBaseline = argv.includes('--update-baseline');
  const report = argv.includes('--report');
  const config = loadConfig();

  const cssFiles = walk(join(ROOT, 'packages'), new Set(['.css']))
    .sort()
    .map((abs) => {
      const source = readFileSync(abs, 'utf8');
      const { code, comments } = stripComments(source);
      return { path: rel(abs), source, code, comments, toLineCol: lineIndex(source) };
    });

  const tokenTable = buildTokenTable(cssFiles);
  const violations = [];
  const stats = { allowed: [], noTokenYet: [], skippedProps: 0 };

  for (const file of cssFiles) lintStylesheet(file, tokenTable, violations, stats);

  const jsFiles = walk(join(ROOT, 'packages'), new Set(['.js', '.mjs']))
    .filter((f) => !f.includes('.test.'))
    .sort();
  for (const abs of jsFiles) lintTemplateFile(abs, violations, stats);

  const ceiling = checkVariantCeiling(cssFiles, config, violations);

  // `border-width: 0 2px 2px 0` contains the same primitive twice and yields the
  // same message at the same span twice. That is one thing to fix, so it counts
  // once — inflating the number with repeats of one edit would be the same kind
  // of dishonest arithmetic this linter exists to replace.
  dedupe(violations, (v) => `${v.rule}|${v.file}|${v.line}|${v.col}|${v.message}`);

  /* --- baseline ------------------------------------------------------- */

  // Debt is keyed by (rule, file, property, value) and COUNTED, not just listed.
  // A bare key set would let a second `padding: 0.75rem` slip into a file that
  // already had one — the grandfathering would quietly cover new work, which is
  // how baselines stop meaning anything. Counting makes the rule "this file may
  // not get worse".
  const counted = new Map();
  for (const v of violations) {
    if (!v.key) continue;
    counted.set(v.key, (counted.get(v.key) ?? 0) + 1);
  }

  if (updateBaseline) {
    const entries = Object.fromEntries([...counted].sort((a, b) => a[0].localeCompare(b[0])));
    writeFileSync(BASELINE_FILE, JSON.stringify({
      note:
        'Pre-existing design-system debt, counted so the rules can fail the build on anything NEW while the ' +
        'backlog is burned down. Every line here is a real violation, not a false positive — the numbers are ' +
        'occurrence counts, and a count going UP fails the build just as a new key does. Shrink this file; ' +
        'never grow it. Regenerate with `node scripts/ds-lint.js --update-baseline`.',
      generatedBy: 'scripts/ds-lint.js --update-baseline',
      keys: Object.keys(entries).length,
      occurrences: [...counted.values()].reduce((a, b) => a + b, 0),
      entries,
    }, null, 2) + '\n');
    console.log(`wrote ${rel(BASELINE_FILE)} (${Object.keys(entries).length} keys, ${[...counted.values()].reduce((a, b) => a + b, 0)} occurrences)`);
    return;
  }

  const baseline = loadBaseline().entries ?? {};
  const budget = new Map(Object.entries(baseline));
  const fresh = [];
  const known = [];
  for (const v of violations) {
    const left = v.key ? (budget.get(v.key) ?? 0) : 0;
    if (left > 0) {
      budget.set(v.key, left - 1);
      known.push(v);
    } else {
      fresh.push(v);
    }
  }
  const retired = [...budget].filter(([, left]) => left > 0);

  /* --- output --------------------------------------------------------- */

  const byRule = (list) => {
    const m = new Map();
    for (const v of list) m.set(v.rule, (m.get(v.rule) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };

  for (const v of fresh) {
    console.error(`${v.file}:${v.line}:${v.col}  ${v.rule} ${RULES[v.rule]?.name ?? ''}`);
    console.error(`  ${v.message}`);
    console.error(`  fix: ${v.fix}`);
  }

  console.log('');
  console.log(`design-system lint · ${cssFiles.length} stylesheets, ${jsFiles.length} template files`);
  console.log(`  real violations found:   ${violations.length}  [${byRule(violations).map(([r, n]) => `${r}:${n}`).join(' ')}]`);
  console.log(`  known debt (baselined):  ${known.length}`);
  console.log(`  NEW, failing this run:   ${fresh.length}`);
  if (retired.length) {
    const n = retired.reduce((a, [, left]) => a + left, 0);
    console.log(`  debt paid off since the baseline was recorded: ${n} — run \`node scripts/ds-lint.js --update-baseline\` to bank it.`);
  }
  console.log(`  suppressed by bn-allow:  ${stats.allowed.length}`);
  for (const a of stats.allowed) console.log(`    ${a.file}:${a.line}  ${a.rule} — ${a.reason}`);
  console.log(`  values with no token yet (reported, not failed): ${stats.noTokenYet.length}`);
  if (report) {
    const grouped = new Map();
    for (const n of stats.noTokenYet) {
      const k = `${n.rule} ${n.value}`;
      grouped.set(k, (grouped.get(k) ?? 0) + 1);
    }
    for (const [k, n] of [...grouped].sort((a, b) => b[1] - a[1])) console.log(`    ${k} ×${n}`);
  }

  console.log('');
  if (ceiling.ceiling === null) {
    console.log('variant ceiling: NOT SET (design-system.config.json -> "variantCeiling": null) — reporting only.');
    console.log('  largest declared axes:');
    for (const a of ceiling.ranked.slice(0, 10)) console.log(`    ${a.count.toString().padStart(3)}  ${a.key}`);
    console.log(`  ${ceiling.ranked.length} axes declared in total.`);
  } else {
    console.log(`variant ceiling: ${ceiling.ceiling} · ${ceiling.exceeded.length} axis/axes over it.`);
  }

  if (fresh.length) {
    console.error('');
    console.error(`design-system lint FAILED: ${fresh.length} violation(s) not in ${rel(BASELINE_FILE)}.`);
    console.error('Fix them, or — rarely, and reviewed — annotate the line with `/* bn-allow: DSxxx — reason */`.');
    process.exit(1);
  }
  console.log('');
  console.log('design-system lint passed.');
}

main();
