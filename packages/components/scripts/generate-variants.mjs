// Generates src/variants.css from the registry.
// Run: node packages/components/scripts/generate-variants.mjs
// CI checks the checked-in file against a fresh generation (drift check).
import { writeFile } from 'node:fs/promises';
import { loadRegistry } from '../src/loader.js';

const registry = await loadRegistry();
const header = '/* Generated from the component registry by scripts/generate-variants.mjs.\n   Do not edit by hand — register variants in each component\'s index.js. */\n\n';
await writeFile(new URL('../src/variants.css', import.meta.url), header + registry.variantsCss() + '\n');
console.log('src/variants.css regenerated from the registry');
