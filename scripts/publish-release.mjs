#!/usr/bin/env node
// Release publisher for every @basenative package.
// release.yml hands publishing to this script through the changesets
// action's publish-script.
//
//   node scripts/publish-release.mjs              # publish or stage what is missing
//   node scripts/publish-release.mjs --dry-run    # report the lanes only
//
// Two lanes:
//
//   Main lane — packages that already exist on npm go through
//   `changeset publish` over trusted publishing (OIDC), with provenance.
//   NODE_AUTH_TOKEN is deleted from that process (an empty value would
//   disable the OIDC fallback). A package whose trusted publisher was
//   never configured fails here; the rescue pass stages it.
//
//   Stage lane — NPM_BOOTSTRAP_TOKEN is a granular stage-only token. It
//   can run `npm stage publish` and cannot `npm publish`. A direct
//   publish fails with EOTP (the registry asks for WebAuthn / a one-time
//   password) or E_STAGE_REQUIRED. Bypass-2FA tokens are not used; npm
//   removes direct publish with those tokens in January 2027.
//
//   The stage lane runs for every package OIDC cannot publish: a name
//   the registry has never seen (a trusted publisher can only be added
//   on a package page, and the first publish creates that page), and an
//   existing package whose trusted publisher was never configured.
//   `pnpm pack` runs first so `workspace:` ranges are rewritten to the
//   real versions, then `npm stage publish` uploads that tarball. The
//   packed manifest is refused if it still contains `workspace:`. The
//   dist-tag is the same one `pnpm publish` / `npm publish` would apply:
//   `latest` for a stable version, and the prerelease identifier
//   (`1.2.3-beta.1` → `beta`) when the version is a prerelease — npm
//   errors if a prerelease is left on the implicit `latest` tag.
//
//   A version that is already staged is staged, not a failure. The job
//   exits 0 when every publishable package is either on the registry or
//   staged. It exits non-zero only for a real error (no token, a pack
//   that still has `workspace:`, a stage command that did not stage).
//
//   After the run, a maintainer approves each stage with 2FA. The
//   summary prints the stage id and the Staged Packages URL. Approving
//   the first version of a new package creates the package page; the
//   owner then adds a trusted publisher on npmjs.com (that step is
//   interactive 2FA, so CI cannot do it). Later releases of that
//   package publish over OIDC.
//
// Packages held on purpose — `"private": true`, or named in the
// changesets config's ignore list — are reported and never published
// or staged.

import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org/';
export const RELEASE_STATE_FILE = '.publish-release-state.json';
// Maintainer of @basenative/* on npmjs.org. `npm whoami` replaces this
// when the stage-only token can answer; the URL has to name a real user
// either way.
export const NPM_APPROVAL_USER = 'warrendugan';
export const TRUSTED_PUBLISHER_NOTE =
  'After the first approval, add a trusted publisher for each staged package on npmjs.com (package settings → Trusted Publisher: this repo, .github/workflows/release.yml, environment prd). That needs interactive 2FA, so the owner does it in the browser. The next release of that package then publishes over OIDC.';

const DRY_RUN = process.argv.includes('--dry-run');
const BOOTSTRAP_TOKEN = (process.env.NPM_BOOTSTRAP_TOKEN ?? '').trim();
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

process.on('unhandledRejection', (err) => {
  console.error(`\npublish-release: fatal: ${err?.message ?? err}`);
  process.exit(1);
});

// ---------------------------------------------------------------- pure helpers

// `pnpm publish` passes no `--tag`, so npm's default `latest` is what the
// release log shows ("with tag latest"). npm stage publish uses that same
// rule and, like npm publish, refuses an implicit `latest` on a prerelease.
export function publishTag(version) {
  const semver = String(version).split('+')[0];
  const dash = semver.indexOf('-');
  if (dash === -1) return 'latest';
  const id = semver.slice(dash + 1).split('.')[0];
  return id || 'latest';
}

export function npmSupportsStage(version) {
  const [major, minor] = String(version)
    .trim()
    .split('.')
    .map((part) => Number(part));
  return major > 11 || (major === 11 && minor >= 15);
}

export function stagePublishArgs(tarball, version) {
  return [
    'stage',
    'publish',
    tarball,
    '--tag',
    publishTag(version),
    '--access',
    'public',
    '--json',
    '--ignore-scripts',
  ];
}

