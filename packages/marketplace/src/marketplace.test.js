import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from './registry.js';
import { createInstaller } from './installer.js';
import { createThemeManager } from './theme.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function mockFetch(response) {
  const fn = mock.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
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
});

describe('createInstaller', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'marketplace-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('tracks installed packages in manifest', async () => {
    const fakeRegistry = {
      getPackage: mock.fn(() =>
        Promise.resolve({ name: 'test-pkg', version: '1.2.3' })
      ),
    };

    // Override execFile to avoid actual npm calls
    const installer = createInstaller({
      registry: fakeRegistry,
      targetDir: tmpDir,
      packageManager: 'echo', // use echo as a no-op command
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

  it('activate sets the active theme', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await manager.install('sunset');
    await manager.activate('sunset');

    const active = await manager.getActive();
    assert.equal(active.name, 'sunset');
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

  it('activate throws if theme is not installed', async () => {
    const manager = createThemeManager({ themesDir: tmpDir });

    await assert.rejects(() => manager.activate('nonexistent'), {
      message: 'Theme "nonexistent" is not installed',
    });
  });
});
