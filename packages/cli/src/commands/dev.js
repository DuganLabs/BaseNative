// Built with BaseNative — basenative.dev
/**
 * `bn dev` — start the project's dev server.
 *
 * Strategy:
 *   1. If package.json has a `dev` script, run it via the detected package manager.
 *   2. Else if a server.js / src/server.js exists, fall back to `node --watch`.
 *   3. Else if wrangler.toml exists and wrangler is available, run `wrangler dev`.
 *
 * `--port` and `--host` are forwarded as env vars (PORT/HOST) for node fallback,
 * and as `--port`/`--ip` for wrangler.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { detectPackageManager, pmCommand } from '../lib/pkg-manager.js';
import { c, info, err, hint, ok } from '../lib/colors.js';

function showHelp() {
  console.log(`
  ${c.bold('bn dev')} ${c.gray('[options]')}

  Start the project's dev server.

  Tries in order:
    1. \`<pm> run dev\`         (if package.json has a "dev" script)
    2. \`node --watch <file>\`  (server.js / src/server.js / index.js)
    3. \`wrangler dev\`          (if wrangler.toml is present)

  ${c.bold('Options')}
    -p, --port <n>     Port (default: 3000) — forwarded as PORT or --port
        --host <h>     Host (default: 0.0.0.0)
    -h, --help
`);
}

export async function run(args) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: 'string', short: 'p', default: '3000' },
      host: { type: 'string', default: '0.0.0.0' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    return;
  }

  const cwd = process.cwd();
  const env = {
    ...process.env,
    PORT: values.port,
    HOST: values.host,
    NODE_ENV: 'development',
  };

  // 1) Package script
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.dev) {
        const pm = detectPackageManager(cwd);
        const [cmd, cmdArgs] = pmCommand(pm.name, 'run', 'dev');
        ok(`${pm.name} run dev ${c.dim('(' + pm.source + ')')}`);
        return spawnPassthrough(cmd, cmdArgs, { cwd, env });
      }
    } catch {
      /* ignore malformed package.json */
    }
  }

  // 2) Node entry
  const candidates = ['server.js', 'src/server.js', 'index.js', 'src/index.js'];
  for (const c2 of candidates) {
    if (existsSync(resolve(cwd, c2))) {
      info(`node --watch ${c2}`);
      return spawnPassthrough('node', ['--watch', c2], { cwd, env });
    }
  }

  // 3) Wrangler
  if (existsSync(resolve(cwd, 'wrangler.toml')) || existsSync(resolve(cwd, 'wrangler.jsonc'))) {
    info('wrangler dev');
    return spawnPassthrough('wrangler', ['dev', '--port', values.port], { cwd, env });
  }

  err('No dev entry point found.');
  hint('Add a "dev" script to package.json, or create server.js, or run `bn create`.');
  process.exit(1);
}

function spawnPassthrough(cmd, args, opts) {
  const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
  child.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