export function workspaceProtocolLines(text) {
  return String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('workspace:'));
}

export function parseStageId(text) {
  const labelled = String(text).match(/staged with id\s+([0-9a-f-]{36})/i);
  if (labelled) return labelled[1];
  const json = String(text).match(/"stageId"\s*:\s*"([0-9a-f-]{36})"/i);
  if (json) return json[1];
  return null;
}

// npm's 409 text is "Cannot stage previously published version" both when
// the version is already staged and when it is already public. Callers
// check the registry first; this only recognises the staging conflict.
export function isAlreadyStagedOutput(text) {
  const body = String(text);
  return (
    /previously staged version/i.test(body) ||
    /cannot stage previously published version/i.test(body) ||
    /already been staged/i.test(body) ||
    /already staged/i.test(body)
  );
}

export function parseStageList(stdout) {
  const start = String(stdout).indexOf('[');
  if (start === -1) return [];
  try {
    const parsed = JSON.parse(String(stdout).slice(start));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findStagedItem(items, name, version) {
  return items.find((item) => item?.packageName === name && item?.version === version) ?? null;
}

export function approvalNote(user) {
  return `Approve at https://www.npmjs.com/settings/${user}/staged-packages (Staged Packages) with 2FA.`;
}

export function settleRelease({ candidateNames, publishedNames, stagedNames }) {
  const missing = candidateNames.filter(
    (name) => !publishedNames.has(name) && !stagedNames.has(name),
  );
  return { missing, ok: missing.length === 0 };
}

export function formatReleaseSummary({ onRegistry, staged, blocked, missing, user }) {
  const lines = ['', 'publish-release summary:', `  on the registry: ${onRegistry}`];
  for (const { pkg, reason } of blocked) {
    lines.push(`  BLOCKED ${pkg.name}@${pkg.version} — ${reason}`);
  }
  if (staged.length) {
    lines.push('', 'staged:');
    for (const item of staged) {
      const id = item.stageId ?? 'unavailable (already staged; see the Staged Packages page)';
      lines.push(`  STAGED ${item.name}@${item.version} — stage id ${id}`);
    }
    lines.push('', approvalNote(user), TRUSTED_PUBLISHER_NOTE);
  }
  for (const pkg of missing) {
    if (!blocked.some((entry) => entry.pkg.name === pkg.name)) {
      lines.push(`  MISSING ${pkg.name}@${pkg.version}`);
    }
  }
  return lines.join('\n');
}

export function readPackedManifest(tarball) {
  const text = execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], {
    encoding: 'utf8',
  });
  return { text, manifest: JSON.parse(text) };
}

export function writeReleaseState(root, staged) {
  writeFileSync(join(root, RELEASE_STATE_FILE), `${JSON.stringify({ staged }, null, 2)}\n`);
}

export function readReleaseState(root) {
  try {
    const data = JSON.parse(readFileSync(join(root, RELEASE_STATE_FILE), 'utf8'));
    return { staged: Array.isArray(data.staged) ? data.staged : [] };
  } catch {
    return { staged: [] };
  }
}

function execFileSync(command, args, options) {
  const result = spawnSync(command, args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr?.toString?.() || result.stdout?.toString?.() || '';
    throw new Error(`${command} ${args.join(' ')} exited ${result.status ?? 1}\n${detail}`);
  }
  return result.stdout;
}

// ---------------------------------------------------------------- registry

async function fetchPackument(name) {
  const url = REGISTRY + encodeURIComponent(name);
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`registry answered ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < 5) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

async function isPublished(name, version) {
  const packument = await fetchPackument(name);
  return Boolean(packument?.versions?.[version]);
}

// A just-published version can take a few seconds to show up in the
// packument; poll briefly before declaring the publish lost.
async function waitPublished(name, version, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await isPublished(name, version)) return true;
    if (Date.now() >= deadline) return false;
    await sleep(5000);
  }
}

// ---------------------------------------------------------------- packages

function changesetIgnored() {
  try {
    const config = JSON.parse(readFileSync(join(ROOT, '.changeset', 'config.json'), 'utf8'));
    return new Set(config.ignore ?? []);
  } catch {
    return new Set();
  }
}

function workspacePackages() {
  const ignored = changesetIgnored();
  const out = [];
  for (const entry of readdirSync(join(ROOT, 'packages'), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(ROOT, 'packages', entry.name, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (!pkg.name || !pkg.version) continue;
    out.push({
      name: pkg.name,
      version: pkg.version,
      dir: join(ROOT, 'packages', entry.name),
      held: pkg.private === true || ignored.has(pkg.name),
      heldReason: pkg.private === true ? 'private' : 'changeset-ignored',
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- processes

function runCapture(command, args, env, label, cwd = ROOT) {
  console.log(`\n--- ${label}\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) console.error(result.error.message);
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: `${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`,
  };
}

