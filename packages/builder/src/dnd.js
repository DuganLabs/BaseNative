export const PALETTE_MIME = 'application/x-basenative-palette';
export const NODE_MIME = 'application/x-basenative-node';

export function attachPaletteSource(element, type) {
  if (!element || typeof element.setAttribute !== 'function') {
    throw new Error('attachPaletteSource: element required');
  }
  element.setAttribute('draggable', 'true');
  element.dataset.bnPaletteType = type;

  const onDragStart = (event) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(PALETTE_MIME, type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  element.addEventListener('dragstart', onDragStart);
  return () => element.removeEventListener('dragstart', onDragStart);
}

export function attachNodeSource(element, nodeId) {
  if (!element || typeof element.setAttribute !== 'function') {
    throw new Error('attachNodeSource: element required');
  }
  element.setAttribute('draggable', 'true');
  element.dataset.bnNodeId = nodeId;

  const onDragStart = (event) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(NODE_MIME, nodeId);
    event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
  };

  element.addEventListener('dragstart', onDragStart);
  return () => element.removeEventListener('dragstart', onDragStart);
}

export function attachDropTarget(element, handlers = {}) {
  if (!element) throw new Error('attachDropTarget: element required');

  const onDragOver = (event) => {
    if (!event.dataTransfer) return;
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes(PALETTE_MIME) && !types.includes(NODE_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = types.includes(NODE_MIME) ? 'move' : 'copy';
    element.classList.add('bn-drop-active');
    if (handlers.onOver) handlers.onOver(event);
  };

  const onDragLeave = (event) => {
    element.classList.remove('bn-drop-active');
    if (handlers.onLeave) handlers.onLeave(event);
  };

  const onDrop = (event) => {
    event.preventDefault();
    element.classList.remove('bn-drop-active');
    if (!event.dataTransfer) return;
    const paletteType = event.dataTransfer.getData(PALETTE_MIME);
    const nodeId = event.dataTransfer.getData(NODE_MIME);
    if (paletteType && handlers.onPaletteDrop) {
      handlers.onPaletteDrop({ type: paletteType, event });
    } else if (nodeId && handlers.onNodeDrop) {
      handlers.onNodeDrop({ nodeId, event });
    }
  };

  element.addEventListener('dragover', onDragOver);
  element.addEventListener('dragleave', onDragLeave);
  element.addEventListener('drop', onDrop);

  return () => {
    element.removeEventListener('dragover', onDragOver);
    element.removeEventListener('dragleave', onDragLeave);
    element.removeEventListener('drop', onDrop);
  };
}

export function computeInsertionIndex(rect, clientY, childCount) {
  if (childCount <= 0) return 0;
  if (!rect) return childCount;
  const mid = rect.top + rect.height / 2;
  return clientY < mid ? 0 : childCount;
}

export function classifyDropPosition(rect, clientY) {
  if (!rect) return 'inside';
  const third = rect.height / 3;
  if (clientY < rect.top + third) return 'before';
  if (clientY > rect.bottom - third) return 'after';
  return 'inside';
}

export function readDataTransfer(event) {
  if (!event || !event.dataTransfer) return { type: null, payload: null };
  const palette = event.dataTransfer.getData(PALETTE_MIME);
  if (palette) return { type: 'palette', payload: palette };
  const node = event.dataTransfer.getData(NODE_MIME);
  if (node) return { type: 'node', payload: node };
  return { type: null, payload: null };
}
