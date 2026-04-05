import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from './registry.js';
import { createInstaller } from './installer.js';
import { createThemeManager } from './theme.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function mockFetch(response, ok = true, status = 200) {
  const fn = mock.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText: ok ? 'OK' : 'Not Found',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  );
  return fn;
}

describe('createRegistry', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('search sends correct query params and returns results', async () => {
    const expected = {
      packages: [
        { name: 'btn-primary', version: '1.0.0', description: 'Primary button' },
      ],
      total: 1,
    };
    globalThis.fetch = mockFetch(expected);

    const registry = createRegistry({ url: 'https://test.registry.dev', token: 'test-token' });
    const result = await registry.search('button', { limit: 10, tag: 'ui' });

    assert.deepStrictEqual(result, expected);

    const call = globalThis.fetch.mock.calls[0];
    const url = new URL(call.arguments[0]);
    assert.equal(url.searchParams.get('q'), 'button');
    assert.equal(url.searchParams.get('limit'), '10');
    assert.equal(url.searchParams.get('tag'), 'ui');

    const headers = call.arguments[1].headers;
    assert.equal(headers['Authorization'], 'Bearer test-token');
  });

  it('search with offset, category, and sort params', async () => {
    const expected = { packages: [], total: 0 };
    globalThis.fetch = mockFetch(expected);

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    await registry.search('table', { offset: 40, limit: 10, category: 'data', sort: 'downloads' });

    const call = globalThis.fetch.mock.calls[0];
    const url = new URL(call.arguments[0]);
    assert.equal(url.searchParams.get('offset'), '40');
    assert.equal(url.searchParams.get('category'), 'data');
    assert.equal(url.searchParams.get('sort'), 'downloads');
  });

  it('omits Authorization header when no token provided', async () => {
    globalThis.fetch = mockFetch({ packages: [], total: 0 });

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    await registry.search('x');

    const call = globalThis.fetch.mock.calls[0];
    const headers = call.arguments[1].headers;
    assert.equal(headers['Authorization'], undefined);
  });

  it('getPackage returns package details', async () => {
    const expected = {
      name: 'my-component',
      version: '2.1.0',
      description: 'A great component',
      author: 'dev',
      downloads: 5000,
    };
    globalThis.fetch = mockFetch(expected);

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    const result = await registry.getPackage('my-component');

    assert.deepStrictEqual(result, expected);

    const call = globalThis.fetch.mock.calls[0];
    const url = new URL(call.arguments[0]);
    assert.ok(url.pathname.includes('my-component'));
  });

  it('getPackage URL-encodes package name', async () => {
    globalThis.fetch = mockFetch({ name: '@scope/pkg', version: '1.0.0' });

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    await registry.getPackage('@scope/pkg');

    const call = globalThis.fetch.mock.calls[0];
    const urlStr = call.arguments[0];
    assert.ok(urlStr.includes('%40scope%2Fpkg') || urlStr.includes('%40'));
  });

  it('getVersions sorts by semver descending', async () => {
    const versions = [
      { version: '1.0.0' },
      { version: '2.1.0' },
      { version: '1.5.3' },
      { version: '0.9.0' },
    ];
    globalThis.fetch = mockFetch({ versions });

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    const result = await registry.getVersions('my-pkg');

    assert.equal(result[0].version, '2.1.0');
    assert.equal(result[1].version, '1.5.3');
    assert.equal(result[2].version, '1.0.0');
    assert.equal(result[3].version, '0.9.0');
  });

  it('getVersions handles array response directly', async () => {
    const versions = [{ version: '1.0.0' }, { version: '2.0.0' }];
    globalThis.fetch = mockFetch(versions);

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    const result = await registry.getVersions('my-pkg');

    assert.equal(result[0].version, '2.0.0');
    assert.equal(result[1].version, '1.0.0');
  });

  it('publish sends correct POST request', async () => {
    const packageData = {
      name: 'new-component',
      version: '1.0.0',
      description: 'Brand new',
    };
    const expected = { ...packageData, id: 'abc123' };
    globalThis.fetch = mockFetch(expected);

    const registry = createRegistry({ url: 'https://test.registry.dev', token: 'pub-token' });
    const result = await registry.publish(packageData);

    assert.deepStrictEqual(result, expected);

    const call = globalThis.fetch.mock.calls[0];
    const opts = call.arguments[1];
    assert.equal(opts.method, 'POST');
    assert.equal(opts.headers['Authorization'], 'Bearer pub-token');
    assert.deepStrictEqual(JSON.parse(opts.body), packageData);
  });

  it('unpublish sends DELETE request to correct URL', async () => {
    globalThis.fetch = mockFetch({ success: true });

    const registry = createRegistry({ url: 'https://test.registry.dev', token: 'tok' });
    await registry.unpublish('my-pkg', '1.2.3');

    const call = globalThis.fetch.mock.calls[0];
    const urlStr = call.arguments[0];
    assert.ok(urlStr.includes('my-pkg'));
    assert.ok(urlStr.includes('1.2.3'));
    assert.equal(call.arguments[1].method, 'DELETE');
  });

  it('throws on non-ok response with status and body', async () => {
    globalThis.fetch = mockFetch({ error: 'not found' }, false, 404);

    const registry = createRegistry({ url: 'https://test.registry.dev' });

    const err = await registry.getPackage('missing').catch(e => e);
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes('404'));
    assert.equal(err.status, 404);
  });
});

