import { effect } from './signals.js';
import { evaluate, interpolate } from './evaluate.js';
import { hydrateChildren } from './hydrate.js';

export function bindNode(node, ctx) {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent;
    if (raw.includes('{{')) effect(() => { node.textContent = interpolate(raw, ctx); });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'TEMPLATE') return;

  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith('@')) {
      const event = attr.name.slice(1);
      const body = attr.value;
      const keys = Object.keys(ctx);
      node.addEventListener(event, function($event) {
        const $el = this;
        new Function('$event', '$el', ...keys, body)($event, $el, ...keys.map(k => ctx[k]));
      });
      node.removeAttribute(attr.name);
    } else if (attr.name.startsWith(':')) {
      const attrName = attr.name.slice(1);
      const expr = attr.value;
      effect(() => {
        const result = evaluate(expr, ctx);
        if (result === false || result == null) node.removeAttribute(attrName);
        else node.setAttribute(attrName, result);
      });
      node.removeAttribute(attr.name);
    } else if (attr.value.includes('{{')) {
      const raw = attr.value, name = attr.name;
      effect(() => { node.setAttribute(name, interpolate(raw, ctx)); });
    }
  }
  hydrateChildren(node, ctx);
}
