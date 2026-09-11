import { buildSync } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Every entry below is written relative to the repository root, so anchor
// esbuild there explicitly. Without this the measurement only works when the
// process happens to be started from the root — which is true of the CLI and
// false of `nx run basenative-integration-tests:test`, whose cwd is the test's
// own directory.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Per-package gzipped budgets (bytes). These are the contract — fail CI if exceeded.
const KB = 1024;
export const THRESHOLDS = {
  '@basenative/runtime': 10 * KB,
  '@basenative/server': 16 * KB,
  '@basenative/og-image': 8 * KB,
  '@basenative/keyboard': 4 * KB,
  '@basenative/auth-webauthn': 6 * KB,
  '@basenative/admin': 5 * KB,
  '@basenative/persist': 3 * KB,
  '@basenative/share': 4 * KB,
  '@basenative/wrangler-preset': 3 * KB,
  '@basenative/doppler': 3 * KB,
  '@basenative/favicon': 6 * KB,
  '@basenative/combobox': 4 * KB,
};

// Treat peer deps and known heavyweight transitive WASM/native modules as external,
// so the budget reflects the package's *own* code rather than vendored bytes.
const SHARED_EXTERNAL = [
  '@basenative/runtime',
  '@basenative/server',
  '@basenative/auth',
  '@basenative/og-image',
  'satori',
  '@resvg/resvg-wasm',
  '@simplewebauthn/server',
  '@simplewebauthn/browser',
  'wrangler',
];

export const packages = [
  { name: '@basenative/runtime', entry: 'packages/runtime/src/index.js', platform: 'browser' },
  { name: '@basenative/server', entry: 'packages/server/src/render.js', platform: 'node', external: ['node-html-parser'] },
  // og-image ships a Workers build (static .wasm import, selected via the
  // `#wasm-init` imports map) and a Node fallback; measure the Workers variant.
  { name: '@basenative/og-image', entry: 'packages/og-image/src/index.js', platform: 'neutral', conditions: ['workerd', 'worker', 'browser'] },
  { name: '@basenative/keyboard', entry: 'packages/keyboard/src/index.js', platform: 'browser' },
  { name: '@basenative/auth-webauthn', entry: 'packages/auth-webauthn/src/server.js', platform: 'neutral' },
  { name: '@basenative/admin', entry: 'packages/admin/src/index.js', platform: 'neutral' },
  { name: '@basenative/persist', entry: 'packages/persist/src/index.js', platform: 'browser' },
  { name: '@basenative/share', entry: 'packages/share/src/client.js', platform: 'browser' },
  { name: '@basenative/wrangler-preset', entry: 'packages/wrangler-preset/src/index.js', platform: 'node' },
  { name: '@basenative/doppler', entry: 'packages/doppler/src/index.js', platform: 'node' },
  { name: '@basenative/favicon', entry: 'packages/favicon/src/index.js', platform: 'neutral' },
  { name: '@basenative/combobox', entry: 'packages/combobox/src/index.js', platform: 'browser' },
];

/**
 * Bundle one package entry the same way the budget check does and report its
 * minified and gzipped size in bytes.
 *
 * Exported so anything that needs a package's real shipped size — notably
 * `scripts/compare-stats.js`, which puts that number on the public /compare
 * page — measures it exactly once, here, instead of growing a second
 * implementation that can drift from the budget CI enforces.
 *
 * @param {{name: string, entry: string, platform: string, external?: string[], conditions?: string[]}} pkg
 * @returns {{raw: number, gzip: number}}
 */
export function measure(pkg) {
  const result = buildSync({
    absWorkingDir: repoRoot,
    entryPoints: [pkg.entry],
    bundle: true,
    format: 'esm',
    platform: pkg.platform,
    write: false,
    minify: true,
    external: [...SHARED_EXTERNAL, ...(pkg.external || [])],
    ...(pkg.conditions ? { conditions: pkg.conditions } : {}),
  });
  const raw = result.outputFiles[0].contents;
  return { raw: raw.length, gzip: gzipSync(raw).length };
}

/** Look up one packages[] entry by package name. Throws if it is not measured. */
export function findPackage(name) {
  const pkg = packages.find((p) => p.name === name);
  if (!pkg) {
    throw new Error(
      `${name} has no bundle-size entry. Add it to packages[] in scripts/bundle-size.js so its size is measured and budgeted.`,
    );
  }
  return pkg;
}

/** Measure every budgeted package, print the table, and exit non-zero on any overrun. */
function runBudgetCheck() {
  let failed = false;
  const rows = [];

  for (const pkg of packages) {
    let size;
    try {
      size = measure(pkg);
    } catch (err) {
      console.error(`${pkg.name}: build failed — ${err.message}`);
      failed = true;
      continue;
    }

    const threshold = THRESHOLDS[pkg.name] || Infinity;
    const status = size.gzip > threshold ? 'FAIL' : 'OK';

    rows.push({
      name: pkg.name,
      raw: size.raw,
      gzip: size.gzip,
      budget: threshold === Infinity ? '—' : threshold,
      status,
    });

    if (size.gzip > threshold) {
      failed = true;
    }
  }

  // Pretty table.
  const pad = (s, n) => String(s).padEnd(n);
  const padR = (s, n) => String(s).padStart(n);
  const w = {
    name: Math.max(...rows.map((r) => r.name.length), 8),
    raw: 9,
    gzip: 9,
    budget: 9,
    status: 6,
  };

  console.log(
    pad('package', w.name),
    padR('raw', w.raw),
    padR('gzip', w.gzip),
    padR('budget', w.budget),
    pad('status', w.status),
  );
  console.log(
    '-'.repeat(w.name),
    '-'.repeat(w.raw),
    '-'.repeat(w.gzip),
    '-'.repeat(w.budget),
    '-'.repeat(w.status),
  );
  for (const r of rows) {
    console.log(
      pad(r.name, w.name),
      padR(r.raw, w.raw),
      padR(r.gzip, w.gzip),
      padR(r.budget, w.budget),
      pad(r.status, w.status),
    );
  }

  if (failed) {
    console.error('\nOne or more packages exceeded their bundle-size budget.');
    process.exit(1);
  }
}

// Only run the budget check when invoked directly — importers (compare-stats.js)
// want measure() without the table or the process.exit().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBudgetCheck();
}
