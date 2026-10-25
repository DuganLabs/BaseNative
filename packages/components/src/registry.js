// @ts-check
/* The Holy Trinity registry.
   Components register themselves (name, root element, view-model factory,
   template, styles) and register their variants (name -> token re-points).
   Registration validates the rules mechanically: a component that breaks
   them cannot register. Consumers may register additional variants at
   startup; a registration may only re-point tokens to other global tokens. */

const TOKEN_KEY = /^--[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/;
const TOKEN_VALUE = /^var\(--[a-z][a-z0-9-_]*\)$/;
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
    if (!variants.has(def.name)) variants.set(def.name, new Map());
    return def;
  }

  function registerVariant(component, name, tokens) {
    if (!components.has(component)) {
      throw new TypeError(`registerVariant: component "${component}" is not registered — register it before its variants`);
    }
    for (const [key, value] of Object.entries(tokens ?? {})) {
      if (!TOKEN_KEY.test(key)) {
        throw new TypeError(`registerVariant: "${key}" does not match the token taxonomy --<block>-<property>(__<element>)(--<state>)`);
      }
      if (!TOKEN_VALUE.test(String(value).trim())) {
        throw new TypeError(`registerVariant: "${key}: ${value}" — a variant may only re-point a token to another global token`);
      }
    }
    const forComponent = variants.get(component);
    const existing = forComponent.get(name);
    if (existing && JSON.stringify(existing) !== JSON.stringify(tokens)) {
      throw new TypeError(`registerVariant: "${component}/${name}" is already registered with different tokens`);
    }
    forComponent.set(name, { ...tokens });
  }

  function resolveVariant(component, name) {
    const forComponent = variants.get(component);
    if (!forComponent?.has(name)) {
      const known = forComponent ? [...forComponent.keys()].join(', ') : 'none';
      throw new TypeError(`resolveVariant: "${component}/${name}" is not registered (registered: ${known})`);
    }
    return forComponent.get(name);
  }

  function listVariants(component) {
    return [...(variants.get(component)?.keys() ?? [])];
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

  function variantsCssFor(component) {
    const def = components.get(component);
    if (!def) {
      throw new TypeError(`variantsCssFor: component "${component}" is not registered`);
    }
    const rules = [];
    for (const variantName of listVariants(component).sort()) {
      const tokens = variants.get(component).get(variantName);
      const entries = Object.entries(tokens);
      if (entries.length === 0) continue;
      const body = entries.map(([key, value]) => `  ${key}: ${value};`).join('\n');
      rules.push(`${def.root}[variant="${variantName}"] {\n${body}\n}`);
    }
    return rules.join('\n\n');
  }

  /* The generated block that lives at the end of a component's styles.css:
     variant styles belong to the component, so the registry's rules for a
     component are spliced into its own sheet between these markers. */
  function variantsBlockFor(component) {
    const rules = variantsCssFor(component);
    return `/* @variants — generated from the registry, do not edit by hand */\n${rules ? `${rules}\n` : ''}/* @endvariants */`;
  }

  function spliceVariants(css, component) {
    const block = variantsBlockFor(component);
    const marked = /\/\* @variants[\s\S]*?\/\* @endvariants \*\//;
    if (marked.test(css)) return css.replace(marked, block);
    return `${css.replace(/\s+$/, '')}\n\n${block}\n`;
  }

  return { registerComponent, registerVariant, resolveVariant, listVariants, listComponents, getComponent, variantsCssFor, variantsBlockFor, spliceVariants };
}

/** The default registry instance, for apps that do not need isolation. */
export const registry = createRegistry();
