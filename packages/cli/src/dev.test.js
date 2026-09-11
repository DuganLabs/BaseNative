import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDevCommand, run } from './commands/dev.js';

const dirs = [];

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'bn-dev-'));
  dirs.push(dir);
  for (const [name, contents] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
  }
  return dir;
}

/** Capture console.log for a block that prints. */
async function captureLog(fn) {
  const lines = [];
  const original = console.log;
  console.log = (message) => lines.push(String(message));
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines.join('\n');
}

describe('bn dev — the fallback chain still resolves in order', () => {
  it('prefers a package.json dev script', () => {
    const dir = project({ 'package.json': JSON.stringify({ scripts: { dev: 'node x.js' } }) });
    const plan = resolveDevCommand(dir);
    assert.ok(plan.args.includes('dev'));
    assert.match(plan.label, /run dev/);
  });

  it('falls back to node --watch on server.js', () => {
    const plan = resolveDevCommand(project({ 'server.js': '', 'package.json': '{}' }));
    assert.equal(plan.cmd, 'node');
    assert.deepEqual(plan.args, ['--watch', 'server.js']);
  });

  it('finds src/server.js and src/index.js too', () => {
    assert.equal(resolveDevCommand(project({ 'src/server.js': '' })).args[1], 'src/server.js');
    assert.equal(resolveDevCommand(project({ 'src/index.js': '' })).args[1], 'src/index.js');
  });

  it('falls back to wrangler last', () => {
    const plan = resolveDevCommand(project({ 'wrangler.toml': '' }));
    assert.equal(plan.cmd, 'wrangler');
    assert.equal(plan.wrangler, true);
  });

  it('returns null when there is nothing to run', () => {
    assert.equal(resolveDevCommand(project({ 'README.md': '' })), null);
  });

  it('ignores a malformed package.json rather than crashing', () => {
    const dir = project({ 'package.json': '{ not json', 'server.js': '' });
    assert.equal(resolveDevCommand(dir).cmd, 'node');
  });
});

describe('bn dev — help', () => {
  it('documents HMR and the --no-hmr opt-out', async () => {
    const output = await captureLog(() => run(['--help']));
    assert.match(output, /hot module replacement/i);
    assert.match(output, /--no-hmr/);
  });

  it('accepts --no-hmr instead of rejecting it as an unknown option', async () => {
    const output = await captureLog(() => run(['--no-hmr', '--help']));
    assert.match(output, /bn dev/);
  });
});
