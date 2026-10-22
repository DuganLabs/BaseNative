import { escapeHtml } from './escape.js';

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
      bn: spec.bn,
      dataProps: Array.isArray(spec.dataProps) ? spec.dataProps.slice() : [],
      preview: typeof spec.preview === 'function' ? spec.preview : null,
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
    const q = String(query || '')
      .toLowerCase()
      .trim();
    if (!q) return list();
    return list().filter(
      (d) =>
        d.type.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }

  return { register, unregister, get, list, byCategory, categories, search };
}

function registerOrganisms(palette) {
  const text = (props, fallback) => escapeHtml(props?.text || fallback);

  palette.register({
    type: 'hero',
    label: 'Hero',
    category: 'organisms',
    tag: 'header',
    bn: 'bn-hero',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Title' },
    preview(props) {
      return `<p data-bn="bn-hero-eyebrow">Organism</p><h2>${text(props, 'Title')}</h2><p data-bn="bn-hero-lede">Glass header. Actions sit under the copy.</p>`;
    },
  });

  palette.register({
    type: 'list',
    label: 'List',
    category: 'organisms',
    tag: 'ul',
    bn: 'bn-list',
    container: true,
    props: [
      { name: 'text', kind: 'string', label: 'First row' },
      {
        name: 'data-grouped',
        kind: 'enum',
        options: ['true', 'false'],
        default: 'true',
        label: 'Grouped',
      },
    ],
    defaults: { text: 'Inbox', 'data-grouped': 'true' },
    preview(props) {
      return `<li data-bn="bn-list-row"><p data-bn="bn-list-title">${text(props, 'Inbox')}</p><p data-bn="bn-list-detail">Grouped row</p></li><li data-bn="bn-list-row"><p data-bn="bn-list-title">Drafts</p><p data-bn="bn-list-detail">Second row</p></li>`;
    },
  });

  palette.register({
    type: 'window',
    label: 'Window',
    category: 'organisms',
    tag: 'section',
    bn: 'bn-window',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Untitled' },
    preview(props) {
      return `<header data-bn="bn-window-titlebar"><h2>${text(props, 'Untitled')}</h2></header><section data-bn="bn-window-body"><p>Window body</p></section>`;
    },
  });

  palette.register({
    type: 'sheet',
    label: 'Sheet',
    category: 'organisms',
    tag: 'section',
    bn: 'bn-sheet',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Sheet' },
    preview(props) {
      return `<header><h2 data-bn="bn-sheet-title">${text(props, 'Sheet')}</h2></header><section data-bn="bn-sheet-body"><p>Sheet body</p></section>`;
    },
  });

  palette.register({
    type: 'sidebar',
    label: 'Sidebar',
    category: 'organisms',
    tag: 'aside',
    bn: 'bn-sidebar',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Section' }],
    defaults: { text: 'Library' },
    preview(props) {
      return `<nav aria-label="Sidebar"><h2>${text(props, 'Library')}</h2><ul><li><a href="#" aria-current="page">Recents</a></li><li><a href="#">Shared</a></li></ul></nav>`;
    },
  });

  palette.register({
    type: 'inspector',
    label: 'Inspector',
    category: 'organisms',
    tag: 'aside',
    bn: 'bn-inspector',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Inspector' },
    preview(props) {
      return `<header><h2>${text(props, 'Inspector')}</h2></header><section><h3>Type</h3><p>Name</p></section>`;
    },
  });

  palette.register({
    type: 'toolbar',
    label: 'Toolbar',
    category: 'organisms',
    tag: 'header',
    bn: 'bn-toolbar',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Label' }],
    defaults: { text: 'Edit' },
    preview(props) {
      return `<button type="button">${text(props, 'Edit')}</button><button type="button">Share</button>`;
    },
  });

  palette.register({
    type: 'nav-bar',
    label: 'Nav bar',
    category: 'organisms',
    tag: 'header',
    bn: 'bn-nav-bar',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Settings' },
    preview(props) {
      return `<h2 data-bn="bn-large-title">${text(props, 'Settings')}</h2>`;
    },
  });

  palette.register({
    type: 'metric',
    label: 'Metric',
    category: 'organisms',
    tag: 'article',
    bn: 'bn-metric',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Label' }],
    defaults: { text: 'Runtime' },
    preview(props) {
      return `<p data-bn="bn-metric-value">9.6KB</p><h3 data-bn="bn-metric-label">${text(props, 'Runtime')}</h3>`;
    },
  });

  palette.register({
    type: 'card-grid',
    label: 'Card grid',
    category: 'organisms',
    tag: 'ul',
    bn: 'bn-card-grid',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Label' }],
    defaults: { text: 'Packages' },
    preview(props) {
      return `<li><article data-bn="bn-metric"><p data-bn="bn-metric-value">45</p><h3 data-bn="bn-metric-label">${text(props, 'Packages')}</h3></article></li>`;
    },
  });

  palette.register({
    type: 'alert',
    label: 'Alert',
    category: 'organisms',
    tag: 'section',
    bn: 'bn-alert',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Save changes?' },
    preview(props) {
      return `<h2>${text(props, 'Save changes?')}</h2><p>Your edits stay on this page.</p>`;
    },
  });

  palette.register({
    type: 'empty-state',
    label: 'Empty state',
    category: 'organisms',
    tag: 'section',
    bn: 'bn-empty-state',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Title' }],
    defaults: { text: 'Nothing here' },
    preview(props) {
      return `<h2 data-bn="bn-empty-title">${text(props, 'Nothing here')}</h2><p data-bn="bn-empty-description">Add an organism from the palette.</p>`;
    },
  });

  palette.register({
    type: 'form-organism',
    label: 'Form',
    category: 'organisms',
    tag: 'form',
    bn: 'bn-form',
    container: true,
    props: [{ name: 'text', kind: 'string', label: 'Submit' }],
    defaults: { text: 'Save' },
    preview(props) {
      return `<label data-bn="bn-field">Name<input data-bn="bn-field-control" type="text" placeholder="Title"></label><button data-bn="bn-button" data-variant="prominent" data-size="large" type="submit">${text(props, 'Save')}</button>`;
    },
  });

  palette.register({
    type: 'menu-organism',
    label: 'Menu',
    category: 'organisms',
    tag: 'menu',
    bn: 'bn-menu',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'First item' }],
    defaults: { text: 'New' },
    preview(props) {
      return `<li><button type="button">${text(props, 'New')}</button></li><li><button type="button">Open</button></li>`;
    },
  });

  palette.register({
    type: 'search-field',
    label: 'Search',
    category: 'organisms',
    tag: 'search',
    bn: 'bn-search',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Placeholder' }],
    defaults: { text: 'Search' },
    preview(props) {
      return `<label>Search</label><input type="search" placeholder="${text(props, 'Search')}">`;
    },
  });

  palette.register({
    type: 'scrollbar',
    label: 'Scrollbar',
    category: 'organisms',
    tag: 'input',
    bn: 'bn-scrollbar',
    container: false,
    props: [{ name: 'aria-label', kind: 'string', label: 'Label' }],
    defaults: { type: 'range', 'aria-label': 'Scroll position', min: '0', max: '100', value: '40' },
  });

  palette.register({
    type: 'refraction',
    label: 'Refraction',
    category: 'organisms',
    tag: 'figure',
    bn: 'bn-refraction',
    container: false,
    props: [{ name: 'text', kind: 'string', label: 'Label' }],
    defaults: { text: 'Liquid glass' },
    preview(props) {
      return `<figcaption>${text(props, 'Liquid glass')}</figcaption><p>Sheen over the brand glow.</p>`;
    },
  });
}

