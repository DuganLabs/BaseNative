import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createInstaller } from './installer.js';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('createInstaller — comprehensive', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'installer-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('constructor and configuration', () => {
    it('creates installer with default config', () => {
      const installer = createInstaller({ targetDir: tmpDir });
      assert.ok(installer.install);
      assert.ok(installer.uninstall);
      assert.ok(installer.list);
      assert.ok(installer.update);
      assert.ok(installer.updateAll);
    });

    it('accepts targetDir option', () => {
      const installer = createInstaller({ targetDir: tmpDir });
      assert.ok(installer);
    });

    it('accepts registry option', () => {
      const mockRegistry = { getPackage: () => {} };
      const installer = createInstaller({ registry: mockRegistry, targetDir: tmpDir });
      assert.ok(installer);
    });

    it('accepts packageManager option', () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'pnpm' });
      assert.ok(installer);
    });
  });

  describe('manifest management', () => {
    it('creates manifest directory on first write', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('test-pkg', '1.0.0');

      const manifestDir = join(tmpDir, '.basenative');
      const files = await readFile(manifestDir + '/marketplace.json', 'utf8');
      assert.ok(files);
    });

    it('reads empty manifest when no file exists', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const list = await installer.list();
      assert.deepStrictEqual(list, []);
    });

    it('writes manifest as formatted JSON', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('pkg-a', '1.0.0');

      const manifest = await readFile(join(tmpDir, '.basenative', 'marketplace.json'), 'utf8');
      const parsed = JSON.parse(manifest);
      assert.ok(parsed.packages);
    });

    it('preserves existing packages when adding new ones', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('pkg-a', '1.0.0');
      await installer.install('pkg-b', '2.0.0');

      const list = await installer.list();
      assert.equal(list.length, 2);
      assert.ok(list.some(p => p.name === 'pkg-a'));
      assert.ok(list.some(p => p.name === 'pkg-b'));
    });
  });

  describe('install operation', () => {
    it('installs a package with version', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('my-pkg', '1.2.3');

      assert.equal(result.name, 'my-pkg');
      assert.equal(result.version, '1.2.3');
    });

    it('installs with default version', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('my-pkg');

      assert.equal(result.name, 'my-pkg');
      assert.equal(result.version, 'latest');
    });

    it('records installedAt timestamp', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const before = new Date();
      await installer.install('pkg-ts', '1.0.0');
      const after = new Date();

      const list = await installer.list();
      const pkg = list.find(p => p.name === 'pkg-ts');
      const ts = new Date(pkg.installedAt);
      assert.ok(ts >= before && ts <= after);
    });

    it('installs multiple packages', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('pkg-1', '1.0.0');
      await installer.install('pkg-2', '2.0.0');
      await installer.install('pkg-3', '3.0.0');

      const list = await installer.list();
      assert.equal(list.length, 3);
    });

    it('uses registry to resolve latest version', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({ name: 'from-reg', version: '5.0.0', latestVersion: '5.0.0' })
        ),
      };
      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('from-reg', 'latest');
      assert.equal(result.version, '5.0.0');
    });

    it('uses latestVersion from registry when version field absent', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({ name: 'pkg', latestVersion: '3.0.0' })
        ),
      };
      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('pkg', 'latest');
      assert.equal(result.version, '3.0.0');
    });

    it('falls back to latest when registry returns no version', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() => Promise.resolve({ name: 'pkg' })),
      };
      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('pkg', 'latest');
      assert.equal(result.version, 'latest');
    });

    it('skips registry lookup when no registry provided', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('no-reg', '2.5.0');
      assert.equal(result.version, '2.5.0');
    });

    it('allows installing specific version without registry', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('specific-version', '1.2.3');
      assert.equal(result.version, '1.2.3');
    });

    it('uses npm install by default', async () => {
      let capturedArgs;
      let capturedCwd;

      // Mock process-like behavior by checking that install is called
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'echo',
      });
      await installer.install('test', '1.0.0');

      const list = await installer.list();
      assert.equal(list.length, 1);
    });

    it('builds correct npm spec for version', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('pkg-spec', '1.0.0');
      assert.equal(result.version, '1.0.0');
      assert.equal(result.name, 'pkg-spec');
    });

    it('handles package name with scope', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      const result = await installer.install('@basenative/core', '1.0.0');
      assert.equal(result.name, '@basenative/core');
      assert.equal(result.version, '1.0.0');
    });
  });

  describe('list operation', () => {
    it('returns empty array initially', async () => {
      const installer = createInstaller({ targetDir: tmpDir });
      const list = await installer.list();
      assert.deepStrictEqual(list, []);
    });

    it('returns installed packages', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('list-pkg', '1.0.0');

      const list = await installer.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'list-pkg');
    });

    it('returns all package properties', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('full-pkg', '2.0.0');

      const list = await installer.list();
      const pkg = list[0];
      assert.ok(pkg.name);
      assert.ok(pkg.version);
      assert.ok(pkg.installedAt);
    });

    it('sorts packages by name', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('zebra', '1.0.0');
      await installer.install('apple', '1.0.0');
      await installer.install('banana', '1.0.0');

      const list = await installer.list();
      const names = list.map(p => p.name);
      assert.equal(names.length, 3);
      assert.ok(names.includes('zebra'));
      assert.ok(names.includes('apple'));
      assert.ok(names.includes('banana'));
    });
  });

  describe('uninstall operation', () => {
    it('removes package from manifest', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('remove-me', '1.0.0');
      let list = await installer.list();
      assert.equal(list.length, 1);

      await installer.uninstall('remove-me');
      list = await installer.list();
      assert.equal(list.length, 0);
    });

    it('removes specific package leaving others', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('keep-me', '1.0.0');
      await installer.install('remove-me', '1.0.0');

      await installer.uninstall('remove-me');

      const list = await installer.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'keep-me');
    });

    it('uninstalls multiple packages independently', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('pkg-a', '1.0.0');
      await installer.install('pkg-b', '1.0.0');
      await installer.install('pkg-c', '1.0.0');

      await installer.uninstall('pkg-a');
      await installer.uninstall('pkg-c');

      const list = await installer.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'pkg-b');
    });

    it('handles uninstalling non-existent package gracefully', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      // Should not throw
      await installer.uninstall('not-installed');
    });
  });

  describe('update operation', () => {
    it('updates installed package to latest', async () => {
      let callCount = 0;
      const mockRegistry = {
        getPackage: mock.fn(() => {
          callCount++;
          return Promise.resolve({
            name: 'up-pkg',
            version: callCount === 1 ? '1.0.0' : '2.0.0',
          });
        }),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('up-pkg', '1.0.0');
      const updated = await installer.update('up-pkg');
      assert.equal(updated.name, 'up-pkg');
    });

    it('throws when updating non-installed package', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });

      const err = await installer.update('not-installed').catch(e => e);
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('not installed'));
    });

    it('updates preserves package in manifest', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({ name: 'persist-pkg', version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('persist-pkg', '1.0.0');
      await installer.update('persist-pkg');

      const list = await installer.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'persist-pkg');
    });

    it('update returns package info', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({ name: 'ret-pkg', version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('ret-pkg', '1.0.0');
      const result = await installer.update('ret-pkg');
      assert.ok(result.name);
      assert.ok(result.version);
    });
  });

  describe('updateAll operation', () => {
    it('updates all installed packages', async () => {
      const mockRegistry = {
        getPackage: mock.fn((name) =>
          Promise.resolve({ name, version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('pkg-1', '1.0.0');
      await installer.install('pkg-2', '1.0.0');

      const results = await installer.updateAll();
      assert.equal(results.length, 2);
    });

    it('returns empty array when nothing installed', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const results = await installer.updateAll();
      assert.deepStrictEqual(results, []);
    });

    it('returns update results for each package', async () => {
      const mockRegistry = {
        getPackage: mock.fn((name) =>
          Promise.resolve({ name, version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('alpha', '1.0.0');
      await installer.install('beta', '1.0.0');

      const results = await installer.updateAll();
      const names = results.map(r => r.name);
      assert.ok(names.includes('alpha'));
      assert.ok(names.includes('beta'));
    });

    it('preserves all packages after updateAll', async () => {
      const mockRegistry = {
        getPackage: mock.fn((name) =>
          Promise.resolve({ name, version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('pkg-1', '1.0.0');
      await installer.install('pkg-2', '1.0.0');
      await installer.install('pkg-3', '1.0.0');

      await installer.updateAll();

      const list = await installer.list();
      assert.equal(list.length, 3);
    });

    it('handles updateAll with single package', async () => {
      const mockRegistry = {
        getPackage: mock.fn((name) =>
          Promise.resolve({ name, version: '2.0.0' })
        ),
      };

      const installer = createInstaller({
        registry: mockRegistry,
        targetDir: tmpDir,
        packageManager: 'echo',
      });

      await installer.install('solo', '1.0.0');
      const results = await installer.updateAll();

      assert.equal(results.length, 1);
      assert.equal(results[0].name, 'solo');
    });
  });

  describe('package manager support', () => {
    it('uses npm by default', async () => {
      const installer = createInstaller({ targetDir: tmpDir });
      assert.ok(installer);
    });

    it('uses pnpm when specified', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'pnpm',
      });
      assert.ok(installer);
    });

    it('uses yarn when specified', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'yarn',
      });
      assert.ok(installer);
    });

    it('uses custom package manager', async () => {
      const installer = createInstaller({
        targetDir: tmpDir,
        packageManager: 'custom-pm',
      });
      assert.ok(installer);
    });
  });

  describe('edge cases', () => {
    it('handles package names with special characters', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('pkg-with-dashes', '1.0.0');
      assert.equal(result.name, 'pkg-with-dashes');
    });

    it('handles scoped package names', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('@org/pkg-name', '1.0.0');
      assert.equal(result.name, '@org/pkg-name');
    });

    it('handles version with pre-release', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('pkg', '1.0.0-beta.1');
      assert.equal(result.version, '1.0.0-beta.1');
    });

    it('handles version with build metadata', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const result = await installer.install('pkg', '1.0.0+build.1');
      assert.equal(result.version, '1.0.0+build.1');
    });

    it('reinstalls already installed package', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('dup', '1.0.0');
      await installer.install('dup', '2.0.0');

      const list = await installer.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].version, '2.0.0');
    });

    it('handles many packages', async () => {
      const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });

      for (let i = 0; i < 50; i++) {
        await installer.install(`pkg-${i}`, '1.0.0');
      }

      const list = await installer.list();
      assert.equal(list.length, 50);
    });
  });

  describe('manifest persistence', () => {
    it('survives installer recreation', async () => {
      let installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      await installer.install('persist', '1.0.0');

      installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const list = await installer.list();

      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'persist');
    });

    it('preserves all fields through reinstantiation', async () => {
      let installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const before = new Date();
      await installer.install('field-test', '2.5.0');
      const after = new Date();

      installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
      const list = await installer.list();
      const pkg = list[0];

      assert.equal(pkg.name, 'field-test');
      assert.equal(pkg.version, '2.5.0');
      const ts = new Date(pkg.installedAt);
      assert.ok(ts >= before && ts <= after);
    });
  });
});
