#!/usr/bin/env node
// Publish gate for every @basenative package: packs each one exactly as
// `pnpm publish` would and fails if the tarball is not fit for npmjs.org.
//
//   node scripts/publish-check.mjs              # every package under packages/
//   node scripts/publish-check.mjs runtime db   # just these (directory names)
//
// Runs in `scripts/pipeline.sh check` and in release.yml before publishing, so
// a package that would leak files, ship unreachable types, or depend on a
// private package cannot reach the registry. A version published to npm can
// never be reused, so these checks run on the packed tarball, not the source.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import { checkPackage, createPackageFromTarballData } from '@arethetypeswrong/core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org/';
const REPO_URL = 'git+https://github.com/DuganLabs/BaseNative.git';

// Packages that legitimately ship no TypeScript types: they export
// configuration consumed by a tool, not an API a program calls.
const NO_TYPES_OK = new Map([
  ['@basenative/claude-config', 'Claude Code config files, not a JS API'],
  ['@basenative/eslint-config', 'ESLint flat config consumed by ESLint'],
  ['@basenative/tsconfig', 'tsconfig JSON files consumed by tsc'],
  ['@basenative/fonts', 'CSS and font files only'],
]);

// Files that must never ship. Tests and maps are dead weight that can also
// expose private code paths; env files can hold secrets.
const LEAKS = [
  [/\.(test|spec)\.[cm]?[jt]sx?$/, 'test file'],
  [/(^|\/)__tests__\//, 'test directory'],
  [/\.map$/, 'source map'],
  [/(^|\/)\.env(\.|$)/, 'env file'],
  [/(^|\/)node_modules\//, 'node_modules'],
  [/\.tsbuildinfo$/, 'tsbuildinfo'],
  [/(^|\/)\.DS_Store$/, '.DS_Store'],
];

// attw resolves entrypoints as JavaScript; CSS, SQL and font subpaths are
// assets, so it reports them as unresolvable. Only modules are type-checked.
const JS_TARGET = /\.(m?js|cjs|d\.ts)$/;

// Resolution modes that matter for an ESM-only package. node10 and
// node16-cjs cannot load ESM at all, so attw's findings there are noise.
const ESM_MODES = new Set(['node16-esm', 'bundler']);

const workspaceManifests = () => {
  const dirs = ['packages', 'examples'];
  const out = new Map();
  for (const d of dirs) {
    for (const name of readdirSync(join(ROOT, d))) {
      const file = join(ROOT, d, name, 'package.json');
      if (existsSync(file)) out.set(join(d, name), JSON.parse(readFileSync(file, 'utf8')));
    }
  }
  for (const extra of ['benchmarks', 'tests/integration']) {
    const file = join(ROOT, extra, 'package.json');
    if (existsSync(file)) out.set(extra, JSON.parse(readFileSync(file, 'utf8')));
  }
  return out;
};

const firstTarget = (v) => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    for (const k of ['import', 'default', 'node', 'browser']) {
      const t = firstTarget(v[k]);
      if (t) return t;
    }
    for (const x of Object.values(v)) {
      const t = firstTarget(x);
      if (t) return t;
    }
  }
  return null;
};

const nonModuleEntrypoints = (exp) => {
  if (!exp || typeof exp !== 'object' || Array.isArray(exp)) return [];
  if (!Object.keys(exp).some((k) => k.startsWith('.'))) return [];
  return Object.entries(exp)
    .filter(([key, v]) => {
      const t = firstTarget(v);
      if (key.includes('*')) return true; // file-pattern subpaths are asset maps here
      return !t || !JS_TARGET.test(t);
    })
    .map(([key]) => key);
};

