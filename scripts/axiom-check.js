/**
 * Constitution check for @basenative/platform and the basenative.com site.
 *
 * Hard failures: the platform package, plus site files that have been rebuilt
 * onto the Apple 27 shell (see ENFORCED). Everything else is ratcheted by
 * scripts/axiom-baseline.json — a count may fall, and a rise fails the run.
 *
 *   node scripts/axiom-check.js            # fail on regressions
 *   node scripts/axiom-check.js --report   # print counts, exit 0
 *   node scripts/axiom-check.js --write-baseline
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'scripts', 'axiom-baseline.json');

/** Zero-tolerance paths. A violation here fails even when a baseline exists. */
export const ENFORCED = [
  'packages/platform/',
  'examples/express/views/layout.html',
  'examples/express/views/home.html',
  'examples/express/shell.js',
  'examples/express/public/platform-shell.css',
  'examples/express/public/platform-shell.js',
  'examples/express/page.js',
];

const SKIP_FILE = new Set([
  'examples/express/public/basenative.js',
  'examples/express/public/builder.js',
]);

const KINDS = [
  'custom-element',
  'inline-style',
  'style-write',
  'css-outside-layer',
  'div-span',
  'control-flow',
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

function files() {
  const found = [];
  walk(join(root, 'packages', 'platform'), found);
  walk(join(root, 'examples', 'express'), found);
  return found.filter((abs) => {
    const rel = relative(root, abs).split('\\').join('/');
    if (SKIP_FILE.has(rel)) return false;
    if (rel.endsWith('.test.js') || rel.endsWith('.test.mjs')) return false;
    return /\.(js|css|html)$/.test(rel);
  });
}

function lineNo(text, index) {
  return text.slice(0, index).split('\n').length;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Top-level CSS rules that are not inside an `@layer` block. */
function unlayeredCss(css) {
  const s = stripComments(css);
  let brace = 0;
  const layers = [];
  const hits = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '{') {
      if (opensLayer(s, i)) layers.push(brace);
      else if (!layers.length && isRuleOpen(s, i)) hits.push(lineNo(s, i));
      brace++;
      continue;
    }
    if (c === '}') {
      brace = Math.max(0, brace - 1);
      if (layers.length && layers[layers.length - 1] === brace) layers.pop();
    }
  }
  return hits;
}

function opensLayer(s, braceAt) {
  let i = braceAt - 1;
  while (i >= 0 && s[i] !== '{' && s[i] !== '}' && s[i] !== ';') i--;
  return /@layer\b/.test(s.slice(i + 1, braceAt));
}

function isRuleOpen(s, braceAt) {
  let i = braceAt - 1;
  while (i >= 0 && /\s/.test(s[i])) i--;
  if (i < 0) return false;
  // `@layer a, b;` has no brace. `@import` and `@charset` have no brace.
  const lineStart = s.lastIndexOf('\n', i) + 1;
  const prelude = s.slice(lineStart, braceAt);
  if (/@import\b|@charset\b|@layer\b/.test(prelude)) return false;
  return true;
}

function styleBlocks(html) {
  const blocks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) blocks.push({ css: m[1], at: m.index + m[0].indexOf(m[1]) });
  return blocks;
}

/** `@if` / `@for` as an attribute, not as text inside a quoted value. */
function controlFlowAttr(attrs) {
  let quote = '';
  for (let i = 0; i < attrs.length; i++) {
    const c = attrs[i];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '@') {
      const name = /^[A-Za-z]+/.exec(attrs.slice(i + 1));
      if (name && /^(if|for|else|switch|case|empty|default)$/.test(name[0])) return true;
    }
  }
  return false;
}

function explained(lines, index) {
  const line = lines[index];
  const prev = lines[index - 1] || '';
  return /<!--\s*\S/.test(line) || /\/\/\s*\S/.test(line) || /<!--\s*\S/.test(prev) || /\/\/\s*\S/.test(prev) || /\/\*\s*\S/.test(prev);
}

