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

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org/';
const CORE = ['runtime', 'server', 'router', 'forms', 'components'];
const useLatest = process.argv[2] === 'latest';

const specs = CORE.map((dir) => {
  const { name, version } = JSON.parse(
    readFileSync(join(ROOT, 'packages', dir, 'package.json'), 'utf8'),
  );
  return `${name}@${useLatest ? 'latest' : version}`;
});

const SMOKE = `
import assert from 'node:assert/strict';
import { signal, computed } from '@basenative/runtime';
import { render } from '@basenative/server';
import { matchRoute } from '@basenative/router';
import { createField } from '@basenative/forms';
import { renderBadge } from '@basenative/components';

const count = signal(2);
const doubled = computed(() => count() * 2);
assert.equal(doubled(), 4, 'runtime: computed did not derive from signal');
count.set(5);
assert.equal(doubled(), 10, 'runtime: computed did not track the signal');

const html = render('<p>{{ label }}: {{ value }}</p>', { label: 'doubled', value: doubled() });
assert.match(html, /doubled: 10/, 'server: render did not interpolate');

const route = matchRoute('/users/:id', '/users/7');
assert.deepEqual(route, { id: '7' }, 'router: matchRoute did not extract :id');

const field = createField('hello');
assert.equal(field.value(), 'hello', 'forms: createField lost its initial value');

assert.match(renderBadge('npm'), /data-bn="badge"[^>]*>npm</, 'components: renderBadge output changed');

console.log('smoke ok:', html);
`;

const dir = mkdtempSync(join(tmpdir(), 'bn-npm-smoke-'));
try {
  writeFileSync(
    join(dir, 'package.json'),
    '{ "name": "bn-npm-smoke", "private": true, "type": "module" }\n',
  );
  writeFileSync(join(dir, '.npmrc'), `registry=${REGISTRY}\n`);
  writeFileSync(join(dir, 'smoke.mjs'), SMOKE);

  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      execFileSync('pnpm', ['add', '--registry', REGISTRY, ...specs], { cwd: dir, stdio: 'pipe' });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      console.log(
        `install attempt ${attempt} failed; the registry may not serve the new version yet`,
      );
      execFileSync('sleep', ['20']);
    }
  }
  if (lastErr)
    throw new Error(`could not install ${specs.join(' ')}:\n${lastErr.stderr ?? lastErr.message}`);

  const installed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies;
  console.log(
    'installed from npm:',
    Object.entries(installed)
      .map(([n, v]) => `${n}@${v}`)
      .join(' '),
  );
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: dir, stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
