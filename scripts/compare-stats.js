/**
 * Derives every BaseNative number claimed on /compare directly from source.
 *
 * This page's whole pitch is honesty, so none of its numbers may be typed by
 * hand. `computeCompareStats()` measures them from the repository on each
 * build and `examples/express/views/compare.html` renders only `{{ }}`
 * bindings against the result (the tables are composed from the same object
 * in `examples/express/compare-tables.js`) — there is no literal to go stale.
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
 * Competitor figures, re-measured 2026-10-20.
 *
 * These are the only figures on the page that cannot come from this
 * repository. Each is the JavaScript a minimal hello-world app actually
 * ships, measured through the framework's own production pipeline on one
 * machine (Node v24.20.0), min+gzip:
 *
 *   React   — a createRoot hello-world bundled with esbuild from the
 *             production builds of react + react-dom (the client renderer
 *             included; the often-quoted smaller figure measures the
 *             react-dom API package without it).
 *   Angular — the default app @angular/cli scaffolds (zoneless by
 *             default in 22), production build, initial JS. Re-measured
 *             2026-10-24 (@angular/cli 22.2.4): the current default
 *             scaffold ships no zone.js polyfills chunk at all, so the
 *             initial JS measures 40.4 KB — the 65.7 KB recorded on
 *             2026-10-20 is consistent with a scaffold that still
 *             carried one. React and Svelte re-measured identical the
 *             same day.
 *   Svelte  — a minimal counter app built with Vite; Svelte has no fixed
 *             runtime, its compiler ships only what the app uses, so the
 *             figure is the shipped bundle of that app.
 *
 * The dependency counts are the production dependencies of that same
 * hello-world app, and the source-line counts are the shipped,
 * unminified production runtime source a reader can open (React: the
 * react, react-dom/client and scheduler production files; Angular: the
 * fesm bundles of @angular/core, common, platform-browser and router;
 * Svelte: src/internal/client in the published package).
 *
 * Every side carries the date it was checked, and computeCompareStats()
 * refuses to render when the dates differ — a refresh must re-measure
 * all three sides or none, so the page can never pair a fresh BaseNative
 * number with a stale competitor number. Every ratio the page shows is
 * computed from these figures against BaseNative's *measured* size.
 */
