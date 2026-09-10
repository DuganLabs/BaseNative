import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Generates llms.txt (package index) and llms-full.txt (complete public API
// surface) from packages/*/package.json, packages/*/src/**/*.js exports, and
// docs/*.md. Mirrors scripts/package-inventory.js: never hand-edit the
// output — API docs that drift from the exported surface are worse than none
// (PRD W3 constraint, applied here too).
//
//   node scripts/llms-txt.js          write llms.txt + llms-full.txt
//   node scripts/llms-txt.js --check  exit 1 if the committed copies are stale

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const DOCS_API_DIR = join(ROOT, 'docs', 'api');
const OUT_INDEX = join(ROOT, 'llms.txt');
const OUT_FULL = join(ROOT, 'llms-full.txt');

const MAX_CODE_LINES = 10;
const MAX_PROSE_CHARS = 240;

// Top-level ## headings in docs/api/*.md that are prose/boilerplate rather
// than API surface — skipped so llms-full.txt stays budget-sized without
// dropping any directive, function, command, or component entry.
const SKIP_HEADINGS = new Set([
  'installation', 'license', 'overview', 'integration', 'notes',
  'configuration', 'quick start', 'styling', 'theming', 'design tokens',
  'css custom properties', 'utility functions',
]);

// The runtime/server directive reference is pulled from these two headings
// specifically (see docs/api/runtime.md, docs/api/server.md) and rendered
// once, up front, instead of once per package.
const DIRECTIVE_HEADINGS = new Set([
  'template directives', 'server-side directives', 'hydratable mode',
]);

/* ---------------------------------------------------------------- utils */

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(str, max) {
  if (!str) return str;
  const clean = str.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '\u2026' : clean;
}

function truncateLines(text, max) {
  const lines = text.replace(/\s+$/, '').split('\n');
  if (lines.length <= max) return lines.join('\n');
  return lines.slice(0, max).join('\n') + '\n\u2026';
}

function relFile(absPath) {
  return relative(ROOT, absPath).split('\\').join('/');
}

/* --------------------------------------------------- package discovery */

function listPackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ dir: e.name, dirPath: join(PACKAGES_DIR, e.name) }))
    .filter((e) => existsSync(join(e.dirPath, 'package.json')))
    .map((e) => ({ ...e, pkg: readJSON(join(e.dirPath, 'package.json')) }))
    .filter((e) => e.pkg.name)
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}

/** Resolve package.json `exports` (or `main`) to [{subpath, file}], file relative to package dir. */
function resolveExportSubpaths(pkg) {
  const out = [];
  const exp = pkg.exports;
  if (exp && typeof exp === 'object') {
    for (const [subpath, val] of Object.entries(exp)) {
      let file = null;
      if (typeof val === 'string') file = val;
      else if (val && typeof val === 'object') file = val.default ?? val.import ?? val.require ?? null;
      if (file) out.push({ subpath, file });
    }
  } else if (pkg.main) {
    out.push({ subpath: '.', file: pkg.main });
  }
  return out;
}

/* -------------------------------------------------- JS export scanning */

function stripCommentMarkers(block) {
  return block
    .split('\n')
    .map((l) => l.replace(/^\s*\*\/?\s?/, '').replace(/^\/\*\*\s?/, ''))
    .join('\n')
    .trim();
}

/** Nearest /** ... *\/ block immediately preceding `index` in `content` (with
 * only whitespace between the two), or '' — walks ALL preceding blocks so a
 * multi-block preamble (e.g. a module doc followed by a @typedef followed by
 * the function's own doc) resolves to the closest one, not the first. */