// Main lane: the OIDC exchange only happens when npm sees no token at all,
// so NODE_AUTH_TOKEN is removed outright. The stage-only token never
// reaches this process.
function mainLaneEnv() {
  const env = { ...process.env };
  delete env.NODE_AUTH_TOKEN;
  delete env.NPM_BOOTSTRAP_TOKEN;
  return env;
}

// Stage lane: the stage-only token is this child process's only
// credential. OIDC request variables are removed and provenance is forced
// off — provenance requires OIDC, and a stage must not claim it.
function bootstrapEnv() {
  const env = { ...process.env };
  delete env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  delete env.NPM_BOOTSTRAP_TOKEN;
  env.NODE_AUTH_TOKEN = BOOTSTRAP_TOKEN;
  env.npm_config_provenance = 'false';
  env.NPM_CONFIG_PROVENANCE = 'false';
  return env;
}

function publishOne(pkg, env, label) {
  return runCapture(
    'pnpm',
    ['--filter', pkg.name, 'publish', '--no-git-checks', '--tag', publishTag(pkg.version)],
    env,
    label,
  );
}

function npmVersion() {
  const result = spawnSync('npm', ['--version'], { encoding: 'utf8' });
  return (result.stdout ?? '').trim();
}

function packPackage(pkg) {
  const dest = mkdtempSync(join(tmpdir(), 'bn-pack-'));
  const result = runCapture(
    'pnpm',
    ['pack', '--pack-destination', dest],
    process.env,
    `pack ${pkg.name}@${pkg.version}`,
    pkg.dir,
  );
  if (result.status !== 0) {
    rmSync(dest, { recursive: true, force: true });
    return { error: `pnpm pack exited ${result.status}` };
  }
  const file = readdirSync(dest).find((name) => name.endsWith('.tgz'));
  if (!file) {
    rmSync(dest, { recursive: true, force: true });
    return { error: 'pnpm pack wrote no tarball' };
  }
  const tarball = join(dest, file);
  let packed;
  try {
    packed = readPackedManifest(tarball);
  } catch (err) {
    rmSync(dest, { recursive: true, force: true });
    return { error: `could not read the packed manifest: ${err.message}` };
  }
  const hits = workspaceProtocolLines(packed.text);
  if (hits.length) {
    rmSync(dest, { recursive: true, force: true });
    return {
      error:
        `packed manifest for ${pkg.name}@${pkg.version} still contains workspace: ` +
        `(${hits.join('; ')}). pnpm pack did not rewrite dependencies; refusing to stage.`,
    };
  }
  return { tarball, dest, manifest: packed.manifest };
}

