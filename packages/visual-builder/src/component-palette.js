/**
 * createComponentPalette() - Creates a palette of available components
 * @returns {ComponentPalette}
 */
export function createComponentPalette() {
  /** @type {Map<string, import('../types/index.d.ts').ComponentDefinition>} */
  const components = new Map();

  function register(component) {
    if (!component.type) {
      throw new Error('Component must have a type');
    }
    const def = {
      type: component.type,
      label: component.label || component.type,
      category: component.category || 'general',
      defaultProps: component.defaultProps || {},
      icon: component.icon || null,
    };
    components.set(def.type, def);
    return def;
  }

  function getAll() {
    return Array.from(components.values());
  }

  function getByCategory(category) {
    return getAll().filter((c) => c.category === category);
  }

  function search(query) {
    const q = query.toLowerCase();
    return getAll().filter(
      (c) =>
        c.type.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }

  function getComponent(type) {
    return components.get(type) || null;
  }

  return {
    register,
    getAll,
    getByCategory,
    search,
    getComponent,
  };
}
