import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We test the create command's template generation logic directly
import { run as createRun } from './commands/create.js';
import { run as prdRun } from './commands/prd.js';
import { run as speckitRun } from './commands/speckit.js';

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

describe('create command — additional', () => {
  let tempDir;
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('minimal template package.json has type:module', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    process.chdir(tempDir);
    await createRun(['type-module-app']);
    const pkg = JSON.parse(readFileSync(join(tempDir, 'type-module-app', 'package.json'), 'utf-8'));
    assert.equal(pkg.type, 'module');
  });

  it('minimal template creates .gitignore', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    process.chdir(tempDir);
    await createRun(['gitignore-app']);
    assert.ok(existsSync(join(tempDir, 'gitignore-app', '.gitignore')));
  });

  it('minimal template server.js contains signal or runtime import', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    process.chdir(tempDir);
    await createRun(['runtime-app']);
    const server = readFileSync(join(tempDir, 'runtime-app', 'server.js'), 'utf-8');
    assert.ok(server.includes('@basenative') || server.includes('import'));
  });
});

describe('build command — additional', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('recursively copies nested subdirectories in public', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    mkdirSync(join(tempDir, 'public', 'images'), { recursive: true });
    writeFileSync(join(tempDir, 'public', 'images', 'logo.svg'), '<svg/>');

    const { run } = await import('./commands/build.js');
    await run([]);

    assert.ok(existsSync(join(tempDir, 'dist', 'public', 'images', 'logo.svg')));
  });

  it('falls back to src/server.js when server.js is absent', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'server.js'), 'export {}');

    const { run } = await import('./commands/build.js');
    await run([]);

    assert.ok(existsSync(join(tempDir, 'dist', 'src', 'server.js')));
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

  it('deploy --dry-run with --env staging sets environment', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-deploy-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'staging-app' }));
    writeFileSync(join(tempDir, 'server.js'), '// server');

    const { run } = await import('./commands/deploy.js');
    const manifest = await run(['--dry-run', '--env', 'staging']);
    assert.equal(manifest.environment, 'staging');
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

  it('converts PascalCase component name to kebab-case filename', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const { run } = await import('./commands/generate.js');
    await run(['component', 'MyBigButton']);

    const filePath = join(tempDir, 'src', 'components', 'my-big-button.js');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('renderMyBigButton'));
  });

  it('generates a route handler', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const { run } = await import('./commands/generate.js');
    await run(['route', '/api/users']);

    const filePath = join(tempDir, 'src', 'routes', 'api-users.js');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('handler'));
    assert.ok(content.includes('/api/users'));
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

  it('exits with code 1 for unknown generate type', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-gen-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const originalExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; };

    try {
      const { run } = await import('./commands/generate.js');
      await run(['widget', 'Foo']);
      assert.equal(exitCode, 1);
    } finally {
      process.exit = originalExit;
    }
  });
});

describe('create command — error paths', () => {
  let tempDir;
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('exits with code 1 when project name is missing', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    process.chdir(tempDir);

    const originalExit = process.exit;
    process.exit = (code) => { throw Object.assign(new Error('exit'), { exitCode: code }); };

    try {
      await createRun([]);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.exitCode, 1);
    } finally {
      process.exit = originalExit;
    }
  });

  it('exits with code 1 for unknown template', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-test-'));
    process.chdir(tempDir);

    const originalExit = process.exit;
    process.exit = (code) => { throw Object.assign(new Error('exit'), { exitCode: code }); };

    try {
      await createRun(['my-app', '--template', 'nonexistent']);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.exitCode, 1);
    } finally {
      process.exit = originalExit;
    }
  });
});

