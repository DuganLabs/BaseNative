// Built with BaseNative — basenative.dev
/**
 * `bn prd` — manage docs/PRD.md.
 *
 *   bn prd init    Write a PRD scaffold matching the t4bs format.
 *   bn prd edit    Open docs/PRD.md in $EDITOR.
 *   bn prd sync    Parse the milestones section and emit .bn/prd-issues.json.
 *
 * The output of `bn prd sync` is the canonical input for `bn gh sync`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { c, ok, err, info, hint, banner } from '../lib/colors.js';

const PRD_PATH = 'docs/PRD.md';
const ISSUES_PATH = '.bn/prd-issues.json';

function showHelp() {
  console.log(`
  ${c.bold('bn prd')} ${c.gray('<subcommand>')}

  Manage your project's PRD (docs/PRD.md).

  ${c.bold('Subcommands')}
    ${c.accent('init')}     Scaffold ${c.dim('docs/PRD.md')} (matches t4bs format)
    ${c.accent('edit')}     Open ${c.dim('docs/PRD.md')} in $EDITOR
    ${c.accent('sync')}     Parse milestones → emit ${c.dim('.bn/prd-issues.json')}

  ${c.bold('Options')}
    --name <s>    Project name (default: cwd basename)
    --owner <s>   Owner (default: $USER)
    --force       Overwrite existing PRD on \`init\`
    --json        Machine output on \`sync\`
    --dry-run     Don't write files
    -h, --help
`);
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      name: { type: 'string' },
      owner: { type: 'string' },
      force: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
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
  const prdPath = resolve(cwd, PRD_PATH);

  if (sub === 'init') return prdInit(prdPath, values);
  if (sub === 'edit') return prdEdit(prdPath);
  if (sub === 'sync') return prdSync(prdPath, cwd, values);

  err(`Unknown subcommand: ${sub}`);
  hint('Try: bn prd init | edit | sync');
  process.exit(1);
}

function prdInit(prdPath, values) {
  if (existsSync(prdPath) && !values.force) {
    err(`${PRD_PATH} already exists.`);
    hint('Use --force to overwrite, or `bn prd edit` to modify.');
    process.exit(1);
  }

  const projectName = values.name || basename(process.cwd());
  const owner = values.owner || process.env.USER || 'TBD';
  const today = new Date().toISOString().slice(0, 10);

  const body = `# ${projectName} — Product Requirements Document

> Status: **draft** · Owner: ${owner} · Last updated: ${today}
>
> This PRD is the canonical source of truth for what ${projectName} is, who it's for, and what it does. Issues and milestones reflect this document — when reality drifts, update the doc *and* the issues.

---

## 1. Overview

**${projectName}** is _[one paragraph: what it is, who it's for, why now]_.

### One-line pitch
"_[the elevator pitch]_"

---

## 2. Goals

1. _[primary goal]_
2. _[secondary goal]_
3. _[tertiary goal]_

## Non-goals

- _[explicit out-of-scope]_
- _[explicit out-of-scope]_

---

## 3. Users

### Primary
_[primary user persona — needs, context, frustrations]_

### Secondary
_[secondary persona]_

---

## 4. Key flows

### 4.1 _[flow name]_
1. _[step]_
2. _[step]_

---

## 5. Data model

| Table | Purpose | Key fields |
|---|---|---|
| _[table]_ | _[purpose]_ | _[fields]_ |

---

## 6. Design principles

- _[principle]_
- _[principle]_

---

## 7. Architecture

### Today
- _[current state]_

### Target
- _[target state]_

---

## 8. Milestones

> Each milestone maps 1:1 to a GitHub milestone. Issues under the milestone reflect the work.

### M0 — Foundation (planned)
- _[issue title]_
- _[issue title]_

### M1 — _[name]_ (planned)
- _[issue title]_

---

## 9. Open questions

- _[question]_

---

## 10. Glossary

- **_[term]_** — _[definition]_
`;

  if (values['dry-run']) {
    info(`Would write ${PRD_PATH} (${body.length} bytes).`);
    return;
  }

  mkdirSync(dirname(prdPath), { recursive: true });
  writeFileSync(prdPath, body);
  banner();
  ok(`Wrote ${PRD_PATH}`);
  hint('Edit it: bn prd edit');
  hint('Sync to issues: bn prd sync && bn gh sync');
}

function prdEdit(prdPath) {
  if (!existsSync(prdPath)) {
    err(`${PRD_PATH} not found.`);
    hint('Run: bn prd init');
    process.exit(1);
  }
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  const r = spawnSync(editor, [prdPath], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/**
 * Parse the `## 8. Milestones` section into issues.
 * A milestone heading looks like:
 *   ### M0 — Foundation (planned)
 * Bullets under it become issues under that milestone.
 */
function prdSync(prdPath, cwd, values) {
  if (!existsSync(prdPath)) {
    err(`${PRD_PATH} not found.`);
    hint('Run: bn prd init');
    process.exit(1);
  }

  const content = readFileSync(prdPath, 'utf-8');
  const milestones = [];
  const issues = [];

  // Find the milestones section.
  const sectionMatch = content.match(/##\s*\d*\.?\s*Milestones[\s\S]*?(?=\n##\s|$)/i);
  if (!sectionMatch) {
    err('No "## Milestones" section found in PRD.');
    hint('Use the t4bs format: section 8 with ### M0 — title (status) headings.');
    process.exit(1);
  }
  const section = sectionMatch[0];

  // Split into milestone blocks at "### " headings.
  const blocks = section.split(/\n###\s+/).slice(1);
  for (const block of blocks) {
    const headingLine = block.split('\n', 1)[0];
    const headingMatch = headingLine.match(/^([A-Z]\d+)\s*[—-]\s*(.+?)(?:\s*\((.*?)\))?\s*$/);
    if (!headingMatch) continue;
    const [, code, title, statusRaw] = headingMatch;
    const status = (statusRaw || 'planned').toLowerCase();

    const milestoneTitle = `${code} — ${title}`;
    milestones.push({
      external_id: `milestone:${code}`,
      title: milestoneTitle,
      description: `From ${PRD_PATH} — ${status}`,
      state: status.startsWith('shipped') || status.includes('done') ? 'closed' : 'open',
    });

    // Bullets under the heading become issues.
    const lines = block.split('\n').slice(1);
    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (!bullet) continue;
      const text = bullet[1].trim();
      if (!text || text.startsWith('**Commit:**')) continue;
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      issues.push({
        external_id: `prd:${code}:${slug}`,
        title: stripMarkdown(text),
        body: `Tracked under ${milestoneTitle}.\n\nSource: ${PRD_PATH} (section 8).`,
        labels: ['from:prd', `milestone:${code}`],
        milestone: milestoneTitle,
      });
    }
  }

  const output = {
    source: PRD_PATH,
    generated_at: new Date().toISOString(),
    milestones,
    issues,
  };

  if (values['dry-run']) {
    if (values.json) console.log(JSON.stringify(output, null, 2));
    else info(`Would write ${ISSUES_PATH}: ${milestones.length} milestone(s), ${issues.length} issue(s).`);
    return output;
  }

  const outPath = resolve(cwd, ISSUES_PATH);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  if (values.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    ok(`Wrote ${ISSUES_PATH}`);
    info(`${milestones.length} milestone(s), ${issues.length} issue(s) ready to sync.`);
    hint('Push them up: bn gh sync');
  }
  return output;
}

function stripMarkdown(s) {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
}

function basename(p) {
  return p.replace(/\/+$/, '').split('/').pop() || 'project';
}
