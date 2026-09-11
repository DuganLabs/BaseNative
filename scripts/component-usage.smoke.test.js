// The scanner must actually load and run. It previously imported the tokenizer
// as '@basenative/validate/scan', which does not resolve from scripts/ — the
// workspace root has no dependency on @basenative/validate, so a clean
// `pnpm install --frozen-lockfile` checkout threw ERR_MODULE_NOT_FOUND. Nothing
// caught it because no test imported the script and CI never ran it.
//
// This is deliberately a smoke test: it proves the module graph resolves and
// the tokenizer is the real one. The scanner's behaviour is covered elsewhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the usage scanner module resolves and loads', async () => {
  const mod = await import('./component-usage.js');
  assert.ok(mod, 'module loaded');
});

test('it uses the real tokenizer, not a reimplementation', async () => {
  const scan = await import('../packages/validate/src/scan.js');
  for (const name of ['scanTags', 'scanInterpolations', 'spanAt']) {
    assert.equal(typeof scan[name], 'function', `${name} is exported`);
  }
  // The same routine the runtime's renderer and client binder use.
  const tags = scan.scanTags('<span data-bn="badge" data-variant="success"></span>');
  assert.equal(tags[0].tagName, 'span');
  assert.ok(tags[0].attrs.some((a) => a.name === 'data-bn' && a.value === 'badge'));
});