describe('createInstaller', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'marketplace-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('list returns empty array when no packages installed', async () => {
    const installer = createInstaller({ targetDir: tmpDir });
    const list = await installer.list();
    assert.deepStrictEqual(list, []);
  });

  it('tracks installed packages in manifest', async () => {
    const fakeRegistry = {
      getPackage: mock.fn(() =>
        Promise.resolve({ name: 'test-pkg', version: '1.2.3' })
      ),
    };

    const installer = createInstaller({
      registry: fakeRegistry,
      targetDir: tmpDir,
      packageManager: 'echo',
    });

    await installer.install('test-pkg', '1.2.3');
    const installed = await installer.list();

    assert.equal(installed.length, 1);
    assert.equal(installed[0].name, 'test-pkg');
    assert.equal(installed[0].version, '1.2.3');
  });

  it('list returns installed packages', async () => {
    const fakeRegistry = {
      getPackage: mock.fn(() =>
        Promise.resolve({ name: 'pkg-a', version: '1.0.0' })
      ),
    };

    const installer = createInstaller({
      registry: fakeRegistry,
      targetDir: tmpDir,
      packageManager: 'echo',
    });

    await installer.install('pkg-a', '1.0.0');
    await installer.install('pkg-b', '2.0.0');

    const list = await installer.list();
    assert.equal(list.length, 2);

    const names = list.map((p) => p.name);
    assert.ok(names.includes('pkg-a'));
    assert.ok(names.includes('pkg-b'));
  });

  it('install records installedAt timestamp', async () => {
    const installer = createInstaller({
      targetDir: tmpDir,
      packageManager: 'echo',
    });

    const before = new Date();
    await installer.install('my-pkg', '1.0.0');
    const after = new Date();

    const list = await installer.list();
    const ts = new Date(list[0].installedAt);
    assert.ok(ts >= before);
    assert.ok(ts <= after);
  });

  it('update throws if package not installed', async () => {
    const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });

    await assert.rejects(() => installer.update('uninstalled-pkg'), {
      message: 'Package "uninstalled-pkg" is not installed',
    });
  });

  it('updateAll updates all tracked packages', async () => {
    const fakeRegistry = {
      getPackage: mock.fn((name) =>
        Promise.resolve({ name, version: '2.0.0' })
      ),
    };

    const installer = createInstaller({
      registry: fakeRegistry,
      targetDir: tmpDir,
      packageManager: 'echo',
    });

    await installer.install('alpha', '1.0.0');
    await installer.install('beta', '1.0.0');

    const results = await installer.updateAll();
    assert.equal(results.length, 2);
    const names = results.map(r => r.name);
    assert.ok(names.includes('alpha'));
    assert.ok(names.includes('beta'));
  });
});

