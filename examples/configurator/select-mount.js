/**
 * Select mount — the configurator's pickers are the design system's
 * custom select (the default everywhere; the platform <select> is the
 * select's opt-in "native" variant).
 *
 * Each `[data-bn-select="<picker>"]` host gets the select's own template
 * and view model, built from `pickers[<picker>](host)`. Hosts the page's
 * `@for` adds later (window rows) mount as they appear. The trigger is
 * named by its row label and its current choice.
 *
 * @module select-mount
 */

import { hydrate } from '@basenative/runtime';
import { select } from '../../packages/components/src/select/index.js';

const markup = fetch(new URL('../../packages/components/src/select/index.html', import.meta.url))
  .then((response) => response.text())
  .then((text) => text.replace(/^\s*<template>/, '').replace(/<\/template>\s*$/, ''));

/**
 * @param {Element} root
 * @param {Record<string, (host: HTMLElement) => import('../../packages/components/src/select/index.js').SelectProps>} pickers
 */
export function mountSelects(root, pickers) {
  /** @type {Map<HTMLElement, { close: () => void }>} */
  const mounted = new Map();

  /* A press outside an open list closes it, as a menu does. */
  document.addEventListener('pointerdown', (event) => {
    for (const [host, vm] of mounted) {
      if (!host.isConnected) mounted.delete(host);
      else if (!host.contains(/** @type {Node} */ (event.target))) vm.close();
    }
  });

  /** @param {HTMLElement} host */
  async function mount(host) {
    if (mounted.has(host) || host.dataset.bnMounted) return;
    const props = pickers[host.dataset.bnSelect]?.(host);
    if (!props) return;
    host.dataset.bnMounted = 'true';
    const label = host.closest('[data-bn="picker"]')?.querySelector('[data-bn="picker-label"]');
    if (label && !label.id) label.id = `${props.id}-label`;
    const vm = select.create({ ...props, label: label?.textContent.trim() });
    mounted.set(host, vm);
    host.innerHTML = await markup;
    hydrate(host, vm);
    const trigger = host.querySelector('button[aria-haspopup="listbox"]');
    if (trigger && label) trigger.setAttribute('aria-labelledby', `${label.id} ${trigger.id}`);
  }

  const scan = () =>
    root
      .querySelectorAll('[data-bn-select]')
      .forEach((host) => mount(/** @type {HTMLElement} */ (host)));
  new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  scan();
}
