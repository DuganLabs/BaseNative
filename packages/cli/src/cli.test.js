import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
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