describe('env command — edge cases', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('env list returns empty object when .env is absent', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const { run } = await import('./commands/env.js');
    const vars = await run(['list']);
    assert.deepEqual(vars, {});
  });

  it('env list ignores comment lines in .env', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), '# comment\nFOO=bar\n');

    const { run } = await import('./commands/env.js');
    const vars = await run(['list']);
    assert.equal(vars.FOO, 'bar');
    assert.ok(!('#' in vars));
  });

  it('env set overwrites existing variable', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), 'FOO=old\n');

    const { run } = await import('./commands/env.js');
    const vars = await run(['set', 'FOO', 'new']);
    assert.equal(vars.FOO, 'new');
  });

  it('env unset exits with code 1 when key not in .env', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, '.env'), 'REAL=yes\n');

    const originalExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; };

    try {
      const { run } = await import('./commands/env.js');
      await run(['unset', 'GHOST']);
      assert.equal(exitCode, 1);
    } finally {
      process.exit = originalExit;
    }
  });

  it('env pull fetches and writes remote vars', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'pull-app' }));

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ REMOTE_VAR: 'remote_value' }),
    });

    try {
      const { run } = await import('./commands/env.js');
      const vars = await run(['pull', '--token', 'tok123']);
      assert.equal(vars.REMOTE_VAR, 'remote_value');
      const content = readFileSync(join(tempDir, '.env'), 'utf-8');
      assert.ok(content.includes('REMOTE_VAR=remote_value'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('env push sends local vars to API', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-env-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'push-app' }));
    writeFileSync(join(tempDir, '.env'), 'LOCAL_VAR=local_value\n');

    let capturedBody;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return { ok: true };
    };

    try {
      const { run } = await import('./commands/env.js');
      await run(['push', '--token', 'tok123']);
      assert.equal(capturedBody.LOCAL_VAR, 'local_value');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('build command', () => {
  let tempDir;
  let originalCwd;

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('copies server.js and package.json to dist', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, 'server.js'), 'console.log("server");');
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'test-build' }));

    const { run } = await import('./commands/build.js');
    await run([]);

    assert.ok(existsSync(join(tempDir, 'dist', 'server.js')));
    assert.ok(existsSync(join(tempDir, 'dist', 'package.json')));
  });

  it('copies views directory to dist', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    mkdirSync(join(tempDir, 'views'));
    writeFileSync(join(tempDir, 'views', 'home.html'), '<p>home</p>');

    const { run } = await import('./commands/build.js');
    await run([]);

    assert.ok(existsSync(join(tempDir, 'dist', 'views', 'home.html')));
  });

  it('copies public directory to dist', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    mkdirSync(join(tempDir, 'public'));
    writeFileSync(join(tempDir, 'public', 'style.css'), 'body {}');

    const { run } = await import('./commands/build.js');
    await run([]);

    assert.ok(existsSync(join(tempDir, 'dist', 'public', 'style.css')));
  });

  it('respects --outdir option', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-build-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    writeFileSync(join(tempDir, 'server.js'), 'console.log("hi");');

    const { run } = await import('./commands/build.js');
    await run(['--outdir', 'output']);

    assert.ok(existsSync(join(tempDir, 'output', 'server.js')));
  });
});

