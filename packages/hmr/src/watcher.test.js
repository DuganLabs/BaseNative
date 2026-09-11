import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWatcher, DEFAULT_IGNORED_DIRS, isIgnored } from './watcher.js';

const cleanup = [];

afterEach(() => {
  while (cleanup.length) {
    const fn = cleanup.pop();
    try {
      fn();
    } catch {
      /* best effort */
    }
  }
});

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'bn-hmr-'));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Wait for `predicate` or give up, without a fixed sleep. */
async function until(predicate, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}

describe('isIgnored', () => {
  it('drops the standard noise directories at any depth', () => {
    for (const dir of DEFAULT_IGNORED_DIRS) {
      assert.equal(isIgnored(`${dir}/thing.js`), true, dir);
      assert.equal(isIgnored(`a/b/${dir}/c/thing.js`), true, dir);
    }
  });

  it('drops editor and OS scratch files', () => {
    assert.equal(isIgnored('.DS_Store'), true);
    assert.equal(isIgnored('src/views/home.html~'), true);
    assert.equal(isIgnored('src/.#server.js'), true);
    assert.equal(isIgnored('src/server.js.swp'), true);
    assert.equal(isIgnored('upload.part'), true);
  });

  it('keeps ordinary source files', () => {
    assert.equal(isIgnored('src/server.js'), false);
    assert.equal(isIgnored('views/home.html'), false);
    assert.equal(isIgnored('public/app.css'), false);
  });

  it('normalises Windows separators', () => {
    assert.equal(isIgnored('src\\node_modules\\x.js'), true);
  });

  it('honours a custom ignore list', () => {
    assert.equal(isIgnored('build/out.js', ['build']), true);
    assert.equal(isIgnored('node_modules/x.js', ['build']), false);
  });
});

describe('createWatcher', () => {
  it('reports a changed file as a path relative to cwd', async () => {
    const dir = sandbox();
    mkdirSync(join(dir, 'views'));
    writeFileSync(join(dir, 'views', 'home.html'), '<p>a</p>');

    const batches = [];
    const watcher = createWatcher({
      roots: [dir],
      cwd: dir,
      debounceMs: 20,
      onChange: (files) => batches.push(files),
      env: { NODE_ENV: 'development' },
    });
    cleanup.push(() => watcher.close());

    writeFileSync(join(dir, 'views', 'home.html'), '<p>b</p>');

    assert.ok(await until(() => batches.length > 0), 'no change was reported');
    assert.ok(batches[0].includes('views/home.html'), `got ${JSON.stringify(batches[0])}`);
  });

  it('coalesces a burst of writes into one batch', async () => {
    const dir = sandbox();
    const batches = [];
    const watcher = createWatcher({
      roots: [dir],
      cwd: dir,
      debounceMs: 400,
      onChange: (files) => batches.push(files),
      env: { NODE_ENV: 'development' },
    });
    cleanup.push(() => watcher.close());

    for (let i = 0; i < 8; i++) writeFileSync(join(dir, `f${i}.js`), String(i));

    assert.ok(await until(() => batches.length > 0, 8000));
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(batches.length, 1, `expected one coalesced batch, got ${batches.length}`);
    assert.ok(batches[0].length >= 2, 'the batch should carry several files');
  });

  it('never reports an ignored directory', async () => {
    const dir = sandbox();
    mkdirSync(join(dir, 'node_modules'), { recursive: true });

    const batches = [];
    const watcher = createWatcher({
      roots: [dir],
      cwd: dir,
      debounceMs: 20,
      onChange: (files) => batches.push(files),
      env: { NODE_ENV: 'development' },
    });
    cleanup.push(() => watcher.close());

    writeFileSync(join(dir, 'node_modules', 'junk.js'), 'x');
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.deepEqual(batches, []);

    writeFileSync(join(dir, 'real.js'), 'x');
    assert.ok(await until(() => batches.length > 0));
    assert.deepEqual(batches[0], ['real.js']);
  });

  it('stops reporting after close()', async () => {
    const dir = sandbox();
    const batches = [];
    const watcher = createWatcher({
      roots: [dir],
      cwd: dir,
      debounceMs: 20,
      onChange: (files) => batches.push(files),
      env: { NODE_ENV: 'development' },
    });

    watcher.close();
    assert.equal(watcher.watching, false);

    writeFileSync(join(dir, 'after.js'), 'x');
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.deepEqual(batches, []);
  });

  it('survives a root that does not exist', () => {
    const warnings = [];
    const watcher = createWatcher({
      roots: [join(tmpdir(), 'bn-hmr-does-not-exist-12345')],
      cwd: tmpdir(),
      onChange: () => {},
      onWarn: (message) => warnings.push(message),
      env: { NODE_ENV: 'development' },
    });
    cleanup.push(() => watcher.close());

    assert.equal(watcher.watching, false);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /could not watch/);
  });

  it('refuses to start in production', () => {
    assert.throws(
      () =>
        createWatcher({
          roots: [tmpdir()],
          onChange: () => {},
          env: { NODE_ENV: 'production' },
        }),
      /createWatcher\(\) refused to start/
    );
  });

  it('requires an onChange callback', () => {
    assert.throws(
      () => createWatcher({ roots: [], env: { NODE_ENV: 'development' } }),
      /requires a function/
    );
  });
});
