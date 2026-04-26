// Built with BaseNative — basenative.dev
/**
 * Wrapper around the GitHub CLI (`gh`). Every call uses `--json` where
 * possible so we never have to scrape human output. Auth and host config are
 * left to `gh` itself.
 */

import { spawnSync } from 'node:child_process';

function gh(args, { input, capture = true } = {}) {
  const res = spawnSync('gh', args, {
    encoding: 'utf-8',
    input,
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  });
  return {
    ok: res.status === 0,
    code: res.status ?? -1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

export function isGhInstalled() {
  return gh(['--version']).ok;
}

export function isGhAuthed() {
  return gh(['auth', 'status']).ok;
}

/**
 * Check whether the current `gh` token has a given OAuth scope (best-effort).
 * Returns null if we can't tell.
 */
export function ghHasScope(scope) {
  const r = gh(['auth', 'status']);
  if (!r.ok) return false;
  const text = `${r.stdout}\n${r.stderr}`;
  const scopes = text.match(/Token scopes:?\s*([^\n]+)/i)?.[1] || '';
  return scopes.includes(scope);
}

/**
 * List milestones for a repo.
 */
export function listMilestones(repo) {
  const r = gh(['api', `repos/${repo}/milestones?state=all&per_page=100`]);
  if (!r.ok) throw new Error(`Failed to list milestones: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/**
 * Create a milestone if it doesn't exist (matched by title).
 * Returns the milestone object.
 */
export function ensureMilestone(repo, { title, description, due_on, state = 'open' }) {
  const existing = listMilestones(repo).find((m) => m.title === title);
  if (existing) return existing;
  const body = JSON.stringify({ title, description, due_on, state });
  const r = gh(['api', `repos/${repo}/milestones`, '-X', 'POST', '--input', '-'], { input: body });
  if (!r.ok) throw new Error(`Failed to create milestone "${title}": ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/**
 * List issues for a repo (open + closed). We only fetch what we need.
 */
export function listIssues(repo, { state = 'all', perPage = 100 } = {}) {
  const r = gh(['api', `repos/${repo}/issues?state=${state}&per_page=${perPage}`]);
  if (!r.ok) throw new Error(`Failed to list issues: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/**
 * Idempotent issue creation. We embed an `<!-- bn:external_id={id} -->` HTML
 * comment in the body so we can find it again on subsequent runs.
 */
export function ensureIssue(
  repo,
  { external_id, title, body, labels = [], milestone, assignees = [] },
) {
  const tag = `<!-- bn:external_id=${external_id} -->`;
  const fullBody = `${body || ''}\n\n${tag}`.trim();

  // Search by tag first.
  const search = gh([
    'api',
    `search/issues?q=${encodeURIComponent(`repo:${repo} in:body "${tag}"`)}`,
  ]);
  if (search.ok) {
    const found = JSON.parse(search.stdout).items?.[0];
    if (found) return { ...found, _existed: true };
  }

  const args = ['issue', 'create', '-R', repo, '-t', title, '-b', fullBody];
  for (const l of labels) args.push('-l', l);
  for (const a of assignees) args.push('-a', a);
  if (milestone) args.push('-m', milestone);

  const r = gh(args);
  if (!r.ok) throw new Error(`Failed to create issue "${title}": ${r.stderr}`);
  // `gh issue create` prints the URL.
  const url = r.stdout.split('\n').pop();
  return { url, title, _existed: false };
}

export { gh };
