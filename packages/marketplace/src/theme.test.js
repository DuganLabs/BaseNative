import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createThemeManager } from './theme.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('createThemeManager — comprehensive', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'theme-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('constructor and configuration', () => {
    it('creates theme manager with default config', () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      assert.ok(manager.install);
      assert.ok(manager.list);
      assert.ok(manager.activate);
      assert.ok(manager.getActive);
      assert.ok(manager.remove);
    });

    it('accepts themesDir option', () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      assert.ok(manager);
    });

    it('accepts registry option', () => {
      const mockRegistry = { getPackage: () => {} };
      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      assert.ok(manager);
    });

    it('uses default themesDir when not provided', () => {
      // Should default to .basenative/themes
      const manager = createThemeManager({});
      assert.ok(manager);
    });
  });

  describe('config file management', () => {
    it('creates themes directory on first write', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('first-theme');

      const configPath = join(tmpDir, 'themes.json');
      const config = await readFile(configPath, 'utf8');
      assert.ok(config);
      assert.ok(JSON.parse(config).themes);
    });

    it('reads empty config when no file exists', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const themes = await manager.list();
      assert.deepStrictEqual(themes, []);
    });

    it('returns null active theme initially', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const active = await manager.getActive();
      assert.equal(active, null);
    });

    it('writes config as formatted JSON', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('format-test');

      const configPath = join(tmpDir, 'themes.json');
      const content = await readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      assert.ok(config.themes);
      assert.ok(config.active !== undefined);
    });

    it('preserves existing themes when adding new ones', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('theme-a');
      await manager.install('theme-b');

      const themes = await manager.list();
      assert.equal(themes.length, 2);
      assert.ok(themes.some(t => t.name === 'theme-a'));
      assert.ok(themes.some(t => t.name === 'theme-b'));
    });
  });

  describe('install operation', () => {
    it('installs a theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const result = await manager.install('dark-mode');

      assert.equal(result.name, 'dark-mode');
      // installedAt is stored in the config, not returned
      const themes = await manager.list();
      assert.ok(themes[0].installedAt);
    });

    it('records installedAt timestamp', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const before = new Date();
      await manager.install('timestamp-theme');
      const after = new Date();

      const themes = await manager.list();
      const ts = new Date(themes[0].installedAt);
      assert.ok(ts >= before && ts <= after);
    });

    it('installs multiple themes', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('light');
      await manager.install('dark');
      await manager.install('auto');

      const themes = await manager.list();
      assert.equal(themes.length, 3);
    });

    it('queries registry for theme info when available', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'registry-theme',
            version: '1.5.0',
            description: 'A theme from registry',
            author: 'designer',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const result = await manager.install('registry-theme');

      assert.equal(result.version, '1.5.0');
      assert.equal(result.description, 'A theme from registry');
      assert.equal(result.author, 'designer');
    });

    it('populates version from registry.version', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'versioned',
            version: '2.0.0',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const result = await manager.install('versioned');

      assert.equal(result.version, '2.0.0');
    });

    it('falls back to latestVersion when version absent', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'fallback-version',
            latestVersion: '3.0.0',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const result = await manager.install('fallback-version');

      assert.equal(result.version, '3.0.0');
    });

    it('throws when registry call fails', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() => Promise.reject(new Error('Network error'))),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const err = await manager.install('offline').catch(e => e);
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Network error'));
    });

    it('reinstalls existing theme updates metadata', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'reload',
            version: '2.0.0',
            description: 'Updated theme',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      await manager.install('reload');
      const result = await manager.install('reload');

      const themes = await manager.list();
      assert.equal(themes.length, 1);
      assert.equal(result.version, '2.0.0');
    });

    it('installs theme without registry', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const result = await manager.install('no-reg-theme');

      assert.equal(result.name, 'no-reg-theme');
      // installedAt is stored in the config, not returned
      const themes = await manager.list();
      assert.ok(themes[0].installedAt);
    });
  });

  describe('list operation', () => {
    it('returns empty array initially', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const themes = await manager.list();
      assert.deepStrictEqual(themes, []);
    });

    it('returns installed themes', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('theme-1');
      await manager.install('theme-2');

      const themes = await manager.list();
      assert.equal(themes.length, 2);
    });

    it('includes active flag for each theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('inactive');
      await manager.install('active-one');
      await manager.activate('active-one');

      const themes = await manager.list();
      const inactive = themes.find(t => t.name === 'inactive');
      const active = themes.find(t => t.name === 'active-one');

      assert.equal(inactive.active, false);
      assert.equal(active.active, true);
    });

    it('returns all theme properties', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'full-props',
            version: '1.0.0',
            description: 'Full properties',
            author: 'designer',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      await manager.install('full-props');

      const themes = await manager.list();
      const theme = themes[0];
      assert.ok(theme.name);
      assert.ok(theme.version);
      assert.ok(theme.description);
      assert.ok(theme.author);
      assert.ok(theme.installedAt);
      assert.ok(theme.active !== undefined);
    });
  });

  describe('activate operation', () => {
    it('sets a theme as active', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('activate-test');
      await manager.activate('activate-test');

      const active = await manager.getActive();
      assert.equal(active.name, 'activate-test');
    });

    it('activates specific theme leaving others inactive', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('theme-x');
      await manager.install('theme-y');
      await manager.activate('theme-x');

      const themes = await manager.list();
      const x = themes.find(t => t.name === 'theme-x');
      const y = themes.find(t => t.name === 'theme-y');

      assert.equal(x.active, true);
      assert.equal(y.active, false);
    });

    it('switches active theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('first');
      await manager.install('second');

      await manager.activate('first');
      assert.equal((await manager.getActive()).name, 'first');

      await manager.activate('second');
      assert.equal((await manager.getActive()).name, 'second');
    });

    it('throws when activating non-installed theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });

      const err = await manager.activate('nonexistent').catch(e => e);
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('not installed'));
    });

    it('allows reactivating the same theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('same');
      await manager.activate('same');
      await manager.activate('same');

      const active = await manager.getActive();
      assert.equal(active.name, 'same');
    });

    it('preserves theme metadata on activation', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'metadata-theme',
            version: '2.0.0',
            description: 'Theme with metadata',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      await manager.install('metadata-theme');
      await manager.activate('metadata-theme');

      const active = await manager.getActive();
      assert.equal(active.version, '2.0.0');
      assert.equal(active.description, 'Theme with metadata');
    });
  });

  describe('getActive operation', () => {
    it('returns null when no theme active', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const active = await manager.getActive();
      assert.equal(active, null);
    });

    it('returns active theme details', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'active-detail',
            version: '1.5.0',
            description: 'Active theme',
            author: 'artist',
          })
        ),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      await manager.install('active-detail');
      await manager.activate('active-detail');

      const active = await manager.getActive();
      assert.equal(active.name, 'active-detail');
      assert.equal(active.version, '1.5.0');
      assert.equal(active.description, 'Active theme');
      assert.equal(active.author, 'artist');
    });

    it('returns null when active theme is missing', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('exists');

      // Manually corrupt config to have invalid active theme
      const configPath = join(tmpDir, 'themes.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      config.active = 'nonexistent';
      await writeFile(configPath, JSON.stringify(config));

      const active = await manager.getActive();
      assert.equal(active, null);
    });

    it('handles case where active is explicitly null', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('unactivated');

      const active = await manager.getActive();
      assert.equal(active, null);
    });
  });

  describe('remove operation', () => {
    it('removes an installed theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('remove-me');

      let themes = await manager.list();
      assert.equal(themes.length, 1);

      await manager.remove('remove-me');
      themes = await manager.list();
      assert.equal(themes.length, 0);
    });

    it('removes theme and clears active if it was active', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('remove-active');
      await manager.activate('remove-active');

      await manager.remove('remove-active');

      const active = await manager.getActive();
      assert.equal(active, null);
    });

    it('removes theme leaving active unchanged if different', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('keep-active');
      await manager.install('remove-inactive');
      await manager.activate('keep-active');

      await manager.remove('remove-inactive');

      const active = await manager.getActive();
      assert.equal(active.name, 'keep-active');

      const themes = await manager.list();
      assert.equal(themes.length, 1);
    });

    it('removes multiple themes independently', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('a');
      await manager.install('b');
      await manager.install('c');

      await manager.remove('a');
      await manager.remove('c');

      const themes = await manager.list();
      assert.equal(themes.length, 1);
      assert.equal(themes[0].name, 'b');
    });

    it('throws when removing non-installed theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });

      const err = await manager.remove('missing').catch(e => e);
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('not installed'));
    });

    it('does not affect other installed themes', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('theme-1');
      await manager.install('theme-2');
      await manager.install('theme-3');

      await manager.remove('theme-2');

      const themes = await manager.list();
      const names = themes.map(t => t.name);
      assert.ok(names.includes('theme-1'));
      assert.ok(names.includes('theme-3'));
      assert.ok(!names.includes('theme-2'));
    });
  });

  describe('edge cases', () => {
    it('handles theme names with special characters', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const result = await manager.install('theme-with-dashes');
      assert.equal(result.name, 'theme-with-dashes');
    });

    it('handles theme names with numbers', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const result = await manager.install('theme2024');
      assert.equal(result.name, 'theme2024');
    });

    it('handles scoped theme names', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      const result = await manager.install('@org/theme');
      assert.equal(result.name, '@org/theme');
    });

    it('reinstalls existing theme', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('dup');
      await manager.install('dup');

      const themes = await manager.list();
      assert.equal(themes.length, 1);
    });

    it('handles many themes', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });

      for (let i = 0; i < 30; i++) {
        await manager.install(`theme-${i}`);
      }

      const themes = await manager.list();
      assert.equal(themes.length, 30);
    });

    it('manages theme state with complex sequences', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });

      // Install and activate
      await manager.install('step1');
      await manager.activate('step1');
      assert.equal((await manager.getActive()).name, 'step1');

      // Add more and switch
      await manager.install('step2');
      await manager.activate('step2');
      assert.equal((await manager.getActive()).name, 'step2');

      // Remove active and check null
      await manager.remove('step2');
      assert.equal(await manager.getActive(), null);

      // Check remaining theme
      const themes = await manager.list();
      assert.equal(themes.length, 1);
      assert.equal(themes[0].name, 'step1');
    });
  });

  describe('persistence', () => {
    it('survives manager recreation', async () => {
      let manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('persist-theme');

      manager = createThemeManager({ themesDir: tmpDir });
      const themes = await manager.list();

      assert.equal(themes.length, 1);
      assert.equal(themes[0].name, 'persist-theme');
    });

    it('preserves active state across recreation', async () => {
      let manager = createThemeManager({ themesDir: tmpDir });
      await manager.install('persist-active');
      await manager.activate('persist-active');

      manager = createThemeManager({ themesDir: tmpDir });
      const active = await manager.getActive();

      assert.equal(active.name, 'persist-active');
    });

    it('preserves all metadata across recreation', async () => {
      const mockRegistry = {
        getPackage: mock.fn(() =>
          Promise.resolve({
            name: 'persist-meta',
            version: '1.2.3',
            description: 'Persistent metadata',
            author: 'author-name',
          })
        ),
      };

      let manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const before = new Date();
      await manager.install('persist-meta');
      const after = new Date();

      manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });
      const themes = await manager.list();
      const theme = themes[0];

      assert.equal(theme.version, '1.2.3');
      assert.equal(theme.description, 'Persistent metadata');
      assert.equal(theme.author, 'author-name');
      const ts = new Date(theme.installedAt);
      assert.ok(ts >= before && ts <= after);
    });
  });

  describe('integration scenarios', () => {
    it('complete workflow: install, list, activate, deactivate via removal', async () => {
      const manager = createThemeManager({ themesDir: tmpDir });

      // Install themes
      await manager.install('workflow-light');
      await manager.install('workflow-dark');

      // List and verify
      let themes = await manager.list();
      assert.equal(themes.length, 2);

      // Activate one
      await manager.activate('workflow-dark');
      let active = await manager.getActive();
      assert.equal(active.name, 'workflow-dark');

      // Remove active
      await manager.remove('workflow-dark');
      active = await manager.getActive();
      assert.equal(active, null);

      // Verify remaining
      themes = await manager.list();
      assert.equal(themes.length, 1);
      assert.equal(themes[0].name, 'workflow-light');
    });

    it('registry lookup during complex workflow', async () => {
      let callCount = 0;
      const mockRegistry = {
        getPackage: mock.fn(() => {
          callCount++;
          return Promise.resolve({
            name: 'dynamic-theme',
            version: `${callCount}.0.0`,
          });
        }),
      };

      const manager = createThemeManager({ registry: mockRegistry, themesDir: tmpDir });

      // First install
      await manager.install('dynamic-theme');
      let themes = await manager.list();
      assert.equal(themes[0].version, '1.0.0');

      // Reinstall gets new version
      await manager.install('dynamic-theme');
      themes = await manager.list();
      // Should update to latest
      assert.ok(themes[0].version);
    });
  });
});

// Helper function for theme.test.js
import { writeFile } from 'node:fs/promises';
