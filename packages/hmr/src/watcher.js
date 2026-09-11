// Built with BaseNative — basenative.dev
/**
 * Debounced recursive file watching over `node:fs.watch`.
 *
 * Editors do not save files once. They write a temp file, rename it, touch the
 * directory, and sometimes fire three events for one keystroke of autosave —
 * so the raw watch stream is coalesced into one batch per quiet period, with
 * the noisy paths filtered out before they ever reach a subscriber.
 */

import { watch } from 'node:fs';
import { relative, sep } from 'node:path';
import { assertDevOnly } from './guard.js';

/** Directory names never worth watching, by name at any depth. */
export const DEFAULT_IGNORED_DIRS = ['node_modules', '.git', 'dist', '.wrangler'];

/** Files editors and OSes create that are never a source change. */
const NOISE = /(?:^|[\\/])(?:\.DS_Store|Thumbs\.db|\.#[^\\/]*)$|(?:~|\.swp|\.swx|\.tmp|\.part)$/i;

/**
 * Should this path be ignored?
 *
 * @param {string} path Path relative to a watched root, or absolute.
 * @param {string[]} ignoredDirs Directory names to drop at any depth.
 * @returns {boolean}
 */
export function isIgnored(path, ignoredDirs = DEFAULT_IGNORED_DIRS) {
  if (!path) return true;
  const normalised = String(path).split('\\').join('/');
  if (NOISE.test(normalised)) return true;
  const segments = normalised.split('/');
  return segments.some((segment) => ignoredDirs.includes(segment));
}

/**
 * Watch one or more directory trees and report coalesced batches of changes.
 *
 * @param {object} options
 * @param {string[]} options.roots Absolute directories to watch recursively.
 * @param {(files: string[]) => void} options.onChange Called with paths relative to `cwd`.
 * @param {string} [options.cwd] Base the reported paths are relative to.
 * @param {number} [options.debounceMs] Quiet period before a batch fires.
 * @param {string[]} [options.ignoredDirs]
 * @param {(message: string, error: Error) => void} [options.onWarn]
 * @returns {{ close(): void, roots: string[], watching: boolean }}
 */
export function createWatcher(options) {
  assertDevOnly('createWatcher', options.env);

  const {
    roots = [],
    onChange,
    cwd = process.cwd(),
    debounceMs = 60,
    ignoredDirs = DEFAULT_IGNORED_DIRS,
    onWarn,
  } = options;

  if (typeof onChange !== 'function') {
    throw new TypeError('@basenative/hmr: createWatcher({ onChange }) requires a function');
  }

  const watchers = [];
  const batch = new Set();
  const watched = [];
  let timer = null;
  let closed = false;

  function flush() {
    timer = null;
    if (closed || batch.size === 0) return;
    const files = [...batch];
    batch.clear();
    onChange(files);
  }

  function record(root, filename) {
    if (closed) return;
    // fs.watch can emit a null filename on some platforms; a change we cannot
    // name is still a change, so report the root itself rather than dropping it.
    const absolute = filename ? `${root}${sep}${filename}` : root;
    if (isIgnored(filename ?? root, ignoredDirs)) return;

    const rel = relative(cwd, absolute) || '.';
    if (isIgnored(rel, ignoredDirs)) return;

    batch.add(rel.split('\\').join('/'));
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
    timer.unref?.();
  }

  for (const root of roots) {
    try {
      const handle = watch(root, { recursive: true }, (_event, filename) => record(root, filename));
      handle.on('error', (error) => onWarn?.(`stopped watching ${root}`, error));
      handle.unref?.();
      watchers.push(handle);
      watched.push(root);
    } catch (error) {
      // A root that does not exist yet, or a platform without recursive watch
      // on that filesystem, must not take the dev server down with it.
      onWarn?.(`could not watch ${root}`, error);
    }
  }

  return {
    get roots() {
      return [...watched];
    },
    get watching() {
      return !closed && watchers.length > 0;
    },
    close() {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      for (const handle of watchers) {
        try {
          handle.close();
        } catch {
          /* already gone */
        }
      }
      watchers.length = 0;
    },
  };
}
