import { createBuilderState } from './state.js';
import { createDefaultPalette } from './palette.js';
import { renderCanvas } from './canvas.js';
import { renderTreeView } from './tree-view.js';
import { renderInspector } from './inspector.js';
import { renderPalette } from './palette-view.js';
import { generateComponent } from './code-gen.js';

export function createBuilder(options = {}) {
  const state = options.state || createBuilderState();
  const palette = options.palette || createDefaultPalette();
  const disposers = [];

  if (options.canvas) disposers.push(renderCanvas(state, palette, options.canvas));
  if (options.tree) disposers.push(renderTreeView(state, palette, options.tree));
  if (options.inspector) disposers.push(renderInspector(state, palette, options.inspector));
  if (options.paletteTarget) {
    disposers.push(renderPalette(palette, options.paletteTarget, {
      onSelect: (type) => {
        const def = palette.get(type);
        if (!def) return;
        state.addNode({
          type,
          parentId: state.selectedId() || state.ROOT_ID,
          props: def.defaultProps,
        });
      },
    }));
  }

  function generate(genOptions) {
    return generateComponent(state, palette, genOptions);
  }

  function dispose() {
    while (disposers.length) {
      const fn = disposers.pop();
      try { fn(); } catch { /* swallow */ }
    }
  }

  return {
    state,
    palette,
    generate,
    dispose,
  };
}
