/**
 * Guards the declaration files against drifting from the runtime modules.
 *
 * Every JavaScript subpath in package.json has a declaration file, and that
 * file must declare exactly the values its subpath exports at runtime: no
 * export without a declaration, and no declaration for a value the subpath does
 * not export (a consumer would get a clean type-check and a runtime failure).
 * Types and interfaces are not compared; only value exports exist at runtime.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

/** Every value a declaration file exports: functions, classes, consts and re-exported names. */
function declaredValues(file) {
  const dts = readFileSync(join(pkgRoot, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
  assert.ok(!/^export\s*\*/m.test(dts), `${file} uses export *, which this test cannot enumerate`);
  const names = new Set();
  for (const m of dts.matchAll(/^export\s+(?:declare\s+)?(?:const\s+enum|enum|function|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm)) {
    names.add(m[1]);
  }
  for (const m of dts.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const spec of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (/^type\s/.test(spec)) continue;
      names.add(spec.split(/\s+as\s+/).pop());
    }
  }
  if (/^export\s+default\s/m.test(dts)) names.add('default');
  return [...names].sort();
}

/** subpath -> { types, default } for every export that has a declaration. */
const subpaths = Object.entries(pkg.exports).filter(
  ([, entry]) => entry && typeof entry === 'object' && entry.types
);

assert.ok(subpaths.length > 0, 'package.json exports no subpath with a types condition');

for (const [subpath, entry] of subpaths) {
  const declared = declaredValues(entry.types);
  const runtime = Object.keys(await import(pathToFileURL(join(pkgRoot, entry.default)).href)).sort();

  test(`${subpath}: ${entry.types} declares exactly the values ${entry.default} exports`, () => {
    assert.deepEqual(
      runtime.filter((name) => !declared.includes(name)),
      [],
      'exported at runtime but not declared'
    );
    assert.deepEqual(
      declared.filter((name) => !runtime.includes(name)),
      [],
      'declared but not exported at runtime'
    );
  });

  test(`${subpath}: the comparison is not vacuous`, () => {
    // A parser that silently matched nothing would pass the test above.
    assert.ok(runtime.length > 0, `${subpath} exports nothing at runtime`);
    assert.ok(declared.length > 0, `${entry.types} declares no values`);
  });

  test(`${subpath}: types is listed first and both files exist`, () => {
    assert.equal(Object.keys(entry)[0], 'types', 'the types condition must come first');
    assert.ok(existsSync(join(pkgRoot, entry.types)), `${entry.types} exists`);
    assert.ok(existsSync(join(pkgRoot, entry.default)), `${entry.default} exists`);
  });
}

test('each subpath has its own declaration file', () => {
  // A shared file would make the per-subpath comparison above meaningless.
  const files = subpaths.map(([, entry]) => entry.types);
  assert.equal(new Set(files).size, files.length, 'two subpaths share a declaration file');
});
