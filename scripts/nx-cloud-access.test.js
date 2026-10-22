import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'nx-cloud-access.sh');
const OWNER = 'warrendugan@gmail.com';

const gitEnv = { ...process.env };
for (const key of [
  'GIT_AUTHOR_EMAIL',
  'GIT_AUTHOR_NAME',
  'GIT_COMMITTER_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_KEY_0',
  'GIT_CONFIG_VALUE_0',
]) {
  delete gitEnv[key];
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: gitEnv });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function initRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'nx-cloud-access-'));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.email', 'seed@example.com']);
  git(cwd, ['config', 'user.name', 'Seed']);
  return cwd;
}

function commit(cwd, email, message) {
  git(cwd, ['-c', `user.email=${email}`, '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', message]);
  return git(cwd, ['rev-parse', 'HEAD']);
}

function run(extra, cwd) {
  const dir = mkdtempSync(join(tmpdir(), 'nx-cloud-out-'));
  const envFile = join(dir, 'env');
  const outFile = join(dir, 'out');
  writeFileSync(envFile, '');
  writeFileSync(outFile, '');
  const result = spawnSync('bash', [script], {
    cwd: cwd || dir,
    encoding: 'utf8',
    env: {
      ...gitEnv,
      GITHUB_ENV: envFile,
      GITHUB_OUTPUT: outFile,
      NX_CLOUD_ALLOWED_AUTHORS: OWNER,
      EVENT_NAME: 'push',
      PUSH_AUTHOR_EMAIL: '',
      PR_HEAD_SHA: '',
      PR_NUMBER: '',
      ...extra,
    },
  });
  const envText = readFileSync(envFile, 'utf8');
  const outText = readFileSync(outFile, 'utf8');
  rmSync(dir, { recursive: true, force: true });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, envText, outText };
}

function envMap(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    if (!line) continue;
    const eq = line.indexOf('=');
    assert.notEqual(eq, -1, `env line has no '=': ${line}`);
    map.set(line.slice(0, eq), line.slice(eq + 1));
  }
  return map;
}