function jsdocBefore(content, index) {
  const before = content.slice(0, index);
  const blocks = [...before.matchAll(/\/\*\*[\s\S]*?\*\//g)];
  if (!blocks.length) return '';
  const last = blocks[blocks.length - 1];
  const gap = before.slice(last.index + last[0].length);
  if (!/^\s*$/.test(gap)) return '';
  return stripCommentMarkers(last[0].slice(2, -2));
}

// Standard JSDoc block tags. Deliberately a whitelist, not "starts with @" —
// prose legitimately contains "@basenative/x" (an npm scope), which is not a
// tag and must not truncate the description.
const JSDOC_TAG_LINE = /^@(param|arg|argument|returns?|throws?|exception|example|typedef|property|prop|type|module|see|deprecated|template|callback|async|private|public|protected|readonly|default|augments|extends|memberof|namespace|function|func|method|constructor|class|abstract|access|alias|author|copyright|desc|description|enum|event|external|file|fileoverview|fires|ignore|implements|inheritdoc|instance|interface|kind|lends|license|listens|mixes|mixin|override|package|requires|since|static|summary|this|todo|tutorial|variation|version|yields?)\b/i;

/** Leading prose lines of a JSDoc block, stopping at the first real `@tag`
 * (JSDoc convention: free-text description first, then a run of tags) —
 * never fabricates a summary when a doc block is tags-only (e.g. bare
 * `@param`). "@basenative/x" mentions in prose are not tags and pass through. */
function firstProseParagraph(raw, max = MAX_PROSE_CHARS) {
  if (!raw) return '';
  const prose = [];
  for (const rawLine of raw.split('\n')) {
    const l = rawLine.replace(/^\*\s?/, '').trim();
    if (JSDOC_TAG_LINE.test(l)) break;
    if (l === '') { if (prose.length) break; else continue; }
    prose.push(l);
  }
  return truncate(prose.join(' '), max);
}

function jsdocSummary(raw) {
  return firstProseParagraph(raw, MAX_PROSE_CHARS);
}

/** Leading file-header block comment (module overview), used as a package
 * description fallback when there's no docs/api/<pkg>.md. */
function leadingFileComment(content) {
  const m = content.match(/^(?:\/\/[^\n]*\n)*\s*\/\*\*([\s\S]*?)\*\//);
  if (!m) return '';
  return stripCommentMarkers(m[1]);
}

/** Scan forward from an opening '(' at `openIdx` to its matching ')',
 * respecting nesting (default-value arrow functions, destructuring, nested
 * calls) — a plain `[^)]*` regex breaks on any nested paren. Returns the
 * text between the parens, or '' if unbalanced. */
function balancedParams(content, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return content.slice(openIdx + 1, i);
    }
  }
  return '';
}

/** A non-exported same-file declaration (`function foo() {}`, `const foo = ...`,
 * `class Foo {}`), for resolving a bare `export { foo };` whose binding was
 * declared without its own `export` keyword. */
function findLocalDeclaration(content, name) {
  const fnMatch = content.match(new RegExp(`(?:^|\\n)\\s*(async\\s+function|function)\\s+${escapeRegExp(name)}\\s*\\(`));
  if (fnMatch) {
    const openIdx = fnMatch.index + fnMatch[0].length - 1;
    return { kind: fnMatch[1].startsWith('async') ? 'async function' : 'function', params: truncate(balancedParams(content, openIdx).trim(), 120), index: fnMatch.index + fnMatch[0].indexOf(fnMatch[1]) };
  }
  const classMatch = content.match(new RegExp(`(?:^|\\n)\\s*class\\s+${escapeRegExp(name)}\\b`));
  if (classMatch) return { kind: 'class', params: '', index: classMatch.index };
  const constMatch = content.match(new RegExp(`(?:^|\\n)\\s*const\\s+${escapeRegExp(name)}\\s*=`));
  if (constMatch) return { kind: 'const', params: '', index: constMatch.index };
  return null;
}

function resolveModule(fromAbsFile, spec) {
  if (!spec.startsWith('.')) return null; // external package — not ours to scan
  let target = join(dirname(fromAbsFile), spec);
  if (extname(target) === '') target += '.js';
  if (existsSync(target)) return target;
  const asIndex = join(target.replace(/\.js$/, ''), 'index.js');
  if (existsSync(asIndex)) return asIndex;
  return null;
}

const fileExportCache = new Map();

/**
 * Extract exported symbols from a JS source file, following `export { x }
 * from './y.js'` and `export * as ns from './y.js'` one or more levels deep.
 * Returns [{ name, kind, params, doc, file }] — `file` cites the file where
 * the symbol is actually declared (its ground truth for signature/JSDoc).
 */
function getFileExports(absFile, visiting = new Set()) {
  if (fileExportCache.has(absFile)) return fileExportCache.get(absFile);
  if (visiting.has(absFile) || !existsSync(absFile)) return [];
  visiting.add(absFile);

  const content = readFileSync(absFile, 'utf8');
  const results = [];
  const consumedSpans = [];

  const markConsumed = (m) => consumedSpans.push([m.index, m.index + m[0].length]);
  const isConsumed = (index) => consumedSpans.some(([s, e]) => index >= s && index < e);

  // export function / export async function
  for (const m of content.matchAll(/export\s+(async\s+function|function)\s+([A-Za-z0-9_$]+)\s*\(/g)) {
    const openIdx = m.index + m[0].length - 1;
    const params = balancedParams(content, openIdx);
    results.push({
      name: m[2],
      kind: m[1].startsWith('async') ? 'async function' : 'function',
      params: truncate(params.trim(), 120),
      doc: jsdocSummary(jsdocBefore(content, m.index)),
      file: relFile(absFile),
    });
    consumedSpans.push([m.index, openIdx + params.length + 2]);
  }

  // export class
  for (const m of content.matchAll(/export\s+class\s+([A-Za-z0-9_$]+)/g)) {
    markConsumed(m);
    results.push({
      name: m[1],
      kind: 'class',
      params: '',
      doc: jsdocSummary(jsdocBefore(content, m.index)),
      file: relFile(absFile),
    });
  }

  // export const NAME = ...  (captures arrow-fn params, balanced, when present)
  for (const m of content.matchAll(/export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*/g)) {
    markConsumed(m);
    const valueStart = m.index + m[0].length;
    let kind = 'const';
    let params = '';
    const arrowLead = content.slice(valueStart, valueStart + 20).match(/^(async\s*)?\(/);
    if (arrowLead) {
      const openIdx = valueStart + arrowLead[0].length - 1;
      const inner = balancedParams(content, openIdx);
      const afterClose = content.slice(openIdx + inner.length + 2, openIdx + inner.length + 6).trimStart();
      if (afterClose.startsWith('=>')) {
        kind = 'const (fn)';
        params = truncate(inner.trim(), 120);
      }
    }
    results.push({
      name: m[1],
      kind,
      params,
      doc: jsdocSummary(jsdocBefore(content, m.index)),
      file: relFile(absFile),
    });
  }

  // export default ...
  {
    const m = content.match(/export\s+default\s+/);
    if (m) {
      results.push({
        name: 'default',
        kind: 'default export',
        params: '',
        doc: jsdocSummary(jsdocBefore(content, m.index)),
        file: relFile(absFile),
      });
    }
  }

  // export * as ns from './x.js' — namespace re-export
  for (const m of content.matchAll(/export\s*\*\s*as\s+([A-Za-z0-9_$]+)\s+from\s*['"]([^'"]+)['"]/g)) {
    markConsumed(m);
    const target = resolveModule(absFile, m[2]);
    const inner = target ? getFileExports(target, visiting) : [];
    results.push({
      name: m[1],
      kind: 'namespace',
      params: '',
      doc: `Namespace re-export of ${m[2]}.`,
      file: relFile(absFile),
      children: inner,
    });
  }

  // export * from './x.js' — flatten target's exports into this file
  for (const m of content.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    markConsumed(m);
    const target = resolveModule(absFile, m[1]);
    if (target) results.push(...getFileExports(target, visiting));
  }

  // export { a, b as c } from './x.js'
  for (const m of content.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    markConsumed(m);
    const target = resolveModule(absFile, m[2]);
    const inner = target ? getFileExports(target, visiting) : [];
    for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
      const localName = asMatch ? asMatch[1] : part;
      const exportedName = asMatch ? asMatch[2] : part;
      const found = inner.find((e) => e.name === localName);
      if (found) results.push({ ...found, name: exportedName });
      else results.push({ name: exportedName, kind: 'unresolved', params: '', doc: `Re-exported from ${m[2]}.`, file: relFile(absFile) });
    }
  }

  // local imports, used to resolve bare `export { a as b };` (no `from`)
  const imports = new Map(); // localName -> { file, originalName }
  for (const m of content.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = resolveModule(absFile, m[2]);
    for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
      const originalName = asMatch ? asMatch[1] : part;
      const localName = asMatch ? asMatch[2] : part;
      imports.set(localName, { file: target, originalName });
    }
  }

  // bare export { a, b as c }; (no `from`) — only over content not already consumed above
  for (const m of content.matchAll(/export\s*\{([\s\S]*?)\}\s*;/g)) {
    if (isConsumed(m.index)) continue;
    for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const asMatch = part.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
      const localName = asMatch ? asMatch[1] : part;
      const exportedName = asMatch ? asMatch[2] : part;
      const direct = results.find((e) => e.name === localName);
      if (direct && direct.name !== exportedName) {
        results.push({ ...direct, name: exportedName });
        continue;
      }
      if (direct) continue; // already present under the same name
      const imp = imports.get(localName);
      if (imp?.file) {
        const inner = getFileExports(imp.file, visiting);
        const found = inner.find((e) => e.name === imp.originalName);
        if (found) { results.push({ ...found, name: exportedName }); continue; }
      }
      // Last resort: a same-file declaration with no `export` keyword of its
      // own (e.g. `function foo() {}` ... later `export { foo };`).
      const localDecl = findLocalDeclaration(content, localName);
      if (localDecl) {
        results.push({
          name: exportedName,
          kind: localDecl.kind,
          params: localDecl.params,
          doc: jsdocSummary(jsdocBefore(content, localDecl.index)),
          file: relFile(absFile),
        });
        continue;
      }
      results.push({ name: exportedName, kind: 'unresolved', params: '', doc: '', file: relFile(absFile) });
    }
  }

  visiting.delete(absFile);
  fileExportCache.set(absFile, results);
  return results;
}

