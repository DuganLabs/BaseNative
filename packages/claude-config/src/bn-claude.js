#!/usr/bin/env node
// Built with BaseNative — basenative.dev
// bn-claude — install/update/verify @basenative/claude-config templates in a project.

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { install, verify, listInstalled } from '../src/index.js';

const C_RESET = '\x1b[0m';
const C_DIM = '\x1b[2m';
const C_GREEN = '\x1b[32m';
const C_RED = '\x1b[31m';
const C_BOLD = '\x1b[1m';

const dim = (s) => `${C_DIM}${s}${C_RESET}`;
const green = (s) => `${C_GREEN}${s}${C_RESET}`;
const red = (s) => `${C_RED}${s}${C_RESET}`;
const bold = (s) => `${C_BOLD}${s}${C_RESET}`;

function showHelp() {
  console.log(`
  ${bold('bn-claude')} — manage Claude Code config for a DuganLabs / BaseNative project.

  Usage: bn-claude <command> [options]

  Commands:
    install        Copy bundled agents/skills/commands/hooks/settings into .claude/
    update         Re-run install (alias; same as install --force on changed files)
    verify         Check that all expected files are installed
    list           Show installed agents/skills/commands/hooks
    help           Show this help

  Options:
    --root <dir>   Project root (default: cwd)
    --force        Overwrite local files without asking
    --dry-run      Print what would change, don't write
    --quiet        Suppress per-file logs

  Examples:
    bn-claude install
    bn-claude install --root ../my-app
    bn-claude verify
    bn-claude list
`);
}

async function cmdInstall(opts, { force = false } = {}) {
  const summary = await install({
    projectRoot: opts.root,
    force: force || opts.force,
    dryRun: opts['dry-run'],
    quiet: opts.quiet,
  });
  process.exit(0);
  return summary;
}

function cmdVerify(opts) {
  const result = verify({ projectRoot: opts.root });
  if (result.ok) {
    console.log(green('OK') + ` — ${result.present.length} files present, settings.json exists.`);
    process.exit(0);
  } else {
    console.log(red('MISSING') + ` ${result.missing.length} file(s):`);
    for (const m of result.missing) console.log(`  ${red('-')} ${m}`);
    if (!result.hasSettings) console.log(`  ${red('-')} .claude/settings.json`);
    console.log('');
    console.log(dim('Run `bn-claude install` to fix.'));
    process.exit(1);
  }
}

function cmdList(opts) {
  const found = listInstalled({ projectRoot: opts.root });
  for (const [kind, files] of Object.entries(found)) {
    console.log(bold(kind) + dim(` (${files.length})`));
    if (files.length === 0) console.log('  ' + dim('(none)'));
    for (const f of files) console.log('  ' + f);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === 'help' || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const command = args[0];
  let parsed;
  try {
    parsed = parseArgs({
      args: args.slice(1),
      options: {
        root: { type: 'string', default: process.cwd() },
        force: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        quiet: { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(red('error: ') + err.message);
    process.exit(1);
  }
  const opts = { ...parsed.values, root: resolve(parsed.values.root) };

  switch (command) {
    case 'install':
      await cmdInstall(opts);
      break;
    case 'update':
      await cmdInstall(opts, { force: true });
      break;
    case 'verify':
      cmdVerify(opts);
      break;
    case 'list':
      cmdList(opts);
      break;
    default:
      console.error(red(`Unknown command: ${command}`));
      console.error(`Run ${bold('bn-claude help')} for available commands.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(red('error: ') + (err?.message || err));
  process.exit(1);
});
