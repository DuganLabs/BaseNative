// Built with BaseNative — basenative.dev
/**
 * `bn speckit` — GitHub SpecKit integration.
 *
 *   bn speckit init             Bootstrap .specify/ directory.
 *   bn speckit spec <name>      Scaffold a new spec under .specify/specs/NNN-name/
 *   bn speckit plan             Stub plan.md for the active spec.
 *   bn speckit tasks            Extract tasks → .bn/speckit-tasks.json (compatible with bn gh sync).
 *   bn speckit validate         Lint specs/plans/tasks for required fields.
 *
 * Files we produce match the SpecKit conventions: spec.md, plan.md, tasks.md,
 * with a `memory/constitution.md` at the root. We don't shell out to the
 * upstream `specify` CLI — this is a thin local implementation that's
 * compatible enough to dogfood.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { c, ok, err, info, hint, banner, step } from '../lib/colors.js';

const SPECIFY_DIR = '.specify';
const TASKS_OUT = '.bn/speckit-tasks.json';

function showHelp() {
  console.log(`
  ${c.bold('bn speckit')} ${c.gray('<subcommand>')}

  Spec-driven development workflow (compatible with github/spec-kit).

  ${c.bold('Subcommands')}
    ${c.accent('init')}            Bootstrap .specify/ directory
    ${c.accent('spec')} ${c.gray('<name>')}     Scaffold a new spec
    ${c.accent('plan')}            Stub a plan.md for the active spec
    ${c.accent('tasks')}           Extract tasks → ${c.dim(TASKS_OUT)}
    ${c.accent('validate')}        Lint specs/plans/tasks for required fields

  ${c.bold('Options')}
    --spec <id>    Target spec (default: latest)
    --json         Machine output where applicable
    --force        Overwrite existing files
    --dry-run      Don't write
    -h, --help
`);
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      spec: { type: 'string' },
      json: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }

  const sub = positionals[0];
  const cwd = process.cwd();
  const specifyDir = resolve(cwd, SPECIFY_DIR);

  switch (sub) {
    case 'init':
      return speckitInit(specifyDir, values);
    case 'spec':
      return speckitSpec(specifyDir, positionals[1], values);
    case 'plan':
      return speckitPlan(specifyDir, values);
    case 'tasks':
      return speckitTasks(specifyDir, cwd, values);
    case 'validate':
      return speckitValidate(specifyDir, values);
    default:
      err(`Unknown subcommand: ${sub}`);
      hint('Try: bn speckit init | spec | plan | tasks | validate');
      process.exit(1);
  }
}

function speckitInit(specifyDir, values) {
  if (existsSync(specifyDir) && !values.force) {
    err('.specify/ already exists.');
    hint('Use --force to overwrite the constitution + templates.');
    process.exit(1);
  }

  const dirs = ['memory', 'specs', 'templates', 'scripts'];
  if (!values['dry-run']) {
    for (const d of dirs) mkdirSync(join(specifyDir, d), { recursive: true });

    writeFileSync(
      join(specifyDir, 'memory', 'constitution.md'),
      `# Project Constitution

> The non-negotiable principles every spec must respect.

## Core principles

1. **Server is the source of truth.** Validation, scoring, secrets — never client-side.
2. **A11y is product, not polish.** Labels, focus rings, ≥44pt hit-targets, prefers-reduced-motion honored.
3. **Mobile-first.** Designed for phones; desktop is a happy accident.
4. **No heavy deps.** Each new dependency must justify its kilobytes.
5. **Idempotent operations.** Re-running a command is safe.

## Stack invariants

- Runtime: BaseNative (\`@basenative/runtime\`).
- Lint: \`@basenative/eslint-config\`.
- TS config: \`@basenative/tsconfig\`.
- Edge: Cloudflare Workers / Pages via Wrangler.
- Secrets: Doppler (\`@basenative/doppler\`).

## Definition of done

- [ ] Spec, plan, and tasks all exist and pass \`bn speckit validate\`.
- [ ] Tests pass (\`pnpm test\`).
- [ ] Lint passes (\`pnpm lint\`).
- [ ] PRD updated if user-facing surface changed.
`,
    );

    writeFileSync(
      join(specifyDir, 'templates', 'spec.md'),
      `# Spec: {{title}}

> Status: draft
> Spec ID: {{id}}
> Owner: {{owner}}

## Why
_What problem are we solving? Who feels it?_

## What
_The user-visible surface. What changes for them?_

## User stories
- As a __, I want to __, so that __.

## Acceptance criteria
- [ ] _testable bullet_
- [ ] _testable bullet_

## Out of scope
- _explicit non-goal_

## Open questions
- _question_
`,
    );

    writeFileSync(
      join(specifyDir, 'templates', 'plan.md'),
      `# Plan: {{title}}

> Spec: {{id}}

## Approach
_High-level technical approach._

## Architecture
_Touchpoints, new modules, data flow._

## Risks
- _risk + mitigation_

## Rollout
_Flag, migration, kill-switch._
`,
    );

    writeFileSync(
      join(specifyDir, 'templates', 'tasks.md'),
      `# Tasks: {{title}}

> Spec: {{id}}

- [ ] T01 _task_ [P]
- [ ] T02 _task (depends on T01)_
`,
    );

    writeFileSync(
      join(specifyDir, 'README.md'),
      `# .specify/

Spec-driven development for this project. Compatible with [github/spec-kit](https://github.com/github/spec-kit).

Workflow:

1. \`bn speckit spec <name>\` — write the *what*.
2. \`bn speckit plan\` — write the *how*.
3. \`bn speckit tasks\` — extract actionable work.
4. \`bn speckit validate\` — lint everything.
5. \`bn gh sync\` — push tasks to GitHub issues.
`,
    );
  }

  banner();
  ok(`Bootstrapped ${SPECIFY_DIR}/`);
  for (const d of dirs) step(`${SPECIFY_DIR}/${d}/`);
  hint('Next: bn speckit spec <feature-name>');
}

function speckitSpec(specifyDir, name, values) {
  if (!name) {
    err('Usage: bn speckit spec <name>');
    process.exit(1);
  }
  if (!existsSync(specifyDir)) {
    err('.specify/ not initialised. Run: bn speckit init');
    process.exit(1);
  }
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const specsDir = join(specifyDir, 'specs');
  mkdirSync(specsDir, { recursive: true });
  const existing = readdirSync(specsDir).filter((d) => /^\d{3}-/.test(d));
  const next = String(existing.length + 1).padStart(3, '0');
  const id = `${next}-${slug}`;
  const dir = join(specsDir, id);

  if (existsSync(dir) && !values.force) {
    err(`Spec already exists: ${SPECIFY_DIR}/specs/${id}/`);
    process.exit(1);
  }

  if (!values['dry-run']) {
    mkdirSync(dir, { recursive: true });
    const tplPath = join(specifyDir, 'templates', 'spec.md');
    const tpl = existsSync(tplPath)
      ? readFileSync(tplPath, 'utf-8')
      : '# Spec: {{title}}\n\n> Status: draft\n> Spec ID: {{id}}\n';
    const filled = tpl.replace(/\{\{title\}\}/g, name).replace(/\{\{id\}\}/g, id).replace(/\{\{owner\}\}/g, process.env.USER || 'TBD');
    writeFileSync(join(dir, 'spec.md'), filled);
  }

  ok(`Created spec ${SPECIFY_DIR}/specs/${id}/spec.md`);
  hint('Next: bn speckit plan --spec ' + id);
  return { id, dir };
}

function findActiveSpec(specifyDir, specHint) {
  const specsDir = join(specifyDir, 'specs');
  if (!existsSync(specsDir)) return null;
  const all = readdirSync(specsDir)
    .filter((d) => statSync(join(specsDir, d)).isDirectory())
    .sort();
  if (specHint) {
    const match = all.find((d) => d === specHint || d.endsWith('-' + specHint));
    return match ? join(specsDir, match) : null;
  }
  return all.length ? join(specsDir, all[all.length - 1]) : null;
}

function speckitPlan(specifyDir, values) {
  const dir = findActiveSpec(specifyDir, values.spec);
  if (!dir) {
    err('No spec found. Run: bn speckit spec <name>');
    process.exit(1);
  }
  const planPath = join(dir, 'plan.md');
  if (existsSync(planPath) && !values.force) {
    err(`plan.md already exists at ${planPath}`);
    hint('Use --force to overwrite.');
    process.exit(1);
  }
  const id = dir.split('/').pop();
  const title = id.replace(/^\d{3}-/, '').replace(/-/g, ' ');
  const tplPath = join(specifyDir, 'templates', 'plan.md');
  const tpl = existsSync(tplPath)
    ? readFileSync(tplPath, 'utf-8')
    : '# Plan: {{title}}\n\n> Spec: {{id}}\n';
  const body = tpl.replace(/\{\{title\}\}/g, title).replace(/\{\{id\}\}/g, id);

  if (!values['dry-run']) writeFileSync(planPath, body);

  ok(`Wrote plan: ${SPECIFY_DIR}/specs/${id}/plan.md`);
  info('LLM hand-off point: feed spec.md + constitution.md + plan.md to your model.');
  hint('Next: bn speckit tasks --spec ' + id);
}

function speckitTasks(specifyDir, cwd, values) {
  const dir = findActiveSpec(specifyDir, values.spec);
  if (!dir) {
    err('No spec found.');
    process.exit(1);
  }
  const id = dir.split('/').pop();
  const tasksPath = join(dir, 'tasks.md');
  const tasks = [];

  if (existsSync(tasksPath)) {
    const content = readFileSync(tasksPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^- \[( |x|X)\]\s+(?:(T\d+)\s+)?(.+?)(\s+\[P\])?\s*$/);
      if (!m) continue;
      const [, doneFlag, taskId, title, parallel] = m;
      tasks.push({
        external_id: `speckit:${id}:${taskId || slugify(title)}`,
        title: title.trim(),
        body: `Spec: ${id}\nFile: ${SPECIFY_DIR}/specs/${id}/tasks.md`,
        labels: ['from:speckit', `spec:${id}`].concat(parallel ? ['parallel'] : []),
        done: doneFlag.toLowerCase() === 'x',
      });
    }
  } else {
    info(`No tasks.md found in ${SPECIFY_DIR}/specs/${id}/. Creating an empty one.`);
    if (!values['dry-run']) writeFileSync(tasksPath, `# Tasks: ${id}\n\n- [ ] T01 _first task_\n`);
  }

  const output = {
    source: `${SPECIFY_DIR}/specs/${id}/tasks.md`,
    spec: id,
    generated_at: new Date().toISOString(),
    milestones: [
      {
        external_id: `speckit:milestone:${id}`,
        title: `Spec ${id}`,
        description: `From ${SPECIFY_DIR}/specs/${id}/`,
        state: 'open',
      },
    ],
    issues: tasks.map((t) => ({ ...t, milestone: `Spec ${id}` })),
  };

  if (values['dry-run']) {
    if (values.json) console.log(JSON.stringify(output, null, 2));
    else info(`Would write ${TASKS_OUT}: ${tasks.length} task(s).`);
    return output;
  }

  const outPath = resolve(cwd, TASKS_OUT);
  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  if (values.json) console.log(JSON.stringify(output, null, 2));
  else {
    ok(`Wrote ${TASKS_OUT}`);
    info(`${tasks.length} task(s) ready to sync.`);
    hint('Push them up: bn gh sync --input ' + TASKS_OUT);
  }
  return output;
}

function speckitValidate(specifyDir, values) {
  if (!existsSync(specifyDir)) {
    err('.specify/ not found. Run: bn speckit init');
    process.exit(1);
  }
  const issues = [];
  if (!existsSync(join(specifyDir, 'memory', 'constitution.md'))) {
    issues.push('missing memory/constitution.md');
  }
  const specsDir = join(specifyDir, 'specs');
  if (!existsSync(specsDir)) {
    issues.push('missing specs/ directory');
  } else {
    for (const d of readdirSync(specsDir)) {
      const dir = join(specsDir, d);
      if (!statSync(dir).isDirectory()) continue;
      const spec = join(dir, 'spec.md');
      if (!existsSync(spec)) {
        issues.push(`${d}: missing spec.md`);
        continue;
      }
      const txt = readFileSync(spec, 'utf-8');
      for (const required of ['Why', 'What', 'Acceptance criteria']) {
        if (!new RegExp(`##\\s+${required}`, 'i').test(txt)) {
          issues.push(`${d}/spec.md: missing "## ${required}" section`);
        }
      }
    }
  }

  if (values.json) {
    console.log(JSON.stringify({ ok: issues.length === 0, issues }, null, 2));
  } else if (issues.length === 0) {
    ok('All specs valid.');
  } else {
    err(`Found ${issues.length} issue(s):`);
    for (const i of issues) console.log(`  ${c.red('•')} ${i}`);
    process.exit(1);
  }
  return { ok: issues.length === 0, issues };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
