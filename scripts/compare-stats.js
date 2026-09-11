/**
 * Derives every BaseNative number claimed on /compare directly from source.
 *
 * This page's whole pitch is honesty, so none of its numbers may be typed by
 * hand. `computeCompareStats()` measures them from the repository on each
 * build and `examples/express/views/compare.html` renders only `{{ }}`
 * bindings against the result — there is no literal in the view to go stale.
 *
 *   node scripts/compare-stats.js           print the derived numbers
 *   node scripts/compare-stats.js --check   fail if the page disagrees with source
 *
 * `--check` runs from `scripts/build-pages.js` and from the cross-package
 * integration suite, so a claim that stops being true breaks the build rather
 * than shipping.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findPackage, measure, THRESHOLDS } from './bundle-size.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf-8');
const readJson = (...parts) => JSON.parse(read(...parts));

/**
 * Competitor runtime sizes, min+gzip, in KB.
 *
 * These are the only figures on the page that cannot come from this
 * repository. They are recorded here with their source and the date they were
 * checked so they can be re-verified, and every ratio the page shows is
 * computed from them against BaseNative's *measured* size — so a ratio can
 * never drift away from the runtime it is comparing.
 */
export const COMPETITORS = {
  react: {
    label: 'React 19',
    runtimeGzipKb: 44,
    source: 'react@19 + react-dom@19 production ESM builds, min+gzip',
    checked: '2026-09-11',
  },
  angular: {
    label: 'Angular 19',
    runtimeGzipKb: 130,
    source: 'Angular 19 hello-world production AOT bundle, min+gzip',
    checked: '2026-09-11',
  },
  svelte: {
    label: 'Svelte 5',
    runtimeGzipKb: 5,
    source: 'Svelte 5 client runtime shipped with a compiled app, min+gzip',
    checked: '2026-09-11',
  },
};

/**
 * The core API the page counts as "primitives to learn". Each entry names the
 * module that must actually export it — a rename or removal fails the count
 * rather than quietly leaving the page claiming a number that no longer maps
 * onto anything.
 */
const CORE_PRIMITIVES = [
  { name: 'signal', module: 'packages/runtime/src/signals.js' },
  { name: 'computed', module: 'packages/runtime/src/signals.js' },
  { name: 'effect', module: 'packages/runtime/src/signals.js' },
  { name: 'batch', module: 'packages/runtime/src/signals.js' },
  { name: 'hydrate', module: 'packages/runtime/src/hydrate.js' },
  { name: 'render', module: 'packages/server/src/render.js' },
];

/** The lazy-hydration strategies the page claims are built in. */
const HYDRATION_STRATEGIES = [
  { name: 'idle', export: 'hydrateOnIdle' },
  { name: 'interaction', export: 'hydrateOnInteraction' },
  { name: 'media', export: 'hydrateOnMedia' },
  { name: 'viewport', export: 'lazyHydrate' },
];

/** The file the page calls "the reactivity core". */
const CORE_MODULE = 'packages/runtime/src/signals.js';

/** Count lines the way `wc -l` does, so a quoted figure can be checked by hand. */
function countLines(...parts) {
  const text = read(...parts);
  let lines = 0;
  for (const char of text) if (char === '\n') lines += 1;
  return lines;
}

/** Every shipped (non-test) .js file under a package's src/. */
function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    if (statSync(absolute).isDirectory()) sourceFiles(absolute, out);
    else if (entry.endsWith('.js') && !entry.includes('.test.') && !entry.includes('.fuzz.')) {
      out.push(absolute);
    }
  }
  return out;
}

/** Assert `file` exports `name`, and return it. */
function requireExport(file, name) {
  const source = read(file);
  const patterns = [
    new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`, 'm'),
    new RegExp(`^export\\s+(?:const|let|class)\\s+${name}\\b`, 'm'),
    new RegExp(`^export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`, 'm'),
  ];
  if (!patterns.some((pattern) => pattern.test(source))) {
    throw new Error(
      `/compare counts \`${name}\` as a core primitive but ${file} no longer exports it. ` +
        `Update CORE_PRIMITIVES in scripts/compare-stats.js to match the real API.`,
    );
  }
  return name;
}

