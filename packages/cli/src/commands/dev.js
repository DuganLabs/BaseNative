import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

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
    console.log(`
  bn dev [options]

  Start development server with hot reload.

  Options:
    --port, -p    Port number [default: 3000]
    --host        Host address [default: 0.0.0.0]
    --help, -h    Show this help
`);
    return;
  }

  const cwd = process.cwd();
  const serverFile = findServerFile(cwd);

  if (!serverFile) {
    console.error('No server entry point found. Expected server.js, src/server.js, or index.js');
    process.exit(1);
  }

  console.log(`Starting dev server: ${serverFile}`);

  const env = {
    ...process.env,
    PORT: values.port,
    HOST: values.host,
    NODE_ENV: 'development',
  };

  const child = spawn('node', ['--watch', serverFile], {
    cwd,
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

function findServerFile(cwd) {
  const candidates = ['server.js', 'src/server.js', 'index.js', 'src/index.js'];
  for (const candidate of candidates) {
    if (existsSync(resolve(cwd, candidate))) return candidate;
  }
  return null;
}
