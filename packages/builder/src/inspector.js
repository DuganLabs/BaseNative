import { escapeHtml } from './escape.js';

function renderField(nodeId, prop, value, binding, options = {}) {
  const id = `bn-prop-${nodeId}-${prop.name}`;
  const label = escapeHtml(prop.label || prop.name);
  const dataAttrs = `data-bn="bn-inspector-field" data-bn-prop="${escapeHtml(prop.name)}" data-bn-node="${escapeHtml(nodeId)}"`;

  if (prop.kind === 'signal') {
    const ref = binding ? binding.ref : '';
    return (
      `<label class="bn-inspector__field" for="${id}">` +
      `<span class="bn-inspector__label">${label} <small>(signal)</small></span>` +
      `<input id="${id}" type="text" ${dataAttrs} data-bn-binding="true" placeholder="signalName" value="${escapeHtml(ref)}" class="bn-inspector__input">` +
      `</label>`
    );
  }

  if (prop.kind === 'enum' && Array.isArray(prop.options)) {
    /* With an enum control (the host's custom select), the field is a
       mount point: the element hands it to the control after render.
       Without one, the platform <select> is the fallback. */
    if (options.enumHost) {
      return (
        `<section class="bn-inspector__field" data-bn="bn-inspector-field" data-bn-enum-host="${escapeHtml(prop.name)}" data-bn-node="${escapeHtml(nodeId)}">` +
        `<label class="bn-inspector__label" for="${id}">${label}</label>` +
        `</section>`
      );
    }
    const choices = prop.options
      .map(
        (o) =>
          `<option value="${escapeHtml(o)}"${value === o ? ' selected' : ''}>${escapeHtml(o || '—')}</option>`,
      )
      .join('');
    return (
      `<label class="bn-inspector__field" for="${id}">` +
      `<span class="bn-inspector__label">${label}</span>` +
      `<select id="${id}" ${dataAttrs} class="bn-inspector__input">${choices}</select>` +
      `</label>`
    );
  }

  if (prop.kind === 'boolean') {
    const checked = value ? ' checked' : '';
    return (
      `<label class="bn-inspector__field bn-inspector__field--inline" for="${id}">` +
      `<input id="${id}" type="checkbox" ${dataAttrs}${checked} class="bn-inspector__checkbox">` +
      `<span class="bn-inspector__label">${label}</span>` +
      `</label>`
    );
  }

  if (prop.kind === 'number') {
    const v = value == null ? '' : escapeHtml(value);
    return (
      `<label class="bn-inspector__field" for="${id}">` +
      `<span class="bn-inspector__label">${label}</span>` +
      `<input id="${id}" type="number" ${dataAttrs} value="${v}" class="bn-inspector__input">` +
      `</label>`
    );
  }

  const v = value == null ? '' : escapeHtml(value);
  return (
    `<label class="bn-inspector__field" for="${id}">` +
    `<span class="bn-inspector__label">${label}</span>` +
    `<input id="${id}" type="text" ${dataAttrs} value="${v}" class="bn-inspector__input">` +
    `</label>`
  );
}

export function renderInspector(state, palette, options = {}) {
  const selectedId = state.selection.peek ? state.selection.peek() : state.selection();

  if (!selectedId) {
    return (
      '<div class="bn-inspector" aria-label="Property inspector">' +
      '<p class="bn-inspector__empty">Select a component to edit its properties.</p>' +
      '<p class="bn-inspector__empty">Click a component on the canvas to select it — its properties, duplicate, and remove live here.</p>' +
      '</div>'
    );
  }

  const node = state.getNode(selectedId);
  if (!node) {
    return (
      '<div class="bn-inspector" aria-label="Property inspector">' +
      '<p class="bn-inspector__empty">Component not found.</p>' +
      '</div>'
    );
  }

  const def = palette.get(node.type);
  const heading =
    `<header class="bn-inspector__header">` +
    `<h3 class="bn-inspector__title">${escapeHtml(def?.label || node.type)}</h3>` +
    `<p class="bn-inspector__id">${escapeHtml(node.id)}</p>` +
    `</header>`;

  if (!def || !def.props.length) {
    return (
      `<div class="bn-inspector" aria-label="Property inspector">${heading}` +
      '<p class="bn-inspector__empty">No editable properties.</p>' +
      '</div>'
    );
  }

  const fields = def.props
    .map((prop) =>
      renderField(node.id, prop, node.props[prop.name], node.bindings[prop.name], options),
    )
    .join('\n');

  const actions =
    `<footer class="bn-inspector__actions">` +
    `<button type="button" data-bn="bn-inspector-action" data-bn-action="duplicate" data-bn-node="${escapeHtml(node.id)}" class="bn-inspector__btn">Duplicate</button>` +
    `<button type="button" data-bn="bn-inspector-action" data-bn-action="remove" data-bn-node="${escapeHtml(node.id)}" class="bn-inspector__btn bn-inspector__btn--danger">Remove</button>` +
    `</footer>`;

  return (
    `<div class="bn-inspector" aria-label="Property inspector">${heading}` +
    `<form class="bn-inspector__form" data-bn-inspector-form="${escapeHtml(node.id)}">${fields}</form>` +
    actions +
    `</div>`
  );
}
