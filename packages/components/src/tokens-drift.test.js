// The generated tokens.css must be byte-identical to a fresh render of the
// DTCG token source in tokens/. If this fails, run:
//   node scripts/build-tokens.mjs
// and commit the result — never edit src/tokens.css by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildTokensCss, TOKENS_CSS_PATH } from '../scripts/build-tokens.mjs';

test('tokens.css is in sync with the DTCG token source', async () => {
  const [generated, onDisk] = await Promise.all([buildTokensCss(), readFile(TOKENS_CSS_PATH, 'utf8')]);
  assert.equal(onDisk, generated, 'src/tokens.css is stale: run node scripts/build-tokens.mjs');
});
