import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, 'create-basenative.js');
const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'));

describe('create-basenative bin', () => {
  it('is the file package.json declares', () => {
    assert.equal(pkg.bin['create-basenative'], './src/bin/create-basenative.js');
  });

  it('scaffolds a project, the same as bn create', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'create-basenative-'));
    try {
      execFileSync(process.execPath, [bin, 'demo-app', '--no-git'], { cwd, stdio: 'pipe' });
      assert.ok(
        existsSync(join(cwd, 'demo-app', 'package.json')),
        'demo-app/package.json was not created',
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
