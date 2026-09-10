/**
 * Attach a set of native drag-and-drop listeners to a container and return a
 * destroy() that removes exactly those listeners.
 *
 * @param {HTMLElement} el
 * @param {Partial<Record<'dragstart'|'dragover'|'dragleave'|'drop'|'dragend', (e: DragEvent) => void>>} handlers
 * @returns {{ destroy: () => void }}
 */
export function bindDrag(el, handlers) {
  const entries = Object.entries(handlers).filter(([, fn]) => typeof fn === 'function');
  for (const [type, fn] of entries) el.addEventListener(type, fn);
  return {
    destroy() {
      for (const [type, fn] of entries) el.removeEventListener(type, fn);
    },
  };
}

/** Remove data-dragging / data-drop-target from every descendant of container. */
export function clearDragState(container) {
  container.querySelectorAll('[data-dragging], [data-drop-target]').forEach(el => {
    el.removeAttribute('data-dragging');
    el.removeAttribute('data-drop-target');
  });
}

/** Parse the JSON payload set on dragstart, or null when absent or malformed. */
export function readDragData(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('text/plain'));
  } catch {
    return null;
  }
}
