import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as index from './index.js';
import * as tokens from './tokens.js';
import * as css from './css.js';

test('the index re-exports the tokens and css surfaces, nothing more', () => {
  assert.deepEqual(Object.keys(index).sort(), [...Object.keys(tokens), ...Object.keys(css)].sort());
  for (const [key, value] of Object.entries(tokens)) assert.equal(index[key], value);
  assert.equal(index.tokensCss, css.tokensCss);
});
