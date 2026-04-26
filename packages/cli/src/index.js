#!/usr/bin/env node
// Built with BaseNative — basenative.dev
/**
 * `bn` — BaseNative CLI dispatcher.
 *
 * The CLI is the default front door for DuganLabs projects. Goals:
 *   - Fast startup. We lazy-import each command so cold-path latency is
 *     dominated by Node import time, not our code.
 *   - Zero heavy deps. parseArgs only.
 *   - Trillion-dollar polish. Beautiful help, idempotent commands, --json
 *     and --dry-run where they make sense.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, banner, hint } from './lib/colors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COMMANDS = {
  // Front-door
  create: { mod: './commands/create.js', desc: 'Scaffold a new project from a template' },
  prd: { mod: './commands/prd.js', desc: 'Init / edit / sync the project PRD' },
  speckit: { mod: './commands/speckit.js', desc: 'Spec-driven workflow (compatible with github/spec-kit)' },
  gh: { mod: './commands/gh.js', desc: 'GitHub milestones / issues / project board' },
  nx: { mod: './commands/nx.js', desc: 'Passthrough to Nx with sensible defaults' },
  dev: { mod: './commands/dev.js', desc: 'Start the dev server (auto-detects pm)' },
  deploy: { mod: './commands/deploy.js', desc: 'Deploy via Wrangler + Doppler' },
  doctor: { mod: './commands/doctor.js', desc: 'Validate local setup' },

  // Continuing-utility commands
  build: { mod: './commands/build.js', desc: 'Build for production' },
  generate: { mod: './commands/generate.js', desc: 'Generate component, route, or page' },
  env: { mod: './commands/env.js', desc: 'Manage environment variables' },
  analyze: { mod: './commands/analyze.js', desc: 'Analyze bundle size + deps' },
};

const ALIASES = {
  g: 'generate',
  d: 'dev',
  '?': 'help',
};

function showHelp() {
  banner();
  console.log(`
  ${c.gray('Usage:')} ${c.bold('bn')} ${c.gray('<command>')} ${c.gray('[options]')}

  ${c.bold('Front door')}
    ${c.accent('create')}    ${c.dim(COMMANDS.create.desc)}
    ${c.accent('prd')}       ${c.dim(COMMANDS.prd.desc)}
    ${c.accent('speckit')}   ${c.dim(COMMANDS.speckit.desc)}
    ${c.accent('gh')}        ${c.dim(COMMANDS.gh.desc)}
    ${c.accent('nx')}        ${c.dim(COMMANDS.nx.desc)}

  ${c.bold('Workflow')}
    ${c.accent('dev')}       ${c.dim(COMMANDS.dev.desc)}
    ${c.accent('deploy')}    ${c.dim(COMMANDS.deploy.desc)}
    ${c.accent('doctor')}    ${c.dim(COMMANDS.doctor.desc)}
    ${c.accent('build')}     ${c.dim(COMMANDS.build.desc)}
    ${c.accent('generate')}  ${c.dim(COMMANDS.generate.desc)}
    ${c.accent('env')}       ${c.dim(COMMANDS.env.desc)}
    ${c.accent('analyze')}   ${c.dim(COMMANDS.analyze.desc)}

  ${c.bold('Global options')}
    -h, --help        Show help (or per-command help)
    -v, --version     Print CLI version

  ${c.bold('Examples')}
    bn create my-app --template t4bs
    bn prd init && bn prd sync && bn gh sync
    bn speckit init && bn speckit spec onboarding
    bn doctor

  ${c.dim('Docs: https://basenative.dev/cli')}
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    console.log(`bn v${pkg.version}`);
    return;
  }

  const raw = args[0];
  const cmd = ALIASES[raw] || raw;
  const entry = COMMANDS[cmd];

  if (!entry) {
    console.error(`${c.red('✗')} Unknown command: ${c.bold(raw)}`);
    const guess = suggest(raw, [...Object.keys(COMMANDS), ...Object.keys(ALIASES)]);
    if (guess) hint(`Did you mean \`bn ${guess}\`?`);
    hint('Run `bn --help` for the full command list.');
    process.exit(1);
  }

  const mod = await import(entry.mod);
  await mod.run(args.slice(1));
}

/**
 * Levenshtein-ish suggestion. Tiny implementation; good enough for ~20 commands.
 */
function suggest(input, candidates) {
  let best = null;
  let bestScore = Infinity;
  for (const cand of candidates) {
    const d = lev(input, cand);
    if (d < bestScore && d <= Math.max(2, Math.floor(cand.length / 3))) {
      bestScore = d;
      best = cand;
    }
  }
  return best;
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array(n + 1)
    .fill(0)
    .map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = curr;
  }
  return prev[n];
}

main().catch((e) => {
  console.error(`${c.red('✗')} ${e.message}`);
  if (process.env.BN_DEBUG) console.error(e.stack);
  process.exit(1);
});
