#!/usr/bin/env node
/**
 * Template-aware component usage scanner.
 *
 * WHY THIS EXISTS: an LSP / workspaceSymbol approach can only see a JS import
 * and a JS call. BaseNative components are also used two other ways that
 * live entirely inside string/template-literal content, invisible to any
 * symbol index:
 *
 *   (b) `data-bn="<name>"` markup typed directly into a template string —
 *       either the renderer's own output (found in its defining file) or a
 *       hand-rolled duplicate elsewhere that never calls the renderer at all.
 *   (c) a custom element tag (`<bn-canvas>`) written into a template string.
 *
 * A tool that only understood (a) — import + call — would see a component
 * with zero JS call sites and report it dead, even when it is reproduced by
 * hand in a dozen templates. That misreport is exactly what this scanner
 * exists to prevent, so it tokenizes every template/string literal it finds
 * with BaseNative's own tokenizer (`@basenative/validate/scan`) rather than
 * approximating tag/attribute parsing with regex.
 *
 * SCOPE: BaseNative itself plus the sibling consumer repos that depend on
 * it. A component unused inside BaseNative but used by a consumer is NOT
 * dead — the repo dimension is preserved end to end in the output so
 * BaseNative-internal and consumer usage can be read separately.
 *
 * Usage (must be run from inside a package directory — node is refused at
 * the monorepo root in this environment):
 *   cd packages/validate && node ../../scripts/component-usage.js
 *
 * Output: <BaseNative repo root>/.agents/component-usage.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// scanTags/scanInterpolations are the REAL template tokenizer (linear, ReDoS-safe,
// comment-aware) — the same one the validator and, via findInterpolations, the
// runtime's own renderer/client-binder use. Reusing it (not reimplementing it) is
// the entire point of Phase 0.
//
// Imported by path, not as '@basenative/validate/scan'. The workspace root has
// no dependency on @basenative/validate, so the bare specifier does not resolve
// from scripts/ on a clean `pnpm install --frozen-lockfile` checkout — it throws
// ERR_MODULE_NOT_FOUND. This is repo tooling reaching into a sibling package,
// not a consumer, so a path is the honest form and needs no root dependency.
// The published subpath still exists for real consumers and is covered by
// packages/validate/src/scan-export.test.js.
import {
  scanTags,
  scanInterpolations,
  spanAt,
} from '../packages/validate/src/scan.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BASENATIVE_ROOT = resolve(SCRIPT_DIR, '..');
const DUGANLABS_DIR = resolve(BASENATIVE_ROOT, '..');
const OUT_FILE = join(BASENATIVE_ROOT, '.agents', 'component-usage.json');

const CONSUMER_REPO_NAMES = ['GreenPut', 'PendingBusiness', 't4bs', 'DuganLabs', 'warrendugan'];

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out',
  '.turbo', '.nx', '.wrangler', '.cache', '.vercel', '.svelte-kit',
]);
const SOURCE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx']);

// -----------------------------------------------------------------------
// Small utilities
// -----------------------------------------------------------------------

function walk(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.agents') {
        // still allow dotfiles that are actually source dirs? No BaseNative/consumer
        // source lives under a dot-directory, so skip all dot-dirs uniformly.
      }
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue;
        if (e.name.startsWith('.')) continue;
        stack.push(full);
      } else if (e.isFile()) {
        if (SOURCE_EXTS.has(extname(e.name))) out.push(full);
      }
    }
  }
  return out;
}

function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** 1-based line/col for an offset, without pulling in scan.js's spanAt for non-template contexts (same algorithm, kept local so line numbers are cheap to compute per-file once). */
function lineIndex(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return (offset) => {
    // binary search
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - starts[lo] + 1 };
  };
}

