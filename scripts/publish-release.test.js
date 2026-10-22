import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  approvalNote,
  changesetReleaseLines,
  findStagedItem,
  formatReleaseSummary,
  BATCH_PUBLISH_TIMEOUT_MS,
  isAlreadyStagedOutput,
  isPreviouslyPublishedOutput,
  NPM_CHILD_STDIO,
  NPM_COMMAND_TIMEOUT_MS,
  NPM_FETCH_LIMITS,
  npmChildOptions,
  npmSupportsStage,
  parseChangesetPublished,
  parseStageId,
  parseStageList,
  publishTag,
  readPackedManifest,
  settleRelease,
  stagePublishArgs,
  TRUSTED_PUBLISHER_NOTE,
  workspaceProtocolLines,
  writeReleaseState,
  readReleaseState,
} from './publish-release.mjs';

const STAGE_ID = 'f8e7a45b-7a5f-4f31-8e6d-9dd1c6ef38c0';

test('stable versions take the latest tag; a prerelease takes its identifier', () => {
  assert.equal(publishTag('2.3.1'), 'latest');
  assert.equal(publishTag('2.1.0'), 'latest');
  assert.equal(publishTag('1.2.3-beta.1'), 'beta');
  assert.equal(publishTag('1.2.3-rc.0'), 'rc');
  assert.equal(publishTag('1.2.3-next.4'), 'next');
  assert.equal(publishTag('1.2.3-beta.1+build.5'), 'beta');
});

test('stage publish args carry that tag and public access', () => {
  assert.deepEqual(stagePublishArgs('/tmp/pkg.tgz', '2.3.1'), [
    'stage',
    'publish',
    '/tmp/pkg.tgz',
    '--tag',
    'latest',
    '--access',
    'public',
    '--json',
    '--ignore-scripts',
  ]);
  assert.equal(stagePublishArgs('/tmp/pkg.tgz', '1.0.0-beta.2')[4], 'beta');
});

test('npm older than 11.15 cannot stage', () => {
  assert.equal(npmSupportsStage('11.15.0'), true);
  assert.equal(npmSupportsStage('11.19.1'), true);
  assert.equal(npmSupportsStage('12.0.0'), true);
  assert.equal(npmSupportsStage('11.14.9'), false);
  assert.equal(npmSupportsStage('10.9.9'), false);
});

test('a packed manifest is refused when it still says workspace:', () => {
  const dirty = '{\n  "dependencies": {\n    "@basenative/runtime": "workspace:^2.3.0"\n  }\n}\n';
  assert.deepEqual(workspaceProtocolLines(dirty), ['"@basenative/runtime": "workspace:^2.3.0"']);
  assert.deepEqual(
    workspaceProtocolLines('{\n  "dependencies": {\n    "@basenative/runtime": "^2.3.0"\n  }\n}\n'),
    [],
  );
});

test('stage ids are read from json and from the text notice', () => {
  const json = JSON.stringify({
    '@basenative/platform': { name: '@basenative/platform', version: '2.1.0', stageId: STAGE_ID },
  });
  assert.equal(parseStageId(json), STAGE_ID);
  assert.equal(parseStageId(`+ @basenative/platform@2.1.0 (staged with id ${STAGE_ID})`), STAGE_ID);
  assert.equal(parseStageId('npm error code EOTP'), null);
});

test('a 409 for an existing stage is not a publish error', () => {
  assert.equal(
    isAlreadyStagedOutput(
      'npm error 409 Conflict - PUT https://registry.npmjs.org/@basenative%2fios - Cannot publish over previously staged version "2.3.1".',
    ),
    true,
  );
  assert.equal(
    isAlreadyStagedOutput('npm error code EOTP\nThis operation requires a one-time password.'),
    false,
  );
  assert.equal(isAlreadyStagedOutput('npm error code E404'), false);
});

