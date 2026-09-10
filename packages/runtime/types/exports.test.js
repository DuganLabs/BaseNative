/**
 * Guards types/index.d.ts (and each subpath's own .d.ts) against drifting from
 * the actual module exports: every runtime export must have a declaration, and
 * no declaration may name a symbol the module does not export. Modelled on
 * packages/components/types/exports.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as runtime from '../src/index.js';
import * as escape from '../src/shared/escape.js';
import * as expression from '../src/shared/expression.js';
import * as directives from '../src/shared/directives.js';

const here = dirname(fileURLToPath(import.meta.url));

function declaredNames(relativeDtsPath) {
  const dts = readFileSync(join(here, relativeDtsPath), 'utf8');
  const names = new Set();
  for (const m of dts.matchAll(/^export\s+(?:declare\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)) {
    names.add(m[1]);
  }
  return names;
}

const modules = [
  { label: 'index.d.ts', dts: 'index.d.ts', moduleExports: runtime },
  { label: 'shared/escape.d.ts', dts: 'shared/escape.d.ts', moduleExports: escape },
  { label: 'shared/expression.d.ts', dts: 'shared/expression.d.ts', moduleExports: expression },
  { label: 'shared/directives.d.ts', dts: 'shared/directives.d.ts', moduleExports: directives },
];

for (const { label, dts, moduleExports } of modules) {
  test(`${label}: every runtime export has a declaration`, () => {
    const declared = declaredNames(dts);
    const actual = Object.keys(moduleExports).sort();
    const missing = actual.filter((name) => !declared.has(name));
    assert.deepEqual(missing, [], `${label} is missing declarations for: ${missing.join(', ')}`);
  });

  test(`${label}: every declaration names a real export`, () => {
    const declared = declaredNames(dts);
    const actual = Object.keys(moduleExports);
    const phantom = [...declared].filter((name) => !actual.includes(name));
    assert.deepEqual(phantom, [], `${label} declares symbols that are not exported: ${phantom.join(', ')}`);
  });
}

test('sanity: the main entry point re-exports raw but not isRaw/unwrapRaw', () => {
  assert.equal('raw' in runtime, true);
  assert.equal('isRaw' in runtime, false);
  assert.equal('unwrapRaw' in runtime, false);
  assert.equal('isRaw' in escape, true);
  assert.equal('unwrapRaw' in escape, true);
});
