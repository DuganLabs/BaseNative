import { effect } from './signals.js';
import { evaluate, interpolate } from './evaluate.js';
import { hydrateChildren } from './hydrate.js';
import { registerCleanup } from './dom-lifecycle.js';
import { createChildContext } from './scope.js';

export function bindNode(node, ctx, options) {
  let processed = 0;

  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent;
    if (raw.includes('{{')) {
      const runner = effect(() => {
        node.textContent = interpolate(raw, ctx, options);
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
    return processed;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'TEMPLATE') return processed;

  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith('@')) {
      const event = attr.name.slice(1);
      const body = attr.value.trim();
      const handler = function($event) {
        const handlerCtx = createChildContext(ctx, {
          $el: this,
          $event,
        });
        evaluate(body, handlerCtx, options);
      };
      node.addEventListener(event, handler);
      registerCleanup(node, () => node.removeEventListener(event, handler));
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.name.startsWith(':')) {
      const attrName = attr.name.slice(1);
      const expr = attr.value;
      const runner = effect(() => {
        const result = evaluate(expr, ctx, options);
        if (result === false || result == null) node.removeAttribute(attrName);
        else node.setAttribute(attrName, result);
      });
      registerCleanup(node, () => runner.dispose?.());
      node.removeAttribute(attr.name);
      processed++;
    } else if (attr.value.includes('{{')) {
      const raw = attr.value;
      const name = attr.name;
      const runner = effect(() => {
        node.setAttribute(name, interpolate(raw, ctx, options));
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
  }
  processed += hydrateChildren(node, ctx, options);
  return processed;
}
