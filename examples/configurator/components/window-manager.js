/**
 * Window Manager — CRUD methods for window array signal.
 * @module components/window-manager
 */

/**
 * @param {Function} windows - windows signal
 */
export function createWindowMethods(windows) {
  let _nextId = 0;

  return {
    addWindow() {
      windows.set(prev => [...prev, {
        id: ++_nextId,
        wall: 'south',
        width: 36,
        height: 48,
        sillHeight: 36,
        operable: true,
      }]);
    },

    removeWindow(id) {
      windows.set(prev => prev.filter(w => w.id !== id));
    },

    updateWindowWall(id, wall) {
      windows.set(prev => prev.map(w => w.id === id ? { ...w, wall } : w));
    },

    updateWindowDim(id, dim, value) {
      windows.set(prev => prev.map(w =>
        w.id === id ? { ...w, [dim]: value } : w
      ));
    },

    toggleWindowOperable(id) {
      windows.set(prev => prev.map(w =>
        w.id === id ? { ...w, operable: !w.operable } : w
      ));
    },
  };
}
