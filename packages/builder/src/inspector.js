import { effect } from '@basenative/runtime';

function createElement(doc, tag, attrs = {}, text) {
  const el = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value);
  }
  if (text != null) el.textContent = text;
  return el;
}

function buildField(doc, { id, label, value, onChange }) {
  const wrapper = createElement(doc, 'label', { class: 'bn-inspector-field' });
  const labelEl = createElement(doc, 'span', { class: 'bn-inspector-label' }, label);
  const input = createElement(doc, 'input', {
    type: 'text',
    id,
    class: 'bn-inspector-input',
    value: value ?? '',
  });
  input.value = value ?? '';
  input.addEventListener('input', (event) => onChange(event.target.value));
  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);
  return wrapper;
}

function buildSection(doc, title) {
  const section = createElement(doc, 'section', { class: 'bn-inspector-section' });
  section.appendChild(createElement(doc, 'h4', { class: 'bn-inspector-title' }, title));
  return section;
}

function emptyState(doc) {
  const placeholder = createElement(doc, 'p', { class: 'bn-inspector-empty' });
  placeholder.textContent = 'Select a component to edit its properties.';
  return placeholder;
}

export function renderInspector(state, palette, target) {
  if (!target) throw new Error('renderInspector: target element required');
  const doc = target.ownerDocument;

  const dispose = effect(() => {
    const id = state.selectedId();
    const node = id ? state.tree.peek().get(id) || null : null;
    target.replaceChildren();
    target.classList.add('bn-inspector');

    if (!node) {
      target.appendChild(emptyState(doc));
      return;
    }

    const def = palette.get(node.type);
    const heading = createElement(doc, 'header', { class: 'bn-inspector-header' });
    heading.appendChild(createElement(doc, 'h3', null, def?.label || node.type));
    heading.appendChild(createElement(doc, 'code', { class: 'bn-inspector-id' }, node.id));
    target.appendChild(heading);

    const propsKeys = def?.inspectableProps?.length
      ? def.inspectableProps
      : Object.keys(node.props);

    if (propsKeys.length) {
      const section = buildSection(doc, 'Properties');
      for (const key of propsKeys) {
        section.appendChild(
          buildField(doc, {
            id: `bn-prop-${node.id}-${key}`,
            label: key,
            value: node.props[key] ?? '',
            onChange: (value) => state.updateProps(node.id, { [key]: value }),
          }),
        );
      }
      target.appendChild(section);
    }

    const bindingKeys = def?.inspectableBindings || [];
    if (bindingKeys.length) {
      const section = buildSection(doc, 'Signal bindings');
      for (const key of bindingKeys) {
        section.appendChild(
          buildField(doc, {
            id: `bn-binding-${node.id}-${key}`,
            label: `${key} ← signal`,
            value: node.bindings[key] ?? '',
            onChange: (value) => state.updateBindings(node.id, { [key]: value }),
          }),
        );
      }
      target.appendChild(section);
    }

    const eventKeys = def?.inspectableEvents || [];
    if (eventKeys.length) {
      const section = buildSection(doc, 'Events');
      for (const key of eventKeys) {
        section.appendChild(
          buildField(doc, {
            id: `bn-event-${node.id}-${key}`,
            label: `@${key}`,
            value: node.events[key] ?? '',
            onChange: (value) => state.updateEvents(node.id, { [key]: value }),
          }),
        );
      }
      target.appendChild(section);
    }
  });

  return () => dispose.dispose();
}
