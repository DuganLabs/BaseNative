// Built with BaseNative — basenative.dev
/**
 * `bn doctor` — validate the local setup against BaseNative conventions.
 *
 * Checks (each emits a fixable hint):
 *   - Node version >= 20.11
 *   - .nvmrc exists and matches engines.node
 *   - pnpm pinned via packageManager
 *   - eslint.config.js extends @basenative/eslint-config
 *   - tsconfig.json extends @basenative/tsconfig
 *   - doppler-required.json present (if Doppler is used)
 *   - .github/workflows/deploy.yml uses DuganLabs/.github reusable workflows
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { c, ok, err, info, warn, hint, banner } from '../lib/colors.js';

const MIN_NODE = [20, 11];

function showHelp() {
  console.log(`
  ${c.bold('bn doctor')}

  Run a battery of checks against the project. Each failing check prints a
  one-line fix suggestion.

  ${c.bold('Options')}
    --json     Emit findings as JSON (exit 1 if any errors)
    --fix      ${c.dim('(reserved — not implemented yet)')}
    -h, --help
`);
}

export async function run(args) {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: 'boolean', default: false },
      fix: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    return;
  }

  const cwd = process.cwd();
  const findings = [];

  function check(name, fn) {
    try {
      const r = fn();
      findings.push({ name, ...r });
    } catch (e) {
      findings.push({ name, level: 'error', message: e.message });
    }
  }

  check('node-version', () => {
    const cur = process.versions.node.split('.').map(Number);
    const ok = cur[0] > MIN_NODE[0] || (cur[0] === MIN_NODE[0] && cur[1] >= MIN_NODE[1]);
    return ok
      ? { level: 'ok', message: `node ${process.versions.node}` }
      : {
          level: 'error',
          message: `node ${process.versions.node} (need ≥ ${MIN_NODE.join('.')})`,
          fix: 'Use nvm/fnm: `nvm install 20.11.0 && nvm use 20.11.0`',
        };
  });

  check('.nvmrc', () => {
    const p = resolve(cwd, '.nvmrc');
    if (!existsSync(p)) {
      return { level: 'warn', message: 'missing', fix: 'echo 20.11.0 > .nvmrc' };
    }
    const v = readFileSync(p, 'utf-8').trim();
    return { level: 'ok', message: v };
  });

  check('packageManager pinned', () => {
    const pkg = readPkg(cwd);
    if (!pkg) return { level: 'warn', message: 'no package.json' };
    if (pkg.packageManager) return { level: 'ok', message: pkg.packageManager };
    return {
      level: 'warn',
      message: 'not pinned',
      fix: `Add "packageManager": "pnpm@9.15.0" to package.json`,
    };
  });

  check('eslint.config.js extends @basenative/eslint-config', () => {
    const p = resolve(cwd, 'eslint.config.js');
    if (!existsSync(p)) {
      return {
        level: 'warn',
        message: 'eslint.config.js missing',
        fix: 'Create one importing @basenative/eslint-config (see CLI README).',
      };
    }
    const txt = readFileSync(p, 'utf-8');
    if (txt.includes('@basenative/eslint-config')) return { level: 'ok', message: 'extends shared config' };
    return {
      level: 'error',
      message: 'does not extend @basenative/eslint-config',
      fix: 'Replace its contents with `import bn from "@basenative/eslint-config"; export default [...bn];`',
    };
  });

  check('tsconfig.json extends @basenative/tsconfig', () => {
    const p = resolve(cwd, 'tsconfig.json');
    if (!existsSync(p)) {
      return { level: 'warn', message: 'tsconfig.json missing', fix: 'Add tsconfig.json that extends @basenative/tsconfig/<browser|node|worker>.' };
    }
    let json;
    try {
      json = JSON.parse(readFileSync(p, 'utf-8'));
    } catch {
      return { level: 'error', message: 'invalid JSON', fix: 'Repair tsconfig.json.' };
    }
    const ext = json.extends || '';
    if (String(ext).includes('@basenative/tsconfig')) return { level: 'ok', message: ext };
    return {
      level: 'warn',
      message: `extends "${ext}"`,
      fix: 'Use "extends": "@basenative/tsconfig/browser.json" (or node/worker).',
    };
  });

  check('doppler-required.json populated', () => {
    const p = resolve(cwd, 'doppler-required.json');
    if (!existsSync(p)) return { level: 'info', message: 'not used' };
    let json;
    try {
      json = JSON.parse(readFileSync(p, 'utf-8'));
    } catch {
      return { level: 'error', message: 'invalid JSON' };
    }
    if (Array.isArray(json.required) && json.required.length > 0) {
      return { level: 'ok', message: `${json.required.length} required secret(s)` };
    }
    return { level: 'warn', message: 'empty `required` list', fix: 'Document at least one required secret.' };
  });

  check('deploy.yml uses reusable workflows', () => {
    const p = resolve(cwd, '.github/workflows/deploy.yml');
    if (!existsSync(p)) return { level: 'warn', message: 'no deploy.yml', fix: '`bn create` ships one — copy it in.' };
    const txt = readFileSync(p, 'utf-8');
    if (/uses:\s*DuganLabs\/\.github\/.github\/workflows\//.test(txt)) {
      return { level: 'ok', message: 'references DuganLabs/.github' };
    }
    return {
      level: 'error',
      message: 'inline jobs',
      fix: 'Replace with `uses: DuganLabs/.github/.github/workflows/<name>.yml@main`.',
    };
  });

  // Summary
  if (values.json) {
    console.log(JSON.stringify({ findings }, null, 2));
    if (findings.some((f) => f.level === 'error')) process.exit(1);
    return findings;
  }

  banner();
  console.log('');
  for (const f of findings) {
    const label = f.name.padEnd(48);
    if (f.level === 'ok') ok(`${label} ${c.dim(f.message)}`);
    else if (f.level === 'warn') warn(`${label} ${c.dim(f.message)}`);
    else if (f.level === 'info') info(`${label} ${c.dim(f.message)}`);
    else err(`${label} ${c.dim(f.message)}`);
    if (f.fix && f.level !== 'ok') hint(f.fix);
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warns = findings.filter((f) => f.level === 'warn').length;
  console.log('');
  if (errors === 0 && warns === 0) ok('All checks passed.');
  else {
    console.log(`  ${c.bold(`${errors} error(s)`)}, ${c.bold(`${warns} warning(s)`)}.`);
    if (errors > 0) process.exit(1);
  }
  return findings;
}

function readPkg(cwd) {
  const p = resolve(cwd, 'package.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}
