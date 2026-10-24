import { build } from 'esbuild';

// Task 1 (R-5, documented translation): react/react-dom stay external —
// bundling the CJS react-dom/server to ESM fails with
// "Dynamic require of 'util' is not supported".
await build({
  entryPoints: ['react/task1/catalog.jsx'],
  outfile: 'react/dist/task1.mjs',
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/*'],
});

// Task 2: bundle the app together with its own react-dom/client copy.
// The stdin entry re-exports createRoot and React from the SAME bundled
// copy the app uses, so the test never mixes two React instances.
await build({
  stdin: {
    contents: `export { App } from './task2/app.jsx';
export { createRoot } from 'react-dom/client';
export * as React from 'react';
`,
    resolveDir: new URL('.', import.meta.url).pathname,
    loader: 'js',
  },
  outfile: 'react/dist/task2.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
});