/* --------------------------------------------------------- docs/api/*.md */

function parseDocEntries(mdContent) {
  const lines = mdContent.split('\n');
  const entries = [];
  let current = null;
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

  const flush = () => {
    if (current) entries.push(current);
    current = null;
  };

  for (const line of lines) {
    const heading = !inCode && line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flush();
      current = { level: heading[1].length, heading: heading[2].trim(), prose: [], code: [] };
      continue;
    }
    const fence = line.match(/^```(\S*)/);
    if (fence) {
      if (!inCode) { inCode = true; codeLang = fence[1]; codeLines = []; }
      else { inCode = false; if (current) current.code.push({ lang: codeLang, text: codeLines.join('\n') }); }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') continue; // markdown rule, not content
    if (current && trimmed) current.prose.push(trimmed);
  }
  flush();
  return entries;
}

function docHeadingKey(heading) {
  return heading.replace(/`/g, '').trim().toLowerCase();
}

/* --------------------------------------------------------- rendering */

function renderDocEntry(entry) {
  const headingKey = docHeadingKey(entry.heading);
  if (SKIP_HEADINGS.has(headingKey) || DIRECTIVE_HEADINGS.has(headingKey)) return '';
  const lead = '#'.repeat(Math.min(entry.level + 1, 5));
  let out = `${lead} ${entry.heading}\n`;
  if (entry.prose.length) out += truncate(entry.prose.join(' '), MAX_PROSE_CHARS) + '\n';
  if (entry.code.length) {
    const c = entry.code[0];
    out += '```' + (c.lang || '') + '\n' + truncateLines(c.text, MAX_CODE_LINES) + '\n```\n';
  }
  return out;
}

