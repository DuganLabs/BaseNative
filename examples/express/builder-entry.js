import '@basenative/builder';

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
