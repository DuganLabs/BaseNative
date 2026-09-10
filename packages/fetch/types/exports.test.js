/**
 * Guards types/index.d.ts against drifting from src/index.js: every runtime
 * export must have a declaration, and no declaration may name a symbol the
 * package does not export. Modelled on packages/components/types/exports.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as fetchPackage from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const dts = readFileSync(join(here, 'index.d.ts'), 'utf8');

const declared = new Set(
  [...dts.matchAll(/^export\s+(?:declare\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1])
);
const actual = Object.keys(fetchPackage).sort();

test('every runtime export has a declaration in index.d.ts', () => {
  const missing = actual.filter((name) => !declared.has(name));
  assert.deepEqual(missing, [], `index.d.ts is missing declarations for: ${missing.join(', ')}`);
});

test('every declaration in index.d.ts names a real export', () => {
  const phantom = [...declared].filter((name) => !actual.includes(name));
  assert.deepEqual(phantom, [], `index.d.ts declares symbols that are not exported: ${phantom.join(', ')}`);
});
