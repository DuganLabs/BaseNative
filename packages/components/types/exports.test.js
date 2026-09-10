/**
 * Guards types/index.d.ts against drifting from src/index.js: every runtime
 * export must have a declaration, no declaration may name a symbol the
 * package does not export, and every render* function whose source reads
 * `attrs` must declare it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as components from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');
const dts = readFileSync(join(here, 'index.d.ts'), 'utf8');

const declaredFunctions = new Set(
  [...dts.matchAll(/^export function ([A-Za-z0-9_$]+)/gm)].map((m) => m[1])
);
const runtimeExports = Object.keys(components).sort();

test('every runtime export has a function declaration in index.d.ts', () => {
  const missing = runtimeExports.filter((name) => !declaredFunctions.has(name));
  assert.deepEqual(missing, []);
});

test('every function declared in index.d.ts is exported by src/index.js', () => {
  const phantom = [...declaredFunctions].filter((name) => !runtimeExports.includes(name));
  assert.deepEqual(phantom, []);
});

test('every render* function whose source reads attrs declares attrs?: string', () => {
  const sourceAttrs = new Set();
  const files = readdirSync(srcDir).filter(
    (f) => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'index.js'
  );
  for (const file of files) {
    const src = readFileSync(join(srcDir, file), 'utf8');
    for (const m of src.matchAll(/export function (render[A-Za-z]+)\(options = \{\}\) \{([\s\S]*?)\n\}/g)) {
      if (/\battrs\b/.test(m[2])) sourceAttrs.add(m[1]);
    }
  }
  assert.ok(sourceAttrs.has('renderInput'), 'sanity: renderInput reads attrs');
  assert.ok(!sourceAttrs.has('renderSpinner'), 'sanity: renderSpinner does not read attrs');
  for (const name of sourceAttrs) {
    const decl = dts.match(new RegExp(`export function ${name}\\b[\\s\\S]*?\\): string;`));
    assert.ok(decl, `${name} is declared`);
    assert.match(decl[0], /\battrs\?: string;/, `${name} declares attrs`);
  }
});
