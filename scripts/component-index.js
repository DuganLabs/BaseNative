/**
 * Component index — generated from source, never hand-maintained.
 *
 * Two outputs, one extraction, run in the same pass as llms-full.txt (see
 * scripts/llms-txt.js, which owns the package/export walk and calls in here):
 *
 *   .agents/component-index.json  the machine contract (a `ds-guard` skill reads this)
 *   .agents/component-index.md    a token-budgeted human/model-readable form
 *
 * Both are covered by `node scripts/llms-txt.js --check`, which CI already runs,
 * so the index cannot drift from source without failing the build.
 *
 * WHAT IS DERIVED FROM WHAT
 *
 *   name / package / file / signature   package.json exports + the declaring file
 *   purpose                             the function's own JSDoc first paragraph
 *   emits.rootTag / emits.contracts     `scanTags` over the function's OWN body
 *   variants                            the CSS that actually declares them, i.e.
 *                                       `[data-bn="badge"][data-variant="…"]` rules,
 *                                       NOT a docstring — so the index says what
 *                                       will really render
 *   axesEmittedWithoutRules             an axis the renderer writes into the DOM
 *                                       that no stylesheet reads (renderCard's
 *                                       `data-variant` is the live example)
 *   useInsteadOf                        composed from the root tag and contract
 *
 * Two deliberate departures from .agents/ds-definitions.json, both of which the
 * design-system audit showed to be wrong there:
 *
 *   1. Contracts are attributed PER FUNCTION, not per file. progress.js exports
 *      renderProgress and renderSpinner; a per-file aggregate gives each of them
 *      the other's contract.
 *   2. Variant values come from selectors parsed compound-by-compound with
 *      `:is(…)` expansion, so `[data-status="in_progress"]` and the 23-value
 *      pipeline status block are present rather than silently dropped.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

import { scanTags } from '../packages/validate/src/scan.js';
import {
  nonCodeRanges,
  isInRanges,
  extractDefinitionSegments,
  findStringLiterals,
  isPlaceholder,
} from './lib/template-markup.js';
import { stripComments, declaredAxes, declaredContracts } from './lib/css-model.js';

// `render*` exports that match the naming convention but are not BaseNative UI
// components in the data-bn sense. Kept identical to scripts/component-usage.js
// so the two tools agree on the population.
const EXCLUDE_RENDER_FNS = new Set(['renderPng']);

/** Hard ceiling on the markdown form, in estimated tokens. Generation fails above it. */
export const MARKDOWN_TOKEN_BUDGET = 12000;

const MAX_PURPOSE_CHARS = 110;

/* ------------------------------------------------------------- source utils */

function truncate(str, max) {
  if (!str) return '';
  const clean = String(str).replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '\u2026' : clean;
}

function relFile(root, abs) {
  return relative(root, abs).split('\\').join('/');
}

/** Balance `open`/`close` from `from`, ignoring anything inside a string or comment. */
function balanceFrom(source, from, open, close, nonCode) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (isInRanges(nonCode, i)) continue;
    const c = source[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function nextCodeIndexOf(source, ch, from, nonCode) {
  for (let i = from; i < source.length; i++) {
    if (isInRanges(nonCode, i)) continue;
    if (source[i] === ch) return i;
  }
  return -1;
}

/**
 * The exact source span of one exported declaration — the whole point being that
 * `renderProgress` must not be able to see `renderSpinner`'s markup. Returns null
 * when the shape isn't one this can bound exactly, which is reported as an
 * extraction gap rather than guessed at.
 */
function declarationSpan(source, name, nonCode) {
  // `export function f(){}` and the bare `function f(){} … export { f };` shape
  // (packages/builder/src/palette-element.js) are the same declaration to us.
  const fnRe = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`, 'g');
  let m;
  while ((m = fnRe.exec(source))) {
    if (isInRanges(nonCode, m.index)) continue;
    const openParen = m.index + m[0].length - 1;
    const closeParen = balanceFrom(source, openParen, '(', ')', nonCode);
    if (closeParen === -1) return null;
    const openBrace = nextCodeIndexOf(source, '{', closeParen + 1, nonCode);
    if (openBrace === -1) return null;
    const closeBrace = balanceFrom(source, openBrace, '{', '}', nonCode);
    if (closeBrace === -1) return null;
    return { start: m.index, end: closeBrace + 1, params: source.slice(openParen + 1, closeParen) };
  }

  const constRe = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=`, 'g');
  while ((m = constRe.exec(source))) {
    if (isInRanges(nonCode, m.index)) continue;
    const valueStart = m.index + m[0].length;
    const arrowBrace = nextCodeIndexOf(source, '{', valueStart, nonCode);
    const semi = nextCodeIndexOf(source, ';', valueStart, nonCode);
    if (arrowBrace !== -1 && (semi === -1 || arrowBrace < semi)) {
      const closeBrace = balanceFrom(source, arrowBrace, '{', '}', nonCode);
      if (closeBrace !== -1) return { start: m.index, end: closeBrace + 1, params: '' };
    }
    if (semi !== -1) return { start: m.index, end: semi + 1, params: '' };
  }
  return null;
}

