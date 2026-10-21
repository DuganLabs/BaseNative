#!/usr/bin/env node
// Release publisher for every @basenative package, with a first-publish
// bootstrap lane. release.yml hands publishing to this script through the
// changesets action's publish-script.
//
//   node scripts/publish-release.mjs              # publish what is missing
//   node scripts/publish-release.mjs --dry-run    # report the lanes only
//
// Why two lanes: npm trusted publishing (OIDC) cannot publish a package
// that has never existed on the registry — a trusted publisher can only be
// configured on a package page, and the page is created by the first
// publish. On 2026-10-20 the 2.2.0 release died on exactly that: the
// single `changeset publish` hit the brand-new @basenative/ios, exited,
// and stranded the 18 packages queued behind it. npm's own documentation
// gives the only supported bootstrap: the first version is published with
// a traditional token.
//
//   Bootstrap lane — packages whose name returns 404 on the registry are
//   published first, one by one, with the granular token in
//   NPM_BOOTSTRAP_TOKEN (passed to the child process as NODE_AUTH_TOKEN
//   for that publish only, with the OIDC token request variables removed
//   and provenance explicitly off: provenance requires OIDC, so a token
//   publish must not claim it). If the secret is absent, these packages
//   are reported as blocked and everything else still ships.
//
//   Main lane — everything else goes through the stock
//   `changeset publish` over OIDC with provenance, exactly as before, so
//   tags and release notes behave identically. NODE_AUTH_TOKEN is deleted
//   (not emptied — an empty value disables the OIDC fallback) from that
//   process's environment.
//
//   Rescue pass — whatever is still missing afterwards (a mid-loop death,
//   an existing package whose trusted publisher was never configured) is
//   retried per package: OIDC first, then the bootstrap token when one is
//   available. One package's failure can never strand the rest again.
//
// Packages held on purpose — marked "private": true, or named in the
// changesets config's ignore list — are reported as held and never
// published by either lane. (The ignore list is how a package is parked
// outside changesets entirely; publishing one anyway would defeat it.)
// The run exits non-zero only when something that should have published
// did not, and the summary names each blocked package and the one action
// that unblocks it.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org/';
const DRY_RUN = process.argv.includes('--dry-run');
const BOOTSTRAP_TOKEN = (process.env.NPM_BOOTSTRAP_TOKEN ?? '').trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Publish failures are handled lane by lane below; anything that still
// throws (the registry unreachable after retries, an unreadable
// package.json) is a hard stop, reported as one line rather than a stack.
process.on('unhandledRejection', (err) => {
  console.error(`\npublish-release: fatal: ${err?.message ?? err}`);
  process.exit(1);
});

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
      held: pkg.private === true || ignored.has(pkg.name),
      heldReason: pkg.private === true ? 'private' : 'changeset-ignored',
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- processes

