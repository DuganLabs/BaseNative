// Built with BaseNative — basenative.dev
/**
 * `bn nx [...]` — passthrough to `nx` with sensible DuganLabs defaults.
 *
 * Most users want \`nx run-many -t test\` etc. We don't reinvent that —
 * we just spawn the workspace's nx (via the detected package manager) so
 * users don't have to remember whether to type `pnpm exec nx` or
 * `npx nx`.
 *
 * Conveniences:
 *   --affected   short for `nx affected -t <task>` (use --task to pick task)
 */

import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { detectPackageManager, pmCommand } from '../lib/pkg-manager.js';
import { c, info, hint } from '../lib/colors.js';

function showHelp() {
  console.log(`
  ${c.bold('bn nx')} ${c.gray('[args...]')}

  Passthrough to Nx using the detected package manager.

  ${c.bold('Examples')}
    bn nx run-many -t test
    bn nx graph
    bn nx affected -t lint

  ${c.bold('Convenience')}
    bn nx --affected --task test       same as: nx affected -t test
    bn nx --task lint                  same as: nx run-many -t lint

  Anything not recognised is forwarded verbatim to \`nx\`.

  ${c.bold('Options')}
    --task <name>     Task to run (e.g., test, lint, build)
    --affected        Use \`nx affected\` instead of \`run-many\`
    -h, --help
`);
}

export async function run(args) {
  // Pull only our own flags; let everything else pass through.
  const known = new Set(['--help', '-h', '--task', '--affected']);
  const ours = [];
  const passthrough = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (known.has(a)) {
      ours.push(a);
      if (a === '--task') ours.push(args[++i]);
    } else {
      passthrough.push(a);
    }
  }

  const { values } = parseArgs({
    args: ours,
    options: {
      task: { type: 'string' },
      affected: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    return;
  }

  let nxArgs;
  if (values.task) {
    nxArgs = values.affected ? ['affected', '-t', values.task] : ['run-many', '-t', values.task];
  } else {
    nxArgs = passthrough.length ? passthrough : ['--help'];
  }

  const pm = detectPackageManager();
  const [cmd, baseArgs] = pmCommand(pm.name, 'exec', 'nx', ...nxArgs);

  info(`${c.dim('via ' + pm.name + ' (' + pm.source + ')')} → ${cmd} ${baseArgs.join(' ')}`);
  hint('Tip: `bn nx --task test --affected` for affected-only runs.');

  const child = spawn(cmd, baseArgs, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}
