// Built with BaseNative — basenative.dev
/**
 * `bn deploy` — deploy a BaseNative project.
 *
 * Two modes:
 *   - Local cloud (legacy): POST a manifest to api.basenative.cloud. Kept so
 *     existing tests + workflows still work.
 *   - Wrangler (--prod / --preview): run `wrangler pages deploy`, sourcing
 *     secrets through `@basenative/doppler` (`doppler run --` if present).
 *
 * Flags:
 *   --prod          Deploy to production (wrangler).
 *   --preview       Deploy to a preview URL (wrangler).
 *   --env <name>    Legacy: preview | staging | production
 *   --project <s>   Override project name
 *   --token <t>     Legacy API token (or BN_DEPLOY_TOKEN env)
 *   --no-doppler    Skip Doppler secret injection
 *   --dry-run       Print what would happen
 *   --json          Machine output
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { run as buildRun } from './build.js';
import { c, ok, err, info, step, hint, banner } from '../lib/colors.js';

const DEPLOY_API = 'https://api.basenative.cloud/v1/deploy';

function showHelp() {
  console.log(`
  ${c.bold('bn deploy')} ${c.gray('[options]')}

  Deploy this project.

  ${c.bold('Wrangler mode')} ${c.gray('(recommended)')}
    --prod              Deploy to production
    --preview           Deploy to a preview URL
    --no-doppler        Skip Doppler secret injection

  ${c.bold('Legacy cloud mode')}
    --env <name>        preview | staging | production [default: preview]
    --project <s>       Project name (default: from package.json)
    --token <t>         API token (or BN_DEPLOY_TOKEN)

  ${c.bold('Common')}
    --dry-run           Print manifest, no upload
    --json              Machine-readable output
    -h, --help
`);
}

export async function run(args) {
  const { values } = parseArgs({
    args,
    options: {
      prod: { type: 'boolean', default: false },
      preview: { type: 'boolean', default: false },
      'no-doppler': { type: 'boolean', default: false },
      env: { type: 'string', default: 'preview' },
      project: { type: 'string' },
      token: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    return;
  }

  const wranglerMode = values.prod || values.preview;
  if (wranglerMode) return wranglerDeploy(values);

  return legacyDeploy(values);
}

function wranglerDeploy(values) {
  const cwd = process.cwd();
  const wranglerToml = resolve(cwd, 'wrangler.toml');
  const isPages = readFileSync(wranglerToml, 'utf-8').match(/pages_build_output_dir/);

  const target = values.prod ? 'production' : 'preview';

  banner();
  console.log(`  ${c.dim('Mode:')}    ${c.bold('wrangler')}`);
  console.log(`  ${c.dim('Target:')}  ${c.bold(target)}`);

  if (!existsSync(wranglerToml)) {
    err('wrangler.toml not found.');
    hint('Run `bn create --template webapp` or `--template worker`.');
    process.exit(1);
  }

  const useDoppler = !values['no-doppler'] && hasDoppler();
  if (useDoppler) ok('Sourcing secrets via Doppler.');
  else step('Doppler not used (no `doppler` binary or --no-doppler).');

  const cmd = buildWranglerCommand({ values, isPages });

  if (values['dry-run']) {
    info(`would run: ${useDoppler ? 'doppler run -- ' : ''}${cmd.join(' ')}`);
    if (values.json) {
      console.log(JSON.stringify({ dryRun: true, command: cmd, doppler: useDoppler }, null, 2));
    }
    return { dryRun: true, command: cmd };
  }

  const fullCmd = useDoppler ? ['doppler', ['run', '--', ...cmd]] : [cmd[0], cmd.slice(1)];
  const r = spawnSync(fullCmd[0], fullCmd[1], { stdio: 'inherit', cwd });
  if (r.status !== 0) {
    err(`Deploy failed (exit ${r.status}).`);
    process.exit(r.status ?? 1);
  }
  ok('Deploy complete.');
}

function buildWranglerCommand({ values, isPages }) {
  const projectName = values.project || readPkg().name;
  if (isPages) {
    const args = ['wrangler', 'pages', 'deploy', './public', `--project-name=${projectName}`];
    if (values.preview) args.push('--branch=preview');
    return args;
  }
  return ['wrangler', 'deploy'];
}

function hasDoppler() {
  const r = spawnSync('doppler', ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

function readPkg() {
  const p = resolve(process.cwd(), 'package.json');
  if (!existsSync(p)) return { name: 'app' };
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return { name: 'app' };
  }
}

// ---- Legacy basenative.cloud deploy (kept for back-compat + tests) ----

async function legacyDeploy(values) {
  const validEnvs = ['preview', 'staging', 'production'];
  if (!validEnvs.includes(values.env)) {
    console.error(`Invalid environment "${values.env}". Must be one of: ${validEnvs.join(', ')}`);
    process.exit(1);
  }

  const cwd = process.cwd();

  let projectName = values.project;
  if (!projectName) {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) {
      console.error('No package.json found. Use --project to specify a project name.');
      process.exit(1);
    }
    projectName = JSON.parse(readFileSync(pkgPath, 'utf-8')).name;
  }

  const token = values.token || process.env.BN_DEPLOY_TOKEN;
  if (!token && !values['dry-run']) {
    console.error('No deploy token provided. Use --token or set BN_DEPLOY_TOKEN.');
    process.exit(1);
  }

  console.log(`Deploying "${projectName}" to ${values.env}...`);

  console.log('\nRunning production build...');
  await buildRun([]);

  const outDir = resolve(cwd, 'dist');
  if (!existsSync(outDir)) {
    console.error('Build output directory "dist/" not found. Build may have failed.');
    process.exit(1);
  }

  const files = collectFiles(outDir, outDir);
  const manifest = {
    project: projectName,
    environment: values.env,
    files: files.map((f) => ({ path: f.relativePath, size: f.size })),
    timestamp: new Date().toISOString(),
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };

  if (values['dry-run']) {
    console.log('\n--- Dry Run: Deployment Manifest ---');
    console.log(`Project:     ${manifest.project}`);
    console.log(`Environment: ${manifest.environment}`);
    console.log(`Timestamp:   ${manifest.timestamp}`);
    console.log(`Total size:  ${formatSize(manifest.totalSize)}`);
    console.log(`\nFiles (${manifest.files.length}):`);
    for (const file of manifest.files) {
      console.log(`  ${file.path} (${formatSize(file.size)})`);
    }
    console.log('\nDry run complete. No files were deployed.');
    return manifest;
  }

  console.log('\nUploading...');
  try {
    const response = await globalThis.fetch(DEPLOY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(manifest),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Deploy API returned ${response.status}: ${body}`);
    }
    const result = await response.json();
    const url = result.url || `https://${projectName}--${values.env}.basenative.cloud`;
    console.log(`\nDeployed successfully!`);
    console.log(`URL: ${url}`);
    return result;
  } catch (e) {
    console.error(`\nDeployment failed: ${e.message}`);
    process.exit(1);
  }
}

function collectFiles(dir, baseDir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({
        relativePath: relative(baseDir, fullPath),
        size: stat.size,
      });
    }
  }
  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