export function scanText(rel, text) {
  const violations = [];
  const add = (kind, line, detail) => violations.push({ file: rel, kind, line, detail });
  const lines = text.split('\n');

  if (rel.endsWith('.css')) {
    for (const line of unlayeredCss(text)) {
      add('css-outside-layer', line, 'rule sits outside @layer');
    }
    return violations;
  }

  const commentStripped = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  let m;
  const custom = /<([a-z][a-z0-9]*-[a-z0-9-]*)\b/gi;
  while ((m = custom.exec(commentStripped))) {
    add('custom-element', lineNo(commentStripped, m.index), `<${m[1]}>`);
  }
  if (/customElements\s*\.\s*define\s*\(/.test(commentStripped)) {
    add('custom-element', 1, 'customElements.define');
  }

  // `style=` and `:style=` as written in markup. A spaced `style =` is a
  // JavaScript binding (`const style = …`), not an inline style.
  const inline = /(?:^|[^\w-])(?::style|style)=/gi;
  while ((m = inline.exec(commentStripped))) {
    const token = commentStripped.slice(m.index, m.index + 24);
    if (/font-style\s*:/.test(token)) continue;
    add('inline-style', lineNo(commentStripped, m.index), token.trim());
  }

  const writes = /\.style\s*(?:\.|\[|=)/g;
  while ((m = writes.exec(commentStripped))) {
    add('style-write', lineNo(commentStripped, m.index), commentStripped.slice(m.index, m.index + 32).trim());
  }

  lines.forEach((line, i) => {
    if (/<(div|span)\b/i.test(line) && !explained(lines, i)) {
      const which = /<div\b/i.test(line) ? 'div' : 'span';
      add('div-span', i + 1, `<${which}> without an explanation on this line or the one above`);
    }
  });

  const tags = /<([a-zA-Z][\w:-]*)(\s[^<>]*?)?>/g;
  while ((m = tags.exec(commentStripped))) {
    const name = m[1].toLowerCase();
    if (name === 'template' || !m[2]) continue;
    if (controlFlowAttr(m[2])) {
      add('control-flow', lineNo(commentStripped, m.index), `@ control flow on <${name}>`);
    }
  }

  if (rel.endsWith('.html')) {
    for (const block of styleBlocks(text)) {
      for (const line of unlayeredCss(block.css)) {
        add('css-outside-layer', lineNo(text, block.at) + line - 1, 'style block rule sits outside @layer');
      }
    }
  }

  return violations;
}

export function scanRepo() {
  const all = [];
  for (const abs of files()) {
    const rel = relative(root, abs).split('\\').join('/');
    all.push(...scanText(rel, readFileSync(abs, 'utf8')));
  }
  return all;
}

export function enforced(rel) {
  return ENFORCED.some((prefix) => rel === prefix || rel.startsWith(prefix));
}

function countsOf(list) {
  const byFile = {};
  for (const hit of list) {
    byFile[hit.file] ??= Object.fromEntries(KINDS.map((k) => [k, 0]));
    byFile[hit.file][hit.kind]++;
  }
  return byFile;
}

function total(list) {
  const t = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const hit of list) t[hit.kind]++;
  t.all = list.length;
  return t;
}

function readBaseline() {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function check(violations) {
  const problems = [];
  const byFile = countsOf(violations);
  for (const [file, counts] of Object.entries(byFile)) {
    if (!enforced(file)) continue;
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    if (n) problems.push(`${file}: ${n} axiom violation(s) on an enforced path`);
  }
  const baseline = readBaseline();
  const seen = new Set();
  for (const [file, counts] of Object.entries(byFile)) {
    if (enforced(file)) continue;
    seen.add(file);
    const allowed = baseline[file];
    if (!allowed) {
      problems.push(`${file}: new file with axiom violations and no baseline entry`);
      continue;
    }
    for (const kind of KINDS) {
      if ((counts[kind] || 0) > (allowed[kind] || 0)) {
        problems.push(
          `${file}: ${kind} rose from ${allowed[kind] || 0} to ${counts[kind]}`,
        );
      }
    }
  }
  return problems;
}

function report(violations) {
  const t = total(violations);
  console.log(JSON.stringify(t, null, 2));
  const byFile = countsOf(violations);
  const ranked = Object.entries(byFile)
    .map(([file, counts]) => [file, Object.values(counts).reduce((a, b) => a + b, 0)])
    .sort((a, b) => b[1] - a[1]);
  for (const [file, n] of ranked) console.log(`${n}\t${file}`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const argv = process.argv.slice(2);
  const violations = scanRepo();
  if (argv.includes('--report')) {
    report(violations);
  } else if (argv.includes('--write-baseline')) {
    const byFile = countsOf(violations.filter((hit) => !enforced(hit.file)));
    const ordered = Object.fromEntries(
      Object.keys(byFile)
        .sort()
        .map((file) => [file, byFile[file]]),
    );
    writeFileSync(baselinePath, `${JSON.stringify(ordered, null, 2)}\n`);
    console.log(`wrote ${Object.keys(ordered).length} files to scripts/axiom-baseline.json`);
  } else {
    report(violations);
    const problems = check(violations);
    if (problems.length) {
      console.error(`\n${problems.length} axiom check failure(s):`);
      for (const problem of problems) console.error(`  ${problem}`);
      process.exit(1);
    }
    console.log('\naxiom check passed');
  }
}
