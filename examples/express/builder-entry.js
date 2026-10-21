// Named import, referenced below on purpose: a bare
// `import '@basenative/builder'` is tree-shaken away by esbuild in
// this workspace (the package's sideEffects array is not honored
// through the pnpm symlink), which silently produced a bundle with
// the shim only and no <bn-builder> registration — the /builder
// page rendered empty. Keep the binding used.
import { BnBuilder } from '@basenative/builder';

if (typeof window !== 'undefined') window.__BnBuilder = BnBuilder;

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

ready(() => {
  const builder = document.querySelector('[data-bn-builder-root]');
  const panel = document.querySelector('[data-bn-builder-export-panel]');
  const output = document.querySelector('[data-bn-builder-export-output] code');
  if (!builder || !panel || !output) return;

  builder.addEventListener('bn-builder-export', (event) => {
    panel.hidden = false;
    output.textContent = event.detail?.code ?? '';
  });
});
