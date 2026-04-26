#!/usr/bin/env node
// ────────────────────────────────────────────────────────────────────────────
//   bn-wrangler  ·  the wrangler everybody at DuganLabs agreed on.
//   "Same wrangler. Same flags. Same outcome."
// ────────────────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function showHelp() {
  console.log(`
  bn-wrangler — pinned wrangler from @basenative/wrangler-preset

  Usage: bn-wrangler <wrangler args...>

  Examples:
    bn-wrangler --version
    bn-wrangler pages dev dist
    bn-wrangler deploy
    bn-wrangler d1 migrations apply DB --remote

  Special:
    bn-wrangler --bn-version   Print preset + wrangler versions
    bn-wrangler --bn-help      Show this help
`);
}

function resolveWranglerBin() {
  // Prefer the wrangler installed alongside this package.
  let pkgPath;
  try {
    pkgPath = require.resolve('wrangler/package.json');
  } catch {
    return null;
  }
  const pkgDir = dirname(pkgPath);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const binField = pkg.bin;
  let rel;
  if (typeof binField === 'string') rel = binField;
  else if (binField && typeof binField === 'object') rel = binField.wrangler;
  if (!rel) return null;
  const full = join(pkgDir, rel);
  return existsSync(full) ? full : null;
}

function printVersions() {
  const presetPkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
  );
  let wranglerVer = '(not resolved)';
  try {
    const w = JSON.parse(
      readFileSync(require.resolve('wrangler/package.json'), 'utf-8'),
    );
    wranglerVer = w.version;
  } catch {
    // fall through
  }
  console.log(`@basenative/wrangler-preset v${presetPkg.version}`);
  console.log(`wrangler                   v${wranglerVer}`);
}

const argv = process.argv.slice(2);

if (argv.includes('--bn-help')) {
  showHelp();
  process.exit(0);
}

if (argv.includes('--bn-version')) {
  printVersions();
  process.exit(0);
}

const bin = resolveWranglerBin();
if (!bin) {
  console.error(
    'bn-wrangler: could not resolve `wrangler`. Is @basenative/wrangler-preset installed?',
  );
  process.exit(1);
}

const child = spawn(process.execPath, [bin, ...argv], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error(`bn-wrangler: failed to spawn wrangler: ${err.message}`);
  process.exit(1);
});