function listStaged(pkg) {
  const result = runCapture(
    'npm',
    ['stage', 'list', pkg.name, '--json'],
    bootstrapEnv(),
    `stage list ${pkg.name}`,
  );
  if (result.status !== 0) return [];
  return parseStageList(result.stdout);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function verifyStagedManifest(stageId) {
  let last = { ok: false, workspace: false, reason: 'npm stage download did not run' };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const dir = mkdtempSync(join(tmpdir(), 'bn-stage-'));
    try {
      const result = runCapture(
        'npm',
        ['stage', 'download', stageId],
        bootstrapEnv(),
        `verify staged manifest ${stageId}`,
        dir,
      );
      if (result.status !== 0) {
        last = {
          ok: false,
          workspace: false,
          reason: `npm stage download exited ${result.status}`,
        };
      } else {
        const file = readdirSync(dir).find((name) => name.endsWith('.tgz'));
        if (!file) {
          last = { ok: false, workspace: false, reason: 'npm stage download wrote no tarball' };
        } else {
          const { text } = readPackedManifest(join(dir, file));
          const hits = workspaceProtocolLines(text);
          if (hits.length) {
            return {
              ok: false,
              workspace: true,
              reason:
                `staged manifest ${stageId} still contains workspace: (${hits.join('; ')}). ` +
                'Reject that stage on npmjs.com and re-run the release.',
            };
          }
          return { ok: true };
        }
      }
    } catch (err) {
      last = { ok: false, workspace: false, reason: err.message };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    if (attempt < 3) sleepSync(2000);
  }
  return last;
}

// Stage one package. An existing stage for this version is success.
// Returns { kind: 'published' | 'staged' | 'error', ... }.
async function stagePackage(pkg) {
  if (await isPublished(pkg.name, pkg.version)) return { kind: 'published' };

  const listed = findStagedItem(listStaged(pkg), pkg.name, pkg.version);
  if (listed) {
    const check = listed.id ? verifyStagedManifest(listed.id) : { ok: true };
    if (!check.ok && check.workspace) return { kind: 'error', reason: check.reason };
    if (!check.ok) {
      console.log(`\nwarning: could not re-read the existing stage: ${check.reason}`);
    }
    return {
      kind: 'staged',
      stageId: listed.id ?? null,
      tag: listed.tag ?? publishTag(pkg.version),
      already: true,
    };
  }

  const version = npmVersion();
  if (!npmSupportsStage(version)) {
    return {
      kind: 'error',
      reason:
        `npm ${version || '(unknown)'} has no \`npm stage publish\`. ` +
        'Staged publishing needs npm >= 11.15. The release job uses Node 24, which bundles that npm.',
    };
  }

  const packed = packPackage(pkg);
  if (packed.error) return { kind: 'error', reason: packed.error };
  const tag = publishTag(pkg.version);
  try {
    const result = runCapture(
      'npm',
      stagePublishArgs(packed.tarball, pkg.version),
      bootstrapEnv(),
      `stage ${pkg.name}@${pkg.version} (tag ${tag})`,
    );
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status === 0) {
      const stageId = parseStageId(output);
      if (!stageId) {
        const again = findStagedItem(listStaged(pkg), pkg.name, pkg.version);
        if (!again?.id) {
          return {
            kind: 'error',
            reason: 'npm stage publish exited 0 but printed no stage id',
          };
        }
        const check = verifyStagedManifest(again.id);
        if (!check.ok) return { kind: 'error', reason: check.reason };
        return { kind: 'staged', stageId: again.id, tag: again.tag ?? tag, already: false };
      }
      const check = verifyStagedManifest(stageId);
      if (!check.ok) return { kind: 'error', reason: check.reason };
      return { kind: 'staged', stageId, tag, already: false };
    }
    if (await isPublished(pkg.name, pkg.version)) return { kind: 'published' };
    if (isAlreadyStagedOutput(output)) {
      const again = findStagedItem(listStaged(pkg), pkg.name, pkg.version);
      if (again?.id) {
        const check = verifyStagedManifest(again.id);
        if (!check.ok && check.workspace) return { kind: 'error', reason: check.reason };
      }
      return {
        kind: 'staged',
        stageId: again?.id ?? parseStageId(output),
        tag: again?.tag ?? tag,
        already: true,
      };
    }
    return { kind: 'error', reason: `npm stage publish exited ${result.status}` };
  } finally {
    rmSync(packed.dest, { recursive: true, force: true });
  }
}