function renderSourceExport(pkgName, exp, indent = '') {
  const sig = exp.params !== '' || exp.kind.includes('function')
    ? `${exp.name}(${exp.params})`
    : exp.name;
  const importable = exp.kind !== 'class' && exp.kind !== 'namespace' && exp.name !== 'default';
  const imp = importable ? ` · \`import { ${exp.name} } from '${pkgName}';\`` : '';
  let out = `${indent}#### \`${sig}\` (${exp.kind})\n`;
  if (exp.doc) out += `${indent}${exp.doc}\n`;
  out += `${indent}${exp.file}${imp}\n`;
  if (exp.children?.length) {
    for (const child of exp.children) out += renderSourceExport(pkgName, child, indent + '  ');
  }
  return out;
}

/* --------------------------------------------------------------- main */

function loadDirectiveSection() {
  const runtimeDoc = readFileSync(join(DOCS_API_DIR, 'runtime.md'), 'utf8');
  const serverDoc = readFileSync(join(DOCS_API_DIR, 'server.md'), 'utf8');
  // Keep only the directive sub-entries themselves (level 3+ under "Template
  // Directives" in runtime.md) plus the two server.md sections — this is the
  // verbatim, source-verified directive reference (packages/runtime/src/
  // bind.js + hydrate.js; packages/server/src/render.js).
  const runtimeEntries = parseDocEntries(runtimeDoc);
  const startIdx = runtimeEntries.findIndex((e) => docHeadingKey(e.heading) === 'template directives');
  const directiveEntries = [];
  for (let i = startIdx + 1; i < runtimeEntries.length; i++) {
    if (runtimeEntries[i].level <= 2) break;
    directiveEntries.push(runtimeEntries[i]);
  }
  const serverEntries = parseDocEntries(serverDoc).filter((e) =>
    ['server-side directives', 'hydratable mode'].includes(docHeadingKey(e.heading)));

  let out = '## Template Directives\n\n';
  out += 'The complete directive syntax. Verified against packages/runtime/src/bind.js, ' +
    'packages/runtime/src/hydrate.js, and packages/server/src/render.js — client (`hydrate()`) ' +
    'and server (`render()`) implementations agree on all of these.\n\n';
  for (const e of directiveEntries) {
    out += `### ${e.heading}\n`;
    if (e.prose.length) out += e.prose.join(' ') + '\n';
    for (const c of e.code) out += '```' + (c.lang || '') + '\n' + truncateLines(c.text, MAX_CODE_LINES) + '\n```\n';
    out += '\n';
  }
  for (const e of serverEntries) {
    out += `### ${e.heading} (server)\n`;
    if (e.prose.length) out += truncate(e.prose.join(' '), MAX_PROSE_CHARS) + '\n';
    for (const c of e.code) out += '```' + (c.lang || '') + '\n' + truncateLines(c.text, MAX_CODE_LINES) + '\n```\n';
    out += '\n';
  }

  // Gap check: directive attribute names literally read via getAttribute/
  // hasAttribute in runtime+server source vs. names covered by the text
  // above. Anything present in source but absent from docs is a real,
  // mechanically-detected gap (not invented) — e.g. `@defer`.
  const src = readFileSync(join(ROOT, 'packages/runtime/src/hydrate.js'), 'utf8') +
    readFileSync(join(ROOT, 'packages/server/src/render.js'), 'utf8');
  const attrNames = new Set();
  for (const m of src.matchAll(/(?:getAttribute|hasAttribute)\('(@[a-zA-Z]+)'\)/g)) attrNames.add(m[1]);
  const covered = out.toLowerCase();

  return { text: out, directiveGaps: [...attrNames].filter((a) => !covered.includes(a)) };
}