export function defaultPalette() {
  const palette = createPalette();
  registerOrganisms(palette);

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
      {
        name: 'direction',
        kind: 'enum',
        options: ['row', 'column'],
        default: 'column',
        label: 'Direction',
      },
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
      {
        name: 'level',
        kind: 'enum',
        options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        default: 'h2',
        label: 'Level',
      },
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
    props: [{ name: 'text', kind: 'string', label: 'Text' }],
    defaults: { text: 'Lorem ipsum.' },
  });

  palette.register({
    type: 'button',
    label: 'Button',
    category: 'inputs',
    tag: 'button',
    container: false,
    bn: 'button',
    dataProps: ['variant', 'size'],
    props: [
      { name: 'text', kind: 'string', label: 'Label' },
      {
        name: 'variant',
        kind: 'enum',
        options: ['primary', 'secondary', 'ghost', 'destructive'],
        default: 'primary',
        label: 'Variant',
      },
      {
        name: 'size',
        kind: 'enum',
        options: ['sm', 'default', 'lg'],
        default: 'default',
        label: 'Size',
      },
      {
        name: 'type',
        kind: 'enum',
        options: ['button', 'submit', 'reset'],
        default: 'button',
        label: 'Type',
      },
      { name: 'disabled', kind: 'boolean', default: false, label: 'Disabled' },
    ],
    defaults: { text: 'Click me', variant: 'primary', size: 'default', type: 'button' },
  });

  palette.register({
    type: 'input',
    label: 'Input',
    category: 'inputs',
    tag: 'input',
    container: false,
    bn: 'input',
    props: [
      {
        name: 'type',
        kind: 'enum',
        options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
        default: 'text',
        label: 'Type',
      },
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
    bn: 'textarea',
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
    bn: 'checkbox',
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
      {
        name: 'target',
        kind: 'enum',
        options: ['', '_blank', '_self'],
        default: '',
        label: 'Target',
      },
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
    props: [{ name: 'value', kind: 'signal', label: 'Bound expression' }],
    defaults: {},
  });

  return palette;
}
