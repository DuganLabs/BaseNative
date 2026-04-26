// Built with BaseNative — basenative.dev
/**
 * Tiny synchronous wrapper around `git`. We don't depend on `simple-git` or
 * similar — every call is a one-shot subprocess. Good enough for scaffold-time
 * needs (init, commit, remote query).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function runGit(args, cwd, { capture = true } = {}) {
  const res = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return {
    ok: res.status === 0,
    code: res.status ?? -1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

export function isGitInstalled() {
  return runGit(['--version'], process.cwd()).ok;
}

export function isGitRepo(cwd = process.cwd()) {
  if (!existsSync(resolve(cwd, '.git'))) {
    // could still be inside a worktree — fall back to git asking.
    return runGit(['rev-parse', '--is-inside-work-tree'], cwd).stdout === 'true';
  }
  return true;
}

export function gitInit(cwd, branch = 'main') {
  return runGit(['init', '-b', branch], cwd);
}

export function gitAddAll(cwd) {
  return runGit(['add', '-A'], cwd);
}

export function gitCommit(cwd, message) {
  return runGit(['commit', '-m', message, '--no-gpg-sign'], cwd);
}

export function gitConfigGet(key, cwd = process.cwd()) {
  const r = runGit(['config', '--get', key], cwd);
  return r.ok ? r.stdout : null;
}

/**
 * Returns the current repo's "owner/repo" if it has a GitHub origin, else null.
 */
export function gitOriginSlug(cwd = process.cwd()) {
  const url = runGit(['remote', 'get-url', 'origin'], cwd).stdout;
  if (!url) return null;
  // git@github.com:owner/repo.git or https://github.com/owner/repo(.git)
  const m =
    url.match(/github\.com[:/]+([^/]+)\/([^/.]+?)(?:\.git)?$/i) ||
    url.match(/^([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

export { runGit };
