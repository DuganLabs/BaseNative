import { effect } from './signals.js';
import { evaluate, interpolate } from './evaluate.js';
import { hydrateChildren } from './hydrate.js';
import { registerCleanup } from './dom-lifecycle.js';
import { createChildContext } from './scope.js';
import { isRaw, unwrapRaw, isUrlAttribute, sanitizeUrl } from './shared/escape.js';
import { getDirective } from './shared/directives.js';

export function bindNode(node, ctx, options) {
  let processed = 0;

  if (node.nodeType === Node.TEXT_NODE) {
    const source = node.textContent;
    if (source.includes('{{')) {
      const runner = effect(() => {
        // textContent never parses HTML, which is why the client was already safe.
        // interpolate() returns a raw-marked value only when every substitution in
        // the text was raw(); in that case match the server and parse it, otherwise
        // keep the safe path.
        const result = interpolate(source, ctx, options);
        if (isRaw(result)) node.innerHTML = unwrapRaw(result);
        else node.textContent = result;
      });
      registerCleanup(node, () => runner.dispose?.());
      processed++;
    }
    return processed;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'TEMPLATE') return processed;

  for (const attr of [...node.attributes]) {
    if (attr.name.startsWith('@')) {
      const directive = getDirective(attr.name.slice(1));
      if (directive?.on === 'element' && directive.client) {
        const value = attr.value;
        const runner = effect(() => {
          const result = directive.client(value, ctx, options);
          if (result === undefined) return;
          if (isRaw(result)) node.innerHTML = unwrapRaw(result);
          else node.textContent = result == null ? '' : String(result);
        });
        registerCleanup(node, () => runner.dispose?.());
        node.removeAttribute(attr.name);
        processed++;
        continue;
      }

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
        if (result === false || result == null) {
          node.removeAttribute(attrName);
          return;
        }
        const resolved = unwrapRaw(result);
        // Mirrors render.js: HTML escaping cannot neutralise a `javascript:` URL,
        // so URL attributes get a scheme guard on both sides. raw() does not exempt.
        if (isUrlAttribute(attrName) && sanitizeUrl(resolved) === null) {
          node.removeAttribute(attrName);
          return;
        }
        node.setAttribute(attrName, resolved);
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
