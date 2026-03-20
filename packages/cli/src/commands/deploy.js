/**
 * Deploy command - deploys a BaseNative app to the cloud platform.
 *
 * Usage: bn deploy [options]
 * Options:
 *   --env <environment>  Target environment (preview, staging, production) [default: preview]
 *   --project <name>     Project name (auto-detected from package.json)
 *   --token <token>      API token (or BN_DEPLOY_TOKEN env var)
 *   --dry-run            Show what would be deployed without deploying
 *
 * Flow:
 * 1. Read project config (package.json, .env)
 * 2. Run production build
 * 3. Bundle assets
 * 4. Upload to deployment platform
 * 5. Return deployment URL
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { run as buildRun } from './build.js';

const DEPLOY_API = 'https://api.basenative.cloud/v1/deploy';

export async function run(args) {
  const { values } = parseArgs({
    args,
    options: {
      env: { type: 'string', default: 'preview' },
      project: { type: 'string' },
      token: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
  bn deploy [options]

  Deploy a BaseNative app to the cloud platform.

  Options:
    --env <environment>  Target environment (preview, staging, production) [default: preview]
    --project <name>     Project name (auto-detected from package.json)
    --token <token>      API token (or BN_DEPLOY_TOKEN env var)
    --dry-run            Show what would be deployed without deploying
    --help, -h           Show this help
`);
    return;
  }

  const validEnvs = ['preview', 'staging', 'production'];
  if (!validEnvs.includes(values.env)) {
    console.error(`Invalid environment "${values.env}". Must be one of: ${validEnvs.join(', ')}`);
    process.exit(1);
  }

  const cwd = process.cwd();

  // Resolve project name
  let projectName = values.project;
  if (!projectName) {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) {
      console.error('No package.json found. Use --project to specify a project name.');
      process.exit(1);
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    projectName = pkg.name;
  }

  // Resolve token
  const token = values.token || process.env.BN_DEPLOY_TOKEN;
  if (!token && !values['dry-run']) {
    console.error('No deploy token provided. Use --token or set BN_DEPLOY_TOKEN.');
    process.exit(1);
  }

  console.log(`Deploying "${projectName}" to ${values.env}...`);

  // Run production build
  console.log('\nRunning production build...');
  await buildRun([]);

  // Collect built files
  const outDir = resolve(cwd, 'dist');
  if (!existsSync(outDir)) {
    console.error('Build output directory "dist/" not found. Build may have failed.');
    process.exit(1);
  }

  const files = collectFiles(outDir, outDir);

  // Create deployment manifest
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

  // Upload to deploy API
  console.log('\nUploading...');
  try {
    const response = await globalThis.fetch(DEPLOY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
  } catch (err) {
    console.error(`\nDeployment failed: ${err.message}`);
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
