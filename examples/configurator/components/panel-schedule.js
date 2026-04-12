/**
 * Panel Schedule — computed material takeoff signal.
 * @module components/panel-schedule
 */

import { calculatePanelSchedule } from '../passive-house-engine.js';
import { EXTERIOR_PANELS, INTERIOR_PANELS } from '../panel-catalog.js';

/**
 * @param {Function} computed
 * @param {{
 *   footprint: Function,
 *   ceilingHeight: Function,
 *   windows: Function,
 *   exteriorPanel: Function,
 *   interiorPanel: Function,
 *   studDepth: Function,
 * }} signals
 */
export function createPanelScheduleComputed(computed, signals) {
  const { footprint, ceilingHeight, windows, exteriorPanel, interiorPanel, studDepth } = signals;

  const panelSchedule = computed(() =>
    calculatePanelSchedule(
      footprint(),
      ceilingHeight(),
      EXTERIOR_PANELS[exteriorPanel()],
      INTERIOR_PANELS[interiorPanel()],
      studDepth(),
      windows()
    )
  );

  return { panelSchedule };
}