// -----------------------------------------------------------------------
// Generic JS lexing: template-literal and string-literal boundaries.
//
// This is NOT an approximation of scanTags/scanInterpolations — it answers a
// different question (where does a JS string/template literal begin and end,
// and where do its `${ }` holes fall) so that the REAL tokenizer can then be
// run on each static segment. Getting template-literal boundaries wrong is a
// generic JS-lexing problem, not a BaseNative-template-dialect one.
// -----------------------------------------------------------------------

/**
 * Reads a template literal starting at the backtick index `start`. Returns
 * { end, holes } where `end` is the index of the closing backtick and each
 * hole is `{ start, end }` spanning `${` ... the matching `}` (end is just
 * past the `}`). Returns null if the literal never closes (malformed/EOF).
 */
function readTemplateLiteral(source, start) {
  const n = source.length;
  let i = start + 1;
  const holes = [];
  while (i < n) {
    const c = source[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return { end: i, holes };
    if (c === '$' && source[i + 1] === '{') {
      const holeStart = i;
      let j = i + 2;
      let depth = 1;
      while (j < n && depth > 0) {
        const cj = source[j];
        if (cj === '\\') { j += 2; continue; }
        if (cj === '`') {
          const nested = readTemplateLiteral(source, j);
          j = nested ? nested.end + 1 : j + 1;
          continue;
        }
        if (cj === '"' || cj === "'") {
          const q = cj;
          j++;
          while (j < n && source[j] !== q) { j += source[j] === '\\' ? 2 : 1; }
          j++;
          continue;
        }
        if (cj === '/' && source[j + 1] === '/') {
          const k = source.indexOf('\n', j);
          j = k === -1 ? n : k;
          continue;
        }
        if (cj === '/' && source[j + 1] === '*') {
          const k = source.indexOf('*/', j + 2);
          j = k === -1 ? n : k + 2;
          continue;
        }
        if (cj === '{') { depth++; j++; continue; }
        if (cj === '}') { depth--; j++; continue; }
        j++;
      }
      holes.push({ start: holeStart, end: j });
      i = j;
      continue;
    }
    i++;
  }
  return null;
}

/**
 * Walks a whole file once, finding every template literal (with its holes)
 * and every plain single/double-quoted string literal, skipping comments so
 * a commented-out `<div data-bn="...">` is not counted as a live usage.
 *
 * Returns raw literal records; `extractStaticSegments` turns these into the
 * text actually handed to scanTags/scanInterpolations.
 */
function findStringLiterals(source) {
  const templates = [];
  const strings = [];
  const comments = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    if (c === '`') {
      const lit = readTemplateLiteral(source, i);
      if (lit) {
        templates.push({ start: i + 1, end: lit.end, holes: lit.holes });
        i = lit.end + 1;
      } else {
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && source[j] !== q) { j += source[j] === '\\' ? 2 : 1; }
      if (j < n) {
        strings.push({ start: i + 1, end: j });
        i = j + 1;
      } else {
        i++;
      }
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      const k = source.indexOf('\n', i);
      comments.push({ start: i, end: k === -1 ? n : k });
      i = k === -1 ? n : k;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const k = source.indexOf('*/', i + 2);
      comments.push({ start: i, end: k === -1 ? n : k + 2 });
      i = k === -1 ? n : k + 2;
      continue;
    }
    i++;
  }
  return { templates, strings, comments };
}

/**
 * Ranges of the file that are NOT executable JS — the literal text inside
 * string/template literals (never their `${ }` holes, which are real code)
 * plus comments. `(a) JS import + call` detection must stay outside these
 * ranges, or a documentation code-sample embedded in a template literal
 * (`code(\`import { renderButton } ...\`)`, seen for real in
 * examples/express/component-demos.js) gets counted as a live call site.
 * `(b)`/`(c)` detection is the opposite: it deliberately runs ONLY inside
 * these ranges, since that's where template markup lives.
 */