function checkOne(dir, manifest, privateNames, versions, tmp) {
  const errors = [];
  const name = manifest.name;
  const pkgDir = join(ROOT, dir);

  if (manifest.private)
    errors.push('marked "private": true — every package under packages/ is approved for npm');

  // ── metadata ────────────────────────────────────────────────────────────
  const pc = manifest.publishConfig || {};
  if (pc.access !== 'public') errors.push('publishConfig.access must be "public"');
  if (pc.registry !== REGISTRY) errors.push(`publishConfig.registry must be "${REGISTRY}"`);
  if (!manifest.license) errors.push('missing "license"');
  if (!manifest.description) errors.push('missing "description"');
  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0)
    errors.push('missing "keywords"');
  if (!manifest.homepage) errors.push('missing "homepage"');
  // npm trusted publishing rejects a provenance claim unless repository.url
  // matches the publishing repo exactly, so the URL is pinned, not just present.
  const repo = manifest.repository;
  if (!repo || typeof repo !== 'object' || repo.url !== REPO_URL || repo.directory !== dir) {
    errors.push(
      `"repository" must be { "type": "git", "url": "${REPO_URL}", "directory": "${dir}" }`,
    );
  }
  if (manifest.sideEffects === undefined) errors.push('"sideEffects" is not declared');
  if (!Array.isArray(manifest.files)) errors.push('"files" allowlist is missing');

  // ── pack exactly as pnpm publish would ─────────────────────────────────
  const dest = mkdtempSync(join(tmp, 'pack-'));
  execFileSync('pnpm', ['pack', '--pack-destination', dest], { cwd: pkgDir, stdio: 'pipe' });
  const tarball = join(
    dest,
    readdirSync(dest).find((f) => f.endsWith('.tgz')),
  );
  const buf = readFileSync(tarball);
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((e) => e.replace(/^package\//, ''));
  const packed = JSON.parse(
    execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }),
  );

  for (const e of entries) {
    for (const [re, what] of LEAKS) if (re.test(e)) errors.push(`ships ${what}: ${e}`);
  }
  if (!entries.some((e) => /^readme(\.md)?$/i.test(e))) errors.push('tarball has no README');
  if (!entries.some((e) => /^licen[cs]e(\.md|\.txt)?$/i.test(e)))
    errors.push('tarball has no LICENSE');

  // ── dependencies in the packed manifest ────────────────────────────────
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dep, spec] of Object.entries(packed[field] || {})) {
      if (/^(workspace|link|file|portal):/.test(spec))
        errors.push(`${field}.${dep} packs as "${spec}" — not installable from npm`);
      if (privateNames.has(dep)) errors.push(`${field}.${dep} is a private package`);
      if (versions.has(dep)) {
        const bare = String(spec).replace(/^[\^~=]/, '');
        if (bare !== versions.get(dep) && field !== 'peerDependencies') {
          errors.push(
            `${field}.${dep} packs as "${spec}" but the workspace has ${versions.get(dep)}`,
          );
        }
      }
    }
  }

  return { name, dir, errors, buf, manifest, dest };
}

async function lint(result) {
  const { buf, manifest, errors } = result;
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const { messages, pkg } = await publint({
    pack: { tarball: ab },
    strict: true,
    level: 'warning',
  });
  for (const m of messages) {
    if (m.type === 'suggestion') continue;
    errors.push(`publint: ${formatMessage(m, pkg) ?? m.code}`);
  }

  const attwPkg = createPackageFromTarballData(new Uint8Array(buf));
  const res = await checkPackage(attwPkg, {
    excludeEntrypoints: nonModuleEntrypoints(manifest.exports),
  });
  if (res.types === false) {
    if (!NO_TYPES_OK.has(manifest.name))
      errors.push('ships no TypeScript types (add declarations, or justify it in NO_TYPES_OK)');
  } else {
    const seen = new Set();
    for (const p of res.problems || []) {
      if (p.resolutionKind && !ESM_MODES.has(p.resolutionKind)) continue;
      const key = `${p.kind} ${p.entrypoint ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      errors.push(
        `attw: ${p.kind}${p.entrypoint ? ` at "${p.entrypoint}"` : ''}${p.resolutionKind ? ` (${p.resolutionKind})` : ''}`,
      );
    }
  }
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const all = workspaceManifests();
  const privateNames = new Set([...all.values()].filter((m) => m.private).map((m) => m.name));
  const versions = new Map(
    [...all.entries()]
      .filter(([d]) => d.startsWith('packages/'))
      .map(([, m]) => [m.name, m.version]),
  );
  const targets = [...all.entries()]
    .filter(([d]) => d.startsWith('packages/'))
    .filter(([d]) => only.size === 0 || only.has(d.slice('packages/'.length)));

  const tmp = mkdtempSync(join(tmpdir(), 'bn-publish-check-'));
  let failed = 0;
  try {
    for (const [dir, manifest] of targets) {
      let r;
      try {
        r = checkOne(dir, manifest, privateNames, versions, tmp);
        await lint(r);
      } catch (e) {
        r = { name: manifest.name, errors: [`check crashed: ${e.message.split('\n')[0]}`] };
      }
      if (r.errors.length) {
        failed++;
        console.log(`✗ ${r.name}`);
        for (const e of r.errors) console.log(`    ${e}`);
      } else {
        console.log(`✓ ${r.name}@${manifest.version}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${targets.length - failed}/${targets.length} packages ready for ${REGISTRY}`);
  if (failed) process.exit(1);
}

main();
