// Built with BaseNative — basenative.dev
/**
 * Detect the package manager used by a project. We look at lockfiles first
 * (most reliable), then `packageManager` field in package.json, then
 * environment, then fall back to npm.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKFILES = [
  ['pnpm', 'pnpm-lock.yaml'],
  ['bun', 'bun.lockb'],
  ['bun', 'bun.lock'],
  ['yarn', 'yarn.lock'],
  ['npm', 'package-lock.json'],
];

/**
 * @param {string} cwd
 * @returns {{name: 'pnpm'|'npm'|'yarn'|'bun', source: 'lockfile'|'packageManager'|'env'|'default'}}
 */
export function detectPackageManager(cwd = process.cwd()) {
  for (const [name, file] of LOCKFILES) {
    if (existsSync(resolve(cwd, file))) return { name, source: 'lockfile' };
  }

  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const pm = pkg.packageManager;
      if (typeof pm === 'string') {
        const name = pm.split('@')[0];
        if (['pnpm', 'npm', 'yarn', 'bun'].includes(name)) {
          return { name, source: 'packageManager' };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const ua = process.env.npm_config_user_agent || '';
  if (ua.startsWith('pnpm')) return { name: 'pnpm', source: 'env' };
  if (ua.startsWith('yarn')) return { name: 'yarn', source: 'env' };
  if (ua.startsWith('bun')) return { name: 'bun', source: 'env' };
  if (ua.startsWith('npm')) return { name: 'npm', source: 'env' };

  return { name: 'npm', source: 'default' };
}

/**
 * Map a logical command (install, run-script, exec) to the underlying
 * package-manager invocation.
 */
export function pmCommand(name, kind, ...args) {
  switch (kind) {
    case 'install':
      return [name, ['install', ...args]];
    case 'run':
      return name === 'npm' ? ['npm', ['run', ...args]] : [name, [...args]];
    case 'dlx':
      if (name === 'pnpm') return ['pnpm', ['dlx', ...args]];
      if (name === 'yarn') return ['yarn', ['dlx', ...args]];
      if (name === 'bun') return ['bunx', [...args]];
      return ['npx', ['--yes', ...args]];
    case 'exec':
      if (name === 'pnpm') return ['pnpm', ['exec', ...args]];
      if (name === 'yarn') return ['yarn', [...args]];
      if (name === 'bun') return ['bun', ['x', ...args]];
      return ['npx', [...args]];
    default:
      throw new Error(`Unknown pm command kind: ${kind}`);
  }
}
