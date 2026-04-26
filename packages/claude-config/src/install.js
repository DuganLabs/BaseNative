// Built with BaseNative — basenative.dev
// Installer — copies bundled templates into a project's .claude/ directory.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_KINDS, SETTINGS_TEMPLATE, CLAUDE_MD_TEMPLATE, PACKAGE_ROOT } from './paths.js';

const C_RESET = '\x1b[0m';
const C_DIM = '\x1b[2m';
const C_GREEN = '\x1b[32m';
const C_YELLOW = '\x1b[33m';
const C_CYAN = '\x1b[36m';
const C_BOLD = '\x1b[1m';

function log(line) { process.stdout.write(line + '\n'); }
function dim(s) { return `${C_DIM}${s}${C_RESET}`; }
function green(s) { return `${C_GREEN}${s}${C_RESET}`; }
function yellow(s) { return `${C_YELLOW}${s}${C_RESET}`; }
function cyan(s) { return `${C_CYAN}${s}${C_RESET}`; }
function bold(s) { return `${C_BOLD}${s}${C_RESET}`; }

/** Synchronous yes/no prompt via raw stdin. */
async function confirm(question, defaultYes = false) {
  if (!process.stdin.isTTY) return defaultYes;
  process.stdout.write(`${question} ${defaultYes ? '[Y/n]' : '[y/N]'} `);
  return new Promise((resolve) => {
    const onData = (chunk) => {
      const s = chunk.toString().trim().toLowerCase();
      process.stdin.removeListener('data', onData);
      process.stdin.pause();
      if (s === '') resolve(defaultYes);
      else resolve(s === 'y' || s === 'yes');
    };
    process.stdin.resume();
    process.stdin.once('data', onData);
  });
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function listTemplateFiles(srcDir, glob) {
  if (!existsSync(srcDir)) return [];
  const ext = glob.replace('*', '');
  return readdirSync(srcDir).filter((f) => f.endsWith(ext));
}

/**
 * Install templates into <projectRoot>/.claude/.
 * @param {object} opts
 * @param {string} opts.projectRoot - target project root.
 * @param {boolean} [opts.force] - overwrite without asking.
 * @param {boolean} [opts.dryRun] - print what would happen, don't write.
 * @param {boolean} [opts.quiet] - suppress per-file logs.
 */
export async function install({ projectRoot, force = false, dryRun = false, quiet = false } = {}) {
  if (!projectRoot) throw new Error('install({ projectRoot }) required');
  const claudeDir = join(projectRoot, '.claude');
  if (!quiet) log(bold(`@basenative/claude-config → installing into ${cyan(claudeDir)}`));
  if (!dryRun) ensureDir(claudeDir);

  const summary = { written: 0, skipped: 0, overwritten: 0 };

  for (const kind of TEMPLATE_KINDS) {
    const srcDir = join(PACKAGE_ROOT, kind.src);
    const destDir = join(claudeDir, kind.dest);
    if (!dryRun) ensureDir(destDir);
    const files = listTemplateFiles(srcDir, kind.glob);
    if (!quiet) log(dim(`  ${kind.name}: ${files.length} file(s)`));

    for (const f of files) {
      const srcPath = join(srcDir, f);
      const destPath = join(destDir, f);
      const exists = existsSync(destPath);

      if (exists && !force) {
        const same = readFileSync(srcPath, 'utf8') === readFileSync(destPath, 'utf8');
        if (same) {
          summary.skipped++;
          if (!quiet) log(`    ${dim('=')} ${f} ${dim('(unchanged)')}`);
          continue;
        }
        const ok = await confirm(`    ${yellow('!')} ${f} differs locally — overwrite?`, false);
        if (!ok) {
          summary.skipped++;
          if (!quiet) log(`    ${dim('-')} ${f} ${dim('(kept local)')}`);
          continue;
        }
        summary.overwritten++;
      } else {
        summary.written++;
      }

      if (!dryRun) {
        const data = readFileSync(srcPath);
        writeFileSync(destPath, data);
        if (kind.mode) chmodSync(destPath, kind.mode);
      }
      if (!quiet) log(`    ${green('+')} ${f}`);
    }
  }

  // settings.template.json → .claude/settings.json (only if missing — we never clobber settings).
  const settingsDest = join(claudeDir, 'settings.json');
  if (existsSync(SETTINGS_TEMPLATE)) {
    if (!existsSync(settingsDest)) {
      if (!dryRun) writeFileSync(settingsDest, readFileSync(SETTINGS_TEMPLATE));
      summary.written++;
      if (!quiet) log(`  ${green('+')} settings.json`);
    } else if (!quiet) {
      log(`  ${dim('=')} settings.json ${dim('(already present — not touched)')}`);
      log(dim(`     diff against template: ${SETTINGS_TEMPLATE}`));
    }
  }

  // CLAUDE.md.tmpl → CLAUDE.md (only if missing).
  if (existsSync(CLAUDE_MD_TEMPLATE)) {
    const claudeMdDest = join(projectRoot, 'CLAUDE.md');
    if (!existsSync(claudeMdDest)) {
      if (!dryRun) writeFileSync(claudeMdDest, readFileSync(CLAUDE_MD_TEMPLATE));
      summary.written++;
      if (!quiet) log(`  ${green('+')} CLAUDE.md ${dim('(from template)')}`);
    }
  }

  if (!quiet) {
    log('');
    log(bold('Done.') + ` ${green(summary.written + ' written')}, ${yellow(summary.overwritten + ' overwritten')}, ${dim(summary.skipped + ' skipped')}`);
    if (dryRun) log(dim('(dry run — no files actually changed)'));
  }
  return summary;
}

/** Verify the project has all expected files. Returns { ok, missing, extras }. */
export function verify({ projectRoot } = {}) {
  if (!projectRoot) throw new Error('verify({ projectRoot }) required');
  const claudeDir = join(projectRoot, '.claude');
  const missing = [];
  const present = [];

  if (!existsSync(claudeDir)) {
    return { ok: false, missing: ['.claude/'], present: [], hasSettings: false };
  }

  for (const kind of TEMPLATE_KINDS) {
    const srcDir = join(PACKAGE_ROOT, kind.src);
    const destDir = join(claudeDir, kind.dest);
    const files = listTemplateFiles(srcDir, kind.glob);
    for (const f of files) {
      const dest = join(destDir, f);
      const rel = join('.claude', kind.dest, f);
      if (!existsSync(dest)) missing.push(rel);
      else present.push(rel);
    }
  }

  const hasSettings = existsSync(join(claudeDir, 'settings.json'));
  return { ok: missing.length === 0 && hasSettings, missing, present, hasSettings };
}

/** List installed agents/skills/commands/hooks for a project. */
export function list({ projectRoot } = {}) {
  if (!projectRoot) throw new Error('list({ projectRoot }) required');
  const claudeDir = join(projectRoot, '.claude');
  const out = {};
  for (const kind of TEMPLATE_KINDS) {
    const dir = join(claudeDir, kind.dest);
    if (!existsSync(dir)) { out[kind.name] = []; continue; }
    out[kind.name] = readdirSync(dir).filter((f) => f.endsWith(kind.glob.replace('*', '')));
  }
  return out;
}