test('E409 for a previously published version is published, not staged', () => {
  const e409 =
    'npm error code E409\n' +
    'npm error 409 Conflict - POST https://registry.npmjs.org/-/stage/package/@basenative%2fcombobox - ' +
    'Cannot stage previously published version "2.3.2".';
  assert.equal(isPreviouslyPublishedOutput(e409), true);
  assert.equal(isAlreadyStagedOutput(e409), false);
  assert.equal(
    isPreviouslyPublishedOutput(
      'npm error 409 Conflict - Cannot publish over previously published version "2.3.2".',
    ),
    true,
  );
  const summary = formatReleaseSummary({
    onRegistry: 1,
    published: [{ name: '@basenative/combobox', version: '2.3.2' }],
    staged: [],
    blocked: [],
    missing: [],
    user: 'warrendugan',
  });
  assert.match(summary, /PUBLISHED @basenative\/combobox@2\.3\.2/);
  assert.doesNotMatch(summary, /STAGED/);
});

test('changeset success names are not the packages that failed', () => {
  const text = [
    '\u001b[?25l◒  Publishing packages...',
    '◇  Successfully published:',
    '@basenative/admin@2.3.2',
    '@basenative/auth@2.3.2',
    'Some packages failed to publish:',
    '@basenative/ios@2.3.2',
    '└ E404: Not Found',
    '@basenative/runtime@2.3.2',
  ].join('\n');
  assert.deepEqual(parseChangesetPublished(text), [
    { name: '@basenative/admin', version: '2.3.2' },
    { name: '@basenative/auth', version: '2.3.2' },
  ]);
  assert.deepEqual(parseChangesetPublished('no publish happened'), []);
});

test('npm children ignore stdin, time out, and cap registry retries', () => {
  const opts = npmChildOptions({ PATH: '/usr/bin' }, '/tmp');
  assert.deepEqual(opts.stdio, NPM_CHILD_STDIO);
  assert.equal(opts.stdio[0], 'ignore');
  assert.equal(opts.timeout, NPM_COMMAND_TIMEOUT_MS);
  assert.ok(NPM_COMMAND_TIMEOUT_MS <= 3 * 60 * 1000);
  assert.ok(BATCH_PUBLISH_TIMEOUT_MS <= 10 * 60 * 1000);
  assert.equal(opts.env.npm_config_fetch_retries, '1');
  assert.equal(opts.env.npm_config_fetch_timeout, NPM_FETCH_LIMITS.npm_config_fetch_timeout);
  assert.equal(Number(opts.env.npm_config_fetch_retry_maxtimeout) <= 4000, true);
  assert.equal(opts.env.PATH, '/usr/bin');
});

test('stage list json finds the version that is already staged', () => {
  const stdout = JSON.stringify([
    {
      id: STAGE_ID,
      packageName: '@basenative/ios',
      version: '2.3.1',
      tag: 'latest',
    },
    {
      id: '11111111-1111-1111-1111-111111111111',
      packageName: '@basenative/ios',
      version: '2.3.0',
      tag: 'latest',
    },
  ]);
  const items = parseStageList(`npm notice whatever\n${stdout}\n`);
  const hit = findStagedItem(items, '@basenative/ios', '2.3.1');
  assert.equal(hit.id, STAGE_ID);
  assert.equal(findStagedItem(items, '@basenative/ios', '9.9.9'), null);
  assert.deepEqual(parseStageList('not json'), []);
});

