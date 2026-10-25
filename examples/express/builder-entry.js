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
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const copy = document.querySelector('[data-bn-builder-export-copy]');
  if (copy) {
    copy.addEventListener('click', async () => {
      const code = output.textContent ?? '';
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(output);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      const original = copy.textContent;
      copy.textContent = 'Copied';
      setTimeout(() => {
        copy.textContent = original;
      }, 1600);
    });
  }
});
