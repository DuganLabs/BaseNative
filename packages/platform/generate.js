/**
 * Write src/tokens.css and src/kit.js from data/tokens.json.
 * Run from this package: `node generate.js`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tokensCss } from './src/emit.js';

const root = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(root, 'data/tokens.json'), 'utf8'));
writeFileSync(join(root, 'src/tokens.css'), tokensCss(spec));
writeFileSync(
  join(root, 'src/kit.js'),
  `/** Generated from data/tokens.json. Do not edit. Run \`node generate.js\`. */\nexport const kit = ${JSON.stringify(spec)};\n`,
);
console.log('wrote src/tokens.css and src/kit.js');
