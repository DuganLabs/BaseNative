import { effect } from './signals.js';
import { evaluate, interpolate } from './evaluate.js';
import { hydrateChildren } from './hydrate.js';
import { registerCleanup } from './dom-lifecycle.js';
import { createChildContext } from './scope.js';
import { isRaw, unwrapRaw, isUrlAttribute, sanitizeUrl, mergeClass } from './shared/escape.js';
import { getDirective } from './shared/directives.js';

// Attribute bindings write attributes, but two form-control bindings also
// need the matching IDL property kept in sync. setAttribute('value', ...)
// only changes an input's *default* value: once a user has typed in the
// field, signal updates (e.g. clearing the model after a submit) never
// reach the visible value. A checkbox's checkedness has the same split.
// Mirror those two onto the property; every other binding stays
// attribute-only, exactly as render.js writes it on the server.
function syncFormControlProperty(node, attrName, result) {
  if (attrName === 'value' && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT')) {
    const value = result === false || result == null ? '' : String(result);
    if (node.value !== value) node.value = value;
  } else if (attrName === 'checked' && node.tagName === 'INPUT') {
    node.checked = !(result === false || result == null || result === 'false');
  }
}

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
      // Snapshot before the effect removes `:class`. A later run must keep
      // the literal class, not whatever a previous merge wrote back.
      const staticClass = attrName === 'class' ? node.getAttribute('class') : null;
      const runner = effect(() => {
        const result = evaluate(expr, ctx, options);
        if (attrName === 'class') {
          const merged = mergeClass(staticClass, result);
          if (merged) node.setAttribute('class', merged);
          else node.removeAttribute('class');
          return;
        }
        if (result === false || result == null) {
          node.removeAttribute(attrName);
          syncFormControlProperty(node, attrName, result);
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
        syncFormControlProperty(node, attrName, resolved);
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
