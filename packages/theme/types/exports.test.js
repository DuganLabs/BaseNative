/**
 * Guards the declaration files against drifting from the runtime modules.
 *
 * Every JavaScript subpath in package.json has its own declaration file, and
 * that file must declare exactly the values its subpath exports: no export
 * without a declaration, and no declaration for a value that subpath does not
 * export (a consumer would get a clean type-check and a runtime failure). Every
 * path the exports map promises must exist on disk.
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
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));

/** subpath -> the runtime module that backs it. */
const modules = {
  '.': index,
  './contrast': contrast,
  './audit': audit,
  './css': css,
  './icons': icons,
};

/**
 * Every value a declaration file exports — functions, classes and consts, plus
 * names re-exported with `export { a, b } from '...'`, not types.
 */
function declaredValues(file) {
  const dts = readFileSync(join(pkgRoot, file), 'utf8');
  const direct = [...dts.matchAll(/^export declare (?:function|class|const) ([A-Za-z0-9_$]+)/gm)].map(
    (m) => m[1]
  );
  const reexported = [...dts.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((m) =>
    m[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
  );
  return [...direct, ...reexported].sort();
}

for (const [subpath, mod] of Object.entries(modules)) {
  const entry = pkg.exports[subpath];
  const runtime = Object.keys(mod).sort();
  const declared = declaredValues(entry.types);

  test(`${subpath}: every runtime export is declared in ${entry.types}`, () => {
    assert.deepEqual(
      runtime.filter((name) => !declared.includes(name)),
      []
    );
  });

  test(`${subpath}: ${entry.types} declares nothing the subpath does not export`, () => {
    assert.deepEqual(
      declared.filter((name) => !runtime.includes(name)),
      []
    );
  });

  test(`${subpath}: sanity, the comparison is not vacuous`, () => {
    // A regex that silently matched nothing would pass the two tests above.
    assert.ok(runtime.length > 0, `${subpath} exports nothing`);
    assert.ok(declared.length > 0, `${entry.types} declares nothing`);
  });
}

test('each subpath has its own declaration file', () => {
  const files = Object.keys(modules).map((subpath) => pkg.exports[subpath].types);
  assert.equal(new Set(files).size, files.length, 'two subpaths share a declaration file');
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
