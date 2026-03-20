#!/usr/bin/env node

import { parseArgs } from 'node:util';

const commands = {
  create: () => import('./commands/create.js'),
  dev: () => import('./commands/dev.js'),
  build: () => import('./commands/build.js'),
  generate: () => import('./commands/generate.js'),
  deploy: () => import('./commands/deploy.js'),
  env: () => import('./commands/env.js'),
  analyze: () => import('./commands/analyze.js'),
  help: () => ({ run: showHelp }),
};

function showHelp() {
  console.log(`
  BaseNative CLI

  Usage: bn <command> [options]

  Commands:
    create <name>     Create a new BaseNative project
    dev               Start development server with hot reload
    build             Build for production
    generate <type>   Generate component, route, or page
    deploy            Deploy to BaseNative Cloud
    env               Manage environment variables
    analyze           Analyze bundle size and dependencies
    help              Show this help message

  Options:
    --help, -h        Show help for a command
    --version, -v     Show version

  Examples:
    bn create my-app
    bn create my-app --template enterprise
    bn dev
    bn dev --port 8080
    bn build
    bn generate component MyButton
    bn generate route /users
    bn generate page dashboard
    bn deploy --env production
    bn env set API_KEY sk-123
    bn analyze
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    console.log(`bn v${pkg.version}`);
    return;
  }

  const command = args[0];
  const loader = commands[command];

  if (!loader) {
    console.error(`Unknown command: ${command}\nRun "bn help" for available commands.`);
    process.exit(1);
  }

  const mod = await loader();
  await mod.run(args.slice(1));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