function nonCodeRanges(source) {
  const { templates, strings, comments } = findStringLiterals(source);
  const ranges = [];
  for (const c of comments) ranges.push([c.start, c.end]);
  for (const s of strings) ranges.push([s.start - 1, s.end + 1]);
  for (const t of templates) {
    let cursor = t.start - 1;
    for (const hole of t.holes) {
      ranges.push([cursor, hole.start]);
      cursor = hole.end;
    }
    ranges.push([cursor, t.end + 1]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  }
  return merged;
}

function isInRanges(ranges, index) {
  let lo = 0, hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, e] = ranges[mid];
    if (index < s) hi = mid - 1;
    else if (index >= e) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Turns the raw literal records into the static text segments that are safe
 * to hand to scanTags/scanInterpolations, each tagged with its absolute
 * offset into the original file so line/col stay accurate.
 *
 * LIMITATION (deliberate, not a bug): a `${...}` hole splits its template
 * into separate static segments rather than being bridged or guessed at. A
 * tag whose `>` — or whose `data-bn` attribute itself — falls on the far
 * side of a hole from where the tag opened is therefore invisible to this
 * scanner, because scanTags never sees the two halves as one string. This is
 * the honest reading of "a hole splits a template into static segments; do
 * not let a hole silently merge two tags": bridging holes with a guessed
 * placeholder risks manufacturing tags that were never in the source (a hole
 * can itself expand to markup, including more tags, at runtime) or hiding a
 * hole that really does separate two unrelated tags. See LIMITATIONS in the
 * report for the practical impact.
 */
function extractStaticSegments(source) {
  const { templates, strings } = findStringLiterals(source);
  const segments = [];

  for (const t of templates) {
    let cursor = t.start;
    for (const hole of t.holes) {
      if (hole.start > cursor) {
        segments.push({ start: cursor, text: source.slice(cursor, hole.start) });
      }
      cursor = hole.end;
    }
    if (t.end > cursor) {
      segments.push({ start: cursor, text: source.slice(cursor, t.end) });
    }
  }

  for (const s of strings) {
    if (s.end > s.start) {
      // Plain JS strings escape their own quote char and backslashes; template
      // literals don't use this quoting so they're left untouched above. A
      // light unescape keeps `\"` from confusing the tokenizer's own quote
      // handling. More exotic escapes (\uXXXX etc.) are left as-is — they
      // don't appear in the attribute names/values this scanner cares about.
      const raw = source.slice(s.start, s.end);
      const text = raw.replace(/\\(["'\\])/g, '$1');
      segments.push({ start: s.start, text });
    }
  }

  // Only segments that could plausibly contain markup are worth tokenizing —
  // cheap prefilter, big win at this file count.
  return segments.filter((seg) => seg.text.includes('<') || seg.text.includes('{{'));
}

// -----------------------------------------------------------------------
// Step 1 — parse each BaseNative package's REAL exports (no filename
// guessing): read the entry file's own `export` statements.
// -----------------------------------------------------------------------

function packageEntryFile(pkgDir, pkgJson) {
  const exp = pkgJson.exports?.['.'];
  let entry;
  if (typeof exp === 'string') entry = exp;
  else if (exp && typeof exp === 'object') entry = exp.default || exp.import || exp.node || Object.values(exp)[0];
  else entry = pkgJson.main || './src/index.js';
  return resolve(pkgDir, entry);
}

/**
 * Returns Map<exportedName, absoluteFilePath> by parsing the entry file's own
 * `export` statements — not by assuming a file `foo.js` exports `foo`. Every
 * BaseNative package entry in this repo re-exports directly
 * (`export { a, b as c } from './file.js'`) or declares locally
 * (`export function/class/const name`), so a single non-recursive pass over
 * the entry file is enough; `export *` and no-`from` re-export forms are
 * flagged (not silently guessed at) if they ever appear.
 */
function resolveExports(entryFile, warnings) {
  const map = new Map();
  if (!existsSync(entryFile)) return map;
  const src = readFileSync(entryFile, 'utf8');
  const dir = dirname(entryFile);

  if (/export\s*\*/.test(src)) {
    warnings.push(`${relative(BASENATIVE_ROOT, entryFile)}: uses "export *" — not followed, exports from it are missing`);
  }

  const reExportRe = /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = reExportRe.exec(src))) {
    const [, names, specifier] = m;
    let file = resolve(dir, specifier);
    if (!existsSync(file) && existsSync(file + '.js')) file += '.js';
    for (const part of names.split(',')) {
      const piece = part.trim();
      if (!piece) continue;
      const asMatch = piece.match(/^(\S+)\s+as\s+(\S+)$/);
      const exported = asMatch ? asMatch[2] : piece;
      map.set(exported, file);
    }
  }

  const localExportRe = /export\s+(?:async\s+)?(?:function|class|const|let)\s+([A-Za-z0-9_$]+)/g;
  while ((m = localExportRe.exec(src))) {
    map.set(m[1], entryFile);
  }

  // `export { a, b as c };` with no `from` — refers to locally bound names.
  // Not present anywhere in this repo today (checked by hand); flagged rather
  // than guessed if it ever appears, per the "do not guess" instruction.
  const bareExportRe = /export\s*\{([^}]*)\}\s*;/g;
  while ((m = bareExportRe.exec(src))) {
    const isReExport = src.slice(Math.max(0, m.index - 1), m.index).endsWith('\n') && false;
    // Distinguish from the `from`-form already handled: only flag if this
    // exact block wasn't already consumed above (heuristically, by checking
    // the text immediately after the closing brace isn't `from`).
    const after = src.slice(m.index + m[0].length - 1);
    if (!/^\s*from/.test(after)) {
      for (const part of m[1].split(',')) {
        const piece = part.trim();
        if (!piece) continue;
        const asMatch = piece.match(/^(\S+)\s+as\s+(\S+)$/);
        const local = asMatch ? asMatch[1] : piece;
        const exported = asMatch ? asMatch[2] : piece;
        if (!map.has(exported)) {
          warnings.push(`${relative(BASENATIVE_ROOT, entryFile)}: "export { ${local} as ${exported} }" without "from" — local-binding re-exports are not traced, origin file unknown`);
        }
      }
    }
  }

  return map;
}

// -----------------------------------------------------------------------
// Step 2 — component discovery inside BaseNative
// -----------------------------------------------------------------------

function discoverComponents() {
  const warnings = [];
  const packagesDir = join(BASENATIVE_ROOT, 'packages');
  const pkgNames = readdirSync(packagesDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  const components = new Map(); // id -> component record
  const exportIndex = new Map(); // `${pkgName}#${exportName}` -> id, and bare exportName -> [ids] for relative-import fallback
  const byExportName = new Map();
  const packageOfFile = new Map(); // absolute file -> package name (for attribution)
  const packageNameToDir = new Map();

  // Functions matching render[A-Z]* by convention but not BaseNative UI
  // components in the data-bn sense — documented exclusion, not a guess.
  const EXCLUDE_RENDER_FNS = new Set(['renderPng']); // returns raster image bytes, not an HTML string

  for (const d of pkgNames) {
    const pkgDir = join(packagesDir, d.name);
    const pkgJsonPath = join(pkgDir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    packageNameToDir.set(pkgJson.name, pkgDir);
  }

  for (const d of pkgNames) {
    const pkgDir = join(packagesDir, d.name);
    const pkgJsonPath = join(pkgDir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const entryFile = packageEntryFile(pkgDir, pkgJson);
    const exportsMap = resolveExports(entryFile, warnings);

    for (const [name, file] of exportsMap) {
      packageOfFile.set(file, pkgJson.name);
      if (!/^render[A-Z]/.test(name) || EXCLUDE_RENDER_FNS.has(name)) continue;
      const id = `${pkgJson.name}#${name}`;
      const record = {
        id,
        name,
        kind: 'render-function',
        definition: {
          package: pkgJson.name,
          file: relative(BASENATIVE_ROOT, file),
          repo: 'BaseNative',
        },
        dataBnNames: [],
        usages: [],
      };
      components.set(id, record);
      exportIndex.set(`${pkgJson.name}#${name}`, id);
      if (!byExportName.has(name)) byExportName.set(name, []);
      byExportName.get(name).push({ id, file, pkg: pkgJson.name });
    }
  }

  // --- Custom elements: find every customElements.define(...) call, resolve
  // its tag argument (literal, or a `const TAG = 'literal'` in the same file).
  const allBaseNativeFiles = walk(BASENATIVE_ROOT);
  const customElementDefineRe = /customElements\.define\(\s*(?:['"]([\w-]+)['"]|([A-Za-z_$][\w$]*))\s*,\s*([A-Za-z_$][\w$]*)/g;

  for (const file of allBaseNativeFiles) {
    if (!file.includes(`${SEP}packages${SEP}`)) continue;
    if (extname(file) !== '.js') continue;
    const src = readFileSync(file, 'utf8');
    if (!src.includes('customElements.define')) continue;
    let m;
    const re = new RegExp(customElementDefineRe.source, 'g');
    while ((m = re.exec(src))) {
      let tag = m[1];
      const identName = m[2];
      const className = m[3];
      if (!tag && identName) {
        const constRe = new RegExp(`\\bconst\\s+${identName}\\s*=\\s*['"]([\\w-]+)['"]`);
        const cm = src.match(constRe);
        if (cm) tag = cm[1];
      }
      if (!tag) {
        warnings.push(`${relative(BASENATIVE_ROOT, file)}: customElements.define() tag argument could not be resolved statically`);
        continue;
      }
      const id = `element:${tag}`;
      if (!components.has(id)) {
        // Attribute the definition to the package owning this file.
        let pkgName = null;
        for (const [name, dir] of packageNameToDir) {
          if (file.startsWith(dir + SEP)) { pkgName = name; break; }
        }
        components.set(id, {
          id,
          name: tag,
          kind: 'custom-element',
          className,
          definition: {
            package: pkgName,
            file: relative(BASENATIVE_ROOT, file),
            repo: 'BaseNative',
          },
          dataBnNames: [],
          usages: [],
        });
      }
    }
  }

  // --- data-bn contracts: scan every render-function's own defining file for
  // literal data-bn="<value>" attributes it emits.
  const dataBnIndex = new Map(); // value -> [componentId]
  const seenFiles = new Set();
  for (const record of components.values()) {
    if (record.kind !== 'render-function') continue;
    const file = join(BASENATIVE_ROOT, record.definition.file);
    if (seenFiles.has(file)) continue; // avoid rescanning a file with multiple renderX exports
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    const segments = extractStaticSegments(src);
    const valuesInFile = new Set();
    for (const seg of segments) {
      for (const tag of scanTags(seg.text)) {
        if (tag.closing) continue;
        for (const attr of tag.attrs) {
          if (attr.name === 'data-bn' && attr.value) valuesInFile.add(attr.value);
        }
      }
    }
    // Attribute every data-bn value found in this file to every renderX
    // component whose entry point is also this file (handles files that
    // export exactly one renderX and files — like calendar.js — that export
    // several which together emit several data-bn values).
    const componentsInFile = [...components.values()].filter(
      (c) => c.kind === 'render-function' && join(BASENATIVE_ROOT, c.definition.file) === file,
    );
    for (const value of valuesInFile) {
      if (!dataBnIndex.has(value)) dataBnIndex.set(value, []);
      for (const c of componentsInFile) {
        c.dataBnNames.push(value);
        dataBnIndex.get(value).push(c.id);
      }
    }
    seenFiles.add(file);
  }

  return { components, exportIndex, byExportName, packageNameToDir, dataBnIndex, warnings };
}

const SEP = '/';

// -----------------------------------------------------------------------
// Step 3 — usage scanning across BaseNative + consumer repos
// -----------------------------------------------------------------------

function packageAttribution(file, repoName, repoRoot, packageNameToDir) {
  if (repoName === 'BaseNative') {
    for (const [name, dir] of packageNameToDir) {
      if (file.startsWith(dir + SEP)) return name;
    }
    const rel = relative(repoRoot, file);
    return `BaseNative:${rel.split('/')[0]}`;
  }
  // Consumer repo: walk up looking for the nearest package.json.
  let dir = dirname(file);
  while (dir.startsWith(repoRoot)) {
    const pj = join(dir, 'package.json');
    if (existsSync(pj)) {
      try {
        const name = JSON.parse(readFileSync(pj, 'utf8')).name;
        if (name) return name;
      } catch { /* fall through */ }
    }
    if (dir === repoRoot) break;
    dir = dirname(dir);
  }
  return repoName;
}

function scanRepoForUsage(repoName, repoRoot, discovery) {
  const { components, dataBnIndex, packageNameToDir } = discovery;
  const files = walk(repoRoot);
  const usages = [];
  const relativeExportCache = new Map(); // resolved file -> Map(exportedName -> origin file)

  // Build a global reverse index: bare export name -> candidate component ids
  // (usually exactly one). Used to resolve JS import+call usage.
  const byBareName = new Map();
  for (const record of components.values()) {
    if (record.kind !== 'render-function') continue;
    if (!byBareName.has(record.name)) byBareName.set(record.name, []);
    byBareName.get(record.name).push(record);
  }
  const customElementTags = new Map();
  for (const record of components.values()) {
    if (record.kind === 'custom-element') customElementTags.set(record.name, record);
  }

  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch { continue; }
    if (src.length === 0) continue;

    // All definitions live in the BaseNative repo, so this only ever matches
    // there; consumer-repo files never equal a definition file.
    const isDefinitionFileFor = repoName === 'BaseNative'
      ? new Set([...components.values()].filter((c) => join(BASENATIVE_ROOT, c.definition.file) === file).map((c) => c.id))
      : new Set();

    const pkg = packageAttribution(file, repoName, repoRoot, packageNameToDir);
    const relFile = relative(repoRoot, file);
    const isTest = /\.(test|spec)\.[jt]sx?$/.test(file) || file.includes(`${SEP}__tests__${SEP}`);
    const getLineCol = lineIndex(src);
    const nonCode = nonCodeRanges(src);

    // --- (a) JS import + call --------------------------------------------------
    if (src.includes('render') || src.includes('createElement') || src.includes('customElements')) {
      const importRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
      let im;
      const localToComponent = new Map();
      while ((im = importRe.exec(src))) {
        if (isInRanges(nonCode, im.index)) continue; // a doc code-sample import, not a real one
        const [, names, specifier] = im;
        if (!specifier.startsWith('@basenative/') && !specifier.startsWith('.')) continue;
        for (const part of names.split(',')) {
          const piece = part.trim();
          if (!piece) continue;
          const asMatch = piece.match(/^(\S+)\s+as\s+(\S+)$/);
          const imported = asMatch ? asMatch[1] : piece;
          const local = asMatch ? asMatch[2] : piece;
          const candidates = byBareName.get(imported);
          if (!candidates) continue;
          // Some packages (e.g. @basenative/admin) also expose a subpath
          // export (`@basenative/admin/components`) alongside the main
          // `.` entry, pointing at the very file the component is defined
          // in — a real import site, so a bare package-name match isn't
          // enough.
          let match = candidates.find(
            (c) => c.definition.package === specifier || specifier.startsWith(`${c.definition.package}/`),
          );
          if (!match && specifier.startsWith('.')) {
            // Relative import (possibly of a barrel like './index.js', not
            // the declaring file directly): resolve what THIS name actually
            // traces back to and match by definition FILE, not package —
            // two packages can (and here, do: @basenative/components and
            // @basenative/combobox both export a `renderCombobox`) export
            // the same bare name, so "only one candidate exists" is not a
            // safe fallback.
            let resolved = resolve(dirname(file), specifier);
            if (!existsSync(resolved) && existsSync(resolved + '.js')) resolved += '.js';
            if (existsSync(resolved) && statSync(resolved).isFile()) {
              if (!relativeExportCache.has(resolved)) relativeExportCache.set(resolved, resolveExports(resolved, []));
              const originFile = relativeExportCache.get(resolved).get(imported);
              if (originFile) match = candidates.find((c) => join(BASENATIVE_ROOT, c.definition.file) === originFile);
            }
          }
          if (match) localToComponent.set(local, match);
        }
      }
      for (const [local, component] of localToComponent) {
        const callRe = new RegExp(`\\b${local}\\s*\\(`, 'g');
        let cm;
        while ((cm = callRe.exec(src))) {
          if (isInRanges(nonCode, cm.index)) continue; // inside a string/comment (e.g. a doc code-sample), not a real call
          const { line, col } = getLineCol(cm.index);
          if (isDefinitionFileFor.has(component.id)) continue; // exporting file re-declaring itself, not a usage
          usages.push({
            componentId: component.id,
            kind: 'import-call',
            repo: repoName,
            package: pkg,
            file: relFile,
            line,
            col,
            isTest,
            snippet: src.slice(Math.max(0, cm.index - 10), cm.index + 30).replace(/\s+/g, ' ').trim(),
          });
        }
      }
    }

    // --- (b)/(c) template-string content: data-bn markup + custom element tags --
    if (src.includes('<')) {
      const segments = extractStaticSegments(src);
      // Precompute whether this file textually imports each renderX name, to
      // flag data-bn markup usages that also import the matching renderer
      // (a signal, not a verdict, for whether the markup is the renderer's
      // own output funneled through a variable, vs a hand-rolled duplicate).
      const importsByName = new Set();
      const importRe2 = /import\s*\{([^}]*)\}\s*from\s*['"]@basenative\/[^'"]+['"]/g;
      let im2;
      while ((im2 = importRe2.exec(src))) {
        if (isInRanges(nonCode, im2.index)) continue; // a doc code-sample import, not a real one
        for (const part of im2[1].split(',')) {
          const piece = part.trim().split(/\s+as\s+/)[0].trim();
          if (piece) importsByName.add(piece);
        }
      }

      for (const seg of segments) {
        const tags = scanTags(seg.text);
        for (const tag of tags) {
          if (tag.closing) continue;
          const abs = seg.start + tag.offset;
          const { line, col } = getLineCol(abs);

          // (b) data-bn contract
          for (const attr of tag.attrs) {
            if (attr.name !== 'data-bn' || !attr.value) continue;
            const ids = dataBnIndex.get(attr.value);
            if (!ids) continue; // not a known BaseNative component contract
            const attrAbs = seg.start + attr.offset;
            const attrPos = getLineCol(attrAbs);
            for (const id of ids) {
              if (isDefinitionFileFor.has(id)) continue; // this IS the definition, not a usage
              const component = components.get(id);
              usages.push({
                componentId: id,
                kind: 'data-bn-markup',
                repo: repoName,
                package: pkg,
                file: relFile,
                line: attrPos.line,
                col: attrPos.col,
                isTest,
                dataBnValue: attr.value,
                importsRenderer: importsByName.has(component.name),
                snippet: tag.raw.length > 80 ? tag.raw.slice(0, 80) + '…' : tag.raw,
              });
            }
          }

          // (c) custom element tag
          const ceComponent = customElementTags.get(tag.tagName);
          if (ceComponent && !isDefinitionFileFor.has(ceComponent.id)) {
            usages.push({
              componentId: ceComponent.id,
              kind: 'custom-element-tag',
              repo: repoName,
              package: pkg,
              file: relFile,
              line,
              col,
              isTest,
              snippet: tag.raw.length > 80 ? tag.raw.slice(0, 80) + '…' : tag.raw,
            });
          }
        }
      }
    }

    // --- supplementary: document.createElement('tag') / customElements.get('tag') ---
    if (src.includes('createElement') || src.includes('customElements.get')) {
      for (const [tag, component] of customElementTags) {
        const jsTagRe = new RegExp(`(?:createElement|customElements\\.get)\\(\\s*['"]${tag}['"]`, 'g');
        let jm;
        while ((jm = jsTagRe.exec(src))) {
          if (isInRanges(nonCode, jm.index)) continue; // inside a string/comment, not a real call
          if (isDefinitionFileFor.has(component.id)) continue;
          const { line, col } = getLineCol(jm.index);
          usages.push({
            componentId: component.id,
            kind: 'js-create-element',
            repo: repoName,
            package: pkg,
            file: relFile,
            line,
            col,
            isTest,
            snippet: jm[0],
          });
        }
      }
    }
  }

  return usages;
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

function main() {
  const t0 = Date.now();
  const discovery = discoverComponents();
  const { components } = discovery;

  const repos = [{ name: 'BaseNative', root: BASENATIVE_ROOT }];
  for (const name of CONSUMER_REPO_NAMES) {
    const root = join(DUGANLABS_DIR, name);
    if (existsSync(root)) repos.push({ name, root });
  }

  const missingRepos = CONSUMER_REPO_NAMES.filter((n) => !existsSync(join(DUGANLABS_DIR, n)));

  let totalUsages = 0;
  for (const repo of repos) {
    const usages = scanRepoForUsage(repo.name, repo.root, discovery);
    totalUsages += usages.length;
    for (const u of usages) {
      const c = components.get(u.componentId);
      if (c) c.usages.push(u);
    }
  }

  // Aggregate counts per component.
  const componentList = [...components.values()].map((c) => {
    const byRepo = {};
    const byKind = {};
    for (const u of c.usages) {
      byRepo[u.repo] = (byRepo[u.repo] || 0) + 1;
      byKind[u.kind] = (byKind[u.kind] || 0) + 1;
    }
    return {
      id: c.id,
      name: c.name,
      kind: c.kind,
      definition: c.definition,
      dataBnNames: [...new Set(c.dataBnNames)],
      usageCounts: { total: c.usages.length, byRepo, byKind },
      usages: c.usages,
    };
  });
  componentList.sort((a, b) => a.id.localeCompare(b.id));

  const output = {
    generatedAt: new Date().toISOString(),
    scanner: 'scripts/component-usage.js',
    tokenizer: '@basenative/validate/scan (scanTags/scanInterpolations)',
    durationMs: Date.now() - t0,
    repos: Object.fromEntries(repos.map((r) => [r.name, relative(DUGANLABS_DIR, r.root)])),
    missingRepos,
    componentsFound: componentList.length,
    totalUsages,
    warnings: discovery.warnings,
    components: componentList,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`components=${componentList.length} usages=${totalUsages} durationMs=${output.durationMs}`);
  if (discovery.warnings.length) {
    console.log(`warnings=${discovery.warnings.length}:`);
    for (const w of discovery.warnings) console.log(`  - ${w}`);
  }
  if (missingRepos.length) {
    console.log(`consumer repos not found on disk (skipped): ${missingRepos.join(', ')}`);
  }
}

// Run only when executed directly, not when imported. Without this guard the
// module cannot be imported at all without performing a full scan and
// overwriting .agents/component-usage.json as a side effect — which is exactly
// what happened when a test first tried to import it, and is why nothing had
// ever imported it to check that it loads.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
