// Built with BaseNative — basenative.dev
/**
 * `bn dev` — start the project's dev server, with HMR in front of it.
 *
 * Strategy:
 *   1. If package.json has a `dev` script, run it via the detected package manager.
 *   2. Else if a server.js / src/server.js exists, fall back to `node --watch`.
 *   3. Else if wrangler.toml exists and wrangler is available, run `wrangler dev`.
 *
 * Whichever one runs, it is started on a private internal port and
 * `@basenative/hmr` owns the port the user asked for. The proxy injects the
 * HMR client into HTML responses, serves the event stream, and watches the
 * tree — so the project itself needs no HMR wiring at all.
 *
 * `--no-hmr` skips every bit of that and reproduces the old behaviour exactly.
 * So does a failure to load or start the proxy: HMR is never allowed to be the
 * reason a dev server would not come up.
 *
 * `--port` and `--host` are forwarded as env vars (PORT/HOST) for node fallback,
 * and as `--port`/`--ip` for wrangler.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { detectPackageManager, pmCommand } from '../lib/pkg-manager.js';
import { c, info, err, hint, ok, warn } from '../lib/colors.js';

function showHelp() {
  console.log(`
  ${c.bold('bn dev')} ${c.gray('[options]')}

  Start the project's dev server with hot module replacement.

  Tries in order:
    1. \`<pm> run dev\`         (if package.json has a "dev" script)
    2. \`node --watch <file>\`  (server.js / src/server.js / index.js)
    3. \`wrangler dev\`          (if wrangler.toml is present)

  ${c.bold('Hot module replacement')}
    On a change the browser re-fetches the current URL and patches the live
    DOM — focus, caret, scroll position and open dialogs all survive. A change
    it cannot patch safely falls back to a full reload and says why in the
    console.

  ${c.bold('Options')}
    -p, --port <n>     Port (default: 3000) — forwarded as PORT or --port
        --host <h>     Host (default: 0.0.0.0)
        --no-hmr       Disable HMR; run the dev server directly on --port
    -h, --help
`);
}

export async function run(args) {
  // `parseArgs` has no `--no-<flag>` negation, so the opt-out is filtered out
  // by hand before parsing rather than surfacing as "Unknown option".
  const wantsHmr = !args.includes('--no-hmr');
  const { values } = parseArgs({
    args: args.filter((arg) => arg !== '--no-hmr'),
    options: {
      port: { type: 'string', short: 'p', default: '3000' },
      host: { type: 'string', default: '0.0.0.0' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });
  values.hmr = wantsHmr;

  if (values.help) {
    showHelp();
    return;
  }

  const cwd = process.cwd();
  const plan = resolveDevCommand(cwd);

  if (!plan) {
    err('No dev entry point found.');
    hint('Add a "dev" script to package.json, or create server.js, or run `bn create`.');
    process.exit(1);
  }

  const hmr = values.hmr ? await startHmr(cwd, values) : null;
  const port = hmr ? hmr.targetPort : values.port;

  const env = {
    ...process.env,
    PORT: String(port),
    HOST: hmr ? '127.0.0.1' : values.host,
    NODE_ENV: 'development',
  };

  if (plan.label) plan.notify(plan.label);
  const argv = plan.wrangler ? [...plan.args, '--port', String(port)] : plan.args;

  spawnPassthrough(plan.cmd, argv, { cwd, env }, hmr);
}

/**
 * Pick the dev command, preserving the historical fallback chain.
 *
 * @returns {{ cmd: string, args: string[], label: string, notify: Function, wrangler?: boolean } | null}
 */
export function resolveDevCommand(cwd) {
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.dev) {
        const pm = detectPackageManager(cwd);
        const [cmd, cmdArgs] = pmCommand(pm.name, 'run', 'dev');
        return {
          cmd,
          args: cmdArgs,
          label: `${pm.name} run dev ${c.dim('(' + pm.source + ')')}`,
          notify: ok,
        };
      }
    } catch {
      /* ignore malformed package.json */
    }
  }

  for (const candidate of ['server.js', 'src/server.js', 'index.js', 'src/index.js']) {
    if (existsSync(resolve(cwd, candidate))) {
      return {
        cmd: 'node',
        args: ['--watch', candidate],
        label: `node --watch ${candidate}`,
        notify: info,
      };
    }
  }

  if (existsSync(resolve(cwd, 'wrangler.toml')) || existsSync(resolve(cwd, 'wrangler.jsonc'))) {
    return { cmd: 'wrangler', args: ['dev'], label: 'wrangler dev', notify: info, wrangler: true };
  }

  return null;
}

/**
 * Start the HMR proxy in front of the dev server.
 *
 * Returns null — and leaves the dev server to run exactly as it used to — if
 * `@basenative/hmr` is not installed or the proxy cannot bind. A dev server
 * that starts without HMR beats one that does not start.
 */
async function startHmr(cwd, values) {
  let mod;
  try {
    mod = await import('@basenative/hmr');
  } catch {
    warn('@basenative/hmr is not installed — starting without hot reload.');
    hint('Install it with `npm i -D @basenative/hmr`, or pass `--no-hmr` to silence this.');
    return null;
  }

  const env = { ...process.env, NODE_ENV: 'development' };
  if (!mod.isDevEnvironment(env)) {
    info('BN_HMR is off — starting without hot reload.');
    return null;
  }

  try {
    const publicPort = Number(values.port);
    const targetPort = await mod.findFreePort(publicPort + 1);

    const proxy = mod.createHmrProxy({
      targetPort,
      targetHost: '127.0.0.1',
      port: publicPort,
      host: values.host,
      roots: [cwd],
      cwd,
      env,
      log: (message) => console.log(`${c.dim('[hmr]')} ${message}`),
    });

    await proxy.listen();
    ok(`hmr on http://${values.host === '0.0.0.0' ? 'localhost' : values.host}:${publicPort} ${c.dim(`→ app on :${targetPort}`)}`);
    return { proxy, targetPort };
  } catch (error) {
    warn(`could not start HMR (${error.message}) — starting without hot reload.`);
    return null;
  }
}

function spawnPassthrough(cmd, args, opts, hmr) {
  const child = spawn(cmd, args, { stdio: 'inherit', ...opts });

  const shutdown = async (signal) => {
    child.kill(signal);
    await hmr?.proxy.close();
  };

  child.on('exit', async (code) => {
    await hmr?.proxy.close();
    process.exit(code ?? 0);
  });
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
