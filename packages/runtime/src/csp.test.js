import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SOURCE_DIRS = [
  join(ROOT, 'packages', 'runtime', 'src'),
  join(ROOT, 'packages', 'server', 'src'),
  join(ROOT, 'src', 'shared'),
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
});
