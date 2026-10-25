// Splices each component's registered variant rules into its own styles.css,
// inside a marked generated block at the end of the sheet. Variant styles
// belong to the component — there is no central variants file.
// Run: node packages/components/scripts/generate-variants.mjs
// The test suite checks the checked-in blocks against a fresh splice (drift).
import { readFile, writeFile } from 'node:fs/promises';
import { loadRegistry } from '../src/loader.js';

const registry = await loadRegistry();
for (const name of registry.listComponents()) {
  const path = new URL(`../src/${name}/styles.css`, import.meta.url);
  const css = await readFile(path, 'utf8');
  const next = registry.spliceVariants(css, name);
  if (next !== css) {
    await writeFile(path, next);
    console.log(`${name}/styles.css — variant block updated`);
  } else {
    console.log(`${name}/styles.css — variant block current`);
  }
}
