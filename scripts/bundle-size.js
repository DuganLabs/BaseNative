import { buildSync } from 'esbuild';
import { gzipSync } from 'node:zlib';

// Per-package gzipped budgets (bytes). These are the contract — fail CI if exceeded.
const KB = 1024;
const THRESHOLDS = {
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

const packages = [
  { name: '@basenative/runtime', entry: 'packages/runtime/src/index.js', platform: 'browser' },
  { name: '@basenative/server', entry: 'packages/server/src/render.js', platform: 'node', external: ['node-html-parser'] },
  { name: '@basenative/og-image', entry: 'packages/og-image/src/index.js', platform: 'neutral' },
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

let failed = false;
const rows = [];

for (const pkg of packages) {
  let result;
  try {
    result = buildSync({
      entryPoints: [pkg.entry],
      bundle: true,
      format: 'esm',
      platform: pkg.platform,
      write: false,
      minify: true,
      external: [...SHARED_EXTERNAL, ...(pkg.external || [])],
    });
  } catch (err) {
    console.error(`${pkg.name}: build failed — ${err.message}`);
    failed = true;
    continue;
  }

  const raw = result.outputFiles[0].contents;
  const gzipped = gzipSync(raw);
  const threshold = THRESHOLDS[pkg.name] || Infinity;
  const status = gzipped.length > threshold ? 'FAIL' : 'OK';

  rows.push({
    name: pkg.name,
    raw: raw.length,
    gzip: gzipped.length,
    budget: threshold === Infinity ? '—' : threshold,
    status,
  });

  if (gzipped.length > threshold) {
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
