import { buildSync } from 'esbuild';
import { gzipSync } from 'node:zlib';

const THRESHOLDS = {
  '@basenative/runtime': 10240,
  '@basenative/server': 16384,
};

const packages = [
  { name: '@basenative/runtime', entry: 'packages/runtime/src/index.js', platform: 'browser' },
  { name: '@basenative/server', entry: 'packages/server/src/render.js', platform: 'node', external: ['node-html-parser'] },
];

let failed = false;

for (const pkg of packages) {
  const result = buildSync({
    entryPoints: [pkg.entry],
    bundle: true,
    format: 'esm',
    platform: pkg.platform,
    write: false,
    minify: true,
    external: pkg.external || [],
  });

  const raw = result.outputFiles[0].contents;
  const gzipped = gzipSync(raw);
  const threshold = THRESHOLDS[pkg.name] || Infinity;
  const status = gzipped.length > threshold ? 'FAIL' : 'OK';

  console.log(
    `${pkg.name}: ${raw.length} bytes (${gzipped.length} bytes gzipped) [${status}]`,
  );

  if (gzipped.length > threshold) {
    console.error(
      `  ✗ Exceeds threshold of ${threshold} bytes gzipped`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
