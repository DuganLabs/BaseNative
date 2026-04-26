// Built with BaseNative — basenative.dev
/**
 * Environment management commands.
 *
 * Usage:
 *   bn env list                     List environment variables
 *   bn env set <key> <value>        Set an environment variable
 *   bn env unset <key>              Remove an environment variable
 *   bn env pull [--env <name>]      Pull remote env vars to local .env
 *   bn env push [--env <name>]      Push local .env to remote
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ENV_API = 'https://api.basenative.cloud/v1/env';

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      env: { type: 'string', default: 'preview' },
      token: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
  bn env <subcommand> [options]

  Manage environment variables for cloud deployments.

  Subcommands:
    list                     List environment variables
    set <key> <value>        Set an environment variable
    unset <key>              Remove an environment variable
    pull [--env <name>]      Pull remote env vars to local .env
    push [--env <name>]      Push local .env to remote

  Options:
    --env <name>   Target environment (preview, staging, production) [default: preview]
    --token <t>    API token (or BN_DEPLOY_TOKEN env var)
    --help, -h     Show this help
`);
    return;
  }

  const subcommand = positionals[0];
  const cwd = process.cwd();
  const envFilePath = resolve(cwd, '.env');

  switch (subcommand) {
    case 'list': {
      const vars = readEnvFile(envFilePath);
      if (Object.keys(vars).length === 0) {
        console.log('No environment variables found in .env');
      } else {
        console.log('Environment variables:');
        for (const [key, value] of Object.entries(vars)) {
          console.log(`  ${key}=${value}`);
        }
      }
      return vars;
    }

    case 'set': {
      if (positionals.length < 3) {
        console.error('Usage: bn env set <key> <value>');
        process.exit(1);
      }
      const key = positionals[1];
      const value = positionals[2];
      const vars = readEnvFile(envFilePath);
      vars[key] = value;
      writeEnvFile(envFilePath, vars);
      console.log(`Set ${key}=${value}`);
      return vars;
    }

    case 'unset': {
      if (positionals.length < 2) {
        console.error('Usage: bn env unset <key>');
        process.exit(1);
      }
      const key = positionals[1];
      const vars = readEnvFile(envFilePath);
      if (!(key in vars)) {
        console.error(`Variable "${key}" not found in .env`);
        process.exit(1);
      }
      delete vars[key];
      writeEnvFile(envFilePath, vars);
      console.log(`Removed ${key}`);
      return vars;
    }

    case 'pull': {
      const token = values.token || process.env.BN_DEPLOY_TOKEN;
      if (!token) {
        console.error('No token provided. Use --token or set BN_DEPLOY_TOKEN.');
        process.exit(1);
      }

      const projectName = getProjectName(cwd);
      console.log(`Pulling env vars from ${values.env} for "${projectName}"...`);

      try {
        const response = await globalThis.fetch(
          `${ENV_API}/${projectName}/${values.env}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const remoteVars = await response.json();
        writeEnvFile(envFilePath, remoteVars);
        console.log(`Pulled ${Object.keys(remoteVars).length} variables to .env`);
        return remoteVars;
      } catch (err) {
        console.error(`Failed to pull env vars: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'push': {
      const token = values.token || process.env.BN_DEPLOY_TOKEN;
      if (!token) {
        console.error('No token provided. Use --token or set BN_DEPLOY_TOKEN.');
        process.exit(1);
      }

      const projectName = getProjectName(cwd);
      const vars = readEnvFile(envFilePath);
      console.log(`Pushing ${Object.keys(vars).length} variables to ${values.env} for "${projectName}"...`);

      try {
        const response = await globalThis.fetch(
          `${ENV_API}/${projectName}/${values.env}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(vars),
          }
        );
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        console.log('Pushed successfully.');
      } catch (err) {
        console.error(`Failed to push env vars: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown subcommand: ${subcommand}\nRun "bn env --help" for usage.`);
      process.exit(1);
  }
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

function writeEnvFile(filePath, vars) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function getProjectName(cwd) {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('No package.json found.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(pkgPath, 'utf-8')).name;
}