function buildPackageData(entry) {
  const { dir, dirPath, pkg } = entry;
  const shortName = pkg.name.replace(/^@basenative\//, '');
  const docPath = join(DOCS_API_DIR, `${shortName}.md`);
  // runtime/server get their function APIs listed normally too (signal/computed/
  // effect/hydrate; render/renderToStream) — only the directive prose is hoisted.
  const hasDocForFns = existsSync(docPath);

  const subpaths = resolveExportSubpaths(pkg);
  const jsSubpaths = subpaths.filter((s) => extname(s.file) === '.js');
  const resourceSubpaths = subpaths.filter((s) => extname(s.file) !== '.js');

  const seenFiles = new Map(); // absFile -> exports[]
  const orderedFiles = [];
  for (const s of jsSubpaths) {
    const abs = join(dirPath, s.file);
    if (!existsSync(abs)) continue;
    if (!seenFiles.has(abs)) {
      seenFiles.set(abs, getFileExports(abs));
      orderedFiles.push(abs);
    }
  }

  // A symbol reached via more than one package.json export subpath (e.g. a
  // package exporting both `.` and `./renderer`, both surfacing `render`)
  // is one declaration, not two — dedupe by name+file so it's listed once.
  const dedupeSeen = new Set();
  const allExports = orderedFiles.flatMap((f) => seenFiles.get(f)).filter((e) => {
    const key = `${e.name}::${e.file}::${e.kind}`;
    if (dedupeSeen.has(key)) return false;
    dedupeSeen.add(key);
    return true;
  });
  const exportNames = [...new Set(allExports.map((e) => e.name).filter((n) => n !== 'default'))];

  let docText = '';
  let docEntries = [];
  if (hasDocForFns) {
    docText = readFileSync(docPath, 'utf8');
    docEntries = parseDocEntries(docText);
  }

  // Package-level description fallback: leading file comment on the main entry.
  let overview = pkg.description || '';
  const mainFile = jsSubpaths.find((s) => s.subpath === '.');
  if (mainFile) {
    const abs = join(dirPath, mainFile.file);
    if (existsSync(abs)) {
      const lead = leadingFileComment(readFileSync(abs, 'utf8'));
      if (lead && !hasDocForFns) overview = firstProseParagraph(lead, 320);
    }
  }

  return {
    dir, pkg, shortName, docPath, hasDoc: hasDocForFns,
    subpaths, resourceSubpaths, orderedFiles, seenFiles, allExports, exportNames,
    docText, docEntries, overview,
  };
}

function findExportGaps(data) {
  const gaps = [];
  if (!data.hasDoc) {
    if (data.exportNames.length) {
      gaps.push(`\`${data.pkg.name}\` — no docs/api/${data.shortName}.md; API below is extracted directly from source signatures/JSDoc only (${data.exportNames.length} exports).`);
    }
    return gaps;
  }
  const lowerDoc = data.docText.toLowerCase();
  for (const name of data.exportNames) {
    const re = new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`);
    if (!re.test(lowerDoc)) {
      const owner = data.allExports.find((e) => e.name === name);
      gaps.push(`\`${data.pkg.name}\`: \`${name}\` is exported (${owner?.file ?? 'unknown file'}) but not mentioned in docs/api/${data.shortName}.md.`);
    }
  }
  return gaps;
}

