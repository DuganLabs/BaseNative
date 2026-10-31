#!/usr/bin/env node
// Clean-install smoke test against the public registry.
//
//   node scripts/npm-smoke.mjs            # the versions in packages/*/package.json
//   node scripts/npm-smoke.mjs latest     # whatever npm's `latest` tag points at
//
// Installs core @basenative packages from https://registry.npmjs.org/ into an
// empty directory outside this monorepo, so nothing can resolve through a
// workspace link, then imports them and renders a page. It proves the
// published artifacts work on their own. release.yml runs it after every
// publish; it waits briefly for the registry to serve a just-published version.
//
// A package the release only staged is not on the registry. publish-release
// records those names in `.publish-release-state.json`. This script skips
// them. If the install still fails because a published package depends on
// one of those staged versions, the smoke test exits 0 and says so — a
// staged version cannot be installed until a maintainer approves it.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readReleaseState } from './publish-release.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org/';

const CHECKS = [
  {
    dir: 'runtime',
    name: '@basenative/runtime',
    body: `
import { signal, computed } from '@basenative/runtime';
const count = signal(2);
const doubled = computed(() => count() * 2);
assert.equal(doubled(), 4, 'runtime: computed did not derive from signal');
count.set(5);
assert.equal(doubled(), 10, 'runtime: computed did not track the signal');
`,
  },
  {
    dir: 'server',
    name: '@basenative/server',
    body: `
import { render } from '@basenative/server';
const html = render('<p>{{ label }}: {{ value }}</p>', { label: 'doubled', value: 10 });
assert.match(html, /doubled: 10/, 'server: render did not interpolate');
`,
  },
  {
    dir: 'router',
    name: '@basenative/router',
    body: `
import { matchRoute } from '@basenative/router';
const route = matchRoute('/users/:id', '/users/7');
assert.deepEqual(route, { id: '7' }, 'router: matchRoute did not extract :id');
`,
  },
  {
    dir: 'forms',
    name: '@basenative/forms',
    body: `
import { createField } from '@basenative/forms';
const field = createField('hello');
assert.equal(field.value(), 'hello', 'forms: createField lost its initial value');
`,
  },
  {
    dir: 'components',
    name: '@basenative/components',
    body: `
import { badge, loadRegistry } from '@basenative/components';
const registry = await loadRegistry();
assert.ok(registry.getComponent('badge'), 'components: registry did not load badge');
const badgeVm = badge.create({ label: 'npm' });
assert.equal(badgeVm.label(), 'npm', 'components: badge view model lost its label');
`,
  },
];

export function coreSpecs(root, useLatest) {
  return CHECKS.map((check) => {
    const { name, version } = JSON.parse(
      readFileSync(join(root, 'packages', check.dir, 'package.json'), 'utf8'),
    );
    return { name, spec: `${name}@${useLatest ? 'latest' : version}`, version };
  });
}

// Exact name@version specs that the release staged are not installable.
// `latest` is unchanged by staging, so that mode installs whatever is public.
export function partitionSmokeSpecs(specs, staged, { useLatest = false } = {}) {
  if (useLatest) return { install: specs.map((item) => item.spec), skipped: [] };
  const stagedKeys = new Set(staged.map((item) => `${item.name}@${item.version}`));
  const install = [];
  const skipped = [];
  for (const item of specs) {
    if (stagedKeys.has(item.spec)) skipped.push(item.spec);
    else install.push(item.spec);
  }
  return { install, skipped };
}

export function installFailedBecauseStaged(text, staged) {
  if (!staged.length) return false;
  const body = String(text);
  const mentionsStaged = staged.some((item) => body.includes(item.name));
  const notFound = /404|not found|No matching version|ERR_PNPM_NO_MATCHING_VERSION/i.test(body);
  return mentionsStaged && notFound;
}

export function smokeSource(names) {
  const selected = new Set(names);
  const bodies = CHECKS.filter((check) => selected.has(check.name)).map((check) => check.body);
  return `import assert from 'node:assert/strict';
${bodies.join('\n')}
console.log('smoke ok');
`;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

function outputOf(err) {
  const stderr = err?.stderr ? err.stderr.toString() : '';
  const stdout = err?.stdout ? err.stdout.toString() : '';
  return `${stderr}\n${stdout}\n${err?.message ?? ''}`;
}

function runSmoke() {
  const useLatest = process.argv[2] === 'latest';
  const specs = coreSpecs(ROOT, useLatest);
  const { staged } = readReleaseState(ROOT);
  const { install, skipped } = partitionSmokeSpecs(specs, staged, { useLatest });

  if (skipped.length) {
    console.log(
      `smoke skipping staged packages (not on the registry until approved): ${skipped.join(' ')}`,
    );
  }
  if (install.length === 0) {
    console.log('smoke skipped: every core package in this release is staged, not published.');
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'bn-npm-smoke-'));
  try {
    writeFileSync(
      join(dir, 'package.json'),
      '{ "name": "bn-npm-smoke", "private": true, "type": "module" }\n',
    );
    writeFileSync(join(dir, '.npmrc'), `registry=${REGISTRY}\n`);

    let lastErr;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        execFileSync('pnpm', ['add', '--registry', REGISTRY, ...install], {
          cwd: dir,
          stdio: 'pipe',
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.log(
          `install attempt ${attempt} failed; the registry may not serve the new version yet`,
        );
        execFileSync('sleep', ['20']);
      }
    }
    if (lastErr) {
      const text = outputOf(lastErr);
      if (installFailedBecauseStaged(text, staged)) {
        console.log(
          'smoke skipped: install needs a package that is only staged and not yet approved.',
        );
        console.log(text.trim());
        return;
      }
      throw new Error(`could not install ${install.join(' ')}:\n${text}`);
    }

    const installed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies;
    const names = Object.keys(installed);
    console.log(
      'installed from npm:',
      Object.entries(installed)
        .map(([name, version]) => `${name}@${version}`)
        .join(' '),
    );
    writeFileSync(join(dir, 'smoke.mjs'), smokeSource(names));
    execFileSync(process.execPath, ['smoke.mjs'], { cwd: dir, stdio: 'inherit' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (isDirectRun()) {
  if (!existsSync(join(ROOT, 'packages', 'runtime', 'package.json'))) {
    throw new Error('npm-smoke must run from a BaseNative checkout');
  }
  runSmoke();
}