describe('nx-cloud-access', () => {
  it('allows the owner on push, case-insensitively, and does not write the token', () => {
    const result = run({ EVENT_NAME: 'push', PUSH_AUTHOR_EMAIL: 'WarrenDugan@Gmail.com' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.outText, /^allowed=true$/m);
    const env = envMap(result.envText);
    assert.equal(env.get('NX_NO_CLOUD'), 'false');
    assert.equal(env.has('NX_CLOUD_ACCESS_TOKEN'), false);
  });

  it('denies every non-owner on push, including bots, agents, and empty mail', () => {
    const denied = [
      'cursoragent@cursor.com',
      '41898282+github-actions[bot]@users.noreply.github.com',
      '49699333+dependabot[bot]@users.noreply.github.com',
      'cursor[bot]@users.noreply.github.com',
      'someone@example.com',
      'warrendugan@gmail.com.evil.com',
      'notwarrendugan@gmail.com',
      '',
    ];
    const trimmed = run({ EVENT_NAME: 'push', PUSH_AUTHOR_EMAIL: '  WarrenDugan@Gmail.com  ' });
    assert.equal(trimmed.status, 0, trimmed.stderr);
    assert.match(trimmed.outText, /^allowed=true$/m);

    for (const email of denied) {
      const result = run({ EVENT_NAME: 'push', PUSH_AUTHOR_EMAIL: email });
      assert.equal(result.status, 0, `${email}: ${result.stderr}`);
      assert.match(result.outText, /^allowed=false$/m, email);
      const env = envMap(result.envText);
      assert.equal(env.get('NX_NO_CLOUD'), 'true', email);
      assert.equal(env.get('NX_CLOUD_ACCESS_TOKEN'), '', email);
    }
  });

  it('matches a later comma-separated entry and ignores blanks', () => {
    const result = run({
      EVENT_NAME: 'push',
      PUSH_AUTHOR_EMAIL: OWNER,
      NX_CLOUD_ALLOWED_AUTHORS: ' , bot@example.com, WarrenDugan@Gmail.com,',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.outText, /^allowed=true$/m);
  });

  it('uses the push payload email, not HEAD', () => {
    const cwd = initRepo();
    try {
      commit(cwd, 'cursoragent@cursor.com', 'agent');
      const result = run({ EVENT_NAME: 'push', PUSH_AUTHOR_EMAIL: OWNER }, cwd);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.outText, /^allowed=true$/m);
      assert.match(result.stdout, /author='warrendugan@gmail.com'/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('uses HEAD for workflow_dispatch and any other event', () => {
    const cwd = initRepo();
    try {
      commit(cwd, 'cursoragent@cursor.com', 'agent');
      for (const event of ['workflow_dispatch', 'schedule', '']) {
        const result = run({ EVENT_NAME: event, PUSH_AUTHOR_EMAIL: OWNER }, cwd);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.outText, /^allowed=false$/m, event || '<empty>');
        assert.equal(envMap(result.envText).get('NX_NO_CLOUD'), 'true');
      }
      commit(cwd, OWNER, 'owner');
      const allowed = run({ EVENT_NAME: 'workflow_dispatch', PUSH_AUTHOR_EMAIL: 'nope@example.com' }, cwd);
      assert.match(allowed.outText, /^allowed=true$/m);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('uses the pull_request head sha, not the checked-out merge commit', () => {
    const cwd = initRepo();
    try {
      const head = commit(cwd, OWNER, 'pr head');
      commit(cwd, '41898282+github-actions[bot]@users.noreply.github.com', 'merge');
      const result = run(
        { EVENT_NAME: 'pull_request', PR_HEAD_SHA: head, PUSH_AUTHOR_EMAIL: 'nope@example.com' },
        cwd,
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.outText, /^allowed=true$/m);
      assert.match(result.stdout, /author='warrendugan@gmail.com'/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('denies a pull_request whose head sha is a bot, even when HEAD is the owner', () => {
    const cwd = initRepo();
    try {
      const head = commit(cwd, 'cursoragent@cursor.com', 'agent head');
      commit(cwd, OWNER, 'merge');
      const result = run({ EVENT_NAME: 'pull_request', PR_HEAD_SHA: head }, cwd);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.outText, /^allowed=false$/m);
      assert.equal(envMap(result.envText).get('NX_CLOUD_ACCESS_TOKEN'), '');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('fetches a missing pull_request head and denies when the sha cannot be resolved', () => {
    const origin = initRepo();
    const workspace = mkdtempSync(join(tmpdir(), 'nx-cloud-clone-'));
    try {
      const head = commit(origin, OWNER, 'pr head');
      commit(origin, 'cursoragent@cursor.com', 'tip');
      git(origin, ['config', 'uploadpack.allowReachableSHA1InWant', 'true']);
      git(origin, ['config', 'uploadpack.allowAnySHA1InWant', 'true']);
      git(workspace, ['clone', '--depth', '1', '--no-local', origin, '.']);
      const present = spawnSync('git', ['cat-file', '-e', `${head}^{commit}`], { cwd: workspace });
      assert.notEqual(present.status, 0, 'shallow clone unexpectedly has the PR head');
      const missing = run({ EVENT_NAME: 'pull_request', PR_HEAD_SHA: head, PR_NUMBER: '7' }, workspace);
      assert.equal(missing.status, 0, missing.stderr);
      assert.match(missing.outText, /^allowed=true$/m, missing.stderr);

      const bad = run({ EVENT_NAME: 'pull_request', PR_HEAD_SHA: 'not-a-sha', PR_NUMBER: '7' }, workspace);
      assert.equal(bad.status, 0, bad.stderr);
      assert.match(bad.outText, /^allowed=false$/m);
      assert.match(bad.stderr, /denying/);

      const absent = run(
        {
          EVENT_NAME: 'pull_request',
          PR_HEAD_SHA: '0123456789abcdef0123456789abcdef01234567',
          PR_NUMBER: '',
        },
        workspace,
      );
      assert.equal(absent.status, 0, absent.stderr);
      assert.match(absent.outText, /^allowed=false$/m);
    } finally {
      rmSync(origin, { recursive: true, force: true });
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('refuses to run without GITHUB_ENV and GITHUB_OUTPUT', () => {
    const result = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: { ...gitEnv, EVENT_NAME: 'push', PUSH_AUTHOR_EMAIL: OWNER, NX_CLOUD_ALLOWED_AUTHORS: OWNER },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /GITHUB_ENV and GITHUB_OUTPUT/);
  });
});

describe('workflow wiring', () => {
  const workflows = ['ci.yml', 'release.yml', 'deploy.yml'].map((name) => ({
    name,
    text: readFileSync(join(root, '.github', 'workflows', name), 'utf8'),
  }));

  it('defines the owner allow list once per workflow and drops the dependabot actor check', () => {
    for (const { name, text } of workflows) {
      const hits = text.split(`NX_CLOUD_ALLOWED_AUTHORS: ${OWNER}`).length - 1;
      assert.equal(hits, 1, name);
      assert.equal(text.includes('dependabot[bot]'), false, name);
      assert.equal(text.includes('github.actor'), false, name);
    }
  });

  it('resolves the author before nx and exposes the secret only on the allowed path', () => {
    for (const { name, text } of workflows) {
      assert.match(text, /bash scripts\/nx-cloud-access\.sh/, name);
      const resolveAt = text.indexOf('bash scripts/nx-cloud-access.sh');
      const nxAt = text.indexOf('pnpm exec nx');
      if (nxAt !== -1) assert.ok(resolveAt < nxAt, `${name} resolves the author after nx`);
    }
    const ci = workflows.find((w) => w.name === 'ci.yml').text;
    const release = workflows.find((w) => w.name === 'release.yml').text;
    const deploy = workflows.find((w) => w.name === 'deploy.yml').text;
    assert.equal(ci.split('bash scripts/nx-cloud-access.sh').length - 1, 2);
    assert.equal(release.split('bash scripts/nx-cloud-access.sh').length - 1, 1);
    assert.equal(deploy.split('bash scripts/nx-cloud-access.sh').length - 1, 2);
    assert.equal(ci.split("steps.nx-cloud.outputs.allowed == 'true'").length - 1, 2);
    assert.equal(release.split("steps.nx-cloud.outputs.allowed == 'true'").length - 1, 1);
    assert.match(
      deploy,
      /NX_CLOUD_ACCESS_TOKEN: \$\{\{ needs\.nx-cloud\.outputs\.allowed == 'true' && secrets\.NX_CLOUD_ACCESS_TOKEN \|\| '' \}\}/,
    );
    assert.match(deploy, /build:pages:no-cloud/);
    assert.ok(
      deploy.lastIndexOf('bash scripts/nx-cloud-access.sh') < deploy.indexOf('pnpm build:pages'),
      'audit resolves the author after the nx build',
    );
  });

  it('points the reusable deploy at a script that sets NX_NO_CLOUD', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['build:pages:no-cloud'], 'NX_NO_CLOUD=true pnpm run build:pages');
  });
});
