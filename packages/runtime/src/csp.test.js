import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SOURCE_DIRS = [
  join(ROOT, 'packages', 'runtime', 'src'),
  join(ROOT, 'packages', 'server', 'src'),
];
const DISALLOWED = /\b(?:new\s+Function\b|eval\s*\(|setTimeout\s*\(\s*['"]|setInterval\s*\(\s*['"])/;

function listJavaScriptFiles(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const absolute = join(dir, name);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      entries.push(...listJavaScriptFiles(absolute));
    } else if (absolute.endsWith('.js') && !absolute.endsWith('.test.js')) {
      entries.push(absolute);
    }
  }
  return entries;
}

function stripNonExecutableText(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

const NO_REQUIRE = /\brequire\s*\(/;
const NO_CJS_GLOBALS = /\b(?:__dirname|__filename|module\.exports|exports\.)\b/;

describe('strict CSP compliance', () => {
  it('ships no eval-like sinks in runtime, server, or shared expression code', () => {
    const offenders = [];

    for (const dir of SOURCE_DIRS) {
      for (const file of listJavaScriptFiles(dir)) {
        const source = stripNonExecutableText(readFileSync(file, 'utf8'));
        if (DISALLOWED.test(source)) offenders.push(file);
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('source files contain no CommonJS require() calls', () => {
    const offenders = [];

    for (const dir of SOURCE_DIRS) {
      for (const file of listJavaScriptFiles(dir)) {
        const source = stripNonExecutableText(readFileSync(file, 'utf8'));
        if (NO_REQUIRE.test(source)) offenders.push(file);
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('source files contain no CommonJS globals (__dirname, module.exports, etc.)', () => {
    const offenders = [];

    for (const dir of SOURCE_DIRS) {
      for (const file of listJavaScriptFiles(dir)) {
        const source = readFileSync(file, 'utf8');
        if (NO_CJS_GLOBALS.test(source)) offenders.push(file);
      }
    }

    assert.deepEqual(offenders, []);
  });

  it('listJavaScriptFiles excludes test files', () => {
    const allFiles = SOURCE_DIRS.flatMap(listJavaScriptFiles);
    const testFiles = allFiles.filter(f => f.endsWith('.test.js'));
    assert.deepEqual(testFiles, []);
  });

  it('listJavaScriptFiles finds at least one source file per scanned directory', () => {
    for (const dir of SOURCE_DIRS) {
      const files = listJavaScriptFiles(dir);
      assert.ok(files.length > 0, `No source files found in ${dir}`);
    }
  });

  it('stripNonExecutableText removes block comments', () => {
    const input = '/* eval("bad") */ const x = 1;';
    const output = stripNonExecutableText(input);
    assert.ok(!output.includes('eval'));
    assert.ok(output.includes('const x = 1'));
  });

  it('stripNonExecutableText removes line comments', () => {
    const input = 'const x = 1; // eval("bad")';
    const output = stripNonExecutableText(input);
    assert.ok(!output.includes('eval'));
    assert.ok(output.includes('const x = 1'));
  });

  it('stripNonExecutableText replaces string literals', () => {
    const input = 'const s = "eval(bad)";';
    const output = stripNonExecutableText(input);
    assert.equal(output, 'const s = "";');
  });

  it('stripNonExecutableText replaces template literals', () => {
    const input = 'const t = `eval(bad)`;';
    const output = stripNonExecutableText(input);
    assert.equal(output, 'const t = ``;');
  });
});
