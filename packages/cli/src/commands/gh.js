// Built with BaseNative — basenative.dev
/**
 * `bn gh` — wrap the GitHub CLI for org-standard workflows.
 *
 *   bn gh sync [--input file]   Read .bn/prd-issues.json (or speckit-tasks.json)
 *                               and create milestones + issues idempotently.
 *   bn gh board                 Create / verify the org-level Project for this repo.
 *   bn gh automate              Verify .github/workflows/deploy.yml uses the
 *                               DuganLabs/.github reusable workflows.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  isGhInstalled,
  isGhAuthed,
  ghHasScope,
  ensureMilestone,
  ensureIssue,
  gh as ghRaw,
} from '../lib/gh.js';
import { gitOriginSlug } from '../lib/git.js';
import { c, ok, err, info, hint, banner, step, warn } from '../lib/colors.js';

const DEFAULT_INPUT_CANDIDATES = ['.bn/prd-issues.json', '.bn/speckit-tasks.json'];

function showHelp() {
  console.log(`
  ${c.bold('bn gh')} ${c.gray('<subcommand>')}

  GitHub integration via the \`gh\` CLI.

  ${c.bold('Subcommands')}
    ${c.accent('sync')}        Create milestones + issues from .bn/*.json (idempotent)
    ${c.accent('board')}       Create / verify the org Project for this repo
    ${c.accent('automate')}    Verify reusable workflow references

  ${c.bold('Options')}
    --input <path>   Source JSON (default: .bn/prd-issues.json or .bn/speckit-tasks.json)
    --repo <owner/r> Override target repo (default: git origin)
    --dry-run        Print actions; touch nothing remote
    --json           Machine output
    -h, --help
`);
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      input: { type: 'string' },
      repo: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }

  if (!isGhInstalled()) {
    err('GitHub CLI (`gh`) is not installed.');
    hint('Install: https://cli.github.com/');
    process.exit(1);
  }

  const sub = positionals[0];
  if (sub === 'sync') return ghSync(values);
  if (sub === 'board') return ghBoard(values);
  if (sub === 'automate') return ghAutomate(values);

  err(`Unknown subcommand: ${sub}`);
  hint('Try: bn gh sync | board | automate');
  process.exit(1);
}

function resolveRepo(values) {
  const repo = values.repo || gitOriginSlug();
  if (!repo) {
    err('Could not determine target repo.');
    hint('Pass --repo owner/name, or run inside a repo with a GitHub origin.');
    process.exit(1);
  }
  return repo;
}

function loadInput(values) {
  const candidates = values.input ? [values.input] : DEFAULT_INPUT_CANDIDATES;
  for (const cand of candidates) {
    const abs = resolve(process.cwd(), cand);
    if (existsSync(abs)) return { path: cand, data: JSON.parse(readFileSync(abs, 'utf-8')) };
  }
  err(`No input file found. Tried: ${candidates.join(', ')}`);
  hint('Run: bn prd sync   or   bn speckit tasks');
  process.exit(1);
}

function ghSync(values) {
  if (!isGhAuthed()) {
    err('`gh` is not authenticated.');
    hint('Run: gh auth login');
    process.exit(1);
  }
  const repo = resolveRepo(values);
  const { path, data } = loadInput(values);

  if (!values.json) {
    banner();
    console.log(`  ${c.dim('Repo:')}   ${c.bold(repo)}`);
    console.log(`  ${c.dim('Source:')} ${c.bold(path)}`);
    console.log(`  ${c.dim('Items:')}  ${data.milestones?.length || 0} milestone(s), ${data.issues?.length || 0} issue(s)`);
    console.log('');
  }

  const created = { milestones: [], issues: [], skipped: [] };

  for (const m of data.milestones || []) {
    if (values['dry-run']) {
      step(`would ensure milestone: ${m.title}`);
      continue;
    }
    try {
      const result = ensureMilestone(repo, m);
      created.milestones.push(result);
      ok(`milestone: ${m.title}`);
    } catch (e) {
      warn(`milestone "${m.title}" — ${e.message}`);
    }
  }

  for (const i of data.issues || []) {
    if (values['dry-run']) {
      step(`would ensure issue: ${i.title}`);
      continue;
    }
    try {
      const result = ensureIssue(repo, i);
      if (result._existed) {
        created.skipped.push(i.title);
        info(`exists:    ${i.title}`);
      } else {
        created.issues.push(result);
        ok(`issue:     ${i.title}`);
      }
    } catch (e) {
      warn(`issue "${i.title}" — ${e.message}`);
    }
  }

  if (values.json) console.log(JSON.stringify(created, null, 2));
  else {
    console.log('');
    ok(`Sync complete — created ${created.issues.length}, skipped ${created.skipped.length}.`);
  }
  return created;
}

function ghBoard(values) {
  const repo = resolveRepo(values);
  if (!ghHasScope('project')) {
    warn('Your gh token does not appear to have the `project` scope.');
    hint('Refresh with: gh auth refresh -s project,read:project');
  }

  // List org projects via gh CLI
  const owner = repo.split('/')[0];
  const r = ghRaw(['project', 'list', '--owner', owner, '--format', 'json']);
  if (!r.ok) {
    err(`Failed to list projects: ${r.stderr}`);
    process.exit(1);
  }

  const projects = JSON.parse(r.stdout).projects || [];
  const target = projects.find((p) => p.title === repo || p.title === repo.split('/')[1]);

  if (target) {
    ok(`Found project: "${target.title}" (#${target.number})`);
    info(`URL: ${target.url}`);
    return target;
  }

  if (values['dry-run']) {
    step(`would create project "${repo.split('/')[1]}" under @${owner}`);
    return null;
  }

  const create = ghRaw(['project', 'create', '--owner', owner, '--title', repo.split('/')[1], '--format', 'json']);
  if (!create.ok) {
    err(`Failed to create project: ${create.stderr}`);
    hint('Make sure your token has the `project` scope.');
    process.exit(1);
  }
  const project = JSON.parse(create.stdout);
  ok(`Created project "${project.title}" (#${project.number})`);
  info(`URL: ${project.url}`);
  return project;
}

function ghAutomate(values) {
  const cwd = process.cwd();
  const deployPath = resolve(cwd, '.github/workflows/deploy.yml');
  if (!existsSync(deployPath)) {
    err('.github/workflows/deploy.yml not found.');
    hint('`bn create` adds one. Otherwise create one that calls a DuganLabs/.github reusable workflow.');
    process.exit(1);
  }
  const yml = readFileSync(deployPath, 'utf-8');
  const usesReusable = /uses:\s*DuganLabs\/\.github\/.github\/workflows\//.test(yml);

  const result = { path: '.github/workflows/deploy.yml', usesReusable };

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
    if (!usesReusable) process.exit(1);
    return result;
  }

  if (usesReusable) {
    ok('deploy.yml references DuganLabs/.github reusable workflows.');
  } else {
    err('deploy.yml does not call a DuganLabs/.github reusable workflow.');
    hint('Replace inline jobs with `uses: DuganLabs/.github/.github/workflows/<name>.yml@main`.');
    process.exit(1);
  }
  return result;
}