function findPhantomDirectiveClaims(entry) {
  const { dirPath, pkg } = entry;
  const m = pkg.description?.match(/@(\w+)\s+template directive/i);
  if (!m) return null;
  const directiveName = `@${m[1]}`;
  const srcDir = join(dirPath, 'src');
  let found = false;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { walk(join(d, e.name)); continue; }
      if (!e.name.endsWith('.js') || e.name.includes('.test.')) continue;
      const content = readFileSync(join(d, e.name), 'utf8');
      if (content.includes(`'${directiveName}'`) || content.includes(`"${directiveName}"`) || content.includes(`addDirective`)) found = true;
    }
  };
  if (existsSync(srcDir)) walk(srcDir);
  if (found) return null;
  return `\`${pkg.name}\`'s package.json description advertises a \`${directiveName}\` template directive, but no directive registration ` +
    `(\`addDirective\`/literal \`'${directiveName}'\` attribute handling) exists in packages/${entry.dir}/src — not documented here since it isn't in source.`;
}

function main() {
  const allEntries = listPackages();
  const publicEntries = allEntries.filter((e) => !e.pkg.private);
  const privateEntries = allEntries.filter((e) => e.pkg.private);

  /* ---------------------------------------------------------- llms.txt */

  const today = new Date().toISOString().slice(0, 10);
  let index = `# BaseNative — LLM Index\n\n`;
  index += `<!-- GENERATED by scripts/llms-txt.js — do not edit. Run \`node scripts/llms-txt.js\`. -->\n\n`;
  index += `Generated ${today} \u00b7 ${allEntries.length} packages (${publicEntries.length} public, ${privateEntries.length} private).\n`;
  index += `Full API surface: [llms-full.txt](./llms-full.txt). Each package's dedicated doc, where one exists, is linked below.\n\n`;
  index += `## Packages\n\n`;
  for (const e of allEntries) {
    const shortName = e.pkg.name.replace(/^@basenative\//, '');
    const docPath = join(DOCS_API_DIR, `${shortName}.md`);
    const link = e.pkg.private
      ? '(private)'
      : existsSync(docPath) ? `docs/api/${shortName}.md` : `packages/${e.dir}/src`;
    index += `- \`${e.pkg.name}\` v${e.pkg.version} \u2014 ${truncate(e.pkg.description || '', 100)} \u2192 ${link}\n`;
  }

  /* ------------------------------------------------------ llms-full.txt */

  const directives = loadDirectiveSection();

  let full = `# BaseNative — Full API Reference\n\n`;
  full += `<!-- GENERATED by scripts/llms-txt.js — do not edit. Run \`node scripts/llms-txt.js\`. -->\n\n`;
  full += `Generated ${today} from packages/*/package.json, packages/*/src exports, and docs/*.md. ` +
    `Covers all ${publicEntries.length} public packages (\`@basenative/fonts\` and \`@basenative/icons\` are private and excluded). ` +
    `Undocumented behavior is listed in Gaps, not invented.\n\n`;

  full += directives.text + '\n';

  const allGaps = [];
  if (directives.directiveGaps.length) {
    for (const d of directives.directiveGaps) {
      allGaps.push(`Directive \`${d}\` is read via getAttribute/hasAttribute in packages/runtime/src/hydrate.js and/or packages/server/src/render.js but is not covered by docs/api/runtime.md's "Template Directives" section or docs/api/server.md's server-side-directives section.`);
    }
  }

  full += `## Packages\n\n`;

  for (const entry of publicEntries) {
    const data = buildPackageData(entry);
    full += `### \`${data.pkg.name}\` (v${data.pkg.version})\n\n`;
    full += `${truncate(data.overview, 320)}\n\n`;
    full += `Source: \`packages/${data.dir}/src\``;
    if (data.hasDoc) full += ` \u00b7 Docs: \`docs/api/${data.shortName}.md\``;
    full += '\n\n';

    if (data.resourceSubpaths.length) {
      full += data.resourceSubpaths.map((s) => `- \`${s.subpath}\` \u2192 \`${s.file}\` (non-JS resource export)`).join('\n') + '\n\n';
    }

    if (data.hasDoc) {
      const denylisted = new Set([...SKIP_HEADINGS, ...DIRECTIVE_HEADINGS]);
      const skipForRuntimeServer = data.shortName === 'runtime' || data.shortName === 'server';
      for (const de of data.docEntries) {
        const key = docHeadingKey(de.heading);
        if (denylisted.has(key)) continue;
        if (skipForRuntimeServer && DIRECTIVE_HEADINGS.has(key)) continue;
        const rendered = renderDocEntry(de);
        if (rendered) full += rendered + '\n';
      }

      // Exports the doc prose never mentions still belong in "the complete
      // public API surface" — show them signature-only (no invented prose)
      // rather than silently dropping them; each is also logged in Gaps.
      const lowerDoc = data.docText.toLowerCase();
      const undocumented = data.allExports.filter((e) => {
        if (e.name === 'default' || e.kind === 'unresolved') return false;
        return !new RegExp(`\\b${escapeRegExp(e.name.toLowerCase())}\\b`).test(lowerDoc);
      });
      if (undocumented.length) {
        full += `#### Undocumented exports (source-only — not in docs/api/${data.shortName}.md)\n\n`;
        for (const exp of undocumented) full += renderSourceExport(data.pkg.name, exp) + '\n';
      }
    } else if (data.allExports.length) {
      for (const exp of data.allExports) {
        full += renderSourceExport(data.pkg.name, exp) + '\n';
      }
    } else {
      full += '_(no JS exports found — resource-only or config-only package; see exports map above.)_\n\n';
    }

    allGaps.push(...findExportGaps(data));
    const phantom = findPhantomDirectiveClaims(entry);
    if (phantom) allGaps.push(phantom);
  }

  full += `## Gaps\n\n`;
  full += `Everything below is a real, mechanically-detected gap between source/package.json and docs — not inferred behavior. ` +
    `Fix by writing the missing doc, then re-running this generator (it will pick the doc up automatically).\n\n`;
  if (allGaps.length === 0) {
    full += '_(none detected)_\n';
  } else {
    for (const g of allGaps) full += `- ${g}\n`;
  }

  if (privateEntries.length) {
    full += `\n_Private packages excluded from this reference: ${privateEntries.map((e) => `\`${e.pkg.name}\``).join(', ')}._\n`;
  }

  /* ------------------------------------------------------------- write */

  if (process.argv.includes('--check')) {
    const strip = (s) => s.replace(/^Generated \d{4}-\d{2}-\d{2}.*$/m, '');
    let curIndex = '', curFull = '';
    try { curIndex = readFileSync(OUT_INDEX, 'utf8'); } catch { /* missing counts as stale */ }
    try { curFull = readFileSync(OUT_FULL, 'utf8'); } catch { /* missing counts as stale */ }
    const staleIndex = strip(curIndex) !== strip(index);
    const staleFull = strip(curFull) !== strip(full);
    if (staleIndex || staleFull) {
      if (staleIndex) console.error('llms.txt is stale');
      if (staleFull) console.error('llms-full.txt is stale');
      console.error('run: node scripts/llms-txt.js');
      process.exit(1);
    }
    console.log('llms.txt and llms-full.txt are current');
  } else {
    writeFileSync(OUT_INDEX, index);
    writeFileSync(OUT_FULL, full);
    console.log(`wrote ${OUT_INDEX} (${index.length} chars, ~${Math.ceil(index.length / 4)} tokens)`);
    console.log(`wrote ${OUT_FULL} (${full.length} chars, ~${Math.ceil(full.length / 4)} tokens)`);
  }
}

main();
