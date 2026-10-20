#!/usr/bin/env node
/**
 * Regenerates `src/tokens.css` from the token data.
 *
 *   node packages/ios/generate.js
 *
 * The stylesheet is a build artifact of `src/tokens.js` (through
 * `src/css.js`); this is the only sanctioned way to change it. `src/css.test.js`
 * fails when the committed sheet and the emitter's output disagree.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tokensCss } from './src/css.js';

const out = join(dirname(fileURLToPath(import.meta.url)), 'src', 'tokens.css');
writeFileSync(out, tokensCss());
console.log(`wrote ${out}`);
