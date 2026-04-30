// ────────────────────────────────────────────────────────────────────────────
//   @basenative/doppler  ·  the only secret BaseNative keeps is *where* yours are.
//   "Plumbing, not values. Doppler holds the keys; we just turn the faucet on."
// ────────────────────────────────────────────────────────────────────────────

import { spawn, spawnSync } from 'node:child_process';

/**
 * @typedef {Object} DopplerRunOptions
 * @property {string}  [project]   --project flag passed to doppler
 * @property {string}  [config]    --config flag passed to doppler (dev/prep/prod)
 * @property {string}  [cwd]       working directory
 * @property {NodeJS.ProcessEnv} [env] env vars passed through (default: process.env)
 * @property {boolean} [inherit]   inherit stdio (default: true)
 * @property {boolean} [preserveEnv]  pass --preserve-env to doppler
 */

/**
 * Wraps `doppler run -- <args...>` so callers don't have to remember the
 * incantation. Returns a Promise that resolves with the child's exit code.
 *
 * @param {string[]} args
 * @param {DopplerRunOptions} [opts]
 * @returns {Promise<{ code: number, signal: NodeJS.Signals|null }>}
 */
export function dopplerRun(args, opts = {}) {
  const dopplerArgs = ['run'];
  if (opts.project) dopplerArgs.push('--project', opts.project);
  if (opts.config) dopplerArgs.push('--config', opts.config);
  if (opts.preserveEnv) dopplerArgs.push('--preserve-env');
  dopplerArgs.push('--', ...args);

  return new Promise((resolve, reject) => {
    const child = spawn('doppler', dopplerArgs, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: opts.inherit === false ? 'pipe' : 'inherit',
      shell: false,
    });
    child.on('error', (err) => {
      if (err && /ENOENT/i.test(err.message)) {
        reject(
          new Error(
            'doppler CLI not found on PATH. Install via `brew install dopplerhq/cli/doppler` ' +
              'or see https://docs.doppler.com/docs/install-cli',
          ),
        );
      } else {
        reject(err);
      }
    });
    child.on('exit', (code, signal) => resolve({ code: code ?? 0, signal }));
  });
}

/**
 * Validates that the named secrets exist and are non-empty in the current
 * Doppler context. Throws a `MissingSecretsError` listing the missing names.
 *
 * Intended use: at app boot, after `doppler run` has already injected env
 * vars into `process.env`. Optionally pass `{ source: 'doppler' }` to actually
 * fetch from `doppler secrets download` instead of trusting `process.env`.
 *
 * @param {string[]} names
 * @param {{ source?: 'env'|'doppler', project?: string, config?: string }} [opts]
 */
export async function requireSecrets(names, opts = {}) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new TypeError('requireSecrets(names) requires a non-empty array');
  }
  const source = opts.source ?? 'env';
  const values =
    source === 'doppler'
      ? await fetchDopplerSecrets(opts.project, opts.config)
      : process.env;

  const missing = names.filter((n) => !values[n] || String(values[n]).length === 0);
  if (missing.length > 0) {
    throw new MissingSecretsError(missing);
  }
  return Object.fromEntries(names.map((n) => [n, values[n]]));
}

export class MissingSecretsError extends Error {
  constructor(missing) {
    super(
      `Missing required Doppler secret(s): ${missing.join(', ')}. ` +
        'Set them with `doppler secrets set <NAME>` or via the Doppler dashboard, ' +
        'and verify with `bn-doppler verify`.',
    );
    this.name = 'MissingSecretsError';
    this.missing = missing;
    this.code = 'E_MISSING_SECRETS';
  }
}

async function fetchDopplerSecrets(project, config) {
  const args = ['secrets', 'download', '--no-file', '--format', 'json'];
  if (project) args.push('--project', project);
  if (config) args.push('--config', config);
  const result = spawnSync('doppler', args, { encoding: 'utf-8' });
  if (result.error && /ENOENT/i.test(result.error.message)) {
    throw new Error(
      'doppler CLI not found on PATH. Install via `brew install dopplerhq/cli/doppler`.',
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `doppler secrets download failed (exit ${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (err) {
    throw new Error(`Could not parse doppler output as JSON: ${err.message}`, { cause: err });
  }
}

/**
 * Move Doppler-resolved values out of an arbitrary env object and into the
 * shape Wrangler expects. Returns `{ vars, secrets }`:
 *   - `vars`    — non-secret name/value pairs, suitable for `[vars]` in toml.
 *   - `secrets` — secret names paired with their resolved values, suitable for
 *                 piping into `wrangler secret put`.
 *
 * Heuristic: any name listed in `names` whose value contains likely-secret
 * material (long random strings, `_TOKEN`, `_KEY`, `_SECRET`, `_PASSWORD`) is
 * routed to `secrets`. Everything else goes to `vars`. The caller can override
 * by passing `secretNames` explicitly.
 *
 * @param {{ env?: Record<string,string>, names: string[], secretNames?: string[] }} args
 */
export function injectIntoWrangler({ env = process.env, names, secretNames }) {
  if (!Array.isArray(names)) {
    throw new TypeError('injectIntoWrangler({ names }) requires an array');
  }
  const explicit = new Set(secretNames ?? []);
  const vars = {};
  const secrets = {};
  const missing = [];

  for (const name of names) {
    const value = env[name];
    if (value === undefined || value === '') {
      missing.push(name);
      continue;
    }
    if (explicit.has(name) || looksSecret(name, value)) {
      secrets[name] = value;
    } else {
      vars[name] = value;
    }
  }

  if (missing.length > 0) {
    throw new MissingSecretsError(missing);
  }
  return { vars, secrets };
}

function looksSecret(name, value) {
  if (/_(TOKEN|KEY|SECRET|PASSWORD|PASS|PWD|API_KEY|PRIVATE)$/i.test(name)) return true;
  if (/^(SECRET_|PRIVATE_)/i.test(name)) return true;
  if (typeof value === 'string' && value.length >= 32 && /^[A-Za-z0-9_\-+=/.]+$/.test(value)) {
    return true;
  }
  return false;
}
