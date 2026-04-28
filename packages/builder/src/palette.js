export function createPalette() {
  const map = new Map();

  function register(spec) {
    if (!spec || !spec.type) {
      throw new Error('Component definition requires a "type"');
    }
    const def = {
      type: spec.type,
      label: spec.label || spec.type,
      category: spec.category || 'general',
      tag: spec.tag || spec.type,
      container: Boolean(spec.container),
      props: Array.isArray(spec.props) ? spec.props.slice() : [],
      defaults: spec.defaults ? { ...spec.defaults } : {},
      defaultContent: spec.defaultContent,
      role: spec.role,
    };
    map.set(def.type, def);
    return def;
  }

  function unregister(type) {
    return map.delete(type);
  }

  function get(type) {
    return map.get(type) || null;
  }

  function list() {
    return Array.from(map.values());
  }

  function byCategory(category) {
    return list().filter((d) => d.category === category);
  }

  function categories() {
    const set = new Set();
    for (const def of map.values()) set.add(def.category);
    return Array.from(set);
  }

  function search(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return list();
    return list().filter((d) =>
      d.type.toLowerCase().includes(q)
      || d.label.toLowerCase().includes(q)
      || d.category.toLowerCase().includes(q)
    );
  }

  return { register, unregister, get, list, byCategory, categories, search };
}

export function defaultPalette() {
  const palette = createPalette();

  palette.register({
    type: 'section',
    label: 'Section',
    category: 'layout',
    tag: 'section',
    container: true,
    role: 'region',
    props: [
      { name: 'aria-label', kind: 'string', label: 'Label' },
      { name: 'class', kind: 'string', label: 'Class' },
    ],
    defaults: { class: 'bn-section' },
  });

  palette.register({
    type: 'stack',
    label: 'Stack',
    category: 'layout',
    tag: 'div',
    container: true,
    props: [
      { name: 'direction', kind: 'enum', options: ['row', 'column'], default: 'column', label: 'Direction' },
      { name: 'gap', kind: 'string', default: '1rem', label: 'Gap' },
      { name: 'class', kind: 'string', label: 'Class' },
    ],
    defaults: { direction: 'column', gap: '1rem', class: 'bn-stack' },
  });

  palette.register({
    type: 'grid',
    label: 'Grid',
    category: 'layout',
    tag: 'div',
    container: true,
    props: [
      { name: 'columns', kind: 'number', default: 12, label: 'Columns' },
      { name: 'gap', kind: 'string', default: '1rem', label: 'Gap' },
      { name: 'class', kind: 'string', label: 'Class' },
    ],
    defaults: { columns: 12, gap: '1rem', class: 'bn-grid' },
  });

  palette.register({
    type: 'heading',
    label: 'Heading',
    category: 'text',
    tag: 'h2',
    container: false,
    props: [
      { name: 'level', kind: 'enum', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], default: 'h2', label: 'Level' },
      { name: 'text', kind: 'string', label: 'Text' },
    ],
    defaults: { level: 'h2', text: 'Heading' },
  });

  palette.register({
    type: 'text',
    label: 'Text',
    category: 'text',
    tag: 'p',
    container: false,
    props: [
      { name: 'text', kind: 'string', label: 'Text' },
    ],
    defaults: { text: 'Lorem ipsum.' },
  });

  palette.register({
    type: 'button',
    label: 'Button',
    category: 'inputs',
    tag: 'button',
    container: false,
    props: [
      { name: 'text', kind: 'string', label: 'Label' },
      { name: 'variant', kind: 'enum', options: ['primary', 'secondary', 'ghost', 'destructive'], default: 'primary', label: 'Variant' },
      { name: 'type', kind: 'enum', options: ['button', 'submit', 'reset'], default: 'button', label: 'Type' },
      { name: 'disabled', kind: 'boolean', default: false, label: 'Disabled' },
    ],
    defaults: { text: 'Click me', variant: 'primary', type: 'button' },
  });

  palette.register({
    type: 'input',
    label: 'Input',
    category: 'inputs',
    tag: 'input',
    container: false,
    props: [
      { name: 'type', kind: 'enum', options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'], default: 'text', label: 'Type' },
      { name: 'name', kind: 'string', label: 'Name' },
      { name: 'placeholder', kind: 'string', label: 'Placeholder' },
      { name: 'value', kind: 'signal', label: 'Bound value' },
      { name: 'required', kind: 'boolean', default: false, label: 'Required' },
    ],
    defaults: { type: 'text' },
  });

  palette.register({
    type: 'textarea',
    label: 'Textarea',
    category: 'inputs',
    tag: 'textarea',
    container: false,
    props: [
      { name: 'name', kind: 'string', label: 'Name' },
      { name: 'placeholder', kind: 'string', label: 'Placeholder' },
      { name: 'rows', kind: 'number', default: 4, label: 'Rows' },
      { name: 'value', kind: 'signal', label: 'Bound value' },
    ],
    defaults: { rows: 4 },
  });

  palette.register({
    type: 'checkbox',
    label: 'Checkbox',
    category: 'inputs',
    tag: 'input',
    container: false,
    props: [
      { name: 'name', kind: 'string', label: 'Name' },
      { name: 'label', kind: 'string', label: 'Label' },
      { name: 'checked', kind: 'signal', label: 'Bound state' },
    ],
    defaults: { type: 'checkbox' },
  });

  palette.register({
    type: 'label',
    label: 'Label',
    category: 'inputs',
    tag: 'label',
    container: true,
    props: [
      { name: 'for', kind: 'string', label: 'For' },
      { name: 'text', kind: 'string', label: 'Text' },
    ],
    defaults: { text: 'Label' },
  });

  palette.register({
    type: 'form',
    label: 'Form',
    category: 'inputs',
    tag: 'form',
    container: true,
    props: [
      { name: 'action', kind: 'string', label: 'Action' },
      { name: 'method', kind: 'enum', options: ['get', 'post'], default: 'post', label: 'Method' },
    ],
    defaults: { method: 'post' },
  });

  palette.register({
    type: 'link',
    label: 'Link',
    category: 'navigation',
    tag: 'a',
    container: false,
    props: [
      { name: 'href', kind: 'string', label: 'URL' },
      { name: 'text', kind: 'string', label: 'Text' },
      { name: 'target', kind: 'enum', options: ['', '_blank', '_self'], default: '', label: 'Target' },
    ],
    defaults: { href: '#', text: 'Link' },
  });

  palette.register({
    type: 'image',
    label: 'Image',
    category: 'media',
    tag: 'img',
    container: false,
    props: [
      { name: 'src', kind: 'string', label: 'Source' },
      { name: 'alt', kind: 'string', label: 'Alt text' },
      { name: 'width', kind: 'number', label: 'Width' },
      { name: 'height', kind: 'number', label: 'Height' },
    ],
    defaults: { src: '', alt: '' },
  });

  palette.register({
    type: 'signal-text',
    label: 'Signal Text',
    category: 'reactive',
    tag: 'span',
    container: false,
    props: [
      { name: 'value', kind: 'signal', label: 'Bound expression' },
    ],
    defaults: {},
  });

  return palette;
}