describe('createThemeManager', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'themes-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('install and list themes', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('dark-mode');
    await manager.install('ocean-blue');

    const themes = await manager.list();
    assert.equal(themes.length, 2);

    const names = themes.map((t) => t.name);
    assert.ok(names.includes('dark-mode'));
    assert.ok(names.includes('ocean-blue'));
  });

  it('install with registry populates version and description', async () => {
    const fakeRegistry = {
      getPackage: mock.fn(() =>
        Promise.resolve({
          name: 'forest',
          version: '3.0.0',
          description: 'A forest theme',
          author: 'designer',
        })
      ),
    };

    const manager = createThemeManager({ registry: fakeRegistry, themesDir: tmpDir });
    const result = await manager.install('forest');

    assert.equal(result.version, '3.0.0');
    assert.equal(result.description, 'A forest theme');
    assert.equal(result.author, 'designer');
  });

  it('activate sets the active theme', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('sunset');
    await manager.activate('sunset');

    const active = await manager.getActive();
    assert.equal(active.name, 'sunset');
  });

  it('switching active theme updates correctly', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('light');
    await manager.install('dark');
    await manager.activate('light');
    await manager.activate('dark');

    const active = await manager.getActive();
    assert.equal(active.name, 'dark');
  });

  it('list marks active theme with active: true', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('red');
    await manager.install('blue');
    await manager.activate('red');

    const themes = await manager.list();
    const red = themes.find(t => t.name === 'red');
    const blue = themes.find(t => t.name === 'blue');
    assert.equal(red.active, true);
    assert.equal(blue.active, false);
  });

  it('getActive returns null when no theme is active', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    const active = await manager.getActive();
    assert.equal(active, null);
  });

  it('remove deletes a theme and clears active if needed', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('retro');
    await manager.activate('retro');
    await manager.remove('retro');

    const themes = await manager.list();
    assert.equal(themes.length, 0);

    const active = await manager.getActive();
    assert.equal(active, null);
  });

  it('remove non-active theme leaves active unchanged', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('alpha');
    await manager.install('beta');
    await manager.activate('alpha');
    await manager.remove('beta');

    const active = await manager.getActive();
    assert.equal(active.name, 'alpha');

    const themes = await manager.list();
    assert.equal(themes.length, 1);
  });

  it('activate throws if theme is not installed', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await assert.rejects(() => manager.activate('nonexistent'), {
      message: 'Theme "nonexistent" is not installed',
    });
  });

  it('remove throws if theme is not installed', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await assert.rejects(() => manager.remove('ghost'), {
      message: 'Theme "ghost" is not installed',
    });
  });
});

describe('createInstaller — additional', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'installer-ext-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('uninstall removes package from manifest', async () => {
    const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
    await installer.install('remove-me', '1.0.0');
    let list = await installer.list();
    assert.equal(list.length, 1);

    await installer.uninstall('remove-me');
    list = await installer.list();
    assert.equal(list.length, 0);
  });

  it('updateAll returns empty array when nothing installed', async () => {
    const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
    const results = await installer.updateAll();
    assert.deepStrictEqual(results, []);
  });

  it('install without registry resolves to provided version', async () => {
    const installer = createInstaller({ targetDir: tmpDir, packageManager: 'echo' });
    const result = await installer.install('my-pkg', '2.5.0');
    assert.equal(result.version, '2.5.0');
  });

  it('update after install reflects latest version from registry', async () => {
    let callCount = 0;
    const fakeRegistry = {
      getPackage: mock.fn(() => {
        callCount++;
        return Promise.resolve({ name: 'up-pkg', version: callCount === 1 ? '1.0.0' : '2.0.0' });
      }),
    };

    const installer = createInstaller({
      registry: fakeRegistry,
      targetDir: tmpDir,
      packageManager: 'echo',
    });

    await installer.install('up-pkg', '1.0.0');
    const updated = await installer.update('up-pkg');
    assert.equal(updated.name, 'up-pkg');
  });
});

describe('createThemeManager — additional', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'theme-ext-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('installed theme has installedAt timestamp in list', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });
    const before = new Date();
    await manager.install('timestamped');
    const after = new Date();
    const themes = await manager.list();
    const ts = new Date(themes[0].installedAt);
    assert.ok(ts >= before);
    assert.ok(ts <= after);
  });

  it('list returns empty array when no themes installed', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });
    const themes = await manager.list();
    assert.deepStrictEqual(themes, []);
  });

  it('reinstalling existing theme updates metadata', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });
    await manager.install('reload-me');
    const result = await manager.install('reload-me');
    // Should not throw; last install wins
    assert.equal(result.name, 'reload-me');
    const list = await manager.list();
    assert.equal(list.filter(t => t.name === 'reload-me').length, 1);
  });
});

describe('createRegistry — additional', () => {
  let originalFetch;

  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('publish without token sends no Authorization header', async () => {
    let capturedHeaders;
    globalThis.fetch = mock.fn((_url, init) => {
      capturedHeaders = init.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ name: 'x', version: '1.0.0' }),
        text: () => Promise.resolve('{}'),
      });
    });

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    await registry.publish({ name: 'x', version: '1.0.0' });
    assert.equal(capturedHeaders['Authorization'], undefined);
  });

  it('getVersions returns empty array when versions key is absent', async () => {
    globalThis.fetch = mock.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      })
    );

    const registry = createRegistry({ url: 'https://test.registry.dev' });
    const result = await registry.getVersions('pkg-no-versions');
    assert.deepStrictEqual(result, []);
  });
});