describe('determinism — same inputs, same output', () => {
  const made = [];
  const tmp = () => {
    const d = mkdtempSync(join(tmpdir(), 'bn-det-'));
    made.push(d);
    return d;
  };
  afterEach(() => {
    while (made.length) {
      const d = made.pop();
      if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    }
  });
  const inDir = async (dir, fn) => {
    const prev = process.cwd();
    process.chdir(dir);
    try {
      return await fn();
    } finally {
      process.chdir(prev);
    }
  };
  const treeOf = (root) => {
    const out = {};
    const walk = (dir) => {
      for (const entry of readdirSync(dir).sort()) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) walk(abs);
        else out[abs.slice(root.length + 1)] = readFileSync(abs, 'utf-8');
      }
    };
    walk(root);
    return out;
  };

  it('create scaffolds the identical tree twice', async () => {
    const a = tmp();
    const b = tmp();
    await inDir(a, () => createRun(['app', '--template', 'webapp', '--no-git']));
    await inDir(b, () => createRun(['app', '--template', 'webapp', '--no-git']));
    assert.deepEqual(treeOf(join(a, 'app')), treeOf(join(b, 'app')));
  });

  it('create pins the compatibility date and honors --compat-date', async () => {
    const a = tmp();
    await inDir(a, () => createRun(['app', '--template', 'webapp', '--no-git']));
    const wrangler = readFileSync(join(a, 'app', 'wrangler.toml'), 'utf-8');
    assert.ok(wrangler.includes('compatibility_date = "2025-09-23"'), wrangler);
    const b = tmp();
    await inDir(b, () =>
      createRun(['app', '--template', 'webapp', '--no-git', '--compat-date', '2026-03-01']),
    );
    const overridden = readFileSync(join(b, 'app', 'wrangler.toml'), 'utf-8');
    assert.ok(overridden.includes('compatibility_date = "2026-03-01"'), overridden);
  });

  it('prd init writes the same scaffold regardless of $USER', async () => {
    const a = tmp();
    const b = tmp();
    const prevUser = process.env.USER;
    try {
      process.env.USER = 'alice';
      await inDir(a, () => prdRun(['init', '--name', 'demo', '--owner', 'team']));
      process.env.USER = 'bob';
      await inDir(b, () => prdRun(['init', '--name', 'demo', '--owner', 'team']));
    } finally {
      if (prevUser === undefined) delete process.env.USER;
      else process.env.USER = prevUser;
    }
    const pa = readFileSync(join(a, 'docs', 'PRD.md'), 'utf-8');
    const pb = readFileSync(join(b, 'docs', 'PRD.md'), 'utf-8');
    assert.equal(pa, pb);
    assert.ok(!pa.includes('Last updated'), 'the scaffold carries no clock date');
    assert.ok(!/alice|bob/.test(pa), 'the scaffold carries no $USER');
  });

  it('prd sync emits byte-identical issues on re-run', async () => {
    const a = tmp();
    await inDir(a, () => prdRun(['init', '--name', 'demo']));
    const read = () => readFileSync(join(a, '.bn', 'prd-issues.json'), 'utf-8');
    await inDir(a, () => prdRun(['sync']));
    const first = read();
    await inDir(a, () => prdRun(['sync']));
    assert.equal(read(), first);
    assert.ok(!first.includes('generated_at'), 'the sync output carries no timestamp');
  });

  it('speckit tasks emits byte-identical issues on re-run', async () => {
    const a = tmp();
    await inDir(a, () => speckitRun(['init']));
    await inDir(a, () => speckitRun(['spec', 'demo-feature']));
    const read = () => readFileSync(join(a, '.bn', 'speckit-tasks.json'), 'utf-8');
    await inDir(a, () => speckitRun(['tasks']));
    const first = read();
    await inDir(a, () => speckitRun(['tasks']));
    assert.equal(read(), first);
    assert.ok(!first.includes('generated_at'), 'the tasks output carries no timestamp');
  });
});

describe('manifest.json', () => {
  it('enumerates every command the dispatcher registers', () => {
    const here = new URL('.', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('../manifest.json', here), 'utf8'));
    const indexSource = readFileSync(new URL('./index.js', here), 'utf8');
    const mapBody = indexSource.slice(
      indexSource.indexOf('const COMMANDS = {'),
      indexSource.indexOf('};', indexSource.indexOf('const COMMANDS = {')),
    );
    const dispatched = [...mapBody.matchAll(/^\s{2}'?([a-z][a-z0-9-]*)'?: \{ mod:/gm)].map(
      (m) => m[1],
    );
    assert.ok(dispatched.length >= 13, `expected the full command map, got ${dispatched}`);
    assert.deepEqual(
      manifest.commands.map((c) => c.name).sort(),
      dispatched.sort(),
    );
  });
});
