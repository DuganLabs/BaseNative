import { describe, it, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We test the create command's template generation logic directly
import { run as createRun } from './commands/create.js';

describe('create command', () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('creates minimal project', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    const projectDir = join(tempDir, 'test-app');
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      await createRun(['test-app']);

      assert.ok(existsSync(join(projectDir, 'package.json')));
      assert.ok(existsSync(join(projectDir, 'server.js')));
      assert.ok(existsSync(join(projectDir, 'views', 'home.html')));
      assert.ok(existsSync(join(projectDir, '.env')));
      assert.ok(existsSync(join(projectDir, '.gitignore')));

      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
      assert.equal(pkg.name, 'test-app');
      assert.ok(pkg.dependencies['@basenative/runtime']);
      assert.ok(pkg.dependencies['@basenative/server']);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('creates enterprise project', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    const projectDir = join(tempDir, 'enterprise-app');
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      await createRun(['enterprise-app', '--template', 'enterprise']);

      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
      assert.ok(pkg.dependencies['@basenative/middleware']);
      assert.ok(pkg.dependencies['@basenative/config']);
      assert.ok(pkg.dependencies['@basenative/components']);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('creates api project', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    const projectDir = join(tempDir, 'api-app');
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      await createRun(['api-app', '--template', 'api']);

      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
      assert.ok(pkg.dependencies['@basenative/middleware']);
      assert.ok(pkg.dependencies['@basenative/config']);
      assert.ok(!pkg.dependencies['@basenative/runtime']); // API-only, no runtime
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('refuses to overwrite existing directory', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create the directory first
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(tempDir, 'existing'), { recursive: true });

    const originalExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; };

    try {
      await createRun(['existing']);
      assert.equal(exitCode, 1);
    } finally {
      process.exit = originalExit;
      process.chdir(originalCwd);
    }
  });
});

describe('deploy command', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('deploy --dry-run prints manifest', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-deploy-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create package.json
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'test-deploy-app' }));

    // Create a fake dist/ directory with some files
    mkdirSync(join(tempDir, 'dist'), { recursive: true });
    writeFileSync(join(tempDir, 'dist', 'server.js'), 'console.log("hello");');
    writeFileSync(join(tempDir, 'dist', 'index.html'), '<html></html>');

    // Also create a source file so the build step copies something
    writeFileSync(join(tempDir, 'server.js'), 'console.log("server");');

    const { run } = await import('./commands/deploy.js');
    const manifest = await run(['--dry-run']);

    assert.ok(manifest);
    assert.equal(manifest.project, 'test-deploy-app');
    assert.equal(manifest.environment, 'preview');
    assert.ok(manifest.files.length > 0);
    assert.ok(manifest.timestamp);
    assert.ok(manifest.totalSize > 0);
  });
});

describe('analyze command', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('reports file sizes', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-analyze-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create a fake dist/ directory
    const distDir = join(tempDir, 'dist');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, 'app.js'), 'x'.repeat(500));
    writeFileSync(join(distDir, 'style.css'), 'y'.repeat(200));
    writeFileSync(join(distDir, 'index.html'), '<html></html>');

    const { run } = await import('./commands/analyze.js');
    const result = await run([]);

    assert.ok(result);
    assert.equal(result.files.length, 3);
    assert.ok(result.totalSize > 0);
    // Largest file first
    assert.ok(result.files[0].size >= result.files[1].size);
    assert.ok(result.groups['.js']);
    assert.ok(result.groups['.css']);
    assert.ok(result.groups['.html']);
  });

  it('handles custom directory argument', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-analyze-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const buildDir = join(tempDir, 'build');
    mkdirSync(buildDir, { recursive: true });
    writeFileSync(join(buildDir, 'bundle.js'), 'content');

    const { run } = await import('./commands/analyze.js');
    const result = await run(['build']);

    assert.ok(result);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].relativePath, 'bundle.js');
  });
});

describe('env command', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('env list shows variables', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), 'FOO=bar\nBAZ=qux\n');

    const { run } = await import('./commands/env.js');
    const vars = await run(['list']);

    assert.ok(vars);
    assert.equal(vars.FOO, 'bar');
    assert.equal(vars.BAZ, 'qux');
  });

  it('env set adds a variable', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), 'EXISTING=value\n');

    const { run } = await import('./commands/env.js');
    const vars = await run(['set', 'NEW_VAR', 'new_value']);

    assert.ok(vars);
    assert.equal(vars.EXISTING, 'value');
    assert.equal(vars.NEW_VAR, 'new_value');

    // Verify file was written
    const content = readFileSync(join(tempDir, '.env'), 'utf-8');
    assert.ok(content.includes('NEW_VAR=new_value'));
  });

  it('env unset removes a variable', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), 'KEEP=yes\nREMOVE=no\n');

    const { run } = await import('./commands/env.js');
    const vars = await run(['unset', 'REMOVE']);

    assert.ok(vars);
    assert.equal(vars.KEEP, 'yes');
    assert.ok(!('REMOVE' in vars));

    const content = readFileSync(join(tempDir, '.env'), 'utf-8');
    assert.ok(!content.includes('REMOVE'));
  });
});

describe('generate command', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('generates a component', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const { run } = await import('./commands/generate.js');
    await run(['component', 'UserCard']);

    const filePath = join(tempDir, 'src', 'components', 'user-card.js');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('renderUserCard'));
    assert.ok(content.includes('data-bn="user-card"'));
  });

  it('generates a page', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const { run } = await import('./commands/generate.js');
    await run(['page', 'dashboard']);

    const filePath = join(tempDir, 'views', 'dashboard.html');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Dashboard'));
  });
});
