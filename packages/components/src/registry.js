// @ts-check
/* The Holy Trinity registry.
   Components register themselves (name, root element, view-model factory,
   template, styles) and register their variant NAMES. Registration
   validates the rules mechanically: a component that breaks them cannot
   register. A variant's styles are authored CSS in the component's own
   styles.css — JS never carries style values; registration reserves the
   (element, variant) address and lets the loader refuse unregistered
   tags. Consumers may register additional variant names at startup and
   style them from their own sheets. */

const LITERAL = /[0-9#]|rgb\(|hsl\(|url\(/;

/**
 * @param {string} html
 * @returns {void}
 */
export function validateTemplate(html) {
  if (/<\/?(div|span)\b/i.test(html)) {
    throw new TypeError('template: div and span are not semantic elements');
  }
  if (/\sclass\s*=/i.test(html)) {
    throw new TypeError('template: class attributes are not used; the element is the selector');
  }
  if (/\sdata-/i.test(html)) {
    throw new TypeError('template: data- attributes are not used; state lives in the view model');
  }
  const text = html
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (text !== '') {
    throw new TypeError(`template: literal text "${text.slice(0, 24)}" — all data is bound to the view model`);
  }
}

/**
 * @param {string} css
 * @returns {void}
 */
export function validateCss(css) {
  if (/\[data-/i.test(css)) {
    throw new TypeError('styles: data- selectors are not used');
  }
  if (/(^|[\s,{>+~])\.[a-z]/i.test(css)) {
    throw new TypeError('styles: class selectors are not used; the element is the selector');
  }
  const withoutCustomProps = css.replace(/--[a-z0-9-_]+\s*:\s*[^;{}]+;/g, '');
  const declarations = withoutCustomProps.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g);
  for (const [, property, rawValue] of declarations) {
    const value = rawValue.trim();
    if (!/var\(--/.test(value)) {
      throw new TypeError(`styles: "${property}: ${value}" is not token-only — every value comes from a global custom property`);
    }
    const rest = value.replace(/var\(--[a-z0-9-_]+\)/g, '').replace(/[,\s]+/g, ' ').trim();
    const restTokens = rest === '' ? [] : rest.split(' ');
    const bad = restTokens.find((token) => !/^[a-z-]+$/.test(token));
    if (LITERAL.test(rest) || bad) {
      throw new TypeError(`styles: "${property}: ${value}" is not token-only — every value comes from a global custom property`);
    }
  }
}

/** @typedef {ReturnType<typeof createRegistry>} Registry */

export function createRegistry() {
  /** @type {Map<string, object>} */
  const components = new Map();
  /** @type {Map<string, Map<string, object>>} */
  const variants = new Map();

  function registerComponent(def) {
    if (!def?.name || !def?.root || typeof def?.create !== 'function') {
      throw new TypeError('registerComponent: a component needs a name, a root element, and a create() view-model factory');
    }
    if (def.root === 'div' || def.root === 'span') {
      throw new TypeError(`registerComponent: "${def.root}" is not a semantic root element`);
    }
    if (typeof def.template === 'string') validateTemplate(def.template);
    if (typeof def.styles === 'string') validateCss(def.styles);
    const existing = components.get(def.name);
    if (existing && existing !== def) {
      throw new TypeError(`registerComponent: "${def.name}" is already registered with a different definition`);
    }
    components.set(def.name, def);
    if (!variants.has(def.name)) variants.set(def.name, new Set());
    return def;
  }

  function registerVariant(component, name) {
    if (!components.has(component)) {
      throw new TypeError(`registerVariant: component "${component}" is not registered — register it before its variants`);
    }
    // A (root element, variant) pair is a global address: two components
    // may share a root element only if their variant names never collide.
    const root = components.get(component).root;
    for (const [otherName, otherDef] of components) {
      if (otherName !== component && otherDef.root === root && variants.get(otherName)?.has(name)) {
        throw new TypeError(`registerVariant: "${root}[variant=\\"${name}\\"]" is already registered by "${otherName}" — the registration tag must identify one component`);
      }
    }
    variants.get(component).add(name);
  }

  function resolveVariant(component, name) {
    const forComponent = variants.get(component);
    if (!forComponent?.has(name)) {
      const known = forComponent ? [...forComponent].join(', ') : 'none';
      throw new TypeError(`resolveVariant: "${component}/${name}" is not registered (registered: ${known})`);
    }
    return name;
  }

  function listVariants(component) {
    return [...(variants.get(component) ?? [])];
  }

  function listComponents() {
    return [...components.keys()];
  }

  function getComponent(name) {
    const def = components.get(name);
    if (!def) {
      throw new TypeError(`registry: component "${name}" is not registered (registered: ${listComponents().join(', ') || 'none'})`);
    }
    return def;
  }

  return { registerComponent, registerVariant, resolveVariant, listVariants, listComponents, getComponent };
}

/** The default registry instance, for apps that do not need isolation. */
export const registry = createRegistry();
