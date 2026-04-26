// Built with BaseNative — basenative.dev
import { signal, effect } from '@basenative/runtime';

const count = signal(0);

effect(() => {
  const el = document.querySelector('[data-count]');
  if (el) el.textContent = String(count());
});

document.querySelector('[data-inc]')?.addEventListener('click', () => {
  count(count() + 1);
});
