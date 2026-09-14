/**
 * Attach a set of event listeners to a container and return a destroy() that
 * removes exactly those listeners. The calendar and pipeline initialisers bind
 * the native drag-and-drop events and the `click` / `keydown` pair of the
 * select-then-place path through one call each, so one destroy() tears down
 * every gesture.
 *
 * @param {HTMLElement} el
 * @param {Record<string, ((e: Event) => void) | undefined>} handlers  Keyed by event type
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

/** Remove data-dragging / data-picked / data-drop-target from every descendant of container. */
export function clearDragState(container) {
  container.querySelectorAll('[data-dragging], [data-picked], [data-drop-target]').forEach(el => {
    el.removeAttribute('data-dragging');
    el.removeAttribute('data-picked');
    el.removeAttribute('data-drop-target');
  });
}

/** Remove data-drop-target from every descendant of container, when it can be queried. */
export function clearDropTargets(container) {
  if (typeof container.querySelectorAll !== 'function') return;
  container.querySelectorAll('[data-drop-target]').forEach(el => el.removeAttribute('data-drop-target'));
}

/** Parse the JSON payload set on dragstart, or null when absent or malformed. */
export function readDragData(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('text/plain'));
  } catch {
    return null;
  }
}
