/* Hydrates each server-rendered custom select from the props the server
   wrote beside it: the select's own view model and template, so it opens,
   chooses and submits (its hidden input) like everywhere else. */
import { hydrate } from '@basenative/runtime';
import { select } from '/bn-css/select/index.js';

const open = new Set();

document.addEventListener('pointerdown', (event) => {
  for (const { host, vm } of open) if (!host.contains(event.target)) vm.close();
});

const markup = fetch('/bn-css/select/index.html')
  .then((response) => response.text())
  .then((text) => text.replace(/^\s*<template>/, '').replace(/<\/template>\s*$/, ''));

for (const host of document.querySelectorAll('[data-bn-select-host]')) {
  const props = JSON.parse(host.querySelector('script[type="application/json"]').textContent);
  const vm = select.create(props);
  markup.then((html) => {
    host.innerHTML = html;
    hydrate(host, vm);
    open.add({ host, vm });
  });
}
