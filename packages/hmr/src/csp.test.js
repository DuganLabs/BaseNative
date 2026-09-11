import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Mirrors packages/runtime/src/csp.test.js. The HMR client runs inside the same
// page as the runtime, under the same `script-src 'self'` policy documented in
// docs/guides/security.md, so it is held to the same bar: nothing here may need
// 'unsafe-inline' or 'unsafe-eval' to run.

const SRC = join(import.meta.dirname);
const DISALLOWED =
  /\b(?:new\s+Function\b|eval\s*\(|setTimeout\s*\(\s*['"]|setInterval\s*\(\s*['"])/;
const NO_REQUIRE = /\brequire\s*\(/;
const NO_CJS_GLOBALS = /\b(?:__dirname|__filename|module\.exports|exports\.)\b/;

/** Files served to the browser: these must not import anything Node-only. */
const BROWSER_MODULES = ['client.js', 'patch.js', 'preserve.js', 'protocol.js'];

function listJavaScriptFiles(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const absolute = join(dir, name);
    if (statSync(absolute).isDirectory()) entries.push(...listJavaScriptFiles(absolute));
    else if (absolute.endsWith('.js') && !absolute.endsWith('.test.js')) entries.push(absolute);
  }
  return entries;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function stripNonExecutableText(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

describe('strict CSP compliance', () => {
  it('ships no eval-like sinks', () => {
    const offenders = listJavaScriptFiles(SRC).filter((file) =>
      DISALLOWED.test(stripNonExecutableText(readFileSync(file, 'utf8')))
    );
    assert.deepEqual(offenders, []);
  });

  it('contains no CommonJS require() calls', () => {
    const offenders = listJavaScriptFiles(SRC).filter((file) =>
      NO_REQUIRE.test(stripNonExecutableText(readFileSync(file, 'utf8')))
    );
    assert.deepEqual(offenders, []);
  });

  it('contains no CommonJS globals', () => {
    const offenders = listJavaScriptFiles(SRC).filter((file) =>
      NO_CJS_GLOBALS.test(readFileSync(file, 'utf8'))
    );
    assert.deepEqual(offenders, []);
  });

  it('emits no inline event handler attributes anywhere', () => {
    const offenders = listJavaScriptFiles(SRC).filter((file) =>
      /<[a-z]+[^>]*\son(?:click|load|error|submit|change|input)\s*=/i.test(readFileSync(file, 'utf8'))
    );
    assert.deepEqual(offenders, []);
  });

  it('emits no inline <script> body — only an external src tag', () => {
    for (const file of listJavaScriptFiles(SRC)) {
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(/<script\b([^>]*)>/gi)) {
        assert.match(match[1], /\ssrc\b/, `${file} emits a <script> with no src`);
      }
    }
  });

  it('never emits a javascript: URL', () => {
    const offenders = listJavaScriptFiles(SRC).filter((file) =>
      /javascript\s*:/i.test(readFileSync(file, 'utf8'))
    );
    assert.deepEqual(offenders, []);
  });
});

describe('the browser half stays browser-only', () => {
  it('imports no node: builtins', () => {
    for (const name of BROWSER_MODULES) {
      const source = readFileSync(join(SRC, name), 'utf8');
      assert.ok(
        !/^\s*import[^\n]*['"]node:/m.test(source),
        `${name} is served to the browser and must not import a node: builtin`
      );
    }
  });

  it('only imports other browser modules', () => {
    for (const name of BROWSER_MODULES) {
      const source = readFileSync(join(SRC, name), 'utf8');
      for (const match of source.matchAll(/^\s*import[^\n]*from\s+'\.\/([^']+)'/gm)) {
        assert.ok(
          BROWSER_MODULES.includes(match[1]),
          `${name} imports ./${match[1]}, which is not served to the browser`
        );
      }
    }
  });
});

describe('test registration', () => {
  it('lists every src/*.test.js in the package.json test script', () => {
    const pkg = JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8'));
    const script = pkg.scripts?.test ?? '';
    const missing = readdirSync(SRC)
      .filter((name) => name.endsWith('.test.js'))
      .filter((name) => !script.includes(`src/${name}`));

    assert.deepEqual(missing, [], 'a test file absent from `npm test` silently never runs');
  });
});
