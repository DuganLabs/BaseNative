#!/usr/bin/env node
// ────────────────────────────────────────────────────────────────────────────
//   bn-doppler  ·  thin developer-experience over `doppler`.
//   "I tell Doppler what to ask. Doppler tells nobody what it knows."
// ────────────────────────────────────────────────────────────────────────────

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { loadRequired, findMissing } from './required.js';
import { dopplerRun } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = {
  init: cmdInit,
  verify: cmdVerify,
  'ci-token': cmdCiToken,
  run: cmdRun,
  help: () => showHelp(),
};

function showHelp() {
  console.log(`
  bn-doppler — DuganLabs Doppler glue

  Usage: bn-doppler <command> [options]

  Commands:
    init <project>       Bootstrap a Doppler project + dev/prep/prod configs
    verify               Check that all secrets in doppler-required.json are set
    ci-token             Print a service token for use as a GH Action secret
    run <cmd...>         Passthrough to \`doppler run --\`
    help                 Show this help

  Options:
    --project <name>     Override Doppler project name
    --config <name>      Override Doppler config (dev/prep/prod)
    --required <path>    Path to doppler-required.json (default: ./doppler-required.json)
    --yes, -y            Skip confirmation prompts (use with care)
    --help, -h           Show help
    --version, -v        Show version

  Examples:
    bn-doppler init my-app
    bn-doppler verify --config dev
    bn-doppler ci-token --config prod
    bn-doppler run -- pnpm dev
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
    );
    console.log(`bn-doppler v${pkg.version}`);
    return;
  }

  ensureDopplerInstalled();

  const cmd = args[0];
  const rest = args.slice(1);
  const handler = commands[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}\nRun "bn-doppler help" for available commands.`);
    process.exit(1);
  }
  await handler(rest);
}

function ensureDopplerInstalled() {
  const result = spawnSync('doppler', ['--version'], { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    console.error(
      [
        'bn-doppler: the `doppler` CLI was not found on PATH.',
        '',
        'Install it:',
        '  macOS:  brew install dopplerhq/cli/doppler',
        '  Linux:  curl -Ls --tlsv1.2 --proto "=https" https://cli.doppler.com/install.sh | sh',
        '  Win:    scoop install doppler',
        '',
        'Then sign in:  doppler login',
        '',
        'Docs: https://docs.doppler.com/docs/install-cli',
      ].join('\n'),
    );
    process.exit(127);
  }
}

// ── Tiny argument parser ────────────────────────────────────────────────────
function parseFlags(args) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          flags[a.slice(2)] = next;
          i += 1;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else if (a === '-y') {
      flags.yes = true;
    } else {
      positionals.push(a);
    }
  }
  return { flags, positionals };
}

// ── Commands ────────────────────────────────────────────────────────────────

async function cmdInit(args) {
  const { flags, positionals } = parseFlags(args);
  let projectName = positionals[0];
  if (!projectName) {
    projectName = await prompt('Doppler project name: ');
    if (!projectName) {
      console.error('Project name is required.');
      process.exit(1);
    }
  }
  const configs = ['dev', 'prep', 'prod'];

  console.log(`\nBootstrapping Doppler project: ${projectName}`);
  console.log(`  Configs: ${configs.join(', ')}\n`);

  if (!flags.yes) {
    const ok = await prompt('Proceed? (y/N) ');
    if (!/^y(es)?$/i.test(String(ok).trim())) {
      console.log('Aborted.');
      return;
    }
  }

  // Create project (idempotent: ignore "already exists").
  runOrWarn('doppler', ['projects', 'create', projectName], 'create project');

  // Create configs (Doppler ships default `dev`, `stg`, `prd`; we use our names).
  for (const c of configs) {
    runOrWarn(
      'doppler',
      ['configs', 'create', c, '--project', projectName],
      `create config ${c}`,
    );
  }

  // Pin the local repo to the dev config.
  const setup = spawnSync(
    'doppler',
    ['setup', '--project', projectName, '--config', 'dev', '--no-interactive'],
    { stdio: 'inherit' },
  );
  if (setup.status !== 0) {
    console.warn('warning: `doppler setup` did not complete cleanly. Run it manually.');
  }

  // Drop a starter doppler-required.json next to package.json if missing.
  const target = resolve(process.cwd(), 'doppler-required.json');
  if (!existsSync(target)) {
    const tmpl = readFileSync(
      join(__dirname, '..', 'templates', 'doppler-required.json'),
      'utf-8',
    );
    writeFileSync(target, tmpl);
    console.log(`\nCreated ${target}`);
  } else {
    console.log(`\nKept existing ${target}`);
  }

  console.log(`
Done. Next steps:
  1. Edit doppler-required.json to list the secrets your app needs.
  2. Set values:    doppler secrets set MY_KEY  (or via the dashboard)
  3. Verify:        bn-doppler verify
  4. Run locally:   doppler run -- pnpm dev   (or:  bn-doppler run -- pnpm dev)
`);
}

