/**
 * Guards types/index.d.ts against drifting from src/index.js: every runtime
 * export must have a declaration, and no function/const declaration may
 * name a symbol the package does not export. (Interfaces and type aliases
 * are type-only and exempt from the phantom check.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as components from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const dts = readFileSync(join(here, 'index.d.ts'), 'utf8');

const declaredValues = new Set(
  [...dts.matchAll(/^export (?:function|const) ([A-Za-z0-9_$]+)/gm)].map((m) => m[1]),
);
const declaredAll = new Set([
  ...declaredValues,
  ...[...dts.matchAll(/^export (?:interface|type) ([A-Za-z0-9_$]+)/gm)].map((m) => m[1]),
]);
const runtimeExports = Object.keys(components).sort();

test('every runtime export has a declaration in index.d.ts', () => {
  const missing = runtimeExports.filter((name) => !declaredAll.has(name));
  assert.deepEqual(missing, []);
});

test('every value declared in index.d.ts is exported by src/index.js', () => {
  const phantom = [...declaredValues].filter((name) => !runtimeExports.includes(name));
  assert.deepEqual(phantom, []);
});
