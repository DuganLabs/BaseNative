/**
 * Guards types/index.d.ts against drifting from the runtime modules.
 *
 * Every subpath in package.json points at this one declaration file, which is
 * the shape @basenative/favicon uses. That only works while the file actually
 * declares every value all five modules export — so: every runtime export has
 * a declaration, no declaration names a value nothing exports, and every path
 * the exports map promises exists on disk.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as index from '../src/index.js';
import * as contrast from '../src/contrast.js';
import * as audit from '../src/audit.js';
import * as css from '../src/css.js';
import * as icons from '../src/icons.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const dts = readFileSync(join(here, 'index.d.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

/** Every value any subpath exports, deduped. */
const runtimeExports = [
  ...new Set(
    [index, contrast, audit, css, icons].flatMap((mod) => Object.keys(mod))
  ),
].sort();

/** Every value index.d.ts declares — functions, classes and consts, not types. */
const declaredValues = new Set(
  [...dts.matchAll(/^export declare (?:function|class|const) ([A-Za-z0-9_$]+)/gm)].map(
    (m) => m[1]
  )
);

test('every runtime export is declared in index.d.ts', () => {
  const missing = runtimeExports.filter((name) => !declaredValues.has(name));
  assert.deepEqual(missing, []);
});

test('every value declared in index.d.ts is exported by some module', () => {
  const phantom = [...declaredValues].filter((name) => !runtimeExports.includes(name));
  assert.deepEqual(phantom, []);
});

test('sanity: the union spans every subpath, not just the root', () => {
  // A regex that silently matched nothing would pass the two tests above.
  assert.ok(runtimeExports.length > 30, `only ${runtimeExports.length} exports found`);
  assert.ok(declaredValues.size > 30, `only ${declaredValues.size} declarations found`);
  assert.ok(runtimeExports.includes('minifyCss'), 'css subpath');
  assert.ok(runtimeExports.includes('defineIconSet'), 'icons subpath');
  assert.ok(runtimeExports.includes('assertThemeContrast'), 'audit subpath');
  assert.ok(runtimeExports.includes('relativeLuminance'), 'contrast subpath');
  assert.ok(runtimeExports.includes('defineTheme'), 'root subpath');
});

test('every path the exports map promises exists', () => {
  const paths = [pkg.types];
  for (const entry of Object.values(pkg.exports)) {
    if (typeof entry === 'string') paths.push(entry);
    else paths.push(entry.types, entry.default);
  }
  for (const rel of paths) {
    assert.ok(rel, 'exports map entry has a path');
    assert.ok(existsSync(join(pkgRoot, rel)), `${rel} exists`);
  }
});

test('files[] ships both the source and the declarations', () => {
  assert.ok(pkg.files.includes('src'), 'src is published');
  assert.ok(pkg.files.includes('types'), 'types is published');
});

/**
 * `node --test` with an explicit file list runs exactly that list, so a test
 * file nobody named is a test file nobody runs — it stays green forever by
 * never executing. Both the npm script and the Nx target name every one.
 */
test('every test file in the package is named by the test script and the Nx target', () => {
  const onDisk = [
    ...readdirSync(join(pkgRoot, 'src'))
      .filter((f) => f.endsWith('.test.js'))
      .map((f) => `src/${f}`),
    ...readdirSync(here)
      .filter((f) => f.endsWith('.test.js'))
      .map((f) => `types/${f}`),
  ].sort();

  const project = JSON.parse(readFileSync(join(pkgRoot, 'project.json'), 'utf8'));
  const script = pkg.scripts.test;
  const target = project.targets.test.command;

  assert.ok(onDisk.length > 1, 'sanity: found test files on disk');
  for (const file of onDisk) {
    assert.ok(script.includes(file), `${file} is named by the npm test script`);
    assert.ok(target.includes(file), `${file} is named by the Nx test target`);
  }

  // And nothing named that does not exist, which would abort the whole run.
  for (const named of script.split(/\s+/).filter((a) => a.endsWith('.test.js'))) {
    assert.ok(onDisk.includes(named), `${named} is named but does not exist`);
  }
});
