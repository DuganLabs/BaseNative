/**
 * One component per pattern on the site.
 *
 *   node scripts/site-composition.js
 *
 * Fails when a route view hand-rolls a component (a class or style
 * attribute), when the shell loads builder CSS on every page, when the
 * playground loads a second component sheet, when a second highlighter
 * appears, or when site CSS paints a component variant (colour, type,
 * padding, radius) instead of composing it.
 *
 * styles.css is the site's page layout: section rhythm, the catalog
 * grid, compare's editorial tones. playground.css is the editor's
 * geometry (gutter, textarea overlay, result frame). Neither file may
 * paint a component's own variant.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const viewsDir = join(root, 'examples/express/views');
for (const name of readdirSync(viewsDir)) {
  if (!name.endsWith('.html')) continue;
  const text = read(`examples/express/views/${name}`);
  if (/<[a-zA-Z][^>]*\sstyle\s*=/.test(text)) {
    problems.push(`examples/express/views/${name}: a style attribute`);
  }
  if (/<[a-zA-Z][^>]*\sclass\s*=/.test(text)) {
    problems.push(`examples/express/views/${name}: a class attribute`);
  }
}

const layout = read('examples/express/views/layout.html');
if (layout.includes('builder.css')) {
  problems.push('layout.html links builder.css on every page');
}
const playgroundView = read('examples/express/views/playground.html');
if (playgroundView.includes('components.css')) {
  problems.push('playground.html links a second component sheet');
}

const page = read('examples/express/page.js');
if (!page.includes("path === '/builder'") || !page.includes('builder.css')) {
  problems.push('page.js does not limit builder.css to /builder');
}

const engine = 'examples/express/public/highlight-engine.js';
function walkJs(dir, out) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) continue;
    try {
      const st = readFileSync(abs);
      if (st.includes(0)) continue;
    } catch {
      continue;
    }
    if (name.endsWith('.js')) out.push(abs);
  }
}
const jsFiles = [];
walkJs(join(root, 'examples/express'), jsFiles);
for (const abs of jsFiles) {
  const rel = abs.slice(root.length + 1);
  if (rel === engine) continue;
  const text = readFileSync(abs, 'utf8');
  if (/function hlHTML|const MARK\s*=/.test(text)) {
    problems.push(`${rel}: a second highlighter`);
  }
}

const PAINT =
  /(?:^|[{;])\s*(?:color|background|background-color|font-size|font-weight|padding|border-radius)\s*:/;
for (const rel of [
  'examples/express/public/styles.css',
  'examples/express/public/playground.css',
]) {
  const text = read(rel);
  if (/\.kw\s*\{|\.tk-/.test(text)) problems.push(`${rel}: a second highlight vocabulary`);
  const stripped = text.replace(/:not\(\[variant\]\)/g, '');
  if (/\[variant[=\]]/.test(stripped) && PAINT.test(text)) {
    const blocks = stripped.split('}');
    for (const block of blocks) {
      if (!/\[variant[=\]]/.test(block)) continue;
      if (!PAINT.test(block)) continue;
      const head = (block.match(/[^{]*\[variant[^\]]*\][^{]*/) || [block.slice(0, 80)])[0]
        .replace(/\s+/g, ' ')
        .trim()
        .slice(-120);
      problems.push(`${rel}: paints a component variant (${head})`);
    }
  }
}

const sidebar = read('packages/components/src/sidebar/styles.css');
if (sidebar.includes("variant='chips'") || sidebar.includes('variant="chips"')) {
  problems.push('sidebar still styles a chips variant');
}

if (problems.length) {
  console.error(`${problems.length} site composition failure(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('site composition passed');
