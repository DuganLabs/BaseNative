const BUILTIN_DEFINITIONS = [
  {
    type: 'main',
    label: 'Page',
    category: 'layout',
    tag: 'main',
    container: true,
    defaultProps: {},
    inspectableProps: ['id', 'class'],
  },
  {
    type: 'section',
    label: 'Section',
    category: 'layout',
    tag: 'section',
    container: true,
    defaultProps: {},
    inspectableProps: ['id', 'class', 'aria-label'],
  },
  {
    type: 'article',
    label: 'Article',
    category: 'layout',
    tag: 'article',
    container: true,
    defaultProps: {},
    inspectableProps: ['id', 'class'],
  },
  {
    type: 'grid',
    label: 'Grid Container',
    category: 'layout',
    tag: 'div',
    container: true,
    defaultProps: {
      class: 'bn-grid',
      style: 'display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem;',
    },
    inspectableProps: ['class', 'style'],
  },
  {
    type: 'heading',
    label: 'Heading',
    category: 'text',
    tag: 'h2',
    container: false,
    defaultProps: { text: 'Heading' },
    inspectableProps: ['text', 'class', 'id'],
    textProp: 'text',
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    category: 'text',
    tag: 'p',
    container: false,
    defaultProps: { text: 'Paragraph text.' },
    inspectableProps: ['text', 'class'],
    textProp: 'text',
  },
  {
    type: 'button',
    label: 'Button',
    category: 'controls',
    tag: 'button',
    container: false,
    defaultProps: { text: 'Click me', type: 'button' },
    inspectableProps: ['text', 'type', 'class', 'aria-label'],
    inspectableEvents: ['click'],
    textProp: 'text',
  },
  {
    type: 'input',
    label: 'Text Input',
    category: 'forms',
    tag: 'input',
    container: false,
    selfClosing: true,
    defaultProps: { type: 'text', name: 'field', placeholder: '' },
    inspectableProps: ['type', 'name', 'placeholder', 'required', 'class'],
    inspectableBindings: ['value'],
    inspectableEvents: ['input', 'change'],
  },
  {
    type: 'textarea',
    label: 'Textarea',
    category: 'forms',
    tag: 'textarea',
    container: false,
    defaultProps: { name: 'field', rows: '4' },
    inspectableProps: ['name', 'rows', 'placeholder', 'class'],
    inspectableBindings: ['value'],
    inspectableEvents: ['input', 'change'],
  },
  {
    type: 'form',
    label: 'Form',
    category: 'forms',
    tag: 'form',
    container: true,
    defaultProps: { method: 'post', action: '' },
    inspectableProps: ['method', 'action', 'class'],
    inspectableEvents: ['submit'],
  },
  {
    type: 'label',
    label: 'Label',
    category: 'forms',
    tag: 'label',
    container: true,
    defaultProps: { text: 'Label' },
    inspectableProps: ['text', 'for', 'class'],
    textProp: 'text',
  },
];

export function createPalette() {
  const components = new Map();

  function register(component) {
    if (!component || !component.type) {
      throw new Error('register: component must have a type');
    }
    const def = {
      type: component.type,
      label: component.label || component.type,
      category: component.category || 'general',
      tag: component.tag || component.type,
      container: component.container !== false,
      selfClosing: component.selfClosing === true,
      defaultProps: { ...(component.defaultProps || {}) },
      inspectableProps: component.inspectableProps || [],
      inspectableBindings: component.inspectableBindings || [],
      inspectableEvents: component.inspectableEvents || [],
      textProp: component.textProp || null,
    };
    components.set(def.type, def);
    return def;
  }

  function unregister(type) {
    return components.delete(type);
  }

  function get(type) {
    return components.get(type) || null;
  }

  function has(type) {
    return components.has(type);
  }

  function list() {
    return Array.from(components.values());
  }

  function categories() {
    const map = new Map();
    for (const def of components.values()) {
      if (!map.has(def.category)) map.set(def.category, []);
      map.get(def.category).push(def);
    }
    return map;
  }

  function search(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return list();
    return list().filter(
      (c) =>
        c.type.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }

  return {
    register,
    unregister,
    get,
    has,
    list,
    categories,
    search,
  };
}

export function createDefaultPalette() {
  const palette = createPalette();
  for (const def of BUILTIN_DEFINITIONS) palette.register(def);
  return palette;
}

export { BUILTIN_DEFINITIONS };