test('a staged package is not missing, and the summary names its stage id', () => {
  const settled = settleRelease({
    candidateNames: ['@basenative/runtime', '@basenative/platform', '@basenative/ios'],
    publishedNames: new Set(['@basenative/runtime']),
    stagedNames: new Set(['@basenative/platform', '@basenative/ios']),
  });
  assert.deepEqual(settled, { missing: [], ok: true });

  const summary = formatReleaseSummary({
    onRegistry: 1,
    staged: [
      { name: '@basenative/platform', version: '2.1.0', stageId: STAGE_ID },
      { name: '@basenative/ios', version: '2.3.1', stageId: null },
    ],
    blocked: [],
    missing: [],
    user: 'warrendugan',
  });
  assert.match(summary, /STAGED @basenative\/platform@2\.1\.0 — stage id f8e7a45b/);
  assert.match(summary, /STAGED @basenative\/ios@2\.3\.1 — stage id unavailable/);
  assert.doesNotMatch(summary, /MISSING/);
  assert.equal(
    approvalNote('warrendugan'),
    'Approve at https://www.npmjs.com/settings/warrendugan/staged-packages (Staged Packages) with 2FA.',
  );
  assert.match(
    summary,
    new RegExp(approvalNote('warrendugan').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.match(summary, /interactive 2FA/);
  assert.match(summary, new RegExp(TRUSTED_PUBLISHER_NOTE.slice(0, 40)));
});

test('a real miss is still missing', () => {
  const settled = settleRelease({
    candidateNames: ['@basenative/platform'],
    publishedNames: new Set(),
    stagedNames: new Set(),
  });
  assert.deepEqual(settled.missing, ['@basenative/platform']);
  assert.equal(settled.ok, false);
  const summary = formatReleaseSummary({
    onRegistry: 0,
    staged: [],
    blocked: [],
    missing: [{ name: '@basenative/platform', version: '2.1.0' }],
    user: 'warrendugan',
  });
  assert.match(summary, /MISSING @basenative\/platform@2\.1\.0/);
  assert.doesNotMatch(summary, /staged:/);
});

test('changeset output records a rescued publish once', () => {
  const pkg = { name: '@basenative/runtime', version: '2.3.1' };
  const lines = changesetReleaseLines([pkg], '');
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), {
    type: 'git-tag',
    tag: '@basenative/runtime@2.3.1',
    packageName: '@basenative/runtime',
  });
  assert.deepEqual(changesetReleaseLines([pkg], lines[0]), []);
});

test('release state round-trips the staged set the smoke test reads', () => {
  const root = mkdtempSync(join(tmpdir(), 'bn-state-'));
  try {
    writeReleaseState(root, [
      { name: '@basenative/platform', version: '2.1.0', stageId: STAGE_ID },
    ]);
    assert.deepEqual(readReleaseState(root).staged, [
      { name: '@basenative/platform', version: '2.1.0', stageId: STAGE_ID },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the manifest reader sees the package.json inside a tarball', () => {
  const root = mkdtempSync(join(tmpdir(), 'bn-tar-'));
  try {
    mkdirSync(join(root, 'package'));
    writeFileSync(
      join(root, 'package', 'package.json'),
      JSON.stringify({
        name: '@basenative/platform',
        dependencies: { '@basenative/runtime': '2.3.1' },
      }),
    );
    const tarball = join(root, 'pkg.tgz');
    execFileSync('tar', ['-czf', tarball, 'package'], { cwd: root });
    const { text, manifest } = readPackedManifest(tarball);
    assert.equal(manifest.dependencies['@basenative/runtime'], '2.3.1');
    assert.deepEqual(workspaceProtocolLines(text), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pnpm pack rewrites workspace: before a tarball is staged', () => {
  const root = mkdtempSync(join(tmpdir(), 'bn-ws-'));
  try {
    mkdirSync(join(root, 'packages', 'dep'), { recursive: true });
    mkdirSync(join(root, 'packages', 'app'), { recursive: true });
    writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'ws', private: true }));
    writeFileSync(
      join(root, 'packages', 'dep', 'package.json'),
      JSON.stringify({ name: '@example/dep', version: '1.2.3' }),
    );
    writeFileSync(
      join(root, 'packages', 'app', 'package.json'),
      JSON.stringify({
        name: '@example/app',
        version: '4.5.6',
        dependencies: { '@example/dep': 'workspace:*' },
      }),
    );
    execFileSync('pnpm', ['install', '--ignore-scripts'], { cwd: root, stdio: 'pipe' });
    const dest = join(root, 'out');
    mkdirSync(dest);
    execFileSync('pnpm', ['pack', '--pack-destination', dest], {
      cwd: join(root, 'packages', 'app'),
      stdio: 'pipe',
    });
    const tarball = join(
      dest,
      readdirSync(dest).find((name) => name.endsWith('.tgz')),
    );
    const { text, manifest } = readPackedManifest(tarball);
    assert.equal(manifest.dependencies['@example/dep'], '1.2.3');
    assert.deepEqual(workspaceProtocolLines(text), []);
    assert.equal(
      readFileSync(join(root, 'packages', 'app', 'package.json'), 'utf8').includes('workspace:'),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