async function cmdVerify(args) {
  const { flags } = parseFlags(args);
  const path = flags.required || 'doppler-required.json';
  const schema = loadRequired(path);
  const config = flags.config;

  const dArgs = ['secrets', 'download', '--no-file', '--format', 'json'];
  if (flags.project) dArgs.push('--project', flags.project);
  if (config) dArgs.push('--config', config);

  const result = spawnSync('doppler', dArgs, { encoding: 'utf-8' });
  if (result.status !== 0) {
    console.error(
      `bn-doppler verify: failed to fetch secrets (exit ${result.status}).`,
    );
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }

  let env;
  try {
    env = JSON.parse(result.stdout);
  } catch (err) {
    console.error(`bn-doppler verify: doppler output was not JSON: ${err.message}`);
    process.exit(1);
  }

  const missing = findMissing(schema, env);
  const target = config ? `config "${config}"` : 'current config';

  if (missing.length === 0) {
    console.log(
      `OK — all ${schema.secrets.filter((s) => s.required !== false).length} ` +
        `required secret(s) are populated in ${target}.`,
    );
    return;
  }

  console.error(`Missing ${missing.length} secret(s) in ${target}:`);
  for (const name of missing) {
    const sec = schema.secrets.find((s) => s.name === name);
    const desc = sec?.description ? `  — ${sec.description}` : '';
    console.error(`  - ${name}${desc}`);
  }
  console.error(`\nSet them with:  doppler secrets set ${missing[0]}`);
  process.exit(1);
}

async function cmdCiToken(args) {
  const { flags } = parseFlags(args);
  const config = flags.config || 'prod';
  const project = flags.project;

  console.log('About to mint a Doppler service token.');
  console.log(`  Project: ${project ?? '(current setup)'}`);
  console.log(`  Config:  ${config}`);
  console.log('');
  console.log('This token grants read access to the secrets in that config.');
  console.log('Treat it as a secret. Add it to your GitHub repo as DOPPLER_TOKEN.');
  console.log('');

  if (!flags.yes) {
    const ok = await prompt('Mint token now? (y/N) ');
    if (!/^y(es)?$/i.test(String(ok).trim())) {
      console.log('Aborted.');
      return;
    }
  }

  const tokenArgs = [
    'configs',
    'tokens',
    'create',
    `bn-ci-${new Date().toISOString().slice(0, 10)}`,
    '--plain',
  ];
  if (project) tokenArgs.push('--project', project);
  if (config) tokenArgs.push('--config', config);

  const result = spawnSync('doppler', tokenArgs, { encoding: 'utf-8' });
  if (result.status !== 0) {
    console.error(`Failed to mint token (exit ${result.status}).`);
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }
  // Print the raw token to stdout so callers can pipe it.
  process.stdout.write(result.stdout);
  console.error(
    '\nAdd it to GitHub:  gh secret set DOPPLER_TOKEN --body "<paste>"',
  );
}

async function cmdRun(args) {
  // Everything after `run` is forwarded to `doppler run --`.
  // Allow leading `--` for clarity: `bn-doppler run -- pnpm dev`.
  const cmd = args[0] === '--' ? args.slice(1) : args;
  if (cmd.length === 0) {
    console.error('Usage: bn-doppler run -- <cmd> [args...]');
    process.exit(1);
  }
  const result = await dopplerRun(cmd);
  process.exit(result.code);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function runOrWarn(bin, args, label) {
  const r = spawnSync(bin, args, { encoding: 'utf-8' });
  if (r.status === 0) {
    console.log(`  ✓ ${label}`);
    return;
  }
  const msg = (r.stderr || r.stdout || '').trim();
  if (/already exists|duplicate/i.test(msg)) {
    console.log(`  · ${label} (already exists)`);
    return;
  }
  console.warn(`  ! ${label} failed: ${msg || `exit ${r.status}`}`);
}

async function prompt(question) {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

// Suppress unused-import warning in tools that don't track dynamic deps.
void spawn;