/** Workspace package directories, with their parsed package.json. */
function workspacePackages() {
  return readdirSync(join(root, 'packages'))
    .map((dir) => {
      try {
        return { dir, pkg: readJson('packages', dir, 'package.json') };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Production dependencies on code outside the workspace, across published
 * packages. Workspace siblings are excluded: `@basenative/server` depending on
 * `@basenative/runtime` is not a third-party dependency, and counting it would
 * make the number meaningless.
 */
function externalProductionDeps() {
  const byPackage = [];
  for (const { pkg } of workspacePackages()) {
    if (pkg.private === true) continue;
    const external = Object.keys(pkg.dependencies || {}).filter(
      (name) => !name.startsWith('@basenative/'),
    );
    if (external.length) byPackage.push({ name: pkg.name, deps: external.sort() });
  }
  byPackage.sort((a, b) => a.name.localeCompare(b.name));
  const unique = new Set(byPackage.flatMap((entry) => entry.deps));
  return { byPackage, total: unique.size, packageCount: byPackage.length };
}

/**
 * Build steps the core runtime requires before it can be imported.
 *
 * Zero is a claim about how the package ships, so it is checked against how the
 * package actually ships: every `exports` target must resolve into `src/`
 * (published source, not a build artifact) and the project must declare no
 * build/bundle/compile target.
 */
function coreBuildSteps() {
  const pkg = readJson('packages', 'runtime', 'package.json');
  const targets = Object.values(pkg.exports || {}).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.values(entry),
  );
  const built = targets.filter((target) => target.endsWith('.js') && !target.startsWith('./src/'));
  if (built.length) {
    throw new Error(
      `/compare claims @basenative/runtime needs no build step, but its exports point at ` +
        `${built.join(', ')} rather than ./src/. Either the package now ships a build artifact ` +
        `or the exports map is wrong.`,
    );
  }

  const project = readJson('packages', 'runtime', 'project.json');
  const buildTargets = Object.keys(project.targets || {}).filter((name) =>
    /^(build|bundle|compile|tsc)$/.test(name),
  );
  if (buildTargets.length) {
    throw new Error(
      `/compare claims @basenative/runtime needs no build step, but packages/runtime/project.json ` +
        `declares a ${buildTargets.join(', ')} target.`,
    );
  }
  return 0;
}

/** Round to one decimal, dropping a trailing `.0` so "5 KB" does not read "5.0 KB". */
const oneDecimal = (value) => String(Math.round(value * 10) / 10);

/**
 * Measure every number /compare asserts about BaseNative.
 *
 * Throws rather than returning a wrong value: a claim that can no longer be
 * substantiated must break the build, not render.
 */
export function computeCompareStats() {
  const coreLines = countLines(CORE_MODULE);

  for (const primitive of CORE_PRIMITIVES) requireExport(primitive.module, primitive.name);
  const runtimeIndex = read('packages/runtime/src/index.js');
  for (const strategy of HYDRATION_STRATEGIES) {
    if (!new RegExp(`\\b${strategy.export}\\b`).test(runtimeIndex)) {
      throw new Error(
        `/compare claims a built-in "${strategy.name}" hydration strategy, but ` +
          `packages/runtime/src/index.js does not export ${strategy.export}.`,
      );
    }
  }

  const runtimePkg = readJson('packages', 'runtime', 'package.json');
  const runtimeProdDeps = Object.keys(runtimePkg.dependencies || {}).length;
  const runtimePeerDeps = Object.keys(runtimePkg.peerDependencies || {}).length;
  if (runtimeProdDeps !== 0 || runtimePeerDeps !== 0) {
    throw new Error(
      `/compare's central claim is that @basenative/runtime has zero production dependencies, ` +
        `but it now declares ${runtimeProdDeps} dependencies and ${runtimePeerDeps} peerDependencies. ` +
        `Remove them or rewrite the claim — do not let the page keep saying zero.`,
    );
  }

  const external = externalProductionDeps();
  const buildSteps = coreBuildSteps();

  const runtimeBytes = measure(findPackage('@basenative/runtime')).gzip;
  const runtimeGzipKb = runtimeBytes / 1024;
  const runtimeBudgetKb = THRESHOLDS['@basenative/runtime'] / 1024;

  const runtimeSourceLines = sourceFiles(join(root, 'packages/runtime/src')).reduce(
    (total, file) => total + countLines(relative(root, file)),
    0,
  );

  const ratio = (competitor) => oneDecimal(COMPETITORS[competitor].runtimeGzipKb / runtimeGzipKb);

  return {
    coreModule: CORE_MODULE,
    coreLines,
    corePrimitives: CORE_PRIMITIVES.length,
    corePrimitiveNames: CORE_PRIMITIVES.map((p) => `${p.name}()`).join(', '),
    runtimeProdDeps,
    externalProdDeps: external.total,
    externalProdDepPackages: external.packageCount,
    externalProdDepDetail: external.byPackage,
    buildSteps,
    runtimeGzipBytes: runtimeBytes,
    runtimeGzipKb: oneDecimal(runtimeGzipKb),
    runtimeBudgetKb: oneDecimal(runtimeBudgetKb),
    runtimeSourceLines: runtimeSourceLines.toLocaleString('en-US'),
    hydrationStrategies: HYDRATION_STRATEGIES.length,
    hydrationStrategyNames: HYDRATION_STRATEGIES.map((s) => s.name).join(', '),
    smallerThanReact: ratio('react'),
    smallerThanAngular: ratio('angular'),
    reactGzipKb: oneDecimal(COMPETITORS.react.runtimeGzipKb),
    angularGzipKb: oneDecimal(COMPETITORS.angular.runtimeGzipKb),
    svelteGzipKb: oneDecimal(COMPETITORS.svelte.runtimeGzipKb),
  };
}

/**
 * Every derived value that must appear verbatim in the rendered page, paired
 * with the `{{ }}` binding the view is required to use for it.
 *
 * The view is checked for the binding and the rendered HTML for the value, so
 * neither a hand-typed number in the template nor a stale measurement can pass.
 * `scripts/check-compare-page.js` does the checking — it cannot live here,
 * because rendering the page imports site-data.js, which imports this module.
 */
export const RENDERED_CLAIMS = [
  'coreLines',
  'corePrimitives',
  'runtimeProdDeps',
  'externalProdDeps',
  'buildSteps',
  'runtimeGzipKb',
  'runtimeSourceLines',
  'hydrationStrategies',
  'smallerThanReact',
  'smallerThanAngular',
  'reactGzipKb',
  'angularGzipKb',
  'svelteGzipKb',
];

/** The view whose every BaseNative number must be a binding, not a literal. */
export const COMPARE_VIEW = 'examples/express/views/compare.html';

/** Read a repo-relative file. Exported so the checker reads through one path helper. */
export const readRepoFile = read;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stats = computeCompareStats();
  const width = Math.max(...Object.keys(stats).map((key) => key.length));
  for (const [key, value] of Object.entries(stats)) {
    if (key === 'externalProdDepDetail') continue;
    console.log(`${key.padEnd(width)}  ${value}`);
  }
  console.log('\nExternal production dependencies, by published package:');
  for (const entry of stats.externalProdDepDetail) {
    console.log(`  ${entry.name}  ${entry.deps.join(', ')}`);
  }
}
