/**
 * Panel Selector — computed catalog entry arrays for template @for iteration.
 * @module components/panel-selector
 */

import {
  EXTERIOR_PANELS,
  INTERIOR_PANELS,
  CAVITY_INSULATION,
  STUD_DEPTHS,
} from '../panel-catalog.js';

/**
 * @param {Function} computed
 */
export function createPanelSelectorsComputed(computed) {
  return {
    exteriorPanelEntries: computed(() =>
      Object.entries(EXTERIOR_PANELS).map(([key, panel]) => ({ key, panel }))
    ),
    interiorPanelEntries: computed(() =>
      Object.entries(INTERIOR_PANELS).map(([key, panel]) => ({ key, panel }))
    ),
    studDepthEntries: computed(() =>
      Object.entries(STUD_DEPTHS).map(([key, data]) => ({ key, label: data.label }))
    ),
    cavityInsulationEntries: computed(() =>
      Object.entries(CAVITY_INSULATION).map(([key, ins]) => ({ key, ins }))
    ),
  };
}