/** The JSDoc block immediately preceding `index`, raw. */
function jsdocRawBefore(source, index) {
  const before = source.slice(0, index);
  const blocks = [...before.matchAll(/\/\*\*[\s\S]*?\*\//g)];
  if (!blocks.length) return '';
  const last = blocks[blocks.length - 1];
  if (!/^\s*$/.test(before.slice(last.index + last[0].length))) return '';
  return last[0];
}

/* ------------------------------------------------- markup contract extraction */

/** `renderPipelineBlock` -> `pipeline-block`; used to pick the primary contract. */
function kebabOfRenderer(name) {
  return name.replace(/^render/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * What this function's own body emits: every literal `data-bn` contract with the
 * element tag that carries it, and every `data-*` axis the renderer can write.
 *
 * Axes are collected two ways, because one is not enough. Attributes on a
 * complete tag come from `scanTags`. But a conditional attribute is emitted as a
 * whole-attribute interpolation —
 *
 *     const statusAttr = status ? ` data-status="${escapeAttr(status)}"` : '';
 *
 * — so the name `data-status` never appears inside any tag and `scanTags` cannot
 * see it. Those are picked up by a literal scan for ` data-x="` over the same
 * bridged segments. Collecting them at the function level rather than per
 * contract is the honest resolution: the source genuinely does not say which of
 * the function's elements the attribute lands on.
 */
function emittedMarkup(bodyText) {
  const contracts = [];
  const tagOfContract = new Map();
  const axes = new Set();
  let firstTag = null;

  const segments = extractDefinitionSegments(bodyText);
  for (const seg of segments) {
    // A renderer may assemble one element out of two template literals:
    //
    //   const wrapperStart = `<span data-bn="avatar" data-size="${size}"`;
    //   return `${wrapperStart}><img data-bn="avatar-img"></span>`;
    //
    // The first literal has no `>` anywhere, so the tokenizer — correctly —
    // reports no tag, and `avatar` looks like it has no contract and two inert
    // axes. Terminating a trailing unterminated tag with a single `>` and
    // re-tokenizing recovers it. Every character of the recovered tag except
    // that `>` is literal source text, and the recovery only runs when the
    // segment really does end mid-tag, so it cannot merge two tags or invent one.
    const scanned = [...scanTags(seg.text)];
    const lastLt = seg.text.lastIndexOf('<');
    if (lastLt !== -1 && seg.text.indexOf('>', lastLt) === -1) {
      for (const tag of scanTags(seg.text.slice(lastLt) + '>')) scanned.push(tag);
    }
    for (const tag of scanned) {
      if (tag.closing) continue;
      if (!firstTag && !isPlaceholder(tag.tagName)) firstTag = tag.tagName;
      for (const a of tag.attrs) {
        if (a.name.startsWith('data-') && a.name !== 'data-bn' && !a.name.startsWith('data-bn-')) {
          axes.add(a.name.slice('data-'.length));
        }
      }
      const bn = tag.attrs.find((a) => a.name === 'data-bn' && a.value && !isPlaceholder(a.value));
      if (!bn) continue;
      if (!contracts.includes(bn.value)) {
        contracts.push(bn.value);
        if (!isPlaceholder(tag.tagName)) tagOfContract.set(bn.value, tag.tagName);
      }
    }
    for (const m of seg.text.matchAll(/\bdata-([a-z0-9-]+)\s*=/gi)) {
      const axis = m[1].toLowerCase();
      if (axis === 'bn' || axis.startsWith('bn-')) continue;
      axes.add(axis);
    }
  }
  return { firstTag, contracts, tagOfContract, axes, segments };
}

// HTML void elements never have a close tag, so a depth counter that does not
// know them reads `<img>` as "still open" and every later close pops the wrong
// frame. Standard list, not a guess.
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Which of a function's several `data-bn` contracts is the one the component IS,
 * as opposed to a part of it.
 *
 * Source order is not the answer. `renderPackageCard` builds `pkg-tags` and
 * `pkg-stats` into local variables before its `return`, so the first contract in
 * the file is a fragment and the outer `pkg-card` comes last. Nor is last order:
 * `renderCard` appends `card-header`, `card-body` and `card-footer` to an
 * `<article data-bn="card">` opened first, so the last contract is a fragment too.
 *
 * What separates them is containment, so that is what this measures: concatenate
 * the body's static segments in source order — roughly what the function emits at
 * runtime — and count how many elements each contract's element encloses.
 *
 * The concatenation is used ONLY to rank contracts that per-segment tokenizing
 * already found. It never contributes a contract of its own, so a segment join
 * that happens to splice two unrelated tags can at worst pick a different real
 * contract; it cannot invent one.
 */
function rankContracts(segments, contracts) {
  if (contracts.length <= 1) return contracts[0] ?? null;
  const combined = segments.map((s) => s.text).join('');
  const known = new Set(contracts);
  const stack = [];
  const score = new Map();

  for (const tag of scanTags(combined)) {
    if (tag.closing) {
      const i = stack.map((f) => f.tagName).lastIndexOf(tag.tagName);
      if (i !== -1) stack.length = i;
      continue;
    }
    for (const frame of stack) {
      if (frame.contract) score.set(frame.contract, (score.get(frame.contract) ?? 0) + 1);
    }
    if (VOID_ELEMENTS.has(tag.tagName) || tag.raw.endsWith('/>')) continue;
    const bn = tag.attrs.find((a) => a.name === 'data-bn' && known.has(a.value));
    stack.push({ tagName: tag.tagName, contract: bn ? bn.value : null });
  }

  let best = contracts[0];
  for (const c of contracts) {
    if ((score.get(c) ?? 0) > (score.get(best) ?? 0)) best = c;
  }
  return best;
}

/** Compact `{ a, b = 1, c: { d } }` down to `{ a, b, c }`, capped. */
function compactParams(params, maxNames = 7) {
  const text = (params ?? '').trim();
  if (!text) return '';
  const inner = text.startsWith('{') ? text.slice(1, text.lastIndexOf('}')) : text;
  const names = [];
  let depth = 0;
  let buf = '';
  const push = () => {
    const piece = buf.trim();
    buf = '';
    if (!piece) return;
    const m = piece.match(/^\.{3}\s*([A-Za-z_$][\w$]*)/) || piece.match(/^([A-Za-z_$][\w$]*)/);
    if (m) names.push(piece.startsWith('...') ? `...${m[1]}` : m[1]);
  };
  for (const c of inner) {
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { push(); continue; }
    buf += c;
  }
  push();
  const shown = names.slice(0, maxNames);
  const suffix = names.length > maxNames ? `, …+${names.length - maxNames}` : '';
  const body = shown.join(', ') + suffix;
  return text.startsWith('{') ? `{ ${body} }` : body;
}

/* --------------------------------------------------------------- stylesheets */

function walkFiles(dir, ext, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, ext, out);
    else if (extname(e.name) === ext) out.push(full);
  }
  return out;
}

/**
 * A JS template literal that is really a stylesheet.
 *
 * `@basenative/marketplace` ships its CSS as `packageCardStyles()` returning a
 * template literal, not as a `.css` file. Looking only at `.css` files reports
 * `renderPackageCard` as having no styling at all, which is both false and
 * exactly the sort of wrong answer a ds-guard skill would act on.
 *
 * The test is a selector-then-block shape — `[data-bn="x"]` followed later by a
 * `{` — which markup never has, since an attribute selector in template text
 * would be inside a tag and a `{` would close it. Anything that fails the test is
 * left alone rather than parsed hopefully.
 */
function embeddedStylesheets(root) {
  const out = [];
  for (const file of walkFiles(join(root, 'packages'), '.js')) {
    if (file.includes('.test.') || file.includes('/templates/')) continue;
    const src = readFileSync(file, 'utf8');
    if (!src.includes('[data-bn=')) continue;
    const { templates } = findStringLiterals(src);
    for (const t of templates) {
      const text = src.slice(t.start, t.end);
      const sel = text.indexOf('[data-bn=');
      if (sel === -1) continue;
      if (text.indexOf('{', sel) === -1) continue;
      out.push({ rel: relFile(root, file), text });
    }
  }
  return out;
}

/**
 * Read every stylesheet the repo ships and return the full declared-axis model:
 * contract -> axis -> { values, openPatterns, presenceOnly, files }.
 */
function buildCssModel(root) {
  const cssFiles = walkFiles(join(root, 'packages'), '.css').sort();
  const sheets = cssFiles
    .map((f) => ({ rel: relFile(root, f), text: readFileSync(f, 'utf8') }))
    .concat(embeddedStylesheets(root).sort((a, b) => a.rel.localeCompare(b.rel)));
  const files = [...new Set(sheets.map((s) => s.rel))];
  const model = new Map();   // contract -> Map(axis -> record)
  const contracts = new Map(); // contract -> Set(file)

  for (const sheet of sheets) {
    const rel = sheet.rel;
    const { code } = stripComments(sheet.text);
    for (const c of declaredContracts(code)) {
      if (!contracts.has(c)) contracts.set(c, new Set());
      contracts.get(c).add(rel);
    }
    for (const a of declaredAxes(code)) {
      if (!model.has(a.contract)) model.set(a.contract, new Map());
      const axesForContract = model.get(a.contract);
      if (!axesForContract.has(a.axis)) {
        axesForContract.set(a.axis, { values: new Set(), openPatterns: new Set(), presenceOnly: false, files: new Set() });
      }
      const rec = axesForContract.get(a.axis);
      rec.files.add(rel);
      if (a.value === null) rec.presenceOnly = true;
      else if (a.operator === '=') rec.values.add(a.value);
      else rec.openPatterns.add(`${a.operator}"${a.value}"`);
    }
  }
  return { files, model, contracts };
}

/* ----------------------------------------------------------- custom elements */

/**
 * Every `customElements.define(tag, Class)` in packages/, attributed to the file
 * that DECLARES the class rather than merely to a file that calls define().
 * packages/builder/src/builder-element.js re-registers four elements their own
 * files already registered; attributing on call site alone is what made all four
 * read as unused in the Phase 0 usage scan.
 */
function discoverCustomElements(root, packageDirs) {
  const files = walkFiles(join(root, 'packages'), '.js').sort();
  const byTag = new Map();
  const defineRe = /customElements\.define\(\s*(?:['"]([\w-]+)['"]|([A-Za-z_$][\w$]*))\s*,\s*([A-Za-z_$][\w$]*)/g;

  for (const file of files) {
    if (file.includes('.test.') || file.includes('/templates/')) continue;
    const src = readFileSync(file, 'utf8');
    if (!src.includes('customElements.define')) continue;
    const nonCode = nonCodeRanges(src);
    const re = new RegExp(defineRe.source, 'g');
    let m;
    while ((m = re.exec(src))) {
      if (isInRanges(nonCode, m.index)) continue;
      let tag = m[1];
      const identName = m[2];
      const className = m[3];
      if (!tag && identName) {
        const cm = src.match(new RegExp(`\\bconst\\s+${identName}\\s*=\\s*['"]([\\w-]+)['"]`));
        if (cm) tag = cm[1];
      }
      if (!tag) continue;
      const declaresClass = new RegExp(`\\bclass\\s+${className}\\b`).test(src);
      const rel = relFile(root, file);
      if (!byTag.has(tag)) byTag.set(tag, { tag, className, owner: null, registrations: [] });
      const rec = byTag.get(tag);
      rec.registrations.push(rel);
      if (declaresClass && !rec.owner) {
        rec.owner = rel;
        rec.className = className;
        rec.doc = jsdocRawBefore(src, src.search(new RegExp(`\\bclass\\s+${className}\\b`)));
        rec.pkg = packageOf(root, file, packageDirs);
      }
    }
  }
  return [...byTag.values()].filter((r) => r.owner);
}

function packageOf(root, file, packageDirs) {
  for (const [name, dir] of packageDirs) {
    if (file.startsWith(dir + '/')) return name;
  }
  return null;
}

/* ------------------------------------------------------------------- purpose */

function purposeFrom(doc) {
  // JSDoc summaries frequently repeat the component name; keep it, it is what a
  // model matches against, but cap the length so the markdown form stays budgeted.
  return truncate(doc, MAX_PURPOSE_CHARS);
}

/**
 * "Use this instead of", composed mechanically from what the renderer emits.
 * There is no hand-written field here by design: a curated "use X not Y" list is
 * exactly the kind of prose that rots the moment a component changes shape.
 */
function useInsteadOf({ rootTag, primaryContract, kind, name }) {
  if (kind === 'custom-element') {
    return `a hand-rolled <div> reimplementation of <${name}>`;
  }
  if (rootTag && primaryContract) {
    return `a bare <${rootTag}> with your own classes, or literal <${rootTag} data-bn="${primaryContract}"> markup`;
  }
  if (rootTag) return `a bare <${rootTag}> with your own classes`;
  return 'hand-written markup for this element';
}

/* --------------------------------------------------------------------- build */

/**
 * @param {object} args
 * @param {string} args.root                    repo root
 * @param {Array}  args.packages                [{ dir, dirPath, pkg, allExports }] from llms-txt.js
 * @param {string} args.generatedOn             YYYY-MM-DD (stripped by --check)
 */
export function buildComponentIndex({ root, packages, generatedOn }) {
  const packageDirs = new Map(packages.map((p) => [p.pkg.name, p.dirPath]));
  const css = buildCssModel(root);
  const gaps = [];
  const components = [];

  const fileCache = new Map();
  const readSource = (abs) => {
    if (!fileCache.has(abs)) {
      const src = readFileSync(abs, 'utf8');
      fileCache.set(abs, { src, nonCode: nonCodeRanges(src) });
    }
    return fileCache.get(abs);
  };

  /* --- render functions ------------------------------------------------- */
  for (const entry of packages) {
    for (const exp of entry.allExports) {
      if (!/^render[A-Z]/.test(exp.name)) continue;
      if (EXCLUDE_RENDER_FNS.has(exp.name)) continue;
      const abs = join(root, exp.file);
      if (!existsSync(abs) || !statSync(abs).isFile()) continue;
      const { src, nonCode } = readSource(abs);
      const span = declarationSpan(src, exp.name, nonCode);
      if (!span) {
        gaps.push(`${exp.file}: could not bound the declaration of \`${exp.name}\` exactly, so its markup contract is omitted rather than guessed at.`);
      }
      const body = span ? src.slice(span.start, span.end) : '';
      const markup = span
        ? emittedMarkup(body)
        : { firstTag: null, contracts: [], tagOfContract: new Map(), axes: new Set(), segments: [] };
      const jsdoc = span ? jsdocRawBefore(src, span.start) : '';

      components.push({
        id: `${entry.pkg.name}#${exp.name}`,
        name: exp.name,
        kind: 'render-function',
        package: entry.pkg.name,
        file: exp.file,
        signature: `${exp.name}(${compactParams(span?.params ?? exp.params)})`,
        purpose: purposeFrom(exp.doc),
        deprecated: /@deprecated\b/.test(jsdoc),
        markup,
      });
    }
  }

  /* --- custom elements --------------------------------------------------- */
  for (const ce of discoverCustomElements(root, packageDirs)) {
    const { src, nonCode } = readSource(join(root, ce.owner));
    const classIdx = src.search(new RegExp(`\\bclass\\s+${ce.className}\\b`));
    const classEnd = classIdx === -1
      ? -1
      : balanceFrom(src, nextCodeIndexOf(src, '{', classIdx, nonCode), '{', '}', nonCode);
    const body = classIdx === -1 || classEnd === -1 ? '' : src.slice(classIdx, classEnd + 1);
    if (classIdx !== -1 && classEnd === -1) {
      gaps.push(`${ce.owner}: could not bound the body of \`class ${ce.className}\`, so <${ce.tag}>'s markup contract is omitted rather than guessed at.`);
    }
    const markup = emittedMarkup(body);
    components.push({
      id: `element:${ce.tag}`,
      name: ce.tag,
      kind: 'custom-element',
      package: ce.pkg,
      file: ce.owner,
      signature: `<${ce.tag}></${ce.tag}>`,
      purpose: purposeFrom(ce.doc ? ce.doc.replace(/^\/\*\*|\*\/$/g, '').replace(/^\s*\*\s?/gm, '').split(/\n\s*@/)[0] : ''),
      deprecated: /@deprecated\b/.test(ce.doc || ''),
      markup,
      duplicateRegistrations: ce.registrations.length > 1 ? [...new Set(ce.registrations)].sort() : undefined,
    });
  }

  /* --- fold CSS in ------------------------------------------------------- */

  // An axis name is a *style axis* if some stylesheet somewhere declares a rule
  // keyed on it. That is what separates `data-variant` (styled on badge, button,
  // alert, …) from `data-block-id` (an identity hook no rule ever reads), and it
  // is derived rather than hand-listed, so a new style axis needs no maintenance
  // here. It is also what makes `renderCard`'s inert `data-variant` land as a
  // finding instead of drowning in twelve id attributes.
  const styleAxisNames = new Set();
  for (const axesForContract of css.model.values()) {
    for (const axis of axesForContract.keys()) styleAxisNames.add(axis);
  }

  const out = [];
  const contractIndex = new Map();

  for (const c of components) {
    const { contracts, axes: emittedAxes } = c.markup;
    // The naming convention wins when it holds (`renderBadge` -> `badge`), because
    // it is the component's own declared identity; containment decides the rest.
    const primaryContract =
      (c.kind === 'render-function' && contracts.includes(kebabOfRenderer(c.name)) ? kebabOfRenderer(c.name) : null) ??
      rankContracts(c.markup.segments, contracts);
    const rootTag = (primaryContract && c.markup.tagOfContract.get(primaryContract)) || c.markup.firstTag;

    const variants = {};
    for (const contract of contracts) {
      for (const [axis, rec] of css.model.get(contract) ?? []) {
        const key = contract === primaryContract ? axis : `${contract}.${axis}`;
        variants[key] = {
          contract,
          values: [...rec.values].sort(),
          openPatterns: [...rec.openPatterns].sort(),
          matchesAnyValue: rec.presenceOnly,
          declaredIn: [...rec.files].sort(),
          emittedByRenderer: emittedAxes.has(axis),
        };
      }
      if (!contractIndex.has(contract)) contractIndex.set(contract, []);
      contractIndex.get(contract).push(c.id);
    }

    // Written into the DOM by this renderer, is a style axis elsewhere in the
    // design system, and has no rule for any contract this component emits.
    const styledAxesHere = new Set();
    for (const contract of contracts) {
      for (const axis of (css.model.get(contract) ?? new Map()).keys()) styledAxesHere.add(axis);
    }
    const inertAxes = [...emittedAxes]
      .filter((a) => styleAxisNames.has(a) && !styledAxesHere.has(a))
      .sort();

    out.push({
      id: c.id,
      name: c.name,
      kind: c.kind,
      package: c.package,
      file: c.file,
      signature: c.signature,
      purpose: c.purpose,
      deprecated: c.deprecated,
      emits: {
        rootTag,
        primaryContract,
        contracts,
        dataAttributes: [...emittedAxes].sort(),
      },
      variants,
      inertAxes,
      styled: contracts.some((x) => css.contracts.has(x)),
      useInsteadOf: useInsteadOf({ rootTag, primaryContract, kind: c.kind, name: c.name }),
      ...(c.duplicateRegistrations ? { duplicateRegistrations: c.duplicateRegistrations } : {}),
    });
  }

  out.sort((a, b) => (a.package ?? '').localeCompare(b.package ?? '') || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const json = {
    $schema: 'https://basenative.dev/schemas/component-index.json',
    generatedBy: 'scripts/llms-txt.js (scripts/component-index.js)',
    generatedOn,
    contract:
      'Generated from source. Never hand-edit: `node scripts/llms-txt.js --check` fails CI when this file ' +
      'disagrees with packages/*/src. `variants` is the set of values a stylesheet actually declares a rule ' +
      'for, so a value outside it renders unstyled rather than erroring.',
    counts: {
      components: out.length,
      renderFunctions: out.filter((c) => c.kind === 'render-function').length,
      customElements: out.filter((c) => c.kind === 'custom-element').length,
      styledContracts: css.contracts.size,
      componentsWithVariants: out.filter((c) => Object.keys(c.variants).length > 0).length,
    },
    stylesheets: css.files,
    contractIndex: Object.fromEntries([...contractIndex].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v.sort()])),
    extractionGaps: gaps.sort(),
    components: out,
  };

  return { json, markdown: renderMarkdown(json) };
}

/* ------------------------------------------------------------------ markdown */

function variantLine(axis, v) {
  const parts = [];
  if (v.values.length) parts.push(v.values.join('|'));
  for (const p of v.openPatterns) parts.push(`<${axis}${p}>`);
  if (v.matchesAnyValue && !v.values.length && !v.openPatterns.length) parts.push('<any value>');
  const open = v.openPatterns.length || v.matchesAnyValue ? ' — open set, a rule matches beyond the listed values' : '';
  return `${axis}: \`${parts.join(' ')}\`${open}`;
}

export function renderMarkdown(json) {
  let md = '# BaseNative component index\n\n';
  md += '<!-- GENERATED by scripts/llms-txt.js — do not edit. Run `node scripts/llms-txt.js`. -->\n\n';
  md += `Generated ${json.generatedOn} · ${json.counts.components} components `;
  md += `(${json.counts.renderFunctions} render functions, ${json.counts.customElements} custom elements) · `;
  md += `${json.counts.styledContracts} styled \`data-bn\` contracts.\n\n`;
  md += 'Allowed variants below are read out of the stylesheets that declare them, not out of docstrings: ';
  md += 'a value outside the listed set does **not** error, it renders with the base rule only and no styling. ';
  md += 'Every axis also has one unnamed implicit default (the state with no `data-*` attribute).\n\n';
  md += 'Machine form, including the `data-bn` → component reverse index: `.agents/component-index.json`.\n\n';

  const byPackage = new Map();
  for (const c of json.components) {
    const key = c.package ?? '(unattributed)';
    if (!byPackage.has(key)) byPackage.set(key, []);
    byPackage.get(key).push(c);
  }

  for (const [pkg, list] of [...byPackage].sort((a, b) => a[0].localeCompare(b[0]))) {
    md += `## \`${pkg}\`\n\n`;
    for (const c of list) {
      const dep = c.deprecated ? ' **[DEPRECATED]**' : '';
      md += `### \`${c.signature}\`${dep}\n`;
      if (c.purpose) md += `${c.purpose}\n`;
      md += `\`${c.file}\``;
      if (c.emits.rootTag) {
        md += ` · emits \`<${c.emits.rootTag}${c.emits.primaryContract ? ` data-bn="${c.emits.primaryContract}"` : ''}>\``;
      }
      if (c.emits.contracts.length > 1) md += ` + ${c.emits.contracts.length - 1} more contract(s)`;
      md += '\n';
      const axes = Object.entries(c.variants);
      if (axes.length) {
        md += axes.map(([axis, v]) => `- ${variantLine(axis, v)}`).join('\n') + '\n';
      } else {
        md += '- variants: none declared\n';
      }
      if (c.inertAxes.length) {
        md += `- **inert axis** (written to the DOM, no stylesheet reads it for this component): ${c.inertAxes.map((a) => `\`data-${a}\``).join(', ')}\n`;
      }
      if (!c.styled && c.emits.contracts.length) {
        md += `- **unstyled**: no stylesheet declares \`data-bn="${c.emits.primaryContract}"\`\n`;
      }
      if (c.duplicateRegistrations) {
        md += `- registered more than once: ${c.duplicateRegistrations.map((f) => `\`${f}\``).join(', ')}\n`;
      }
      md += `- use instead of: ${c.useInsteadOf}\n\n`;
    }
  }

  if (json.extractionGaps.length) {
    md += '## Extraction gaps\n\n';
    md += 'Shapes this generator could not bound exactly. Nothing is inferred for these — they are listed so the omission is visible.\n\n';
    for (const g of json.extractionGaps) md += `- ${g}\n`;
    md += '\n';
  }

  return md;
}
