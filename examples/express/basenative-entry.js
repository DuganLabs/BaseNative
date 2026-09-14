/**
 * Entry for public/basenative.js, the bundle every page on the site imports
 * from `/basenative.js` (`nx bundle basenative-example-express`).
 *
 * The runtime is the whole of it for hydration; the component initialisers
 * are here so the /components/* demos and /showcase run the package's own
 * client code instead of a hand-rolled copy. Add an `init*` here when the
 * package gains one — `grep -o 'init[A-Za-z]*' public/basenative.js` is the
 * check that the bundle ships it.
 */
export * from '../../packages/runtime/src/index.js';
export {
  initTabs,
  initDrawer,
  initCommandPalette,
  initDataGrid,
  initTree,
  initMultiselect,
  initVirtualList,
  initDropdownMenu,
  initCalendarDragDrop,
  initPipelineDragDrop,
} from '../../packages/components/src/index.js';
