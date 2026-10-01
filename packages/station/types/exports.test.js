/**
 * Guards the declaration files against drifting from the runtime modules.
 *
 * Every JavaScript subpath in package.json has a `types` condition, and the
 * file it names must declare exactly the values that subpath exports at
 * runtime: no export without a declaration, and no declaration for a value the
 * subpath does not export (a consumer would get a clean type-check and a
 * runtime failure). Only values are compared (functions, classes, consts and
 * re-exported names), not interfaces or type aliases.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

/** Every value a declaration file exports, following `export * from`. */
function declaredValues(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  const dts = readFileSync(file, 'utf8');
  const names = [];
  for (const m of dts.matchAll(
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|enum)\s+([A-Za-z0-9_$]+)/gm
  )) {
    names.push(m[1]);
  }
  for (const m of dts.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const spec = part.trim();
      if (!spec || /^type\s/.test(spec)) continue;
      names.push(spec.split(/\s+as\s+/).pop().trim());
    }
  }
  if (/^export\s+default\s/m.test(dts)) names.push('default');
  for (const m of dts.matchAll(/^export\s*\*\s*as\s+([A-Za-z0-9_$]+)\s+from/gm)) names.push(m[1]);
  for (const m of dts.matchAll(/^export\s*\*\s*from\s*'([^']+)'/gm)) {
    const target = join(dirname(file), m[1].replace(/\.js$/, '.d.ts'));
    names.push(...declaredValues(target, seen));
  }
  return [...new Set(names)].sort();
}

const subpaths = Object.entries(pkg.exports).filter(
  ([, entry]) => typeof entry === 'object' && entry.types && /\.m?js$/.test(entry.default)
);

test('sanity: the package has JavaScript subpaths to compare', () => {
  assert.ok(subpaths.length > 0, 'no subpath with a types condition and a JavaScript target');
});

for (const [subpath, entry] of subpaths) {
  test(`${subpath}: ${entry.types} declares exactly what ${entry.default} exports`, async () => {
    assert.ok(existsSync(join(pkgRoot, entry.types)), `${entry.types} exists`);
    const runtime = Object.keys(await import(pathToFileURL(join(pkgRoot, entry.default)).href)).sort();
    const declared = declaredValues(join(pkgRoot, entry.types));
    assert.ok(runtime.length > 0, `${subpath} exports nothing`);
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
}