function npmUser() {
  const result = runCapture(
    'npm',
    ['whoami', '--registry', REGISTRY],
    bootstrapEnv(),
    'npm whoami',
  );
  const name = (result.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();
  if (result.status === 0 && name && /^[A-Za-z0-9][\w.-]*$/.test(name)) return name;
  return NPM_APPROVAL_USER;
}

export function changesetReleaseLines(packages, existing = '') {
  const lines = [];
  for (const pkg of packages) {
    const tagged =
      existing.includes(`"packageName":"${pkg.name}"`) ||
      existing.includes(`"packageName": "${pkg.name}"`);
    if (tagged) continue;
    lines.push(
      JSON.stringify({
        type: 'git-tag',
        tag: `${pkg.name}@${pkg.version}`,
        packageName: pkg.name,
      }),
    );
  }
  return lines;
}

function recordPublishedToChangesets(packages) {
  const file = process.env.CHANGESETS_OUTPUT;
  if (!file || packages.length === 0) return;
  let existing = '';
  try {
    existing = readFileSync(file, 'utf8');
  } catch {
    // The action creates the path; the file appears once something publishes.
  }
  const lines = changesetReleaseLines(packages, existing);
  if (lines.length === 0) return;
  appendFileSync(file, `${lines.join('\n')}\n`);
}

function recordStaged(staged, pkg, result) {
  const prior = staged.findIndex((item) => item.name === pkg.name);
  const entry = {
    name: pkg.name,
    version: pkg.version,
    stageId: result.stageId ?? null,
    tag: result.tag ?? publishTag(pkg.version),
  };
  if (prior === -1) staged.push(entry);
  else staged[prior] = entry;
}

// ---------------------------------------------------------------- main

export async function main() {
  const all = workspacePackages();
  const held = all.filter((pkg) => pkg.held);
  const candidates = all.filter((pkg) => !pkg.held);

  const fresh = []; // name unknown to the registry — OIDC cannot publish it
  const standard = []; // name known, this version missing — OIDC lane
  const alreadyPublished = new Set();
  let already = 0;
  for (const pkg of candidates) {
    const packument = await fetchPackument(pkg.name);
    if (packument?.versions?.[pkg.version]) {
      already += 1;
      alreadyPublished.add(pkg.name);
    } else if (packument === null) {
      fresh.push(pkg);
    } else {
      standard.push(pkg);
    }
  }

  console.log('publish-release plan:');
  console.log(`  already on the registry: ${already}`);
  console.log(
    `  held (never published): ${held.length}` +
      (held.length
        ? ` — ${held.map((pkg) => `${pkg.name}@${pkg.version} (${pkg.heldReason})`).join(', ')}`
        : ''),
  );
  console.log(
    `  main lane (OIDC): ${standard.length}` +
      (standard.length
        ? ` — ${standard.map((pkg) => `${pkg.name}@${pkg.version}`).join(', ')}`
        : ''),
  );
  console.log(
    `  stage lane (no package page yet): ${fresh.length}` +
      (fresh.length ? ` — ${fresh.map((pkg) => `${pkg.name}@${pkg.version}`).join(', ')}` : ''),
  );

  if (DRY_RUN) {
    console.log('\ndry run: nothing published or staged.');
    process.exit(0);
  }

  const blocked = []; // { pkg, reason }
  const failed = []; // { pkg, reason }
  const staged = []; // { name, version, stageId, tag }

  // ---- stage lane: registry-absent packages first. OIDC cannot create
  // the package page, so the stage-only token stages them.
  if (fresh.length > 0) {
    if (!BOOTSTRAP_TOKEN) {
      for (const pkg of fresh) {
        blocked.push({
          pkg,
          reason:
            'package does not exist on npm and NPM_BOOTSTRAP_TOKEN is not set. ' +
            'The secret must be a granular stage-only token; a direct publish is not used.',
        });
      }
      console.log(
        '\nstage lane skipped: NPM_BOOTSTRAP_TOKEN is not set. ' +
          'These packages cannot be OIDC-published until they exist; everything else still ships.',
      );
    } else {
      for (const pkg of fresh) {
        const result = await stagePackage(pkg);
        if (result.kind === 'published') continue;
        if (result.kind === 'staged') {
          recordStaged(staged, pkg, result);
          continue;
        }
        failed.push({ pkg, reason: result.reason });
      }
    }
  }

  // ---- main lane: stock changeset publish over OIDC. Skipped when a
  // registry-absent package has no stage-only token, because changeset
  // would stop on that name and strand the packages queued behind it.
  // The rescue pass then publishes the main lane one by one. A package
  // that was staged still isn't on the registry; if changeset stops on
  // it, the same rescue pass publishes whatever it didn't reach.
  if (standard.length > 0) {
    if (blocked.length > 0) {
      console.log(
        '\nskipping bare `changeset publish`: blocked first-publish packages ' +
          'would stop it mid-loop. The rescue pass publishes the main lane ' +
          'per package instead.',
      );
    } else {
      runCapture(
        'pnpm',
        ['exec', 'changeset', 'publish'],
        mainLaneEnv(),
        'main lane: changeset publish (OIDC)',
      );
    }
  }

  // ---- rescue: anything still missing gets OIDC, then the stage-only
  // token. One package's failure cannot strand the rest. A version that
  // is already staged (including "Cannot publish over previously staged
  // version" from an earlier attempt) is recorded as staged.
  const stagedNames = () => new Set(staged.map((item) => item.name));
  const failedNames = () => new Set(failed.map((entry) => entry.pkg.name));
  for (const pkg of [...standard, ...fresh]) {
    if (stagedNames().has(pkg.name)) continue;
    if (await isPublished(pkg.name, pkg.version)) continue;
    if (blocked.some((entry) => entry.pkg.name === pkg.name)) continue;

    const oidc = publishOne(pkg, mainLaneEnv(), `rescue (OIDC) ${pkg.name}`);
    const oidcOutput = `${oidc.stdout}\n${oidc.stderr}`;
    if (oidc.status === 0 && (await waitPublished(pkg.name, pkg.version, 30000))) continue;
    if (await isPublished(pkg.name, pkg.version)) continue;

    if (!BOOTSTRAP_TOKEN) {
      if (!failedNames().has(pkg.name)) {
        failed.push({
          pkg,
          reason: isAlreadyStagedOutput(oidcOutput)
            ? 'version is staged but NPM_BOOTSTRAP_TOKEN is not set, so the stage id could not be read'
            : 'still missing from the registry and NPM_BOOTSTRAP_TOKEN is not set',
        });
      }
      continue;
    }

    const result = await stagePackage(pkg);
    if (result.kind === 'published') continue;
    if (result.kind === 'staged') {
      recordStaged(staged, pkg, result);
      continue;
    }
    if (!failedNames().has(pkg.name)) failed.push({ pkg, reason: result.reason });
  }

  const publishedNames = new Set();
  for (const pkg of candidates) {
    if (await isPublished(pkg.name, pkg.version)) publishedNames.add(pkg.name);
  }
  const { missing } = settleRelease({
    candidateNames: candidates.map((pkg) => pkg.name),
    publishedNames,
    stagedNames: stagedNames(),
  });
  const missingPkgs = candidates.filter((pkg) => missing.includes(pkg.name));

  writeReleaseState(
    ROOT,
    staged.map((item) => ({ name: item.name, version: item.version, stageId: item.stageId })),
  );
  // changesets/action sets `published=true` (and then runs the smoke
  // test) only when CHANGESETS_OUTPUT lists git-tag events. Per-package
  // OIDC publishes in the rescue pass don't go through the changeset CLI,
  // so record them here. Packages changeset already recorded are left
  // alone; a second event would try to create the same tag twice.
  recordPublishedToChangesets(
    candidates.filter((pkg) => publishedNames.has(pkg.name) && !alreadyPublished.has(pkg.name)),
  );

  const user = staged.length && BOOTSTRAP_TOKEN ? npmUser() : NPM_APPROVAL_USER;
  console.log(
    formatReleaseSummary({
      onRegistry: publishedNames.size,
      staged,
      blocked,
      missing: missingPkgs,
      user,
    }),
  );

  if (blocked.length > 0) {
    console.log(
      '\nTo unblock: save a granular stage-only npm token (read and write, ' +
        'stage only — not a bypass-2FA token) as the GitHub repo secret ' +
        'NPM_BOOTSTRAP_TOKEN. The next release run stages the blocked packages. ' +
        'A maintainer approves them with 2FA; direct publish is not used.',
    );
  }
  for (const { pkg, reason } of failed) {
    if (missing.includes(pkg.name)) console.log(`  ERROR ${pkg.name}@${pkg.version} — ${reason}`);
  }
  if (missing.length > 0) {
    console.log('\nrelease incomplete: see BLOCKED/MISSING lines above.');
    process.exit(1);
  }
  console.log(
    staged.length
      ? '\nrelease complete: every publishable package is on npm or staged for approval.'
      : '\nrelease complete: every publishable package is on npm.',
  );
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectRun()) {
  await main();
}