export const COMPETITORS = {
  react: {
    name: 'React',
    label: 'React 19',
    version: '19.3.1',
    runtimeGzipKb: 67.5,
    sourceLines: '20K',
    deps: '2 (react, react-dom)',
    source: 'react@19.3.1 + react-dom@19.3.1 hello-world (createRoot), esbuild production bundle, min+gzip',
    checked: '2026-10-24',
  },
  angular: {
    name: 'Angular',
    label: 'Angular 22',
    version: '22.2.3',
    runtimeGzipKb: 40.4,
    sourceLines: '51K',
    deps: '8 (@angular/* ×6, rxjs, tslib)',
    source: '@angular/cli@22.2.4 default new app (zoneless, no polyfills chunk), production build initial JS, min+gzip',
    checked: '2026-10-24',
  },
  svelte: {
    name: 'Svelte',
    label: 'Svelte 5',
    version: '5.57.2',
    runtimeGzipKb: 9.9,
    sourceLines: '16K',
    deps: '0',
    source: 'svelte@5.57.2 minimal counter app, Vite production build, min+gzip',
    checked: '2026-10-24',
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
export function workspacePackages() {
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

/**
 * `eval` and `Function`-constructor uses in the shipped runtime and server
 * source — the page's CSP claim, counted rather than asserted.
 *
 * BaseNative's expression language is interpreted by a hand-written parser,
 * so a template can be data (from a CMS, a database, a model) without ever
 * becoming code, and pages run under a strict CSP with no 'unsafe-eval'.
 * That claim is exactly as strong as this count: if a future change ever
 * reaches for eval, the count moves and the build breaks instead of the
 * page quietly lying.
 */
function unsafeEvalUses() {
  const pattern = /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/g;
  let count = 0;
  for (const pkg of ['runtime', 'server']) {
    for (const file of sourceFiles(join(root, 'packages', pkg, 'src'))) {
      count += (readFileSync(file, 'utf-8').match(pattern) || []).length;
    }
  }
  if (count !== 0) {
    throw new Error(
      `/compare claims BaseNative needs no 'unsafe-eval', but the shipped runtime and ` +
        `server source contain ${count} eval/Function-constructor use(s). Remove them, ` +
        `or rewrite the claim — do not let the page keep saying zero.`,
    );
  }
  return count;
}

/** Round to one decimal, dropping a trailing `.0` so "5 KB" does not read "5.0 KB". */
const oneDecimal = (value) => String(Math.round(value * 10) / 10);

/** The recorded results of the LLM-authoring benchmark /compare cites. */
const LLM_BENCHMARK_RESULTS = 'benchmarks/llm/results.json';

/**
 * The LLM-authoring benchmark (October 2026): one model wrote the same two
 * apps in BaseNative and in React against identical behavior tests, with
 * every fix logged. The numbers are read from the committed results file,
 * never retyped, so the page cannot drift away from the run it cites. A
 * missing or reshaped results file throws — an unsubstantiated claim must
 * break the build, not render. The full record (method, per-fix log) sits
 * beside the results in benchmarks/llm/.
 */
function llmBenchmark() {
  let results;
  try {
    results = readJson(LLM_BENCHMARK_RESULTS);
  } catch {
    throw new Error(
      `/compare cites the LLM-authoring benchmark but ${LLM_BENCHMARK_RESULTS} is missing or ` +
        `unreadable. Restore the recorded results or remove the section — do not let the page ` +
        `cite a run it cannot show.`,
    );
  }
  const tasks = Object.values(results.tasks || {});
  const sum = (side, field) =>
    tasks.reduce((total, task) => total + (task[side]?.[field] ?? NaN), 0);
  const stats = {
    benchBnLines: results.totals?.basenativeLinesBothTasks,
    benchReactLines: results.totals?.reactLinesBothTasks,
    benchBnTokens: results.totals?.basenativeCodeTokensBothTasks,
    benchReactTokens: results.totals?.reactCodeTokensBothTasks,
    benchBnToolingFixes: sum('basenative', 'harnessFixIterations'),
    benchReactToolingFixes: sum('react', 'harnessFixIterations'),
    benchBnAppFixes: sum('basenative', 'appCodeFixIterations'),
    benchReactAppFixes: sum('react', 'appCodeFixIterations'),
    benchBnDeps: results.tasks?.task2_interactive_reactive?.basenative?.productionDependencyCount,
    benchReactDeps: results.tasks?.task2_interactive_reactive?.react?.productionDependencyCount,
    benchDocsTokens: results.agentDocsBundle?.approxTokens,
    benchBnVersion: String(results.versions?.basenativeRuntime || '').split(' ')[0],
    benchReactVersion: results.versions?.react,
    benchRunDate: String(results.generatedAt || '').slice(0, 10),
  };
  for (const [key, value] of Object.entries(stats)) {
    if (value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value))) {
      throw new Error(
        `/compare cites the LLM-authoring benchmark but ${LLM_BENCHMARK_RESULTS} no longer ` +
          `yields ${key}. Update llmBenchmark() in scripts/compare-stats.js to match the ` +
          `recorded results.`,
      );
    }
  }
  stats.benchDocsTokens = stats.benchDocsTokens.toLocaleString('en-US');
  return stats;
}

/**
 * Measure every number /compare asserts about BaseNative.
 *
 * Throws rather than returning a wrong value: a claim that can no longer be
 * substantiated must break the build, not render.
 */
export function computeCompareStats() {
  const benchmark = llmBenchmark();
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

  // A competitor refresh must land all three sides together. If one entry
  // was re-measured and the others were not, the page would pair a fresh
  // number with stale ones — the exact failure this file exists to prevent.
  const checkedDates = new Set(Object.values(COMPETITORS).map((c) => c.checked));
  if (checkedDates.size !== 1) {
    throw new Error(
      `/compare's competitor figures were checked on different dates ` +
        `(${[...checkedDates].join(', ')}). Re-measure React, Angular and Svelte ` +
        `together and give them one checked date in COMPETITORS (scripts/compare-stats.js).`,
    );
  }
  const competitorVersions = Object.values(COMPETITORS)
    .map((c) => `${c.name} ${c.version}`)
    .join(' · ');

  return {
    ...benchmark,
    coreModule: CORE_MODULE,
    coreLines,
    publicPackages: workspacePackages().filter(({ pkg }) => pkg.private !== true).length,
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
    reactLabel: COMPETITORS.react.label,
    angularLabel: COMPETITORS.angular.label,
    svelteLabel: COMPETITORS.svelte.label,
    reactSourceLines: COMPETITORS.react.sourceLines,
    angularSourceLines: COMPETITORS.angular.sourceLines,
    svelteSourceLines: COMPETITORS.svelte.sourceLines,
    reactDeps: COMPETITORS.react.deps,
    angularDeps: COMPETITORS.angular.deps,
    svelteDeps: COMPETITORS.svelte.deps,
    competitorVersions,
    competitorsChecked: [...checkedDates][0],
    unsafeEvalUses: unsafeEvalUses(),
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
  'benchBnLines',
  'benchReactLines',
  'benchBnTokens',
  'benchReactTokens',
  'benchBnToolingFixes',
  'benchReactToolingFixes',
  'benchBnAppFixes',
  'benchReactAppFixes',
  'benchBnDeps',
  'benchReactDeps',
  'benchDocsTokens',
  'benchBnVersion',
  'benchReactVersion',
  'benchRunDate',
  'reactLabel',
  'angularLabel',
  'svelteLabel',
  'reactSourceLines',
  'angularSourceLines',
  'svelteSourceLines',
  'reactDeps',
  'angularDeps',
  'svelteDeps',
  'competitorVersions',
  'competitorsChecked',
  'unsafeEvalUses',
];

/** The view whose every BaseNative number must be a binding, not a literal. */
export const COMPARE_VIEW = 'examples/express/views/compare.html';

/** The module that composes /compare's tables from the same measured stats. */
export const COMPARE_TABLES = 'examples/express/compare-tables.js';

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