function run(command, args, env, label) {
  console.log(`\n--- ${label}\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', env });
  return result.status ?? 1;
}

// Main lane: the OIDC exchange only happens when npm sees no token at all,
// so NODE_AUTH_TOKEN is removed outright. The bootstrap token and the
// bootstrap variable itself never reach this process.
function mainLaneEnv() {
  const env = { ...process.env };
  delete env.NODE_AUTH_TOKEN;
  delete env.NPM_BOOTSTRAP_TOKEN;
  return env;
}

// Bootstrap lane: the token is this child process's only credential. The
// OIDC request variables are removed and provenance is forced off so the
// publish cannot claim an attestation it did not earn.
function bootstrapEnv() {
  const env = { ...process.env };
  delete env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  delete env.NPM_BOOTSTRAP_TOKEN;
  env.NODE_AUTH_TOKEN = BOOTSTRAP_TOKEN;
  env.npm_config_provenance = 'false';
  return env;
}

function publishOne(pkg, env, label) {
  return run('pnpm', ['--filter', pkg.name, 'publish', '--no-git-checks'], env, label);
}

// ---------------------------------------------------------------- main

const all = workspacePackages();
const held = all.filter((p) => p.held);
const candidates = all.filter((p) => !p.held);

const fresh = []; // name unknown to the registry — bootstrap lane
const standard = []; // name known, this version missing — main lane
let already = 0;
for (const pkg of candidates) {
  const packument = await fetchPackument(pkg.name);
  if (packument?.versions?.[pkg.version]) {
    already += 1;
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
      ? ` — ${held.map((p) => `${p.name}@${p.version} (${p.heldReason})`).join(', ')}`
      : ''),
);
console.log(
  `  main lane (OIDC): ${standard.length}` +
    (standard.length ? ` — ${standard.map((p) => `${p.name}@${p.version}`).join(', ')}` : ''),
);
console.log(
  `  bootstrap lane (first publish): ${fresh.length}` +
    (fresh.length ? ` — ${fresh.map((p) => `${p.name}@${p.version}`).join(', ')}` : ''),
);

if (DRY_RUN) {
  console.log('\ndry run: nothing published.');
  process.exit(0);
}

const blocked = []; // { pkg, reason }
const failed = []; // { pkg, reason }

// ---- bootstrap lane: registry-absent packages first, token only.
const bootstrapped = [];
if (fresh.length > 0) {
  if (!BOOTSTRAP_TOKEN) {
    for (const pkg of fresh) {
      blocked.push({
        pkg,
        reason: 'package does not exist on npm and NPM_BOOTSTRAP_TOKEN is not set',
      });
    }
    console.log(
      '\nbootstrap lane skipped: NPM_BOOTSTRAP_TOKEN is not set. ' +
        'The packages above cannot be OIDC-published until they exist; ' +
        'everything else still ships.',
    );
  } else {
    for (const pkg of fresh) {
      const status = publishOne(
        pkg,
        bootstrapEnv(),
        `bootstrap publish ${pkg.name}@${pkg.version}`,
      );
      if (status === 0 && (await waitPublished(pkg.name, pkg.version))) {
        bootstrapped.push(pkg);
      } else {
        failed.push({
          pkg,
          reason: `bootstrap publish exited ${status} or never reached the registry`,
        });
      }
    }
  }
}

// ---- main lane: stock changeset publish over OIDC. Skipped in its bare
// form when blocked first-publishes exist, because it would die on the
// first of them and strand the rest; the rescue pass below then publishes
// the main-lane set one by one instead.
if (standard.length > 0) {
  if (blocked.length > 0) {
    console.log(
      '\nskipping bare `changeset publish`: blocked first-publish packages ' +
        'would stop it mid-loop. The rescue pass publishes the main lane ' +
        'per package instead.',
    );
  } else {
    run(
      'pnpm',
      ['exec', 'changeset', 'publish'],
      mainLaneEnv(),
      'main lane: changeset publish (OIDC)',
    );
  }
}

// ---- rescue pass: anything still missing gets a per-package attempt —
// OIDC first, then the bootstrap token when one is available (that is
// what rescues an existing package whose trusted publisher was never
// configured). Fresh packages blocked for lack of a token stay blocked.
const rescued = new Set(bootstrapped.map((p) => p.name));
for (const pkg of [...standard, ...fresh]) {
  if (rescued.has(pkg.name)) continue;
  if (await isPublished(pkg.name, pkg.version)) continue;
  if (blocked.some((b) => b.pkg.name === pkg.name)) continue;

  const status = publishOne(pkg, mainLaneEnv(), `rescue (OIDC) ${pkg.name}`);
  if (status === 0 && (await waitPublished(pkg.name, pkg.version, 30000))) {
    rescued.add(pkg.name);
    continue;
  }
  if (BOOTSTRAP_TOKEN) {
    const tokenStatus = publishOne(pkg, bootstrapEnv(), `rescue (bootstrap token) ${pkg.name}`);
    if (tokenStatus === 0 && (await waitPublished(pkg.name, pkg.version, 30000))) {
      rescued.add(pkg.name);
      continue;
    }
  }
  if (!failed.some((f) => f.pkg.name === pkg.name)) {
    failed.push({
      pkg,
      reason: 'still missing from the registry after every lane',
    });
  }
}

// ---- final verification: the registry, not exit codes, is the truth.
const missing = [];
for (const pkg of candidates) {
  if (!(await isPublished(pkg.name, pkg.version))) missing.push(pkg);
}

console.log('\npublish-release summary:');
console.log(`  on the registry: ${candidates.length - missing.length}`);
for (const { pkg, reason } of blocked) {
  console.log(`  BLOCKED ${pkg.name}@${pkg.version} — ${reason}`);
}
for (const pkg of missing) {
  if (!blocked.some((b) => b.pkg.name === pkg.name)) {
    console.log(`  MISSING ${pkg.name}@${pkg.version}`);
  }
}

if (blocked.length > 0) {
  console.log(
    '\nTo unblock: create a granular npm token with read/write access to ' +
      'the @basenative scope and save it as the GitHub repo secret ' +
      'NPM_BOOTSTRAP_TOKEN. The next release run first-publishes the ' +
      'blocked packages automatically; no other step is needed.',
  );
}
if (missing.length > 0) {
  console.log('\nrelease incomplete: see BLOCKED/MISSING lines above.');
  process.exit(1);
}
console.log('\nrelease complete: every publishable package is on npm.');
